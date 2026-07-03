import Link from "next/link";
import { SHIPPING_FEE, SHIPPING_LABEL_NOTE, SHOP_NAME } from "@/lib/constants";

export const metadata = {
  title: `Shipping — ${SHOP_NAME}`,
  description: `Shipping information for ${SHOP_NAME}. Flat $${SHIPPING_FEE} rate, ships from California.`,
};

export default function ShippingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-stone-500">
        <Link href="/" className="underline hover:text-stone-800">
          Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Shipping</h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-700 sm:text-base">
        <section>
          <h2 className="text-lg font-medium text-stone-900">Flat rate shipping</h2>
          <p className="mt-2">
            Every order includes a flat <strong>${SHIPPING_FEE.toFixed(2)}</strong> shipping fee,
            regardless of how many items you purchase.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Ships from California</h2>
          <p className="mt-2">
            All orders are packed and shipped from our family-owned fulfillment location in
            California, USA.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Processing &amp; delivery</h2>
          <p className="mt-2">{SHIPPING_LABEL_NOTE}</p>
          <p className="mt-2">
            Most orders ship within 1–3 business days after payment is confirmed. Delivery times
            vary by carrier and destination.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-medium text-stone-900">Track your order</h2>
          <p className="mt-2">
            Once your package ships, you&apos;ll receive tracking information by email. You can also{" "}
            <Link href="/track" className="font-medium text-stone-900 underline hover:text-stone-700">
              track your order
            </Link>{" "}
            on our website.
          </p>
        </section>
      </div>
    </div>
  );
}
