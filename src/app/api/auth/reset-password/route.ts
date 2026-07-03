import { NextResponse } from "next/server";
import { consumeAuthToken, findValidAuthToken } from "@/lib/auth-tokens";
import { updatePassword } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const token = String(body.token || "").trim();
  const password = String(body.password || "");

  if (!token) {
    return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const authToken = await findValidAuthToken(token, "reset_password");
  if (!authToken) {
    return NextResponse.json({ error: "Reset link is invalid or expired" }, { status: 400 });
  }

  await updatePassword(authToken.user_id, password);
  await consumeAuthToken(token, "reset_password");

  return NextResponse.json({ ok: true });
}
