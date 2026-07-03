import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-stone-200 bg-white px-6 py-12 sm:px-10 sm:py-16">
      <div className="relative z-10 max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-stone-500">
          Curated resale · Ships from California
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          Discover Quality Fashion, Toys &amp; Unique Finds
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-600 sm:text-lg">
          Carefully inspected clothing, shoes, bags, jewelry, toys, collectibles, and everyday
          treasures — thoughtfully sourced and ready for a new home.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#catalog"
            className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            Shop Now
          </a>
          <a
            href="#new-arrivals"
            className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition-colors hover:bg-stone-50"
          >
            New Arrivals
          </a>
        </div>
      </div>
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-stone-100/80 blur-3xl"
        aria-hidden
      />
    </section>
  );
}
