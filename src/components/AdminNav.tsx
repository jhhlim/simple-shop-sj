"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Listings", prefix: "/admin", exact: true },
  { href: "/admin/import", label: "Import & Export", prefix: "/admin/import" },
  { href: "/admin/coupons", label: "Coupons", prefix: "/admin/coupons" },
  { href: "/admin/orders", label: "Orders", prefix: "/admin/orders" },
] as const;

function isActive(pathname: string, tab: (typeof TABS)[number]): boolean {
  if ("exact" in tab && tab.exact) {
    return pathname === tab.href;
  }
  return pathname === tab.href || pathname.startsWith(`${tab.prefix}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-1 px-4 py-2">
        <p className="mr-4 self-center text-xs font-semibold uppercase tracking-wide text-stone-400">
          Store admin
        </p>
        {TABS.map((tab) => {
          const active = isActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
