# skillhub-mcp

> **AI resource intelligence for Claude, Cursor, Windsurf, and VS Code.**
> 20,000+ AI skills, tools, agents, rules, and MCP servers — recommended in context.

An MCP server that gives your AI assistant the power to discover, recommend, and explain the right AI tools for whatever you're building.

## Install

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skillhub": {
      "command": "npx",
      "args": ["-y", "skillhub-mcp"]
    }
  }
}
```

Restart Claude Desktop. The AI can now recommend AI tools during any conversation.

### Cursor

Open **Settings → MCP Servers → Add**, then:

```json
{
  "mcpServers": {
    "skillhub": {
      "command": "npx",
      "args": ["-y", "skillhub-mcp"]
    }
  }
}
```

### Windsurf / VS Code / Any MCP Client

Same pattern — configure your MCP client to run:

```bash
npx -y skillhub-mcp
```

### Global Install (optional)

```bash
npm install -g skillhub-mcp
```

Now you can run `skillhub-mcp` directly, no `npx` needed.

---

## What Does It Do?

Once configured, your AI assistant gains access to **5 intelligence tools** backed by a database of 20,000+ AI resources:

| Tool | What It Does |
|------|-------------|
| **`recommend`** | Analyzes your task and returns ranked recommendations |
| **`search`** | Searches resources by name, type, or ecosystem |
| **`get_resource`** | Gets full details about a specific resource |
| **`get_setup_guide`** | Provides install and configuration instructions |
| **`analyze_stack`** | Analyzes your tech stack and suggests complementary AI tools |

**You don't call these tools.** Your AI calls them automatically when it detects you could benefit from an AI resource.

---

## Examples

### "I need to build a RAG pipeline with LangChain"
→ Returns: LangChain, Pinecone, ChromaDB, Weaviate, LlamaIndex RAG components

### "Set up Cursor with Next.js best practices"
→ Returns: Next.js Cursor Rules, TypeScript Cursor Rules, React patterns

### "I want to run LLMs locally on my machine"
→ Returns: Ollama, llama.cpp, vLLM, LM Studio

### "Find MCP servers for database access"
→ Returns: PostgreSQL MCP Server, MongoDB MCP Server, Redis MCP Server

---

## CLI

Also usable as a CLI:

```bash
# Recommendations
npx skillhub-mcp recommend "build a RAG pipeline"

# Search
npx skillhub-mcp search "vector database"

# Resource details
npx skillhub-mcp info "Pinecone"

# Database stats
npx skillhub-mcp stats
```

Or if installed globally:

```bash
skillhub recommend "deploy ML model with Docker"
skillhub search "MCP server"
skillhub info "LangChain"
skillhub stats
```

---

## Database Coverage

| Category | Count |
|----------|-------|
| Rules (Cursor, Windsurf, Copilot) | 11,588 |
| Instructions | 5,222 |
| Skills / Libraries | 2,012 |
| Tools / SaaS | 967 |
| Agents | 292 |
| MCP Servers | 161 |
| **Total** | **20,306** |

**Ecosystems:** Cross-platform, Cursor, GitHub Copilot, Windsurf, OpenAI, Anthropic, Gemini, MCP

---

## How It Works

1. **Prompt Analysis** — Extracts technologies, task categories, and keywords
2. **TF-IDF Search** — Full-text search across 12,000+ indexed terms
3. **Multi-Signal Ranking** — Combines text similarity, tag overlap, type/ecosystem boosting, popularity, and verification quality
4. **Contextual Results** — Ranked, explained, with install guidance

All processing is local. No network requests. No API keys needed.

---

## Verify Installation

After configuring, ask your AI:

> "What AI tools would help me build a real-time data pipeline?"

If SkillHub is working, the AI will call the `recommend` tool and return contextual suggestions.

Or test via CLI:

```bash
npx skillhub-mcp stats
```

Expected output: `📊 Database: 20,306 resources`

---

## Troubleshooting

**Server not showing in Claude Desktop?**
- Make sure you restart Claude Desktop after editing config
- Check config file path: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Verify JSON is valid (no trailing commas)

**npx fails?**
- Ensure Node.js ≥ 18: `node --version`
- Try: `npx -y skillhub-mcp`

---

## Uninstall

Remove the `skillhub` entry from your MCP config file and restart the client.

If globally installed: `npm uninstall -g skillhub-mcp`

---

## License

MIT
