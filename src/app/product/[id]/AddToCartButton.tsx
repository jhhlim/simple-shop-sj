"use client";

import { useCart } from "@/components/CartProvider";

export function AddToCartButton({
  productId,
  stock,
}: {
  productId: string;
  stock: number;
}) {
  const { addItem } = useCart();
  const soldOut = stock <= 0;

  return (
    <button
      type="button"
      disabled={soldOut}
      onClick={() => addItem(productId)}
      className="w-full rounded-lg bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {soldOut ? "Sold out" : "Add to cart"}
    </button>
  );
}
