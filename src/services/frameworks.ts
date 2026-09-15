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

export function dataDir(): string {
  return path.join(projectRoot(), "src", "data");
}

export function readJsonFile<T>(filename: string): T {
  const full = path.join(dataDir(), filename);
  return JSON.parse(readFileSync(full, "utf8")) as T;
}
