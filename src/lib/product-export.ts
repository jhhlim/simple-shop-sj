import { SHOP_CATEGORY_LABELS } from "./catalog-import";
import type { Product } from "./types";

export const PRODUCT_EXPORT_HEADERS = [
  "Name",
  "Description",
  "Price",
  "Category",
  "Stock",
  "SKU",
  "Image URL",
] as const;

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function productToExportRow(product: Product): string[] {
  return [
    product.name,
    product.description,
    product.price.toFixed(2),
    SHOP_CATEGORY_LABELS[product.category],
    String(product.stock),
    product.sku || "",
    product.imageUrl,
  ];
}

export function productsToCsv(products: Product[]): string {
  const lines = [PRODUCT_EXPORT_HEADERS.join(",")];
  for (const product of products) {
    lines.push(productToExportRow(product).map(csvEscape).join(","));
  }
  return lines.join("\n");
}
