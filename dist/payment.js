import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme, toClientEvmSigner } from '@x402/evm';
import { privateKeyToAccount } from 'viem/accounts';
/**
 * Default network for x402 payments (Base mainnet).
 */
export const DEFAULT_NETWORK = 'eip155:8453';
/**
 * Converts a WalletConfig to a PrivateKeyAccount.
 * If the config is already an account with signTypedData, returns it directly.
 * If it's a private key hex string, converts it to an Account.
 */
export function resolveAccount(walletConfig) {
    // Check if it's a hex string (private key)
    if (typeof walletConfig === 'string') {
        return privateKeyToAccount(walletConfig);
    }
    // It's already an Account - assume it's a PrivateKeyAccount
    return walletConfig;
}
/**
 * Creates a ClientEvmSigner from a WalletConfig.
 */
export function createSigner(walletConfig) {
    const account = resolveAccount(walletConfig);
    return toClientEvmSigner({
        address: account.address,
        signTypedData: async (message) => {
            return account.signTypedData({
                domain: message.domain,
                types: message.types,
                primaryType: message.primaryType,
                message: message.message,
            });
        },
    });
}
/**
 * Creates a fetch function that automatically handles x402 payments.
 * Uses the @x402/fetch library to wrap the native fetch with payment support.
 *
 * @param walletConfig - A viem Account or private key hex string
 * @param network - The network identifier (default: Base mainnet)
 * @returns A fetch function that handles x402 payment challenges
 */
export function createPaymentFetch(walletConfig, network = DEFAULT_NETWORK) {
    const signer = createSigner(walletConfig);
    return wrapFetchWithPaymentFromConfig(fetch, {
        schemes: [
            {
                network,
                client: new ExactEvmScheme(signer),
            },
        ],
    });
}
/**
 * Gets the wallet address from a WalletConfig.
 */
export function getWalletAddress(walletConfig) {
    const account = resolveAccount(walletConfig);
    return account.address;
}
//# sourceMappingURL=payment.js.map