import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { DocChunk, DocsIndex, FrameworkId } from "../types/index.js";
import { packagedDataDir, stateDir } from "./frameworks.js";

const INDEX_FILE = "docs-index.json";
const SEED_FILE = "seed-fallback.json";

let cache: { mtimeMs: number; index: DocsIndex } | undefined;

function readIndex(file: string): DocsIndex {
  const parsed = JSON.parse(readFileSync(file, "utf8")) as DocsIndex;
  if (!parsed?.chunks) {
    throw new Error(`Docs index at ${file} is missing chunks`);
  }
  return parsed;
}

function mergeSeed(live: DocsIndex, seed: DocsIndex): DocsIndex {
  const ids = new Set(live.chunks.map((c) => c.id));
  const extra = seed.chunks.filter((c) => !ids.has(c.id));
  if (extra.length === 0) return live;
  return { ...live, chunks: [...extra, ...live.chunks] };
}

export function loadDocsIndex(): DocsIndex {
  const packaged = packagedDataDir();
  const stateLive = path.join(stateDir(), INDEX_FILE);
  const packagedLive = path.join(packaged, INDEX_FILE);
  const seedPath = path.join(packaged, SEED_FILE);
  const seed = readIndex(seedPath);
  const file = existsSync(stateLive) ? stateLive : existsSync(packagedLive) ? packagedLive : seedPath;
  const mtimeMs = statSync(file).mtimeMs;
  if (!cache || cache.mtimeMs !== mtimeMs) {
    const live = readIndex(file);
    cache = { mtimeMs, index: mergeSeed(live, seed) };
  }
  return cache.index;
}

export function chunksFor(framework: FrameworkId): DocChunk[] {
  return loadDocsIndex().chunks.filter((c) => c.framework === framework);
}

export function invalidateDocsCache(): void {
  cache = undefined;
}
