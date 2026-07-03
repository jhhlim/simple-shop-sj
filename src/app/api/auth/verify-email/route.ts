import { NextResponse } from "next/server";
import { consumeAuthToken, findValidAuthToken } from "@/lib/auth-tokens";
import { markEmailVerified } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.redirect(new URL("/account?verify=missing", request.url));
  }

  const authToken = await findValidAuthToken(token, "verify_email");
  if (!authToken) {
    return NextResponse.redirect(new URL("/account?verify=invalid", request.url));
  }

  await markEmailVerified(authToken.user_id);
  await consumeAuthToken(token, "verify_email");

  return NextResponse.redirect(new URL("/account?verified=1", request.url));
}
