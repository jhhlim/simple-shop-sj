/** Client-only image compression for admin uploads. Do not import from server code. */

const MAX_DIMENSION = 1600;
const TARGET_MAX_BYTES = 3 * 1024 * 1024;
const QUALITIES = [0.82, 0.7, 0.6, 0.5, 0.4] as const;
const DIMENSION_STEPS = [1600, 1200, 1000, 800] as const;

const HEIC_EXT = /\.(heic|heif)$/i;

/** Only extension .heic/.heif or mime image/heic|heif — never sniff bytes. */
export function isHeicFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return HEIC_EXT.test(file.name);
}

function jpegFileName(sourceName: string): string {
  const base = sourceName.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

function toJpegFile(blob: Blob, sourceName: string): File {
  const name = jpegFileName(sourceName);
  try {
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    const fallback = blob as Blob & { name?: string };
    Object.defineProperty(fallback, "name", {
      value: name,
      writable: false,
      configurable: true,
    });
    return fallback as File;
  }
}

type Drawable = CanvasImageSource & { width: number; height: number };

function sourceSize(source: Drawable): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width,
      height: source.naturalHeight || source.height,
    };
  }
  return { width: source.width, height: source.height };
}

async function loadViaImageElement(file: File): Promise<{
  source: HTMLImageElement;
  close: () => void;
}> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
  return {
    source: img,
    close: () => URL.revokeObjectURL(url),
  };
}

async function loadDrawable(file: File): Promise<{ source: Drawable; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, close: () => bitmap.close() };
    } catch {
      // Fall through to <img> path (some browsers decode JPEG/PNG there but not via bitmap).
    }
  }

  try {
    return await loadViaImageElement(file);
  } catch {
    throw new Error(
      "Could not read this image. Export as JPEG in Photos or Preview, then upload."
    );
  }
}

function drawScaled(source: Drawable, maxDimension: number): HTMLCanvasElement {
  const { width, height } = sourceSize(source);
  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not available in this browser.");
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size === 0) {
          reject(new Error("Could not encode JPEG."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Resize and re-encode a JPEG/PNG/WebP photo so the upload payload stays under
 * Vercel's serverless body limit (~4.5MB). Target is under 3MB.
 *
 * Do not call this for HEIC/HEIF — those are uploaded as-is and converted
 * server-side (browsers like Chrome cannot decode HEIC).
 */
export async function compressImageForUpload(file: File): Promise<File> {
  const loaded = await loadDrawable(file);
  try {
    let blob: Blob | null = null;

    for (const maxDimension of DIMENSION_STEPS) {
      const canvas = drawScaled(loaded.source, maxDimension);
      for (const quality of QUALITIES) {
        blob = await canvasToJpegBlob(canvas, quality);
        if (blob.size <= TARGET_MAX_BYTES) {
          return toJpegFile(blob, file.name);
        }
      }
    }

    if (!blob) {
      throw new Error("Could not compress photo.");
    }

    // Last-resort: still over target, but may fit under Vercel's ~4.5MB limit.
    if (blob.size > 4 * 1024 * 1024) {
      throw new Error(
        "Photo is still too large after compression. Try a smaller photo or export as JPEG."
      );
    }

    return toJpegFile(blob, file.name);
  } finally {
    loaded.close?.();
  }
}

/** @deprecated Prefer compressImageForUpload — kept for existing call sites. */
export async function prepareImageForUpload(file: File): Promise<File> {
  return compressImageForUpload(file);
}
