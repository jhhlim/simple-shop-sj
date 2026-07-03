import * as XLSX from "xlsx";
import { IMPORT_TEMPLATE_CSV } from "@/lib/spreadsheet";

export async function GET(request: Request) {
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

  const workbook = XLSX.read(IMPORT_TEMPLATE_CSV, { type: "string" });
  const bytes = Uint8Array.from(
    XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayLike<number>
  );

  return new Response(new Blob([bytes]), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="limware-import-template.xlsx"',
    },
  });
}
