import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { sendShippingEmail } from "@/lib/email";
import { getOrder, markOrderShipped, markTrackingEmailSent } from "@/lib/orders";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const { trackingNumber, trackingCarrier, trackingUrl, sendEmail = true } = body;

  if (!trackingNumber?.trim() || !trackingCarrier?.trim()) {
    return NextResponse.json(
      { error: "Tracking number and carrier are required" },
      { status: 400 }
    );
  }

  const existing = await getOrder(id);
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (existing.status !== "paid" && existing.status !== "shipped") {
    return NextResponse.json(
      { error: "Only paid orders can be marked as shipped" },
      { status: 400 }
    );
  }

  const order = await markOrderShipped(id, {
    trackingNumber,
    trackingCarrier,
    trackingUrl,
  });
  if (!order) {
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  let emailResult: { ok: boolean; error?: string } | undefined;
  if (sendEmail) {
    emailResult = await sendShippingEmail(order);
    if (emailResult.ok) {
      await markTrackingEmailSent(id);
      order.trackingEmailSentAt = new Date().toISOString();
    }
  }

  return NextResponse.json({ order, email: emailResult });
}
