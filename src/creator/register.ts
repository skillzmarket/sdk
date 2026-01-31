import type { PrivateKeyAccount } from 'viem/accounts';
import type { Address } from 'viem';
import type { SkillsMap, RegistrationResult, RegistrationOptions } from './types.js';
import { authenticate, authenticatedFetch } from './auth.js';

const DEFAULT_API_URL = 'https://api.skillz.market';
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

export interface RegisterOptions {
  account: PrivateKeyAccount;
  endpoint: string;
  apiUrl?: string;
  onError?: 'throw' | 'warn' | 'silent';
  /**
   * Optional expected payment address for verification.
   * If provided, registration will fail if the account address
   * doesn't match this expected address.
   */
  expectedPaymentAddress?: Address;
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
 * Register skills with the Skillz Market registry.
 *
 * @example
 * ```typescript
 * import { skill, register } from '@skillzmarket/sdk/creator';
 * import { privateKeyToAccount } from 'viem/accounts';
 *
 * const echo = skill({ price: '$0.001' }, async (input) => ({ echo: input }));
 *
 * const account = privateKeyToAccount('0x...');
 * const results = await register({ echo }, {
 *   account,
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
  const { account, endpoint, apiUrl = DEFAULT_API_URL, onError = 'warn', expectedPaymentAddress } = options;

  const skillNames = Object.keys(skills);
  if (skillNames.length === 0) {
    return [];
  }

  // Verify payment address matches if expected address is provided
  if (expectedPaymentAddress) {
    if (account.address.toLowerCase() !== expectedPaymentAddress.toLowerCase()) {
      const message = `Payment address mismatch: registration account (${account.address}) ` +
        `does not match expected payment address (${expectedPaymentAddress}). ` +
        `Ensure the same wallet is used for registration and serving.`;
      return handleRegistrationError(message, skillNames, onError);
    }
  }

  // Normalize endpoint (remove trailing slash)
  const normalizedEndpoint = endpoint.replace(/\/$/, '');

  // Authenticate with the API
  let token: string;
  try {
    const authResult = await authenticate(account, { apiUrl });
    token = authResult.token;
  } catch (error) {
    const message = `Failed to authenticate for registration: ${error instanceof Error ? error.message : String(error)}`;
    return handleRegistrationError(message, skillNames, onError);
  }

  // Register each skill
  const results: RegistrationResult[] = [];

  for (const [name, definition] of Object.entries(skills)) {
    const skillEndpoint = `${normalizedEndpoint}/${name}`;

    const payload: SkillPayload = {
      name,
      endpoint: skillEndpoint,
      price: definition.parsedPrice.amount,
      paymentAddress: account.address,
      description: definition.options.description,
      inputSchema: definition.options.inputSchema,
      outputSchema: definition.options.outputSchema,
    };

    const result = await registerSkillWithRetry(name, payload, token, apiUrl, onError);
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
  token: string,
  apiUrl: string,
  onError: 'throw' | 'warn' | 'silent'
): Promise<RegistrationResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await authenticatedFetch(`${apiUrl}/skills`, token, {
        method: 'POST',
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
  account: PrivateKeyAccount
): RegisterOptions {
  return {
    account,
    endpoint: registerOpts.endpoint,
    apiUrl: registerOpts.apiUrl,
    onError: registerOpts.onError,
  };
}
