import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import pc from 'picocolors';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

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
  console.log(pc.dim('='.repeat(60)));
  console.log(pc.bold('  Skillz Market SDK - Setup'));
  console.log(pc.dim('='.repeat(60)));
  console.log('');

  // Check for existing API key
  const existingKey = process.env.SKILLZ_API_KEY;
  if (existingKey) {
    console.log(pc.green('✓') + ' Found existing API key in environment: ' + pc.cyan('SKILLZ_API_KEY'));
    console.log(pc.dim(`  Key prefix: ${existingKey.slice(0, 11)}...`));
    console.log('');
    const overwrite = await question('Do you want to set up a new key? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('');
      console.log(pc.green('Setup complete!') + ' Your existing API key will be used.');
      rl.close();
      return;
    }
    console.log('');
  }

  // Instructions for getting an API key
  console.log('To register skills, you need an API key from Skillz Market.');
  console.log('');
  console.log(pc.bold('Steps to get your API key:'));
  console.log('');
  console.log(pc.dim('  1.') + ' Go to: ' + pc.cyan(DASHBOARD_URL));
  console.log(pc.dim('  2.') + ' Connect your wallet');
  console.log(pc.dim('  3.') + ' Sign to authenticate (one-time)');
  console.log(pc.dim('  4.') + ' Find the "API Keys" section');
  console.log(pc.dim('  5.') + ' Click "Create Key" and copy the key');
  console.log('');

  // Wait for user to get the key
  const apiKey = await question('Paste your API key here (sk_...): ');

  if (!apiKey) {
    console.log('');
    console.log(pc.red('No API key provided. Setup cancelled.'));
    rl.close();
    return;
  }

  if (!apiKey.startsWith('sk_')) {
    console.log('');
    console.log(pc.yellow('⚠️  Warning:') + ' API keys should start with "sk_"');
    console.log(pc.dim('   The key you entered might be invalid.'));
    console.log('');
  }

  // Ask about wallet setup
  console.log('');
  let walletAddress: string;
  let generatedPrivateKey: `0x${string}` | null = null;

  const hasWallet = await question('Do you have a wallet set up to receive payments? (y/N): ');

  if (hasWallet.toLowerCase() === 'y') {
    // User has existing wallet
    const inputAddress = await question('Enter your wallet address (0x...): ');

    if (!inputAddress) {
      console.log('');
      console.log(pc.red('No wallet address provided. Setup cancelled.'));
      rl.close();
      return;
    }

    if (!inputAddress.startsWith('0x') || inputAddress.length !== 42) {
      console.log('');
      console.log(pc.yellow('⚠️  Warning:') + ' Wallet address should be 42 characters starting with "0x"');
      console.log('');
    }

    walletAddress = inputAddress;
  } else {
    // User doesn't have a wallet
    console.log('');
    const generateWallet = await question('Would you like to generate a new wallet? (y/N): ');

    if (generateWallet.toLowerCase() !== 'y') {
      console.log('');
      console.log(pc.dim('You need a wallet to receive payments for your skills.'));
      console.log(pc.dim('Run this setup again when you have a wallet ready.'));
      rl.close();
      return;
    }

    // Generate new wallet
    generatedPrivateKey = generatePrivateKey();
    const account = privateKeyToAccount(generatedPrivateKey);
    walletAddress = account.address;

    console.log('');
    console.log(pc.yellow('╔════════════════════════════════════════════════════════════════╗'));
    console.log(pc.yellow('║') + pc.bold(pc.red('  ⚠️  IMPORTANT: SAVE YOUR PRIVATE KEY NOW!                     ')) + pc.yellow(' ║'));
    console.log(pc.yellow('║                                                                 ║'));
    console.log(pc.yellow('║') + '  You will ' + pc.bold('NOT') + ' be able to retrieve it later.                   ' + pc.yellow(' ║'));
    console.log(pc.yellow('║') + '  Store it securely (password manager, hardware wallet).       ' + pc.yellow(' ║'));
    console.log(pc.yellow('╚════════════════════════════════════════════════════════════════╝'));
    console.log('');
    console.log('  Private Key:    ' + pc.magenta(generatedPrivateKey));
    console.log('  Wallet Address: ' + pc.cyan(walletAddress));
    console.log('');

    await question('Press Enter once you have saved your private key...');
  }

  // Write directly to .env
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';

  // Read existing .env if it exists
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf-8');

    // Remove existing SKILLZ_ variables
    envContent = envContent
      .split('\n')
      .filter(
        (line) =>
          !line.startsWith('SKILLZ_API_KEY=') &&
          !line.startsWith('SKILLZ_WALLET_ADDRESS=') &&
          !line.startsWith('SKILLZ_WALLET_KEY=')
      )
      .join('\n');

    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
  }

  // Add new variables
  envContent += `\n# Skillz Market SDK Configuration\n`;
  envContent += `SKILLZ_API_KEY=${apiKey}\n`;
  envContent += `SKILLZ_WALLET_ADDRESS=${walletAddress}\n`;
  if (generatedPrivateKey) {
    envContent += `SKILLZ_WALLET_KEY=${generatedPrivateKey}\n`;
  }

  fs.writeFileSync(envPath, envContent);

  console.log('');
  console.log(pc.green('✓') + ' Configuration saved to ' + pc.cyan('.env'));
  console.log('');
  console.log(pc.yellow('Make sure .env is in your .gitignore!'))

  console.log('');
  console.log(pc.dim('='.repeat(60)));
  console.log(pc.bold(pc.green('  Setup Complete!')));
  console.log(pc.dim('='.repeat(60)));
  console.log('');
  console.log('You can now use the SDK:');
  console.log('');
  console.log(pc.dim('  import { skill, serve } from "@skillzmarket/sdk/creator";'));
  console.log('');
  console.log(pc.dim('  const mySkill = skill({ price: "$0.001" }, async (input) => {'));
  console.log(pc.dim('    return { result: "Hello!" };'));
  console.log(pc.dim('  });'));
  console.log('');
  console.log(pc.dim('  serve({ mySkill }, {'));
  console.log(pc.dim('    register: { endpoint: "https://your-server.com", enabled: true }'));
  console.log(pc.dim('  });'));
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
