import Link from "next/link";
import { SHOP_NAME } from "@/lib/constants";

export const metadata = {
  title: `Returns — ${SHOP_NAME}`,
  description: `Return and refund policy for ${SHOP_NAME}.`,
};

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-stone-500">
        <Link href="/" className="underline hover:text-stone-800">
          Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Returns &amp; Refunds</h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-700 sm:text-base">
        <section>
          <h2 className="text-lg font-medium text-stone-900">All sales final</h2>
          <p className="mt-2">
            As a resale shop, most items are one-of-a-kind pre-owned goods. Unless otherwise noted
            in a specific listing, all sales are final.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Item not as described?</h2>
          <p className="mt-2">
            We describe every item honestly with photos and condition notes. If you receive an item
            that is materially different from its listing, please{" "}
            <Link href="/contact" className="font-medium text-stone-900 underline hover:text-stone-700">
              contact us
            </Link>{" "}
            within 3 days of delivery with photos. We&apos;ll work with you to make it right.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Damaged in transit</h2>
          <p className="mt-2">
            If your order arrives damaged, contact us promptly with photos of the packaging and item.
            We pack carefully, but we&apos;ll help resolve shipping damage on a case-by-case basis.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Questions</h2>
          <p className="mt-2">
            See our full{" "}
            <Link href="/terms" className="font-medium text-stone-900 underline hover:text-stone-700">
              Terms of Service
            </Link>{" "}
            for complete policy details, or reach out via our{" "}
            <Link href="/contact" className="font-medium text-stone-900 underline hover:text-stone-700">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
