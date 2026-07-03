import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PENDING_ORDER_MINUTES } from "./constants";
import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";
import { confirmSale, releaseStock } from "./products";
import { assertCanPersistData } from "./storage";
import type { Order, TrackingStatus } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readOrdersFile(): Promise<Order[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeOrdersFile(orders: Order[]) {
  await ensureDataDir();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

async function readOrders(): Promise<Order[]> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<{ payload: Order }>(await getSql()`SELECT payload FROM orders`);
    return rows.map((row) => row.payload);
  }
  return readOrdersFile();
}

async function writeOrder(order: Order) {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const payload = JSON.stringify(order);
    await getSql()`
      INSERT INTO orders (id, payload)
      VALUES (${order.id}, ${payload}::jsonb)
      ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload
    `;
    return;
  }

  assertCanPersistData();

  const orders = await readOrdersFile();
  const index = orders.findIndex((o) => o.id === order.id);
  if (index >= 0) orders[index] = order;
  else orders.push(order);
  await writeOrdersFile(orders);
}

async function updateOrderMutator(
  id: string,
  mutate: (order: Order) => void
): Promise<Order | null> {
  const orders = await readOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return null;
  mutate(order);
  await writeOrder(order);
  return order;
}

function isOrderExpired(order: Order): boolean {
  if (order.status !== "pending" || !order.expiresAt) return false;
  return new Date(order.expiresAt).getTime() <= Date.now();
}

export async function expireOrderIfNeeded(order: Order): Promise<Order> {
  if (!isOrderExpired(order)) return order;

  await updateOrderMutator(order.id, (o) => {
    o.status = "expired";
  });
  await releaseStock(
    order.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
  );
  return (await getOrder(order.id))!;
}

export async function expireStalePendingOrders(): Promise<void> {
  const orders = await readOrders();
  const now = Date.now();
  for (const order of orders) {
    if (
      order.status === "pending" &&
      order.expiresAt &&
      new Date(order.expiresAt).getTime() <= now
    ) {
      await expireOrderIfNeeded(order);
    }
  }
}

export async function getOrders(): Promise<Order[]> {
  await expireStalePendingOrders();
  const orders = await readOrders();
  return orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const order = (await readOrders()).find((o) => o.id === id);
  if (!order) return undefined;
  if (isOrderExpired(order)) {
    return expireOrderIfNeeded(order);
  }
  return order;
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
  return updateOrderMutator(id, (order) => {
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
  });
}

export async function updateTrackingStatus(
  id: string,
  input: {
    trackingStatus: TrackingStatus;
    deliveredAt?: string;
  }
): Promise<Order | null> {
  return updateOrderMutator(id, (order) => {
    order.trackingStatus = input.trackingStatus;
    if (input.deliveredAt) {
      order.deliveredAt = input.deliveredAt;
      order.status = "shipped";
    }
  });
}

export async function markInTransitEmailSent(id: string): Promise<void> {
  await updateOrderMutator(id, (order) => {
    order.inTransitEmailSentAt = new Date().toISOString();
  });
}

export async function markDeliveredEmailSent(id: string): Promise<void> {
  await updateOrderMutator(id, (order) => {
    order.deliveredEmailSentAt = new Date().toISOString();
  });
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

export async function getOrdersForAccount(userId: string, email: string): Promise<Order[]> {
  await expireStalePendingOrders();
  const orders = await readOrders();
  const normalizedEmail = email.trim().toLowerCase();
  return orders
    .filter((o) => {
      if (o.status === "pending" || o.status === "expired" || o.status === "failed") {
        return false;
      }
      if (o.userId === userId) return true;
      return o.shipping.email.trim().toLowerCase() === normalizedEmail;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createOrder(
  input: Omit<Order, "id" | "createdAt" | "status" | "expiresAt"> & {
    userId?: string;
    stripeSessionId?: string;
    paypalOrderId?: string;
  }
): Promise<Order> {
  const now = new Date();
  const order: Order = {
    ...input,
    id: randomUUID(),
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + PENDING_ORDER_MINUTES * 60 * 1000).toISOString(),
  };
  await writeOrder(order);
  return order;
}

export async function updateOrderPaymentRefs(
  id: string,
  refs: { stripeSessionId?: string; paypalOrderId?: string }
): Promise<Order | null> {
  return updateOrderMutator(id, (order) => {
    if (refs.stripeSessionId) order.stripeSessionId = refs.stripeSessionId;
    if (refs.paypalOrderId) order.paypalOrderId = refs.paypalOrderId;
  });
}

export async function markOrderPaid(id: string, paymentId: string) {
  const order = await getOrder(id);
  if (!order) return null;
  if (order.status === "expired") return null;

  const updated = await updateOrderMutator(id, (o) => {
    o.status = "paid";
    o.paymentId = paymentId;
    o.expiresAt = undefined;
  });

  if (updated) {
    await confirmSale(
      updated.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
  }
  return updated;
}

export async function markOrderFailed(id: string) {
  const order = await getOrder(id);
  if (!order || order.status !== "pending") return null;

  const updated = await updateOrderMutator(id, (o) => {
    o.status = "failed";
    o.expiresAt = undefined;
  });

  if (updated) {
    await releaseStock(
      updated.items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
    );
  }
  return updated;
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
  return updateOrderMutator(id, (order) => {
    order.status = "shipped";
    order.trackingNumber = input.trackingNumber.trim();
    order.trackingCarrier = input.trackingCarrier.trim();
    order.trackingUrl =
      input.trackingUrl?.trim() ||
      buildTrackingUrl(input.trackingCarrier, input.trackingNumber);
    order.shippedAt = new Date().toISOString();
    if (input.trackingEmailSentAt) {
      order.trackingEmailSentAt = input.trackingEmailSentAt;
    }
  });
}

export async function markTrackingEmailSent(id: string): Promise<void> {
  await updateOrderMutator(id, (order) => {
    order.trackingEmailSentAt = new Date().toISOString();
  });
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
