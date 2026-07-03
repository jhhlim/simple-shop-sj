import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { normalizeStoredImageUrl } from "@/lib/image-url";
import { isProductCategory } from "@/lib/product-categories";
import { isProductCondition } from "@/lib/product-condition";
import { createProduct, getProducts } from "@/lib/products";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const { name, description, price, category, condition, imageUrl, stock, sku } = body;

  if (!name || !description || price == null || !category) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!isProductCategory(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const skuValue = typeof sku === "string" ? sku.trim() : "";
  if (!skuValue) {
    return NextResponse.json(
      { error: "SKU is required — used to match photos during mass upload." },
      { status: 400 }
    );
  }

  const product = await createProduct({
    name: String(name),
    description: String(description),
    price: Number(price),
    category,
    condition: isProductCondition(condition) ? condition : undefined,
    imageUrl: normalizeStoredImageUrl(imageUrl),
    stock: stock != null ? Number(stock) : 1,
    sku: skuValue,
  });

  return NextResponse.json(product, { status: 201 });
}
