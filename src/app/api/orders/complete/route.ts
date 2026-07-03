import { NextResponse } from "next/server";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { getOrder, markOrderPaid } from "@/lib/orders";
import {
  captureAndVerifyPayPalOrder,
  verifyStripeCheckoutSession,
} from "@/lib/payment-verify";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const orderId = String(body.orderId || "").trim();
  const stripeSessionId = body.stripeSessionId
    ? String(body.stripeSessionId).trim()
    : undefined;
  const paypalToken = body.paypalToken ? String(body.paypalToken).trim() : undefined;

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  if (!stripeSessionId && !paypalToken) {
    return NextResponse.json(
      { error: "Payment verification required" },
      { status: 400 }
    );
  }

  const existing = await getOrder(orderId);
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (existing.status === "expired") {
    return NextResponse.json(
      { error: "This order has expired. Please checkout again." },
      { status: 410 }
    );
  }

  if (existing.status === "paid" || existing.status === "shipped") {
    return NextResponse.json(existing);
  }

  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Order cannot be completed" }, { status: 400 });
  }

  let paymentId: string;

  if (stripeSessionId) {
    const verified = await verifyStripeCheckoutSession(stripeSessionId, orderId);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 402 });
    }
    paymentId = verified.paymentId;
  } else if (paypalToken) {
    const verified = await captureAndVerifyPayPalOrder(paypalToken, orderId);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 402 });
    }
    paymentId = verified.paymentId;
  } else {
    return NextResponse.json({ error: "Payment verification required" }, { status: 400 });
  }

  const order = await markOrderPaid(orderId, paymentId);
  if (!order) {
    return NextResponse.json({ error: "Could not complete order" }, { status: 500 });
  }

  sendOrderConfirmationEmail(order).catch(() => undefined);

  return NextResponse.json(order);
}
