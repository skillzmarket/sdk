export { SkillzMarket } from './client.js';
export { DiscoveryClient } from './discovery.js';
export type { SkillGroupWithSkills } from './discovery.js';
export { createPaymentFetch, resolveAccount, getWalletAddress, DEFAULT_NETWORK } from './payment.js';
export type {
  Skill,
  SkillGroup,
  Creator,
  Review,
  SearchFilters,
  SkillzMarketOptions,
  WalletConfig,
} from './types.js';

// Re-export shared types for creator
export type { SkillOptions, ParsedPrice } from './creator/types.js';
