/** Agent-facing copy for MCP tools. Glama TDQS and Smithery both read this. */

export const SERVER_DESCRIPTION =
  "Review and rewrite LangChain, LlamaIndex, Ollama, and XRPL code against current APIs, plus runnable examples, import lookup, and XRPL tx skeletons that never submit. Live docs included.";

export const SERVER_DESCRIPTION_PAID =
  `${SERVER_DESCRIPTION} $0.001 USDC on Base or 1000 drops XRP / 0.001 RLUSD.`;

export const AGENT_INSTRUCTIONS = `Titan Frameworks patches LangChain, LlamaIndex, Ollama, and XRPL code against current APIs. Results are catalog-backed, not LLM-guessed. HTTP tools/call is paid ($0.001 USDC or 1000 drops XRP) except list_supported_frameworks, which is free. initialize and tools/list are free.

Labeled prompts (prefer these over picking a tool): migrate_framework_code, diagnose_stack_trace, start_from_example.

Pick one tool:
- review_framework_code — source you are about to run
- rewrite_framework_code — review found hits; you want a patched file
- diagnose_framework_error — you have a stack trace
- resolve_symbol — you know the API name, not the package/import
- fetch_working_example — you need a complete runnable file
- fetch_latest_syntax — you need a topic fragment (agents, rag, payment, …)
- search_ai_framework_docs — open-ended concept or docs lookup
- draft_xrpl_intent_tx — XRPL Payment/TrustSet/RLUSD/channel skeleton; never submits
- list_supported_frameworks — you need the framework ids this server covers (free)
- list_known_deprecations — you want the deprecation catalog without a stack trace or snippet`;


export const SEARCH_DOCS_DESCRIPTION =
  "Keyword search over a local Markdown index for langchain, llamaindex, ollama, or xrpl; returns compact chunks and never live-crawls. Use for concepts, symbols, or questions; hitCount 0 means no match — shorten the query. Do not use for stack traces (diagnose_framework_error), import/package lookup (resolve_symbol), or copy-paste current syntax (fetch_latest_syntax). Paid tools/call: $0.001 USDC or 1000 drops XRP.";

export const FETCH_SYNTAX_DESCRIPTION =
  "Curated working imports, snippets, and migration notes for one topic (agents, rag, wallet, payment, trustlines, …). Use when writing or migrating a fragment; unknown topics fall back to related doc chunks instead of failing. Prefer fetch_working_example for a complete runnable file, search_ai_framework_docs for open-ended lookup, and diagnose_framework_error for exceptions. Paid tools/call: $0.001 USDC or 1000 drops XRP; read-only catalog.";

export const DIAGNOSE_ERROR_DESCRIPTION =
  "Match a stack trace or exception against known deprecated APIs for langchain, llamaindex, ollama, or xrpl and return the replacement plus a fix. Use only when you have an error_log; matched=false means no catalog hit — then search_ai_framework_docs with the failing symbol. Lint source before it crashes with review_framework_code. Not for happy-path syntax (fetch_latest_syntax). Paid tools/call: $0.001 USDC or 1000 drops XRP; read-only, does not execute code.";

export const REVIEW_CODE_DESCRIPTION =
  "Scan source against known dead APIs (LLMChain, initialize_agent, ServiceContext, ripple-lib, …) and return each hit with replacement plus a unified-diff hunk. Use before running agent-written code; diagnose_framework_error is for after a stack trace. Does not execute or submit. Paid tools/call: $0.001 USDC or 1000 drops XRP; catalog-backed, not LLM-invented.";

export const REWRITE_CODE_DESCRIPTION =
  "Apply conservative catalog rewrites (imports/identifiers) to a snippet and return the patched file plus a full unified diff. Use when review_framework_code found hits and you want an applyable file. Leftover lists unsafe call-site transforms (e.g. LLMChain(...)) that stay for a human/agent. Does not execute or submit. Paid tools/call: $0.001 USDC or 1000 drops XRP.";

export const RESOLVE_SYMBOL_DESCRIPTION =
  "Map an API name to the current package, install line, import, and call shape (ChatOpenAI, create_agent, VectorStoreIndex, xrpToDrops, …). Use when you know the symbol but not where it lives. Prefer search_ai_framework_docs for concepts and fetch_latest_syntax for topic snippets. Paid tools/call: $0.001 USDC or 1000 drops XRP; catalog-backed.";

export const WORKING_EXAMPLE_DESCRIPTION =
  "Fetch one complete runnable file (filename, install/run, source) for a goal such as agent, rag, chat, payment, or rlusd. Use when fetch_latest_syntax snippets are too small to execute. matched=false means no catalog example — then fetch_latest_syntax. Paid tools/call: $0.001 USDC or 1000 drops XRP; does not execute the example.";

export const XRPL_INTENT_TX_DESCRIPTION =
  "Draft a typed xrpl.js / xrpl-py skeleton for payment, trustline, rlusd, or channel, plus required fields and common tec/tem failure codes. Use when building an XRPL tx; never submits, signs, or moves funds. Prefer fetch_working_example for a full script and review_framework_code to lint Amount/address mistakes. Paid tools/call: $0.001 USDC or 1000 drops XRP.";

export const LIST_FRAMEWORKS_DESCRIPTION =
  "List the framework ids this server covers (langchain, llamaindex, ollama, xrpl) with display names, aliases, homepages, and catalog topics. Use when you do not know which framework string to pass. Free tools/call (no x402). Not a docs search (search_ai_framework_docs) and not a deprecation dump (list_known_deprecations). Catalog-backed.";

export const LIST_DEPRECATIONS_DESCRIPTION =
  "Return the known-deprecated API catalog (id, old API, replacement, fix) for one framework or all four at once. Use when you want the full deprecation list without a stack trace or source snippet. Prefer diagnose_framework_error when you have an error_log and review_framework_code when you have code. Paid tools/call: $0.001 USDC or 1000 drops XRP; catalog-backed, does not execute code.";
