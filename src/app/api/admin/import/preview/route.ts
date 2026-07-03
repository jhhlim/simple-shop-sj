import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/admin-auth";
import { previewCatalogImport } from "@/lib/catalog-import";
import { fileToCsvText } from "@/lib/spreadsheet";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV or Excel file" }, { status: 400 });
  }

  const csvText = await fileToCsvText(file);
  const preview = previewCatalogImport(csvText);

  return NextResponse.json({
    ...preview,
    sample: preview.importable.slice(0, 15).map((row) => ({
      name: row.name,
      price: row.price,
      stock: row.stock,
      sku: row.sku,
      category: row.categoryLabel,
      hasImage: !!row.imageUrl,
    })),
  });
}
