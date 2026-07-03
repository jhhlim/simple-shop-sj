import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isProductCategory } from "@/lib/product-categories";
import { isProductCondition } from "@/lib/product-condition";
import { deleteProduct, updateProduct } from "@/lib/products";
import type { Product } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();

  if (body.category != null && !isProductCategory(body.category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (body.condition != null && body.condition !== "" && !isProductCondition(body.condition)) {
    return NextResponse.json({ error: "Invalid condition" }, { status: 400 });
  }

  const patch: Partial<
    Pick<
      Product,
      | "name"
      | "description"
      | "price"
      | "category"
      | "condition"
      | "imageUrl"
      | "stock"
      | "sku"
    >
  > = {};

  if (body.name != null) patch.name = String(body.name);
  if (body.description != null) patch.description = String(body.description);
  if (body.price != null) patch.price = Number(body.price);
  if (body.category != null) patch.category = body.category;
  if (isProductCondition(body.condition)) patch.condition = body.condition;
  if (body.imageUrl != null) patch.imageUrl = String(body.imageUrl);
  if (body.stock != null) patch.stock = Number(body.stock);
  if (body.sku != null) patch.sku = String(body.sku);

  const updated = await updateProduct(id, patch);

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const ok = await deleteProduct(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
