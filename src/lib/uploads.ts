import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function safeImageExt(file: File): string {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  return IMAGE_EXT.has(ext) ? ext : ".jpg";
}

export async function saveUploadedImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeExt = safeImageExt(file);
  const filename = `${randomUUID()}${safeExt}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType: file.type || `image/${safeExt.replace(/^\./, "")}`,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Image storage not configured. In Vercel: Storage → Create Blob store → link to this project → redeploy."
    );
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${filename}`;
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const ext = path.extname(file.name).toLowerCase();
  return IMAGE_EXT.has(ext);
}
