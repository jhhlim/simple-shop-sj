import { NextResponse } from "next/server";
import { sendShippingEmail } from "@/lib/email";
import {
  applyShippoLabel,
  getOrder,
  markTrackingEmailSent,
} from "@/lib/orders";
import { createUspsLabelForOrder, shippoConfigured } from "@/lib/shippo";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const password = request.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!shippoConfigured()) {
    return NextResponse.json(
      { error: "Shippo is not configured. Add SHIPPO_API_TOKEN to .env.local" },
      { status: 503 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const sendEmail = body.sendEmail !== false;

  const existing = await getOrder(id);
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (existing.status !== "paid") {
    return NextResponse.json(
      { error: "Only paid orders can have labels created" },
      { status: 400 }
    );
  }
  if (existing.trackingNumber) {
    return NextResponse.json(
      { error: "This order already has a label/tracking number" },
      { status: 400 }
    );
  }

  try {
    const { transaction, rate, shipmentId } = await createUspsLabelForOrder(existing);

    const order = await applyShippoLabel(id, {
      trackingNumber: transaction.tracking_number,
      trackingCarrier: transaction.rate.provider,
      trackingUrl: transaction.tracking_url_provider,
      labelUrl: transaction.label_url,
      shippoTransactionId: transaction.object_id,
      shippoShipmentId: shipmentId,
      labelCost: parseFloat(rate.amount),
    });

    if (!order) {
      return NextResponse.json({ error: "Failed to save label on order" }, { status: 500 });
    }

    let emailResult: { ok: boolean; error?: string } | undefined;
    if (sendEmail) {
      emailResult = await sendShippingEmail(order);
      if (emailResult.ok) await markTrackingEmailSent(id);
    }

    return NextResponse.json({
      order,
      label: {
        url: transaction.label_url,
        trackingNumber: transaction.tracking_number,
        service: rate.servicelevel.name,
        cost: rate.amount,
      },
      email: emailResult,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shippo label failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
