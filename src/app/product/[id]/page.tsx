import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "./AddToCartButton";
import { ShippingNotice } from "@/components/ShippingNotice";
import { getProduct } from "@/lib/products";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← Back to shop
      </Link>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-stone-100">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400">
              No image
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm capitalize text-stone-500">{product.category}</p>
            <h1 className="text-3xl font-semibold">{product.name}</h1>
            <p className="mt-2 text-2xl font-semibold">${product.price.toFixed(2)}</p>
            <p className="mt-1 text-sm text-stone-500">
              {product.stock <= 0
                ? `Sold out${product.soldCount > 0 ? ` · ${product.soldCount} sold` : ""}`
                : `${product.stock} in stock${product.soldCount > 0 ? ` · ${product.soldCount} sold` : ""}`}
            </p>
          </div>
          <p className="text-stone-600">{product.description}</p>
          <AddToCartButton productId={product.id} stock={product.stock} />
          <ShippingNotice compact />
        </div>
      </div>
    </div>
  );
}
