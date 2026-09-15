import { searchFrameworkDocs } from "../src/services/search.js";
import { diagnoseFrameworkError, fetchLatestSyntax } from "../src/services/catalog.js";

const search = searchFrameworkDocs("langchain", "LCEL agent RAG");
const syntax = fetchLatestSyntax("llamaindex", "ollama");
const diag = diagnoseFrameworkError(
  "langchain",
  "ImportError: cannot import name LLMChain from langchain.chains\ninitialize_agent is deprecated",
);

console.log("search hits", search.hitCount, search.hits.map((h) => h.title).join(" | "));
console.log("syntax topic", syntax.topic, "snippets", syntax.snippets.length);
console.log("diagnose matched", diag.matched, diag.matches.map((m) => m.id).join(" | "));

if (search.hitCount < 1 || syntax.snippets.length < 1 || !diag.matched) {
  process.exit(1);
}
