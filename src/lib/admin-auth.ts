import { createHmac, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "limware_admin_sess";
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
  try {
    const dot = value.indexOf(".");
    if (dot < 0) return false;
    const payload = value.slice(0, dot);
    const sig = value.slice(dot + 1);
    const expected = createHmac("sha256", adminSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp: number };
    return data.exp > Date.now();
  } catch {
    return false;
  }
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(TTL_MS / 1000),
  };
}

/** Attach admin session cookie to an API response (required for persistence in Route Handlers). */
export function attachAdminSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_COOKIE_NAME, signAdminSession(), adminCookieOptions());
  return response;
}

export function clearAdminSessionCookieOnResponse(response: NextResponse): NextResponse {
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    ...adminCookieOptions(),
    maxAge: 0,
  });
  return response;
}

function parseCookieToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE_NAME}=([^;]+)`)
  );
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
  jar.set(ADMIN_COOKIE_NAME, signAdminSession(), adminCookieOptions());
}

export async function clearAdminSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete({ name: ADMIN_COOKIE_NAME, path: "/" });
}

export async function hasAdminSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE_NAME)?.value;
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
