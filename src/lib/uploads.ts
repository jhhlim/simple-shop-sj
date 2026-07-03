import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);
const HEIC_MIME = new Set(["image/heic", "image/heif"]);
const HEIC_BRANDS = new Set(["heic", "heif", "mif1", "msf1", "heix"]);

const HEIC_SERVER_ERROR =
  "Could not convert HEIC photo. Try exporting as JPG.";

function safeImageExt(file: File): string {
  const ext = path.extname(file.name).toLowerCase() || ".jpg";
  if (ext === ".heic" || ext === ".heif") return ".jpg";
  return IMAGE_EXT.has(ext) ? ext : ".jpg";
}

function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function isHeicFileNameOrType(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (HEIC_MIME.has(type)) return true;
  const ext = path.extname(file.name).toLowerCase();
  return ext === ".heic" || ext === ".heif";
}

/** Detect HEIC/HEIF by ISO BMFF `ftyp` brand even when mislabeled as .jpg. */
function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
  return HEIC_BRANDS.has(brand);
}

export async function saveUploadedImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (isHeicFileNameOrType(file) || isHeicBuffer(buffer)) {
    throw new Error(HEIC_SERVER_ERROR);
  }

  const safeExt = safeImageExt(file);
  const filename = `${randomUUID()}${safeExt}`;
  const contentType =
    file.type && !HEIC_MIME.has(file.type.toLowerCase())
      ? file.type
      : `image/${safeExt.replace(/^\./, "") === "jpg" ? "jpeg" : safeExt.replace(/^\./, "")}`;

  if (blobStorageConfigured()) {
    const blob = await put(`uploads/${filename}`, buffer, {
      access: "public",
      contentType,
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
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/") || HEIC_MIME.has(type)) return true;
  const ext = path.extname(file.name).toLowerCase();
  return IMAGE_EXT.has(ext);
}
