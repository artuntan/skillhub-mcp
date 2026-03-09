# skillhub-mcp

> **AI resource intelligence for Codex, Claude, Cursor, Windsurf, and more.**
> 20,000+ AI skills, tools, agents, rules, and MCP servers — recommended in context.

## Quick Start

### 1. Setup (one command)

```bash
npx skillhub-mcp setup
```

This auto-detects your MCP clients and configures them.
Or target a specific client:

```bash
npx skillhub-mcp setup codex     # OpenAI Codex CLI
npx skillhub-mcp setup claude    # Claude Desktop
npx skillhub-mcp setup cursor    # Cursor IDE
npx skillhub-mcp setup windsurf  # Windsurf IDE
```

### 2. Restart your client

After setup, restart your AI client (Codex, Claude, Cursor, etc.)

### 3. Verify

```bash
npx skillhub-mcp doctor
```

That's it. Your AI can now recommend tools from 20,000+ resources.

---

## What This Does

Once configured, your AI assistant gains **5 intelligence tools** that help it recommend the right AI resources:

| Tool | What It Does |
|------|-------------|
| `recommend` | Analyzes your task and returns ranked recommendations |
| `search` | Searches resources by name, type, or ecosystem |
| `get_resource` | Gets full details about a specific resource |
| `get_setup_guide` | Provides install and config instructions |
| `analyze_stack` | Suggests complementary AI tools for your tech stack |

**You don't call these tools.** Your AI calls them automatically when relevant.

---

## Manual Setup

If you prefer manual configuration:

### OpenAI Codex

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.skillhub]
command = "/opt/homebrew/bin/npx"  # or: which npx
args = ["-y", "skillhub-mcp"]
startup_timeout_sec = 30
tool_timeout_sec = 60
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skillhub": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "skillhub-mcp"]
    }
  }
}
```

### Cursor / Windsurf / VS Code

```json
{
  "mcpServers": {
    "skillhub": {
      "command": "/opt/homebrew/bin/npx",
      "args": ["-y", "skillhub-mcp"]
    }
  }
}
```

> **Important:** Use the full path to `npx` (run `which npx` to find it).
> GUI apps often can't find `npx` through PATH alone.
> Run `npx skillhub-mcp print-config <client>` to get the correct config with your system's npx path.

---

## CLI

Also usable as a standalone CLI:

```bash
npx skillhub-mcp recommend "build a RAG pipeline with LangChain"
npx skillhub-mcp search "vector database"
npx skillhub-mcp info "Pinecone"
npx skillhub-mcp stats
```

## Troubleshooting

```bash
npx skillhub-mcp doctor    # Full diagnostics
```

This checks:
- ✅ Node.js version (≥ 18 required)
- ✅ npx absolute path (for GUI apps)
- ✅ Database loaded (20,000+ resources)
- ✅ Per-client config status

**Common issues:**

| Problem | Fix |
|---------|-----|
| "No MCP servers configured" | Run `npx skillhub-mcp setup <client>`, then restart |
| npx not found in GUI app | Use absolute path — run `npx skillhub-mcp print-config <client>` |
| Server not responding | Restart the AI client after config changes |
| Wrong Node version | Install Node 18+: `brew install node` |

## Uninstall

Remove the `skillhub` entry from your MCP config, then restart the client.

## License

MIT — [github.com/artuntan/skillhub-mcp](https://github.com/artuntan/skillhub-mcp)
