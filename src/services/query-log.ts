import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { stateDir } from "./frameworks.js";

export interface QueryLogEntry {
  at: string;
  framework: string;
  durationMs: number;
  tool?: string;
}

interface QueryLogFile {
  totalQueries: number;
  entries: QueryLogEntry[];
  updatedAt: string;
}

const FILE = "query-log.json";
const MAX = 100;

const empty = (): QueryLogFile => ({
  totalQueries: 0,
  entries: [],
  updatedAt: new Date().toISOString(),
});

let memory = empty();
let loaded = false;

function filePath(): string {
  return path.join(stateDir(), FILE);
}

function load(): QueryLogFile {
  if (loaded) return memory;
  loaded = true;
  try {
    if (existsSync(filePath())) {
      memory = { ...empty(), ...(JSON.parse(readFileSync(filePath(), "utf8")) as QueryLogFile) };
      memory.entries = Array.isArray(memory.entries) ? memory.entries.slice(0, MAX) : [];
    }
  } catch {
    memory = empty();
  }
  return memory;
}

function persist(): void {
  try {
    const dir = stateDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath(), `${JSON.stringify(memory, null, 2)}\n`, "utf8");
  } catch {
    /* ephemeral deploys keep in-memory logs */
  }
}

export function recordQuery(opts: { framework: string; durationMs: number; tool?: string }): void {
  load();
  memory.totalQueries += 1;
  memory.entries.unshift({
    at: new Date().toISOString(),
    framework: opts.framework,
    durationMs: Math.max(0, Math.round(opts.durationMs)),
    tool: opts.tool,
  });
  memory.entries = memory.entries.slice(0, MAX);
  memory.updatedAt = new Date().toISOString();
  persist();
}

export async function timedQuery<T>(
  framework: string,
  tool: string,
  fn: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    return await fn();
  } finally {
    recordQuery({ framework, tool, durationMs: Date.now() - started });
  }
}

export function getQueryLog(): QueryLogFile {
  loaded = false;
  return structuredClone(load());
}
