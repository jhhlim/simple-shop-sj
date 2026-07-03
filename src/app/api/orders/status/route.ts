import { NextResponse } from "next/server";
import { getOrder } from "@/lib/orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const order = await getOrder(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    orderId: order.id,
    status: order.status,
    expiresAt: order.expiresAt,
    createdAt: order.createdAt,
  });
}
