import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createCoupon, deleteCoupon, listCoupons, updateCoupon } from "@/lib/coupons";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const coupons = await listCoupons();
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const code = String(body.code || "").trim();
  const percentOff = Number(body.percentOff);
  const active = body.active !== false;

  if (!code || !Number.isFinite(percentOff)) {
    return NextResponse.json({ error: "Code and percent off are required" }, { status: 400 });
  }

  try {
    const coupon = await createCoupon({ code, percentOff, active });
    return NextResponse.json(coupon, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create coupon" },
      { status: 409 }
    );
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const code = String(body.code || "").trim();
  if (!code) {
    return NextResponse.json({ error: "Coupon code required" }, { status: 400 });
  }

  const updated = await updateCoupon(code, {
    percentOff: body.percentOff != null ? Number(body.percentOff) : undefined,
    active: body.active,
  });
  if (!updated) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.trim();
  if (!code) {
    return NextResponse.json({ error: "Coupon code required" }, { status: 400 });
  }

  const ok = await deleteCoupon(code);
  if (!ok) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
