import { pickField, parseCsv, rowsToObjects } from "./csv-parse";
import type { Product } from "./types";

export type ImportFormat = "simple" | "square" | "ebay" | "unknown";

export type CatalogImportRow = {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: Product["category"];
  categoryLabel: string;
  sku: string;
  importHandle: string;
  importToken: string;
  imageUrl: string;
  archived: boolean;
  sourceFormat: ImportFormat;
  sourceCategory: string;
};

export type ImportPreview = {
  format: ImportFormat;
  totalRows: number;
  importable: CatalogImportRow[];
  skipped: { reason: string; name: string }[];
};

const JEWELRY_KEYWORDS = [
  "jewelry",
  "jewellery",
  "ring",
  "necklace",
  "bracelet",
  "earring",
  "pendant",
  "brooch",
  "watch",
  "gem",
];

export const SHOP_CATEGORY_LABELS: Record<Product["category"], string> = {
  goods: "Used goods",
  jewelry: "Jewelry",
  other: "Other",
};

/** Map spreadsheet Category column to shop category (matches admin dropdown). */
export function mapShopCategory(raw: string): Product["category"] {
  const c = raw.trim().toLowerCase();
  if (!c) return "goods";
  if (c === "jewelry" || c === "jewellery") return "jewelry";
  if (c === "other") return "other";
  if (c === "used goods" || c === "goods" || c === "used" || c === "used good") {
    return "goods";
  }
  if (JEWELRY_KEYWORDS.some((k) => c.includes(k))) return "jewelry";
  if (c === "misc" || c === "miscellaneous") return "other";
  return "goods";
}

function mapCategoryFromMarketplace(sourceCategory: string): Product["category"] {
  const c = sourceCategory.toLowerCase();
  if (JEWELRY_KEYWORDS.some((k) => c.includes(k))) return "jewelry";
  if (!c || c === "other") return "other";
  return "goods";
}

