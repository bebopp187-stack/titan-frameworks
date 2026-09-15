import { NextResponse } from "next/server";
import { adminSecret, requestIsAdmin } from "@/services/admin-auth";
import { getIndexJob, startIndexJob } from "@/services/index-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!adminSecret()) {
    return NextResponse.json({ error: "ADMIN_SECRET_KEY is not configured" }, { status: 503 });
  }
  if (!requestIsAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = startIndexJob();
  if (!started.ok) {
    return NextResponse.json({ error: started.error, job: getIndexJob() }, { status: started.status });
  }
  return NextResponse.json({ ok: true, job: getIndexJob() });
}

export async function GET(req: Request) {
  if (!adminSecret()) {
    return NextResponse.json({ error: "ADMIN_SECRET_KEY is not configured" }, { status: 503 });
  }
  if (!requestIsAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getIndexJob());
}
