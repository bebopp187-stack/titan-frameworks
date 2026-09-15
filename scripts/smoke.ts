import { searchFrameworkDocs } from "../src/services/search.js";
import { diagnoseFrameworkError, fetchLatestSyntax } from "../src/services/catalog.js";
import { reviewFrameworkCode, rewriteFrameworkCode } from "../src/services/code-review.js";
import { resolveSymbol } from "../src/services/symbols.js";
import { workingExample } from "../src/services/examples.js";
import { xrplIntentTx } from "../src/services/xrpl-intents.js";
import { MCP_PUBLIC_TOOLS } from "../src/services/discovery.js";

const search = searchFrameworkDocs("langchain", "LCEL agent RAG");
const syntax = fetchLatestSyntax("llamaindex", "ollama");
const diag = diagnoseFrameworkError(
  "langchain",
  "ImportError: cannot import name LLMChain from langchain.chains\ninitialize_agent is deprecated",
);

const xrplSearch = searchFrameworkDocs("xrpl", "PaymentChannel TrustSet RLUSD drops");
const xrplSyntax = fetchLatestSyntax("xrpl", "wallet");
const xrplDiag = diagnoseFrameworkError(
  "xrpl",
  "Cannot find module 'ripple-lib'\ntemBAD_AMOUNT Amount must be drops",
);

const stale = `from langchain.chains import LLMChain
from langchain.agents import initialize_agent
chain = LLMChain(llm=llm, prompt=prompt)
agent = initialize_agent(tools, llm)
`;
const review = reviewFrameworkCode("langchain", stale, "legacy.py");
const rewrite = rewriteFrameworkCode("langchain", stale, "legacy.py");
const cleanReview = reviewFrameworkCode(
  "langchain",
  "from langchain.agents import create_agent\nagent = create_agent(model, tools=[multiply])\n",
);
const symbol = resolveSymbol("langchain", "ChatOpenAI");
const missSymbol = resolveSymbol("langchain", "NotARealSymbol");
const example = workingExample("langchain", "agent", "python");
const ollamaExample = workingExample("ollama", "chat", "python");
const pay = xrplIntentTx("send xrp", "typescript");
const missIntent = xrplIntentTx("swap");
const rippleReview = reviewFrameworkCode("xrpl", 'import RippleAPI from "ripple-lib";\n');

console.log("search hits", search.hitCount, search.hits.map((h) => h.title).join(" | "));
console.log("syntax topic", syntax.topic, "snippets", syntax.snippets.length);
console.log("diagnose matched", diag.matched, diag.matches.map((m) => m.id).join(" | "));
console.log("xrpl search", xrplSearch.hitCount, xrplSearch.hits.map((h) => h.title).join(" | "));
console.log("xrpl syntax", xrplSyntax.snippets.length);
console.log("xrpl diagnose", xrplDiag.matched, xrplDiag.matches.map((m) => m.id).join(" | "));
console.log("review issues", review.issueCount, review.issues.map((i) => i.id).join(" | "));
console.log("rewrite applied", rewrite.applied.map((a) => a.id).join(" | "), "leftover", rewrite.leftover.map((l) => l.id).join(" | "));
console.log("resolve", symbol.matched, symbol.package);
console.log("example", example.matched, example.id);
console.log("xrpl intent", pay.matched, pay.transactionType, "submits", pay.submits);
console.log("public tools", MCP_PUBLIC_TOOLS.length, MCP_PUBLIC_TOOLS.map((t) => t.name).join(", "));

const failures: string[] = [];
if (search.hitCount < 1) failures.push("search");
if (syntax.snippets.length < 1) failures.push("syntax");
if (!diag.matched) failures.push("diagnose");
if (xrplSearch.hitCount < 1) failures.push("xrpl-search");
if (xrplSyntax.snippets.length < 1) failures.push("xrpl-syntax");
if (!xrplDiag.matched) failures.push("xrpl-diagnose");
if (!review.matched || review.issueCount < 2) failures.push("review-stale");
if (!review.issues.some((i) => i.hunk.includes("LLMChain") || i.id === "lc-llmchain")) failures.push("review-hunk");
if (cleanReview.matched) failures.push("review-clean");
if (!rewrite.changed || !rewrite.code.includes("create_agent") || rewrite.code.includes("initialize_agent")) {
  failures.push("rewrite-apply");
}
if (!rewrite.leftover.some((l) => l.id === "lc-llmchain")) failures.push("rewrite-leftover");
if (!rewrite.diff.includes("+++ b/legacy.py")) failures.push("rewrite-diff");
if (!symbol.matched || symbol.package !== "langchain-openai") failures.push("resolve-symbol");
if (missSymbol.matched) failures.push("resolve-miss");
if (!example.matched || !example.code.includes("create_agent") || !example.filename.endsWith(".py")) {
  failures.push("working-example");
}
if (!ollamaExample.matched || !ollamaExample.code.includes("ollama.chat")) failures.push("ollama-example");
if (!pay.matched || pay.transactionType !== "Payment" || pay.submits !== false || pay.movesFunds !== false) {
  failures.push("xrpl-intent");
}
if (pay.skeleton.includes("submitAndWait") && !pay.skeleton.includes("//")) failures.push("xrpl-intent-submit");
if (missIntent.matched) failures.push("xrpl-intent-miss");
if (!rippleReview.matched) failures.push("ripple-review");
if (MCP_PUBLIC_TOOLS.length !== 8) failures.push("public-tools-count");

if (failures.length > 0) {
  console.error("smoke failed:", failures.join(", "));
  process.exit(1);
}
