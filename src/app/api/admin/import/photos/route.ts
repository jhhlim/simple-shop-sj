import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildProductMatchIndex, matchProductForFilename } from "@/lib/photo-match";
import { getProducts, updateProduct } from "@/lib/products";
import { isImageUpload, readUploadEntry, saveUploadedImage } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const entries = formData.getAll("files");
    const files = (
      await Promise.all(entries.map((entry) => readUploadEntry(entry)))
    ).filter((f): f is NonNullable<typeof f> => f != null);

    if (files.length === 0) {
      return NextResponse.json({ error: "Select one or more image files" }, { status: 400 });
    }

    const products = await getProducts();
    const index = buildProductMatchIndex(products);

    const matched: { file: string; product: string; matchedBy: string; url: string }[] = [];
    const unmatched: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      const fileName = file.name || "upload.jpg";
      if (!isImageUpload(file)) {
        errors.push(`${fileName}: not an image`);
        continue;
      }

      const match = matchProductForFilename(fileName, index);
      if (!match) {
        unmatched.push(fileName);
        continue;
      }

      try {
        const url = await saveUploadedImage(file);
        await updateProduct(match.product.id, { imageUrl: url });
        matched.push({
          file: fileName,
          product: match.product.name,
          matchedBy: match.matchedBy,
          url,
        });
        match.product.imageUrl = url;
      } catch (err) {
        errors.push(
          `${fileName}: ${err instanceof Error ? err.message : "upload failed"}`
        );
      }
    }

    return NextResponse.json({
      total: files.length,
      matched: matched.length,
      unmatched: unmatched.length,
      results: matched,
      unmatchedFiles: unmatched,
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Photo upload failed" },
      { status: 500 }
    );
  }
}
