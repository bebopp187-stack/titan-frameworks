import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { DocChunk, DocsIndex, FrameworkId } from "../types/index.js";
import { XRPL_CRAWL_TARGET, type CrawlSourceSpec } from "../indexer/crawl.js";
import { dataDir, FRAMEWORK_META, readJsonFile } from "./frameworks.js";
import { toCleanMarkdown } from "./html-to-markdown.js";
import { estimateTokens } from "./search.js";

const UA = "TitanFrameworks/1.0 (docs-indexer; +https://github.com)";
const MAX_PAGES = 28;
const MAX_CHARS = 180_000;
const CHUNK_CHARS = 1600;

export const SOURCES: Record<FrameworkId, CrawlSourceSpec> = {
  langchain: {
    llmsTxt: [
      "https://docs.langchain.com/llms.txt",
      "https://python.langchain.com/llms.txt",
    ],
    releases: "https://api.github.com/repos/langchain-ai/langchain/releases?per_page=6",
    extra: [
      "https://raw.githubusercontent.com/langchain-ai/langchain/master/README.md",
    ],
  },
  llamaindex: {
    llmsTxt: ["https://docs.llamaindex.ai/llms.txt"],
    releases: "https://api.github.com/repos/run-llama/llama_index/releases?per_page=6",
    extra: [
      "https://raw.githubusercontent.com/run-llama/llama_index/main/README.md",
    ],
  },
  ollama: {
    llmsTxt: ["https://docs.ollama.com/llms.txt"],
    releases: "https://api.github.com/repos/ollama/ollama/releases?per_page=6",
    extra: [
      "https://raw.githubusercontent.com/ollama/ollama/main/README.md",
      "https://raw.githubusercontent.com/ollama/ollama/main/docs/api.md",
      "https://raw.githubusercontent.com/ollama/ollama/main/docs/faq.md",
    ],
    githubDocs: { repo: "ollama/ollama", path: "docs" },
  },
  xrpl: XRPL_CRAWL_TARGET,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hashId(parts: string): string {
  return createHash("sha1").update(parts).digest("hex").slice(0, 16);
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "user-agent": UA,
    accept: "application/vnd.github+json",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchText(url: string): Promise<{ body: string; type: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/plain, text/markdown, text/html, application/json" },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    const body = await res.text();
    if (!body || body.length > MAX_CHARS) return null;
    return { body, type, finalUrl: res.url || url };
  } catch {
    return null;
  }
}

function parseLlmsTxt(text: string, base: string): string[] {
  const urls: string[] = [];
  const re = /\[[^\]]+\]\((https?:[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    urls.push(m[1]);
  }
  const relative = /\[[^\]]+\]\((\/[^)\s]+)\)/g;
  while ((m = relative.exec(text))) {
    try {
      urls.push(new URL(m[1], base).toString());
    } catch {
      /* skip */
    }
  }
  return [...new Set(urls)];
}

function chunkMarkdown(
  framework: FrameworkId,
  title: string,
  url: string,
  source: string,
  markdown: string,
): DocChunk[] {
  const now = new Date().toISOString();
  const sections: { heading: string; body: string }[] = [];
  const lines = markdown.split(/\r?\n/);
  let current = { heading: title, body: "" };
  for (const line of lines) {
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      if (current.body.trim()) sections.push(current);
      current = { heading: h[2].trim(), body: "" };
    } else {
      current.body += `${line}\n`;
    }
  }
  if (current.body.trim()) sections.push(current);

  const chunks: DocChunk[] = [];
  for (const section of sections) {
    const text = section.body.trim();
    if (text.length < 40) continue;
    for (let i = 0; i < text.length; i += CHUNK_CHARS) {
      const slice = text.slice(i, i + CHUNK_CHARS).trim();
      if (slice.length < 40) continue;
      chunks.push({
        id: hashId(`${framework}|${url}|${source}|${section.heading}|${i}|${slice.slice(0, 48)}`),
        framework,
        title: section.heading.slice(0, 160),
        url,
        source,
        headingPath: `${FRAMEWORK_META[framework].displayName} > ${section.heading}`.slice(0, 200),
        text: slice,
        tokens: estimateTokens(slice),
        updatedAt: now,
      });
    }
  }
  return chunks;
}

interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  published_at?: string;
}

async function fetchReleases(framework: FrameworkId, apiUrl: string): Promise<DocChunk[]> {
  try {
    const res = await fetch(apiUrl, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as GithubRelease[];
    const chunks: DocChunk[] = [];
    for (const rel of payload.slice(0, 6)) {
      const md = `# ${rel.name ?? rel.tag_name}\n\n${rel.body ?? ""}`.trim();
      chunks.push(
        ...chunkMarkdown(
          framework,
          `Release ${rel.tag_name ?? rel.name ?? "notes"}`,
          rel.html_url ?? apiUrl,
          "github-releases",
          md,
        ),
      );
    }
    return chunks;
  } catch {
    return [];
  }
}

interface GithubContent {
  type: string;
  name: string;
  download_url: string | null;
  path: string;
}

async function fetchGithubDocsFolder(framework: FrameworkId, repo: string, folder: string): Promise<DocChunk[]> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${folder}`, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return [];
    const listing = (await res.json()) as GithubContent[];
    const files = listing.filter((f) => f.type === "file" && /\.(md|mdx|txt)$/i.test(f.name)).slice(0, 12);
    const chunks: DocChunk[] = [];
    for (const file of files) {
      if (!file.download_url) continue;
      const got = await fetchText(file.download_url);
      await sleep(120);
      if (!got) continue;
      chunks.push(
        ...chunkMarkdown(
          framework,
          file.name,
          `https://github.com/${repo}/blob/main/${file.path}`,
          "github-docs",
          toCleanMarkdown(got.body, got.type),
        ),
      );
    }
    return chunks;
  } catch {
    return [];
  }
}

