import { privateKeyToAccount } from 'viem/accounts';
import type { Hex, Address } from 'viem';
import type { PrivateKeyAccount } from 'viem/accounts';

/**
 * Wallet configuration that can be resolved to an address
 */
export type WalletConfig = Hex | PrivateKeyAccount;

/**
 * Resolve wallet input to an address.
 * Accepts either a 42-char address or 66-char private key.
 *
 * Priority:
 * 1. Explicit wallet option
 * 2. SKILLZ_WALLET_ADDRESS environment variable
 * 3. SKILLZ_WALLET_KEY environment variable (derives address)
 *
 * @param wallet - Optional explicit wallet address or private key
 * @returns The wallet address
 * @throws Error if no wallet is configured or invalid format
 */
export function resolveWalletToAddress(wallet?: string): Address {
  const input = wallet ?? process.env.SKILLZ_WALLET_ADDRESS ?? process.env.SKILLZ_WALLET_KEY;

  if (!input) {
    throw new Error(
      'No wallet configured. Either:\n' +
        '1. Pass `wallet` option with an address: serve({ skills }, { wallet: "0x..." })\n' +
        '2. Set SKILLZ_WALLET_ADDRESS environment variable\n\n' +
        'The wallet address receives payments from skill calls.'
    );
  }

  if (!input.startsWith('0x')) {
    throw new Error('Invalid wallet format. Must start with "0x"');
  }

  // 42 chars = address (0x + 40 hex chars)
  if (input.length === 42) {
    return input as Address;
  }

  // 66 chars = private key (0x + 64 hex chars) - derive address
  if (input.length === 66) {
    return privateKeyToAccount(input as Hex).address;
  }

  throw new Error(
    'Invalid wallet: must be 42-char address or 66-char private key.\n' +
      'Address example: 0x4554A88d9e4D1bef5338F65A3Cd335C6A27E5368\n' +
      'Private key example: 0x1234567890abcdef...'
  );
}

/**
 * Resolve wallet configuration from options or environment.
 * Returns a full account (with private key) for signing operations.
 *
 * Priority:
 * 1. Explicit wallet option
 * 2. SKILLZ_WALLET_KEY environment variable
 *
 * @deprecated Use resolveWalletToAddress when you only need the address.
 *             This function requires the private key and should only be used
 *             when signing is needed.
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

/**
 * Resolve a wallet config to an address
 */
function resolveWalletAddress(wallet: WalletConfig): Address {
  if (typeof wallet === 'string') {
    return privateKeyToAccount(wallet).address;
  }
  return wallet.address;
}

/**
 * Verify two wallet sources resolve to the same address.
 *
 * Use this to ensure the wallet used for registration matches
 * the wallet used for serving (receiving payments).
 *
 * @param wallet1 - First wallet (private key or account)
 * @param wallet2 - Second wallet (private key, account, or address)
 * @returns Object with match status and resolved addresses
 *
 * @example
 * ```typescript
 * const result = verifyWalletMatch(registerAccount, serveWallet);
 * if (!result.match) {
 *   throw new Error(`Wallet mismatch: ${result.address1} vs ${result.address2}`);
 * }
 * ```
 */
export function verifyWalletMatch(
  wallet1: WalletConfig,
  wallet2: WalletConfig | Address
): { match: boolean; address1: Address; address2: Address } {
  const address1 = resolveWalletAddress(wallet1);
  const address2 =
    typeof wallet2 === 'string' && wallet2.length === 42
      ? (wallet2 as Address)
      : resolveWalletAddress(wallet2 as WalletConfig);

  return {
    match: address1.toLowerCase() === address2.toLowerCase(),
    address1,
    address2,
  };
}
