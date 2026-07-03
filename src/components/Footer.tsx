"use client";

import Link from "next/link";
import { SHOP_NAME } from "@/lib/constants";
import { openCookieSettings } from "@/lib/cookie-consent";

const FOOTER_LINKS = {
  shop: [
    { href: "/", label: "Shop" },
    { href: "/#new-arrivals", label: "New Arrivals" },
    { href: "/#catalog", label: "All Products" },
  ],
  company: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ],
  support: [
    { href: "/shipping", label: "Shipping" },
    { href: "/returns", label: "Returns" },
    { href: "/track", label: "Track Order" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms" },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-base font-semibold text-stone-900">{SHOP_NAME}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
              Family-owned resale — quality fashion, toys &amp; unique finds. Ships from California.
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">Shop</p>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.shop.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-600 hover:text-stone-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">Company</p>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-600 hover:text-stone-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-stone-400">
              Support
            </p>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-600 hover:text-stone-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-stone-400">Legal</p>
            <ul className="mt-3 space-y-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-stone-600 hover:text-stone-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-stone-200 pt-6 text-center text-xs text-stone-500 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} {SHOP_NAME}. All sales final unless noted in listing.</p>
          <FooterCookieButton />
        </div>
      </div>
    </footer>
  );
}

function FooterCookieButton() {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="text-xs text-stone-500 underline hover:text-stone-800"
    >
      Cookie settings
    </button>
  );
}
