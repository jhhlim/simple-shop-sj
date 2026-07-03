"use client";

import { useEffect, useState } from "react";
import { PENDING_ORDER_MINUTES } from "@/lib/constants";

const STORAGE_KEY = "limware_pending_order";

type PendingOrder = {
  orderId: string;
  expiresAt: string;
};

export function savePendingOrder(order: PendingOrder) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function clearPendingOrder() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function loadPendingOrder(): PendingOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingOrder;
  } catch {
    return null;
  }
}

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function PendingOrderBanner() {
  const [pending, setPending] = useState<PendingOrder | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const stored = loadPendingOrder();
    if (!stored) return;
    setPending(stored);

    const tick = () => {
      const ms = new Date(stored.expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setExpired(true);
        setRemainingMs(0);
        clearPendingOrder();
        return;
      }
      setRemainingMs(ms);
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!pending) return null;

  if (expired) {
    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Your reserved order has expired. Items may no longer be held — please review your cart and
        checkout again.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950">
      <p className="font-medium">
        Your order is held for {PENDING_ORDER_MINUTES} minutes — complete checkout ASAP.
      </p>
      <p className="mt-1">
        Time remaining: <strong>{formatRemaining(remainingMs)}</strong>
      </p>
    </div>
  );
}
