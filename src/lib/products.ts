import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { normalizeStoredImageUrl } from "./image-url";
import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";
import { normalizeProductCategory } from "./product-categories";
import { normalizeProductCondition } from "./product-condition";
import { assertCanPersistData } from "./storage";
import type { Product } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readProductsFile(): Promise<Product[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Product>[];
    return parsed.map(normalizeProduct);
  } catch {
    return [];
  }
}

async function writeProductsFile(products: Product[]) {
  await ensureDataDir();
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function normalizeProduct(row: Partial<Product> & { imageUrl?: string }): Product {
  const condition = normalizeProductCondition(row.condition);
  return {
    id: String(row.id),
    name: String(row.name || ""),
    description: String(row.description || ""),
    price: Number(row.price || 0),
    category: normalizeProductCategory(row.category),
    ...(condition ? { condition } : {}),
    imageUrl: String(row.imageUrl || ""),
    stock: Number(row.stock ?? 1),
    soldCount: Number(row.soldCount ?? 0),
    sku: row.sku ? String(row.sku) : undefined,
    importHandle: row.importHandle ? String(row.importHandle) : undefined,
    importToken: row.importToken ? String(row.importToken) : undefined,
    createdAt: String(row.createdAt || new Date().toISOString()),
  };
}

function rowToProduct(row: {
  id: string;
  name: string;
  description: string;
  price: string | number;
  category: string;
  condition?: string | null;
  image_url: string;
  stock?: number | string;
  sold_count?: number | string;
  sku?: string | null;
  import_handle?: string | null;
  import_token?: string | null;
  created_at: string | Date;
}): Product {
  const condition = normalizeProductCondition(row.condition);
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: normalizeProductCategory(row.category),
    ...(condition ? { condition } : {}),
    imageUrl: row.image_url || "",
    stock: Number(row.stock ?? 1),
    soldCount: Number(row.sold_count ?? 0),
    sku: row.sku || undefined,
    importHandle: row.import_handle || undefined,
    importToken: row.import_token || undefined,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function getProducts(): Promise<Product[]> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Parameters<typeof rowToProduct>[0]>(
      await getSql()`
      SELECT id, name, description, price, category, condition, image_url, stock, sold_count,
             sku, import_handle, import_token, created_at
      FROM products
      ORDER BY created_at DESC
    `
    );
    return rows.map((row) => rowToProduct(row));
  }

  const products = await readProductsFile();
  return products.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProduct(id: string): Promise<Product | undefined> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Parameters<typeof rowToProduct>[0]>(
      await getSql()`
      SELECT id, name, description, price, category, condition, image_url, stock, sold_count,
             sku, import_handle, import_token, created_at
      FROM products
      WHERE id = ${id}
      LIMIT 1
    `
    );
    const row = rows[0];
    return row ? rowToProduct(row) : undefined;
  }

  const products = await readProductsFile();
  return products.find((p) => p.id === id);
}

