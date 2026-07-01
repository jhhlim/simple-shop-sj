import { NextResponse } from "next/server";
import { deleteProduct } from "@/lib/products";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const password = request.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ok = await deleteProduct(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
