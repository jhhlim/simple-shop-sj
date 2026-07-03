import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-auth";
import { productsToCsv } from "@/lib/product-export";
import { getProducts } from "@/lib/products";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const products = await getProducts();
  const csv = productsToCsv(products);
  const date = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const workbook = XLSX.read(csv, { type: "string" });
    const bytes = Uint8Array.from(
      XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayLike<number>
    );
    return new Response(new Blob([bytes]), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="limware-listings-${date}.xlsx"`,
      },
    });
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="limware-listings-${date}.csv"`,
    },
  });
}
