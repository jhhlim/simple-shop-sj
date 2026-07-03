import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

type ProductRowProps = {
  id?: string;
  title: string;
  subtitle?: string;
  products: Product[];
  viewAllHref?: string;
  viewAllLabel?: string;
};

export function ProductRow({
  id,
  title,
  subtitle,
  products,
  viewAllHref,
  viewAllLabel = "View all",
}: ProductRowProps) {
  if (products.length === 0) return null;

  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2
            id={id ? `${id}-heading` : undefined}
            className="text-lg font-semibold tracking-tight text-stone-900"
          >
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="shrink-0 text-sm font-medium text-stone-600 hover:text-stone-900"
          >
            {viewAllLabel} →
          </Link>
        )}
      </div>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} compact />
        ))}
      </div>
    </section>
  );
}
