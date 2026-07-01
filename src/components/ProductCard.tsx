"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { useCart } from "./CartProvider";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="relative aspect-square bg-stone-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-stone-400">
            No image
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-medium text-stone-900">{product.name}</h2>
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs capitalize text-stone-600">
            {product.category}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-stone-600">{product.description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-semibold text-stone-900">
            ${product.price.toFixed(2)}
          </span>
          <button
            type="button"
            onClick={() => addItem(product.id)}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Add to cart
          </button>
        </div>
        <Link
          href={`/product/${product.id}`}
          className="text-center text-xs text-stone-500 hover:text-stone-800"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
