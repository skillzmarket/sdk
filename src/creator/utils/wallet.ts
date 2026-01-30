import { privateKeyToAccount } from 'viem/accounts';
import type { Hex, Address } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';

/**
 * Resolve wallet configuration from options or environment.
 *
 * Priority:
 * 1. Explicit wallet option
 * 2. SKILLZ_WALLET_KEY environment variable
 *
 * @param wallet - Optional explicit wallet private key
 * @returns Object with account and address
 * @throws Error if no wallet is configured
 */
export function resolveWallet(wallet?: Hex): {
  account: PrivateKeyAccount;
  address: Address;
} {
  const privateKey = wallet ?? (process.env.SKILLZ_WALLET_KEY as Hex | undefined);

  if (!privateKey) {
    throw new Error(
      'No wallet configured. Either:\n' +
        '1. Pass `wallet` option to serve(): serve({ skills }, { wallet: "0x..." })\n' +
        '2. Set SKILLZ_WALLET_KEY environment variable\n\n' +
        'The wallet receives payments from skill calls.'
    );
  }

  if (!privateKey.startsWith('0x')) {
    throw new Error(
      'Invalid wallet format. Private key must start with "0x".\n' +
        'Example: 0x1234567890abcdef...'
    );
  }

  try {
    const account = privateKeyToAccount(privateKey);
    return {
      account,
      address: account.address,
    };
  } catch (error) {
    throw new Error(
      `Invalid wallet private key: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mask a private key for safe logging (show first 6 and last 4 chars)
 */
export function maskPrivateKey(key: Hex): string {
  if (key.length < 20) {
    return '0x****';
  }
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
