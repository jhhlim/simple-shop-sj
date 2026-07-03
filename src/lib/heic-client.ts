/** Client-only HEIC/HEIF helpers. Do not import from server code. */

const HEIC_EXT = /\.(heic|heif)$/i;

export function isHeicFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return HEIC_EXT.test(file.name);
}

function toJpegFile(blob: Blob, sourceName: string): File {
  const baseName = sourceName.replace(HEIC_EXT, "") || "photo";
  const name = `${baseName}.jpg`;
  try {
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    // Older browsers may lack File constructor; Blob + filename still uploads.
    const fallback = blob as Blob & { name?: string };
    Object.defineProperty(fallback, "name", {
      value: name,
      writable: false,
      configurable: true,
    });
    return fallback as File;
  }
}

/**
 * Convert HEIC/HEIF to JPEG in the browser.
 * Non-HEIC files (JPG/PNG/WebP/GIF) are returned unchanged — never blocked.
 *
 * On HEIC conversion failure, returns the original file so upload can still be
 * attempted (server rejects raw HEIC with a clear error). Never fails silently.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  // Fast path: normal photos must not enter the HEIC converter.
  if (!isHeicFile(file)) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error("empty conversion result");
    }
    return toJpegFile(blob, file.name);
  } catch (err) {
    console.warn("HEIC conversion failed; uploading original file", err);
    return file;
  }
}
