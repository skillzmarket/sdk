import type { Address } from 'viem';
import type { SkillsMap, RegistrationResult, RegistrationOptions } from './types.js';

const DEFAULT_API_URL = 'https://api.skillz.market';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

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
}

interface SkillPayload {
  name: string;
  endpoint: string;
  price: string;
  paymentAddress: string;
  description?: string;
  inputSchema?: unknown;
  outputSchema?: unknown;
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
  const { apiKey, paymentAddress, endpoint, apiUrl = DEFAULT_API_URL, onError = 'warn' } = options;

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

  // Register each skill
  const results: RegistrationResult[] = [];

  for (const [name, definition] of Object.entries(skills)) {
    const skillEndpoint = `${normalizedEndpoint}/${name}`;

    const payload: SkillPayload = {
      name,
      endpoint: skillEndpoint,
      price: definition.parsedPrice.amount,
      paymentAddress,
      description: definition.options.description,
      inputSchema: definition.options.inputSchema,
      outputSchema: definition.options.outputSchema,
    };

    const result = await registerSkillWithRetry(name, payload, apiKey, apiUrl, onError);
    results.push(result);
  }

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
        const data = (await response.json()) as { slug: string };
        return {
          name,
          success: true,
          slug: data.slug,
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
  };
}
