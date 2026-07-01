import { NextResponse } from "next/server";
import {
  sendDeliveredEmail,
  sendInTransitEmail,
} from "@/lib/email";
import {
  getOrder,
  getOrderByTrackingNumber,
  markDeliveredEmailSent,
  markInTransitEmailSent,
  updateTrackingStatus,
} from "@/lib/orders";
import { mapShippoTrackingStatus } from "@/lib/shippo";

type ShippoWebhookPayload = {
  event?: string;
  data?: {
    tracking_number?: string;
    metadata?: string;
    tracking_status?: {
      status?: string;
      status_date?: string;
    };
  };
};

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const expected = process.env.SHIPPO_WEBHOOK_TOKEN;

  if (expected && token !== expected) {
    return NextResponse.json({ error: "Invalid webhook token" }, { status: 401 });
  }

  const payload = (await request.json()) as ShippoWebhookPayload;
  if (payload.event !== "track_updated" || !payload.data) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const trackingNumber = payload.data.tracking_number;
  const statusRaw = payload.data.tracking_status?.status || "UNKNOWN";
  const trackingStatus = mapShippoTrackingStatus(statusRaw);

  let order =
    (payload.data.metadata && (await getOrder(payload.data.metadata))) ||
    (trackingNumber ? await getOrderByTrackingNumber(trackingNumber) : undefined);

  if (!order) {
    return NextResponse.json({ ok: true, skipped: "order not found" });
  }

  const deliveredAt =
    trackingStatus === "delivered"
      ? payload.data.tracking_status?.status_date || new Date().toISOString()
      : undefined;

  order = (await updateTrackingStatus(order.id, { trackingStatus, deliveredAt })) || order;

  if (trackingStatus === "in_transit" && !order.inTransitEmailSentAt) {
    const email = await sendInTransitEmail(order);
    if (email.ok) await markInTransitEmailSent(order.id);
  }

  if (trackingStatus === "delivered" && !order.deliveredEmailSentAt) {
    const email = await sendDeliveredEmail(order);
    if (email.ok) await markDeliveredEmailSent(order.id);
  }

  return NextResponse.json({ ok: true, orderId: order.id, trackingStatus });
}
