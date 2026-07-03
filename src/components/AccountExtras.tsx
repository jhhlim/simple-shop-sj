"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Order } from "@/lib/types";

export function AccountOrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/account/orders")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setOrders(data.orders || []);
      })
      .catch(() => setError("Could not load orders"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-stone-500">Loading order history…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (orders.length === 0) {
    return <p className="text-sm text-stone-500">No orders yet.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-lg border border-stone-200 bg-white p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">
                {new Date(order.createdAt).toLocaleDateString()} — ${order.total.toFixed(2)}
              </p>
              <p className="text-stone-500 capitalize">Status: {order.status}</p>
              <p className="text-stone-500">
                {order.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}
              </p>
            </div>
            <Link
              href={`/track?order=${order.id}&email=${encodeURIComponent(order.shipping.email)}`}
              className="text-xs font-medium underline"
            >
              Track
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not update password");
      return;
    }

    setMessage("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-5 text-sm">
      <h2 className="font-medium">Change password</h2>
      <label className="block">
        Current password
        <input
          required
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="block">
        New password
        <input
          required
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="block">
        Confirm new password
        <input
          required
          type="password"
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      {error && <p className="text-red-600">{error}</p>}
      {message && <p className="text-green-700">{message}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-stone-900 px-4 py-2 text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
