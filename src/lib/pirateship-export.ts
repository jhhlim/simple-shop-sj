import type { Order } from "./types";

/** CSV columns compatible with Pirate Ship spreadsheet import */
export function orderToPirateShipRow(order: Order): string[] {
  const s = order.shipping;
  return [
    s.fullName,
    s.street,
    s.street2 || "",
    s.city,
    s.state,
    s.zip,
    s.country === "CA" ? "CA" : "US",
    s.email,
    s.phone,
    order.id.slice(0, 8),
    order.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
  ];
}

export const PIRATE_SHIP_CSV_HEADER = [
  "Name",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Zip",
  "Country",
  "Email",
  "Phone",
  "Order Reference",
  "Items",
].join(",");

export function ordersToPirateShipCsv(orders: Order[]): string {
  const rows = orders.map((order) =>
    orderToPirateShipRow(order)
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [PIRATE_SHIP_CSV_HEADER, ...rows].join("\n");
}
