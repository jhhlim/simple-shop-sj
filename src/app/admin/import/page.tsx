"use client";

import { useState } from "react";
import { useAdminGate } from "@/components/AdminAuth";
import { compressImageForUpload, isHeicFile } from "@/lib/compress-image";

type PreviewData = {
  format: string;
  totalRows: number;
  importable: { name: string }[];
  skipped: { reason: string; name: string }[];
  sample: {
    name: string;
    price: number;
    stock: number;
    sku: string;
    category: string;
    hasImage: boolean;
  }[];
};

type ImportResult = {
  format: string;
  created: number;
  updated: number;
  skipped: number;
  skippedArchived: number;
  errors: string[];
};

type PhotoResult = {
  total: number;
  matched: number;
  unmatched: number;
  results: { file: string; product: string; matchedBy: string }[];
  unmatchedFiles: string[];
  errors: string[];
};

const COLUMNS = [
  { col: "Name", note: "required" },
  { col: "Description", note: "optional" },
  { col: "Price", note: "required, e.g. 19.99" },
  { col: "Category", note: "Used goods · Jewelry · Other" },
  { col: "Stock", note: "optional, default 1" },
  { col: "SKU", note: "optional, for photo matching" },
  { col: "Image URL", note: "optional" },
];

const PHOTO_FETCH_TIMEOUT_MS = 120_000;
const PHOTO_MAX_RETRIES = 4;
const PHOTO_RETRY_BASE_MS = 1_500;
const PHOTO_GAP_MS = 350;
const PHOTO_ACCEPT = "image/*,.heic,.heif";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableUploadError(error?: string): boolean {
  if (!error) return false;
  return (
    error === "Failed to fetch" ||
    error === "Timed out" ||
    error === "NetworkError when attempting to fetch resource." ||
    /^Upload failed \(5\d\d\)$/.test(error)
  );
}

function emptyPhotoResult(): PhotoResult {
  return {
    total: 0,
    matched: 0,
    unmatched: 0,
    results: [],
    unmatchedFiles: [],
    errors: [],
  };
}

function chunkPhotoFiles(files: File[]): File[][] {
  // One file per request is most reliable on Vercel (avoids body limits and connection drops).
  return files.map((file) => [file]);
}

