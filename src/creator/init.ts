import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const DASHBOARD_URL = 'https://skillz.market/dashboard';

/**
 * Interactive setup for Skillz Market SDK.
 * Guides the user through getting and configuring their API key.
 *
 * @example
 * ```typescript
 * import { init } from '@skillzmarket/sdk/creator';
 *
 * // Run interactive setup
 * await init();
 * ```
 */
export async function init(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  console.log('');
  console.log('='.repeat(60));
  console.log('  Skillz Market SDK - Setup');
  console.log('='.repeat(60));
  console.log('');

  // Check for existing API key
  const existingKey = process.env.SKILLZ_API_KEY;
  if (existingKey) {
    console.log('✓ Found existing API key in environment: SKILLZ_API_KEY');
    console.log(`  Key prefix: ${existingKey.slice(0, 11)}...`);
    console.log('');
    const overwrite = await question('Do you want to set up a new key? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('');
      console.log('Setup complete! Your existing API key will be used.');
      rl.close();
      return;
    }
    console.log('');
  }

  // Instructions for getting an API key
  console.log('To register skills, you need an API key from Skillz Market.');
  console.log('');
  console.log('Steps to get your API key:');
  console.log('');
  console.log('  1. Go to: ' + DASHBOARD_URL);
  console.log('  2. Connect your wallet');
  console.log('  3. Sign to authenticate (one-time)');
  console.log('  4. Find the "API Keys" section');
  console.log('  5. Click "Create Key" and copy the key');
  console.log('');

  // Wait for user to get the key
  const apiKey = await question('Paste your API key here (sk_...): ');

  if (!apiKey) {
    console.log('');
    console.log('No API key provided. Setup cancelled.');
    rl.close();
    return;
  }

  if (!apiKey.startsWith('sk_')) {
    console.log('');
    console.log('⚠️  Warning: API keys should start with "sk_"');
    console.log('   The key you entered might be invalid.');
    console.log('');
  }

  // Ask for wallet address
  console.log('');
  const walletAddress = await question('Your wallet address for receiving payments (0x...): ');

  if (!walletAddress) {
    console.log('');
    console.log('No wallet address provided. Setup cancelled.');
    rl.close();
    return;
  }

  if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
    console.log('');
    console.log('⚠️  Warning: Wallet address should be 42 characters starting with "0x"');
    console.log('');
  }

  // Ask where to save
  console.log('');
  console.log('Where would you like to save the configuration?');
  console.log('');
  console.log('  1. Create/update .env file (recommended)');
  console.log('  2. Show commands to set environment variables');
  console.log('  3. Cancel');
  console.log('');

  const choice = await question('Choose an option (1/2/3): ');

  console.log('');

  if (choice === '1') {
    // Write to .env file
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';

    // Read existing .env if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');

      // Remove existing SKILLZ_ variables
      envContent = envContent
        .split('\n')
        .filter((line) => !line.startsWith('SKILLZ_API_KEY=') && !line.startsWith('SKILLZ_WALLET_ADDRESS='))
        .join('\n');

      if (envContent && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
    }

    // Add new variables
    envContent += `\n# Skillz Market SDK Configuration\n`;
    envContent += `SKILLZ_API_KEY=${apiKey}\n`;
    envContent += `SKILLZ_WALLET_ADDRESS=${walletAddress}\n`;

    fs.writeFileSync(envPath, envContent);

    console.log('✓ Configuration saved to .env');
    console.log('');
    console.log('Make sure .env is in your .gitignore!');
  } else if (choice === '2') {
    console.log('Add these to your environment:');
    console.log('');
    console.log(`  export SKILLZ_API_KEY="${apiKey}"`);
    console.log(`  export SKILLZ_WALLET_ADDRESS="${walletAddress}"`);
    console.log('');
    console.log('Or add to your shell profile (~/.bashrc, ~/.zshrc, etc.)');
  } else {
    console.log('Setup cancelled.');
    rl.close();
    return;
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('  Setup Complete!');
  console.log('='.repeat(60));
  console.log('');
  console.log('You can now use the SDK:');
  console.log('');
  console.log('  import { skill, serve } from "@skillzmarket/sdk/creator";');
  console.log('');
  console.log('  const mySkill = skill({ price: "$0.001" }, async (input) => {');
  console.log('    return { result: "Hello!" };');
  console.log('  });');
  console.log('');
  console.log('  serve({ mySkill }, {');
  console.log('    register: { endpoint: "https://your-server.com", enabled: true }');
  console.log('  });');
  console.log('');

  rl.close();
}

/**
 * Check if the SDK is configured with necessary credentials.
 * Returns an object with configuration status and any issues found.
 */
export function checkConfig(): {
  configured: boolean;
  apiKey: boolean;
  walletAddress: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  const apiKey = process.env.SKILLZ_API_KEY;
  const walletAddress = process.env.SKILLZ_WALLET_ADDRESS || process.env.SKILLZ_WALLET_KEY;

  if (!apiKey) {
    issues.push('SKILLZ_API_KEY is not set. Run `npx @skillzmarket/sdk init` to configure.');
  } else if (!apiKey.startsWith('sk_')) {
    issues.push('SKILLZ_API_KEY should start with "sk_"');
  }

  if (!walletAddress) {
    issues.push('SKILLZ_WALLET_ADDRESS is not set. This is required for receiving payments.');
  } else if (!walletAddress.startsWith('0x')) {
    issues.push('Wallet address should start with "0x"');
  }

  return {
    configured: issues.length === 0,
    apiKey: !!apiKey && apiKey.startsWith('sk_'),
    walletAddress: !!walletAddress && walletAddress.startsWith('0x'),
    issues,
  };
}
