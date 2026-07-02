"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SHOP_NAME } from "@/lib/constants";

const CONSENT_KEY = "limware-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem(CONSENT_KEY);
      if (!accepted) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // ignore storage errors
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white p-4 shadow-lg sm:p-5"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-stone-700">
          {SHOP_NAME} uses essential cookies for your cart, sign-in session, and site functionality.
          By continuing to use this site, you agree to our{" "}
          <Link href="/privacy" className="font-medium underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="font-medium underline">
            Terms
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
