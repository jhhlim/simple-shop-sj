import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getOrder, markOrderPaid } from "@/lib/orders";

export async function POST(request: Request) {
  const { orderId, paymentId } = await request.json();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const existing = await getOrder(orderId);
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existing.status === "paid" || existing.status === "shipped") {
    return NextResponse.json(existing);
  }

  const order = await markOrderPaid(orderId, paymentId || "manual");
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  sendOrderConfirmationEmail(order).catch(() => undefined);

  return NextResponse.json(order);
}
