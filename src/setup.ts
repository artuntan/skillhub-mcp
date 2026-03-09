/**
 * Setup Wizard — Guided MCP client configuration for skillhub-mcp.
 *
 * Handles config generation, auto-writing, PATH resolution, and diagnostics
 * for Codex, Claude Desktop, Cursor, Windsurf, and VS Code.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { getStats } from "./engine/loader.js";

// ── Version ──────────────────────────────────────────────────
export const VERSION = "0.2.2";

// ── Client definitions ──────────────────────────────────────

interface MCPClient {
    name: string;
    slug: string;
    configPath: string;
    configFormat: "json" | "toml";
    restartHint: string;
    /** Generate config content. Returns the full file content if new, or instructions for merging. */
    generateConfig: (npxPath: string) => string;
    /** Check if this client is installed */
    isInstalled: () => boolean;
}

function expandPath(p: string): string {
    return p.replace("~", homedir());
}

const CLIENTS: MCPClient[] = [
    {
        name: "OpenAI Codex",
        slug: "codex",
        configPath: "~/.codex/config.toml",
        configFormat: "toml",
        restartHint: "Restart Codex or run: codex",
        generateConfig: (npxPath) => `
[mcp_servers.skillhub]
command = "${npxPath}"
args = ["-y", "skillhub-mcp"]
startup_timeout_sec = 30
tool_timeout_sec = 60`.trim(),
        isInstalled: () => existsSync(expandPath("~/.codex")),
    },
    {
        name: "Claude Desktop",
        slug: "claude",
        configPath: "~/Library/Application Support/Claude/claude_desktop_config.json",
        configFormat: "json",
        restartHint: "Quit and reopen Claude Desktop",
        generateConfig: (npxPath) => JSON.stringify({
            mcpServers: {
                skillhub: {
                    command: npxPath,
                    args: ["-y", "skillhub-mcp"],
                },
            },
        }, null, 2),
        isInstalled: () => existsSync(expandPath("~/Library/Application Support/Claude")),
    },
    {
        name: "Cursor",
        slug: "cursor",
        configPath: "~/.cursor/mcp.json",
        configFormat: "json",
        restartHint: "Restart Cursor or reload the window (Cmd+Shift+P → Reload)",
        generateConfig: (npxPath) => JSON.stringify({
            mcpServers: {
                skillhub: {
                    command: npxPath,
                    args: ["-y", "skillhub-mcp"],
                },
            },
        }, null, 2),
        isInstalled: () => existsSync(expandPath("~/.cursor")),
    },
    {
        name: "Windsurf",
        slug: "windsurf",
        configPath: "~/.codeium/windsurf/mcp_config.json",
        configFormat: "json",
        restartHint: "Restart Windsurf",
        generateConfig: (npxPath) => JSON.stringify({
            mcpServers: {
                skillhub: {
                    command: npxPath,
                    args: ["-y", "skillhub-mcp"],
                },
            },
        }, null, 2),
        isInstalled: () =>
            existsSync(expandPath("~/.codeium/windsurf")) ||
            existsSync(expandPath("~/.codeium")),
    },
];

// ── Utility functions ────────────────────────────────────────

/** Find the absolute path to npx, resolving GUI PATH issues. */
export function resolveNpxPath(): string {
    const candidates = [
        "/opt/homebrew/bin/npx",          // macOS ARM Homebrew
        "/usr/local/bin/npx",             // macOS Intel / Linux
        "/usr/bin/npx",                   // System-level
    ];

    // Try `which npx` first
    try {
        const result = execSync("which npx", { encoding: "utf-8" }).trim();
        if (result && existsSync(result)) return result;
    } catch { /* ignore */ }

    // Fallback to known locations
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }

    return "npx"; // Last resort — hope it's in PATH
}

/** Find client by slug */
function findClient(slug: string): MCPClient | undefined {
    return CLIENTS.find(c => c.slug === slug.toLowerCase());
}

/** Detect which MCP clients are installed */
function detectClients(): MCPClient[] {
    return CLIENTS.filter(c => c.isInstalled());
}

