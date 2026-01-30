import type { MiddlewareHandler } from 'hono';
import type { SkillsMap, ProtectedRoutes } from './types.js';
import { formatPriceForX402 } from './utils/price.js';

/**
 * Build x402 protected routes configuration from skill definitions.
 */
export function buildProtectedRoutes(
  skills: SkillsMap,
  walletAddress: string,
  network: `${string}:${string}`
): ProtectedRoutes {
  const routes: ProtectedRoutes = {};

  for (const [name, definition] of Object.entries(skills)) {
    const routeKey = `POST /${name}` as `${string} ${string}`;
    routes[routeKey] = {
      accepts: {
        scheme: 'exact' as const,
        price: formatPriceForX402(definition.parsedPrice),
        network,
        payTo: walletAddress,
        maxTimeoutSeconds: Math.ceil((definition.options.timeout ?? 60000) / 1000),
      },
      description: definition.options.description ?? `${name} skill`,
    };
  }

  return routes;
}

/**
 * Create production x402 payment middleware.
 */
export async function createProductionPaymentMiddleware(
  protectedRoutes: ProtectedRoutes,
  facilitatorUrl: string,
  appName: string,
  network: `${string}:${string}`
): Promise<MiddlewareHandler> {
  const { paymentMiddleware, x402ResourceServer } = await import('@x402/hono');
  const { ExactEvmScheme } = await import('@x402/evm/exact/server');
  const { HTTPFacilitatorClient } = await import('@x402/core/server');

  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register('eip155:8453', new ExactEvmScheme())
    .register('eip155:84532', new ExactEvmScheme());

  return paymentMiddleware(protectedRoutes, resourceServer, {
    appName,
    testnet: network.includes('84532'),
  });
}

/**
 * Create x402 payment middleware.
 * Always uses production x402 middleware for security.
 */
export async function createPaymentMiddleware(
  skills: SkillsMap,
  walletAddress: string,
  options: {
    network: `${string}:${string}`;
    facilitatorUrl: string;
    appName: string;
  }
): Promise<MiddlewareHandler> {
  const protectedRoutes = buildProtectedRoutes(
    skills,
    walletAddress,
    options.network
  );

  return createProductionPaymentMiddleware(
    protectedRoutes,
    options.facilitatorUrl,
    options.appName,
    options.network
  );
}
