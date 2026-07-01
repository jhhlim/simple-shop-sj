import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Order, TrackingStatus } from "./types";

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

export async function getOrders(): Promise<Order[]> {
  const orders = await readOrders();
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const orders = await readOrders();
  return orders.find((o) => o.id === id);
}

export async function getOrderByTrackingNumber(
  trackingNumber: string
): Promise<Order | undefined> {
  const orders = await readOrders();
  return orders.find((o) => o.trackingNumber === trackingNumber);
}

export async function applyShippoLabel(
  id: string,
  input: {
    trackingNumber: string;
    trackingCarrier: string;
    trackingUrl: string;
    labelUrl: string;
    shippoTransactionId: string;
    shippoShipmentId: string;
    labelCost?: number;
  }
): Promise<Order | null> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return null;

  order.status = "shipped";
  order.trackingNumber = input.trackingNumber;
  order.trackingCarrier = input.trackingCarrier;
  order.trackingUrl = input.trackingUrl;
  order.labelUrl = input.labelUrl;
  order.shippoTransactionId = input.shippoTransactionId;
  order.shippoShipmentId = input.shippoShipmentId;
  order.labelCost = input.labelCost;
  order.trackingStatus = "pre_transit";
  order.shippedAt = new Date().toISOString();

  await writeOrders(orders);
  return order;
}

export async function updateTrackingStatus(
  id: string,
  input: {
    trackingStatus: TrackingStatus;
    deliveredAt?: string;
  }
): Promise<Order | null> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return null;

  order.trackingStatus = input.trackingStatus;
  if (input.deliveredAt) {
    order.deliveredAt = input.deliveredAt;
    order.status = "shipped";
  }

  await writeOrders(orders);
  return order;
}

export async function markInTransitEmailSent(id: string): Promise<void> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return;
  order.inTransitEmailSentAt = new Date().toISOString();
  await writeOrders(orders);
}

export async function markDeliveredEmailSent(id: string): Promise<void> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return;
  order.deliveredEmailSentAt = new Date().toISOString();
  await writeOrders(orders);
}

export async function getOrderForCustomer(
  id: string,
  email: string
): Promise<Order | undefined> {
  const order = await getOrder(id);
  if (!order) return undefined;
  if (order.shipping.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
    return undefined;
  }
  return order;
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

export async function markOrderShipped(
  id: string,
  input: {
    trackingNumber: string;
    trackingCarrier: string;
    trackingUrl?: string;
    trackingEmailSentAt?: string;
  }
): Promise<Order | null> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return null;

  order.status = "shipped";
  order.trackingNumber = input.trackingNumber.trim();
  order.trackingCarrier = input.trackingCarrier.trim();
  order.trackingUrl = input.trackingUrl?.trim() || buildTrackingUrl(
    input.trackingCarrier,
    input.trackingNumber
  );
  order.shippedAt = new Date().toISOString();
  if (input.trackingEmailSentAt) {
    order.trackingEmailSentAt = input.trackingEmailSentAt;
  }

  await writeOrders(orders);
  return order;
}

export async function markTrackingEmailSent(id: string): Promise<void> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return;
  order.trackingEmailSentAt = new Date().toISOString();
  await writeOrders(orders);
}

function buildTrackingUrl(carrier: string, trackingNumber: string): string {
  const c = carrier.toLowerCase();
  const n = encodeURIComponent(trackingNumber);
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes("ups")) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  return `https://www.google.com/search?q=${n}+tracking`;
}

export function ordersNeedingShipment(orders: Order[]): Order[] {
  return orders.filter((o) => o.status === "paid" && !o.trackingNumber);
}
