import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { buildProductMatchIndex, matchProductForFilename } from "@/lib/photo-match";
import { getProducts, updateProduct } from "@/lib/products";
import { isImageFile, saveUploadedImage } from "@/lib/uploads";

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const formData = await request.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "Select one or more image files" }, { status: 400 });
  }

  const products = await getProducts();
  const index = buildProductMatchIndex(products);

  const matched: { file: string; product: string; matchedBy: string; url: string }[] = [];
  const unmatched: string[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (!isImageFile(file)) {
      errors.push(`${file.name}: not an image`);
      continue;
    }

    const match = matchProductForFilename(file.name, index);
    if (!match) {
      unmatched.push(file.name);
      continue;
    }

    try {
      const url = await saveUploadedImage(file);
      await updateProduct(match.product.id, { imageUrl: url });
      matched.push({
        file: file.name,
        product: match.product.name,
        matchedBy: match.matchedBy,
        url,
      });
      match.product.imageUrl = url;
    } catch (err) {
      errors.push(
        `${file.name}: ${err instanceof Error ? err.message : "upload failed"}`
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
}
