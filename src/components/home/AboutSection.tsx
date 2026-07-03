import Link from "next/link";
import { SHOP_NAME } from "@/lib/constants";

export function AboutSection() {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="rounded-2xl border border-stone-200 bg-white px-6 py-10 sm:px-10"
    >
      <h2 id="about-heading" className="text-lg font-semibold tracking-tight text-stone-900">
        About {SHOP_NAME}
      </h2>
      <div className="mt-4 max-w-2xl space-y-3 text-sm leading-relaxed text-stone-600 sm:text-base">
        <p>
          {SHOP_NAME} is a family-owned resale shop based in California. We hand-select clothing,
          accessories, jewelry, toys, and collectibles — giving great pieces a second life at fair
          prices.
        </p>
        <p>
          Every item is carefully inspected, photographed, and described honestly before it goes
          live. We believe in sustainable shopping, transparent pricing, and treating every customer
          like a neighbor.
        </p>
        <p>
          Questions?{" "}
          <Link href="/contact" className="font-medium text-stone-900 underline hover:text-stone-700">
            Get in touch
          </Link>{" "}
          — we&apos;re always happy to help.
        </p>
      </div>
    </section>
  );
}
