import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { DocChunk, DocsIndex, FrameworkId } from "../types/index.js";
import { dataDir } from "./frameworks.js";

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
  const dir = dataDir();
  const livePath = path.join(dir, INDEX_FILE);
  const seedPath = path.join(dir, SEED_FILE);
  const seed = readIndex(seedPath);
  const file = existsSync(livePath) ? livePath : seedPath;
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
