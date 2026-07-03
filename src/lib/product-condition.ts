import type { Product, ProductCondition } from "./types";

export type { ProductCondition };

export const PRODUCT_CONDITIONS: ProductCondition[] = [
  "new",
  "excellent",
  "pre-owned",
  "fair",
];

const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New",
  excellent: "Excellent",
  "pre-owned": "Pre-Owned",
  fair: "Fair",
};

export function isProductCondition(value: unknown): value is ProductCondition {
  return typeof value === "string" && PRODUCT_CONDITIONS.includes(value as ProductCondition);
}

export function normalizeProductCondition(value: unknown): ProductCondition | undefined {
  return isProductCondition(value) ? value : undefined;
}

export function getProductCondition(product: Product): ProductCondition {
  if (product.condition) return product.condition;

  const text = `${product.name} ${product.description}`.toLowerCase();

  if (/\b(brand new|new with tags|nwt|nwot|sealed|unused|\bnew\b)/.test(text)) {
    return "new";
  }
  if (/\b(excellent|like new|mint|pristine|lnwot|near mint)/.test(text)) {
    return "excellent";
  }
  if (/\b(fair|worn|well used|heavy wear|damaged)/.test(text)) {
    return "fair";
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
    case "fair":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    default:
      return "bg-stone-100 text-stone-700 ring-stone-200";
  }
}
