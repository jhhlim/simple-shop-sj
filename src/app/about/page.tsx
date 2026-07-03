import Link from "next/link";
import { SHOP_NAME } from "@/lib/constants";

export const metadata = {
  title: `About — ${SHOP_NAME}`,
  description: `Learn about ${SHOP_NAME}, a family-owned resale shop based in California.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-stone-500">
        <Link href="/" className="underline hover:text-stone-800">
          Home
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">About {SHOP_NAME}</h1>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-stone-700 sm:text-base">
        <p>
          {SHOP_NAME} is a family-owned resale business based in California. We source clothing,
          shoes, bags, jewelry, accessories, toys, and collectibles — giving quality pre-loved items
          a second chance at great prices.
        </p>
        <p>
          Every listing is carefully inspected, photographed, and described with honesty. We pack
          each order with care and ship from California with a flat $5 shipping rate on every order.
        </p>
        <p>
          We believe sustainable shopping should feel simple, trustworthy, and personal. Whether
          you&apos;re hunting for a vintage find or a everyday staple, we&apos;re glad you&apos;re here.
        </p>
        <p>
          <Link href="/contact" className="font-medium text-stone-900 underline hover:text-stone-700">
            Contact us
          </Link>{" "}
          with any questions — we&apos;re happy to help.
        </p>
      </div>
    </div>
  );
}
