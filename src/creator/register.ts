import type { Address } from 'viem';
import type { SkillsMap, RegistrationResult, RegistrationOptions, SkillUpdateData, UpdateResult, BatchOptions } from './types.js';
import { parsePrice } from './utils/price.js';

const DEFAULT_API_URL = 'https://api.skillz.market';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const DEFAULT_CONCURRENCY = 5;

export interface RegisterOptions {
  /** API key for authentication */
  apiKey: string;
  /** Payment address to receive skill payments */
  paymentAddress: Address;
  /** Public endpoint URL where skills are accessible */
  endpoint: string;
  /** API URL for the Skillz Market registry */
  apiUrl?: string;
  /** Error handling mode */
  onError?: 'throw' | 'warn' | 'silent';
  /** Global group slugs to assign skills to */
  groups?: string[];
  /** Batch options for parallel registration */
  batch?: BatchOptions;
}

interface SkillPayload {
  name: string;
  endpoint: string;
  price: number;
  paymentAddress: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
  groups?: string[];
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Merge and dedupe groups from per-skill and global options
 */
function mergeGroups(perSkill?: string[], global?: string[]): string[] {
  const combined = new Set<string>();
  global?.forEach(g => combined.add(g.trim()));
  perSkill?.forEach(g => combined.add(g.trim()));
  return Array.from(combined);
}

/**
 * Execute async tasks with concurrency limit
 */
async function parallelLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++;
      const item = items[i];
      if (item !== undefined) {
        results[i] = await fn(item);
      }
    }
  }

  const workers = Array(Math.min(limit, items.length))
    .fill(null)
    .map(() => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Register skills with the Skillz Market registry using API key authentication.
 *
 * @example
 * ```typescript
 * import { skill, register } from '@skillzmarket/sdk/creator';
 *
 * const echo = skill({ price: '$0.001' }, async (input) => ({ echo: input }));
 *
 * const results = await register({ echo }, {
 *   apiKey: 'sk_abc123...',  // or process.env.SKILLZ_API_KEY
 *   paymentAddress: '0x4554A88d9e4D1bef5338F65A3Cd335C6A27E5368',
 *   endpoint: 'https://my-skills.example.com',
 *   groups: ['my-group'],  // Global groups for all skills
 * });
 * ```
 *
 * @param skills - Map of skill names to their definitions
 * @param options - Registration options
 * @returns Array of registration results for each skill
 */
export async function register(
  skills: SkillsMap,
  options: RegisterOptions
): Promise<RegistrationResult[]> {
  const {
    apiKey,
    paymentAddress,
    endpoint,
    apiUrl = DEFAULT_API_URL,
    onError = 'warn',
    groups: globalGroups,
    batch,
  } = options;

  const skillNames = Object.keys(skills);
  if (skillNames.length === 0) {
    return [];
  }

  if (!apiKey) {
    const message =
      'API key required for registration. Either:\n' +
      '1. Pass `apiKey` option to serve()\n' +
      '2. Set SKILLZ_API_KEY environment variable\n\n' +
      'Get an API key from https://skillz.market/dashboard';
    return handleRegistrationError(message, skillNames, onError);
  }

  // Normalize endpoint (remove trailing slash)
  const normalizedEndpoint = endpoint.replace(/\/$/, '');

  // Build payloads array with merged groups
  const skillEntries = Object.entries(skills).map(([name, definition]) => {
    const skillEndpoint = `${normalizedEndpoint}/${name}`;
    const mergedGroups = mergeGroups(definition.options.groups, globalGroups);

    // Validate that each skill has at least one group
    if (mergedGroups.length === 0) {
      return { name, error: 'At least one group is required. Add groups to SkillOptions or RegistrationOptions.' };
    }

    const payload: SkillPayload = {
      name,
      endpoint: skillEndpoint,
      price: definition.parsedPrice.amount,
      paymentAddress,
      description: definition.options.description,
      inputSchema: definition.options.inputSchema,
      outputSchema: definition.options.outputSchema,
      groups: mergedGroups,
    };

    return { name, payload };
  });

  // Check for skills without groups
  const skillsWithoutGroups = skillEntries.filter(e => 'error' in e);
  if (skillsWithoutGroups.length > 0) {
    const errorMessages = skillsWithoutGroups.map(e => `${e.name}: ${'error' in e ? e.error : ''}`);
    const message = `Skills missing groups:\n${errorMessages.join('\n')}`;
    return handleRegistrationError(message, skillNames, onError);
  }

  // Register skills in parallel with concurrency limit
  const concurrency = batch?.concurrency ?? DEFAULT_CONCURRENCY;
  const validEntries = skillEntries.filter((e): e is { name: string; payload: SkillPayload } => 'payload' in e);

  const results = await parallelLimit(
    validEntries,
    concurrency,
    async ({ name, payload }) => registerSkillWithRetry(name, payload, apiKey, apiUrl, onError)
  );

  return results;
}

/**
 * Register a single skill with retry logic
 */
async function registerSkillWithRetry(
  name: string,
  payload: SkillPayload,
  apiKey: string,
  apiUrl: string,
  onError: 'throw' | 'warn' | 'silent'
): Promise<RegistrationResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${apiUrl}/skills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = (await response.json()) as { slug: string; _updated?: boolean };
        return {
          name,
          success: true,
          slug: data.slug,
          updated: response.status === 200, // 200 = updated, 201 = created
        };
      }

      // Handle non-retryable errors
      if (response.status >= 400 && response.status < 500) {
        const errorText = await response.text();
        let errorMessage: string;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorText;
        } catch {
          errorMessage = errorText;
        }

        // Don't retry client errors (except rate limiting)
        if (response.status !== 429) {
          return handleSkillError(name, errorMessage, onError);
        }
      }

      // Retryable error
      lastError = new Error(`HTTP ${response.status}: ${await response.text()}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    // Wait before retry (unless this was the last attempt)
    if (attempt < MAX_RETRIES - 1) {
      await sleep(getBackoffDelay(attempt));
    }
  }

  return handleSkillError(
    name,
    `Failed after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    onError
  );
}

