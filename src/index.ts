#!/usr/bin/env node
/**
 * SkillHub MCP — Unified entrypoint v0.4.0
 *
 * Context-aware smart dispatcher with premium terminal presentation.
 */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { analyzePrompt, explainRecommendation } from "./engine/analyzer.js";
import { loadResources, getIndex, findResourceByTitle, getStats } from "./engine/loader.js";
import { rankResources, deduplicateResults } from "./engine/ranker.js";
import { runSetup, runDoctor, runPrintConfig, getConfigStatus, VERSION } from "./setup.js";
import * as ui from "./ui.js";

// ── Parse args ───────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const GLOBAL_FLAGS = new Set(["--json", "--no-color"]);
const flags = new Set(rawArgs.filter(a => GLOBAL_FLAGS.has(a)));
const args = rawArgs.filter(a => !GLOBAL_FLAGS.has(a));
const command = args[0]?.toLowerCase();

// Handle global flags
if (flags.has("--no-color")) ui.setColor(false);
if (flags.has("--json")) { ui.setJsonMode(true); ui.setColor(false); }

// ── Route ────────────────────────────────────────────────────
const CLI_COMMANDS = new Set([
    "recommend", "rec", "search", "s", "info", "i", "stats",
    "setup", "doctor", "print-config",
    "help", "--help", "-h", "--version", "-v",
]);

if (command && CLI_COMMANDS.has(command)) {
    runCLI(command, args.slice(1));
} else if (command === "serve" || command === "server") {
    startServer();
} else if (!process.stdin.isTTY) {
    startServer();
} else {
    // Context-aware: onboarding if unconfigured, help if configured
    const status = getConfigStatus();
    if (status.configured === 0) {
        printOnboarding(status);
    } else {
        printHelp();
    }
}

// ═════════════════════════════════════════════════════════════
// MCP Server
// ═════════════════════════════════════════════════════════════
async function startServer() {
    const server = createServer();
    const transport = new StdioServerTransport();

    console.error(`[skillhub] Starting SkillHub MCP Server v${VERSION}`);
    console.error("[skillhub] AI resource intelligence — 20,000+ resources");

    await server.connect(transport);

    console.error("[skillhub] Server ready — connected to MCP client");
}

// ═════════════════════════════════════════════════════════════
// CLI
// ═════════════════════════════════════════════════════════════

function printOnboarding(status: { installed: number; configured: number }) {
    console.log(ui.banner());
    console.log(`  ${ui.dim(`v${VERSION}`)}`);
    console.log(`  ${ui.dim("AI resource intelligence — 20,000+ tools, skills, agents & MCP servers")}`);
    console.log("");

    if (status.installed > 0) {
        console.log(`  ${ui.yellow("!")} ${ui.bold("Setup needed")} — ${status.installed} MCP client(s) detected but not configured.`);
    } else {
        console.log(`  ${ui.cyan("·")} No MCP clients detected yet. You can still use the CLI directly.`);
    }

    console.log("");
    console.log(ui.subheading("Get Started in 30 Seconds"));
    console.log("");
    console.log(`    ${ui.bold(ui.cyan("Step 1"))}  Run the setup wizard`);
    console.log(`            ${ui.dim("$")} ${ui.cyan("npx skillhub-mcp setup")}`);
    console.log("");
    console.log(`    ${ui.bold(ui.cyan("Step 2"))}  Restart your AI client (Codex, Claude, Cursor, etc.)`);
    console.log("");
    console.log(`    ${ui.bold(ui.cyan("Step 3"))}  Done! Your AI assistant can now recommend tools.`);
    console.log("");

    console.log(ui.subheading("Or Try the CLI Right Now"));
    console.log("");
    console.log(`    ${ui.dim("$")} npx skillhub-mcp recommend ${ui.dim('"build a REST API with auth"')}`);
    console.log(`    ${ui.dim("$")} npx skillhub-mcp search ${ui.dim('"vector database"')}`);
    console.log(`    ${ui.dim("$")} npx skillhub-mcp stats`);
    console.log("");
    console.log(`  ${ui.dim("Run")} npx skillhub-mcp --help ${ui.dim("for all commands.")}`);
    console.log("");
}

