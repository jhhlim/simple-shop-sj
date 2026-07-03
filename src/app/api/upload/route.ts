import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isImageFile, saveUploadedImage } from "@/lib/uploads";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (!isImageFile(file)) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  const url = await saveUploadedImage(file);
  return NextResponse.json({ url });
}
