#!/usr/bin/env node
/**
 * PGlite's wasm/data files are loaded via import.meta.url next to the JS
 * module. Nitro bundles that module into `.output/server/_libs/` (or the
 * Vercel function equivalent) and does not copy the sidecar files.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["pglite.wasm", "pglite.data", "initdb.wasm", "initdb.js"];

function pgliteDist() {
  const dir = join(ROOT, "node_modules/@electric-sql/pglite/dist");
  return existsSync(join(dir, "pglite.data")) ? dir : null;
}

function walkFiles(dir, depth = 0, out = []) {
  if (depth > 6) return out;
  let ents;
  try {
    ents = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of ents) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, depth + 1, out);
    else out.push(p);
  }
  return out;
}

function destDirs(serverRoot) {
  const dests = new Set([
    serverRoot,
    join(serverRoot, "_libs"),
    join(serverRoot, "chunks"),
  ]);
  for (const p of walkFiles(serverRoot)) {
    const name = p.split("/").pop() ?? "";
    if (/pglite|electric-sql__pglite|initdb/i.test(name)) dests.add(dirname(p));
  }
  return [...dests];
}

const dist = pgliteDist();
if (!dist) {
  console.log("[pglite] dist not found — skip asset copy");
  process.exit(0);
}

const serverRoots = [
  join(ROOT, ".output/server"),
  join(ROOT, ".vercel/output/functions/__server.func"),
].filter(existsSync);

if (serverRoots.length === 0) {
  console.log("[pglite] no server output yet — skip asset copy");
  process.exit(0);
}

let copied = 0;
for (const root of serverRoots) {
  for (const dest of destDirs(root)) {
    mkdirSync(dest, { recursive: true });
    for (const file of FILES) {
      const src = join(dist, file);
      if (!existsSync(src)) continue;
      copyFileSync(src, join(dest, file));
      copied += 1;
    }
  }
}
console.log(`[pglite] copied wasm/data sidecars (${copied} files)`);
