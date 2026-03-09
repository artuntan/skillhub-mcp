/**
 * Terminal Presentation Engine — ANSI color, formatting, and layout system.
 * 
 * Features:
 * - ANSI color/style with NO_COLOR and non-TTY auto-detection
 * - Terminal width-aware truncation
 * - Reusable formatters: heading, divider, badge, bar, table, card
 * - Score normalization and display
 */

// ── Color Detection ──────────────────────────────────────────

const isColorSupported = (): boolean => {
    if (process.env.NO_COLOR !== undefined) return false;
    if (process.env.FORCE_COLOR !== undefined) return true;
    if (!process.stdout.isTTY) return false;
    return true;
};

let _colorEnabled = isColorSupported();

export function setColor(enabled: boolean) { _colorEnabled = enabled; }
export function isColor(): boolean { return _colorEnabled; }

// ── ANSI Codes ───────────────────────────────────────────────

const esc = (open: string, close: string) => (text: string): string =>
    _colorEnabled ? `\x1b[${open}m${text}\x1b[${close}m` : text;

export const bold = esc("1", "22");
export const dim = esc("2", "22");
export const italic = esc("3", "23");
export const underline = esc("4", "24");

export const red = esc("31", "39");
export const green = esc("32", "39");
export const yellow = esc("33", "39");
export const blue = esc("34", "39");
export const magenta = esc("35", "39");
export const cyan = esc("36", "39");
export const white = esc("37", "39");
export const gray = esc("90", "39");

// Bright variants
export const brightCyan = esc("96", "39");
export const brightGreen = esc("92", "39");
export const brightYellow = esc("93", "39");
export const brightMagenta = esc("95", "39");
export const brightWhite = esc("97", "39");

// ── Terminal Width ───────────────────────────────────────────

export function getWidth(): number {
    try {
        const cols = process.stdout.columns || 80;
        // Floor at 80 — narrow pseudo-terminals shouldn't truncate content
        return Math.max(80, cols);
    } catch {
        return 80;
    }
}

// ── Text Utilities ───────────────────────────────────────────

/** Truncate text at word boundary */
export function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    const truncated = text.slice(0, maxLen);
    const lastSpace = truncated.lastIndexOf(" ");
    if (lastSpace > maxLen * 0.6) {
        return truncated.slice(0, lastSpace) + "…";
    }
    return truncated.slice(0, maxLen - 1) + "…";
}

