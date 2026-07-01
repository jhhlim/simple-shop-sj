import { NextResponse } from "next/server";
import { paypalKeysProblem, stripeKeyProblem } from "@/lib/payments";

export async function GET() {
  const stripeError = stripeKeyProblem(process.env.STRIPE_SECRET_KEY);
  const paypalError = paypalKeysProblem(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );

  return NextResponse.json({
    stripe: { configured: !stripeError, error: stripeError },
    paypal: { configured: !paypalError, error: paypalError },
    paypalMode: process.env.PAYPAL_MODE || "sandbox",
  });
}
