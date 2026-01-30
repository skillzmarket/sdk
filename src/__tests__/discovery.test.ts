import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryClient } from '../discovery.js';

describe('DiscoveryClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  it('should search skills', async () => {
    const mockSkills = [{ id: '1', name: 'Test Skill', slug: 'test-skill' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSkills),
    });

    const client = new DiscoveryClient('http://api.test');
    const results = await client.search('test');

    expect(mockFetch).toHaveBeenCalledWith('http://api.test/skills?q=test');
    expect(results).toEqual(mockSkills);
  });

  it('should get skill by slug', async () => {
    const mockSkill = { id: '1', name: 'Test', slug: 'test-skill' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockSkill),
    });

    const client = new DiscoveryClient('http://api.test');
    const skill = await client.getSkill('test-skill');

    expect(mockFetch).toHaveBeenCalledWith('http://api.test/skills/test-skill');
    expect(skill).toEqual(mockSkill);
  });

  it('should throw on skill not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    const client = new DiscoveryClient('http://api.test');
    await expect(client.getSkill('nonexistent')).rejects.toThrow('Skill not found');
  });
});
