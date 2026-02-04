// Load environment variables from .env file
import 'dotenv/config';

/**
 * @skillzmarket/sdk/creator - Create monetized skills with zero x402 knowledge
 *
 * @example
 * ```typescript
 * import { skill, serve } from '@skillzmarket/sdk/creator';
 *
 * const echo = skill({
 *   price: '$0.001',
 *   description: 'Echoes input back',
 * }, async (input) => {
 *   return { echo: input };
 * });
 *
 * serve({ echo });
 * // Run: SKILLZ_WALLET_ADDRESS=0x... SKILLZ_API_KEY=sk_... npx tsx index.ts
 * ```
 */

export { skill } from './skill.js';
export { serve } from './serve.js';
export { register, updateSkill } from './register.js';
export type { RegisterOptions, UpdateOptions } from './register.js';
export { init, checkConfig } from './init.js';
export { authenticate, refreshAccessToken } from './auth.js';
export type { AuthResult, RefreshResult } from './auth.js';

// Re-export types for advanced usage
export type {
  SkillOptions,
  SkillHandler,
  SkillDefinition,
  SkillsMap,
  ServeOptions,
  ParsedPrice,
  JsonSchema,
  RegistrationOptions,
  RegistrationResult,
  BatchOptions,
  SkillUpdateData,
  UpdateResult,
} from './types.js';

// Re-export utilities for advanced usage
export { parsePrice, formatPriceForX402 } from './utils/price.js';
export { resolveWalletToAddress, resolveWallet, maskPrivateKey, verifyWalletMatch } from './utils/wallet.js';
export type { WalletConfig } from './utils/wallet.js';
