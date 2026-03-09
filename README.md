# ⚡ SkillHub MCP

**AI Resource Intelligence** — Find the right tool for any AI task.

Search, discover, and get recommendations from 20,000+ skills, tools, agents, rules, and MCP servers — all from your terminal or AI client.

[![npm](https://img.shields.io/npm/v/skillhub-mcp)](https://www.npmjs.com/package/skillhub-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Quick Start

### 1. Setup (30 seconds)

```bash
npx skillhub-mcp setup
```

This auto-detects your installed AI clients (Codex, Claude, Cursor, Windsurf) and configures them automatically.

### 2. Restart your AI client

### 3. Done!

Your AI assistant can now discover and recommend tools. Try asking it:

> "What tools should I use to build a RAG pipeline with LangChain?"

---

## CLI Usage

SkillHub also works as a standalone CLI — no MCP client required.

### Recommend tools for a task

```bash
npx skillhub-mcp recommend "build a REST API with authentication"
```

Output:
```
  #1  Express.js  ✓  9.2
      Fast, unopinionated web framework for Node.js
      tool · cross-platform · expressjs
      → matches technologies: express, node; relevant to: api, coding

  #2  Passport.js  8.8
      Authentication middleware for Node.js
      tool · cross-platform · jaredhanson
      → matches technologies: node; relevant to: authentication
```

### Search resources

```bash
npx skillhub-mcp search "vector database"
```

### Get resource details

```bash
npx skillhub-mcp info "LangChain"
```

### Database statistics

```bash
npx skillhub-mcp stats
```

### JSON output

All data commands support `--json` for piping and scripting:

```bash
npx skillhub-mcp recommend "kubernetes" --json | jq '.results[0]'
npx skillhub-mcp stats --json
```

---

## MCP Tools

When connected to an AI client, SkillHub exposes these tools:

| Tool | Description |
|------|-------------|
| `recommend` | Analyze a task and recommend relevant resources |
| `search` | Search 20,000+ resources by keyword |
| `get_resource` | Get full details for a specific resource |
| `get_setup_guide` | Get install instructions for any resource |
| `analyze_stack` | Recommend tools based on your tech stack |

---

## Security & Trust

**This package is designed to be safe and auditable.**

- ✅ **Fully offline** — zero network requests, no HTTP calls, no telemetry
- ✅ **Zero runtime dependencies** — self-contained bundle, nothing from `node_modules`
- ✅ **No install scripts** — no `postinstall`, no code runs on `npm install`
- ✅ **No eval** — no `eval()`, `new Function()`, or dynamic code execution
- ✅ **No shell access** — no `exec()`, `spawn()`, or `child_process` usage
- ✅ **Filesystem access only in setup wizard** — writes MCP client configs when you explicitly run `setup`

See [SECURITY.md](SECURITY.md) for full details on runtime behavior and filesystem access.

---

## Diagnostics

```bash
npx skillhub-mcp doctor
```

Checks Node.js version, `npx` path resolution, database loading, and MCP client configuration status.

---

## Manual Client Setup

If the setup wizard doesn't work for your client, generate the config manually:

```bash
npx skillhub-mcp print-config codex    # Codex (TOML)
npx skillhub-mcp print-config claude   # Claude Desktop (JSON)
npx skillhub-mcp print-config cursor   # Cursor (JSON)
npx skillhub-mcp print-config windsurf # Windsurf (JSON)
```

> **Important:** The setup wizard uses absolute paths for `npx` (e.g., `/opt/homebrew/bin/npx`). GUI applications often don't inherit your shell's PATH.

---

## Requirements

- Node.js 18+
- npm / npx

## License

MIT
