import type { Skill, SearchFilters, SkillzMarketOptions } from './types.js';
export declare class SkillzMarket {
    private discovery;
    private apiUrl;
    private wallet?;
    private walletAddress?;
    private paymentFetch?;
    private authToken?;
    constructor(options?: SkillzMarketOptions);
    search(query: string, filters?: SearchFilters): Promise<Skill[]>;
    info(slug: string): Promise<Skill>;
    getCreator(address: string): Promise<import("./types.js").Creator>;
    getReviews(skillSlug: string): Promise<import("./types.js").Review[]>;
    call<T = unknown>(slug: string, input: Record<string, unknown>): Promise<T>;
    authenticate(): Promise<string>;
    feedback(slug: string, score: number, comment?: string): Promise<void>;
}
//# sourceMappingURL=client.d.ts.map