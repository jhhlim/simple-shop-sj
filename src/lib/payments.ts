export function isPlaceholderKey(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const v = value.trim();
  return v.includes("...") || v.endsWith("_") || v === "sk_test" || v === "your_key_here";
}

export function stripeKeyProblem(key: string | undefined): string | null {
  if (!key?.trim()) {
    return "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local";
  }
  if (isPlaceholderKey(key)) {
    return "Stripe key is still a placeholder. Paste your real secret key from https://dashboard.stripe.com/test/apikeys";
  }
  if (!key.startsWith("sk_test_") && !key.startsWith("sk_live_")) {
    return "STRIPE_SECRET_KEY should start with sk_test_ (testing) or sk_live_ (production)";
  }
  return null;
}

export function paypalKeysProblem(
  clientId: string | undefined,
  clientSecret: string | undefined
): string | null {
  if (!clientId?.trim() || !clientSecret?.trim()) {
    return "PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local";
  }
  if (isPlaceholderKey(clientId) || isPlaceholderKey(clientSecret)) {
    return "PayPal keys are still placeholders. Create a sandbox app at https://developer.paypal.com/dashboard/applications/sandbox";
  }
  return null;
}
