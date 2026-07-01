import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";

export async function POST(request: Request) {
  const { orderId, paymentId } = await request.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }
  const order = await markOrderPaid(orderId, paymentId || "manual");
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  return NextResponse.json(order);
}
