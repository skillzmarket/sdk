import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve as honoServe } from '@hono/node-server';
import type { SkillsMap, ServeOptions } from './types.js';
import { resolveWalletToAddress } from './utils/wallet.js';
import { createPaymentMiddleware } from './payment.js';
import { register, buildRegisterOptions } from './register.js';

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
    apiKey,
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

  // Resolve wallet to address (no private key needed now!)
  const walletAddress = resolveWalletToAddress(wallet);

  // Resolve API key
  const resolvedApiKey = apiKey ?? process.env.SKILLZ_API_KEY ?? '';

  // Create Hono app
  const app = new Hono();

  // Enable CORS
  app.use('*', cors());

  // Create and apply payment middleware
  const paymentMiddleware = await createPaymentMiddleware(skills, walletAddress, {
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

        // Return response - tracking is handled by the consumer SDK
        // which receives the PAYMENT-RESPONSE header with settlement info
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

        // Mask error details in production to prevent information disclosure
        const errorMsg = process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message;

        return c.json(
          {
            success: false,
            error: errorMsg,
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
      console.log('='.repeat(50));
      console.log('');

      // Auto-register skills if registration is configured
      if (registerOpts && registerOpts.enabled !== false) {
        if (!resolvedApiKey) {
          console.warn('  ⚠️  No API key provided. Skills will not be registered.');
          console.warn('     Get an API key from https://skillz.market/dashboard');
          console.log('');
        } else {
          // Pre-validate that all skills have at least one group
          const hasGlobalGroups = (registerOpts.groups?.length ?? 0) > 0;
          const skillsWithoutGroups: string[] = [];

          for (const [name, def] of Object.entries(skills)) {
            const hasSkillGroups = (def.options.groups?.length ?? 0) > 0;
            if (!hasGlobalGroups && !hasSkillGroups) {
              skillsWithoutGroups.push(name);
            }
          }

          if (skillsWithoutGroups.length > 0) {
            const message = `Skills missing groups: ${skillsWithoutGroups.join(', ')}. ` +
              'Add groups to SkillOptions or RegistrationOptions.';
            if (registerOpts.onError === 'throw') {
              throw new Error(message);
            } else if (registerOpts.onError !== 'silent') {
              console.warn(`  ⚠️  ${message}`);
              console.log('');
            }
          } else {
            console.log('  Registering skills with Skillz Market...');
            console.log('');

            const registerOptions = buildRegisterOptions(registerOpts, resolvedApiKey, walletAddress);
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
          }
        }

        console.log('='.repeat(50));
        console.log('');
      }
    }
  );
}
