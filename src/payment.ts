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
 *
 * Note: The network parameter is accepted for API consistency but the x402 client
 * determines the network from the payment request headers (supports all EVM chains).
 */
export function createPaymentFetch(
  walletConfig: WalletConfig,
  network: `${string}:${string}` = DEFAULT_NETWORK
): typeof fetch {
  void network; // Network is determined by x402 payment request headers
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