function parsePrice(raw: string, fallback = ""): number {
  const value = (raw || fallback).replace(/[$,]/g, "").trim();
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parseStock(...values: string[]): number {
  let best = -1;
  for (const v of values) {
    if (!v.trim()) continue;
    const n = Number(v.replace(/,/g, "").trim());
    if (Number.isFinite(n) && n >= 0) best = Math.max(best, Math.floor(n));
  }
  return best >= 0 ? best : 1;
}

function isArchived(row: Record<string, string>): boolean {
  const archived = pickField(row, ["Archived", "archived"]).toUpperCase();
  return archived === "Y" || archived === "YES" || archived === "TRUE";
}

function rowBase(
  partial: Omit<CatalogImportRow, "categoryLabel">
): CatalogImportRow {
  return {
    ...partial,
    categoryLabel: SHOP_CATEGORY_LABELS[partial.category],
  };
}

export function detectImportFormat(headers: string[]): ImportFormat {
  const joined = headers.join(" ").toLowerCase();
  if (isSimpleFormat(headers)) return "simple";
  if (joined.includes("reference handle") && joined.includes("item name")) return "square";
  if (
    joined.includes("custom label") ||
    joined.includes("start price") ||
    joined.includes("picurl") ||
    joined.includes("picture url")
  ) {
    return "ebay";
  }
  if (joined.includes("title") && joined.includes("quantity")) return "ebay";
  return "unknown";
}

function isSimpleFormat(headers: string[]): boolean {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const hasName = lower.some((h) => h === "name" || h === "title");
  const hasPrice = lower.some((h) => h === "price" || h === "price (usd)");
  const hasCategory = lower.some((h) => h === "category");
  return hasName && hasPrice && hasCategory;
}

function mapSimpleRow(row: Record<string, string>): CatalogImportRow | null {
  const name = pickField(row, ["Name", "Title", "Item Name", "name"]);
  if (!name) return null;

  const price = parsePrice(pickField(row, ["Price", "Price (USD)", "price"]));
  if (price <= 0) return null;

  const categoryRaw = pickField(row, ["Category", "category"]);
  const category = mapShopCategory(categoryRaw);

  return rowBase({
    name,
    description: pickField(row, ["Description", "description"]) || name,
    price,
    stock: parseStock(pickField(row, ["Stock", "Quantity", "stock"])),
    category,
    sku: pickField(row, ["SKU", "sku", "Sku"]),
    importHandle: "",
    importToken: "",
    imageUrl: pickField(row, ["Image URL", "Image", "Photo", "Photo URL", "image url"]),
    archived: false,
    sourceFormat: "simple",
    sourceCategory: categoryRaw || SHOP_CATEGORY_LABELS[category],
  });
}

function mapSquareRow(row: Record<string, string>): CatalogImportRow | null {
  const name =
    pickField(row, ["Customer-facing Name", "Item Name"]) ||
    pickField(row, ["Item Name"]);
  if (!name) return null;

  const priceRaw = pickField(row, ["Online Sale Price", "Price"]);
  const price = parsePrice(priceRaw);
  if (price <= 0) return null;

  const sourceCategory = pickField(row, ["Categories", "Reporting Category"]);
  const category = mapCategoryFromMarketplace(sourceCategory);
  const stock = parseStock(
    pickField(row, ["Current Quantity Limware", "Current Quantity"]),
    pickField(row, ["New Quantity Limware", "New Quantity"]),
    pickField(row, ["Quantity", "Stock"])
  );

  return rowBase({
    name,
    description: pickField(row, ["Description", "SEO Description"]) || name,
    price,
    stock,
    category,
    sku: pickField(row, ["SKU"]),
    importHandle: pickField(row, ["Reference Handle"]),
    importToken: pickField(row, ["Token"]),
    imageUrl: "",
    archived: isArchived(row),
    sourceFormat: "square",
    sourceCategory,
  });
}

function mapEbayRow(row: Record<string, string>): CatalogImportRow | null {
  const name = pickField(row, ["Title", "Item title", "Item Title", "title"]);
  if (!name) return null;

  const price = parsePrice(
    pickField(row, ["Start price", "Buy It Now price", "Price", "Start Price"]),
    pickField(row, ["Buy It Now price"])
  );
  if (price <= 0) return null;

  const sourceCategory = pickField(row, ["Category name", "Category", "Store Category"]);
  const category = mapCategoryFromMarketplace(sourceCategory);
  const stock = parseStock(
    pickField(row, ["Available quantity", "Quantity", "Available Quantity"])
  );

  return rowBase({
    name,
    description:
      pickField(row, ["Description"]) ||
      pickField(row, ["Subtitle"]) ||
      name,
    price,
    stock,
    category,
    sku: pickField(row, ["Custom label", "SKU", "Custom Label"]),
    importHandle: pickField(row, ["Custom label", "Item number"]),
    importToken: pickField(row, ["Item number"]),
    imageUrl:
      pickField(row, ["PicURL", "Picture URL", "Gallery URL", "Image URL"]) ||
      "",
    archived: false,
    sourceFormat: "ebay",
    sourceCategory,
  });
}

export function previewCatalogImport(csvText: string): ImportPreview {
  const { headers, rows } = parseCsv(csvText);
  const objects = rowsToObjects(headers, rows);
  const format = detectImportFormat(headers);

  const importable: CatalogImportRow[] = [];
  const skipped: { reason: string; name: string }[] = [];

  for (const row of objects) {
    let mapped: CatalogImportRow | null = null;
    if (format === "simple") mapped = mapSimpleRow(row);
    else if (format === "square") mapped = mapSquareRow(row);
    else if (format === "ebay") mapped = mapEbayRow(row);
    else {
      mapped = mapSimpleRow(row) || mapSquareRow(row) || mapEbayRow(row);
    }

    if (!mapped) {
      skipped.push({ reason: "Missing name or price", name: "(blank row)" });
      continue;
    }
    if (mapped.archived) {
      skipped.push({ reason: "Archived in Square", name: mapped.name });
      continue;
    }
    importable.push(mapped);
  }

  return {
    format:
      format === "unknown" && importable.length > 0
        ? importable[0].sourceFormat
        : format,
    totalRows: objects.length,
    importable,
    skipped,
  };
}
