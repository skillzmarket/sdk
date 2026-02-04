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
  /**
   * Groups to assign this skill to.
   * Merged with global groups from RegistrationOptions.
   */
  groups?: string[];
}

/**
 * Parsed price information
 */
export interface ParsedPrice {
  /** Amount as a decimal number (e.g., 0.001) */
  amount: number;
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
 * Options for batch operations
 */
export interface BatchOptions {
  /**
   * Maximum concurrent requests (default: 5)
   */
  concurrency?: number;
}

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
  /**
   * Global group slugs to assign skills to.
   * Merged with per-skill groups from SkillOptions.
   * Groups must already exist and belong to the authenticated creator.
   */
  groups?: string[];
  /**
   * Batch options for parallel registration.
   */
  batch?: BatchOptions;
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
  /** Whether an existing skill was updated (true) or a new one created (false) */
  updated?: boolean;
}

/**
 * Data for updating a skill
 */
export interface SkillUpdateData {
  /** Updated description */
  description?: string;
  /** Updated price in human-friendly format */
  price?: string;
  /** Updated groups (replaces existing) */
  groups?: string[];
  /** Updated input schema */
  inputSchema?: JsonSchema;
  /** Updated output schema */
  outputSchema?: JsonSchema;
  /** Whether the skill is active */
  isActive?: boolean;
}

/**
 * Result of updating a skill
 */
export interface UpdateResult {
  /** Slug of the skill */
  slug: string;
  /** Whether the update was successful */
  success: boolean;
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
   * Wallet address for receiving payments.
   * Accepts either a 42-char address or a 66-char private key (derives address).
   * Falls back to SKILLZ_WALLET_ADDRESS environment variable.
   */
  wallet?: string;
  /**
   * API key for registration. Get one from the Skillz Market dashboard.
   * Falls back to SKILLZ_API_KEY environment variable.
   */
  apiKey?: string;
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
