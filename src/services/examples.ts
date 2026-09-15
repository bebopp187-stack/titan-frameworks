import { readJsonFile } from "./frameworks.js";
import type { FrameworkId, WorkingExampleEntry, WorkingExampleOutput } from "../types/index.js";

function normLang(value?: string): string | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  if (v === "py" || v === "python") return "python";
  if (v === "ts" || v === "typescript" || v === "js" || v === "javascript") return "typescript";
  return v;
}

export function workingExample(
  framework: FrameworkId,
  goal: string,
  language?: string,
  runtime?: string,
): WorkingExampleOutput {
  const catalog = readJsonFile<WorkingExampleEntry[]>("working-examples.json").filter(
    (e) => e.framework === framework,
  );
  const q = goal.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  const wantLang = normLang(language);
  const wantRuntime = runtime?.trim().toLowerCase();

  const ranked = catalog
    .map((entry) => {
      const hay = [entry.id, ...entry.goals, entry.runtime, entry.language].join(" ").toLowerCase();
      let score = entry.goals.some((g) => g.toLowerCase() === q) ? 8 : hay.includes(q) ? 5 : 0;
      for (const t of tokens) {
        if (entry.goals.some((g) => g.toLowerCase().includes(t))) score += 3;
        if (hay.includes(t)) score += 1;
      }
      if (wantLang && entry.language.toLowerCase() === wantLang) score += 2;
      else if (wantLang) score -= 4;
      if (wantRuntime && entry.runtime.toLowerCase() === wantRuntime) score += 2;
      else if (wantRuntime) score -= 3;
      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.entry;
  if (!best) {
    return {
      framework,
      matched: false,
      id: "",
      filename: "",
      language: wantLang ?? "",
      runtime: wantRuntime ?? "",
      versions: [],
      run: "",
      code: "",
      goals: [],
      hints: [
        "No complete example for that goal. Try fetch_latest_syntax for a topic snippet, or shorten the goal (agent, rag, chat, payment).",
        `Available: ${catalog.map((e) => `${e.id} [${e.goals.join(", ")}]`).join("; ") || "(none)"}`,
      ],
    };
  }

  return {
    framework,
    matched: true,
    id: best.id,
    filename: best.filename,
    language: best.language,
    runtime: best.runtime,
    versions: best.versions,
    run: best.run,
    code: best.code,
    goals: best.goals,
    hints: ["Complete runnable file from the catalog. Not a topic fragment from fetch_latest_syntax."],
  };
}
