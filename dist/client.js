import { DiscoveryClient } from './discovery.js';
import { createPaymentFetch, getWalletAddress, DEFAULT_NETWORK } from './payment.js';
const DEFAULT_API_URL = 'https://api.skillzmarket.com';
export class SkillzMarket {
    discovery;
    apiUrl;
    wallet;
    walletAddress;
    paymentFetch;
    authToken;
    constructor(options = {}) {
        this.apiUrl = options.apiUrl || DEFAULT_API_URL;
        this.discovery = new DiscoveryClient(this.apiUrl);
        if (options.wallet) {
            this.wallet = options.wallet;
            this.walletAddress = getWalletAddress(options.wallet);
            this.paymentFetch = createPaymentFetch(options.wallet, options.network || DEFAULT_NETWORK);
        }
    }
    // Discovery methods
    async search(query, filters) {
        return this.discovery.search(query, filters);
    }
    async info(slug) {
        return this.discovery.getSkill(slug);
    }
    async getCreator(address) {
        return this.discovery.getCreator(address);
    }
    async getReviews(skillSlug) {
        return this.discovery.getReviews(skillSlug);
    }
    // Execution (handles x402 payment automatically)
    async call(slug, input) {
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
        return response.json();
    }
    // Authentication
    async authenticate() {
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
    async feedback(slug, score, comment) {
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
}
//# sourceMappingURL=client.js.map