export async function createProduct(
  input: Omit<Product, "id" | "createdAt" | "soldCount"> & { soldCount?: number }
): Promise<Product> {
  const condition = normalizeProductCondition(input.condition);
  const product: Product = {
    name: input.name,
    description: input.description,
    price: input.price,
    category: normalizeProductCategory(input.category),
    imageUrl: normalizeStoredImageUrl(input.imageUrl),
    stock: Math.max(0, Math.floor(input.stock ?? 1)),
    soldCount: input.soldCount ?? 0,
    sku: input.sku,
    importHandle: input.importHandle,
    importToken: input.importToken,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  if (condition) product.condition = condition;

  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO products (
        id, name, description, price, category, condition, image_url, stock, sold_count,
        sku, import_handle, import_token, created_at
      )
      VALUES (
        ${product.id},
        ${product.name},
        ${product.description},
        ${product.price},
        ${product.category},
        ${product.condition ?? null},
        ${product.imageUrl},
        ${product.stock},
        ${product.soldCount},
        ${product.sku ?? null},
        ${product.importHandle ?? null},
        ${product.importToken ?? null},
        ${product.createdAt}
      )
    `;
    return product;
  }

  assertCanPersistData();

  const products = await readProductsFile();
  products.push(product);
  await writeProductsFile(products);
  return product;
}

export async function updateProduct(
  id: string,
  input: Partial<
    Pick<
      Product,
      | "name"
      | "description"
      | "price"
      | "category"
      | "condition"
      | "imageUrl"
      | "stock"
      | "sku"
      | "importHandle"
      | "importToken"
    >
  >
): Promise<Product | null> {
  const existing = await getProduct(id);
  if (!existing) return null;

  const nextCondition =
    "condition" in input
      ? normalizeProductCondition(input.condition)
      : existing.condition;
  const updated: Product = {
    ...existing,
    ...input,
    category:
      input.category != null
        ? normalizeProductCategory(input.category)
        : existing.category,
    imageUrl:
      input.imageUrl != null
        ? normalizeStoredImageUrl(input.imageUrl)
        : existing.imageUrl,
    stock: input.stock != null ? Math.max(0, Math.floor(input.stock)) : existing.stock,
  };
  if (nextCondition) updated.condition = nextCondition;
  else delete updated.condition;

  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      UPDATE products
      SET
        name = ${updated.name},
        description = ${updated.description},
        price = ${updated.price},
        category = ${updated.category},
        condition = ${updated.condition ?? null},
        image_url = ${updated.imageUrl},
        stock = ${updated.stock},
        sku = ${updated.sku ?? null},
        import_handle = ${updated.importHandle ?? null},
        import_token = ${updated.importToken ?? null}
      WHERE id = ${id}
    `;
    return updated;
  }

  assertCanPersistData();
  const products = await readProductsFile();
  const index = products.findIndex((p) => p.id === id);
  if (index < 0) return null;
  products[index] = updated;
  await writeProductsFile(products);
  return updated;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<{ id: string }>(
      await getSql()`DELETE FROM products WHERE id = ${id} RETURNING id`
    );
    return rows.length > 0;
  }

  assertCanPersistData();

  const products = await readProductsFile();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  await writeProductsFile(next);
  return true;
}

export async function checkStockAvailable(
  items: { productId: string; quantity: number }[]
): Promise<string | null> {
  for (const item of items) {
    const product = await getProduct(item.productId);
    if (!product) return `Product not found`;
    if (product.stock < item.quantity) {
      return `"${product.name}" only has ${product.stock} available`;
    }
  }
  return null;
}

export async function reserveStock(
  items: { productId: string; quantity: number }[]
): Promise<string | null> {
  const stockError = await checkStockAvailable(items);
  if (stockError) return stockError;

  for (const item of items) {
    if (isPostgresEnabled()) {
      await ensureSchema();
      const rows = asRows<{ stock: number }>(
        await getSql()`
          UPDATE products
          SET stock = stock - ${item.quantity}
          WHERE id = ${item.productId} AND stock >= ${item.quantity}
          RETURNING stock
        `
      );
      if (rows.length === 0) {
        const product = await getProduct(item.productId);
        return `"${product?.name || "Item"}" is no longer available`;
      }
    } else {
      assertCanPersistData();
      const products = await readProductsFile();
      const index = products.findIndex((p) => p.id === item.productId);
      if (index < 0 || products[index].stock < item.quantity) {
        return `"${products[index]?.name || "Item"}" is no longer available`;
      }
      products[index].stock -= item.quantity;
      await writeProductsFile(products);
    }
  }
  return null;
}

export async function releaseStock(
  items: { productId: string; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    if (isPostgresEnabled()) {
      await ensureSchema();
      await getSql()`
        UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.productId}
      `;
    } else {
      const products = await readProductsFile();
      const index = products.findIndex((p) => p.id === item.productId);
      if (index >= 0) {
        products[index].stock += item.quantity;
        await writeProductsFile(products);
      }
    }
  }
}

