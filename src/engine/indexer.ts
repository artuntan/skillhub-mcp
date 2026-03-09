/**
 * TF-IDF Inverted Index — Fast in-memory search engine for resources.
 * Builds at startup and provides scored full-text search.
 */
import type { Resource } from "../types.js";

/** Simple tokenizer with basic stemming-lite */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s.\-_/]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 1)
        .map(w => w.replace(/ing$|ed$|tion$|ment$|ness$|able$|ible$|ly$|er$|est$|ous$|ive$|ful$|less$/g, ""))
        .filter(w => w.length > 1);
}

/** Inverted index entry */
interface PostingEntry {
    resourceIdx: number;
    frequency: number;
    fieldWeight: number; // 3.0 for title, 2.0 for tags, 1.0 for description
}

export class SearchIndex {
    private resources: Resource[] = [];
    private invertedIndex: Map<string, PostingEntry[]> = new Map();
    private idfCache: Map<string, number> = new Map();
    private docCount: number = 0;

    /**
     * Build the index from a set of resources.
     */
    build(resources: Resource[]): void {
        this.resources = resources;
        this.docCount = resources.length;
        this.invertedIndex.clear();
        this.idfCache.clear();

        for (let idx = 0; idx < resources.length; idx++) {
            const r = resources[idx];

            // Index title (weight 3.0)
            this.indexField(idx, r.title, 3.0);

            // Index tags (weight 2.5)
            this.indexField(idx, r.tags.join(" "), 2.5);

            // Index description (weight 1.0)
            this.indexField(idx, r.description, 1.0);

            // Index type and ecosystem (weight 1.5)
            this.indexField(idx, `${r.type} ${r.ecosystem}`, 1.5);

            // Index creator (weight 0.5)
            this.indexField(idx, r.creator, 0.5);
        }

        // Precompute IDF
        for (const [term, postings] of this.invertedIndex) {
            const docFreq = new Set(postings.map(p => p.resourceIdx)).size;
            this.idfCache.set(term, Math.log((this.docCount + 1) / (docFreq + 1)) + 1);
        }
    }

    private indexField(resourceIdx: number, text: string, fieldWeight: number): void {
        const tokens = tokenize(text);
        const termFreq: Map<string, number> = new Map();

        for (const token of tokens) {
            termFreq.set(token, (termFreq.get(token) || 0) + 1);
        }

        for (const [term, freq] of termFreq) {
            if (!this.invertedIndex.has(term)) {
                this.invertedIndex.set(term, []);
            }
            this.invertedIndex.get(term)!.push({
                resourceIdx,
                frequency: freq,
                fieldWeight,
            });
        }
    }

    /**
     * Search the index with a query string. Returns scored resource indices.
     */
    search(query: string, maxResults: number = 50): Array<{ index: number; score: number }> {
        const queryTokens = tokenize(query);
        if (queryTokens.length === 0) return [];

        const scores: Map<number, number> = new Map();

        for (const token of queryTokens) {
            const postings = this.invertedIndex.get(token);
            if (!postings) continue;

            const idf = this.idfCache.get(token) || 1;

            for (const posting of postings) {
                const tf = 1 + Math.log(posting.frequency); // Sublinear TF
                const score = tf * idf * posting.fieldWeight;
                scores.set(
                    posting.resourceIdx,
                    (scores.get(posting.resourceIdx) || 0) + score
                );
            }
        }

        // Also check for exact phrase matches in title (big bonus)
        const queryLower = query.toLowerCase();
        for (let idx = 0; idx < this.resources.length; idx++) {
            const titleLower = this.resources[idx].title.toLowerCase();
            if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) {
                scores.set(idx, (scores.get(idx) || 0) + 10.0);
            }
        }

        // Sort by score descending
        return Array.from(scores.entries())
            .map(([index, score]) => ({ index, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /**
     * Search by multiple queries and merge results.
     */
    multiSearch(queries: string[], maxResults: number = 50): Array<{ index: number; score: number }> {
        const allScores: Map<number, number> = new Map();

        for (const query of queries) {
            const results = this.search(query, maxResults * 2);
            for (const { index, score } of results) {
                allScores.set(index, (allScores.get(index) || 0) + score);
            }
        }

        return Array.from(allScores.entries())
            .map(([index, score]) => ({ index, score }))
            .sort((a, b) => b.score - a.score)
            .slice(0, maxResults);
    }

    /** Get resource by index */
    getResource(index: number): Resource | undefined {
        return this.resources[index];
    }

    /** Total resources indexed */
    get size(): number {
        return this.docCount;
    }

    /** Total unique terms in the index */
    get vocabularySize(): number {
        return this.invertedIndex.size;
    }
}