function printHelp() {
    console.log(ui.banner());
    console.log(`  ${ui.dim(`v${VERSION}`)}`);

    console.log(ui.helpSection("Getting Started"));
    console.log(ui.helpCommand("setup [client]", "Configure MCP client (codex, claude, cursor, windsurf)"));
    console.log(ui.helpCommand("doctor", "Diagnose installation and config issues"));

    console.log(ui.helpSection("AI Resource Tools"));
    console.log(ui.helpCommand("recommend <task>", "Get AI tool recommendations for a task"));
    console.log(ui.helpCommand("search <query>", "Search 20,000+ resources by keyword"));
    console.log(ui.helpCommand("info <name>", "Get details about a specific resource"));
    console.log(ui.helpCommand("stats", "Show database statistics"));

    console.log(ui.helpSection("Options"));
    console.log(ui.helpCommand("--json", "Output results as JSON (pipeable)"));
    console.log(ui.helpCommand("--no-color", "Disable colored output"));
    console.log(ui.helpCommand("--version", "Show version number"));

    // Context-aware: show try-it suggestion
    const status = getConfigStatus();
    if (status.configured > 0) {
        console.log(ui.helpSection("Try It"));
        console.log(`    ${ui.dim("$")} npx skillhub-mcp recommend ${ui.dim('"build a RAG pipeline"')}`);
    } else {
        console.log(ui.helpSection("Quick Start"));
        console.log(`    ${ui.cyan("1.")} npx skillhub-mcp setup`);
        console.log(`    ${ui.cyan("2.")} Restart your AI client`);
        console.log(`    ${ui.cyan("3.")} Done — your AI can now recommend tools`);
    }
    console.log("");
}

