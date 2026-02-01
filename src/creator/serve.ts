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
const DEFAULT_API_URL = 'https://api.skillz.market';

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
    trackCalls = true,
    apiUrl = DEFAULT_API_URL,
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

      // Extract payment info from x402 request header
      let paymentInfo: { payer?: string; txHash?: string } = {};
      const paymentHeader = c.req.header('X-PAYMENT');
      if (paymentHeader) {
        try {
          const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
          // Extract payer from the payment payload
          paymentInfo.payer = decoded?.payload?.authorization?.from
            || decoded?.payload?.from
            || decoded?.from;
        } catch {
          // Ignore parse errors
        }
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

        // Build response
        const response = c.json({
          success: true,
          result,
          timestamp: new Date().toISOString(),
        });

        // Track call to Skillz Market analytics with payment info (non-blocking)
        // Note: We track after skill execution to ensure the call was successful
        if (trackCalls) {
          // Try to extract tx hash from PAYMENT-RESPONSE header if available
          // This is set by x402 middleware after payment settlement
          const paymentResponseHeader = response.headers.get('PAYMENT-RESPONSE');
          if (paymentResponseHeader) {
            try {
              const settlement = JSON.parse(Buffer.from(paymentResponseHeader, 'base64').toString());
              paymentInfo.payer = settlement?.payer || paymentInfo.payer;
              paymentInfo.txHash = settlement?.transaction;
            } catch {
              // Ignore parse errors
            }
          }

          fetch(`${apiUrl}/analytics/usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              skillSlug: name,
              consumerAddress: paymentInfo.payer,
              paymentTxHash: paymentInfo.txHash,
              amount: definition.parsedPrice.amount,
            }),
          }).catch(() => {}); // Silently ignore tracking errors
        }

        return response;
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

        console.log('='.repeat(50));
        console.log('');
      }
    }
  );
}
