import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getOrders, ordersNeedingShipment } from "@/lib/orders";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const orders = await getOrders();
  return NextResponse.json({
    orders,
    needsShipment: ordersNeedingShipment(orders).length,
  });
}
