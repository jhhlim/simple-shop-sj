import { NextResponse } from "next/server";
import { createUserWithPassword, validateRegistration } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, email, password, name } = body;

  const error = validateRegistration({ username, email, password });
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    const user = await createUserWithPassword({
      username,
      email,
      password,
      name,
    });
    return NextResponse.json(
      { id: user.id, username: user.username, email: user.email },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Could not create account" }, { status: 500 });
  }
}
