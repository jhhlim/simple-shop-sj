"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { ShippingNotice } from "@/components/ShippingNotice";
import { SHIPPING_FEE } from "@/lib/constants";
import type { Product, ShippingInfo } from "@/lib/types";

const emptyShipping: ShippingInfo = {
  fullName: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
};

export default function CheckoutPage() {
  const { items } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [shipping, setShipping] = useState<ShippingInfo>(emptyShipping);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"stripe" | "paypal" | null>(null);

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

  function updateField<K extends keyof ShippingInfo>(key: K, value: ShippingInfo[K]) {
    setShipping((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePay(method: "stripe" | "paypal") {
    setError("");
    setLoading(method);

    try {
      const res = await fetch(`/api/checkout/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, shipping }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center">
        <p className="text-stone-500">Your cart is empty.</p>
        <Link href="/" className="mt-4 inline-block underline">
          Go shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <p className="mt-1 text-sm text-stone-600">
        All fields below are required to place your order.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="font-medium">Shipping information</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              Full name *
              <input
                required
                value={shipping.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Email *
              <input
                required
                type="email"
                value={shipping.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Phone *
              <input
                required
                type="tel"
                value={shipping.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              Street address *
              <input
                required
                value={shipping.street}
                onChange={(e) => updateField("street", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              City *
              <input
                required
                value={shipping.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              State *
              <input
                required
                value={shipping.state}
                onChange={(e) => updateField("state", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              ZIP code *
              <input
                required
                value={shipping.zip}
                onChange={(e) => updateField("zip", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              Country *
              <select
                required
                value={shipping.country}
                onChange={(e) => updateField("country", e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
              >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
              </select>
            </label>
          </div>
        </section>

        <ShippingNotice />

        <section className="rounded-xl border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-medium">Order summary</h2>
          {lines.map(({ product, item, lineTotal }) => (
            <div key={product.id} className="flex justify-between py-1">
              <span>
                {product.name} × {item.quantity}
              </span>
              <span>${lineTotal.toFixed(2)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2">
            <span>Shipping</span>
            <span>${SHIPPING_FEE.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </section>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handlePay("stripe")}
            className="rounded-lg bg-stone-900 py-3 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {loading === "stripe" ? "Redirecting…" : "Pay with card (Stripe)"}
          </button>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => handlePay("paypal")}
            className="rounded-lg border border-stone-300 bg-white py-3 font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            {loading === "paypal" ? "Redirecting…" : "Pay with PayPal"}
          </button>
        </div>
      </form>
    </div>
  );
}
