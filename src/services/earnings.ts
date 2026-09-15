import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "./frameworks.js";

export interface EarningsSnapshot {
  xrpDropsEarned: number;
  rlusdEarned: number;
  usdcAtomicEarned: number;
  settlements: number;
  mcpCalls: number;
  lastSettlement?: {
    asset: string;
    network: string;
    amount: string;
    at: string;
  };
  updatedAt: string;
}

const FILE = "earnings.json";

const empty = (): EarningsSnapshot => ({
  xrpDropsEarned: 0,
  rlusdEarned: 0,
  usdcAtomicEarned: 0,
  settlements: 0,
  mcpCalls: 0,
  updatedAt: new Date().toISOString(),
});

let memory = empty();
let loaded = false;

function filePath(): string {
  return path.join(dataDir(), FILE);
}

function load(): EarningsSnapshot {
  if (loaded) return memory;
  loaded = true;
  try {
    const full = filePath();
    if (existsSync(full)) {
      memory = { ...empty(), ...(JSON.parse(readFileSync(full, "utf8")) as EarningsSnapshot) };
    }
  } catch {
    memory = empty();
  }
  return memory;
}

function persist(): void {
  try {
    const dir = dataDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath(), `${JSON.stringify(memory, null, 2)}\n`, "utf8");
  } catch {
    /* read-only deploys keep in-memory stats */
  }
}

export function getEarnings(): EarningsSnapshot {
  loaded = false;
  return { ...load() };
}

export function recordMcpCall(): void {
  load();
  memory.mcpCalls += 1;
  memory.updatedAt = new Date().toISOString();
  persist();
}

export function recordSettlement(opts: {
  asset: "XRP" | "RLUSD" | "USDC";
  network: string;
  amount: string;
}): void {
  load();
  memory.settlements += 1;
  const n = Number(opts.amount) || 0;
  if (opts.asset === "XRP") memory.xrpDropsEarned += n;
  else if (opts.asset === "RLUSD") memory.rlusdEarned += n;
  else memory.usdcAtomicEarned += n;
  memory.lastSettlement = { ...opts, at: new Date().toISOString() };
  memory.updatedAt = memory.lastSettlement.at;
  persist();
}

export function xrpEarned(): number {
  return load().xrpDropsEarned / 1_000_000;
}

export function usdcEarned(): number {
  return load().usdcAtomicEarned / 1_000_000;
}
