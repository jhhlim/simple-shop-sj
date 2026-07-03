import { put } from "@vercel/blob";
import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const HEIC_MIME = new Set(["image/heic", "image/heif"]);

const HEIC_CONVERT_ERROR =
  "Could not convert HEIC. Try exporting as JPEG.";

export type UploadBytes = {
  buffer: Buffer;
  name: string;
  type: string;
};

function safeImageExt(name: string): string {
  const ext = path.extname(name).toLowerCase() || ".jpg";
  return IMAGE_EXT.has(ext) ? ext : ".jpg";
}

function blobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

/** Extension .heic/.heif or mime image/heic|heif. */
function isHeicNameOrType(name: string, type: string): boolean {
  const mime = (type || "").toLowerCase();
  if (HEIC_MIME.has(mime)) return true;
  const ext = path.extname(name).toLowerCase();
  return ext === ".heic" || ext === ".heif";
}

/** ISO BMFF: bytes 4–7 are `ftyp`, brands include heic/heif/mif1. */
function isHeicMagic(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const brands = buffer
    .subarray(8, Math.min(buffer.length, 32))
    .toString("ascii")
    .toLowerCase();
  return (
    brands.includes("heic") ||
    brands.includes("heif") ||
    brands.includes("mif1")
  );
}

function isHeicUpload(upload: UploadBytes): boolean {
  return isHeicNameOrType(upload.name, upload.type) || isHeicMagic(upload.buffer);
}

/**
 * Lazy-import heic-convert only when needed so cold starts for JPEG/PNG
 * uploads never load libheif.
 */
async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    const mod = await import("heic-convert");
    const convert = (mod as { default?: unknown }).default ?? mod;
    const output = await (
      convert as (opts: {
        buffer: Buffer;
        format: "JPEG" | "PNG";
        quality: number;
      }) => Promise<ArrayBuffer>
    )({
      buffer,
      format: "JPEG",
      quality: 0.85,
    });
    return Buffer.from(output);
  } catch {
    throw new Error(HEIC_CONVERT_ERROR);
  }
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

  const candidate = value as {
    arrayBuffer?: unknown;
    name?: unknown;
    type?: unknown;
  };
  if (typeof candidate.arrayBuffer !== "function") return null;

  const buffer = Buffer.from(
    await (candidate.arrayBuffer as () => Promise<ArrayBuffer>)()
  );
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
  if (type.startsWith("image/")) return true;
  const ext = path.extname(upload.name).toLowerCase();
  return IMAGE_EXT.has(ext) || ext === ".heic" || ext === ".heif";
}

/**
 * Persist an uploaded image. HEIC/HEIF is converted to JPEG server-side
 * (browsers like Chrome cannot decode HEIC). JPEG/PNG/WebP/GIF are stored as-is.
 */
export async function saveUploadedImage(upload: UploadBytes): Promise<string> {
  let buffer = upload.buffer;
  let name = upload.name;
  let type = upload.type;

  if (isHeicUpload(upload)) {
    buffer = await convertHeicToJpeg(upload.buffer);
    const base = path.basename(upload.name, path.extname(upload.name)).trim() || "photo";
    name = `${base}.jpg`;
    type = "image/jpeg";
  }

  const safeExt = safeImageExt(name);
  const filename = `${randomUUID()}${safeExt}`;
  const contentType = contentTypeFor(name, type, safeExt);

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