async function indexFramework(framework: FrameworkId): Promise<{ chunks: DocChunk[]; sources: string[] }> {
  const spec = SOURCES[framework];
  const chunks: DocChunk[] = [];
  const sources: string[] = [];
  const seen = new Set<string>();

  const enqueue = async (url: string, source: string) => {
    if (seen.has(url) || seen.size >= MAX_PAGES) return;
    seen.add(url);
    const got = await fetchText(url);
    await sleep(120);
    if (!got) return;
    sources.push(url);
    const md = toCleanMarkdown(got.body, got.type);
    chunks.push(...chunkMarkdown(framework, url, got.finalUrl, source, md));
  };

  for (const llms of spec.llmsTxt) {
    const got = await fetchText(llms);
    if (!got) continue;
    sources.push(llms);
    const links = parseLlmsTxt(got.body, llms).slice(0, MAX_PAGES);
    chunks.push(...chunkMarkdown(framework, "llms.txt index", llms, "llms.txt", toCleanMarkdown(got.body, got.type)));
    for (const link of links) {
      if (seen.size >= MAX_PAGES) break;
      await enqueue(link, "llms.txt");
    }
  }

  for (const extra of spec.extra) {
    await enqueue(extra, "github-raw");
  }

  chunks.push(...(await fetchReleases(framework, spec.releases)));
  sources.push(spec.releases);

  if (spec.githubDocs) {
    chunks.push(...(await fetchGithubDocsFolder(framework, spec.githubDocs.repo, spec.githubDocs.path)));
  }

  return { chunks, sources: [...new Set(sources)] };
}

export async function buildDocsIndex(): Promise<DocsIndex> {
  const seedIndex = readJsonFile<DocsIndex>("seed-fallback.json");
  const allChunks: DocChunk[] = [];
  const frameworks: DocsIndex["frameworks"] = {};

  for (const framework of Object.keys(SOURCES) as FrameworkId[]) {
    process.stdout.write(`Indexing ${framework}...\n`);
    const live = await indexFramework(framework);
    const used = live.chunks.length > 0
      ? live.chunks
      : seedIndex.chunks.filter((c) => c.framework === framework);
    allChunks.push(...used);
    frameworks[framework] = {
      displayName: FRAMEWORK_META[framework].displayName,
      indexedAt: new Date().toISOString(),
      chunkCount: used.length,
      sources: live.sources.length ? live.sources : ["seed"],
    };
    process.stdout.write(`  ${used.length} chunks\n`);
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    frameworks,
    chunks: allChunks,
  };
}

export function writeDocsIndex(index: DocsIndex): { jsonPath: string; sqlitePath: string } {
  const seen = new Set<string>();
  const chunks = index.chunks.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
  const frameworks = { ...index.frameworks };
  for (const id of Object.keys(frameworks) as (keyof typeof frameworks)[]) {
    const meta = frameworks[id];
    if (meta) {
      meta.chunkCount = chunks.filter((c) => c.framework === id).length;
    }
  }
  const deduped: DocsIndex = { ...index, frameworks, chunks };
  const dir = dataDir();
  const jsonPath = path.join(dir, "docs-index.json");
  writeFileSync(jsonPath, `${JSON.stringify(deduped, null, 2)}\n`, "utf8");

  const sqlitePath = path.join(dir, "docs-index.sqlite");
  try {
    writeSqliteIndex(sqlitePath, deduped);
  } catch (err) {
    process.stderr.write(`SQLite export skipped: ${(err as Error).message}\n`);
  }
  return { jsonPath, sqlitePath };
}

function writeSqliteIndex(sqlitePath: string, index: DocsIndex): void {
  // node:sqlite ships with Node 22+. Optional — JSON is the runtime source of truth.
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (path: string) => {
      exec(sql: string): void;
      prepare(sql: string): { run: (...args: unknown[]) => void };
      close(): void;
    };
  };
  const db = new DatabaseSync(sqlitePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    DROP TABLE IF EXISTS chunks;
    CREATE TABLE chunks (
      id TEXT PRIMARY KEY,
      framework TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      heading_path TEXT NOT NULL,
      text TEXT NOT NULL,
      tokens INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX idx_chunks_framework ON chunks(framework);
  `);
  const insert = db.prepare(
    `INSERT OR REPLACE INTO chunks (id, framework, title, url, source, heading_path, text, tokens, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  db.exec("BEGIN");
  for (const c of index.chunks) {
    insert.run(c.id, c.framework, c.title, c.url, c.source, c.headingPath, c.text, c.tokens, c.updatedAt);
  }
  db.exec("COMMIT");
  db.close();
}
