import { DiscoveryClient, type SkillGroupWithSkills } from './discovery.js';
import { createPaymentFetch, getWalletAddress, DEFAULT_NETWORK } from './payment.js';
import type {
  Skill,
  SkillGroup,
  SearchFilters,
  SkillzMarketOptions,
  WalletConfig,
} from './types.js';

const DEFAULT_API_URL = 'https://api.skillz.market';

/**
 * Validate that a URL uses HTTPS protocol.
 * Allows localhost for development purposes.
 */
function validateHttpsUrl(url: string, paramName: string): void {
  const parsed = new URL(url);
  const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (!isLocalhost && parsed.protocol !== 'https:') {
    throw new Error(`${paramName} must use HTTPS protocol for security`);
  }
}

export class SkillzMarket {
  private discovery: DiscoveryClient;
  private apiUrl: string;
  private wallet?: WalletConfig;
  private walletAddress?: string;
  private paymentFetch?: typeof fetch;
  private authToken?: string;

  constructor(options: SkillzMarketOptions = {}) {
    this.apiUrl = options.apiUrl || DEFAULT_API_URL;

    // Validate HTTPS for API URL (allow localhost for development)
    validateHttpsUrl(this.apiUrl, 'apiUrl');

    this.discovery = new DiscoveryClient(this.apiUrl);

    if (options.wallet) {
      this.wallet = options.wallet;
      this.walletAddress = getWalletAddress(options.wallet);
      this.paymentFetch = createPaymentFetch(
        options.wallet,
        options.network || DEFAULT_NETWORK
      );
    }
  }

  // Discovery methods
  async search(query: string, filters?: SearchFilters): Promise<Skill[]> {
    return this.discovery.search(query, filters);
  }

  async info(slug: string): Promise<Skill> {
    return this.discovery.getSkill(slug);
  }

  async getCreator(address: string) {
    return this.discovery.getCreator(address);
  }

  async getReviews(skillSlug: string) {
    return this.discovery.getReviews(skillSlug);
  }

  async getGroups(creatorAddress?: string): Promise<SkillGroup[]> {
    return this.discovery.getGroups(creatorAddress);
  }

  async getGroup(slug: string, creatorAddress?: string): Promise<SkillGroupWithSkills> {
    return this.discovery.getGroup(slug, creatorAddress);
  }

  // Execution (handles x402 payment automatically)
  async call<T = unknown>(slug: string, input: Record<string, unknown>): Promise<T> {
    if (!this.paymentFetch || !this.wallet) {
      throw new Error('Wallet required for calling paid skills');
    }

    const skill = await this.info(slug);

    if (!skill.isActive) {
      throw new Error(`Skill ${slug} is not active`);
    }

    const response = await this.paymentFetch(skill.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Skill call failed: ${response.statusText}`);
    }

    // Track payment after successful call (fire and forget)
    // The PAYMENT-RESPONSE header is set by x402 middleware with settlement info
    const settlementHeader = response.headers.get('PAYMENT-RESPONSE');
    if (settlementHeader) {
      try {
        const settlement = JSON.parse(Buffer.from(settlementHeader, 'base64').toString());
        fetch(`${this.apiUrl}/analytics/usage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            skillSlug: slug,
            consumerAddress: settlement.payer,
            paymentTxHash: settlement.transaction,
            amount: skill.price,
          }),
        }).catch(() => {}); // Silent fail - don't block the response
      } catch {
        // Ignore parse errors
      }
    }

    return response.json();
  }

  // Authentication
  async authenticate(): Promise<string> {
    if (!this.wallet || !this.walletAddress) {
      throw new Error('Wallet required for authentication');
    }

    const { resolveAccount } = await import('./payment.js');
    const account = resolveAccount(this.wallet);

    // Get challenge
    const challengeRes = await fetch(`${this.apiUrl}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: this.walletAddress }),
    });

    if (!challengeRes.ok) {
      throw new Error('Failed to get auth challenge');
    }

    const { message } = await challengeRes.json();

    // Sign message using viem account
    if (!account.signMessage) {
      throw new Error('Account does not support message signing');
    }
    const signature = await account.signMessage({ message });

    // Verify and get token
    const verifyRes = await fetch(`${this.apiUrl}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: this.walletAddress, signature }),
    });

    if (!verifyRes.ok) {
      throw new Error('Authentication failed');
    }

    const { token } = await verifyRes.json();
    this.authToken = token;
    return token;
  }

  // Feedback
  async feedback(slug: string, score: number, comment?: string): Promise<void> {
    if (!this.authToken) {
      await this.authenticate();
    }

    const response = await fetch(`${this.apiUrl}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      body: JSON.stringify({ skillSlug: slug, score, comment }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit feedback: ${response.statusText}`);
    }
  }

  /**
   * Check if wallet is configured for x402 payments.
   */
  hasWallet(): boolean {
    return !!this.wallet;
  }
}
