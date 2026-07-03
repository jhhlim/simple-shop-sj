import { NextResponse } from "next/server";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { findUserByEmail } from "@/lib/users";

export const runtime = "nodejs";

const GENERIC_MESSAGE =
  "If an account exists for that email, we sent password reset instructions.";

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (user?.password_hash && user.email) {
    try {
      const token = await createAuthToken(user.id, "reset_password", 1);
      await sendPasswordResetEmail(user, token);
    } catch {
      // Do not reveal whether email exists
    }
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
