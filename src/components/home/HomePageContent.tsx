"use client";

import { useState } from "react";
import { ProductCatalog } from "@/components/ProductCatalog";
import { AboutSection } from "@/components/home/AboutSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HeroSection } from "@/components/home/HeroSection";
import { ProductRow } from "@/components/home/ProductRow";
import { TrustBar } from "@/components/home/TrustBar";
import {
  AIAssistantPlaceholder,
  InventorySyncPlaceholder,
  RecommendationsPlaceholder,
  ResellFlowPlaceholder,
} from "@/components/home/FutureReadySections";
import {
  getFeaturedProducts,
  getNewArrivalProducts,
  type BrowseCategoryId,
} from "@/lib/browse-categories";
import type { Product } from "@/lib/types";

export function HomePageContent({ products }: { products: Product[] }) {
  const [browseCategory, setBrowseCategory] = useState<BrowseCategoryId | "all">("all");

  const featured = getFeaturedProducts(products, 6);
  const newArrivals = getNewArrivalProducts(products, 8);

  function handleCategorySelect(id: BrowseCategoryId | "all") {
    setBrowseCategory(id);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:py-10">
      {/* ——— Hero ——— */}
      <HeroSection />

      {/* ——— Trust & shipping ——— */}
      <TrustBar />

      {/* FUTURE: AIAssistantPlaceholder — mount conversational widget here */}
      <AIAssistantPlaceholder />

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
          No items listed yet. Check back soon for new finds.
        </div>
      ) : (
        <>
          {/* ——— Shop by Category ——— */}
          <CategoryGrid activeCategory={browseCategory} onSelectCategory={handleCategorySelect} />

          {/* FUTURE: RecommendationsPlaceholder — personalized picks above featured */}
          <RecommendationsPlaceholder />

          {/* ——— Featured Products ——— */}
          <ProductRow
            title="Featured Products"
            subtitle="Hand-picked favorites from our collection"
            products={featured}
            viewAllHref="#catalog"
          />

          {/* ——— New Arrivals ——— */}
          <ProductRow
            id="new-arrivals"
            title="New Arrivals"
            subtitle="Fresh listings added recently"
            products={newArrivals}
            viewAllHref="#catalog"
            viewAllLabel="Browse all"
          />

          {/* ——— Full Catalog ——— */}
          <section id="catalog" className="scroll-mt-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">All Products</h2>
              <p className="mt-1 text-sm text-stone-500">Explore our full catalog</p>
            </div>
            <ProductCatalog
              products={products}
              browseCategory={browseCategory}
              onBrowseCategoryChange={handleCategorySelect}
            />
          </section>
        </>
      )}

      {/* FUTURE: ResellFlowPlaceholder — "Sell to us" CTA section */}
      <ResellFlowPlaceholder />

      {/* ——— About ——— */}
      <AboutSection />

      {/* FUTURE: InventorySyncPlaceholder — marketplace sync status */}
      <InventorySyncPlaceholder />
    </div>
  );
}
