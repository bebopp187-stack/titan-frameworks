import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { FRAMEWORK_IDS, type FrameworkId } from "../types/index.js";

const ALIASES: Record<string, FrameworkId> = {
  langchain: "langchain",
  "langchain-js": "langchain",
  "langchain-py": "langchain",
  langgraph: "langchain",
  llamaindex: "llamaindex",
  "llama-index": "llamaindex",
  llama_index: "llamaindex",
  llama: "llamaindex",
  ollama: "ollama",
  xrpl: "xrpl",
  "xrpl.js": "xrpl",
  xrpljs: "xrpl",
  "xrpl-js": "xrpl",
  "xrpl-py": "xrpl",
  xrplpy: "xrpl",
  ripple: "xrpl",
  "ripple-lib": "xrpl",
};

export const FRAMEWORK_META: Record<
  FrameworkId,
  { displayName: string; homepage: string }
> = {
  langchain: {
    displayName: "LangChain",
    homepage: "https://docs.langchain.com",
  },
  llamaindex: {
    displayName: "LlamaIndex",
    homepage: "https://docs.llamaindex.ai",
  },
  ollama: {
    displayName: "Ollama",
    homepage: "https://docs.ollama.com",
  },
  xrpl: {
    displayName: "XRPL (xrpl.js / xrpl-py)",
    homepage: "https://js.xrpl.org",
  },
};

export function normalizeFramework(value: string): FrameworkId {
  const key = value.trim().toLowerCase();
  const id = ALIASES[key];
  if (!id) {
    throw new Error(
      `Unknown framework "${value}". Use one of: ${FRAMEWORK_IDS.join(", ")}`,
    );
  }
  return id;
}

export function frameworkAliases(id: FrameworkId): string[] {
  return [...new Set(Object.entries(ALIASES).filter(([, value]) => value === id).map(([key]) => key))].sort();
}

export function projectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Packaged JSON shipped in git (docs index, catalogs, seed). */
export function packagedDataDir(): string {
  return path.join(projectRoot(), "src", "data");
}

/**
 * Writable runtime state (earnings, query log, live re-index).
 * Railway volume: DATA_DIR or RAILWAY_VOLUME_MOUNT_PATH (usually /data).
 */
export function stateDir(): string {
  const override = process.env.DATA_DIR?.trim() || process.env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (override) return path.resolve(override);
  return packagedDataDir();
}

export function dataDir(): string {
  return packagedDataDir();
}

export function readJsonFile<T>(filename: string): T {
  const full = path.join(packagedDataDir(), filename);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}
