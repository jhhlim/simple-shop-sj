"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import { CouponField } from "@/components/CouponField";
import { ShippingForm } from "@/components/ShippingForm";
import { ShippingNotice } from "@/components/ShippingNotice";
import type { OrderTotals } from "@/lib/pricing";
import {
  formatShippingForStorage,
  validateShippingInfo,
  type ShippingFieldErrors,
} from "@/lib/shipping-validation";
import type { Product, ShippingInfo } from "@/lib/types";

const emptyShipping: ShippingInfo = {
  fullName: "",
  email: "",
  phone: "",
  street: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
};

export default function CheckoutPage() {
  const { data: session } = useSession();
  const { items, couponCode, setCouponCode } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [shipping, setShipping] = useState<ShippingInfo>(emptyShipping);
  const [fieldErrors, setFieldErrors] = useState<ShippingFieldErrors>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"stripe" | "paypal" | null>(null);
  const [totals, setTotals] = useState<OrderTotals | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<{
    stripe: { configured: boolean; error: string | null };
    paypal: { configured: boolean; error: string | null };
  } | null>(null);

  useEffect(() => {
    if (session?.user?.email && !shipping.email) {
      setShipping((prev) => ({
        ...prev,
        email: session.user?.email || prev.email,
        fullName: prev.fullName || session.user?.name || "",
      }));
    }
  }, [session?.user?.email, session?.user?.name, shipping.email]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts([]));

    fetch("/api/checkout/status")
      .then((r) => r.json())
      .then(setPaymentStatus)
      .catch(() => setPaymentStatus(null));
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

  useEffect(() => {
    if (items.length === 0) {
      setTotals(null);
      return;
    }
    fetch("/api/cart/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, couponCode }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setError("");
        setTotals(data.totals || null);
      })
      .catch(() => setTotals(null));
  }, [items, couponCode]);

  function validateBeforePay(): ShippingInfo | null {
    const formatted = formatShippingForStorage(shipping);
    const { valid, errors } = validateShippingInfo(formatted);
    setFieldErrors(errors);
    if (!valid) {
      setError("Please fix the shipping errors above before paying.");
      return null;
    }
    setShipping(formatted);
    if (totals && couponCode && !totals.couponCode) {
      setError("Invalid or expired coupon code.");
      return null;
    }
    setError("");
    return formatted;
  }

  async function handlePay(method: "stripe" | "paypal") {
    const validShipping = validateBeforePay();
    if (!validShipping) return;

    setLoading(method);

    try {
      const res = await fetch(`/api/checkout/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, shipping: validShipping, couponCode }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; url?: string };
      if (!res.ok) {
        setError(data.error || "Checkout failed");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL returned. Check your payment configuration.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
      {session?.user ? (
        <p className="mt-1 text-sm text-green-800">
          Signed in as <strong>{session.user.name || session.user.email}</strong> — your cart is
          saved to your account.
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-600">
          Checking out as <strong>guest</strong>.{" "}
          <Link href="/login" className="font-medium underline">
            Sign in
          </Link>{" "}
          to save your cart, or{" "}
          <Link href="/register" className="font-medium underline">
            create an account
          </Link>
          .
        </p>
      )}
      <p className="mt-1 text-sm text-stone-500">
        All fields marked * are required. Guest checkout is available — no account needed.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-6">
        <ShippingForm
          shipping={shipping}
          onChange={setShipping}
          fieldErrors={fieldErrors}
          onFieldErrorsChange={setFieldErrors}
        />

        <CouponField couponCode={couponCode} onApply={setCouponCode} />

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
          {totals && totals.discount > 0 && (
            <div className="flex justify-between py-1 text-green-800">
              <span>
                Discount ({totals.discountPercent}%)
                {totals.couponCode ? ` — ${totals.couponCode}` : ""}
              </span>
              <span>-${totals.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2">
            <span>Shipping</span>
            <span>${(totals?.shippingFee ?? 5).toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between text-base font-semibold">
            <span>Total</span>
            <span>${(totals?.total ?? lines.reduce((s, l) => s + l.lineTotal, 0) + 5).toFixed(2)}</span>
          </div>
        </section>

        {paymentStatus &&
          (!paymentStatus.stripe.configured || !paymentStatus.paypal.configured) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
              <p className="font-medium">Payment setup needed (shop owner)</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {!paymentStatus.stripe.configured && (
                  <li>{paymentStatus.stripe.error}</li>
                )}
                {!paymentStatus.paypal.configured && (
                  <li>{paymentStatus.paypal.error}</li>
                )}
              </ul>
            </div>
          )}

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading !== null || paymentStatus?.stripe.configured === false}
            onClick={() => handlePay("stripe")}
            className="rounded-lg bg-stone-900 py-3 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {loading === "stripe" ? "Redirecting…" : "Pay with card or Alipay"}
          </button>
          <button
            type="button"
            disabled={loading !== null || paymentStatus?.paypal.configured === false}
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
