import type { Product } from "./types";

export function normalizeMatchKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^#/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fileStem(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || filename;
  return base.replace(/\.[^.]+$/, "");
}

export type ProductMatchIndex = {
  bySku: Map<string, Product>;
  byHandle: Map<string, Product>;
  byToken: Map<string, Product>;
  byName: Map<string, Product>;
};

export function buildProductMatchIndex(products: Product[]): ProductMatchIndex {
  const bySku = new Map<string, Product>();
  const byHandle = new Map<string, Product>();
  const byToken = new Map<string, Product>();
  const byName = new Map<string, Product>();

  for (const p of products) {
    if (p.sku) bySku.set(p.sku.trim().toLowerCase(), p);
    if (p.importHandle) byHandle.set(normalizeMatchKey(p.importHandle), p);
    if (p.importToken) byToken.set(p.importToken.trim().toLowerCase(), p);
    byName.set(normalizeMatchKey(p.name), p);
  }

  return { bySku, byHandle, byToken, byName };
}

export function matchProductForFilename(
  filename: string,
  index: ProductMatchIndex
): { product: Product; matchedBy: string } | null {
  const stem = fileStem(filename);
  const lower = stem.toLowerCase();
  const normalized = normalizeMatchKey(stem);

  if (index.bySku.has(lower)) {
    return { product: index.bySku.get(lower)!, matchedBy: "SKU" };
  }
  if (index.byHandle.has(normalized)) {
    return { product: index.byHandle.get(normalized)!, matchedBy: "handle" };
  }
  if (index.byToken.has(lower)) {
    return { product: index.byToken.get(lower)!, matchedBy: "token" };
  }
  if (index.byName.has(normalized)) {
    return { product: index.byName.get(normalized)!, matchedBy: "name" };
  }

  // Partial handle match (filename contains handle slug or vice versa)
  for (const [handle, product] of index.byHandle) {
    if (handle.length >= 8 && (normalized.includes(handle) || handle.includes(normalized))) {
      return { product, matchedBy: "handle (partial)" };
    }
  }

  return null;
}
