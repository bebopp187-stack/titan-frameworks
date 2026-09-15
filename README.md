# Titan Frameworks

MCP server that indexes and serves **token-efficient** docs for LangChain, LlamaIndex, Ollama, and **XRPL (xrpl.js / xrpl-py)**.

**Live Streamable HTTP:** `https://titan-frameworks-production.up.railway.app/mcp`  
Paid with **x402**: **$0.001 USDC on Base** or **1000 drops XRP / 0.001 RLUSD** on XRPL mainnet.

Agent discovery: [`llms.txt`](https://titan-frameworks-production.up.railway.app/llms.txt) · Smithery `smithery.yaml` · MCP Registry `server.json`

## Tools

| Tool | Purpose |
| --- | --- |
| `search_ai_framework_docs` | Keyword search over local Markdown chunks |
| `fetch_latest_syntax` | Working snippets, imports, migration notes |
| `diagnose_framework_error` | Stack-trace → deprecated API → exact fix |

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

x402-capable clients send `PAYMENT-SIGNATURE` / `X-PAYMENT` after a 402. Local stdio (Cursor folder / `npm run dev`) does not charge.

## HTTP endpoints

| Path | Notes |
| --- | --- |
| `GET /health` | liveness + index stats |
| `GET /llms.txt` | agent discovery |
| `GET /tools` | tool list + live pricing |
| `GET /.well-known/x402` | x402scan resource index |
| `GET /.well-known/x402.json` | full payment requirements + bazaar metadata |
| `GET /.well-known/mcp/server-card.json` | Smithery static card |
| `ALL /mcp` | Streamable HTTP MCP (paid in production) |

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

Production billing is **on**. Missing payment headers on `/mcp` return **402** with `accepts[]` for Base USDC (`eip155:8453`, PayAI) and XRPL (`xrpl:0`, T54). A raw USDC transfer is not an x402 proof — clients retry `/mcp` with `PAYMENT-SIGNATURE`.

| Flag | Effect |
| --- | --- |
| `X402_ENABLED=true` | Gate `/mcp` |
| `X402_USDC_LIVE=true` | Verify/settle USDC through PayAI |
| `X402_XRPL_LIVE=true` | Verify/settle XRP/RLUSD through T54 |
| `X402_PAY_TO` | Base USDC payee (default merchant address in repo docs) |

Local mock: set `X402_ENABLED=true` without the live flags.

## Private admin (`/admin`)

Password-gated dashboard at `/admin`. Set `ADMIN_SECRET_KEY`. Unauthenticated API requests receive 401. Do not publish this URL.

## Layout

```
src/app/           Next.js admin UI + /api/admin routes
src/components/    Admin dashboard React components
src/tools/         MCP tool handlers
src/mcp/tools.ts   tool registration (includes xrpl)
src/indexer/       xrpl.js crawl targets
src/services/      search, indexer, store, x402, earnings, discovery
src/data/          JSON index, syntax catalog, known errors
src/types/         Zod schemas + TS types
scripts/           index-docs, x402-smoke
server.json        MCP Registry remote listing
smithery.yaml      Smithery remote listing
glama.json         Glama maintainer claim
```
