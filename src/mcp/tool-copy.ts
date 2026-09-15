/** Agent-facing copy for MCP tools. Glama TDQS and Smithery both read this. */

export const SEARCH_DOCS_DESCRIPTION =
  "Keyword search over a local Markdown index for langchain, llamaindex, ollama, or xrpl; returns compact chunks and never live-crawls. Use for concepts, symbols, or questions; hitCount 0 means no match — shorten the query. Do not use for stack traces (diagnose_framework_error) or copy-paste current syntax (fetch_latest_syntax). Paid tools/call: $0.001 USDC or 1000 drops XRP.";

export const FETCH_SYNTAX_DESCRIPTION =
  "Curated working imports, snippets, and migration notes for one topic (agents, rag, wallet, payment, trustlines, …). Use when writing or migrating code; unknown topics fall back to related doc chunks instead of failing. Prefer search_ai_framework_docs for open-ended lookup and diagnose_framework_error for exceptions. Paid tools/call: $0.001 USDC or 1000 drops XRP; read-only catalog.";

export const DIAGNOSE_ERROR_DESCRIPTION =
  "Match a stack trace or exception against known deprecated APIs for langchain, llamaindex, ollama, or xrpl and return the replacement plus a fix. Use only when you have an error_log; matched=false means no catalog hit — then search_ai_framework_docs with the failing symbol. Not for happy-path syntax (fetch_latest_syntax). Paid tools/call: $0.001 USDC or 1000 drops XRP; read-only, does not execute code.";
