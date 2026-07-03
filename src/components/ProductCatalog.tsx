"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import {
  BROWSE_CATEGORIES,
  productMatchesBrowseCategory,
  type BrowseCategoryId,
} from "@/lib/browse-categories";
import type { Product } from "@/lib/types";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const PAGE_SIZE_OPTIONS = [20, 30, 40, 50] as const;

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

type ProductCatalogProps = {
  products: Product[];
  browseCategory?: BrowseCategoryId | "all";
  onBrowseCategoryChange?: (category: BrowseCategoryId | "all") => void;
};

export function ProductCatalog({
  products,
  browseCategory: externalBrowseCategory,
  onBrowseCategoryChange,
}: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [internalBrowseCategory, setInternalBrowseCategory] = useState<BrowseCategoryId | "all">(
    "all"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const browseCategory = externalBrowseCategory ?? internalBrowseCategory;

  function setBrowseCategory(next: BrowseCategoryId | "all") {
    if (onBrowseCategoryChange) {
      onBrowseCategoryChange(next);
    } else {
      setInternalBrowseCategory(next);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (!productMatchesBrowseCategory(p, browseCategory)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, query, browseCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [query, browseCategory, pageSize]);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  function scrollToTop() {
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToPage(nextPage: number) {
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped === safePage) return;
    setPage(clamped);
    scrollToTop();
  }

  function onPageSizeChange(value: number) {
    const clamped = Math.min(Math.max(1, value), MAX_PAGE_SIZE);
    setPageSize(clamped);
  }

  const visiblePages = getVisiblePages(safePage, totalPages);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, filtered.length);

  const activeLabel =
    browseCategory === "all"
      ? "All items"
      : BROWSE_CATEGORIES.find((c) => c.id === browseCategory)?.label ?? "All items";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="What are you looking for today?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm placeholder:text-stone-400 focus:border-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-400 sm:max-w-md"
        />
        {browseCategory !== "all" && (
          <button
            type="button"
            onClick={() => setBrowseCategory("all")}
            className="shrink-0 self-start rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700 hover:bg-stone-200"
          >
            Clear filter: {activeLabel} ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
          No items match your search.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {rangeStart}–{rangeEnd} of {filtered.length}
              {browseCategory !== "all" && (
                <span className="text-stone-400"> in {activeLabel}</span>
              )}
            </p>
            <label className="flex items-center gap-2">
              <span>Per page</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paginated.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
              aria-label="Catalog pagination"
            >
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  ← Prev
                </button>

                <div className="flex items-center gap-1 px-1">
                  {visiblePages.map((item, index) =>
                    item === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 py-2 text-sm text-stone-400"
                        aria-hidden
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => goToPage(item)}
                        aria-current={item === safePage ? "page" : undefined}
                        className={`min-w-9 rounded-lg px-3 py-2 text-sm ${
                          item === safePage
                            ? "bg-stone-900 text-white"
                            : "border border-stone-300 text-stone-700 hover:bg-stone-50"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  Next →
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
