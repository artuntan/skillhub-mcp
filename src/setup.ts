/**
 * Setup Wizard — Guided MCP client configuration for skillhub-mcp.
 *
 * Handles config generation, auto-writing, PATH resolution, and diagnostics
 * for Codex, Claude Desktop, Cursor, Windsurf.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { getStats } from "./engine/loader.js";
import * as ui from "./ui.js";

// ── Version ──────────────────────────────────────────────────
export const VERSION = "0.3.1";

// ── Client definitions ──────────────────────────────────────

interface MCPClient {
    name: string;
    slug: string;
    configPath: string;
    configFormat: "json" | "toml";
    restartHint: string;
    generateConfig: (npxPath: string) => string;
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
        restartHint: "Restart Cursor or reload window (Cmd+Shift+P → Reload)",
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

export function resolveNpxPath(): string {
    const candidates = [
        "/opt/homebrew/bin/npx",
        "/usr/local/bin/npx",
        "/usr/bin/npx",
    ];

    try {
        const result = execSync("which npx", { encoding: "utf-8" }).trim();
        if (result && existsSync(result)) return result;
    } catch { /* ignore */ }

    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }

    return "npx";
}

function findClient(slug: string): MCPClient | undefined {
    return CLIENTS.find(c => c.slug === slug.toLowerCase());
}

function detectClients(): MCPClient[] {
    return CLIENTS.filter(c => c.isInstalled());
}

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

export function runSetup(clientSlug?: string): void {
    const npxPath = resolveNpxPath();

    console.log(ui.banner());
    console.log(ui.heading("Setup Wizard"));
    console.log(ui.info(`npx resolved: ${ui.cyan(npxPath)}`));
    console.log("");

    if (clientSlug) {
        const client = findClient(clientSlug);
        if (!client) {
            console.log(ui.fail(`Unknown client: "${clientSlug}"`));
            console.log(ui.info(`Supported: ${CLIENTS.map(c => ui.cyan(c.slug)).join(", ")}`));
            process.exit(1);
        }
        setupClient(client, npxPath);
    } else {
        const installed = detectClients();
        if (installed.length === 0) {
            console.log(ui.warn("No supported MCP clients detected."));
            console.log(ui.info("Supported: Codex, Claude Desktop, Cursor, Windsurf"));
            console.log("");
            console.log(ui.info("Generate config for a specific client:"));
            for (const c of CLIENTS) {
                console.log(`    ${ui.dim("$")} npx skillhub-mcp setup ${ui.cyan(c.slug)}`);
            }
            console.log("");
            return;
        }

        console.log(ui.subheading("Detected Clients"));
        for (const client of installed) {
            const configured = isAlreadyConfigured(client);
            if (configured) {
                console.log(ui.pass(`${client.name} ${ui.dim("— configured")}`));
            } else {
                console.log(ui.warn(`${client.name} ${ui.dim("— not configured")}`));
            }
        }
        console.log("");

        const unconfigured = installed.filter(c => !isAlreadyConfigured(c));
        if (unconfigured.length === 0) {
            console.log(ui.pass(ui.bold("All detected clients are already configured!")));
            console.log(ui.info(`If not working, run: ${ui.cyan("npx skillhub-mcp doctor")}`));
            console.log("");
        } else {
            for (const client of unconfigured) {
                setupClient(client, npxPath);
            }
        }
    }
}

function setupClient(client: MCPClient, npxPath: string): void {
    const configPath = expandPath(client.configPath);
    const config = client.generateConfig(npxPath);

    console.log(ui.subheading(`Setting up ${ui.bold(client.name)}`));
    console.log(ui.info(`Config: ${ui.dim(client.configPath)}`));
    console.log("");

    if (isAlreadyConfigured(client)) {
        console.log(ui.pass("Already configured — SkillHub is in your config."));
        console.log(ui.info(`Restart hint: ${ui.dim(client.restartHint)}`));
        console.log("");
        return;
    }

    let success = false;

    if (client.configFormat === "toml") {
        if (existsSync(configPath)) {
            try {
                const existing = readFileSync(configPath, "utf-8");
                writeFileSync(configPath, existing.trimEnd() + "\n\n" + config + "\n");
                success = true;
            } catch { /* fallthrough */ }
        } else {
            try {
                mkdirSync(expandPath(client.configPath.replace(/\/[^/]+$/, "")), { recursive: true });
                writeFileSync(configPath, config + "\n");
                success = true;
            } catch { /* fallthrough */ }
        }
    } else {
        if (existsSync(configPath)) {
            try {
                const existing = JSON.parse(readFileSync(configPath, "utf-8"));
                if (!existing.mcpServers) existing.mcpServers = {};
                existing.mcpServers.skillhub = {
                    command: npxPath,
                    args: ["-y", "skillhub-mcp"],
                };
                writeFileSync(configPath, JSON.stringify(existing, null, 2) + "\n");
                success = true;
            } catch { /* fallthrough */ }
        } else {
            try {
                mkdirSync(expandPath(client.configPath.replace(/\/[^/]+$/, "")), { recursive: true });
                writeFileSync(configPath, config + "\n");
                success = true;
            } catch { /* fallthrough */ }
        }
    }

    if (success) {
        console.log(ui.pass("Config written successfully!"));
    } else {
        console.log(ui.fail("Could not write config automatically."));
        console.log(ui.info("Add this manually:"));
        console.log("");
        console.log(config.split("\n").map(l => `    ${ui.dim(l)}`).join("\n"));
    }

    console.log("");
    console.log(ui.warn(`${ui.bold("Restart required:")} ${client.restartHint}`));
    console.log(ui.info(`After restart: ${ui.cyan("npx skillhub-mcp doctor")}`));
    console.log("");
}

