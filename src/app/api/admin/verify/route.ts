import { NextResponse } from "next/server";
import { setAdminSessionCookie } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD is not set in .env.local" },
      { status: 503 }
    );
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  await setAdminSessionCookie();
  return NextResponse.json({ ok: true });
}
