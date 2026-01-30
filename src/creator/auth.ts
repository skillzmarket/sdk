import type { PrivateKeyAccount } from 'viem/accounts';

const DEFAULT_API_URL = 'https://api.skillz.market';

export interface AuthenticateOptions {
  apiUrl?: string;
}

export interface AuthResult {
  token: string;
}

/**
 * Authenticate with the Skillz Market API using a wallet.
 *
 * This performs a challenge-response authentication flow:
 * 1. Request a challenge message from the API
 * 2. Sign the message with the wallet
 * 3. Submit the signature to get a JWT token
 *
 * @param account - viem PrivateKeyAccount to sign with
 * @param options - Authentication options
 * @returns JWT token
 */
export async function authenticate(
  account: PrivateKeyAccount,
  options: AuthenticateOptions = {}
): Promise<AuthResult> {
  const apiUrl = options.apiUrl ?? DEFAULT_API_URL;

  // Step 1: Request challenge message
  const challengeResponse = await fetch(`${apiUrl}/auth/challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: account.address,
    }),
  });

  if (!challengeResponse.ok) {
    const error = await challengeResponse.text();
    throw new Error(`Failed to get auth challenge: ${error}`);
  }

  const { message } = (await challengeResponse.json()) as {
    message: string;
  };

  // Step 2: Sign the message
  const signature = await account.signMessage({
    message,
  });

  // Step 3: Submit signature for JWT
  const authResponse = await fetch(`${apiUrl}/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      address: account.address,
      signature,
    }),
  });

  if (!authResponse.ok) {
    const error = await authResponse.text();
    throw new Error(`Failed to authenticate: ${error}`);
  }

  const { token } = (await authResponse.json()) as { token: string };

  return { token };
}

/**
 * Make an authenticated fetch request to the Skillz Market API.
 *
 * @param url - Full URL to fetch
 * @param token - JWT token from authenticate()
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function authenticatedFetch(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  return fetch(url, {
    ...options,
    headers,
  });
}
