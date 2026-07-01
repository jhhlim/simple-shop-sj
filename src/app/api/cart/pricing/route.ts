import { NextResponse } from "next/server";
import { buildCartPricing } from "@/lib/pricing";
import type { CartItem } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const items = (body.items || []) as CartItem[];
  const couponCode = typeof body.couponCode === "string" ? body.couponCode : null;

  const { lines, totals, error } = await buildCartPricing(items, couponCode);

  if (error && lines.length === 0) {
    return NextResponse.json({ error }, { status: 400 });
  }

  return NextResponse.json({
    lines: lines.map(({ item, product, lineTotal }) => ({
      item,
      product,
      lineTotal,
    })),
    totals,
    error: error || null,
  });
}
