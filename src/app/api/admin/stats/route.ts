import { NextResponse } from "next/server";
import { adminSecret, requestIsAdmin } from "@/services/admin-auth";
import { loadDocsIndex } from "@/services/docs-store";
import { getEarnings, usdcEarned, xrpEarned } from "@/services/earnings";
import { getQueryLog } from "@/services/query-log";
import { getFrameworkToggles } from "@/services/framework-config";
import { getIndexJob } from "@/services/index-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!adminSecret()) {
    return NextResponse.json({ error: "ADMIN_SECRET_KEY is not configured" }, { status: 503 });
  }
  if (!requestIsAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const index = loadDocsIndex();
  const earnings = getEarnings();
  const log = getQueryLog();
  return NextResponse.json({
    chunks: index.chunks.length,
    mcpCalls: earnings.mcpCalls,
    totalQueryCalls: log.totalQueries,
    estimatedRevenueUsdc: usdcEarned(),
    totalUsdcEarned: usdcEarned().toFixed(6),
    totalXrpEarned: xrpEarned().toFixed(6),
    settlements: earnings.settlements,
    lastSettlement: earnings.lastSettlement ?? null,
    queryLog: log.entries,
    frameworks: getFrameworkToggles(),
    indexJob: getIndexJob(),
    updatedAt: earnings.updatedAt,
  });
}
