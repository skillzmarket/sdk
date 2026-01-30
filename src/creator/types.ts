import type { Hex } from 'viem';

/**
 * JSON Schema type for describing skill input/output
 */
export interface JsonSchema {
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  [key: string]: unknown;
}

/**
 * Options for defining a skill
 */
export interface SkillOptions {
  /**
   * Price per call in human-friendly format.
   * Examples: '$0.001', '0.005 USDC', '0.01'
   */
  price: string;
  /**
   * Description of what the skill does
   */
  description?: string;
  /**
   * Maximum timeout in milliseconds (default: 60000)
   */
  timeout?: number;
  /**
   * JSON Schema describing the expected input format
   */
  inputSchema?: JsonSchema;
  /**
   * JSON Schema describing the output format
   */
  outputSchema?: JsonSchema;
}

/**
 * Parsed price information
 */
export interface ParsedPrice {
  /** Amount as a decimal string (e.g., '0.001') */
  amount: string;
  /** Currency (currently only 'USDC' supported) */
  currency: 'USDC';
}

/**
 * Handler function for a skill
 */
export type SkillHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput
) => Promise<TOutput>;

/**
 * A defined skill ready to be served
 */
export interface SkillDefinition<TInput = unknown, TOutput = unknown> {
  options: SkillOptions;
  handler: SkillHandler<TInput, TOutput>;
  parsedPrice: ParsedPrice;
}

/**
 * Map of skill names to their definitions
 * Uses `any` for type parameters to allow mixing skills with different input/output types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SkillsMap = Record<string, SkillDefinition<any, any>>;

/**
 * Options for skill registration
 */
export interface RegistrationOptions {
  /**
   * API URL for the Skillz Market registry.
   * Default: 'https://api.skillz.market'
   */
  apiUrl?: string;
  /**
   * Public endpoint URL where the skill server is accessible.
   * This is required for registration.
   */
  endpoint: string;
  /**
   * Whether registration is enabled.
   * Default: true
   */
  enabled?: boolean;
  /**
   * Error handling mode.
   * - 'throw': Throw an error if registration fails
   * - 'warn': Log a warning if registration fails (default)
   * - 'silent': Silently ignore registration failures
   */
  onError?: 'throw' | 'warn' | 'silent';
}

/**
 * Result of registering a skill
 */
export interface RegistrationResult {
  /** Name of the skill */
  name: string;
  /** Whether registration was successful */
  success: boolean;
  /** Slug assigned by the registry (if successful) */
  slug?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Options for the serve function
 */
export interface ServeOptions {
  /**
   * Port to listen on (default: 3002)
   */
  port?: number;
  /**
   * Wallet private key for receiving payments.
   * Falls back to SKILLZ_WALLET_KEY environment variable.
   */
  wallet?: Hex;
  /**
   * Enable dev mode for testing without real payments.
   * Default: NODE_ENV !== 'production'
   */
  dev?: boolean;
  /**
   * Network identifier for x402 payments.
   * Default: 'eip155:8453' (Base mainnet)
   */
  network?: `${string}:${string}`;
  /**
   * Facilitator URL for x402.
   * Default: 'https://x402.dexter.cash'
   */
  facilitatorUrl?: string;
  /**
   * App name shown in payment prompts.
   * Default: 'Skillz Market Skill'
   */
  appName?: string;
  /**
   * Callback when a skill is called
   */
  onCall?: (skillName: string, input: unknown) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (skillName: string, error: Error) => void;
  /**
   * Registration options for auto-registering skills with the Skillz Market registry.
   * If provided, skills will be registered after the server starts.
   */
  register?: RegistrationOptions;
}

/**
 * x402 protected route configuration
 */
export interface ProtectedRoute {
  accepts: {
    scheme: 'exact';
    price: string;
    network: `${string}:${string}`;
    payTo: string;
    maxTimeoutSeconds: number;
  };
  description: string;
}

/**
 * Map of route patterns to their x402 configuration
 */
export type ProtectedRoutes = Record<`${string} ${string}`, ProtectedRoute>;
