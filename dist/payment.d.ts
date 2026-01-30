import { type ClientEvmSigner } from '@x402/evm';
import { type PrivateKeyAccount } from 'viem/accounts';
import type { WalletConfig } from './types.js';
/**
 * Default network for x402 payments (Base mainnet).
 */
export declare const DEFAULT_NETWORK: `${string}:${string}`;
/**
 * Converts a WalletConfig to a PrivateKeyAccount.
 * If the config is already an account with signTypedData, returns it directly.
 * If it's a private key hex string, converts it to an Account.
 */
export declare function resolveAccount(walletConfig: WalletConfig): PrivateKeyAccount;
/**
 * Creates a ClientEvmSigner from a WalletConfig.
 */
export declare function createSigner(walletConfig: WalletConfig): ClientEvmSigner;
/**
 * Creates a fetch function that automatically handles x402 payments.
 * Uses the @x402/fetch library to wrap the native fetch with payment support.
 *
 * @param walletConfig - A viem Account or private key hex string
 * @param network - The network identifier (default: Base mainnet)
 * @returns A fetch function that handles x402 payment challenges
 */
export declare function createPaymentFetch(walletConfig: WalletConfig, network?: `${string}:${string}`): typeof fetch;
/**
 * Gets the wallet address from a WalletConfig.
 */
export declare function getWalletAddress(walletConfig: WalletConfig): string;
//# sourceMappingURL=payment.d.ts.map