import { Resend } from "resend";
import { SHOP_NAME } from "./constants";
import { getPublicSiteUrl, isResendTestSender, RESEND_DOMAIN_HELP } from "./site-url";
import type { Order } from "./types";

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.SHOP_EMAIL_FROM);
}

export function emailProductionReady(): boolean {
  return emailConfigured() && !isResendTestSender();
}

export function resendSetupHint(): string | null {
  if (!emailConfigured()) {
    return "Add RESEND_API_KEY and SHOP_EMAIL_FROM to environment variables.";
  }
  if (isResendTestSender()) {
    return RESEND_DOMAIN_HELP;
  }
  return null;
}

export async function sendShippingEmail(order: Order): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) {
    return {
      ok: false,
      error:
        "Email not configured. Add RESEND_API_KEY and SHOP_EMAIL_FROM to .env.local (see README).",
    };
  }

  if (!order.trackingNumber) {
    return { ok: false, error: "Order has no tracking number" };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.SHOP_EMAIL_FROM!;
  const origin = getPublicSiteUrl();
  const trackPage = `${origin}/track?order=${order.id}&email=${encodeURIComponent(order.shipping.email)}`;

  const itemLines = order.items
    .map((i) => `<li>${i.name} × ${i.quantity} — $${(i.price * i.quantity).toFixed(2)}</li>`)
    .join("");

  const { error } = await resend.emails.send({
    from,
    to: order.shipping.email,
    subject: `Your ${SHOP_NAME} order has shipped — ${order.trackingNumber}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2>Your order is on the way!</h2>
        <p>Hi ${order.shipping.fullName},</p>
        <p>We packed your order and shipped it via <strong>${order.trackingCarrier}</strong>.</p>
        <p style="font-size: 18px;"><strong>Tracking number:</strong> ${order.trackingNumber}</p>
        ${
          order.trackingUrl
            ? `<p><a href="${order.trackingUrl}">Track your package</a></p>`
            : ""
        }
        <p><a href="${trackPage}">View order status on our site</a></p>
        <h3>Order summary</h3>
        <ul>${itemLines}</ul>
        <p>Order ID: <code>${order.id}</code></p>
        <p style="color: #666; font-size: 13px;">Thank you for shopping with ${SHOP_NAME}!</p>
      </div>
    `,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function sendOrderConfirmationEmail(
  order: Order
): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: "Email not configured" };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.SHOP_EMAIL_FROM!;
  const origin = getPublicSiteUrl();
  const trackPage = `${origin}/track?order=${order.id}&email=${encodeURIComponent(order.shipping.email)}`;

  const { error } = await resend.emails.send({
    from,
    to: order.shipping.email,
    subject: `Order confirmed — ${SHOP_NAME}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Thanks for your order!</h2>
        <p>Hi ${order.shipping.fullName},</p>
        <p>We received your order and will ship it soon. You'll get another email with tracking when it goes out.</p>
        <p>Order ID: <code>${order.id}</code></p>
        <p>Total: $${order.total.toFixed(2)}</p>
        <p><a href="${trackPage}">Check order status anytime</a></p>
      </div>
    `,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function trackPageUrl(order: Order) {
  const origin = getPublicSiteUrl();
  return `${origin}/track?order=${order.id}&email=${encodeURIComponent(order.shipping.email)}`;
}

export async function sendInTransitEmail(
  order: Order
): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: "Email not configured" };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SHOP_EMAIL_FROM!,
    to: order.shipping.email,
    subject: `Your ${SHOP_NAME} package is in transit`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Your package is on the move</h2>
        <p>Hi ${order.shipping.fullName},</p>
        <p>USPS scanned your package — it's now in transit.</p>
        <p><strong>Tracking:</strong> ${order.trackingNumber}</p>
        ${order.trackingUrl ? `<p><a href="${order.trackingUrl}">Track your package</a></p>` : ""}
        <p><a href="${trackPageUrl(order)}">View order on our site</a></p>
      </div>
    `,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendDeliveredEmail(
  order: Order
): Promise<{ ok: boolean; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: "Email not configured" };

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SHOP_EMAIL_FROM!,
    to: order.shipping.email,
    subject: `Your ${SHOP_NAME} order was delivered`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Delivered!</h2>
        <p>Hi ${order.shipping.fullName},</p>
        <p>Your order has been delivered. We hope you love it!</p>
        <p>Tracking: ${order.trackingNumber}</p>
        <p><a href="${trackPageUrl(order)}">View order details</a></p>
        <p style="color: #666; font-size: 13px;">Thanks for shopping with ${SHOP_NAME}!</p>
      </div>
    `,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