async function runCLI(cmd: string, cliArgs: string[]) {
    const query = cliArgs.filter(a => !a.startsWith("--")).join(" ");

    switch (cmd) {
        case "setup": {
            runSetup(cliArgs[0]);
            break;
        }

        case "doctor": {
            runDoctor();
            break;
        }

        case "print-config": {
            if (!cliArgs[0]) {
                console.error(`  ${ui.red("Usage:")} npx skillhub-mcp print-config <client>`);
                console.error(`  ${ui.dim("Clients: codex, claude, cursor, windsurf")}`);
                process.exit(1);
            }
            runPrintConfig(cliArgs[0]);
            break;
        }

        case "--version":
        case "-v": {
            console.log(`skillhub-mcp v${VERSION}`);
            break;
        }

        case "recommend":
        case "rec": {
            if (!query) {
                console.error(`  ${ui.red("Usage:")} npx skillhub-mcp recommend <task description>`);
                console.error(`  ${ui.dim('Example: npx skillhub-mcp recommend "build a RAG pipeline"')}`);
                process.exit(1);
            }

            const analysis = analyzePrompt(query);
            const index = getIndex();
            const resources = loadResources();

            const queries = [query, ...analysis.technologies, ...analysis.categories.filter(c => c !== "general")];
            const searchResults = index.multiSearch(queries, 100);
            const ranked = rankResources(searchResults, analysis, resources, { maxResults: 20 });
            const deduped = deduplicateResults(ranked).slice(0, 10);

            // --json mode
            if (ui.isJsonMode()) {
                ui.outputJson({
                    query,
                    analysis: {
                        technologies: analysis.technologies,
                        categories: analysis.categories,
                        ecosystems: analysis.ecosystems,
                    },
                    resultCount: deduped.length,
                    totalResources: resources.length,
                    results: deduped.map(({ resource, score }, i) => ({
                        rank: i + 1,
                        title: resource.title,
                        description: resource.description,
                        type: resource.type,
                        ecosystem: resource.ecosystem,
                        url: resource.url,
                        score: ui.normalizeScore(score),
                        stars: resource.stars,
                        verified: resource.verified,
                        creator: resource.creator,
                        installCommand: resource.installCommand || null,
                        whyRecommended: explainRecommendation(resource, analysis),
                    })),
                });
                return;
            }

            // Pretty output
            console.log(ui.banner());
            console.log(ui.heading(`Recommendations for "${query}"`));
            console.log("");

            // Analysis summary
            const parts: string[] = [];
            if (analysis.technologies.length > 0) {
                parts.push(`${ui.bold("Detected:")} ${analysis.technologies.join(", ")}`);
            }
            parts.push(`${ui.bold("Categories:")} ${analysis.categories.join(", ")}`);
            console.log(`  ${parts.join(ui.dim(" │ "))}`);
            console.log(`  ${ui.dim(`Found ${deduped.length} results from ${resources.length.toLocaleString()} resources`)}`);

            if (deduped.length === 0) {
                console.log(`\n  ${ui.yellow("No matching resources found.")} Try a different query.`);
                console.log("");
                return;
            }

            console.log("");

            for (let i = 0; i < deduped.length; i++) {
                const { resource, score } = deduped[i];
                console.log(ui.resultCard({
                    rank: i + 1,
                    title: resource.title,
                    description: resource.description,
                    type: resource.type,
                    ecosystem: resource.ecosystem,
                    url: resource.url,
                    stars: resource.stars,
                    score,
                    verified: resource.verified,
                    creator: resource.creator,
                    installCommand: resource.installCommand,
                    whyRecommended: explainRecommendation(resource, analysis),
                }));
                console.log("");
            }
            break;
        }

        case "search":
        case "s": {
            if (!query) {
                console.error(`  ${ui.red("Usage:")} npx skillhub-mcp search <query>`);
                console.error(`  ${ui.dim('Example: npx skillhub-mcp search "vector database"')}`);
                process.exit(1);
            }

            const index = getIndex();
            const resources = loadResources();
            const results = index.search(query, 15);

            // --json mode
            if (ui.isJsonMode()) {
                ui.outputJson({
                    query,
                    resultCount: results.length,
                    results: results.map(({ index: idx, score }, i) => {
                        const r = resources[idx];
                        return {
                            rank: i + 1,
                            title: r.title,
                            description: r.description,
                            type: r.type,
                            ecosystem: r.ecosystem,
                            url: r.url,
                            score: ui.normalizeScore(score / 3),
                            stars: r.stars,
                            verified: r.verified,
                            creator: r.creator,
                        };
                    }),
                });
                return;
            }

            // Pretty output
            console.log(ui.banner());
            console.log(ui.heading(`Search: "${query}"`));
            console.log(`  ${ui.dim(`${results.length} results from ${resources.length.toLocaleString()} resources`)}`);

            if (results.length === 0) {
                console.log(`\n  ${ui.yellow("No matching resources found.")} Try a different query.`);
                console.log("");
                return;
            }

            console.log("");

            for (let i = 0; i < results.length; i++) {
                const { index: idx, score } = results[i];
                const r = resources[idx];
                console.log(ui.resultCard({
                    rank: i + 1,
                    title: r.title,
                    description: r.description,
                    type: r.type,
                    ecosystem: r.ecosystem,
                    url: r.url,
                    stars: r.stars,
                    score: score / 3,
                    verified: r.verified,
                    creator: r.creator,
                }));
                console.log("");
            }
            break;
        }

        case "info":
        case "i": {
            if (!query) {
                console.error(`  ${ui.red("Usage:")} npx skillhub-mcp info <resource name>`);
                console.error(`  ${ui.dim('Example: npx skillhub-mcp info "LangChain"')}`);
                process.exit(1);
            }

            const resource = findResourceByTitle(query);
            if (!resource) {
                console.log(`\n  ${ui.red("✗")} Resource "${query}" not found.`);
                console.log(`  ${ui.dim("💡 Try:")} npx skillhub-mcp search "${query}"`);
                console.log("");
                process.exit(1);
            }

            // --json mode
            if (ui.isJsonMode()) {
                ui.outputJson({
                    id: resource.id,
                    title: resource.title,
                    description: resource.description,
                    type: resource.type,
                    ecosystem: resource.ecosystem,
                    tags: resource.tags,
                    url: resource.url,
                    repositoryUrl: resource.repositoryUrl || null,
                    creator: resource.creator,
                    stars: resource.stars,
                    installType: resource.installType,
                    installCommand: resource.installCommand || null,
                    docsUrl: resource.docsUrl || null,
                    verified: resource.verified,
                    confidence: resource.confidence,
                });
                return;
            }

            // Pretty output
            console.log(ui.banner());
            console.log(ui.infoCard({
                title: resource.title,
                description: resource.description,
                type: resource.type,
                ecosystem: resource.ecosystem,
                creator: resource.creator,
                stars: resource.stars,
                verified: resource.verified,
                tags: resource.tags,
                url: resource.url,
                repositoryUrl: resource.repositoryUrl,
                installCommand: resource.installCommand,
                docsUrl: resource.docsUrl,
            }));
            break;
        }

        case "stats": {
            const stats = getStats();

            // --json mode
            if (ui.isJsonMode()) {
                ui.outputJson(stats);
                return;
            }

            // Pretty output
            console.log(ui.banner());
            console.log(ui.heading(`Database: ${ui.bold(stats.total.toLocaleString())} resources`));
            console.log("");

            // Type distribution
            console.log(ui.subheading("By Type"));
            const typeItems = Object.entries(stats.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => ({ label, value }));
            console.log(ui.barChart(typeItems).join("\n"));

            console.log("");

            // Ecosystem distribution
            console.log(ui.subheading("By Ecosystem"));
            const ecoItems = Object.entries(stats.byEcosystem)
                .sort((a, b) => b[1] - a[1])
                .map(([label, value]) => ({ label, value }));
            console.log(ui.barChart(ecoItems).join("\n"));

            console.log("");
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
