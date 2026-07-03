import { NextResponse } from "next/server";
import { clearAdminSessionCookieOnResponse, isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authenticated = isAdminAuthorized(request);
  return NextResponse.json({ authenticated });
}
