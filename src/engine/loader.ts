/**
 * Data Loader — Loads and initializes the resource database and search index.
 */
import { readFileSync, existsSync } from "fs";
import { gunzipSync } from "zlib";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import type { Resource } from "../types.js";
import { SearchIndex } from "./indexer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let _resources: Resource[] | null = null;
let _index: SearchIndex | null = null;

/**
 * Load resources from the bundled database file.
 * Supports gzip-compressed (.json.gz) and uncompressed (.json) formats.
 */
export function loadResources(): Resource[] {
    if (_resources) return _resources;

    const gzPath = join(__dirname, "data", "resources.json.gz");
    const jsonPath = join(__dirname, "data", "resources.json");

    let raw: string;
    if (existsSync(gzPath)) {
        const compressed = readFileSync(gzPath);
        raw = gunzipSync(compressed).toString("utf-8");
    } else {
        raw = readFileSync(jsonPath, "utf-8");
    }

    _resources = JSON.parse(raw) as Resource[];
    return _resources;
}

/**
 * Get the search index, building it if needed.
 */
export function getIndex(): SearchIndex {
    if (_index) return _index;

    const resources = loadResources();
    _index = new SearchIndex();

    const start = Date.now();
    _index.build(resources);
    const elapsed = Date.now() - start;

    console.error(
        `[skillhub] Indexed ${_index.size} resources (${_index.vocabularySize} terms) in ${elapsed}ms`
    );

    return _index;
}

/**
 * Find a resource by ID.
 */
export function findResourceById(id: string): Resource | undefined {
    const resources = loadResources();
    return resources.find(r => r.id === id);
}

/**
 * Find resources by title (fuzzy).
 */
export function findResourceByTitle(title: string): Resource | undefined {
    const resources = loadResources();
    const lower = title.toLowerCase().trim();

    // Exact match first
    const exact = resources.find(r => r.title.toLowerCase() === lower);
    if (exact) return exact;

    // Partial match
    return resources.find(r => r.title.toLowerCase().includes(lower));
}

/**
 * Get database statistics.
 */
export function getStats(): {
    total: number;
    byType: Record<string, number>;
    byEcosystem: Record<string, number>;
} {
    const resources = loadResources();
    const byType: Record<string, number> = {};
    const byEcosystem: Record<string, number> = {};

    for (const r of resources) {
        byType[r.type] = (byType[r.type] || 0) + 1;
        byEcosystem[r.ecosystem] = (byEcosystem[r.ecosystem] || 0) + 1;
    }

    return { total: resources.length, byType, byEcosystem };
}
