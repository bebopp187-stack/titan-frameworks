import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "titan_admin";

export function adminSecret(): string | undefined {
  const raw = process.env.ADMIN_SECRET_KEY?.trim();
  return raw || undefined;
}

export function signAdminSession(secret: string): string {
  return createHmac("sha256", secret).update("titan-admin-session-v1").digest("hex");
}

export function passwordsMatch(password: string, secret: string): boolean {
  const a = Buffer.from(password);
  const b = Buffer.from(secret);
  if (a.length !== b.length) {
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

export function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}

export function sessionIsValid(cookieHeader: string | undefined): boolean {
  const secret = adminSecret();
  if (!secret) return false;
  const token = parseCookie(cookieHeader, ADMIN_COOKIE);
  if (!token) return false;
  const expected = signAdminSession(secret);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function requestIsAdmin(req: Request): boolean {
  return sessionIsValid(req.headers.get("cookie") ?? undefined);
}

export function cookieHeader(token: string, req?: Request, maxAgeSec = 60 * 60 * 24 * 7): string {
  const proto = req?.headers.get("x-forwarded-proto") ?? "";
  const secure = proto === "https" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`;
}

export function clearCookieHeader(req?: Request): string {
  const proto = req?.headers.get("x-forwarded-proto") ?? "";
  const secure = proto === "https" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export function loginAllowed(ip: string): boolean {
  const now = Date.now();
  const row = loginAttempts.get(ip);
  if (!row || row.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60_000 });
    return true;
  }
  if (row.count >= 8) return false;
  row.count += 1;
  return true;
}
