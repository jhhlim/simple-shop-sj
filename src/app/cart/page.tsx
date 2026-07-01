"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ShippingNotice } from "@/components/ShippingNotice";
import { SHIPPING_FEE } from "@/lib/constants";
import type { Product } from "@/lib/types";

export default function CartPage() {
  const { items, setQuantity, removeItem } = useCart();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const lines = useMemo(() => {
    return items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        return { item, product, lineTotal: product.price * item.quantity };
      })
      .filter(Boolean) as {
      item: { productId: string; quantity: number };
      product: Product;
      lineTotal: number;
    }[];
  }, [items, products]);

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const total = subtotal + (lines.length > 0 ? SHIPPING_FEE : 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Your cart</h1>

      {lines.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-stone-500">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-stone-900 underline"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            {lines.map(({ item, product, lineTotal }) => (
              <div
                key={product.id}
                className="flex gap-4 rounded-xl border border-stone-200 bg-white p-4"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                  {product.imageUrl && (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-stone-500">
                        ${product.price.toFixed(2)} each
                      </p>
                    </div>
                    <p className="font-medium">${lineTotal.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-stone-600">
                      Qty
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          setQuantity(product.id, Number(e.target.value))
                        }
                        className="ml-2 w-16 rounded border border-stone-300 px-2 py-1"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <ShippingNotice />

          <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <div className="flex justify-between py-1">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Shipping</span>
              <span>${SHIPPING_FEE.toFixed(2)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <Link
            href="/checkout"
            className="block rounded-lg bg-stone-900 py-3 text-center font-medium text-white hover:bg-stone-700"
          >
            Proceed to checkout
          </Link>
        </div>
      )}
    </div>
  );
}
