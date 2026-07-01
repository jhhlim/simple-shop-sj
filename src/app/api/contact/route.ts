import { NextResponse } from "next/server";
import { Resend } from "resend";
import { SHOP_NAME, SUPPORT_EMAIL } from "@/lib/constants";
import { emailConfigured } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, orderId, message } = body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json(
      { error: "Name, email, and message are required" },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  if (!emailConfigured()) {
    return NextResponse.json(
      {
        error: `Email is not configured. Reach us directly at ${SUPPORT_EMAIL}`,
      },
      { status: 503 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.SHOP_EMAIL_FROM!;

  const { error } = await resend.emails.send({
    from,
    to: SUPPORT_EMAIL,
    replyTo: String(email).trim(),
    subject: `[${SHOP_NAME}] Customer support — ${String(name).trim()}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px;">
        <h2>Customer support request</h2>
        <p><strong>From:</strong> ${String(name).trim()}</p>
        <p><strong>Email:</strong> ${String(email).trim()}</p>
        ${orderId ? `<p><strong>Order ID:</strong> ${String(orderId).trim()}</p>` : ""}
        <hr />
        <p style="white-space: pre-wrap;">${String(message).trim()}</p>
      </div>
    `,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
