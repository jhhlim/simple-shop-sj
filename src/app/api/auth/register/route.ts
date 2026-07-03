import { NextResponse } from "next/server";
import { createAuthToken } from "@/lib/auth-tokens";
import { sendWelcomeEmail } from "@/lib/email";
import { UserConflictError } from "@/lib/user-errors";
import { createUserWithPassword, validateRegistration } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, email, password } = body;

  const error = await validateRegistration({ username, email, password });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const user = await createUserWithPassword({
      username,
      email,
      password,
    });

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const token = await createAuthToken(user.id, "verify_email", 24);
      const result = await sendWelcomeEmail(user, token);
      emailSent = result.ok;
      emailError = result.error;
    } catch {
      emailError = "Could not send welcome email";
    }

    return NextResponse.json(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        emailSent,
        emailError,
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof UserConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