export async function confirmSale(
  items: { productId: string; quantity: number }[]
): Promise<void> {
  for (const item of items) {
    if (isPostgresEnabled()) {
      await ensureSchema();
      await getSql()`
        UPDATE products SET sold_count = sold_count + ${item.quantity} WHERE id = ${item.productId}
      `;
    } else {
      const products = await readProductsFile();
      const index = products.findIndex((p) => p.id === item.productId);
      if (index >= 0) {
        products[index].soldCount += item.quantity;
        await writeProductsFile(products);
      }
    }
  }
}

export async function findProductBySku(sku: string): Promise<Product | undefined> {
  const value = sku.trim().toLowerCase();
  if (!value) return undefined;
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Parameters<typeof rowToProduct>[0]>(
      await getSql()`
        SELECT id, name, description, price, category, condition, image_url, stock, sold_count,
               sku, import_handle, import_token, created_at
        FROM products WHERE lower(sku) = ${value} LIMIT 1
      `
    );
    return rows[0] ? rowToProduct(rows[0]) : undefined;
  }
  const products = await readProductsFile();
  return products.find((p) => p.sku?.toLowerCase() === value);
}

export async function findProductByImportHandle(handle: string): Promise<Product | undefined> {
  const value = handle.trim().toLowerCase();
  if (!value) return undefined;
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Parameters<typeof rowToProduct>[0]>(
      await getSql()`
        SELECT id, name, description, price, category, condition, image_url, stock, sold_count,
               sku, import_handle, import_token, created_at
        FROM products WHERE lower(import_handle) = ${value} LIMIT 1
      `
    );
    return rows[0] ? rowToProduct(rows[0]) : undefined;
  }
  const products = await readProductsFile();
  return products.find((p) => p.importHandle?.toLowerCase() === value);
}

export async function findProductByImportToken(token: string): Promise<Product | undefined> {
  const value = token.trim().toLowerCase();
  if (!value) return undefined;
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Parameters<typeof rowToProduct>[0]>(
      await getSql()`
        SELECT id, name, description, price, category, condition, image_url, stock, sold_count,
               sku, import_handle, import_token, created_at
        FROM products WHERE lower(import_token) = ${value} LIMIT 1
      `
    );
    return rows[0] ? rowToProduct(rows[0]) : undefined;
  }
  const products = await readProductsFile();
  return products.find((p) => p.importToken?.toLowerCase() === value);
}

export async function findExistingImportProduct(row: {
  sku?: string;
  importHandle?: string;
  importToken?: string;
}): Promise<Product | undefined> {
  if (row.sku) {
    const bySku = await findProductBySku(row.sku);
    if (bySku) return bySku;
  }
  if (row.importHandle) {
    const byHandle = await findProductByImportHandle(row.importHandle);
    if (byHandle) return byHandle;
  }
  if (row.importToken) {
    const byToken = await findProductByImportToken(row.importToken);
    if (byToken) return byToken;
  }
  return undefined;
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

export async function importCatalogRows(
  rows: Array<{
    name: string;
    description: string;
    price: number;
    stock: number;
    category: Product["category"];
    sku?: string;
    importHandle?: string;
    importToken?: string;
    imageUrl?: string;
  }>,
  options: { updateExisting: boolean }
): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const existing = await findExistingImportProduct(row);
      if (existing) {
        if (!options.updateExisting) {
          result.skipped++;
          continue;
        }
        await updateProduct(existing.id, {
          name: row.name,
          description: row.description,
          price: row.price,
          stock: row.stock,
          category: row.category,
          sku: row.sku,
          importHandle: row.importHandle,
          importToken: row.importToken,
          imageUrl: row.imageUrl || existing.imageUrl,
        });
        result.updated++;
        continue;
      }

      await createProduct({
        name: row.name,
        description: row.description,
        price: row.price,
        stock: row.stock,
        category: row.category,
        imageUrl: row.imageUrl || "",
        sku: row.sku,
        importHandle: row.importHandle,
        importToken: row.importToken,
      });
      result.created++;
    } catch (err) {
      result.errors.push(
        `${row.name}: ${err instanceof Error ? err.message : "import failed"}`
      );
    }
  }

  return result;
}
