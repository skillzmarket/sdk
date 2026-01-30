import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveWallet, maskPrivateKey } from '../utils/wallet.js';

// A valid test private key (DO NOT use in production)
const TEST_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;

describe('resolveWallet', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SKILLZ_WALLET_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves from explicit wallet option', () => {
    const result = resolveWallet(TEST_PRIVATE_KEY);
    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.account).toBeDefined();
  });

  it('resolves from environment variable', () => {
    process.env.SKILLZ_WALLET_KEY = TEST_PRIVATE_KEY;
    const result = resolveWallet();
    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it('prefers explicit wallet over env var', () => {
    process.env.SKILLZ_WALLET_KEY = TEST_PRIVATE_KEY;
    const differentKey =
      '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
    const result = resolveWallet(differentKey as `0x${string}`);
    // Should use the explicit key, not env var
    expect(result.address).not.toBe(resolveWallet(TEST_PRIVATE_KEY).address);
  });

  it('throws if no wallet configured', () => {
    expect(() => resolveWallet()).toThrow('No wallet configured');
  });

  it('throws if wallet does not start with 0x', () => {
    expect(() =>
      resolveWallet('ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as `0x${string}`)
    ).toThrow('must start with "0x"');
  });

  it('throws on invalid private key', () => {
    expect(() => resolveWallet('0xinvalid' as `0x${string}`)).toThrow(
      'Invalid wallet private key'
    );
  });
});

describe('maskPrivateKey', () => {
  it('masks a valid private key', () => {
    const masked = maskPrivateKey(TEST_PRIVATE_KEY);
    expect(masked).toBe('0xac09...ff80');
    expect(masked).not.toContain('74bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2');
  });

  it('handles short keys', () => {
    const masked = maskPrivateKey('0x1234' as `0x${string}`);
    expect(masked).toBe('0x****');
  });
});
