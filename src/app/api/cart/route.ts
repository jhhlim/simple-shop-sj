import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getUserCart, mergeCarts, saveUserCart } from "@/lib/cart-db";
import type { CartItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const items = await getUserCart(session.user.id);
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const items = (body.items || []) as CartItem[];
  const valid = items.every(
    (i) => typeof i.productId === "string" && typeof i.quantity === "number" && i.quantity > 0
  );
  if (!valid) {
    return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
  }

  await saveUserCart(session.user.id, items);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const localItems = (body.localItems || []) as CartItem[];
  const serverItems = await getUserCart(session.user.id);
  const merged = mergeCarts(localItems, serverItems);
  saveUserCart(session.user.id, merged);
  return NextResponse.json({ items: merged });
}
