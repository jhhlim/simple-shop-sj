import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";
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
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

async function writeProductsFile(products: Product[]) {
  await ensureDataDir();
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

function rowToProduct(row: {
  id: string;
  name: string;
  description: string;
  price: string | number;
  category: string;
  image_url: string;
  created_at: string | Date;
}): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category as Product["category"],
    imageUrl: row.image_url,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}

export async function getProducts(): Promise<Product[]> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Parameters<typeof rowToProduct>[0]>(
      await getSql()`
      SELECT id, name, description, price, category, image_url, created_at
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
      SELECT id, name, description, price, category, image_url, created_at
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
  input: Omit<Product, "id" | "createdAt">
): Promise<Product> {
  const product: Product = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO products (id, name, description, price, category, image_url, created_at)
      VALUES (
        ${product.id},
        ${product.name},
        ${product.description},
        ${product.price},
        ${product.category},
        ${product.imageUrl},
        ${product.createdAt}
      )
    `;
    return product;
  }

  const products = await readProductsFile();
  products.push(product);
  await writeProductsFile(products);
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<{ id: string }>(
      await getSql()`DELETE FROM products WHERE id = ${id} RETURNING id`
    );
    return rows.length > 0;
  }

  const products = await readProductsFile();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  await writeProductsFile(next);
  return true;
}
