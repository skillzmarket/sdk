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
 * // Run: SKILLZ_WALLET_KEY=0x... npx tsx index.ts
 * ```
 */

export { skill } from './skill.js';
export { serve } from './serve.js';
export { register } from './register.js';
export { authenticate } from './auth.js';

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
} from './types.js';

// Re-export utilities for advanced usage
export { parsePrice, formatPriceForX402 } from './utils/price.js';
export { resolveWallet, maskPrivateKey } from './utils/wallet.js';
