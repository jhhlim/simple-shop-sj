import { NextResponse } from "next/server";
import { shippoConfigured } from "@/lib/shippo";
import { emailConfigured } from "@/lib/email";

export async function GET() {
  const origin = process.env.AUTH_URL || "http://localhost:3000";
  const webhookToken = process.env.SHIPPO_WEBHOOK_TOKEN || "set-SHIPPO_WEBHOOK_TOKEN";

  return NextResponse.json({
    shippo: {
      configured: shippoConfigured(),
      webhookUrl: `${origin}/api/webhooks/shippo?token=${webhookToken}`,
    },
    email: { configured: emailConfigured() },
  });
}
