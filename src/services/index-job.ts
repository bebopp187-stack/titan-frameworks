import { invalidateDocsCache } from "./docs-store.js";
import { enabledFrameworks } from "./framework-config.js";
import { buildDocsIndex, writeDocsIndex, type IndexProgress } from "./indexer.js";

let job: IndexProgress = {
  running: false,
  percent: 0,
  message: "Idle",
};

let inflight: Promise<void> | undefined;

export function getIndexJob(): IndexProgress {
  return { ...job };
}

export function startIndexJob(): { ok: true } | { ok: false; error: string; status: number } {
  if (job.running) {
    return { ok: false, error: "Index already running", status: 409 };
  }
  const frameworks = enabledFrameworks();
  if (frameworks.length === 0) {
    return { ok: false, error: "No frameworks enabled", status: 400 };
  }
  job = { running: true, percent: 1, message: "Starting re-index…" };
  inflight = (async () => {
    try {
      const index = await buildDocsIndex({
        frameworks,
        onProgress: (p) => {
          job = { ...job, running: true, ...p };
        },
      });
      writeDocsIndex(index);
      invalidateDocsCache();
      job = {
        running: false,
        percent: 100,
        message: `Indexed ${index.chunks.length} chunks`,
      };
    } catch (err) {
      job = {
        running: false,
        percent: job.percent,
        message: "Re-index failed",
        error: (err as Error).message,
      };
    } finally {
      inflight = undefined;
    }
  })();
  return { ok: true };
}

export function waitForIndexJob(): Promise<void> | undefined {
  return inflight;
}
