import { readJsonFile } from "./frameworks.js";
import type { XrplIntentEntry, XrplIntentOutput } from "../types/index.js";

function normLang(value?: string): "typescript" | "python" {
  const v = (value ?? "typescript").trim().toLowerCase();
  if (v === "py" || v === "python") return "python";
  return "typescript";
}

export function xrplIntentTx(intent: string, language?: string): XrplIntentOutput {
  const catalog = readJsonFile<XrplIntentEntry[]>("xrpl-intents.json");
  const q = intent.trim().toLowerCase();
  const lang = normLang(language);
  const entry = catalog.find(
    (e) => e.intent.toLowerCase() === q || e.aliases.some((a) => a.toLowerCase() === q),
  );

  if (!entry) {
    return {
      matched: false,
      intent: intent.trim(),
      transactionType: "",
      language: lang,
      requiredFields: [],
      failureCodes: [],
      notes: [],
      skeleton: "",
      submits: false,
      movesFunds: false,
      hints: [
        `Unknown intent. Use one of: ${catalog.map((e) => e.intent).join(", ")}.`,
        "This tool never submits or moves funds.",
      ],
    };
  }

  return {
    matched: true,
    intent: entry.intent,
    transactionType: entry.transactionType,
    language: lang,
    requiredFields: entry.requiredFields,
    failureCodes: entry.failureCodes,
    notes: [
      ...entry.notes,
      "Does not submit, sign, or connect a wallet. Autofill and submit on your own Client.",
    ],
    skeleton: entry.skeletons[lang],
    submits: false,
    movesFunds: false,
    hints: ["Typed skeleton only. Do not treat this as a broadcast transaction."],
  };
}
