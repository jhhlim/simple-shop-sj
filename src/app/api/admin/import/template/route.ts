import { requireAdmin } from "@/lib/admin-auth";
import { csvTextToXlsxBytes, IMPORT_TEMPLATE_CSV } from "@/lib/spreadsheet";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "xlsx";

  if (format === "csv") {
    return new Response(IMPORT_TEMPLATE_CSV, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="limware-import-template.csv"',
      },
    });
  }

  const bytes = csvTextToXlsxBytes(IMPORT_TEMPLATE_CSV);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="limware-import-template.xlsx"',
      "Content-Length": String(bytes.length),
    },
  });
}
