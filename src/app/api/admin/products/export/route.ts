import { requireAdmin } from "@/lib/admin-auth";
import { productsToCsv, productsToExportRows } from "@/lib/product-export";
import { getProducts } from "@/lib/products";
import { rowsToXlsxBytes } from "@/lib/spreadsheet";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "csv";
  const products = await getProducts();
  const date = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const bytes = rowsToXlsxBytes(productsToExportRows(products));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="limware-listings-${date}.xlsx"`,
        "Content-Length": String(bytes.length),
      },
    });
  }

  const csv = productsToCsv(products);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="limware-listings-${date}.csv"`,
    },
  });
}
