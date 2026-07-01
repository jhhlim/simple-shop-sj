"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

type TrackResult = {
  id: string;
  status: string;
  trackingStatus?: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  shipping: { fullName: string; city: string; state: string };
};

function statusLabel(result: TrackResult) {
  if (result.trackingStatus === "delivered") return "Delivered";
  if (result.trackingStatus === "in_transit") return "In transit";
  if (result.trackingStatus === "pre_transit") return "Label created — awaiting USPS scan";
  if (result.status === "paid") return "Paid — preparing to ship";
  if (result.status === "shipped") return "Shipped";
  return result.status;
}

function TrackContent() {
  const params = useSearchParams();
  const initialOrder = params.get("order") || "";
  const initialEmail = params.get("email") || "";

  const [orderId, setOrderId] = useState(initialOrder);
  const [email, setEmail] = useState(initialEmail);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialOrder && initialEmail) {
      lookup(initialOrder, initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(id: string, em: string) {
    setError("");
    setResult(null);
    const res = await fetch(
      `/api/orders/track?order=${encodeURIComponent(id)}&email=${encodeURIComponent(em)}`
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Order not found");
      return;
    }
    setResult(data);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    lookup(orderId, email);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Track your order</h1>
      <p className="mt-1 text-sm text-stone-600">
        Use the order ID from your confirmation email and the email you checked out with.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Order ID
          <input
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. 062374b8-1de2-4c61-8bd9-9e43ff15771b"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-stone-900 py-3 font-medium text-white hover:bg-stone-700"
        >
          Look up order
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5 text-sm">
          <p className="font-medium">{statusLabel(result)}</p>
          <p className="mt-1 text-stone-500">
            Placed {new Date(result.createdAt).toLocaleString()}
            {result.deliveredAt &&
              ` · Delivered ${new Date(result.deliveredAt).toLocaleString()}`}
          </p>

          {result.trackingNumber ? (
            <div className="mt-4 rounded-lg bg-green-50 p-4 text-green-900">
              <p>
                <strong>{result.trackingCarrier}</strong> — {result.trackingNumber}
              </p>
              {result.trackingUrl && (
                <a
                  href={result.trackingUrl}
                  className="mt-2 inline-block font-medium underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Track package →
                </a>
              )}
            </div>
          ) : result.status === "paid" ? (
            <p className="mt-4 text-stone-600">
              Your order is paid and will ship soon. We&apos;ll email you when tracking is available.
            </p>
          ) : null}

          <ul className="mt-4 space-y-1 border-t border-stone-100 pt-4">
            {result.items.map((i, idx) => (
              <li key={idx}>
                {i.name} × {i.quantity}
              </li>
            ))}
          </ul>
          <p className="mt-2 font-medium">Total: ${result.total.toFixed(2)}</p>
        </div>
      )}

      <Link href="/" className="mt-8 inline-block text-sm underline">
        Back to shop
      </Link>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense>
      <TrackContent />
    </Suspense>
  );
}
