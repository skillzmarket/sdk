import type { ParsedPrice } from '../types.js';

/**
 * Parse a human-friendly price string into structured price info.
 *
 * Supported formats:
 * - '$0.001' → { amount: '0.001', currency: 'USDC' }
 * - '0.005 USDC' → { amount: '0.005', currency: 'USDC' }
 * - '0.01' → { amount: '0.01', currency: 'USDC' }
 *
 * @param price - Human-friendly price string
 * @returns Parsed price with amount and currency
 * @throws Error if price format is invalid
 */
export function parsePrice(price: string): ParsedPrice {
  const trimmed = price.trim();

  // Format: $0.001
  if (trimmed.startsWith('$')) {
    const amount = trimmed.slice(1).trim();
    validateAmount(amount);
    return { amount, currency: 'USDC' };
  }

  // Format: 0.005 USDC
  const usdcMatch = trimmed.match(/^([\d.]+)\s*USDC$/i);
  if (usdcMatch?.[1]) {
    const amount = usdcMatch[1];
    validateAmount(amount);
    return { amount, currency: 'USDC' };
  }

  // Format: just a number (assume USDC)
  if (/^[\d.]+$/.test(trimmed)) {
    validateAmount(trimmed);
    return { amount: trimmed, currency: 'USDC' };
  }

  throw new Error(
    `Invalid price format: "${price}". ` +
      `Expected formats: '$0.001', '0.005 USDC', or '0.01'`
  );
}

/**
 * Validate that an amount is a valid positive number
 */
function validateAmount(amount: string): void {
  const num = parseFloat(amount);

  if (isNaN(num)) {
    throw new Error(`Invalid price amount: "${amount}" is not a number`);
  }

  if (num <= 0) {
    throw new Error(`Invalid price amount: "${amount}" must be positive`);
  }

  if (num > 1000) {
    throw new Error(
      `Invalid price amount: "${amount}" seems too high. ` +
        `Did you mean $${amount}?`
    );
  }
}

/**
 * Format a parsed price back to x402 format (e.g., '$0.001')
 */
export function formatPriceForX402(parsed: ParsedPrice): string {
  return `$${parsed.amount}`;
}
