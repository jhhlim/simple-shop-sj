"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminGate } from "@/components/AdminAuth";

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

export default function AdminImportPage() {
  const { ready } = useAdminGate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [photoResult, setPhotoResult] = useState<PhotoResult | null>(null);
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
        ? "Excel template"
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

  async function handlePhotos(files: FileList | null) {
    if (!files?.length) return;
    setLoading("photos");
    setMessage("");
    setPhotoResult(null);
    const body = new FormData();
    Array.from(files).forEach((f) => body.append("files", f));
    const res = await fetch("/api/admin/import/photos", { method: "POST", body });
    const data = await res.json();
    setLoading(null);
    if (!res.ok) {
      setMessage(data.error || "Photo import failed");
      return;
    }
    setPhotoResult(data);
    setMessage(`Photos: ${data.matched} matched, ${data.unmatched} unmatched.`);
  }

  if (!ready) {
    return <div className="px-4 py-16 text-center text-sm text-stone-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Import from Excel</h1>
          <p className="mt-1 text-sm text-stone-600">
            Same fields as &ldquo;New product&rdquo; on the listings page.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/admin" className="underline">
            Listings
          </Link>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950">
        <p className="font-medium">Excel columns (row 1 = headers)</p>
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
          <span className="rounded bg-white/70 px-1.5 py-0.5">Other</span> — same as the
          dropdown on Manage listings.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/api/admin/import/template?format=xlsx"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            Download Excel template
          </a>
          <a
            href="/api/admin/import/template?format=csv"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm hover:bg-stone-50"
          >
            Download CSV template
          </a>
        </div>
      </section>

      <section className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Upload spreadsheet</h2>
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
          .xlsx, .xls, or .csv. Square / eBay exports still work automatically.
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
            Update existing (match by SKU)
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

      <section className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Bulk photos (optional)</h2>
        <p className="text-sm text-stone-600">
          If you didn&apos;t use Image URL in the spreadsheet, upload photos named by{" "}
          <strong>SKU</strong> (e.g. <code className="rounded bg-stone-100 px-1">RING001.jpg</code>
          ).
        </p>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => handlePhotos(e.target.files)}
          className="block w-full text-sm"
        />
        {photoResult && photoResult.unmatchedFiles.length > 0 && (
          <p className="text-sm text-amber-800">
            {photoResult.unmatched} file(s) didn&apos;t match a SKU — rename and try again.
          </p>
        )}
      </section>

      {message && <p className="mt-4 text-sm text-stone-700">{message}</p>}
    </div>
  );
}
