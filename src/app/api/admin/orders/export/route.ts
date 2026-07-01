import { NextResponse } from "next/server";
import { getOrders, ordersNeedingShipment } from "@/lib/orders";
import { ordersToPirateShipCsv } from "@/lib/pirateship-export";

export async function GET(request: Request) {
  const password = request.headers.get("x-admin-password");
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