/**
 * Handle error for a single skill registration
 */
function handleSkillError(
  name: string,
  message: string,
  onError: 'throw' | 'warn' | 'silent'
): RegistrationResult {
  if (onError === 'throw') {
    throw new Error(`Failed to register skill "${name}": ${message}`);
  }

  if (onError === 'warn') {
    console.warn(`⚠️  Failed to register skill "${name}": ${message}`);
  }

  return {
    name,
    success: false,
    error: message,
  };
}

/**
 * Handle error affecting all skills
 */
function handleRegistrationError(
  message: string,
  skillNames: string[],
  onError: 'throw' | 'warn' | 'silent'
): RegistrationResult[] {
  if (onError === 'throw') {
    throw new Error(message);
  }

  if (onError === 'warn') {
    console.warn(`⚠️  ${message}`);
  }

  return skillNames.map((name) => ({
    name,
    success: false,
    error: message,
  }));
}

/**
 * Build registration options from ServeOptions.register
 */
export function buildRegisterOptions(
  registerOpts: RegistrationOptions,
  apiKey: string,
  paymentAddress: Address
): RegisterOptions {
  return {
    apiKey,
    paymentAddress,
    endpoint: registerOpts.endpoint,
    apiUrl: registerOpts.apiUrl,
    onError: registerOpts.onError,
    groups: registerOpts.groups,
    batch: registerOpts.batch,
  };
}

/**
 * Options for updating a skill
 */
export interface UpdateOptions {
  /** API key for authentication */
  apiKey: string;
  /** API URL for the Skillz Market registry */
  apiUrl?: string;
}

/**
 * Update an existing skill in the Skillz Market registry.
 *
 * @example
 * ```typescript
 * import { updateSkill } from '@skillzmarket/sdk/creator';
 *
 * const result = await updateSkill('my-skill-slug', {
 *   description: 'Updated description',
 *   groups: ['new-group'],
 * }, {
 *   apiKey: 'sk_abc123...',
 * });
 *
 * if (result.success) {
 *   console.log('Skill updated!');
 * } else {
 *   console.error('Update failed:', result.error);
 * }
 * ```
 *
 * @param slug - The slug of the skill to update
 * @param data - The data to update
 * @param options - Update options (apiKey, apiUrl)
 * @returns Result indicating success or failure
 */
export async function updateSkill(
  slug: string,
  data: SkillUpdateData,
  options: UpdateOptions
): Promise<UpdateResult> {
  const { apiKey, apiUrl = DEFAULT_API_URL } = options;

  if (!apiKey) {
    return {
      slug,
      success: false,
      error: 'API key required for updating skills',
    };
  }

  // Validate groups if provided
  if (data.groups !== undefined && data.groups.length === 0) {
    return {
      slug,
      success: false,
      error: 'At least one group is required',
    };
  }

  // Parse price if provided
  let updatePayload: Record<string, unknown> = { ...data };
  if (data.price !== undefined) {
    try {
      const parsedPrice = parsePrice(data.price);
      updatePayload.price = parsedPrice.amount;
    } catch (err) {
      return {
        slug,
        success: false,
        error: err instanceof Error ? err.message : 'Invalid price format',
      };
    }
  }

  try {
    const response = await fetch(`${apiUrl}/skills/${slug}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(updatePayload),
    });

    if (response.ok) {
      return { slug, success: true };
    }

    const errorText = await response.text();
    let errorMessage: string;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorText;
    } catch {
      errorMessage = errorText;
    }

    return { slug, success: false, error: errorMessage };
  } catch (err) {
    return {
      slug,
      success: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