async function uploadPhotoBatch(batch: File[]): Promise<PhotoResult & { error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PHOTO_FETCH_TIMEOUT_MS);
  try {
    const body = new FormData();
    batch.forEach((f) => body.append("files", f));
    const res = await fetch("/api/admin/import/photos", {
      method: "POST",
      body,
      credentials: "same-origin",
      signal: controller.signal,
    });
    const raw = await res.text();
    if (res.status === 413 || /FUNCTION_PAYLOAD_TOO_LARGE|Request Entity Too Large/i.test(raw)) {
      return {
        ...emptyPhotoResult(),
        error:
          "Photo is too large to upload. For HEIC use a file under 4MB, or export as JPEG.",
      };
    }

    let data: PhotoResult & { error?: string };
    try {
      data = JSON.parse(raw) as PhotoResult & { error?: string };
    } catch {
      return {
        ...emptyPhotoResult(),
        error: res.ok ? "Invalid server response" : `Upload failed (${res.status})`,
      };
    }
    if (!res.ok) {
      return { ...emptyPhotoResult(), error: data.error || `Upload failed (${res.status})` };
    }
    return data;
  } catch (err) {
    const msg =
      err instanceof Error && err.name === "AbortError"
        ? "Timed out"
        : err instanceof Error
          ? err.message
          : "Upload failed";
    return { ...emptyPhotoResult(), error: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function uploadPhotoWithRetry(batch: File[]): Promise<PhotoResult & { error?: string }> {
  let result = await uploadPhotoBatch(batch);
  if (!result.error) return result;

  for (let attempt = 1; attempt < PHOTO_MAX_RETRIES && isRetryableUploadError(result.error); attempt++) {
    await sleep(PHOTO_RETRY_BASE_MS * attempt);
    result = await uploadPhotoBatch(batch);
    if (!result.error) return result;
  }

  return result;
}

function mergePhotoResults(target: PhotoResult, source: PhotoResult) {
  target.matched += source.matched;
  target.unmatched += source.unmatched;
  target.results.push(...source.results);
  target.unmatchedFiles.push(...source.unmatchedFiles);
  target.errors.push(...source.errors);
}

export default function AdminImportPage() {
  const { ready } = useAdminGate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null);
  const [photoProgress, setPhotoProgress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState<"preview" | "import" | "photos" | null>(null);

  async function handlePreview() {
    if (!file) return;
    setLoading("preview");
    setMessage("");
    setImportResult(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/import/preview", { method: "POST", body });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Preview failed");
      setPreview(null);
      return;
    }
    setPreview(data);
    const label =
      data.format === "simple"
        ? "Template format"
        : data.format === "square"
          ? "Square export"
          : data.format === "ebay"
            ? "eBay export"
            : "spreadsheet";
    setMessage(`${label}: ${data.importable.length} items ready.`);
  }

  async function handleImport() {
    if (!file) return;
    setLoading("import");
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    body.append("updateExisting", String(updateExisting));
    const res = await fetch("/api/admin/import/products", { method: "POST", body });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Import failed");
      return;
    }
    setImportResult(data);
    setMessage(`Done: ${data.created} added, ${data.updated} updated.`);
  }

  async function handlePhotos(files: File[] | FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setLoading("photos");
    setMessage("");
    setPhotoResult(null);
    setPhotoProgress("");

    const chunks = chunkPhotoFiles(list);
    const combined: PhotoResult = {
      total: list.length,
      matched: 0,
      unmatched: 0,
      results: [],
      unmatchedFiles: [],
      errors: [],
    };

    for (let batchIndex = 0; batchIndex < chunks.length; batchIndex++) {
      const batch = chunks[batchIndex]!;
      const file = batch[0]!;
      const heic = isHeicFile(file);
      setPhotoProgress(
        heic
          ? `Uploading HEIC ${file.name} (${batchIndex + 1} of ${list.length})…`
          : `Uploading ${file.name} (${batchIndex + 1} of ${list.length})…`
      );

      let uploadBatch: File[];
      try {
        uploadBatch = await Promise.all(
          batch.map(async (f) => {
            if (isHeicFile(f)) {
              // Browsers cannot decode HEIC — upload original; server converts to JPEG.
              if (f.size > 4 * 1024 * 1024) {
                throw new Error(
                  "HEIC file is too large (max 4MB). Export as JPEG or use a smaller photo."
                );
              }
              return f;
            }
            return compressImageForUpload(f);
          })
        );
      } catch (err) {
        combined.errors.push(
          `${file.name}: ${err instanceof Error ? err.message : "Could not prepare photo. Try exporting as JPG."}`
        );
        if (batchIndex < chunks.length - 1) await sleep(PHOTO_GAP_MS);
        continue;
      }

      const data = await uploadPhotoWithRetry(uploadBatch);

      if (!data.error) {
        mergePhotoResults(combined, data);
        if (batchIndex < chunks.length - 1) await sleep(PHOTO_GAP_MS);
        continue;
      }

      combined.errors.push(`${file.name}: ${data.error}`);
      if (batchIndex < chunks.length - 1) await sleep(PHOTO_GAP_MS);
    }

    setLoading(null);
    setPhotoProgress("");
    setPhotoResult(combined);
    setMessage(
      `Photos done: ${combined.matched} matched, ${combined.unmatched} unmatched` +
        (combined.errors.length ? `, ${combined.errors.length} errors` : "") +
        "."
    );
  }

  if (!ready) {
    return <div className="px-4 py-16 text-center text-sm text-stone-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Import &amp; Export</h1>
        <p className="mt-1 text-sm text-stone-600">
          Square-style workflow: download a template or export your catalog, edit in Excel, then
          re-import. Same columns either way.
        </p>
      </div>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">1. Download template or export catalog</h2>
        <p className="mt-1 text-sm text-stone-600">
          Use the blank template for new items, or export your current listings to edit in bulk.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/admin/import/template?format=xlsx"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Blank Excel template
          </a>
          <a
            href="/api/admin/import/template?format=csv"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50"
          >
            Blank CSV template
          </a>
          <a
            href="/api/admin/products/export?format=xlsx"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50"
          >
            Export all listings (Excel)
          </a>
          <a
            href="/api/admin/products/export?format=csv"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50"
          >
            Export all listings (CSV)
          </a>
        </div>
      </section>

      <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
        <h2 className="font-medium text-blue-950">Column reference</h2>
        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="border-b border-blue-200 text-blue-800">
              <th className="py-1 pr-4">Column</th>
              <th className="py-1">Notes</th>
            </tr>
          </thead>
          <tbody>
            {COLUMNS.map((c) => (
              <tr key={c.col} className="border-b border-blue-100">
                <td className="py-1.5 pr-4 font-medium">{c.col}</td>
                <td className="py-1.5 text-blue-900">{c.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">
          <strong>Category</strong> must be one of:{" "}
          <span className="rounded bg-white/70 px-1.5 py-0.5">Used goods</span>,{" "}
          <span className="rounded bg-white/70 px-1.5 py-0.5">Jewelry</span>, or{" "}
          <span className="rounded bg-white/70 px-1.5 py-0.5">Other</span>.
        </p>
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">2. Import spreadsheet</h2>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setPreview(null);
            setImportResult(null);
          }}
          className="block w-full text-sm"
        />
        <p className="text-xs text-stone-500">
          .xlsx, .xls, or .csv. Square and eBay exports are also detected automatically.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!file || loading !== null}
            onClick={handlePreview}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm hover:bg-stone-50 disabled:opacity-50"
          >
            {loading === "preview" ? "Previewing…" : "Preview"}
          </button>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={updateExisting}
              onChange={(e) => setUpdateExisting(e.target.checked)}
            />
            Update existing items (match by SKU)
          </label>
          <button
            type="button"
            disabled={!file || loading !== null}
            onClick={handleImport}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {loading === "import" ? "Importing…" : "Import to shop"}
          </button>
        </div>

        {preview && preview.sample.length > 0 && (
          <div className="overflow-x-auto">
            <table className="mt-2 w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Price</th>
                  <th className="py-2 pr-2">Stock</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2">SKU</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row) => (
                  <tr key={row.sku + row.name} className="border-b border-stone-100">
                    <td className="max-w-xs truncate py-2 pr-2">{row.name}</td>
                    <td className="py-2 pr-2">${row.price.toFixed(2)}</td>
                    <td className="py-2 pr-2">{row.stock}</td>
                    <td className="py-2 pr-2">{row.category}</td>
                    <td className="py-2">{row.sku || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {importResult && (
          <p className="text-sm text-green-800">
            Added {importResult.created}, updated {importResult.updated}, skipped{" "}
            {importResult.skipped}.
          </p>
        )}
      </section>

      <section className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">3. Bulk photos (optional)</h2>
        <p className="text-sm text-stone-600">
          If you didn&apos;t use Image URL in the spreadsheet, upload photos named by{" "}
          <strong>SKU</strong> (e.g. <code className="rounded bg-stone-100 px-1">710090R.jpg</code>
          ). Import your listings first so SKUs exist to match against.
        </p>
        <input
          type="file"
          accept={PHOTO_ACCEPT}
          multiple
          disabled={loading === "photos"}
          onChange={(e) => {
            const picked = e.target.files ? Array.from(e.target.files) : [];
            setPhotoFiles(picked);
            setPhotoResult(null);
            if (!picked.length) setMessage("");
          }}
          className="block w-full text-sm"
        />
        {photoFiles.length > 0 && (
          <p className="text-sm text-stone-600">
            {photoFiles.length} file(s) selected — uploads run one at a time with automatic retries.
            Large sets may take several minutes; keep this tab open.
          </p>
        )}
        <button
          type="button"
          disabled={photoFiles.length === 0 || loading !== null}
          onClick={() => handlePhotos(photoFiles)}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading === "photos" ? "Uploading photos…" : "Upload photos to shop"}
        </button>
        {photoProgress && <p className="text-sm text-stone-500">{photoProgress}</p>}
        {photoResult && photoResult.matched > 0 && (
          <p className="text-sm text-green-800">
            {photoResult.matched} photo(s) attached to listings.
          </p>
        )}
        {photoResult && photoResult.unmatchedFiles.length > 0 && (
          <p className="text-sm text-amber-800">
            {photoResult.unmatched} file(s) didn&apos;t match a SKU — check filenames and try again.
          </p>
        )}
        {photoResult && photoResult.errors.length > 0 && (
          <div className="text-sm text-red-700">
            <p>
              {photoResult.errors.length} upload error(s). Try fewer files per batch or use Image URL
              in your spreadsheet.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {photoResult.errors.slice(0, 10).map((err) => (
                <li key={err}>{err}</li>
              ))}
              {photoResult.errors.length > 10 && (
                <li>…and {photoResult.errors.length - 10} more</li>
              )}
            </ul>
          </div>
        )}
      </section>

      {message && <p className="mt-4 text-sm text-stone-700">{message}</p>}
    </div>
  );
}
