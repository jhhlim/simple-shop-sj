import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createProduct, getProducts } from "@/lib/products";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { name, description, price, category, imageUrl, stock } = body;

  if (!name || !description || price == null || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const product = await createProduct({
    name: String(name),
    description: String(description),
    price: Number(price),
    category,
    imageUrl: imageUrl ? String(imageUrl) : "",
    stock: stock != null ? Number(stock) : 1,
  });

  return NextResponse.json(product, { status: 201 });
}
