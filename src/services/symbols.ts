import { readJsonFile } from "./frameworks.js";
import type { FrameworkId, ResolveSymbolOutput, SymbolMapEntry } from "../types/index.js";

export function resolveSymbol(framework: FrameworkId, symbol: string): ResolveSymbolOutput {
  const catalog = readJsonFile<SymbolMapEntry[]>("symbol-map.json").filter((e) => e.framework === framework);
  const q = symbol.trim().toLowerCase();
  const ranked = catalog
    .map((entry) => {
      const names = [entry.symbol, ...entry.aliases].map((s) => s.toLowerCase());
      let score = 0;
      if (names.includes(q)) score = 10;
      else if (names.some((n) => n.includes(q) || q.includes(n))) score = 4;
      return { entry, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.symbol.localeCompare(b.entry.symbol));

  const best = ranked[0]?.entry;
  if (!best) {
    return {
      framework,
      matched: false,
      symbol: symbol.trim(),
      package: "",
      install: "",
      importLine: "",
      call: "",
      note: "",
      aliases: [],
      hints: [
        "No catalog hit for that symbol. Try search_ai_framework_docs with the same name, or fetch_latest_syntax for the topic.",
        `Known symbols: ${catalog.map((e) => e.symbol).join(", ") || "(none)"}`,
      ],
    };
  }

  return {
    framework,
    matched: true,
    symbol: best.symbol,
    package: best.package,
    install: best.install,
    importLine: best.importLine,
    call: best.call,
    note: best.note,
    aliases: best.aliases,
    hints: ["Catalog-backed import/package only. Not an LLM guess."],
  };
}
