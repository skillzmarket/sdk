import { describe, it, expect } from 'vitest';
import { skill } from '../skill.js';

describe('skill', () => {
  it('creates a skill with minimal options', () => {
    const mySkill = skill({ price: '$0.001' }, async (input) => input);

    expect(mySkill.options.price).toBe('$0.001');
    expect(mySkill.parsedPrice).toEqual({ amount: '0.001', currency: 'USDC' });
    expect(mySkill.options.timeout).toBe(60000);
    expect(mySkill.handler).toBeInstanceOf(Function);
  });

  it('creates a skill with all options', () => {
    const mySkill = skill(
      {
        price: '0.005 USDC',
        description: 'Test skill',
        timeout: 30000,
      },
      async ({ text }: { text: string }) => ({ upper: text.toUpperCase() })
    );

    expect(mySkill.options.price).toBe('0.005 USDC');
    expect(mySkill.options.description).toBe('Test skill');
    expect(mySkill.options.timeout).toBe(30000);
    expect(mySkill.parsedPrice).toEqual({ amount: '0.005', currency: 'USDC' });
  });

  it('executes handler correctly', async () => {
    const echo = skill({ price: '$0.001' }, async (input: { msg: string }) => ({
      echo: input.msg,
    }));

    const result = await echo.handler({ msg: 'hello' });
    expect(result).toEqual({ echo: 'hello' });
  });

  it('throws on invalid price', () => {
    expect(() =>
      skill({ price: 'invalid' }, async () => ({}))
    ).toThrow('Invalid price format');
  });

  it('throws on invalid timeout (negative)', () => {
    expect(() =>
      skill({ price: '$0.001', timeout: -1 }, async () => ({}))
    ).toThrow('Invalid timeout');
  });

  it('throws on invalid timeout (zero)', () => {
    expect(() =>
      skill({ price: '$0.001', timeout: 0 }, async () => ({}))
    ).toThrow('Invalid timeout');
  });

  it('throws on timeout too long', () => {
    expect(() =>
      skill({ price: '$0.001', timeout: 400000 }, async () => ({}))
    ).toThrow('Timeout too long');
  });
});