/** Check if skillhub is already configured in a client's config */
function isAlreadyConfigured(client: MCPClient): boolean {
    const configPath = expandPath(client.configPath);
    if (!existsSync(configPath)) return false;

    try {
        const content = readFileSync(configPath, "utf-8");
        return content.includes("skillhub");
    } catch {
        return false;
    }
}

// ── Public commands ──────────────────────────────────────────

/**
 * Setup command — configure skillhub-mcp for a specific MCP client.
 */
export function runSetup(clientSlug?: string): void {
    const npxPath = resolveNpxPath();
    console.log("");
    console.log("  ⚡ SkillHub MCP — Setup Wizard");
    console.log("  ─────────────────────────────────────");
    console.log(`  npx path: ${npxPath}`);
    console.log("");

    if (clientSlug) {
        // Setup specific client
        const client = findClient(clientSlug);
        if (!client) {
            console.log(`  ❌ Unknown client: "${clientSlug}"`);
            console.log(`  Supported: ${CLIENTS.map(c => c.slug).join(", ")}`);
            process.exit(1);
        }
        setupClient(client, npxPath);
    } else {
        // Auto-detect and show menu
        const installed = detectClients();
        if (installed.length === 0) {
            console.log("  No supported MCP clients detected.");
            console.log("  Supported clients: Codex, Claude Desktop, Cursor, Windsurf");
            console.log("");
            console.log("  You can still generate config manually:");
            console.log(`    npx skillhub-mcp setup codex`);
            console.log(`    npx skillhub-mcp setup claude`);
            console.log(`    npx skillhub-mcp setup cursor`);
            console.log(`    npx skillhub-mcp setup windsurf`);
            return;
        }

        console.log(`  Detected ${installed.length} MCP client(s):\n`);
        for (const client of installed) {
            const status = isAlreadyConfigured(client) ? "✅ configured" : "⚠️  not configured";
            console.log(`    ${client.name.padEnd(18)} ${status}`);
        }

        console.log("");

        // Auto-setup unconfigured clients
        const unconfigured = installed.filter(c => !isAlreadyConfigured(c));
        if (unconfigured.length === 0) {
            console.log("  ✅ All detected clients are already configured!");
            console.log("  If something isn't working, try: npx skillhub-mcp doctor");
        } else {
            for (const client of unconfigured) {
                setupClient(client, npxPath);
            }
        }
    }
}

/** Setup a specific client */
function setupClient(client: MCPClient, npxPath: string): void {
    const configPath = expandPath(client.configPath);
    const config = client.generateConfig(npxPath);

    console.log(`  ── ${client.name} ──`);
    console.log(`  Config: ${client.configPath}`);
    console.log("");

    if (isAlreadyConfigured(client)) {
        console.log("  ✅ Already configured! SkillHub is in your config.");
        console.log(`  💡 If not working, restart: ${client.restartHint}`);
        console.log("");
        return;
    }

    if (client.configFormat === "toml") {
        // TOML — append to existing file
        if (existsSync(configPath)) {
            try {
                const existing = readFileSync(configPath, "utf-8");
                writeFileSync(configPath, existing.trimEnd() + "\n\n" + config + "\n");
                console.log("  ✅ Config written successfully!");
            } catch (err) {
                console.log("  ❌ Could not write config automatically.");
                console.log("  Add this to your config file manually:\n");
                console.log(config.split("\n").map(l => "    " + l).join("\n"));
            }
        } else {
            // Create new config
            try {
                mkdirSync(expandPath(client.configPath.replace(/\/[^/]+$/, "")), { recursive: true });
                writeFileSync(configPath, config + "\n");
                console.log("  ✅ Config file created!");
            } catch {
                console.log("  ❌ Could not create config file.");
                console.log(`  Create ${client.configPath} with:\n`);
                console.log(config.split("\n").map(l => "    " + l).join("\n"));
            }
        }
    } else {
        // JSON — merge into existing or create new
        if (existsSync(configPath)) {
            try {
                const existing = JSON.parse(readFileSync(configPath, "utf-8"));
                if (!existing.mcpServers) existing.mcpServers = {};
                existing.mcpServers.skillhub = {
                    command: npxPath,
                    args: ["-y", "skillhub-mcp"],
                };
                writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
                console.log("  ✅ Config merged successfully!");
            } catch (err) {
                console.log("  ❌ Could not merge config automatically.");
                console.log(`  Add this to ${client.configPath}:\n`);
                console.log(config.split("\n").map(l => "    " + l).join("\n"));
            }
        } else {
            try {
                mkdirSync(expandPath(client.configPath.replace(/\/[^/]+$/, "")), { recursive: true });
                writeFileSync(configPath, config + "\n");
                console.log("  ✅ Config file created!");
            } catch {
                console.log("  ❌ Could not create config file.");
                console.log(`  Create ${client.configPath} with:\n`);
                console.log(config.split("\n").map(l => "    " + l).join("\n"));
            }
        }
    }

    console.log("");
    console.log(`  ⚠️  Restart required: ${client.restartHint}`);
    console.log(`  After restart, verify: npx skillhub-mcp doctor`);
    console.log("");
}

