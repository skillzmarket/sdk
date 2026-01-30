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

  it('should initialize with custom API URL', () => {
    const client = new SkillzMarket({ apiUrl: 'http://custom.api' });
    expect(client).toBeDefined();
  });

  it('should throw when calling skill without wallet', async () => {
    const client = new SkillzMarket();
    await expect(client.call('test', {})).rejects.toThrow('Wallet required');
  });
});
