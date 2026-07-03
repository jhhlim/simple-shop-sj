import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";

export async function GET() {
  const authenticated = await hasAdminSession();
  return NextResponse.json({ authenticated });
}
