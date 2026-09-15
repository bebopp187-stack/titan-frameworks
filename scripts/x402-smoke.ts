/**
 * Local x402 buyer smoke test. Reads keys from .env — never prints them.
 *
 *   npx tsx scripts/x402-smoke.ts --create
 *   npx tsx scripts/x402-smoke.ts --rail=xrpl --pay
 *   npx tsx scripts/x402-smoke.ts --rail=usdc --pay
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet } from "xrpl";
import { x402Purchase } from "x402-xrpl";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_PATH = path.join(ROOT, ".env");
const DEFAULT_URL = "https://titan-frameworks-production.up.railway.app/mcp";
const XRPL_WS = "wss://xrplcluster.com";

const MCP_INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "titan-x402-smoke", version: "0" },
  },
};

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

function envHas(file: string, key: string): boolean {
  if (!existsSync(file)) return false;
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .some((line) => line.trim().startsWith(`${key}=`));
}

function appendSecret(key: string, value: string): void {
  const prefix = existsSync(ENV_PATH) && !readFileSync(ENV_PATH, "utf8").endsWith("\n") ? "\n" : "";
  appendFileSync(ENV_PATH, `${prefix}${key}=${value}\n`, "utf8");
  process.env[key] = value;
}

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  if (hit === `--${name}`) return "true";
  return hit.slice(name.length + 3);
}

function mcpUrl(): string {
  return (arg("url") || process.env.X402_SMOKE_URL || DEFAULT_URL).replace(/\/$/, "");
}

function rail(): "xrpl" | "usdc" | "both" {
  const raw = (arg("rail") || "xrpl").toLowerCase();
  if (raw === "usdc" || raw === "both") return raw;
  return "xrpl";
}

function xrplAddressFromEnv(): string | undefined {
  const seed = process.env.XRPL_SEED?.trim();
  if (!seed) return undefined;
  return Wallet.fromSeed(seed).address;
}

function evmAddressFromEnv(): string | undefined {
  const key = process.env.EVM_PRIVATE_KEY?.trim();
  if (!key) return undefined;
  const hex = (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
  return privateKeyToAccount(hex).address;
}

async function createWallets(): Promise<void> {
  if (!envHas(ENV_PATH, "XRPL_SEED") && !process.env.XRPL_SEED) {
    const wallet = Wallet.generate();
    appendSecret("XRPL_SEED", wallet.seed!);
    console.log("Created XRPL buyer wallet (seed written to .env, not shown here).");
  }
  if (!envHas(ENV_PATH, "EVM_PRIVATE_KEY") && !process.env.EVM_PRIVATE_KEY) {
    appendSecret("EVM_PRIVATE_KEY", generatePrivateKey());
    console.log("Created Base buyer wallet (key written to .env, not shown here).");
  }
}

function printFundInstructions(): void {
  const xrpl = xrplAddressFromEnv();
  const evm = evmAddressFromEnv();
  console.log("Buyer addresses (send funds here, not to the merchant):");
  if (xrpl) {
    console.log(`  XRPL mainnet  ${xrpl}`);
    console.log("    Send ~0.5 XRP (one call is 1000 drops + a small fee).");
  } else {
    console.log("  XRPL  missing XRPL_SEED — run with --create");
  }
  if (evm) {
    console.log(`  Base USDC     ${evm}`);
    console.log("    Send ~$0.05 USDC on Base (one call is $0.001).");
  } else {
    console.log("  Base  missing EVM_PRIVATE_KEY — run with --create");
  }
  console.log("Merchant (already live, do not send a raw transfer for x402):");
  console.log("  XRP   rkpckEddjHhS2vvg7sR3Gb3BX3CVzE2kb");
  console.log("  USDC  0x584c004037bc369b3b49bd18381a5a6d0c1c1215");
}

async function payXrpl(url: string): Promise<void> {
  const seed = process.env.XRPL_SEED?.trim();
  if (!seed) throw new Error("XRPL_SEED is not set. Run --create first.");
  const wallet = Wallet.fromSeed(seed);
  console.log(`XRPL pay from ${wallet.address} → ${url}`);
  const result = await x402Purchase({
    wallet,
    network: "xrpl:0",
    wsUrl: XRPL_WS,
    schemeFilter: "exact",
    url,
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(MCP_INIT),
  });
  console.log("XRPL result:", result.status, result.transaction ?? "", result.reason ?? "");
  const res = result.response;
  if (res) {
    console.log("HTTP", res.status, res.headers.get("x-payment-response") ?? "");
    console.log(await res.text());
  }
  if (result.status !== "success" && res?.status !== 200) {
    throw new Error("XRPL x402 call did not settle");
  }
}

async function payUsdc(url: string): Promise<void> {
  const raw = process.env.EVM_PRIVATE_KEY?.trim();
  if (!raw) throw new Error("EVM_PRIVATE_KEY is not set. Run --create first.");
  const key = (raw.startsWith("0x") ? raw : `0x${raw}`) as `0x${string}`;
  const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
  const { ExactEvmScheme } = await import("@x402/evm/exact/client");
  const account = privateKeyToAccount(key);
  console.log(`USDC pay from ${account.address} → ${url}`);
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(account));
  const fetchPaid = wrapFetchWithPayment(fetch, client);
  const res = await fetchPaid(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(MCP_INIT),
  });
  console.log("HTTP", res.status, res.headers.get("x-payment-response") ?? res.headers.get("payment-response") ?? "");
  console.log(await res.text());
  if (res.status === 402) throw new Error("USDC x402 call still returned 402");
}

async function main(): Promise<void> {
  loadDotEnv(ENV_PATH);
  const create = Boolean(arg("create"));
  const pay = Boolean(arg("pay"));
  const chosen = rail();
  const url = mcpUrl();

  if (create) await createWallets();
  loadDotEnv(ENV_PATH);
  printFundInstructions();

  if (!pay) {
    console.log("\nNo payment sent. After the buyer wallets are funded:");
    console.log("  npm run x402-smoke -- --rail=xrpl --pay");
    console.log("  npm run x402-smoke -- --rail=usdc --pay");
    return;
  }

  console.log(`\nSpending real mainnet funds on ${url} (${chosen})`);
  if (chosen === "xrpl" || chosen === "both") await payXrpl(url);
  if (chosen === "usdc" || chosen === "both") await payUsdc(url);
  console.log("Check /admin Estimated Revenue after this call.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : "x402 smoke failed");
  process.exit(1);
});
