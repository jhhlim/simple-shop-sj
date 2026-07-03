import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { isImageUpload, readUploadEntry, saveUploadedImage } from "@/lib/uploads";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const upload = await readUploadEntry(formData.get("file"));

    if (!upload) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!isImageUpload(upload)) {
      return NextResponse.json(
        {
          error: `File must be an image (got type="${upload.type || "unknown"}", name="${upload.name}")`,
        },
        { status: 400 }
      );
    }

    const url = await saveUploadedImage(upload);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    const status =
      message.includes("HEIC") ||
      message.includes("Could not convert") ||
      message.includes("not configured")
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
