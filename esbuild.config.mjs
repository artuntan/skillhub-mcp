import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { gzipSync } from "zlib";

// Bundle index.ts and cli.ts into self-contained files.
// Tree-shakes unused SDK code (express, hono, cross-spawn, jose, pkce, cors).
// Gzip compresses the resource database (9.3MB → ~700KB).
// Result: zero runtime dependencies, minimal package size.

const shared = {
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    sourcemap: false, // no source maps in published package
    minify: false, // keep readable for auditability
    external: [
        "fs", "path", "os", "url", "util", "stream", "events", "buffer",
        "child_process", "crypto", "http", "https", "net", "tls", "zlib",
        "worker_threads", "assert", "tty", "readline",
        "node:fs", "node:path", "node:os", "node:url", "node:util",
        "node:stream", "node:events", "node:buffer", "node:child_process",
        "node:crypto", "node:http", "node:https", "node:net", "node:tls",
        "node:zlib", "node:worker_threads", "node:assert", "node:tty",
        "node:readline",
    ],
};

function addShebang(filePath) {
    const content = readFileSync(filePath, "utf8");
    const shebang = "#!/usr/bin/env node\n";
    const requireShim = 'import{createRequire}from"module";const require=createRequire(import.meta.url);\n';
    if (!content.startsWith("#!")) {
        writeFileSync(filePath, shebang + requireShim + content);
    }
    chmodSync(filePath, "755");
}

async function bundle() {
    mkdirSync("dist/data", { recursive: true });

    // Bundle entrypoints
    await build({
        ...shared,
        entryPoints: ["src/index.ts"],
        outfile: "dist/index.js",
    });

    await build({
        ...shared,
        entryPoints: ["src/cli.ts"],
        outfile: "dist/cli.js",
    });

    // Add shebangs
    addShebang("dist/index.js");
    addShebang("dist/cli.js");

    // Gzip compress the resource database (9.3MB → ~700KB)
    const raw = readFileSync("src/data/resources.json");
    const compressed = gzipSync(raw, { level: 9 });
    writeFileSync("dist/data/resources.json.gz", compressed);

    const rawKB = (raw.length / 1024).toFixed(0);
    const gzKB = (compressed.length / 1024).toFixed(0);
    const ratio = ((1 - compressed.length / raw.length) * 100).toFixed(0);

    console.log(`✓ Bundle complete — zero runtime dependencies`);
    console.log(`✓ Database compressed: ${rawKB}KB → ${gzKB}KB (${ratio}% smaller)`);
}

bundle().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
