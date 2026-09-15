import { FRAMEWORK_IDS, type KnownError, type ListDeprecationsOutput, type ListFrameworksOutput, type SyntaxEntry } from "../types/index.js";
import { FRAMEWORK_META, frameworkAliases, normalizeFramework, readJsonFile } from "./frameworks.js";

export function listSupportedFrameworks(): ListFrameworksOutput {
  const syntax = readJsonFile<SyntaxEntry[]>("syntax-catalog.json");
  const frameworks = FRAMEWORK_IDS.map((id) => {
    const topics = [...new Set(syntax.filter((e) => e.framework === id).flatMap((e) => e.topics))]
      .map((t) => t.trim())
      .filter(Boolean)
      .sort();
    const meta = FRAMEWORK_META[id];
    return {
      id,
      displayName: meta.displayName,
      homepage: meta.homepage,
      aliases: frameworkAliases(id),
      topics,
    };
  });
  return {
    count: frameworks.length,
    ids: [...FRAMEWORK_IDS],
    frameworks,
  };
}

export function listKnownDeprecations(framework?: string): ListDeprecationsOutput {
  const catalog = readJsonFile<KnownError[]>("known-errors.json");
  const id = framework?.trim() ? normalizeFramework(framework) : undefined;
  const rows = (id ? catalog.filter((e) => e.framework === id) : catalog).map((entry) => ({
    id: entry.id,
    framework: entry.framework,
    deprecated: entry.deprecated,
    replacement: entry.replacement,
    reason: entry.reason,
    fix: entry.fix,
  }));
  return {
    framework: id ?? "all",
    count: rows.length,
    deprecations: rows,
    hints: [
      "Catalog snapshot, not a stack-trace match. Use diagnose_framework_error when you have an error_log, or review_framework_code when you have source.",
    ],
  };
}
