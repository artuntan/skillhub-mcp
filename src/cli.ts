#!/usr/bin/env node
/**
 * SkillHub CLI — Quick resource search and recommendations from the terminal.
 * 
 * Usage:
 *   skillhub recommend "build a RAG pipeline with LangChain"
 *   skillhub search "vector database"
 *   skillhub info "Pinecone"
 *   skillhub stats
 */
import { analyzePrompt, explainRecommendation } from "./engine/analyzer.js";
import { loadResources, getIndex, findResourceByTitle, getStats } from "./engine/loader.js";
import { rankResources, deduplicateResults } from "./engine/ranker.js";

const args = process.argv.slice(2);
const command = args[0];
const query = args.slice(1).join(" ");

function printBanner() {
    console.log("\n  ⚡ SkillHub — AI Resource Intelligence");
    console.log("  ─────────────────────────────────────");
}

function printResult(r: {
    title: string;
    description: string;
    type: string;
    ecosystem: string;
    url: string;
    stars: number;
    score?: number;
}) {
    const stars = r.stars > 0 ? ` ⭐ ${r.stars >= 1000 ? `${Math.round(r.stars / 1000)}k` : r.stars}` : "";
    const score = r.score ? ` (${Math.round(r.score * 100)}%)` : "";
    console.log(`  ⚡ ${r.title}${score}${stars}`);
    console.log(`    ${r.description.slice(0, 120)}`);
    console.log(`    [${r.type}] [${r.ecosystem}] ${r.url}`);
    console.log();
}

async function main() {
    switch (command) {
        case "recommend":
        case "rec": {
            if (!query) {
                console.error("Usage: skillhub recommend <task description>");
                process.exit(1);
            }
            printBanner();
            console.log(`  🔍 Analyzing: "${query}"\n`);

            const analysis = analyzePrompt(query);
            const index = getIndex();
            const resources = loadResources();

            console.log(`  📊 Detected: ${analysis.technologies.join(", ") || "general"}`);
            console.log(`  🏷️  Categories: ${analysis.categories.join(", ")}\n`);

            const queries = [query, ...analysis.technologies, ...analysis.categories.filter(c => c !== "general")];
            const searchResults = index.multiSearch(queries, 100);
            const ranked = rankResources(searchResults, analysis, resources, { maxResults: 20 });
            const deduped = deduplicateResults(ranked).slice(0, 10);

            console.log(`  📦 Top ${deduped.length} recommendations:\n`);

            for (const { resource, score } of deduped) {
                printResult({ ...resource, score });
            }
            break;
        }

        case "search":
        case "s": {
            if (!query) {
                console.error("Usage: skillhub search <query>");
                process.exit(1);
            }
            printBanner();
            const index = getIndex();
            const resources = loadResources();
            const results = index.search(query, 15);

            console.log(`  🔍 Results for "${query}" (${results.length} matches):\n`);

            for (const { index: idx, score } of results) {
                const r = resources[idx];
                printResult({ ...r, score: score / 30 });
            }
            break;
        }

        case "info":
        case "i": {
            if (!query) {
                console.error("Usage: skillhub info <resource name>");
                process.exit(1);
            }
            printBanner();
            const resource = findResourceByTitle(query);
            if (!resource) {
                console.log(`  ❌ Resource "${query}" not found. Try 'skillhub search "${query}"'`);
                process.exit(1);
            }
            console.log(`\n  ⚡ ${resource.title}`);
            console.log(`  ─────────────────────────────────────`);
            console.log(`  ${resource.description}`);
            console.log();
            console.log(`  Type:       ${resource.type}`);
            console.log(`  Ecosystem:  ${resource.ecosystem}`);
            console.log(`  Creator:    ${resource.creator}`);
            console.log(`  Stars:      ${resource.stars > 0 ? resource.stars.toLocaleString() : "—"}`);
            console.log(`  Verified:   ${resource.verified ? "✅" : "—"}`);
            console.log(`  Tags:       ${resource.tags.join(", ")}`);
            console.log(`  URL:        ${resource.url}`);
            if (resource.repositoryUrl) console.log(`  Repo:       ${resource.repositoryUrl}`);
            if (resource.installCommand) console.log(`  Install:    ${resource.installCommand}`);
            if (resource.docsUrl) console.log(`  Docs:       ${resource.docsUrl}`);
            console.log();
            break;
        }

        case "stats": {
            printBanner();
            const stats = getStats();
            console.log(`\n  📊 Database: ${stats.total.toLocaleString()} resources\n`);
            console.log("  By Type:");
            for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
                console.log(`    ${type}: ${count.toLocaleString()}`);
            }
            console.log("\n  By Ecosystem:");
            for (const [eco, count] of Object.entries(stats.byEcosystem).sort((a, b) => b[1] - a[1])) {
                console.log(`    ${eco}: ${count.toLocaleString()}`);
            }
            console.log();
            break;
        }

        default: {
            printBanner();
            console.log(`
  Commands:
    recommend <task>    Get AI tool recommendations for your task
    search <query>      Search resources by keyword
    info <name>         Get details about a specific resource
    stats               Show database statistics

  Examples:
    skillhub recommend "build a RAG pipeline with LangChain"
    skillhub search "vector database"
    skillhub info "Pinecone"
    skillhub stats
`);
        }
    }
}

main().catch(console.error);
