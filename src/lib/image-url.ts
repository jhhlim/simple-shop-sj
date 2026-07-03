/**
 * True when the URL can be shown in an <img> on production (public http(s)).
 * Relative /uploads/... paths only work in local `public/` and break on Vercel.
 */
export function isPublicImageUrl(url: string | null | undefined): boolean {
  const value = String(url || "").trim();
  if (!value) return false;
  return value.startsWith("https://") || value.startsWith("http://");
}

/**
 * Normalize image URLs before persisting.
 * Drops local-only /uploads/ paths on Vercel so we never store dead links.
 */
export function normalizeStoredImageUrl(url: unknown): string {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (value.startsWith("/uploads/")) {
    if (process.env.VERCEL) return "";
    return value;
  }
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return "";
}
