import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FRAMEWORK_IDS, type FrameworkId } from "../types/index.js";
import { dataDir } from "./frameworks.js";

export type FrameworkToggles = Record<FrameworkId, boolean>;

const FILE = "framework-config.json";

const defaults = (): FrameworkToggles => ({
  langchain: true,
  llamaindex: true,
  ollama: true,
  xrpl: true,
});

let memory = defaults();
let loaded = false;

function filePath(): string {
  return path.join(dataDir(), FILE);
}

export function getFrameworkToggles(): FrameworkToggles {
  if (!loaded) {
    loaded = true;
    try {
      if (existsSync(filePath())) {
        const parsed = JSON.parse(readFileSync(filePath(), "utf8")) as Partial<FrameworkToggles>;
        memory = { ...defaults(), ...parsed };
      }
    } catch {
      memory = defaults();
    }
  }
  return { ...memory };
}

export function setFrameworkToggles(next: Partial<FrameworkToggles>): FrameworkToggles {
  const current = getFrameworkToggles();
  for (const id of FRAMEWORK_IDS) {
    if (typeof next[id] === "boolean") current[id] = next[id] as boolean;
  }
  memory = current;
  try {
    const dir = dataDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath(), `${JSON.stringify(memory, null, 2)}\n`, "utf8");
  } catch {
    /* keep in-memory */
  }
  return { ...memory };
}

export function enabledFrameworks(): FrameworkId[] {
  const toggles = getFrameworkToggles();
  return FRAMEWORK_IDS.filter((id) => toggles[id]);
}
