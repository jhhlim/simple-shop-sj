import type { Product } from "./types";

export type ProductCondition = "new" | "excellent" | "pre-owned";

const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New",
  excellent: "Excellent",
  "pre-owned": "Pre-Owned",
};

export function getProductCondition(product: Product): ProductCondition {
  if (product.condition) return product.condition;

  const text = `${product.name} ${product.description}`.toLowerCase();

  if (/\b(brand new|new with tags|nwt|nwot|sealed|unused|\bnew\b)/.test(text)) {
    return "new";
  }
  if (/\b(excellent|like new|mint|pristine|lnwot|near mint)/.test(text)) {
    return "excellent";
  }
  if (product.category === "jewelry") return "excellent";
  return "pre-owned";
}

export function getConditionLabel(condition: ProductCondition): string {
  return CONDITION_LABELS[condition];
}

export function getConditionStyles(condition: ProductCondition): string {
  switch (condition) {
    case "new":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "excellent":
      return "bg-sky-50 text-sky-800 ring-sky-200";
    default:
      return "bg-stone-100 text-stone-700 ring-stone-200";
  }
}
