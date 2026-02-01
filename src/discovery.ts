import type { Skill, SkillGroup, Creator, Review, SearchFilters } from './types.js';

export interface SkillGroupWithSkills extends SkillGroup {
  skills: Skill[];
  creator: Creator | null;
}

export class DiscoveryClient {
  constructor(private apiUrl: string) {}

  async search(query: string, filters?: SearchFilters): Promise<Skill[]> {
    const params = new URLSearchParams({ q: query });
    if (filters?.category) params.set('category', filters.category);
    if (filters?.minPrice) params.set('minPrice', filters.minPrice);
    if (filters?.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters?.creator) params.set('creator', filters.creator);
    if (filters?.verified) params.set('verified', 'true');
    if (filters?.group) params.set('group', filters.group);

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

  /**
   * Get all groups, optionally filtered by creator wallet address
   */
  async getGroups(creatorAddress?: string): Promise<SkillGroup[]> {
    const params = new URLSearchParams();
    if (creatorAddress) params.set('creator', creatorAddress);

    const url = params.toString()
      ? `${this.apiUrl}/groups?${params}`
      : `${this.apiUrl}/groups`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to get groups: ${res.statusText}`);
    return res.json();
  }

  /**
   * Get a group by slug with its skills
   * @param slug - The group slug
   * @param creatorAddress - Optional creator address to scope the lookup
   */
  async getGroup(slug: string, creatorAddress?: string): Promise<SkillGroupWithSkills> {
    const params = new URLSearchParams();
    if (creatorAddress) params.set('creator', creatorAddress);

    const url = params.toString()
      ? `${this.apiUrl}/groups/${slug}?${params}`
      : `${this.apiUrl}/groups/${slug}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Group not found: ${slug}`);
    return res.json();
  }
}
