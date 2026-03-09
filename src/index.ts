#!/usr/bin/env node
/**
 * SkillHub MCP — Unified entrypoint.
 *
 * Smart dispatcher:
 *   npx skillhub-mcp                     → MCP server (stdio transport)
 *   npx skillhub-mcp recommend "..."     → CLI recommend
 *   npx skillhub-mcp search "..."        → CLI search
 *   npx skillhub-mcp info "..."          → CLI info
 *   npx skillhub-mcp stats              → CLI stats
 *   npx skillhub-mcp --help             → usage help
 *
 * MCP server starts ONLY when no CLI command is given AND stdin is piped.
 * If the user just runs `npx skillhub-mcp` in a terminal (no pipe),
 * they get the help screen instead of a hanging process.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { analyzePrompt, explainRecommendation } from "./engine/analyzer.js";
import { loadResources, getIndex, findResourceByTitle, getStats } from "./engine/loader.js";
import { rankResources, deduplicateResults } from "./engine/ranker.js";

const args = process.argv.slice(2);
const command = args[0]?.toLowerCase();

// ── CLI commands ─────────────────────────────────────────────
const CLI_COMMANDS = new Set(["recommend", "rec", "search", "s", "info", "i", "stats", "help", "--help", "-h"]);

if (command && CLI_COMMANDS.has(command)) {
    runCLI(command, args.slice(1).join(" "));
} else if (command === "serve" || command === "server") {
    // Explicit server mode
    startServer();
} else if (!process.stdin.isTTY) {
    // stdin is piped → MCP client is connecting
    startServer();
} else {
    // Interactive terminal, no command → show help
    printHelp();
}

// ═════════════════════════════════════════════════════════════
// MCP Server
// ═════════════════════════════════════════════════════════════
async function startServer() {
    const server = createServer();
    const transport = new StdioServerTransport();

    console.error("[skillhub] Starting SkillHub MCP Server v0.1.0");
    console.error("[skillhub] AI resource intelligence for Claude, Cursor, Windsurf, and more");
    console.error("[skillhub] Loading 20,000+ AI resources...");

    await server.connect(transport);

    console.error("[skillhub] Server ready — waiting for MCP client connection");
}

// ═════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════

function printBanner() {
    console.log("");
    console.log("  ⚡ SkillHub — AI Resource Intelligence");
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
    verified?: boolean;
}) {
    const stars = r.stars > 0 ? ` ⭐ ${r.stars >= 1000 ? `${Math.round(r.stars / 1000)}k` : r.stars}` : "";
    const score = r.score ? ` (${Math.round(r.score * 100)}%)` : "";
    const verified = r.verified ? " ✅" : "";
    console.log(`  ⚡ ${r.title}${score}${stars}${verified}`);
    console.log(`     ${r.description.slice(0, 120)}`);
    console.log(`     [${r.type}] [${r.ecosystem}] ${r.url}`);
    console.log();
}

function printHelp() {
    printBanner();
    console.log(`
  Usage:
    npx skillhub-mcp <command> [options]

  Commands:
    recommend <task>     Get AI tool recommendations for a task
    search <query>       Search resources by keyword
    info <name>          Get details about a specific resource
    stats                Show database statistics
    serve                Start as MCP server (for Claude/Cursor/Windsurf)

  Examples:
    npx skillhub-mcp recommend "build a RAG pipeline with LangChain"
    npx skillhub-mcp search "vector database"
    npx skillhub-mcp info "Pinecone"
    npx skillhub-mcp stats

  MCP Server:
    Configure in Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json):
    {
      "mcpServers": {
        "skillhub": {
          "command": "npx",
          "args": ["-y", "skillhub-mcp"]
        }
      }
    }

  Database: 20,000+ AI resources (skills, tools, agents, rules, MCP servers)
  More info: https://www.npmjs.com/package/skillhub-mcp
`);
}

async function runCLI(cmd: string, query: string) {
    switch (cmd) {
        case "recommend":
        case "rec": {
            if (!query) {
                console.error("  Usage: npx skillhub-mcp recommend <task description>");
                console.error("  Example: npx skillhub-mcp recommend \"build a RAG pipeline\"");
                process.exit(1);
            }
            printBanner();
            console.log(`  🔍 Analyzing: "${query}"\n`);

            const analysis = analyzePrompt(query);
            const index = getIndex();
            const resources = loadResources();

            if (analysis.technologies.length > 0) {
                console.log(`  📊 Detected technologies: ${analysis.technologies.join(", ")}`);
            }
            console.log(`  🏷️  Task categories: ${analysis.categories.join(", ")}\n`);

            const queries = [query, ...analysis.technologies, ...analysis.categories.filter(c => c !== "general")];
            const searchResults = index.multiSearch(queries, 100);
            const ranked = rankResources(searchResults, analysis, resources, { maxResults: 20 });
            const deduped = deduplicateResults(ranked).slice(0, 10);

            if (deduped.length === 0) {
                console.log("  No matching resources found. Try a different query.");
                return;
            }

            console.log(`  📦 Top ${deduped.length} recommendations:\n`);

            for (const { resource, score } of deduped) {
                printResult({ ...resource, score });
            }
            break;
        }

        case "search":
        case "s": {
            if (!query) {
                console.error("  Usage: npx skillhub-mcp search <query>");
                console.error("  Example: npx skillhub-mcp search \"vector database\"");
                process.exit(1);
            }
            printBanner();
            const index = getIndex();
            const resources = loadResources();
            const results = index.search(query, 15);

            console.log(`  🔍 Results for "${query}" (${results.length} matches):\n`);

            if (results.length === 0) {
                console.log("  No matching resources found. Try a different query.");
                return;
            }

            for (const { index: idx, score } of results) {
                const r = resources[idx];
                printResult({ ...r, score: score / 30 });
            }
            break;
        }

        case "info":
        case "i": {
            if (!query) {
                console.error("  Usage: npx skillhub-mcp info <resource name>");
                console.error("  Example: npx skillhub-mcp info \"LangChain\"");
                process.exit(1);
            }
            printBanner();
            const resource = findResourceByTitle(query);
            if (!resource) {
                console.log(`  ❌ Resource "${query}" not found.`);
                console.log(`  💡 Try: npx skillhub-mcp search "${query}"`);
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
            console.log(`  Verified:   ${resource.verified ? "✅ Yes" : "—"}`);
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
                console.log(`    ${type.padEnd(20)} ${count.toLocaleString()}`);
            }
            console.log("\n  By Ecosystem:");
            for (const [eco, count] of Object.entries(stats.byEcosystem).sort((a, b) => b[1] - a[1])) {
                console.log(`    ${eco.padEnd(20)} ${count.toLocaleString()}`);
            }
            console.log();
            break;
        }

        case "help":
        case "--help":
        case "-h":
            printHelp();
            break;

        default:
            printHelp();
    }
}
