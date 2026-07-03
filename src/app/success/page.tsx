"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { clearPendingOrder } from "@/components/PendingOrderBanner";
import { SHIPPING_LABEL_NOTE } from "@/lib/constants";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params.get("order");
  const sessionId = params.get("session_id");
  const paypalToken = params.get("token");
  const provider = params.get("provider");
  const { clearCart } = useCart();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    clearCart();
    clearPendingOrder();

    if (!orderId) {
      setStatus("ok");
      return;
    }

    const body: Record<string, string> = { orderId };
    if (sessionId) body.stripeSessionId = sessionId;
    else if (provider === "paypal" && paypalToken) body.paypalToken = paypalToken;
    else {
      setStatus("error");
      setError("Payment confirmation missing. Contact support with your order ID.");
      return;
    }

    fetch("/api/orders/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Could not confirm payment");
          return;
        }
        setStatus("ok");
      })
      .catch(() => {
        setStatus("error");
        setError("Could not confirm payment. If you were charged, contact support.");
      });
  }, [orderId, sessionId, paypalToken, provider, clearCart]);

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <div
        className={`rounded-2xl border p-8 ${
          status === "error"
            ? "border-red-200 bg-red-50"
            : "border-green-200 bg-green-50"
        }`}
      >
        {status === "loading" && (
          <>
            <h1 className="text-2xl font-semibold text-stone-900">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-stone-600">Please wait a moment.</p>
          </>
        )}
        {status === "ok" && (
          <>
            <h1 className="text-2xl font-semibold text-green-900">Thank you for your order!</h1>
            {orderId && (
              <p className="mt-2 text-sm text-green-800">Order ID: {orderId}</p>
            )}
            <p className="mt-4 text-sm text-green-900/80">{SHIPPING_LABEL_NOTE}</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold text-red-900">Payment issue</h1>
            <p className="mt-2 text-sm text-red-800">{error}</p>
            {orderId && (
              <p className="mt-2 text-sm text-red-800">Order ID: {orderId}</p>
            )}
          </>
        )}
        {status === "ok" && orderId && (
          <p className="mt-3 text-sm text-green-800">
            <Link href={`/track?order=${orderId}`} className="font-medium underline">
              Track your order
            </Link>{" "}
            anytime with your order ID and email.
          </p>
        )}
      </div>
      <Link href="/" className="mt-8 inline-block text-sm font-medium underline">
        Back to shop
      </Link>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center">Loading…</div>}>
      <SuccessContent />
    </Suspense>
  );
}
