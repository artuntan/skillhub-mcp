# Security Policy — skillhub-mcp

## What This Package Does

skillhub-mcp is an **offline** AI resource discovery tool. It recommends skills, tools, agents, and MCP servers from a bundled database of 20,000+ curated resources.

## Runtime Behavior

### What it does ✓
- **Reads a local JSON database** (`resources.json`) bundled inside the package
- **Writes MCP client config files** when you explicitly run `npx skillhub-mcp setup` — only to standard config locations (`~/.codex/`, `~/.cursor/`, etc.)
- **Communicates via stdin/stdout** when running as an MCP server (JSON-RPC protocol)
- **Prints to the terminal** when used as a CLI

### What it does NOT do ✗
- **No network requests** — the package never makes HTTP calls, fetches URLs, or opens sockets
- **No telemetry or analytics** — zero data collection, zero phone-home behavior
- **No eval or dynamic code execution** — no `eval()`, `new Function()`, or dynamic `import()`
- **No shell spawning** — no `exec()`, `execSync()`, `spawn()`, or `child_process` usage
- **No install scripts** — no `postinstall`, `preinstall`, or lifecycle hooks that run code on `npm install`
- **No background processes** — nothing runs after the CLI exits

## Dependency Posture

This package ships as a **self-contained bundle** with **zero runtime dependencies**.

All source code (including the MCP SDK) is bundled at build time using esbuild. The published package contains only:
- The bundled JavaScript files
- The resource database (JSON)
- Documentation

Nothing from `node_modules` is installed when you install this package.

## Filesystem Access

The `setup` and `doctor` commands read and write MCP client configuration files in these standard locations:

| Client | Path | Access |
|--------|------|--------|
| Codex | `~/.codex/config.toml` | Read/Write |
| Claude | `~/Library/Application Support/Claude/claude_desktop_config.json` | Read/Write |
| Cursor | `~/.cursor/mcp.json` | Read/Write |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | Read/Write |

This only happens when you explicitly run `npx skillhub-mcp setup`. The MCP server and all other commands never write to the filesystem.

## Reporting a Vulnerability

If you discover a security issue, please report it privately via GitHub Issues or email.
