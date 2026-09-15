/**
 * Paid tools/call sweep against production. Signs Base USDC from EVM_PRIVATE_KEY.
 * Never prints keys. Spends $0.001 USDC per tool.
 *
 *   npx tsx scripts/paid-tools-smoke.ts
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { privateKeyToAccount } from "viem/accounts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env");
const DEFAULT_URL = "https://titan-frameworks-production.up.railway.app/mcp";

const STALE = `from langchain.chains import LLMChain
from langchain.agents import initialize_agent
chain = LLMChain(llm=llm, prompt=prompt)
agent = initialize_agent(tools, llm)
`;

type Case = {
  name: string;
  arguments: Record<string, unknown>;
  ok: (payload: Record<string, unknown>) => string | null;
};

const CASES: Case[] = [
  {
    name: "search_ai_framework_docs",
    arguments: { framework: "langchain", query: "LCEL agent RAG" },
    ok: (p) => (Number(p.hitCount) >= 1 ? null : `hitCount=${String(p.hitCount)}`),
  },
  {
    name: "fetch_latest_syntax",
    arguments: { framework: "llamaindex", topic: "ollama" },
    ok: (p) => (Array.isArray(p.snippets) && p.snippets.length >= 1 ? null : "no snippets"),
  },
  {
    name: "diagnose_framework_error",
    arguments: {
      framework: "langchain",
      error_log: "ImportError: cannot import name LLMChain from langchain.chains\ninitialize_agent is deprecated",
    },
    ok: (p) => (p.matched === true ? null : "matched=false"),
  },
  {
    name: "review_framework_code",
    arguments: { framework: "langchain", code: STALE, filename: "legacy.py" },
    ok: (p) => (p.matched === true && Number(p.issueCount) >= 1 ? null : `matched=${String(p.matched)} issues=${String(p.issueCount)}`),
  },
  {
    name: "rewrite_framework_code",
    arguments: { framework: "langchain", code: STALE, filename: "legacy.py" },
    ok: (p) => (p.changed === true ? null : "changed=false"),
  },
  {
    name: "resolve_symbol",
    arguments: { framework: "langchain", symbol: "ChatOpenAI" },
    ok: (p) => (p.matched === true && String(p.package).includes("openai") ? null : `matched=${String(p.matched)} pkg=${String(p.package)}`),
  },
  {
    name: "fetch_working_example",
    arguments: { framework: "langchain", goal: "agent", language: "python" },
    ok: (p) => (p.matched === true && String(p.code).includes("create_agent") ? null : `matched=${String(p.matched)} id=${String(p.id)}`),
  },
  {
    name: "draft_xrpl_intent_tx",
    arguments: { intent: "payment", language: "typescript" },
    ok: (p) =>
      p.matched === true && p.submits === false && p.movesFunds === false
        ? null
        : `matched=${String(p.matched)} submits=${String(p.submits)}`,
  },
  {
    name: "list_supported_frameworks",
    arguments: {},
    ok: (p) => (Number(p.count) === 4 && Array.isArray(p.ids) && (p.ids as unknown[]).includes("xrpl") ? null : `count=${String(p.count)}`),
  },
  {
    name: "list_known_deprecations",
    arguments: { framework: "langchain" },
    ok: (p) => (Number(p.count) >= 1 && p.framework === "langchain" ? null : `count=${String(p.count)}`),
  },
];

function loadDotEnv(file: string): void {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function mcpUrl(): string {
  return (process.env.X402_SMOKE_URL || DEFAULT_URL).replace(/\/$/, "");
}

function preview(value: unknown, max = 220): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function payloadFromRpc(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") return { _raw: body };
  const rec = body as Record<string, unknown>;
  if (rec.error && typeof rec.error === "object") {
    return { _rpcError: rec.error };
  }
  const result = rec.result;
  if (!result || typeof result !== "object") return rec;
  const tool = result as Record<string, unknown>;
  if (tool.structuredContent && typeof tool.structuredContent === "object") {
    return tool.structuredContent as Record<string, unknown>;
  }
  const content = tool.content;
  if (Array.isArray(content) && content[0] && typeof content[0] === "object") {
    const text = (content[0] as { text?: string }).text;
    if (text) {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { text };
      }
    }
  }
  return tool;
}

async function main(): Promise<void> {
  loadDotEnv(ENV_PATH);
  const raw = process.env.EVM_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("EVM_PRIVATE_KEY is not set.");
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
  const { ExactEvmScheme } = await import("@x402/evm/exact/client");
  const account = privateKeyToAccount(key);
  const url = mcpUrl();
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(account));
  const fetchPaid = wrapFetchWithPayment(fetch, client);
  const headers = { "content-type": "application/json", accept: "application/json, text/event-stream" };

  console.log(`Buyer ${account.address}`);
  console.log(`POST ${url} — ${CASES.length} paid tools/call @ $0.001 USDC each`);

  let failed = 0;
  for (const test of CASES) {
    const started = Date.now();
    process.stdout.write(`\n→ ${test.name} … `);
    try {
      const res = await fetchPaid(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "tools/call",
          params: { name: test.name, arguments: test.arguments },
        }),
      });
      const settled = res.headers.get("x-payment-response") ?? res.headers.get("payment-response") ?? "";
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* SSE or plain text */
      }
      const payload = payloadFromRpc(parsed);
      const ms = Date.now() - started;
      if (res.status === 402) {
        console.log(`FAIL HTTP 402 unpaid (${ms}ms)`);
        failed += 1;
        continue;
      }
      if (!settled) {
        console.log(`FAIL HTTP ${res.status} no payment receipt (${ms}ms)`);
        failed += 1;
        continue;
      }
      if (res.status !== 200) {
        console.log(`FAIL HTTP ${res.status} (${ms}ms) ${preview(text)}`);
        failed += 1;
        continue;
      }
      if ("_rpcError" in payload) {
        console.log(`FAIL rpc error (${ms}ms) ${preview(payload._rpcError)}`);
        failed += 1;
        continue;
      }
      if (payload.isError === true || payload.error) {
        console.log(`FAIL tool error (${ms}ms) ${preview(payload.error ?? payload)}`);
        failed += 1;
        continue;
      }
      const reason = test.ok(payload);
      if (reason) {
        console.log(`FAIL payload (${ms}ms) ${reason} ${preview(payload)}`);
        failed += 1;
        continue;
      }
      console.log(`ok HTTP ${res.status} paid (${ms}ms) ${preview(payload)}`);
    } catch (err) {
      console.log(`FAIL ${err instanceof Error ? err.message : String(err)}`);
      failed += 1;
    }
  }

  console.log(`\n${CASES.length - failed}/${CASES.length} tools settled and returned a valid payload.`);
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "paid tools smoke failed");
  process.exit(1);
});
