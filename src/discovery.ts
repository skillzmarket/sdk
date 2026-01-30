import type { Skill, Creator, Review, SearchFilters } from './types.js';

export class DiscoveryClient {
  constructor(private apiUrl: string) {}

  async search(query: string, filters?: SearchFilters): Promise<Skill[]> {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.set('category', filters.category);
    if (filters?.minPrice) params.set('minPrice', filters.minPrice);
    if (filters?.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters?.creator) params.set('creator', filters.creator);

    const res = await fetch(`${this.apiUrl}/skills?${params}`);
    if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
    return res.json();
  }

  async getSkill(slug: string): Promise<Skill> {
    const res = await fetch(`${this.apiUrl}/skills/${slug}`);
    if (!res.ok) throw new Error(`Skill not found: ${slug}`);
    return res.json();
  }

  async getCreator(address: string): Promise<Creator> {
    const res = await fetch(`${this.apiUrl}/creators/${address}`);
    if (!res.ok) throw new Error(`Creator not found: ${address}`);
    return res.json();
  }

  async getReviews(skillSlug: string): Promise<Review[]> {
    const res = await fetch(`${this.apiUrl}/skills/${skillSlug}/reviews`);
    if (!res.ok) throw new Error(`Failed to get reviews`);
    return res.json();
  }
}
