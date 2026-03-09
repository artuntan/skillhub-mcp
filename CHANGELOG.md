# Changelog

All notable changes to `skillhub-mcp` will be documented in this file.

## [0.6.0] — 2026-03-09

### Changed
- **Database compression**: resources.json is now gzip-compressed (9.3MB → 687KB, 93% smaller)
- **No source maps** in published package (saves ~1.4MB)
- Package size reduced from 1.1MB to ~200KB compressed

### Internal
- Build system: esbuild with gzip compression step
- Runtime: `zlib.gunzipSync` decompression (Node.js built-in, zero additional deps)

## [0.5.0] — 2026-03-09

### Security — Trust Hardening
- **Zero runtime dependencies** — everything bundled with esbuild
- **Removed `postinstall` script** — no code runs on `npm install`
- **Removed `child_process`** — replaced `execSync("which npx")` with pure `fs.existsSync`
- **Created `SECURITY.md`** — documents runtime behavior transparently
- **Added Security & Trust section to README**
- Published files reduced from 45 to 9

## [0.4.0] — 2026-03-09

### Added
- **Context-aware first-run experience** — detects MCP client state, shows onboarding or help
- **Post-install welcome banner** (removed in v0.5.0 for trust reasons)
- **Production README** rewrite

## [0.3.1] — 2026-03-09

### Changed
- Setup wizard, doctor, print-config redesigned through `ui.ts`
- Colored `✓`/`✗`/`!`/`·` status indicators

### Fixed
- `--version`/`--help` flag parsing (consumed by global flag filter)

## [0.3.0] — 2026-03-09

### Added
- **Terminal presentation engine** (`src/ui.ts`) — ANSI colors, NO_COLOR support
- **`--json` flag** on all data commands
- **Score normalization** — raw TF-IDF → 0.0–10.0 scale
- **Bar charts** in stats output
- **Numbered result cards** with visual hierarchy

### Fixed
- `server.ts` version mismatch (was hardcoded `0.1.0`)

## [0.2.2] — 2026-03-09

### Added
- Setup wizard with auto-detection for Codex, Claude, Cursor, Windsurf
- Doctor diagnostics command
- GitHub repository URL in package metadata

## [0.2.0] — 2026-03-09

### Added
- Smart unified entrypoint (CLI vs MCP auto-detection)
- CLI commands: recommend, search, info, stats, setup, doctor

## [0.1.0] — 2026-03-09

### Added
- Initial release
- MCP server with 5 tools: recommend, search, get_resource, get_setup_guide, analyze_stack
- Bundled database of 20,000+ AI resources