export function runDoctor(): void {
    console.log(ui.banner());
    console.log(ui.heading("Doctor — Diagnostics"));
    console.log("");

    let issues = 0;

    // 1. Node version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.slice(1));
    if (major >= 18) {
        console.log(ui.pass(`Node.js ${ui.bold(nodeVersion)} ${ui.dim("(>= 18 required)")}`));
    } else {
        console.log(ui.fail(`Node.js ${nodeVersion} — ${ui.red("version 18+ required")}`));
        issues++;
    }

    // 2. npx path
    const npxPath = resolveNpxPath();
    if (npxPath && npxPath !== "npx") {
        console.log(ui.pass(`npx found at ${ui.cyan(npxPath)}`));
    } else {
        console.log(ui.warn(`npx uses PATH lookup ${ui.dim("(may fail in GUI apps)")}`));
        console.log(`     ${ui.dim("Fix: npm install -g npm")}`);
        issues++;
    }

    // 3. Database
    try {
        const stats = getStats();
        console.log(ui.pass(`Database loaded: ${ui.bold(stats.total.toLocaleString())} resources`));
    } catch (err) {
        console.log(ui.fail(`Database failed to load: ${err}`));
        issues++;
    }

    // 4. Client status
    console.log("");
    console.log(ui.subheading("MCP Clients"));

    for (const client of CLIENTS) {
        const installed = client.isInstalled();
        const configured = installed && isAlreadyConfigured(client);

        if (!installed) {
            console.log(ui.skip(`${client.name} ${ui.dim("— not installed")}`));
        } else if (configured) {
            console.log(ui.pass(`${client.name} ${ui.dim("— configured")}`));

            const cPath = expandPath(client.configPath);
            try {
                const content = readFileSync(cPath, "utf-8");
                if (content.includes('"npx"') || content.includes("= \"npx\"")) {
                    console.log(`     ${ui.yellow("!")} Uses ${ui.dim('"npx"')} — ${ui.dim("may fail in GUI apps")}`);
                    console.log(`     ${ui.dim("Fix:")} npx skillhub-mcp setup ${client.slug}`);
                    issues++;
                }
            } catch { /* ignore */ }
        } else {
            console.log(ui.warn(`${client.name} ${ui.dim("— installed but")} ${ui.yellow("NOT configured")}`));
            console.log(`     ${ui.dim("Fix:")} npx skillhub-mcp setup ${client.slug}`);
            issues++;
        }
    }

    // Summary
    console.log("");
    if (issues === 0) {
        console.log(ui.pass(ui.bold("Everything looks good!")));
    } else {
        console.log(ui.warn(`${ui.bold(`${issues} issue(s) found`)} — see suggestions above`));
    }
    console.log("");
}

export function runPrintConfig(clientSlug: string): void {
    const npxPath = resolveNpxPath();
    const client = findClient(clientSlug);

    if (!client) {
        console.log(ui.fail(`Unknown client: "${clientSlug}"`));
        console.log(ui.info(`Supported: ${CLIENTS.map(c => ui.cyan(c.slug)).join(", ")}`));
        process.exit(1);
    }

    console.log(ui.banner());
    console.log(ui.heading(`${client.name} — MCP Config`));
    console.log(ui.info(`File: ${ui.dim(client.configPath)}`));
    console.log("");
    console.log(client.generateConfig(npxPath));
    console.log("");
}
