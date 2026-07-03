import { neon } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";
import type { Product } from "./types";

export function getPostgresUrl(): string | undefined {
  const keys = [
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
  ] as const;
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function isPostgresEnabled(): boolean {
  return Boolean(getPostgresUrl());
}

let sqlClient: ReturnType<typeof neon> | null = null;
let schemaReady: Promise<void> | null = null;

export function getSql() {
  if (!sqlClient) {
    const url = getPostgresUrl();
    if (!url) throw new Error("POSTGRES_URL is not configured");
    sqlClient = neon(url);
  }
  return sqlClient;
}

async function initSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price NUMERIC(10, 2) NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      stock INTEGER NOT NULL DEFAULT 1,
      sold_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 1
  `;
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0
  `;
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT
  `;
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS import_handle TEXT
  `;
  await sql`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS import_token TEXT
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS products_sku_idx ON products (lower(sku)) WHERE sku IS NOT NULL
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS products_import_handle_idx ON products (lower(import_handle))
    WHERE import_handle IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      google_id TEXT UNIQUE,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
    ON users (lower(username))
    WHERE username IS NOT NULL
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx
    ON users (lower(email))
    WHERE email IS NOT NULL
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS auth_tokens_user_type_idx ON auth_tokens (user_id, type)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cart_items (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      PRIMARY KEY (user_id, product_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      percent_off INTEGER NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
      active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;

  await sql`
    INSERT INTO coupons (code, percent_off, active)
    VALUES ('OFF10', 10, TRUE)
    ON CONFLICT (code) DO NOTHING
  `;

  await seedProductsIfEmpty(sql);
}

async function seedProductsIfEmpty(
  sql: ReturnType<typeof neon>
) {
  const countRows = asRows<{ count: number }>(
    await sql`SELECT COUNT(*)::int AS count FROM products`
  );
  const count = Number(countRows[0]?.count ?? 0);
  if (count > 0) return;

  const productsFile = path.join(process.cwd(), "data", "products.json");
  try {
    const raw = await fs.readFile(productsFile, "utf-8");
    const products = JSON.parse(raw) as Product[];
    for (const product of products) {
      await sql`
        INSERT INTO products (id, name, description, price, category, image_url, stock, sold_count, created_at)
        VALUES (
          ${product.id},
          ${product.name},
          ${product.description},
          ${product.price},
          ${product.category},
          ${product.imageUrl},
          ${product.stock ?? 1},
          ${product.soldCount ?? 0},
          ${product.createdAt}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
  } catch {
    // no seed file — start with an empty catalog
  }
}

export function ensureSchema(): Promise<void> {
  if (!isPostgresEnabled()) {
    return Promise.resolve();
  }
  if (!schemaReady) {
    schemaReady = initSchema().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export function asRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === "object" && "rows" in result) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}
