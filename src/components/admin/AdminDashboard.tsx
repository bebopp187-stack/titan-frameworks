"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type FrameworkId = "langchain" | "llamaindex" | "ollama" | "xrpl";

type QueryRow = {
  at: string;
  framework: string;
  durationMs: number;
  tool?: string;
};

type IndexJob = {
  running: boolean;
  percent: number;
  message: string;
  framework?: string;
  error?: string;
};

type IndexSchedule = {
  enabled: boolean;
  maxAgeHours: number;
  indexUpdatedAt: string;
  stale: boolean;
  lastAttemptAt: string | null;
  lastError: string | null;
};

type Stats = {
  chunks: number;
  mcpCalls: number;
  totalQueryCalls: number;
  estimatedRevenueUsdc: number;
  totalUsdcEarned: string;
  totalXrpEarned: string;
  queryLog: QueryRow[];
  frameworks: Record<FrameworkId, boolean>;
  indexJob: IndexJob;
  indexSchedule?: IndexSchedule;
  indexUpdatedAt?: string;
};

const LABELS: Record<FrameworkId, string> = {
  langchain: "LangChain",
  llamaindex: "LlamaIndex",
  ollama: "Ollama",
  xrpl: "XRPL",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const res = await fetch(path, {
    credentials: "same-origin",
    ...init,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const data = await api<Stats>("/api/admin/stats");
    setStats(data);
    setAuthed(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api<{ ok: boolean }>("/api/admin/login")
      .then(async (s) => {
        if (cancelled) return;
        if (s.ok) {
          await refresh();
          return;
        }
        setAuthed(false);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (!authed) return;
    const timer = window.setInterval(() => {
      refresh().catch(() => setAuthed(false));
    }, stats?.indexJob.running ? 1000 : 8000);
    return () => window.clearInterval(timer);
  }, [authed, refresh, stats?.indexJob.running]);

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    try {
      await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      await refresh();
    } catch (err) {
      setLoginError((err as Error).message);
    }
  }

  async function triggerIndex() {
    setBusy(true);
    setNotice("");
    try {
      await api("/api/admin/trigger-index", { method: "POST" });
      await refresh();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleFramework(id: FrameworkId, enabled: boolean) {
    if (!stats) return;
    const next = { ...stats.frameworks, [id]: enabled };
    const data = await api<{ frameworks: Record<FrameworkId, boolean> }>("/api/admin/frameworks", {
      method: "POST",
      body: JSON.stringify(next),
    });
    setStats({ ...stats, frameworks: data.frameworks });
  }

  async function logout() {
    await api("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setAuthed(false);
    setStats(null);
  }

  if (checking) {
    return <p className="p-8 text-slate-400">Checking session…</p>;
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-semibold">Titan Frameworks Admin</h1>
        <p className="mt-2 text-sm text-slate-400">Private dashboard. Enter the admin secret to continue.</p>
        <form onSubmit={onLogin} className="mt-8 space-y-4">
          <label className="block text-xs uppercase tracking-wide text-slate-400">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-sky-400"
            />
          </label>
          {loginError ? <p className="text-sm text-red-400">{loginError}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-sky-500 px-4 py-3 font-medium text-slate-950 hover:bg-sky-400"
          >
            Unlock
          </button>
        </form>
      </main>
    );
  }

  const job = stats?.indexJob;
  const indexing = Boolean(job?.running || busy);

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Titan Frameworks Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Private ops dashboard — not part of the public MCP surface.</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
        >
          Log out
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Query Calls</p>
          <p className="mt-3 text-3xl font-bold">{stats?.totalQueryCalls ?? 0}</p>
          <p className="mt-2 text-xs text-slate-500">{stats?.mcpCalls ?? 0} HTTP /mcp invocations</p>
        </article>
        <article className="rounded-2xl border border-amber-900/60 bg-gradient-to-b from-amber-950/60 to-slate-900 p-5">
          <p className="text-xs uppercase tracking-wide text-amber-200/80">Estimated Revenue</p>
          <p className="mt-3 text-3xl font-bold text-amber-300">
            ${Number(stats?.estimatedRevenueUsdc ?? 0).toFixed(4)}
          </p>
          <p className="mt-2 text-xs text-slate-400">x402 USDC received · {stats?.totalXrpEarned} XRP on-ledger</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400">Indexed chunks</p>
          <p className="mt-3 text-3xl font-bold">{stats?.chunks ?? 0}</p>
          <p className="mt-2 text-xs text-slate-500">
            {stats?.indexUpdatedAt
              ? `Crawled ${new Date(stats.indexUpdatedAt).toLocaleString()}`
              : "Live docs index on this instance"}
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Docs indexer</h2>
            <p className="text-sm text-slate-400">{job?.message || "Idle"}</p>
            {stats?.indexSchedule ? (
              <p className="mt-1 text-xs text-slate-500">
                {stats.indexSchedule.enabled
                  ? `Auto-refresh when the index is older than ${stats.indexSchedule.maxAgeHours}h${
                      stats.indexSchedule.stale ? " — currently stale" : ""
                    }.`
                  : "Auto-refresh is off on this instance."}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={indexing}
            onClick={() => void triggerIndex()}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {indexing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
            ) : null}
            Trigger Manual Re-index
          </button>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-400 transition-all duration-500"
            style={{ width: `${Math.min(100, job?.percent ?? 0)}%` }}
          />
        </div>
        {notice ? <p className="mt-3 text-sm text-red-400">{notice}</p> : null}
        {job?.error ? <p className="mt-3 text-sm text-red-400">{job.error}</p> : null}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <h2 className="text-lg font-medium">Framework indexing</h2>
        <p className="mt-1 text-sm text-slate-400">Toggle which libraries are crawled on the next re-index.</p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2">
          {(Object.keys(LABELS) as FrameworkId[]).map((id) => (
            <label
              key={id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"
            >
              <span>{LABELS[id]}</span>
              <input
                type="checkbox"
                checked={Boolean(stats?.frameworks[id])}
                onChange={(e) => void toggleFramework(id, e.target.checked)}
                className="h-4 w-4 accent-sky-400"
              />
            </label>
          ))}
        </form>
      </section>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
        <div className="px-5 py-4">
          <h2 className="text-lg font-medium">Recent query log</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Framework</th>
                <th className="px-5 py-3">Duration</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.queryLog ?? []).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-6 text-slate-500">
                    No tool queries yet.
                  </td>
                </tr>
              ) : (
                stats?.queryLog.map((row) => (
                  <tr key={`${row.at}-${row.framework}-${row.durationMs}`} className="border-t border-slate-800">
                    <td className="px-5 py-3 text-slate-300">{new Date(row.at).toLocaleString()}</td>
                    <td className="px-5 py-3">{row.framework}</td>
                    <td className="px-5 py-3">{row.durationMs} ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
