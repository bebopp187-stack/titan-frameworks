import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadDocsIndex } from "./docs-store.js";
import { getIndexJob, startIndexJob, waitForIndexJob } from "./index-job.js";
import { stateDir } from "./frameworks.js";

const FILE = "index-schedule.json";
const TICK_MS = 15 * 60 * 1000;
const FIRST_DELAY_MS = 90_000;
const FAIL_BACKOFF_MS = 6 * 60 * 60 * 1000;

type ScheduleState = {
  lastAttemptAt?: string;
  lastError?: string;
};

function filePath(): string {
  return path.join(stateDir(), FILE);
}

function readState(): ScheduleState {
  try {
    if (!existsSync(filePath())) return {};
    return JSON.parse(readFileSync(filePath(), "utf8")) as ScheduleState;
  } catch {
    return {};
  }
}

function writeState(next: ScheduleState): void {
  try {
    const dir = stateDir();
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(filePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  } catch (err) {
    console.error("index-schedule write failed", (err as Error).message);
  }
}

export function indexScheduleEnabled(): boolean {
  const raw = process.env.INDEX_DOCS_SCHEDULE?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  return Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_ENVIRONMENT_NAME);
}

export function indexMaxAgeMs(): number {
  const hours = Number(process.env.INDEX_DOCS_MAX_AGE_HOURS ?? 24);
  const n = Number.isFinite(hours) && hours > 0 ? hours : 24;
  return n * 60 * 60 * 1000;
}

export function getIndexScheduleStatus() {
  const enabled = indexScheduleEnabled();
  const index = loadDocsIndex();
  const state = readState();
  const updatedAt = index.updatedAt;
  const ageMs = Date.now() - Date.parse(updatedAt);
  return {
    enabled,
    maxAgeHours: indexMaxAgeMs() / (60 * 60 * 1000),
    indexUpdatedAt: updatedAt,
    stale: Number.isFinite(ageMs) && ageMs >= indexMaxAgeMs(),
    lastAttemptAt: state.lastAttemptAt ?? null,
    lastError: state.lastError ?? null,
  };
}

function dueForRefresh(): boolean {
  if (!indexScheduleEnabled()) return false;
  if (getIndexJob().running) return false;
  const now = Date.now();
  const state = readState();
  if (state.lastAttemptAt) {
    const attempted = Date.parse(state.lastAttemptAt);
    if (Number.isFinite(attempted) && now - attempted < FAIL_BACKOFF_MS && state.lastError) {
      return false;
    }
  }
  const updated = Date.parse(loadDocsIndex().updatedAt);
  if (!Number.isFinite(updated)) return true;
  return now - updated >= indexMaxAgeMs();
}

export function maybeStartScheduledIndex(): void {
  if (!dueForRefresh()) return;
  const started = startIndexJob();
  if (!started.ok) return;
  writeState({ lastAttemptAt: new Date().toISOString(), lastError: undefined });
  console.error("Scheduled docs re-index started");
  void (async () => {
    await waitForIndexJob();
    const job = getIndexJob();
    if (job.error) {
      writeState({ lastAttemptAt: new Date().toISOString(), lastError: job.error });
      console.error("Scheduled docs re-index failed", job.error);
      return;
    }
    writeState({ lastAttemptAt: new Date().toISOString() });
    console.error(job.message || "Scheduled docs re-index finished");
  })();
}

export function startIndexScheduler(): void {
  if (!indexScheduleEnabled()) {
    console.error("Docs index scheduler off (set INDEX_DOCS_SCHEDULE=true to enable locally)");
    return;
  }
  console.error(
    `Docs index scheduler on — refresh when the index is older than ${indexMaxAgeMs() / 3600000}h`,
  );
  setTimeout(() => {
    maybeStartScheduledIndex();
    setInterval(maybeStartScheduledIndex, TICK_MS);
  }, FIRST_DELAY_MS);
}
