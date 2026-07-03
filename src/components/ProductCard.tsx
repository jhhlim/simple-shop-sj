"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import {
  getConditionLabel,
  getConditionStyles,
  getProductCondition,
} from "@/lib/product-condition";
import { useCart } from "./CartProvider";

function ProductImagePlaceholder({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-xl font-medium text-stone-400 shadow-sm ring-1 ring-stone-200/60">
        {initial}
      </div>
      <span className="mt-2 text-xs text-stone-400">Photo coming soon</span>
    </div>
  );
}

export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  const { addItem } = useCart();
  const soldOut = product.stock <= 0;
  const onlyOneLeft = !soldOut && product.stock === 1;
  const condition = getProductCondition(product);

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md ${
        compact ? "" : ""
      }`}
    >
      <Link href={`/product/${product.id}`} className="relative block aspect-square bg-stone-100">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        ) : (
          <ProductImagePlaceholder name={product.name} />
        )}
        <div className="absolute left-2 top-2 flex flex-col gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${getConditionStyles(condition)}`}
          >
            {getConditionLabel(condition)}
          </span>
          {soldOut && (
            <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[11px] font-medium text-white">
              Sold out
            </span>
          )}
          {onlyOneLeft && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
              Only 1 Left
            </span>
          )}
        </div>
      </Link>

      <div className={`flex flex-1 flex-col ${compact ? "gap-1.5 p-3" : "gap-2 p-4"}`}>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/product/${product.id}`} className="min-w-0 flex-1">
            <h2 className="line-clamp-2 font-medium leading-snug text-stone-900 group-hover:text-stone-700">
              {product.name}
            </h2>
          </Link>
        </div>
        {!compact && (
          <p className="line-clamp-2 text-sm leading-relaxed text-stone-500">{product.description}</p>
        )}
        <p className="text-xs text-stone-400">
          {soldOut
            ? `${product.soldCount} sold`
            : `${product.stock} in stock${product.soldCount > 0 ? ` · ${product.soldCount} sold` : ""}`}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className={`font-semibold text-stone-900 ${compact ? "text-base" : "text-lg"}`}>
            ${product.price.toFixed(2)}
          </span>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addItem(product.id)}
            className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {soldOut ? "Sold out" : "Add to cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
