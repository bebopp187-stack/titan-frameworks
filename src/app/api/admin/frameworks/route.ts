import { NextResponse } from "next/server";
import { adminSecret, requestIsAdmin } from "@/services/admin-auth";
import { getFrameworkToggles, setFrameworkToggles } from "@/services/framework-config";
import type { FrameworkId } from "@/types/index";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!adminSecret()) {
    return NextResponse.json({ error: "ADMIN_SECRET_KEY is not configured" }, { status: 503 });
  }
  if (!requestIsAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ frameworks: getFrameworkToggles() });
}

export async function POST(req: Request) {
  if (!adminSecret()) {
    return NextResponse.json({ error: "ADMIN_SECRET_KEY is not configured" }, { status: 503 });
  }
  if (!requestIsAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Partial<Record<FrameworkId, boolean>>;
  return NextResponse.json({ frameworks: setFrameworkToggles(body) });
}
