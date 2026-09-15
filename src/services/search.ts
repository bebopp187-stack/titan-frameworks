import type { DocChunk, FrameworkId, SearchOutput } from "../types/index.js";
import { chunksFor } from "./docs-store.js";

const STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "to",
  "in",
  "for",
  "on",
  "is",
  "with",
  "from",
  "that",
  "this",
  "how",
  "what",
  "use",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_./:+-]+/g)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.length / 4));
}

function clip(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars).trimEnd()}…`;
}

function scoreChunk(chunk: DocChunk, terms: string[], phrase: string): number {
  const hay = `${chunk.title}\n${chunk.headingPath}\n${chunk.text}`.toLowerCase();
  let score = 0;
  if (phrase.length > 3 && hay.includes(phrase)) score += 8;
  for (const term of terms) {
    if (chunk.title.toLowerCase().includes(term)) score += 4;
    if (chunk.headingPath.toLowerCase().includes(term)) score += 2;
    const occ = hay.split(term).length - 1;
    score += Math.min(occ, 6);
  }
  if (chunk.source === "seed") score += 1.5;
  return score;
}

export function searchFrameworkDocs(
  framework: FrameworkId,
  query: string,
  limit = 5,
): SearchOutput {
  const terms = tokenize(query);
  const phrase = query.trim().toLowerCase();
  const ranked = chunksFor(framework)
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, terms, phrase) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const diverse: typeof ranked = [];
  for (const row of ranked) {
    const key = row.chunk.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    diverse.push(row);
    if (diverse.length >= limit) break;
  }

  return {
    framework,
    query,
    hitCount: diverse.length,
    hits: diverse.map(({ chunk, score }) => ({
      id: chunk.id,
      title: chunk.title,
      url: chunk.url,
      score: Number(score.toFixed(2)),
      headingPath: chunk.headingPath,
      chunk: clip(chunk.text, 1200),
    })),
  };
}

export { estimateTokens };
