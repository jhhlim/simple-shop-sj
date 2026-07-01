import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Order } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readOrders(): Promise<Order[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]) {
  await ensureDataDir();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function createOrder(
  input: Omit<Order, "id" | "createdAt" | "status">
): Promise<Order> {
  const orders = await readOrders();
  const order: Order = {
    ...input,
    id: randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  await writeOrders(orders);
  return order;
}

export async function markOrderPaid(id: string, paymentId: string) {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return null;
  order.status = "paid";
  order.paymentId = paymentId;
  await writeOrders(orders);
  return order;
}
