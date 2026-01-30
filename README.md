# @skillzmarket/sdk

SDK for discovering and calling paid AI skills with automatic cryptocurrency payments.

## Installation

```bash
npm install @skillzmarket/sdk viem
```

## Quick Start

```typescript
import { SkillzMarket } from '@skillzmarket/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Initialize with your wallet (for payments)
const sdk = new SkillzMarket({
  wallet: '0x...your-private-key', // or privateKeyToAccount('0x...')
});

// Search for skills
const skills = await sdk.search('web scraper');

// Get skill details
const skill = await sdk.info('web-scraper');
console.log(`${skill.name} - ${skill.price} ${skill.currency}`);

// Call a skill (payment handled automatically)
const result = await sdk.call('web-scraper', {
  url: 'https://example.com'
});
```

## Features

- **Discover skills** - Search and browse the marketplace
- **Automatic payments** - x402 protocol handles USDC payments on Base
- **Type-safe** - Full TypeScript support
- **Wallet auth** - Sign-in with Ethereum wallet

## Usage

### Initialize

```typescript
import { SkillzMarket } from '@skillzmarket/sdk';

// Without wallet (discovery only)
const sdk = new SkillzMarket();

// With wallet (can call paid skills)
const sdk = new SkillzMarket({
  wallet: '0x...private-key',
  apiUrl: 'https://api.skillz.market', // optional, must use HTTPS
  network: 'eip155:8453', // Base mainnet (default)
});
```

### Discovery

```typescript
// Search skills
const skills = await sdk.search('image generation');

// Get skill details
const skill = await sdk.info('dall-e-generator');

// Get creator profile
const creator = await sdk.getCreator('0x...');

// Get reviews
const reviews = await sdk.getReviews('dall-e-generator');
```

### Calling Skills

```typescript
// Call a skill - payment is automatic
const result = await sdk.call('web-scraper', {
  url: 'https://example.com'
});

// The SDK:
// 1. Fetches skill info (endpoint, price)
// 2. Calls the endpoint
// 3. Handles 402 Payment Required
// 4. Signs USDC transfer on Base
// 5. Retries with payment proof
// 6. Returns the result
```

### Authentication & Reviews

```typescript
// Authenticate (for submitting reviews)
await sdk.authenticate();

// Submit feedback
await sdk.feedback('web-scraper', 85, 'Great results!');
```

## Payment Flow

Payments use the [x402 protocol](https://x402.org):

1. Skill endpoint returns `402 Payment Required`
2. SDK creates USDC transfer (consumer → creator)
3. Payment settles on Base (instant)
4. SDK retries request with payment proof
5. Skill executes and returns result

**Requirements:**
- Wallet with USDC on Base mainnet
- Private key or viem account

## Security Considerations

### HTTPS Required

All API URLs must use HTTPS to ensure secure communication. The SDK will reject HTTP URLs (except for localhost during development).

### Wallet Security

- Never hardcode private keys in your source code
- Use environment variables or secure key management solutions
- Consider using hardware wallets for production deployments

### Error Handling

In production (`NODE_ENV=production`), error messages from skill execution are masked to prevent information disclosure. Detailed error information is only available in development environments.

## API Reference

### `SkillzMarket`

```typescript
interface SkillzMarketOptions {
  wallet?: WalletConfig;        // Private key or viem account
  apiUrl?: string;              // API URL (default: https://api.skillz.market)
  network?: `${string}:${string}`; // Chain (default: eip155:8453)
}
```

### Methods

| Method | Description |
|--------|-------------|
| `search(query, filters?)` | Search skills |
| `info(slug)` | Get skill details |
| `call(slug, input)` | Call a skill (with payment) |
| `getCreator(address)` | Get creator profile |
| `getReviews(slug)` | Get skill reviews |
| `authenticate()` | Auth with wallet signature |
| `feedback(slug, score, comment?)` | Submit review |

### Types

```typescript
interface Skill {
  slug: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  endpoint: string;
  paymentAddress: string;
  isActive: boolean;
}
```

## License

MIT
