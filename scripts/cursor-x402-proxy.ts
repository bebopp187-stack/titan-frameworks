/**
 * Stdio MCP proxy for Cursor. Forwards to production /mcp and signs x402 USDC
 * on tools/call. Handshake stays free. Never prints keys.
 *
 *   npx tsx scripts/cursor-x402-proxy.ts --check
 *   Cursor: titan-frameworks-paid in .cursor/mcp.json
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { wrapFetchWithPaymentFromConfig } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env");
const DEFAULT_URL = "https://titan-frameworks-production.up.railway.app/mcp";

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function paidFetch(account: ReturnType<typeof privateKeyToAccount>) {
  return wrapFetchWithPaymentFromConfig(globalThis.fetch.bind(globalThis), {
    schemes: [
      {
        network: "eip155:8453",
        client: new ExactEvmScheme(account),
      },
    ],
  });
}

async function main(): Promise<void> {
  loadDotEnv(ENV_PATH);
  const raw = process.env.EVM_PRIVATE_KEY?.trim();
  if (!raw) {
    throw new Error("EVM_PRIVATE_KEY is not set. Run `npm run x402-smoke -- --create` and fund the Base wallet.");
  }
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  const account = privateKeyToAccount(key);
  const url = (process.env.X402_PROXY_URL || DEFAULT_URL).replace(/\/$/, "");
  const maxCalls = Math.max(1, Number(process.env.X402_PROXY_MAX_CALLS ?? 25) || 25);
  const check = process.argv.includes("--check");

  const remote = new Client({ name: "titan-cursor-proxy", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    fetch: paidFetch(account),
    requestInit: {
      headers: {
        Accept: "application/json, text/event-stream",
      },
    },
  });
  await remote.connect(transport);
  const listed = await remote.listTools();
  console.error(
    `Titan paid proxy → ${url} as ${account.address} (max ${maxCalls} paid tools/call). Tools: ${listed.tools.map((t) => t.name).join(", ")}`,
  );

  if (check) {
    await remote.close();
    return;
  }

  let paidCalls = 0;
  const server = new Server(
    { name: "titan-frameworks-paid", version: "1.0.0", title: "Titan Frameworks (paid)" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => remote.listTools());
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (paidCalls >= maxCalls) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: `x402 proxy budget reached (${maxCalls} paid tools/call this session). Restart the MCP server to reset.`,
          },
        ],
      };
    }
    const result = await remote.callTool(request.params);
    paidCalls += 1;
    console.error(`x402 tools/call ${paidCalls}/${maxCalls}: ${request.params.name}`);
    return result;
  });

  const stdio = new StdioServerTransport();
  await server.connect(stdio);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
