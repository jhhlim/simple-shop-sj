import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"]);
const HEIC_MIME = new Set(["image/heic", "image/heif"]);
const HEIC_BRANDS = new Set(["heic", "heif", "mif1", "msf1", "heix"]);

const HEIC_SERVER_ERROR =
  "Could not convert HEIC photo. Try exporting as JPG.";

export type UploadBytes = {
  buffer: Buffer;
  name: string;
  type: string;
};

function safeImageExt(name: string): string {
  const ext = path.extname(name).toLowerCase() || ".jpg";
  if (ext === ".heic" || ext === ".heif") return ".jpg";
  return IMAGE_EXT.has(ext) ? ext : ".jpg";
}

function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function isHeicNameOrType(name: string, type: string): boolean {
  const mime = (type || "").toLowerCase();
  if (HEIC_MIME.has(mime)) return true;
  const ext = path.extname(name).toLowerCase();
  return ext === ".heic" || ext === ".heif";
}

/** Detect HEIC/HEIF by ISO BMFF `ftyp` brand even when mislabeled as .jpg. */
function isHeicBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.subarray(4, 8).toString("ascii") !== "ftyp") return false;
  const brand = buffer.subarray(8, 12).toString("ascii").toLowerCase();
  return HEIC_BRANDS.has(brand);
}

function contentTypeFor(name: string, type: string, safeExt: string): string {
  const mime = (type || "").toLowerCase();
  if (mime && !HEIC_MIME.has(mime) && mime !== "application/octet-stream") {
    return type;
  }
  const ext = safeExt.replace(/^\./, "");
  return `image/${ext === "jpg" ? "jpeg" : ext}`;
}

/**
 * Read a multipart FormData entry without relying on `instanceof File` /
 * `instanceof Blob` (those fail in some Node/undici runtimes and drop uploads).
 */
export async function readUploadEntry(
  value: FormDataEntryValue | null,
  fallbackName = "upload.jpg"
): Promise<UploadBytes | null> {
  if (value == null || typeof value === "string") return null;

  const candidate = value as { arrayBuffer?: unknown; name?: unknown; type?: unknown; size?: unknown };
  if (typeof candidate.arrayBuffer !== "function") return null;

  const buffer = Buffer.from(await (candidate.arrayBuffer as () => Promise<ArrayBuffer>)());
  if (buffer.length === 0) return null;

  const name =
    typeof candidate.name === "string" && candidate.name.trim()
      ? candidate.name.trim()
      : fallbackName;
  const type = typeof candidate.type === "string" ? candidate.type : "";

  return { buffer, name, type };
}

export function isImageUpload(upload: UploadBytes): boolean {
  const type = (upload.type || "").toLowerCase();
  if (type.startsWith("image/") || HEIC_MIME.has(type)) return true;
  const ext = path.extname(upload.name).toLowerCase();
  return IMAGE_EXT.has(ext);
}

export async function saveUploadedImage(upload: UploadBytes): Promise<string> {
  if (isHeicNameOrType(upload.name, upload.type) || isHeicBuffer(upload.buffer)) {
    throw new Error(HEIC_SERVER_ERROR);
  }

  const safeExt = safeImageExt(upload.name);
  const filename = `${randomUUID()}${safeExt}`;
  const contentType = contentTypeFor(upload.name, upload.type, safeExt);

  if (blobStorageConfigured()) {
    const blob = await put(`uploads/${filename}`, upload.buffer, {
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
  await fs.writeFile(path.join(uploadDir, filename), upload.buffer);
  return `/uploads/${filename}`;
}
