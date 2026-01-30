import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve as honoServe } from '@hono/node-server';
import type { SkillsMap, ServeOptions } from './types.js';
import { resolveWallet } from './utils/wallet.js';
import { createPaymentMiddleware } from './payment.js';
import { register, buildRegisterOptions } from './register.js';
import type { Hex } from 'viem';

const DEFAULT_PORT = 3002;
const DEFAULT_NETWORK = 'eip155:8453' as const;
const DEFAULT_FACILITATOR_URL = 'https://x402.dexter.cash';
const DEFAULT_APP_NAME = 'Skillz Market Skill';

/**
 * Start a server with the provided skills.
 *
 * @example
 * ```typescript
 * import { skill, serve } from '@skillzmarket/sdk/creator';
 *
 * const echo = skill({ price: '$0.001' }, async (input) => ({ echo: input }));
 * const upper = skill({ price: '$0.0005' }, async ({ text }) => ({ result: text.toUpperCase() }));
 *
 * serve({ echo, upper });
 * ```
 *
 * @param skills - Map of skill names to their definitions
 * @param options - Server configuration options
 */
export async function serve(
  skills: SkillsMap,
  options: ServeOptions = {}
): Promise<void> {
  const {
    port = DEFAULT_PORT,
    wallet,
    dev = process.env.NODE_ENV !== 'production',
    network = DEFAULT_NETWORK,
    facilitatorUrl = DEFAULT_FACILITATOR_URL,
    appName = DEFAULT_APP_NAME,
    onCall,
    onError,
    register: registerOpts,
  } = options;

  // Validate skills
  const skillNames = Object.keys(skills);
  if (skillNames.length === 0) {
    throw new Error('No skills provided. Pass at least one skill to serve().');
  }

  // Resolve wallet
  const { account, address: walletAddress } = resolveWallet(wallet as Hex | undefined);

  // Create Hono app
  const app = new Hono();

  // Enable CORS
  app.use('*', cors());

  // Create and apply payment middleware
  const paymentMiddleware = await createPaymentMiddleware(skills, walletAddress, {
    dev,
    network,
    facilitatorUrl,
    appName,
  });
  app.use('*', paymentMiddleware);

  // Health check endpoint (not protected)
  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      skills: skillNames,
      dev,
    })
  );

  // Register skill endpoints
  for (const [name, definition] of Object.entries(skills)) {
    app.post(`/${name}`, async (c) => {
      let input: unknown;

      try {
        input = await c.req.json();
      } catch {
        input = {};
      }

      // Call onCall callback if provided
      if (onCall) {
        try {
          onCall(name, input);
        } catch {
          // Ignore callback errors
        }
      }

      try {
        const result = await definition.handler(input);
        return c.json({
          success: true,
          result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        // Call onError callback if provided
        if (onError) {
          try {
            onError(name, err);
          } catch {
            // Ignore callback errors
          }
        }

        return c.json(
          {
            success: false,
            error: err.message,
            timestamp: new Date().toISOString(),
          },
          500
        );
      }
    });
  }

  // Start server
  honoServe(
    {
      fetch: app.fetch,
      port,
    },
    async (info) => {
      console.log('');
      console.log('='.repeat(50));
      console.log('  Skillz Market - Creator Server');
      console.log('='.repeat(50));
      console.log('');
      console.log(`  URL:      http://localhost:${info.port}`);
      console.log(`  Network:  ${network}`);
      console.log(`  Wallet:   ${walletAddress}`);
      console.log(`  Mode:     ${dev ? 'Development' : 'Production'}`);
      console.log('');
      console.log('  Skills:');
      for (const [name, definition] of Object.entries(skills)) {
        console.log(
          `    POST /${name} - ${definition.parsedPrice.amount} USDC`
        );
        if (definition.options.description) {
          console.log(`         ${definition.options.description}`);
        }
      }
      console.log('');
      if (dev) {
        console.log('  Dev mode: Set X-Skip-Payment: true header to bypass payment');
        console.log('');
      }
      console.log('='.repeat(50));
      console.log('');

      // Auto-register skills if registration is configured
      if (registerOpts && registerOpts.enabled !== false) {
        console.log('  Registering skills with Skillz Market...');
        console.log('');

        const registerOptions = buildRegisterOptions(registerOpts, account);
        const results = await register(skills, registerOptions);

        // Log registration results
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (successful.length > 0) {
          console.log('  ✓ Registered skills:');
          for (const result of successful) {
            console.log(`    - ${result.name} (${result.slug})`);
          }
          console.log('');
        }

        if (failed.length > 0 && registerOpts.onError !== 'silent') {
          console.log('  ✗ Failed to register:');
          for (const result of failed) {
            console.log(`    - ${result.name}: ${result.error}`);
          }
          console.log('');
        }

        console.log('='.repeat(50));
        console.log('');
      }
    }
  );
}
