import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteProduct, updateProduct } from "@/lib/products";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();

  const updated = await updateProduct(id, {
    name: body.name != null ? String(body.name) : undefined,
    description: body.description != null ? String(body.description) : undefined,
    price: body.price != null ? Number(body.price) : undefined,
    category: body.category,
    imageUrl: body.imageUrl != null ? String(body.imageUrl) : undefined,
    stock: body.stock != null ? Number(body.stock) : undefined,
  });

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
