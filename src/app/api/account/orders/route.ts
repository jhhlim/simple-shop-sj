import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrdersForAccount } from "@/lib/orders";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const orders = await getOrdersForAccount(session.user.id, session.user.email);
  return NextResponse.json({ orders });
}
