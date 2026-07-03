import Stripe from "stripe";

type PayPalAuth = { token: string; base: string };

async function getPayPalAuth(): Promise<PayPalAuth | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base =
    process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string };
  return { token: data.access_token, base };
}

export async function verifyStripeCheckoutSession(
  sessionId: string,
  expectedOrderId: string
): Promise<{ ok: true; paymentId: string } | { ok: false; error: string }> {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return { ok: false, error: "Stripe is not configured" };
  }

  const stripe = new Stripe(stripeKey);
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { ok: false, error: "Invalid Stripe checkout session" };
  }

  if (session.payment_status !== "paid") {
    return { ok: false, error: "Payment has not been completed" };
  }

  if (session.metadata?.orderId !== expectedOrderId) {
    return { ok: false, error: "Session does not match this order" };
  }

  const paymentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || session.id;

  return { ok: true, paymentId };
}

export async function captureAndVerifyPayPalOrder(
  paypalOrderId: string,
  expectedOrderId: string
): Promise<{ ok: true; paymentId: string } | { ok: false; error: string }> {
  const auth = await getPayPalAuth();
  if (!auth) {
    return { ok: false, error: "PayPal is not configured" };
  }

  const captureRes = await fetch(`${auth.base}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
  });

  if (!captureRes.ok) {
    const text = await captureRes.text();
    return { ok: false, error: text || "PayPal capture failed" };
  }

  const data = (await captureRes.json()) as {
    id: string;
    status: string;
    purchase_units?: { reference_id?: string }[];
  };

  if (data.status !== "COMPLETED") {
    return { ok: false, error: "PayPal payment was not completed" };
  }

  const referenceId = data.purchase_units?.[0]?.reference_id;
  if (referenceId !== expectedOrderId) {
    return { ok: false, error: "PayPal order does not match this shop order" };
  }

  return { ok: true, paymentId: data.id };
}
