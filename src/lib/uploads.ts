import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

export async function saveUploadedImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  const safeExt = IMAGE_EXT.has(ext) ? ext : ".jpg";
  const filename = `${randomUUID()}${safeExt}`;
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
