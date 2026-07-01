export function getPublicSiteUrl(): string {
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl && !authUrl.includes("localhost")) {
    return authUrl.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return authUrl?.replace(/\/$/, "") || "http://localhost:3000";
}

export function isResendTestSender(): boolean {
  const from = process.env.SHOP_EMAIL_FROM?.toLowerCase() || "";
  return from.includes("resend.dev");
}

export const RESEND_DOMAIN_HELP =
  "Verify a domain at resend.com/domains, then set SHOP_EMAIL_FROM to an address on that domain (e.g. LIMWARE <orders@yourdomain.com>).";
