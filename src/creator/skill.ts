import type { SkillOptions, SkillHandler, SkillDefinition } from './types.js';
import { parsePrice } from './utils/price.js';

/**
 * Define a monetized skill.
 *
 * @example
 * ```typescript
 * const echo = skill({
 *   price: '$0.001',
 *   description: 'Echoes input back',
 * }, async (input) => {
 *   return { echo: input };
 * });
 * ```
 *
 * @param options - Skill configuration (price, description, timeout)
 * @param handler - Async function that processes input and returns output
 * @returns SkillDefinition ready to be served
 */
export function skill<TInput = unknown, TOutput = unknown>(
  options: SkillOptions,
  handler: SkillHandler<TInput, TOutput>
): SkillDefinition<TInput, TOutput> {
  // Validate and parse price upfront
  const parsedPrice = parsePrice(options.price);

  // Validate timeout if provided
  if (options.timeout !== undefined) {
    if (typeof options.timeout !== 'number' || options.timeout <= 0) {
      throw new Error(
        `Invalid timeout: ${options.timeout}. Must be a positive number (milliseconds).`
      );
    }
    if (options.timeout > 300000) {
      throw new Error(
        `Timeout too long: ${options.timeout}ms. Maximum is 300000ms (5 minutes).`
      );
    }
  }

  // Validate groups if provided
  if (options.groups !== undefined) {
    if (!Array.isArray(options.groups)) {
      throw new Error('Groups must be an array of strings');
    }
    for (const group of options.groups) {
      if (typeof group !== 'string' || group.trim() === '') {
        throw new Error('Each group must be a non-empty string');
      }
    }
  }

  return {
    options: {
      ...options,
      timeout: options.timeout ?? 60000, // Default 60 seconds
    },
    handler,
    parsedPrice,
  };
}