/** Strip ANSI codes for length calculation */
export function stripAnsi(text: string): string {
    return text.replace(/\x1b\[[0-9;]*m/g, "");
}

/** Pad string accounting for ANSI codes */
export function padEnd(text: string, len: number): string {
    const visible = stripAnsi(text).length;
    return text + " ".repeat(Math.max(0, len - visible));
}

/** Right-align text to a total width */
export function padStart(text: string, len: number): string {
    const visible = stripAnsi(text).length;
    return " ".repeat(Math.max(0, len - visible)) + text;
}

// ── Score Normalization ──────────────────────────────────────

/** 
 * Normalize a raw score to a 0.0–10.0 display scale.
 * Raw scores from ranker typically range 0.3–1.2.
 * Uses sqrt scaling for better spread in the mid-range.
 */
export function normalizeScore(rawScore: number): number {
    // Scale: 0 → 0, 0.5 → ~7, 0.8 → ~9, 1.0+ → 10
    const clamped = Math.max(0, Math.min(rawScore, 1.5));
    const normalized = Math.sqrt(clamped / 1.0) * 10;
    return Math.round(Math.min(10, normalized) * 10) / 10;
}

/** Format a normalized score as a colored string */
export function formatScore(score: number): string {
    const n = normalizeScore(score);
    const label = n.toFixed(1).padStart(4);
    if (n >= 8) return brightGreen(bold(label));
    if (n >= 6) return green(label);
    if (n >= 4) return yellow(label);
    return gray(label);
}

/** Format a normalized score with visual bar */
export function formatScoreBar(score: number, width: number = 10): string {
    const n = normalizeScore(score);
    const filled = Math.round((n / 10) * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);

    if (n >= 8) return green(bar);
    if (n >= 6) return cyan(bar);
    if (n >= 4) return yellow(bar);
    return gray(bar);
}

// ── Layout Components ────────────────────────────────────────

/** Print the SkillHub banner */
export function banner(): string {
    return [
        "",
        `  ${bold(cyan("⚡"))} ${bold("SkillHub")} ${dim("— AI Resource Intelligence")}`,
        `  ${dim("─".repeat(Math.min(50, getWidth() - 4)))}`,
    ].join("\n");
}

/** Section heading */
export function heading(text: string): string {
    return `\n  ${bold(brightCyan(text))}`;
}

/** Sub-heading with optional count */
export function subheading(text: string, count?: number): string {
    const countStr = count !== undefined ? ` ${dim(`(${count})`)}` : "";
    return `  ${bold(text)}${countStr}`;
}

/** Horizontal divider */
export function divider(width?: number): string {
    const w = width ?? Math.min(50, getWidth() - 4);
    return `  ${dim("─".repeat(w))}`;
}

/** Key-value pair */
export function keyValue(key: string, value: string, keyWidth: number = 14): string {
    return `  ${dim(key.padEnd(keyWidth))} ${value}`;
}

/** Badge — small colored label */
export function badge(text: string, color: "green" | "cyan" | "yellow" | "red" | "magenta" | "gray" = "cyan"): string {
    const colors = { green, cyan, yellow, red, magenta, gray };
    return colors[color](text);
}

/** Type badge with color mapping */
export function typeBadge(type: string): string {
    const map: Record<string, typeof cyan> = {
        "skill": cyan,
        "tool": brightCyan,
        "agent": magenta,
        "mcp-server": brightGreen,
        "rule": yellow,
        "instruction": yellow,
        "prompt-pack": brightMagenta,
        "directory": gray,
        "platform-feature": gray,
    };
    const colorFn = map[type] || gray;
    return colorFn(type);
}

/** Ecosystem badge */
export function ecoBadge(ecosystem: string): string {
    const map: Record<string, typeof cyan> = {
        "cursor": yellow,
        "github-copilot": white,
        "windsurf": cyan,
        "cross-platform": gray,
        "openai": green,
        "anthropic": brightMagenta,
        "gemini": blue,
        "mcp": brightGreen,
    };
    const colorFn = map[ecosystem] || gray;
    return colorFn(ecosystem);
}

/** Verification badge */
export function verifiedBadge(verified: boolean): string {
    return verified ? green("✓ verified") : "";
}

/** Star count display */
export function starCount(stars: number): string {
    if (stars <= 0) return "";
    if (stars >= 1000) return dim(`★ ${Math.round(stars / 1000)}k`);
    return dim(`★ ${stars}`);
}

// ── Bar Chart ────────────────────────────────────────────────

/** Simple horizontal bar chart */
export function barChart(items: { label: string; value: number }[], options: {
    maxBarWidth?: number;
    labelWidth?: number;
    showValue?: boolean;
} = {}): string[] {
    const { maxBarWidth = 25, labelWidth = 20, showValue = true } = options;
    const maxVal = Math.max(...items.map(i => i.value));

    return items.map(({ label, value }) => {
        const barLen = maxVal > 0 ? Math.max(1, Math.round((value / maxVal) * maxBarWidth)) : 0;
        const bar = cyan("█".repeat(barLen));
        const valStr = showValue ? ` ${dim(value.toLocaleString())}` : "";
        return `    ${dim(label.padEnd(labelWidth))} ${bar}${valStr}`;
    });
}

// ── Result Card ──────────────────────────────────────────────

interface ResultCardOptions {
    rank: number;
    title: string;
    description: string;
    type: string;
    ecosystem: string;
    url: string;
    stars: number;
    score: number;
    verified: boolean;
    creator?: string;
    installCommand?: string;
    whyRecommended?: string;
}

/** Render a recommendation result card */
export function resultCard(opts: ResultCardOptions): string {
    const maxDescWidth = Math.min(80, getWidth() - 8);
    const lines: string[] = [];

    // Line 1: rank, title, score, verified
    const rankStr = dim(`#${String(opts.rank).padEnd(2)}`);
    const scoreStr = formatScore(opts.score);
    const vBadge = opts.verified ? ` ${green("✓")}` : "";
    const stars = starCount(opts.stars);
    const starsStr = stars ? ` ${stars}` : "";

    lines.push(`  ${rankStr} ${bold(opts.title)}${vBadge}${starsStr}  ${scoreStr}`);

    // Line 2: description
    const desc = truncate(opts.description, maxDescWidth);
    lines.push(`      ${dim(desc)}`);

    // Line 3: type · ecosystem · creator
    const meta = [
        typeBadge(opts.type),
        ecoBadge(opts.ecosystem),
        opts.creator ? dim(opts.creator) : null,
    ].filter(Boolean).join(dim(" · "));
    lines.push(`      ${meta}`);

    // Line 4 (optional): why recommended
    if (opts.whyRecommended) {
        lines.push(`      ${dim("→")} ${dim(truncate(opts.whyRecommended, maxDescWidth - 4))}`);
    }

    // Line 5 (optional): install command
    if (opts.installCommand) {
        lines.push(`      ${dim("$")} ${gray(opts.installCommand)}`);
    }

    return lines.join("\n");
}

// ── Info Card ────────────────────────────────────────────────

interface InfoCardOptions {
    title: string;
    description: string;
    type: string;
    ecosystem: string;
    creator: string;
    stars: number;
    verified: boolean;
    tags: string[];
    url: string;
    repositoryUrl?: string;
    installCommand?: string;
    docsUrl?: string;
}

/** Render a full-detail info card */
export function infoCard(opts: InfoCardOptions): string {
    const lines: string[] = [];
    const w = Math.min(60, getWidth() - 4);

    lines.push("");
    lines.push(`  ${bold(cyan("⚡"))} ${bold(opts.title)}  ${verifiedBadge(opts.verified)}`);
    lines.push(`  ${dim("─".repeat(w))}`);
    lines.push(`  ${opts.description}`);
    lines.push("");

    // Metadata
    lines.push(heading("Details"));
    lines.push(keyValue("Type", typeBadge(opts.type)));
    lines.push(keyValue("Ecosystem", ecoBadge(opts.ecosystem)));
    lines.push(keyValue("Creator", opts.creator || "—"));
    lines.push(keyValue("Stars", opts.stars > 0 ? `★ ${opts.stars.toLocaleString()}` : "—"));
    lines.push(keyValue("Tags", opts.tags.length > 0 ? opts.tags.map(t => dim(t)).join(dim(", ")) : "—"));

    // Links
    lines.push(heading("Links"));
    lines.push(keyValue("URL", cyan(opts.url)));
    if (opts.repositoryUrl) lines.push(keyValue("Repository", cyan(opts.repositoryUrl)));
    if (opts.docsUrl) lines.push(keyValue("Docs", cyan(opts.docsUrl)));

    // Install
    if (opts.installCommand) {
        lines.push(heading("Install"));
        lines.push(`  ${dim("$")} ${opts.installCommand}`);
    }

    lines.push("");
    return lines.join("\n");
}

// ── Status Indicators ────────────────────────────────────────

export function pass(text: string): string {
    return `  ${green("✓")} ${text}`;
}

export function fail(text: string): string {
    return `  ${red("✗")} ${text}`;
}

export function warn(text: string): string {
    return `  ${yellow("!")} ${text}`;
}

export function info(text: string): string {
    return `  ${cyan("·")} ${text}`;
}

export function skip(text: string): string {
    return `  ${dim("·")} ${dim(text)}`;
}

// ── Help Formatter ───────────────────────────────────────────

export function helpCommand(cmd: string, desc: string): string {
    return `    ${cyan(cmd.padEnd(24))} ${dim(desc)}`;
}

export function helpSection(title: string): string {
    return `\n  ${bold(title)}`;
}

// ── JSON Output ──────────────────────────────────────────────

let _jsonMode = false;
export function setJsonMode(enabled: boolean) { _jsonMode = enabled; }
export function isJsonMode(): boolean { return _jsonMode; }

/** Output JSON and exit — used for --json flag */
export function outputJson(data: unknown): void {
    console.log(JSON.stringify(data, null, 2));
}
