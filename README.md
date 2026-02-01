# @skillzmarket/sdk

[![npm version](https://img.shields.io/npm/v/@skillzmarket/sdk.svg)](https://www.npmjs.com/package/@skillzmarket/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

SDK for discovering and calling paid AI skills with automatic x402 crypto payments.

## Features

- **Discover skills** - Search and explore the Skillz Market registry
- **Automatic payments** - x402 protocol handles USDC payments seamlessly
- **Create skills** - Monetize your AI services with zero crypto knowledge
- **Simple auth** - API key authentication (no wallet signing on each start)
- **Type-safe** - Full TypeScript support with comprehensive types
- **Base network** - Fast, low-cost transactions on Base mainnet

## Installation

```bash
npm install @skillzmarket/sdk viem
# or
pnpm add @skillzmarket/sdk viem
```

## Quick Start

### Creator: Monetize Your Skills

The fastest way to get started is with the interactive setup:

```bash
npx @skillzmarket/sdk init
```

This will:
1. Guide you through getting an API key from the dashboard
2. Configure your wallet address for receiving payments
3. Save configuration to `.env`

Then create your skills:

```typescript
import { skill, serve } from '@skillzmarket/sdk/creator';

const echo = skill({
  price: '$0.001',
  description: 'Echoes input back',
}, async (input) => ({ echo: input }));

serve({ echo }, {
  register: {
    endpoint: 'https://your-server.com',
    enabled: true,
  },
});
```

### Consumer: Call Paid Skills

```typescript
import { SkillzMarket } from '@skillzmarket/sdk';

const market = new SkillzMarket({ wallet: '0x...' });
const result = await market.call('text-to-image', { prompt: 'A sunset' });
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

### Getting Started

#### 1. Interactive Setup (Recommended)

```bash
npx @skillzmarket/sdk init
```

This guides you through:
- Getting an API key from [skillz.market/dashboard](https://skillz.market/dashboard)
- Configuring your wallet address
- Saving to `.env`

#### 2. Manual Setup

Set environment variables:

```bash
export SKILLZ_API_KEY="sk_..."          # API key from dashboard
export SKILLZ_WALLET_ADDRESS="0x..."     # Your wallet address
```

Or pass them directly:

```typescript
serve({ echo }, {
  apiKey: 'sk_...',
  wallet: '0x...',
});
```

### Functions

| Function | Description |
|----------|-------------|
| `skill(options, handler)` | Define a monetized skill |
| `serve(skills, options?)` | Start the skill server |
| `register(skills, options)` | Register skills with marketplace |
| `init()` | Interactive CLI setup |
| `checkConfig()` | Validate SDK configuration |

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

### Configuration Helpers

#### init()

Interactive CLI setup that guides you through configuration:

```typescript
import { init } from '@skillzmarket/sdk/creator';

await init();
// Prompts for API key, wallet address, saves to .env
```

Or run directly:

```bash
npx @skillzmarket/sdk init
```

#### checkConfig()

Validate that required configuration is present:

```typescript
import { checkConfig } from '@skillzmarket/sdk/creator';

const config = checkConfig();

if (!config.configured) {
  console.error('Configuration issues:');
  config.issues.forEach(issue => console.error(`  - ${issue}`));
  process.exit(1);
}

// config.apiKey - boolean, true if SKILLZ_API_KEY is valid
// config.walletAddress - boolean, true if wallet is configured
// config.issues - string[], list of configuration problems
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
  wallet?: string;         // Wallet address (42-char) or private key (66-char)
                           // Falls back to SKILLZ_WALLET_ADDRESS or SKILLZ_WALLET_KEY env
  apiKey?: string;         // API key for registration
                           // Falls back to SKILLZ_API_KEY env
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

## Authentication Flow

The SDK uses API key authentication for skill registration:

1. **One-time setup**: Sign with your wallet on [skillz.market/dashboard](https://skillz.market/dashboard) to create your account
2. **Get API key**: Create an API key in the dashboard's "API Keys" section
3. **Use in SDK**: The API key authenticates registration requests - no signing required

Benefits over wallet signing on every start:
- No private key needed in your skill server
- Can rotate/revoke keys without changing wallet
- Same security (wallet verified at account creation)

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SKILLZ_API_KEY` | API key for registration | Yes (creator) |
| `SKILLZ_WALLET_ADDRESS` | Wallet address for receiving payments | Yes (creator) |
| `SKILLZ_WALLET_KEY` | Private key (legacy, address is derived) | No* |

*`SKILLZ_WALLET_KEY` is supported for backwards compatibility but `SKILLZ_WALLET_ADDRESS` is preferred since you don't need the private key for serving skills.

## Security Considerations

### HTTPS Required

All API URLs must use HTTPS. The SDK rejects HTTP URLs (except localhost for development).

### Wallet Security

With API key authentication, your skill server only needs a wallet **address** (not private key) for receiving payments. The private key is only used when:
- Creating your account (one-time signature in dashboard)
- Making payments as a consumer

### API Key Security

- Store API keys securely (environment variables, secrets manager)
- Never commit API keys to source control
- Rotate keys if compromised via the dashboard
- Use separate keys for development/production

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

interface RegistrationResult {
  name: string;
  success: boolean;
  slug?: string;
  error?: string;
}
```

---

## Requirements

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended)

## License

MIT © [Skillz Market](https://skillz.market)
