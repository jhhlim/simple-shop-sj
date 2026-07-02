import Link from "next/link";
import type { ReactNode } from "react";
import { SHOP_NAME } from "@/lib/constants";

const LAST_UPDATED = "July 1, 2026";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-stone-500">
        <Link href="/" className="underline hover:text-stone-800">
          Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-stone-500">Last updated: {LAST_UPDATED}</p>
      <div className="prose prose-stone mt-8 max-w-none text-sm leading-relaxed text-stone-800 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-medium [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
      <p className="mt-10 border-t border-stone-200 pt-6 text-xs text-stone-500">
        These materials are provided for general information about {SHOP_NAME} and are not legal
        advice. Consider having a qualified attorney review them for your business.
      </p>
    </div>
  );
}
