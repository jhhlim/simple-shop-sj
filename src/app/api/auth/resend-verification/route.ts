import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendWelcomeEmail } from "@/lib/email";
import { findUserById } from "@/lib/users";

export const runtime = "nodejs";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const user = await findUserById(session.user.id);
  if (!user?.email) {
    return NextResponse.json({ error: "No email on file" }, { status: 400 });
  }
  if (user.email_verified) {
    return NextResponse.json({ message: "Email is already verified" });
  }

  const token = await createAuthToken(user.id, "verify_email", 24);
  const result = await sendWelcomeEmail(user, token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Could not send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
