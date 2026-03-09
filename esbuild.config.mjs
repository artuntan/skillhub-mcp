import { build } from "esbuild";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";

// Bundle index.ts and cli.ts into self-contained files.
// Tree-shakes unused SDK code (express, hono, cross-spawn, jose, pkce, cors).
// Result: zero runtime node_modules dependencies needed at install time.

const shared = {
    bundle: true,
    platform: "node",
    target: "node18",
    format: "esm",
    sourcemap: true,
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

    addShebang("dist/index.js");
    addShebang("dist/cli.js");

    copyFileSync("src/data/resources.json", "dist/data/resources.json");

    console.log("✓ Bundle complete — zero runtime dependencies");
}

bundle().catch((err) => {
    console.error("Build failed:", err);
    process.exit(1);
});