/**
 * Doctor command — diagnose issues with the installation and config.
 */
export function runDoctor(): void {
    console.log("");
    console.log("  ⚡ SkillHub MCP — Doctor");
    console.log("  ─────────────────────────────────────");
    console.log("");

    let issues = 0;

    // 1. Check Node version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1));
    if (major >= 18) {
        console.log(`  ✅ Node.js ${nodeVersion} (>= 18 required)`);
    } else {
        console.log(`  ❌ Node.js ${nodeVersion} — version 18+ required`);
        issues++;
    }

    // 2. Check npx path
    const npxPath = resolveNpxPath();
    if (npxPath && npxPath !== "npx") {
        console.log(`  ✅ npx found: ${npxPath}`);
    } else {
        console.log(`  ⚠️  npx: using PATH lookup (may fail in GUI apps)`);
        console.log(`     Fix: npm install -g npm`);
        issues++;
    }

    // 3. Check database
    try {
        const stats = getStats();
        console.log(`  ✅ Database loaded: ${stats.total.toLocaleString()} resources`);
    } catch (err) {
        console.log(`  ❌ Database failed to load: ${err}`);
        issues++;
    }

    // 4. Check each client
    console.log("");
    console.log("  MCP Client Status:");
    const installed = detectClients();

    if (installed.length === 0) {
        console.log("    No MCP clients detected on this system.");
    }

    for (const client of CLIENTS) {
        const clientInstalled = client.isInstalled();
        const configured = clientInstalled && isAlreadyConfigured(client);

        if (!clientInstalled) {
            console.log(`    ${client.name.padEnd(18)} ⬜ not installed`);
        } else if (configured) {
            console.log(`    ${client.name.padEnd(18)} ✅ configured`);

            // Check if the config uses absolute npx path
            const configPath = expandPath(client.configPath);
            try {
                const content = readFileSync(configPath, "utf-8");
                if (content.includes('"npx"') || content.includes("= \"npx\"")) {
                    console.log(`    ${"".padEnd(18)} ⚠️  uses "npx" — may fail in GUI apps`);
                    console.log(`    ${"".padEnd(18)}    Fix: npx skillhub-mcp setup ${client.slug}`);
                    issues++;
                }
            } catch { /* ignore */ }
        } else {
            console.log(`    ${client.name.padEnd(18)} ⚠️  installed but NOT configured`);
            console.log(`    ${"".padEnd(18)}    Fix: npx skillhub-mcp setup ${client.slug}`);
            issues++;
        }
    }

    // Summary
    console.log("");
    if (issues === 0) {
        console.log("  ✅ Everything looks good!");
    } else {
        console.log(`  ⚠️  ${issues} issue(s) found. See suggestions above.`);
    }
    console.log("");
}

/**
 * Print config for a specific client without writing it.
 */
export function runPrintConfig(clientSlug: string): void {
    const npxPath = resolveNpxPath();
    const client = findClient(clientSlug);

    if (!client) {
        console.log(`  ❌ Unknown client: "${clientSlug}"`);
        console.log(`  Supported: ${CLIENTS.map(c => c.slug).join(", ")}`);
        process.exit(1);
    }

    console.log("");
    console.log(`  ⚡ ${client.name} — MCP config for SkillHub`);
    console.log(`  File: ${client.configPath}`);
    console.log("  ─────────────────────────────────────");
    console.log("");
    console.log(client.generateConfig(npxPath));
    console.log("");
}
