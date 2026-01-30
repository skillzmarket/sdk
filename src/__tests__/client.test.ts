import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillzMarket } from '../client.js';

describe('SkillzMarket', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('should initialize with default API URL', () => {
    const client = new SkillzMarket();
    expect(client).toBeDefined();
  });

  it('should initialize with custom HTTPS API URL', () => {
    const client = new SkillzMarket({ apiUrl: 'https://custom.api' });
    expect(client).toBeDefined();
  });

  it('should allow localhost API URL', () => {
    const client = new SkillzMarket({ apiUrl: 'http://localhost:3000' });
    expect(client).toBeDefined();
  });

  it('should reject HTTP API URL for non-localhost', () => {
    expect(() => new SkillzMarket({ apiUrl: 'http://custom.api' })).toThrow('must use HTTPS');
  });

  it('should throw when calling skill without wallet', async () => {
    const client = new SkillzMarket();
    await expect(client.call('test', {})).rejects.toThrow('Wallet required');
  });
});
