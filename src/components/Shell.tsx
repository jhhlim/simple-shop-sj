"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CookieConsent } from "@/components/CookieConsent";
import { useCart } from "@/components/CartProvider";
import { openCookieSettings } from "@/lib/cookie-consent";

export function Shell({ children }: { children: React.ReactNode }) {
  const { totalItems } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <Header cartCount={mounted ? totalItems : 0} />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-stone-200 bg-stone-50 py-6 text-center text-sm text-stone-500">
        <p>Used goods &amp; jewelry — all sales final unless noted in listing.</p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <a href="/terms" className="underline hover:text-stone-800">
            Terms
          </a>
          <span aria-hidden>·</span>
          <a href="/privacy" className="underline hover:text-stone-800">
            Privacy
          </a>
          <span aria-hidden>·</span>
          <a href="/contact" className="underline hover:text-stone-800">
            Customer support
          </a>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={openCookieSettings}
            className="underline hover:text-stone-800"
          >
            Cookie settings
          </button>
        </p>
      </footer>
      <CookieConsent />
    </>
  );
}
