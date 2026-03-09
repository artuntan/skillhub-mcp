/**
 * SkillHub MCP Server — Type Definitions
 */

/** Resource types in our database */
export type ResourceType =
    | "skill"
    | "rule"
    | "agent"
    | "mcp-server"
    | "tool"
    | "instruction"
    | "prompt-pack"
    | "directory"
    | "platform-feature";

/** Ecosystem identifiers */
export type Ecosystem =
    | "cross-platform"
    | "cursor"
    | "github-copilot"
    | "windsurf"
    | "openai"
    | "anthropic"
    | "gemini"
    | "mcp"
    | "chatgpt";

/** A resource record optimized for search/recommendation */
export interface Resource {
    id: string;
    title: string;
    description: string;
    type: ResourceType;
    ecosystem: Ecosystem;
    tags: string[];
    url: string;
    repositoryUrl?: string;
    creator: string;
    stars: number;
    installType: string;
    installCommand?: string;
    docsUrl?: string;
    verified: boolean;
    confidence: number;
}

/** Scored search result */
export interface ScoredResource {
    resource: Resource;
    score: number;
    relevanceBreakdown: {
        textSimilarity: number;
        tagOverlap: number;
        typeBoost: number;
        ecosystemBoost: number;
        popularityBoost: number;
        verificationBoost: number;
    };
}

/** Task classification categories */
export type TaskCategory =
    | "coding"
    | "ml-training"
    | "inference"
    | "rag"
    | "data-processing"
    | "deployment"
    | "monitoring"
    | "testing"
    | "prompt-engineering"
    | "agent-building"
    | "image-generation"
    | "nlp"
    | "computer-vision"
    | "audio"
    | "web-development"
    | "mobile-development"
    | "devops"
    | "security"
    | "documentation"
    | "general";

/** Analysis result from the prompt analyzer */
export interface PromptAnalysis {
    /** Detected technologies and frameworks */
    technologies: string[];
    /** Detected task categories */
    categories: TaskCategory[];
    /** Extracted keywords for search */
    keywords: string[];
    /** Detected ecosystem affinity */
    ecosystems: Ecosystem[];
    /** Detected resource type preferences */
    preferredTypes: ResourceType[];
}

/** Recommendation request */
export interface RecommendRequest {
    prompt: string;
    maxResults?: number;
    types?: ResourceType[];
    ecosystems?: Ecosystem[];
}

/** Recommendation response */
export interface RecommendResponse {
    query: string;
    analysis: PromptAnalysis;
    results: RecommendResult[];
    totalMatches: number;
}

/** Individual recommendation */
export interface RecommendResult {
    title: string;
    description: string;
    type: ResourceType;
    ecosystem: Ecosystem;
    url: string;
    relevanceScore: number;
    tags: string[];
    creator: string;
    stars: number;
    installCommand?: string;
    docsUrl?: string;
    verified: boolean;
    whyRecommended: string;
}
