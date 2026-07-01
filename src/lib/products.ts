import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Product } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readProducts(): Promise<Product[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(PRODUCTS_FILE, "utf-8");
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

async function writeProducts(products: Product[]) {
  await ensureDataDir();
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

export async function getProducts(): Promise<Product[]> {
  const products = await readProducts();
  return products.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const products = await readProducts();
  return products.find((p) => p.id === id);
}

export async function createProduct(
  input: Omit<Product, "id" | "createdAt">
): Promise<Product> {
  const products = await readProducts();
  const product: Product = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  await writeProducts(products);
  return product;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const products = await readProducts();
  const next = products.filter((p) => p.id !== id);
  if (next.length === products.length) return false;
  await writeProducts(next);
  return true;
}
