import { readJsonFile } from "./frameworks.js";
import { searchFrameworkDocs } from "./search.js";
import type { FrameworkId, KnownError, DiagnoseOutput, SyntaxEntry, SyntaxOutput } from "../types/index.js";

export function fetchLatestSyntax(framework: FrameworkId, topic: string): SyntaxOutput {
  const catalog = readJsonFile<SyntaxEntry[]>("syntax-catalog.json");
  const q = topic.trim().toLowerCase();
  const ranked = catalog
    .filter((e) => e.framework === framework)
    .map((entry) => {
      const hay = [entry.id, ...entry.topics, entry.versionNote].join(" ").toLowerCase();
      let score = hay.includes(q) ? 5 : 0;
      for (const t of q.split(/\s+/)) {
        if (entry.topics.some((x) => x.includes(t))) score += 3;
        if (hay.includes(t)) score += 1;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.entry;
  const related = searchFrameworkDocs(framework, topic, 3);

  if (!best) {
    return {
      framework,
      topic,
      versionNote: "No curated snippet for that topic. Related doc chunks included.",
      imports: [],
      snippets: related.hits.slice(0, 2).map((h) => ({
        title: h.title,
        language: "markdown",
        code: h.chunk,
      })),
      migrationNotes: [],
      relatedDocs: related.hits.map((h) => ({ title: h.title, url: h.url })),
    };
  }

  return {
    framework,
    topic,
    versionNote: best.versionNote,
    imports: best.imports,
    snippets: best.snippets,
    migrationNotes: best.migrationNotes,
    relatedDocs: [
      ...best.relatedDocs,
      ...related.hits.map((h) => ({ title: h.title, url: h.url })),
    ].slice(0, 6),
  };
}

export function diagnoseFrameworkError(framework: FrameworkId, errorLog: string): DiagnoseOutput {
  const catalog = readJsonFile<KnownError[]>("known-errors.json");
  const hay = errorLog.toLowerCase();
  const matches = catalog
    .filter((e) => e.framework === framework)
    .map((entry) => {
      const hits = entry.patterns.filter((p) => hay.includes(p.toLowerCase()));
      const confidence = Math.min(1, hits.length / Math.max(1, Math.min(3, entry.patterns.length)));
      return {
        entry,
        hits,
        confidence: hits.length ? Number((0.35 + confidence * 0.65).toFixed(2)) : 0,
      };
    })
    .filter((row) => row.hits.length > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);

  const hints: string[] = [];
  if (/modulenotfounderror|cannot find module/i.test(errorLog)) {
    hints.push("Missing package — install the split partner package (langchain-openai, llama-index-llms-*, ollama).");
  }
  if (/deprecated/i.test(errorLog)) {
    hints.push("Treat deprecation warnings as breakages; APIs below were already removed in current majors.");
  }
  if (matches.length === 0) {
    hints.push("No catalog hit. Try search_ai_framework_docs with the failing symbol name.");
  }

  return {
    framework,
    matched: matches.length > 0,
    matches: matches.map(({ entry, hits, confidence }) => ({
      id: entry.id,
      deprecated: entry.deprecated,
      replacement: entry.replacement,
      confidence,
      reason: `${entry.reason} Matched: ${hits.join(", ")}.`,
      fix: entry.fix,
      snippet: entry.snippet,
    })),
    hints,
  };
}
