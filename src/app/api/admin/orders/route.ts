import { NextResponse } from "next/server";
import { getOrders, ordersNeedingShipment } from "@/lib/orders";

export async function GET(request: Request) {
  const password = request.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await getOrders();
  return NextResponse.json({
    orders,
    needsShipment: ordersNeedingShipment(orders).length,
  });
}
