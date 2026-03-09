/**
 * Multi-signal Ranker — Combines text similarity, tag overlap, type boosting,
 * ecosystem affinity, popularity, and verification quality.
 */
import type { Resource, ScoredResource, PromptAnalysis, ResourceType, Ecosystem } from "../types.js";
import { SearchIndex } from "./indexer.js";

/** Type boost mapping — which types are most relevant for each task category */
const TYPE_BOOSTS: Record<string, ResourceType[]> = {
    "rag": ["skill", "mcp-server", "tool"],
    "agent-building": ["agent", "skill", "mcp-server"],
    "coding": ["rule", "skill", "instruction", "tool"],
    "ml-training": ["skill", "tool"],
    "inference": ["tool", "skill", "mcp-server"],
    "image-generation": ["tool", "skill"],
    "nlp": ["skill", "tool"],
    "computer-vision": ["tool", "skill"],
    "audio": ["tool", "skill"],
    "data-processing": ["tool", "skill", "mcp-server"],
    "deployment": ["tool", "skill"],
    "monitoring": ["tool", "skill"],
    "testing": ["tool", "skill"],
    "prompt-engineering": ["prompt-pack", "rule", "skill"],
    "web-development": ["rule", "skill", "instruction"],
    "mobile-development": ["rule", "skill"],
    "devops": ["tool", "mcp-server", "rule"],
    "security": ["tool", "rule"],
    "documentation": ["tool", "skill"],
    "general": ["skill", "tool", "agent"],
};

export interface RankOptions {
    maxResults: number;
    typeFilter?: ResourceType[];
    ecosystemFilter?: Ecosystem[];
}

/**
 * Rank resources based on multi-signal scoring.
 */
export function rankResources(
    searchResults: Array<{ index: number; score: number }>,
    analysis: PromptAnalysis,
    resources: Resource[],
    options: RankOptions
): ScoredResource[] {
    const { maxResults, typeFilter, ecosystemFilter } = options;

    let scored: ScoredResource[] = searchResults.map(({ index, score: textScore }) => {
        const resource = resources[index];

        // 1. Normalize text similarity (0-1 range, capped)
        const textSimilarity = Math.min(textScore / 30, 1.0);

        // 2. Tag overlap score
        const resourceTags = new Set(resource.tags.map(t => t.toLowerCase()));
        const queryKeywords = new Set([
            ...analysis.keywords,
            ...analysis.technologies,
        ]);
        let tagOverlap = 0;
        for (const kw of queryKeywords) {
            for (const tag of resourceTags) {
                if (tag.includes(kw) || kw.includes(tag)) {
                    tagOverlap += 1;
                    break;
                }
            }
        }
        tagOverlap = Math.min(tagOverlap / Math.max(queryKeywords.size, 1), 1.0);

        // 3. Type boost
        let typeBoost = 0;
        const preferredTypes = new Set<ResourceType>();
        for (const cat of analysis.categories) {
            const boosts = TYPE_BOOSTS[cat] || TYPE_BOOSTS["general"];
            for (const t of boosts) preferredTypes.add(t);
        }
        for (const pt of analysis.preferredTypes) preferredTypes.add(pt);

        if (preferredTypes.has(resource.type as ResourceType)) {
            typeBoost = 0.15;
        }

        // 4. Ecosystem boost
        let ecosystemBoost = 0;
        if (analysis.ecosystems.length > 0) {
            if (analysis.ecosystems.includes(resource.ecosystem as Ecosystem)) {
                ecosystemBoost = 0.2;
            } else if (resource.ecosystem === "cross-platform") {
                ecosystemBoost = 0.05; // Cross-platform always gets a small boost
            }
        } else {
            // No ecosystem detected — slight preference for cross-platform
            if (resource.ecosystem === "cross-platform") {
                ecosystemBoost = 0.03;
            }
        }

        // 5. Popularity boost (logarithmic)
        const popularityBoost = resource.stars > 0
            ? Math.min(Math.log10(resource.stars + 1) / 6, 0.15)
            : 0;

        // 6. Verification boost
        const verificationBoost = resource.verified ? 0.1 : 0;

        // Composite score
        const score =
            textSimilarity * 0.45 +
            tagOverlap * 0.25 +
            typeBoost +
            ecosystemBoost +
            popularityBoost +
            verificationBoost;

        return {
            resource,
            score,
            relevanceBreakdown: {
                textSimilarity,
                tagOverlap,
                typeBoost,
                ecosystemBoost,
                popularityBoost,
                verificationBoost,
            },
        };
    });

    // Apply filters
    if (typeFilter && typeFilter.length > 0) {
        const types = new Set(typeFilter);
        scored = scored.filter(s => types.has(s.resource.type as ResourceType));
    }
    if (ecosystemFilter && ecosystemFilter.length > 0) {
        const ecos = new Set(ecosystemFilter);
        scored = scored.filter(s => ecos.has(s.resource.ecosystem as Ecosystem));
    }

    // Sort and return top results
    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);
}

/**
 * Deduplicate results — remove near-duplicates by title similarity.
 */
export function deduplicateResults(results: ScoredResource[]): ScoredResource[] {
    const seen = new Set<string>();
    return results.filter(r => {
        const key = r.resource.title.toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 40);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
