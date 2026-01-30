import { describe, it, expect } from 'vitest';
import { parsePrice, formatPriceForX402 } from '../utils/price.js';

describe('parsePrice', () => {
  it('parses dollar format: $0.001', () => {
    const result = parsePrice('$0.001');
    expect(result).toEqual({ amount: '0.001', currency: 'USDC' });
  });

  it('parses dollar format with spaces: $ 0.001', () => {
    const result = parsePrice('$ 0.001');
    expect(result).toEqual({ amount: '0.001', currency: 'USDC' });
  });

  it('parses USDC format: 0.005 USDC', () => {
    const result = parsePrice('0.005 USDC');
    expect(result).toEqual({ amount: '0.005', currency: 'USDC' });
  });

  it('parses USDC format lowercase: 0.005 usdc', () => {
    const result = parsePrice('0.005 usdc');
    expect(result).toEqual({ amount: '0.005', currency: 'USDC' });
  });

  it('parses USDC format no space: 0.005USDC', () => {
    const result = parsePrice('0.005USDC');
    expect(result).toEqual({ amount: '0.005', currency: 'USDC' });
  });

  it('parses plain number: 0.01', () => {
    const result = parsePrice('0.01');
    expect(result).toEqual({ amount: '0.01', currency: 'USDC' });
  });

  it('parses with whitespace: "  $0.001  "', () => {
    const result = parsePrice('  $0.001  ');
    expect(result).toEqual({ amount: '0.001', currency: 'USDC' });
  });

  it('throws on invalid format', () => {
    expect(() => parsePrice('invalid')).toThrow('Invalid price format');
  });

  it('throws on negative amount', () => {
    expect(() => parsePrice('$-0.001')).toThrow('must be positive');
  });

  it('throws on zero amount', () => {
    expect(() => parsePrice('$0')).toThrow('must be positive');
  });

  it('throws on excessively high amount', () => {
    expect(() => parsePrice('$1001')).toThrow('seems too high');
  });

  it('throws on non-numeric amount', () => {
    expect(() => parsePrice('$abc')).toThrow('not a number');
  });
});

describe('formatPriceForX402', () => {
  it('formats to x402 format', () => {
    const result = formatPriceForX402({ amount: '0.001', currency: 'USDC' });
    expect(result).toBe('$0.001');
  });

  it('preserves decimal precision', () => {
    const result = formatPriceForX402({ amount: '0.0005', currency: 'USDC' });
    expect(result).toBe('$0.0005');
  });
});
