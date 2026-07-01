"use client";

import { useCart } from "@/components/CartProvider";

export function AddToCartButton({ productId }: { productId: string }) {
  const { addItem } = useCart();

  return (
    <button
      type="button"
      onClick={() => addItem(productId)}
      className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-700"
    >
      Add to cart
    </button>
  );
}
