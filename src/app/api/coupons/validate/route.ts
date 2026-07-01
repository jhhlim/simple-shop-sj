import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupons";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";

  if (!code.trim()) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }

  const coupon = await validateCoupon(code);
  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid or expired coupon code" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    percentOff: coupon.percentOff,
  });
}
