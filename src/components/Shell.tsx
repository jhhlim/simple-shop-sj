"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { CookieConsent } from "@/components/CookieConsent";
import { useCart } from "@/components/CartProvider";

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
        <p className="mt-2">
          <a href="/contact" className="underline hover:text-stone-800">
            Customer support
          </a>
        </p>
      </footer>
      <CookieConsent />
    </>
  );
}
