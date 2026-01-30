import type { Skill, Creator, Review, SearchFilters } from './types.js';
export declare class DiscoveryClient {
    private apiUrl;
    constructor(apiUrl: string);
    search(query: string, filters?: SearchFilters): Promise<Skill[]>;
    getSkill(slug: string): Promise<Skill>;
    getCreator(address: string): Promise<Creator>;
    getReviews(skillSlug: string): Promise<Review[]>;
}
//# sourceMappingURL=discovery.d.ts.map