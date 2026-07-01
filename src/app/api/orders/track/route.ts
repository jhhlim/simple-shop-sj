import { NextResponse } from "next/server";
import { getOrderForCustomer } from "@/lib/orders";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order");
  const email = searchParams.get("email");

  if (!orderId || !email) {
    return NextResponse.json(
      { error: "order and email query params are required" },
      { status: 400 }
    );
  }

  const order = await getOrderForCustomer(orderId, email);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    status: order.status,
    trackingStatus: order.trackingStatus,
    createdAt: order.createdAt,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    trackingNumber: order.trackingNumber,
    trackingCarrier: order.trackingCarrier,
    trackingUrl: order.trackingUrl,
    items: order.items,
    total: order.total,
    shipping: {
      fullName: order.shipping.fullName,
      city: order.shipping.city,
      state: order.shipping.state,
    },
  });
}
