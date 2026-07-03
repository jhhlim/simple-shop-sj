"use client";

import type { ReactNode } from "react";
import { BROWSE_CATEGORIES, type BrowseCategoryId } from "@/lib/browse-categories";

const CATEGORY_ICONS: Record<BrowseCategoryId, ReactNode> = {
  clothing: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
    </svg>
  ),
  shoes: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  bags: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5M4.5 10.5h15m-15 0v7.125c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V10.5" />
    </svg>
  ),
  jewelry: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  ),
  accessories: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  toys: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.43-.85.243-.174.514-.237.787-.174 1.49.33 2.674 1.49 3.004 2.98.063.273 0 .544-.174.787-.174.244-.495.43-.85.43h-3.18c-.355 0-.676-.186-.85-.43a1.125 1.125 0 00-.787-.174c-1.49.33-2.674 1.49-3.004 2.98a1.125 1.125 0 00.174.787c.174.244.495.43.85.43h3.18c.355 0 .676.186.85.43.174.243.237.514.174.787-.33 1.49-1.49 2.674-2.98 3.004a1.125 1.125 0 01-.787.174c-.273-.063-.544 0-.787.174-.244.174-.43.495-.43.85v3.18c0 .355.186.676.43.85.243.174.514.237.787.174 1.49-.33 2.674-1.49 3.004-2.98.063-.273 0-.544.174-.787.174-.244.495-.43.85-.43h3.18c.355 0 .676-.186.85-.43.174-.243.237-.514.174-.787-.33-1.49-1.49-2.674-2.98-3.004a1.125 1.125 0 00-.787-.174c-.273.063-.544 0-.787-.174-.244-.174-.43-.495-.43-.85v-3.18c0-.355-.186-.676-.43-.85a1.125 1.125 0 00-.787-.174c-1.49.33-2.674 1.49-3.004 2.98a1.125 1.125 0 00.174.787c.174.244.495.43.85.43h3.18z" />
    </svg>
  ),
  collectibles: (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.52 0" />
    </svg>
  ),
  "new-arrivals": (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </svg>
  ),
};

type CategoryGridProps = {
  activeCategory: BrowseCategoryId | "all";
  onSelectCategory: (id: BrowseCategoryId | "all") => void;
};

export function CategoryGrid({ activeCategory, onSelectCategory }: CategoryGridProps) {
  function handleSelect(id: BrowseCategoryId) {
    onSelectCategory(id);
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section aria-labelledby="shop-by-category-heading">
      <h2 id="shop-by-category-heading" className="text-lg font-semibold tracking-tight text-stone-900">
        Shop by Category
      </h2>
      <p className="mt-1 text-sm text-stone-500">Browse our curated collections</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BROWSE_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleSelect(category.id)}
              className={`group flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all ${
                isActive
                  ? "border-stone-900 bg-stone-900 text-white shadow-sm"
                  : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:shadow-sm"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  isActive ? "bg-white/15 text-white" : "bg-stone-100 text-stone-600 group-hover:bg-stone-50"
                }`}
              >
                {CATEGORY_ICONS[category.id]}
              </span>
              <span className="text-sm font-medium">{category.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
