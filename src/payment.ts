import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import type { Hex } from 'viem';
import type { WalletConfig } from './types.js';

/**
 * Default network for x402 payments (Base mainnet).
 */
export const DEFAULT_NETWORK: `${string}:${string}` = 'eip155:8453';

/**
 * Converts a WalletConfig to a PrivateKeyAccount.
 */
export function resolveAccount(walletConfig: WalletConfig): PrivateKeyAccount {
  if (typeof walletConfig === 'string') {
    return privateKeyToAccount(walletConfig as Hex);
  }
  return walletConfig as PrivateKeyAccount;
}

/**
 * Creates a fetch function that automatically handles x402 payments.
 * Uses the official x402 registration pattern with wildcard network support.
 */
export function createPaymentFetch(
  walletConfig: WalletConfig,
  _network: `${string}:${string}` = DEFAULT_NETWORK
): typeof fetch {
  const account = resolveAccount(walletConfig);

  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });

  return wrapFetchWithPayment(fetch, client);
}

/**
 * Gets the wallet address from a WalletConfig.
 */
export function getWalletAddress(walletConfig: WalletConfig): string {
  const account = resolveAccount(walletConfig);
  return account.address;
}
