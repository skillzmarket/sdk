# @skillzmarket/sdk

[![npm version](https://img.shields.io/npm/v/@skillzmarket/sdk.svg)](https://www.npmjs.com/package/@skillzmarket/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SDK for discovering and calling paid AI skills with automatic x402 crypto payments.

## Features

- **Discover skills** - Search and explore the Skillz Market registry
- **Automatic payments** - x402 protocol handles USDC payments seamlessly
- **Create skills** - Monetize your AI services with zero crypto knowledge
- **Type-safe** - Full TypeScript support with comprehensive types
- **Base network** - Fast, low-cost transactions on Base mainnet

## Installation

```bash
npm install @skillzmarket/sdk viem
# or
pnpm add @skillzmarket/sdk viem
```

## Quick Start

### Consumer: Call Paid Skills

```typescript
import { SkillzMarket } from '@skillzmarket/sdk';

const market = new SkillzMarket({ wallet: '0x...' });
const result = await market.call('text-to-image', { prompt: 'A sunset' });
```

### Creator: Monetize Your Skills

```typescript
import { skill, serve } from '@skillzmarket/sdk/creator';

const echo = skill({ price: '$0.001' }, async (input) => ({ echo: input }));
serve({ echo }); // Run: SKILLZ_WALLET_KEY=0x... npx tsx index.ts
```

## Documentation

📚 **[Full Documentation](https://docs.skillz.market)** - Complete guides, API reference, and examples.

---

## AI Assistant Integration

For AI assistants like Claude, use the MCP package:

```json
{
  "mcpServers": {
    "skillzmarket": {
      "command": "npx",
      "args": ["@skillzmarket/mcp"],
      "env": { "SKILLZ_PRIVATE_KEY": "0x..." }
    }
  }
}
```

| Tool | Description |
|------|-------------|
| `skillz_search` | Search for skills |
| `skillz_info` | Get skill details |
| `skillz_call` | Call with payment |
| `skillz_reviews` | Get reviews |

See [@skillzmarket/mcp](../mcp) for details.

---

## Consumer API

The consumer API lets you discover and call paid skills.

### Initialize

```typescript
import { SkillzMarket } from '@skillzmarket/sdk';

// Without wallet (discovery only)
const market = new SkillzMarket();

// With wallet (can call paid skills)
const market = new SkillzMarket({
  wallet: '0x...private-key',
  apiUrl: 'https://api.skillz.market', // optional
  network: 'eip155:8453', // Base mainnet (default)
});
```

### Methods

| Method | Description |
|--------|-------------|
| `search(query, filters?)` | Search for skills by keyword |
| `info(slug)` | Get detailed skill information |
| `call(slug, input)` | Call a skill with automatic payment |
| `getCreator(address)` | Get creator profile |
| `getReviews(slug)` | Get reviews for a skill |
| `authenticate()` | Auth with wallet signature |
| `feedback(slug, score, comment?)` | Submit a review |

### Example

```typescript
import { SkillzMarket } from '@skillzmarket/sdk';

const market = new SkillzMarket({
  wallet: process.env.WALLET_KEY,
});

// Discover skills
const skills = await market.search('image generation');
const skill = await market.info('text-to-image');

// Call with automatic payment
const result = await market.call('text-to-image', {
  prompt: 'A cyberpunk cityscape at night',
  style: 'photorealistic',
});

// Submit feedback
await market.feedback('text-to-image', 90, 'Amazing results!');
```

### Payment Flow

Payments use the [x402 protocol](https://x402.org):

1. Skill endpoint returns `402 Payment Required`
2. SDK creates USDC transfer (consumer → creator)
3. Payment settles on Base (instant)
4. SDK retries request with payment proof
5. Skill executes and returns result

---

## Creator API

The creator API lets you monetize your AI skills.

### Functions

| Function | Description |
|----------|-------------|
| `skill(options, handler)` | Define a monetized skill |
| `serve(skills, options?)` | Start the skill server |
| `register(skills, options)` | Register skills with marketplace |

### Example

```typescript
import { skill, serve } from '@skillzmarket/sdk/creator';

// Define skills
const summarize = skill({
  price: '$0.005',
  description: 'Summarize text using AI',
  inputSchema: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
  },
}, async ({ text }) => {
  // Your AI logic here
  return { summary: text.slice(0, 100) + '...' };
});

const translate = skill({
  price: '$0.003',
  description: 'Translate text between languages',
}, async ({ text, targetLang }) => {
  return { translated: `[${targetLang}] ${text}` };
});

// Serve multiple skills
serve({ summarize, translate }, {
  port: 3002,
  register: {
    endpoint: 'https://your-server.com',
    enabled: true,
  },
});
```

### Price Formats

Creators can specify prices in multiple formats:

| Format | Example | Result |
|--------|---------|--------|
| Dollar sign | `'$0.001'` | 0.001 USDC |
| With currency | `'0.005 USDC'` | 0.005 USDC |
| Plain number | `'0.01'` | 0.01 USDC |

### Skill Options

```typescript
interface SkillOptions {
  price: string;           // Required: price per call
  description?: string;    // What the skill does
  timeout?: number;        // Max execution time (ms, default: 60000)
  inputSchema?: JsonSchema;  // JSON Schema for input validation
  outputSchema?: JsonSchema; // JSON Schema for output format
}
```

### Serve Options

```typescript
interface ServeOptions {
  port?: number;           // Port to listen on (default: 3002)
  wallet?: Hex;            // Private key (or use SKILLZ_WALLET_KEY env)
  network?: string;        // Network (default: 'eip155:8453')
  register?: {
    endpoint: string;      // Your public server URL
    enabled?: boolean;     // Enable auto-registration
    onError?: 'throw' | 'warn' | 'silent';
  };
  onCall?: (name, input) => void;   // Callback for skill calls
  onError?: (name, error) => void;  // Callback for errors
}
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SKILLZ_WALLET_KEY` | Private key for payments (Creator) | Yes* |

*Required for `serve()` if not passed in options.

## Security Considerations

### HTTPS Required

All API URLs must use HTTPS. The SDK rejects HTTP URLs (except localhost for development).

### Wallet Security

- Never hardcode private keys in source code
- Use environment variables or secure key management
- Consider hardware wallets for production

### Error Handling

In production (`NODE_ENV=production`), error messages are masked to prevent information disclosure.

---

## Types

### Consumer Types

```typescript
interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  endpoint: string;
  inputSchema: Record<string, unknown> | null;
  outputSchema: Record<string, unknown> | null;
  paymentAddress: string;
  isActive: boolean;
  creatorId: string;
}

interface SearchFilters {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  creator?: string;
}

type WalletConfig = PrivateKeyAccount | Hex;
```

### Creator Types

```typescript
interface SkillDefinition<TInput, TOutput> {
  options: SkillOptions;
  handler: SkillHandler<TInput, TOutput>;
  parsedPrice: ParsedPrice;
}

interface ParsedPrice {
  amount: string;
  currency: 'USDC';
}
```

---

## Requirements

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended)

## License

MIT © [Skillz Market](https://skillz.market)
