import { NextResponse } from "next/server";
import { createProduct, getProducts } from "@/lib/products";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const password = request.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description, price, category, imageUrl } = body;

  if (!name || !description || price == null || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const product = await createProduct({
    name: String(name),
    description: String(description),
    price: Number(price),
    category,
    imageUrl: imageUrl ? String(imageUrl) : "",
  });

  return NextResponse.json(product, { status: 201 });
}
