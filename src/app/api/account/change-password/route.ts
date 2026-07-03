import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { findUserById, updatePassword, verifyPassword } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await request.json();
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const user = await findUserById(session.user.id);
  if (!user?.password_hash) {
    return NextResponse.json(
      { error: "This account uses Google sign-in — password cannot be changed here." },
      { status: 400 }
    );
  }

  if (!(await verifyPassword(user, currentPassword))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  await updatePassword(user.id, newPassword);
  return NextResponse.json({ ok: true });
}
