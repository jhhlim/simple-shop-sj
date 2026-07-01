import { getDb } from "./db";
import type { CartItem } from "./types";

export function getUserCart(userId: string): CartItem[] {
  const rows = getDb()
    .prepare(
      `SELECT product_id as productId, quantity FROM cart_items WHERE user_id = ? ORDER BY product_id`
    )
    .all(userId) as CartItem[];
  return rows;
}

export function saveUserCart(userId: string, items: CartItem[]): void {
  const db = getDb();
  const save = db.transaction((cartItems: CartItem[]) => {
    db.prepare("DELETE FROM cart_items WHERE user_id = ?").run(userId);
    const insert = db.prepare(
      `INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)`
    );
    for (const item of cartItems) {
      if (item.quantity > 0) {
        insert.run(userId, item.productId, item.quantity);
      }
    }
  });
  save(items);
}

export function mergeCarts(local: CartItem[], server: CartItem[]): CartItem[] {
  const map = new Map<string, number>();
  for (const item of server) {
    map.set(item.productId, item.quantity);
  }
  for (const item of local) {
    map.set(item.productId, (map.get(item.productId) || 0) + item.quantity);
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}
