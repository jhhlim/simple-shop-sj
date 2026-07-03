"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, AdminLoginForm, useAdminAuth } from "@/components/AdminAuth";
import type { Order } from "@/lib/types";

export default function AdminOrdersPage() {
  const { authenticated, checking, error, login, logout } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [loadingLabel, setLoadingLabel] = useState<string | null>(null);
  const [shippoReady, setShippoReady] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [shipForms, setShipForms] = useState<
    Record<string, { trackingNumber: string; trackingCarrier: string }>
  >({});

  async function loadOrders() {
    const res = await adminFetch("/api/admin/orders");
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.orders || []);
  }

  async function loadShippingStatus() {
    const res = await adminFetch("/api/admin/shipping/status");
    if (!res.ok) return;
    const data = await res.json();
    setShippoReady(!!data.shippo?.configured);
    setWebhookUrl(data.shippo?.webhookUrl || "");
    setEmailHint(data.email?.setupHint || null);
  }

  useEffect(() => {
    if (authenticated) {
      loadOrders();
      loadShippingStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  async function createLabel(orderId: string) {
    setLoadingLabel(orderId);
    setMessage("");
    const res = await adminFetch(`/api/admin/orders/${orderId}/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sendEmail: true }),
    });
    const data = await res.json();
    setLoadingLabel(null);

    if (!res.ok) {
      setMessage(data.error || "Failed to create label");
      return;
    }

    const cost = data.label?.cost ? ` (label cost: $${data.label.cost})` : "";
    if (data.email && !data.email.ok) {
      setMessage(
        `Label created${cost}. Tracking: ${data.label.trackingNumber}. Customer was NOT emailed — ${data.email.error} Fix: verify a domain at resend.com/domains and set SHOP_EMAIL_FROM on Vercel.`
      );
    } else {
      setMessage(
        `USPS label created${cost}. Customer emailed with tracking ${data.label.trackingNumber}.`
      );
    }
    if (data.label?.url) {
      window.open(data.label.url, "_blank");
    }
    await loadOrders();
  }

  async function markShippedManual(orderId: string) {
    const form = shipForms[orderId];
    if (!form?.trackingNumber || !form?.trackingCarrier) {
      setMessage("Enter tracking number and carrier");
      return;
    }
    setMessage("");
    const res = await adminFetch(`/api/admin/orders/${orderId}/ship`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, sendEmail: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to mark shipped");
      return;
    }
    setMessage("Manual tracking saved — customer emailed.");
    await loadOrders();
  }

  if (checking) {
    return <div className="px-4 py-16 text-center text-sm text-stone-500">Loading…</div>;
  }

  if (!authenticated) {
    return (
      <div>
        <AdminLoginForm onLogin={login} error={error} />
      </div>
    );
  }

  const needsShip = orders.filter((o) => o.status === "paid" && !o.trackingNumber);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders &amp; shipping</h1>
          <p className="mt-1 text-sm text-stone-600">
            Create USPS labels with Shippo, email tracking automatically.
          </p>
        </div>
        <Link href="/admin" className="text-sm underline">
          Products
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="text-sm text-stone-500 underline"
        >
          Log out
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-lg bg-stone-100 p-3 text-sm text-stone-800">{message}</p>
      )}

      <div className="mt-6 space-y-4">
        <div
          className={`rounded-xl border p-4 text-sm ${
            shippoReady
              ? "border-green-200 bg-green-50 text-green-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <p className="font-medium">
            Shippo {shippoReady ? "connected" : "not configured"}
          </p>
          {shippoReady ? (
            <p className="mt-1">
              Click <strong>Create USPS label</strong> on a paid order. Label PDF opens in a new
              tab; customer gets tracking email.
            </p>
          ) : (
            <p className="mt-1">
              Add <code className="rounded bg-white/60 px-1">SHIPPO_API_TOKEN</code> and your ship-from
              address vars to <code className="rounded bg-white/60 px-1">.env.local</code> (see README).
            </p>
          )}
        </div>

        {emailHint && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p className="font-medium">Customer emails need a verified domain (Resend)</p>
            <p className="mt-1">{emailHint}</p>
            <p className="mt-2">
              Until then, labels and tracking still work — copy the tracking number to the customer
              manually, or email them from{" "}
              <a href="mailto:limware@yahoo.com" className="underline">
                limware@yahoo.com
              </a>
              .
            </p>
          </div>
        )}

        {webhookUrl && (
          <details className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <summary className="cursor-pointer font-medium">Shippo tracking webhook (optional)</summary>
            <p className="mt-2 text-stone-600">
              In Shippo → Settings → API → Webhooks, add event <strong>track_updated</strong>:
            </p>
            <code className="mt-2 block break-all rounded bg-stone-100 p-2 text-xs">{webhookUrl}</code>
            <p className="mt-2 text-stone-500">
              Sends in-transit and delivered emails automatically when USPS scans the package.
            </p>
          </details>
        )}
      </div>

      <p className="mt-4 text-sm text-stone-600">
        {needsShip.length} order(s) ready to ship
      </p>

      <div className="mt-4 space-y-4">
        {orders.length === 0 ? (
          <p className="text-stone-500">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-stone-200 bg-white p-4 text-sm"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {order.shipping.fullName} — ${order.total.toFixed(2)}
                  </p>
                  <p className="text-stone-500">
                    {order.id.slice(0, 8)}… · {order.status}
                    {order.trackingStatus ? ` · ${order.trackingStatus.replace("_", " ")}` : ""}
                  </p>
                  <p className="text-stone-600">
                    {order.shipping.street}
                    {order.shipping.street2 ? `, ${order.shipping.street2}` : ""},{" "}
                    {order.shipping.city}, {order.shipping.state} {order.shipping.zip}
                  </p>
                  <p className="text-stone-500">{order.shipping.email}</p>
                </div>
                <div className="text-right text-stone-600">
                  {order.items.map((i) => (
                    <div key={i.productId}>
                      {i.name} × {i.quantity}
                    </div>
                  ))}
                </div>
              </div>

              {order.trackingNumber ? (
                <div className="mt-3 rounded-lg bg-green-50 p-3 text-green-900">
                  <p>
                    {order.trackingCarrier}: <strong>{order.trackingNumber}</strong>
                    {order.labelCost != null && (
                      <span className="text-green-800"> · label ${order.labelCost.toFixed(2)}</span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {order.trackingUrl && (
                      <a href={order.trackingUrl} className="underline" target="_blank" rel="noreferrer">
                        Track package
                      </a>
                    )}
                    {order.labelUrl && (
                      <a href={order.labelUrl} className="underline" target="_blank" rel="noreferrer">
                        Print label
                      </a>
                    )}
                  </div>
                  {order.trackingEmailSentAt && (
                    <span className="mt-1 block text-xs text-green-800">
                      Shipped email {new Date(order.trackingEmailSentAt).toLocaleString()}
                    </span>
                  )}
                </div>
              ) : order.status === "paid" ? (
                <div className="mt-3 space-y-3">
                  {shippoReady && (
                    <button
                      type="button"
                      disabled={loadingLabel === order.id}
                      onClick={() => createLabel(order.id)}
                      className="w-full rounded-lg bg-stone-900 py-2.5 font-medium text-white hover:bg-stone-700 disabled:opacity-50 sm:w-auto sm:px-6"
                    >
                      {loadingLabel === order.id
                        ? "Creating label…"
                        : "Create USPS label (Shippo)"}
                    </button>
                  )}
                  <details className="text-stone-600">
                    <summary className="cursor-pointer text-xs">Manual tracking (Pirate Ship, etc.)</summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input
                        placeholder="Tracking number"
                        value={shipForms[order.id]?.trackingNumber || ""}
                        onChange={(e) =>
                          setShipForms((f) => ({
                            ...f,
                            [order.id]: {
                              trackingNumber: e.target.value,
                              trackingCarrier: f[order.id]?.trackingCarrier || "USPS",
                            },
                          }))
                        }
                        className="rounded-lg border border-stone-300 px-3 py-2"
                      />
                      <select
                        value={shipForms[order.id]?.trackingCarrier || "USPS"}
                        onChange={(e) =>
                          setShipForms((f) => ({
                            ...f,
                            [order.id]: {
                              trackingCarrier: e.target.value,
                              trackingNumber: f[order.id]?.trackingNumber || "",
                            },
                          }))
                        }
                        className="rounded-lg border border-stone-300 px-3 py-2"
                      >
                        <option value="USPS">USPS</option>
                        <option value="UPS">UPS</option>
                        <option value="FedEx">FedEx</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => markShippedManual(order.id)}
                        className="rounded-lg border border-stone-300 py-2 hover:bg-stone-50"
                      >
                        Save &amp; email
                      </button>
                    </div>
                  </details>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
