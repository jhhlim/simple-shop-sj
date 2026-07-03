import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "limware_admin_sess";
const TTL_MS = 24 * 60 * 60 * 1000;

function adminSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD or AUTH_SECRET required");
  return secret;
}

export function signAdminSession(): string {
  const exp = Date.now() + TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  const sig = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminSessionValue(value: string): boolean {
  const dot = value.indexOf(".");
  if (dot < 0) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  } catch {
    return false;
  }
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

function parseCookieToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function isAdminAuthorized(request: Request): boolean {
  const token = parseCookieToken(request.headers.get("cookie"));
  if (token && verifyAdminSessionValue(token)) return true;

  const legacy = request.headers.get("x-admin-password");
  return !!(legacy && legacy === process.env.ADMIN_PASSWORD);
}

export async function setAdminSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, signAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function hasAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  return !!(token && verifyAdminSessionValue(token));
}

export function requireAdmin(request: Request): Response | null {
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "ADMIN_PASSWORD is not configured" }, { status: 503 });
  }
  if (!isAdminAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
