import { readJsonFile } from "./frameworks.js";
import type {
  FrameworkId,
  KnownError,
  ReviewOutput,
  RewriteOutput,
} from "../types/index.js";

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function patternRegex(pattern: string): RegExp {
  if (IDENT.test(pattern)) {
    return new RegExp(`\\b${escapeRegExp(pattern)}\\b`, "g");
  }
  return new RegExp(escapeRegExp(pattern), "g");
}

function diffName(filename?: string): string {
  const raw = (filename ?? "snippet").replace(/\\/g, "/").split("/").pop()?.trim() || "snippet";
  return raw.slice(0, 80);
}

function commentPrefix(filename: string): string {
  return /\.(py|pyi)$/i.test(filename) ? "#" : "//";
}

function truncate(value: string, max = 200): string {
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function knownErrors(): KnownError[] {
  return readJsonFile<KnownError[]>("known-errors.json");
}

interface Occurrence {
  entry: KnownError;
  pattern: string;
  line: number;
  excerpt: string;
}

function scanOccurrences(framework: FrameworkId, code: string): Occurrence[] {
  const lines = code.split("\n");
  const hits: Occurrence[] = [];
  const seen = new Set<string>();

  for (const entry of knownErrors().filter((e) => e.framework === framework)) {
    const patterns = (entry.codePatterns ?? []).filter((p) => p.length > 0);
    for (const pattern of patterns) {
      const re = patternRegex(pattern);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? "";
        re.lastIndex = 0;
        if (!re.test(line)) continue;
        const key = `${entry.id}:${i + 1}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          entry,
          pattern,
          line: i + 1,
          excerpt: truncate(line),
        });
      }
    }
  }

  return hits.sort((a, b) => a.line - b.line || a.entry.id.localeCompare(b.entry.id));
}

function lineHunk(filename: string, lineNo: number, original: string, suggested: string): string {
  return [
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -${lineNo},1 +${lineNo},1 @@`,
    `-${original}`,
    `+${suggested}`,
  ].join("\n");
}

function suggestedLine(filename: string, line: string, entry: KnownError): string {
  const rewrite = (entry.rewrites ?? []).find((rw) => line.includes(rw.from));
  if (rewrite) return line.split(rewrite.from).join(rewrite.to);
  return `${line}  ${commentPrefix(filename)} ${entry.replacement}`;
}

export function unifiedDiff(before: string, after: string, filename: string): string {
  if (before === after) return "";
  const oldLines = before.split("\n");
  const newLines = after.split("\n");
  return [
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
    ...oldLines.map((line) => `-${line}`),
    ...newLines.map((line) => `+${line}`),
  ].join("\n");
}

export function reviewFrameworkCode(
  framework: FrameworkId,
  code: string,
  filename?: string,
): ReviewOutput {
  const file = diffName(filename);
  const sourceLines = code.split("\n");
  const hits = scanOccurrences(framework, code);
  const hints: string[] = [];

  if (hits.length === 0) {
    hints.push("No catalog hit in this snippet. Try resolve_symbol or fetch_latest_syntax.");
  } else {
    hints.push("Review is lint-before-crash. diagnose_framework_error is for stack traces after a failure.");
    if (hits.some((h) => (h.entry.rewrites ?? []).length === 0)) {
      hints.push("Some hits are review-only (no safe rewrite). Fix those call sites by hand.");
    }
  }

  return {
    framework,
    matched: hits.length > 0,
    issueCount: hits.length,
    issues: hits.map((hit) => {
      const original = sourceLines[hit.line - 1] ?? "";
      return {
        id: hit.entry.id,
        deprecated: hit.entry.deprecated,
        replacement: hit.entry.replacement,
        pattern: hit.pattern,
        line: hit.line,
        excerpt: hit.excerpt,
        reason: hit.entry.reason,
        fix: hit.entry.fix,
        hunk: lineHunk(file, hit.line, original, suggestedLine(file, original, hit.entry)),
      };
    }),
    hints,
  };
}

export function rewriteFrameworkCode(
  framework: FrameworkId,
  code: string,
  filename?: string,
): RewriteOutput {
  const file = diffName(filename);
  const catalog = knownErrors().filter((e) => e.framework === framework);
  const pairs = catalog
    .flatMap((entry) => (entry.rewrites ?? []).map((rw) => ({ id: entry.id, from: rw.from, to: rw.to })))
    .filter((rw) => rw.from.length > 0 && rw.from !== rw.to)
    .sort((a, b) => b.from.length - a.from.length);

  let next = code;
  const applied: RewriteOutput["applied"] = [];
  for (const rw of pairs) {
    if (!next.includes(rw.from)) continue;
    next = next.split(rw.from).join(rw.to);
    applied.push({ id: rw.id, from: rw.from, to: rw.to });
  }

  const leftoverHits = scanOccurrences(framework, next);
  const leftoverSeen = new Set<string>();
  const leftover: RewriteOutput["leftover"] = [];
  for (const hit of leftoverHits) {
    if (leftoverSeen.has(hit.entry.id)) continue;
    leftoverSeen.add(hit.entry.id);
    leftover.push({
      id: hit.entry.id,
      deprecated: hit.entry.deprecated,
      replacement: hit.entry.replacement,
      pattern: hit.pattern,
      reason: hit.entry.reason,
      fix: hit.entry.fix,
    });
  }

  const notes: string[] = [];
  if (applied.length === 0 && leftover.length === 0) {
    notes.push("No catalog rewrite applied. Snippet already matches current APIs, or the pattern is not in known-errors.json.");
  }
  if (leftover.length > 0) {
    notes.push(
      "Leftover hits are unsafe call-site transforms (e.g. LLMChain(...)). Apply those by hand or use fetch_working_example / fetch_latest_syntax.",
    );
  }

  return {
    framework,
    changed: next !== code,
    filename: file,
    code: next,
    diff: unifiedDiff(code, next, file),
    applied,
    leftover,
    notes,
  };
}
