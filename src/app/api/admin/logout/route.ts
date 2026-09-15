import { NextResponse } from "next/server";
import { clearCookieHeader } from "@/services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearCookieHeader(req));
  return res;
}
