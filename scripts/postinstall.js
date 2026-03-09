#!/usr/bin/env node
/**
 * Post-install welcome banner — shown after `npm install skillhub-mcp`
 * 
 * Lightweight: no imports from the main package, just prints a message.
 */

const cyan = (t) => `\x1b[36m${t}\x1b[39m`;
const bold = (t) => `\x1b[1m${t}\x1b[22m`;
const dim = (t) => `\x1b[2m${t}\x1b[22m`;
const green = (t) => `\x1b[32m${t}\x1b[39m`;

// Respect NO_COLOR
const noColor = process.env.NO_COLOR !== undefined;
const c = noColor ? (t) => t : cyan;
const b = noColor ? (t) => t : bold;
const d = noColor ? (t) => t : dim;
const g = noColor ? (t) => t : green;

console.log("");
console.log(`  ${b(c("⚡"))} ${b("SkillHub MCP")} installed ${g("✓")}`);
console.log(`  ${d("AI resource intelligence — 20,000+ tools, skills, agents & MCP servers")}`);
console.log("");
console.log(`  ${b("Next step:")} Run the setup wizard to configure your AI client:`);
console.log("");
console.log(`    ${d("$")} ${c("npx skillhub-mcp setup")}`);
console.log("");
console.log(`  ${d("This auto-detects Codex, Claude, Cursor, and Windsurf.")}`);
console.log(`  ${d("After setup, restart your client and you're done.")}`);
console.log("");
