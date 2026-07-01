import { NextResponse } from "next/server";
import { emailConfigured, emailProductionReady, resendSetupHint } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/site-url";
import { shippoConfigured } from "@/lib/shippo";

export async function GET() {
  const origin = getPublicSiteUrl();
  const webhookToken = process.env.SHIPPO_WEBHOOK_TOKEN || "set-SHIPPO_WEBHOOK_TOKEN";

  return NextResponse.json({
    shippo: {
      configured: shippoConfigured(),
      webhookUrl: `${origin}/api/webhooks/shippo?token=${webhookToken}`,
    },
    email: {
      configured: emailConfigured(),
      productionReady: emailProductionReady(),
      setupHint: resendSetupHint(),
    },
  });
}
