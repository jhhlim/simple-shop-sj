import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { previewCatalogImport } from "@/lib/catalog-import";
import { importCatalogRows } from "@/lib/products";
import { fileToCsvText } from "@/lib/spreadsheet";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get("file");
  const updateExisting = formData.get("updateExisting") === "true";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Upload a CSV or Excel file" }, { status: 400 });
  }

  const csvText = await fileToCsvText(file);
  const preview = previewCatalogImport(csvText);

  if (preview.importable.length === 0) {
    return NextResponse.json(
      {
        error:
          "No importable rows. Use the template: Name, Description, Price, Category (Used goods / Jewelry / Other), Stock, SKU.",
      },
      { status: 400 }
    );
  }

  const result = await importCatalogRows(
    preview.importable.map((row) => ({
      name: row.name,
      description: row.description,
      price: row.price,
      stock: row.stock,
      category: row.category,
      sku: row.sku || undefined,
      importHandle: row.importHandle || undefined,
      importToken: row.importToken || undefined,
      imageUrl: row.imageUrl || undefined,
    })),
    { updateExisting }
  );

  return NextResponse.json({
    format: preview.format,
    ...result,
    skippedArchived: preview.skipped.length,
  });
}
