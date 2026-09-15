# Titan Frameworks

Paid MCP that **reviews and rewrites** LangChain, LlamaIndex, Ollama, and **XRPL** code against current APIs — plus runnable examples, import lookup, and tx skeletons that never submit. Live docs are still included.

**Live Streamable HTTP:** `https://titan-frameworks-production.up.railway.app/mcp`  
Paid with **x402**: **$0.001 USDC on Base** or **1000 drops XRP / 0.001 RLUSD** on XRPL mainnet.

Agent discovery: [`llms.txt`](https://titan-frameworks-production.up.railway.app/llms.txt) · Smithery `smithery.yaml` · MCP Registry `server.json`

## Tools

| Tool | Purpose |
| --- | --- |
| `search_ai_framework_docs` | Keyword search over local Markdown. Use for concepts/symbols; not stack traces |
| `fetch_latest_syntax` | Working snippets and migration notes for one topic. Use when writing a fragment |
| `diagnose_framework_error` | Stack-trace → deprecated API → exact fix. Use only when you have an error |
| `review_framework_code` | Lint a snippet for dead APIs before it crashes. Returns hunks, does not execute |
| `rewrite_framework_code` | Apply conservative catalog rewrites; leftover lists unsafe call sites |
| `resolve_symbol` | Package, install, import, and call shape for one API name |
| `fetch_working_example` | Complete runnable file for a goal (agent, rag, payment, …) |
| `draft_xrpl_intent_tx` | Typed XRPL tx skeleton. Never submits or moves funds |

Pick one: stack trace → `diagnose_framework_error`; source about to run → `review_framework_code`; need a patched file → `rewrite_framework_code`; know the symbol → `resolve_symbol`; need a full file → `fetch_working_example`; topic fragment → `fetch_latest_syntax`; concept → `search_ai_framework_docs`; XRPL tx → `draft_xrpl_intent_tx`.

## Connect a client

```json
{
  "mcpServers": {
    "titan-frameworks": {
      "url": "https://titan-frameworks-production.up.railway.app/mcp"
    }
  }
}
```

x402-capable clients send `PAYMENT-SIGNATURE` / `X-PAYMENT` after a 402. Local stdio (`titan-frameworks` / `npm run dev`) does not charge.

To pay production from Cursor, enable **titan-frameworks-paid** in MCP settings (runs `scripts/cursor-x402-proxy.ts`, signs Base USDC from `EVM_PRIVATE_KEY` in `.env`, cap `X402_PROXY_MAX_CALLS` default 25). Check the proxy with `npx tsx scripts/cursor-x402-proxy.ts --check`.

## HTTP endpoints

| Path | Notes |
| --- | --- |
| `GET /health` | liveness + index stats |
| `GET /llms.txt` | agent discovery |
| `GET /tools` | tool list + live pricing |
| `GET /.well-known/x402` | x402scan resource index |
| `GET /.well-known/x402.json` | full payment requirements + bazaar metadata |
| `GET /.well-known/mcp/server-card.json` | Smithery static card |
| `ALL /mcp` | Streamable HTTP MCP. Handshake/`tools/list` free; `tools/call` paid |

## Run locally (stdio)

```bash
cd titan-frameworks
npm install
npm run dev
```

Project config is in `.cursor/mcp.json`. Seed docs ship in `src/data/seed-fallback.json`.

```bash
npm run index-docs
```

Production re-indexes automatically when the live index is older than 24 hours. `/admin` can still trigger a crawl immediately.

## HTTP mode (Vercel / Railway)

```bash
npm run dev:http
# POST http://127.0.0.1:3333/mcp
```

```bash
npm run build
npm start
```

Railway uses `railway.toml` (`npm run start`). Vercel rewrites to `api/index.ts`.

## x402 micropayments

**Production billing is on.** Unpaid `tools/call` on `POST https://titan-frameworks-production.up.railway.app/mcp` returns **402**. `initialize`, `ping`, and `tools/list` are free so directories can health-check the connector.

| Rail | Price | Network | Facilitator |
| --- | --- | --- | --- |
| USDC | **$0.001** | Base (`eip155:8453`) | PayAI |
| XRP | **1000 drops** (0.001 XRP) | XRPL mainnet (`xrpl:0`) | T54 |
| RLUSD | **0.001** | XRPL mainnet (`xrpl:0`) | T54 |

A raw wallet transfer is not an x402 proof. Clients retry `/mcp` with `PAYMENT-SIGNATURE` / `X-PAYMENT`. Local stdio (`npm run dev`) does not charge.

To reproduce the gate locally: `X402_ENABLED=true` (mock) plus `X402_USDC_LIVE=true` / `X402_XRPL_LIVE=true` for live verify/settle.

## Password-gated admin

Production dashboard: `https://titan-frameworks-production.up.railway.app/admin`

It is **not** a public stats page. Login is a password checked against `ADMIN_SECRET_KEY`. Unauthenticated `/api/admin/*` calls return **401**. The old public `/admin/api/stats` route is gone (**404**).

## Layout

```
src/app/           Next.js admin UI + /api/admin routes
src/components/    Admin dashboard React components
src/tools/         MCP tool handlers
src/mcp/tools.ts   tool registration (includes xrpl)
src/indexer/       xrpl.js crawl targets
src/services/      search, indexer, store, x402, earnings, discovery
src/data/          JSON index, syntax catalog, known errors, symbol map, examples, XRPL intents
src/types/         Zod schemas + TS types
scripts/           index-docs, x402-smoke
server.json        MCP Registry remote listing
smithery.yaml      Smithery remote listing
glama.json         Glama maintainer claim
```
