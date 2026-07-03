"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAdminGate } from "@/components/AdminAuth";

type CouponRow = { code: string; percentOff: number; active: boolean };

export default function AdminCouponsPage() {
  const { ready } = useAdminGate();
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [message, setMessage] = useState("");
  const [couponForm, setCouponForm] = useState({ code: "", percentOff: "10" });

  async function loadCoupons() {
    const res = await fetch("/api/admin/coupons");
    if (!res.ok) return;
    const data = await res.json();
    setCoupons(data.coupons || []);
  }

  useEffect(() => {
    if (ready) {
      loadCoupons();
    }
  }, [ready]);

  async function handleCreateCoupon(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponForm.code,
        percentOff: Number(couponForm.percentOff),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to create coupon");
      return;
    }
    setCouponForm({ code: "", percentOff: "10" });
    setMessage(`Coupon ${data.code} created.`);
    await loadCoupons();
  }

  async function toggleCoupon(code: string, active: boolean) {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, active }),
    });
    await loadCoupons();
  }

  async function removeCoupon(code: string) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
    });
    await loadCoupons();
  }

  if (!ready) {
    return <div className="px-4 py-16 text-center text-sm text-stone-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Coupon codes</h1>
        <p className="mt-1 text-sm text-stone-600">
          Create and manage discount codes for checkout.
        </p>
      </div>

      <form
        onSubmit={handleCreateCoupon}
        className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5"
      >
        <h2 className="font-medium">Add coupon</h2>
        <div className="flex flex-wrap gap-3">
          <input
            required
            placeholder="CODE"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase"
          />
          <input
            required
            type="number"
            min="1"
            max="100"
            value={couponForm.percentOff}
            onChange={(e) => setCouponForm({ ...couponForm, percentOff: e.target.value })}
            className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <span className="self-center text-sm text-stone-500">% off</span>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700"
          >
            Add coupon
          </button>
        </div>
      </form>

      <div className="mt-8 space-y-3">
        <h2 className="font-medium">Current coupons ({coupons.length})</h2>
        {coupons.length === 0 ? (
          <p className="text-sm text-stone-500">No coupons yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {coupons.map((c) => (
              <li
                key={c.code}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3"
              >
                <span>
                  <strong>{c.code}</strong> — {c.percentOff}% off{" "}
                  {!c.active && <span className="text-amber-700">(inactive)</span>}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCoupon(c.code, !c.active)}
                    className="underline"
                  >
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeCoupon(c.code)}
                    className="text-red-600 underline"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {message && <p className="mt-4 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
