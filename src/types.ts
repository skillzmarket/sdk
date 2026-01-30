export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  endpoint: string;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
  paymentAddress: string;
  isActive: boolean;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Creator {
  id: string;
  walletAddress: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  skillId: string;
  consumerAddress: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface SearchFilters {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  creator?: string;
}

import type { Hex } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';

/**
 * Wallet configuration for x402 payments.
 * Can be either:
 * - A viem PrivateKeyAccount object (from privateKeyToAccount)
 * - A private key hex string (will be converted to account internally)
 */
export type WalletConfig = PrivateKeyAccount | Hex;

export interface SkillzMarketOptions {
  apiUrl?: string;
  /**
   * Wallet for x402 payments. Can be:
   * - A viem PrivateKeyAccount object (from privateKeyToAccount)
   * - A private key hex string (0x...)
   */
  wallet?: WalletConfig;
  /**
   * Network identifier for x402 payments (e.g., 'eip155:8453' for Base mainnet).
   * Defaults to Base mainnet (eip155:8453).
   */
  network?: `${string}:${string}`;
}
