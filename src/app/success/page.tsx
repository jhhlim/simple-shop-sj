"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import { SHIPPING_LABEL_NOTE } from "@/lib/constants";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
    if (orderId) {
      fetch("/api/orders/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => undefined);
    }
  }, [orderId, clearCart]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
        <h1 className="text-2xl font-semibold text-green-900">Thank you for your order!</h1>
        {orderId && (
          <p className="mt-2 text-sm text-green-800">Order ID: {orderId}</p>
        )}
        <p className="mt-4 text-sm text-green-900/80">{SHIPPING_LABEL_NOTE}</p>
      </div>
      <Link href="/" className="mt-8 inline-block text-sm font-medium underline">
        Back to shop
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
