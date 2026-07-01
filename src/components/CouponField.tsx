"use client";

import { FormEvent, useState } from "react";

type CouponFieldProps = {
  couponCode: string | null;
  onApply: (code: string | null) => void;
  disabled?: boolean;
};

export function CouponField({ couponCode, onApply, disabled }: CouponFieldProps) {
  const [input, setInput] = useState(couponCode || "");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    const code = input.trim();
    if (!code) {
      setError("Enter a coupon code");
      return;
    }

    setChecking(true);
    setError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        valid?: boolean;
        code?: string;
        percentOff?: number;
        error?: string;
      };
      if (!res.ok || !data.valid) {
        setError(data.error || "Invalid coupon code");
        return;
      }
      onApply(data.code || code.toUpperCase());
      setInput(data.code || code.toUpperCase());
    } catch {
      setError("Could not validate coupon. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function handleRemove() {
    setInput("");
    setError("");
    onApply(null);
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
      <p className="font-medium">Coupon code</p>
      {couponCode ? (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-green-800">
            <span className="font-medium">{couponCode}</span> applied
          </p>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="text-stone-600 underline hover:text-stone-900 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <form onSubmit={handleApply} className="mt-2 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="e.g. OFF10"
            disabled={disabled || checking}
            className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 uppercase"
          />
          <button
            type="submit"
            disabled={disabled || checking}
            className="rounded-lg border border-stone-300 px-4 py-2 font-medium hover:bg-stone-50 disabled:opacity-50"
          >
            {checking ? "…" : "Apply"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
