import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getOrders, ordersNeedingShipment } from "@/lib/orders";
import { ordersToPirateShipCsv } from "@/lib/pirateship-export";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const onlyUnshipped = searchParams.get("unshipped") === "1";

  let orders = await getOrders();
  const filtered = onlyUnshipped ? ordersNeedingShipment(orders) : orders;
  const csv = ordersToPirateShipCsv(filtered);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="pirateship-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
