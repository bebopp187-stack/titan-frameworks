import { NextResponse } from "next/server";
import {
  adminSecret,
  cookieHeader,
  loginAllowed,
  passwordsMatch,
  requestIsAdmin,
  signAdminSession,
} from "@/services/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = adminSecret();
  if (!secret) {
    return NextResponse.json({ error: "ADMIN_SECRET_KEY is not configured" }, { status: 503 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!loginAllowed(ip)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  const password = String(body.password ?? "");
  if (!passwordsMatch(password, secret)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", cookieHeader(signAdminSession(secret), req));
  return res;
}

export async function GET(req: Request) {
  if (!adminSecret()) {
    return NextResponse.json({ ok: false, configured: false }, { status: 503 });
  }
  return NextResponse.json({ ok: requestIsAdmin(req), configured: true });
}
