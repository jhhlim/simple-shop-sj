/** Client-only HEIC/HEIF helpers. Do not import from server code. */

const HEIC_EXT = /\.(heic|heif)$/i;
const HEIC_CONVERT_ERROR =
  "Could not convert HEIC photo. Try exporting as JPG.";

export function isHeicFile(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return HEIC_EXT.test(file.name);
}

/**
 * Convert HEIC/HEIF to JPEG in the browser so previews and Vercel Blob
 * storage always use a format every browser can display.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  try {
    const heic2any = (await import("heic2any")).default;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) {
      throw new Error("empty conversion result");
    }
    const baseName = file.name.replace(HEIC_EXT, "") || "photo";
    return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
  } catch (err) {
    if (err instanceof Error && err.message === HEIC_CONVERT_ERROR) throw err;
    throw new Error(HEIC_CONVERT_ERROR);
  }
}
