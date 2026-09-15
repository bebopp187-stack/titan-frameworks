# Titan Frameworks

MCP server that indexes and serves **token-efficient** docs for fast-moving AI libraries — LangChain, LlamaIndex, Ollama, and **XRPL (xrpl.js / xrpl-py)**.

Agents get three tools:

| Tool | Purpose |
| --- | --- |
| `search_ai_framework_docs` | Keyword search over local Markdown chunks |
| `fetch_latest_syntax` | Working snippets, imports, migration notes |
| `diagnose_framework_error` | Stack-trace → deprecated API → exact fix |

HTTP `/mcp` can be gated with **x402** at **$0.001 USDC on Base**. Discovery file: [`llms.txt`](./llms.txt).

## Run locally (stdio — Cursor / Claude Desktop)

```bash
cd titan-frameworks
npm install
npm run dev
```

Point Cursor at this folder. Project config is already in `.cursor/mcp.json`. For a global install, add to MCP settings:

```json
{
  "mcpServers": {
    "titan-frameworks": {
      "command": "npx",
      "args": ["tsx", "src/index.ts"],
      "cwd": "C:/Users/bebop/Projects/titan-frameworks"
    }
  }
}
```

Seed docs ship in `src/data/seed-fallback.json`, so tools work before the first scrape.

## Refresh official docs

```bash
npm run index-docs
```

Fetches `llms.txt` / GitHub Markdown / release notes, strips HTML chrome, chunks to JSON (`src/data/docs-index.json`) and SQLite (`src/data/docs-index.sqlite` on Node 22+). Optional `GITHUB_TOKEN` in `.env` raises GitHub API limits.

## HTTP mode (Vercel / Railway)

```bash
npm run dev:http
# POST http://127.0.0.1:3333/mcp
```

| Path | Notes |
| --- | --- |
| `GET /health` | liveness + index stats |
| `GET /llms.txt` | agent discovery |
| `GET /tools` | tool list + pricing |
| `GET /.well-known/x402.json` | payment requirements |
| `ALL /mcp` | Streamable HTTP MCP |

Production:

```bash
npm run build
npm start
```

Railway uses `railway.toml` (`npm run start`). Vercel rewrites to `api/index.ts`.

## x402 micropayments

Default is **off**. To mock-gate HTTP tool calls:

```bash
set X402_ENABLED=true
set X402_PAY_TO=0x584c004037bc369b3b49bd18381a5a6d0c1c1215
npm run dev:http
```

Requests to `/mcp` without `X-PAYMENT` / `PAYMENT-SIGNATURE` / `X-Payment-Signature` return **402** and an `accepts[]` body covering Base USDC **and** XRPL (`XRP` drops + `RLUSD`). Production uses **Base mainnet** USDC (`eip155:8453`, PayAI facilitator) and **XRPL mainnet** (`xrpl:0`, T54 facilitator).

Set `X402_USDC_LIVE=true` so USDC proofs are verified and settled through PayAI (`https://facilitator.payai.network`) before `/mcp` is served. Set `X402_XRPL_LIVE=true` for XRP/RLUSD via T54. A raw USDC transfer is not an x402 proof — clients must retry `/mcp` with `PAYMENT-SIGNATURE`. Admin UI: `GET /admin` (includes **Total XRP Earned** and **Total USDC Earned**).

## Layout

```
src/tools/         MCP tool handlers
src/mcp/tools.ts   tool registration (includes xrpl)
src/indexer/       xrpl.js crawl targets
src/middleware/    x402 (Base USDC + XRPL/RLUSD)
src/dashboard/     admin UI
src/services/      search, indexer, store, x402, earnings
src/data/          JSON index, syntax catalog, known errors
src/types/         Zod schemas + TS types
scripts/           npm run index-docs
```
