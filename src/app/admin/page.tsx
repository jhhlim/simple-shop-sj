"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAdminGate } from "@/components/AdminAuth";
import {
  PRODUCT_CATEGORIES,
  SHOP_CATEGORY_LABELS,
  getCategoryLabel,
} from "@/lib/product-categories";
import {
  PRODUCT_CONDITIONS,
  getConditionLabel,
  getProductCondition,
} from "@/lib/product-condition";
import { compressImageForUpload, isHeicFile } from "@/lib/compress-image";
import { isPublicImageUrl } from "@/lib/image-url";
import type { Product, ProductCategory, ProductCondition } from "@/lib/types";

type ListingForm = {
  name: string;
  description: string;
  price: string;
  category: ProductCategory;
  condition: ProductCondition;
  imageUrl: string;
  stock: string;
  soldCount: string;
  sku: string;
};

const emptyForm: ListingForm = {
  name: "",
  description: "",
  price: "",
  category: "goods",
  condition: "pre-owned",
  imageUrl: "",
  stock: "1",
  soldCount: "0",
  sku: "",
};

/** Broad accept so browsers do not block JPG/HEIC selection. */
const PHOTO_ACCEPT = "image/*,.heic,.heif";

type ListingAnalysis = {
  name: string;
  description: string;
  sku: string;
  price: number;
  category: ProductCategory;
  condition: ProductCondition;
};

/**
 * Preview public http(s) URLs, local blob: previews, or /uploads/ in dev.
 */
function canPreviewImageUrl(src: string): boolean {
  const value = src.trim();
  if (!value) return false;
  if (value.startsWith("blob:")) return true;
  if (isPublicImageUrl(value)) return true;
  // /uploads/ only exists on local disk — never durable on Vercel.
  return value.startsWith("/uploads/") && process.env.NODE_ENV !== "production";
}

function AdminImagePreview({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const displayable = canPreviewImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!displayable || failed) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-2 text-center text-xs text-stone-500">
        No photo
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin previews use public blob URLs; next/image can mis-serve HEIC/dynamic uploads
    <img
      src={src}
      alt={alt}
      className="h-32 w-32 rounded-lg border border-stone-200 object-cover bg-stone-100"
      onError={() => setFailed(true)}
    />
  );
}

function AdminThumb({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const displayable = canPreviewImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!displayable || failed) {
    return (
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-1 text-center text-[10px] font-medium uppercase tracking-wide text-stone-400">
        No photo
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-16 w-16 shrink-0 rounded-lg border border-stone-200 object-cover bg-stone-100"
      onError={() => setFailed(true)}
    />
  );
}

function PhotoFieldStatus({
  uploading,
  converting,
  error,
  fileName,
}: {
  uploading: boolean;
  converting: boolean;
  error: string;
  fileName: string;
}) {
  if (uploading) {
    return (
      <p className="mt-1 text-xs font-medium text-stone-600">
        {converting
          ? `Uploading HEIC${fileName ? ` “${fileName}”` : ""}…`
          : `Uploading${fileName ? ` “${fileName}”` : ""}…`}
      </p>
    );
  }
  if (error) {
    return <p className="mt-1 text-xs font-medium text-red-600">{error}</p>;
  }
  if (fileName) {
    return <p className="mt-1 text-xs text-stone-500">Selected: {fileName}</p>;
  }
  return null;
}

export default function AdminPage() {
  const { ready } = useAdminGate();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState<"create" | "edit" | null>(null);
  const [photoError, setPhotoError] = useState<{ create: string; edit: string }>({
    create: "",
    edit: "",
  });
  const [photoFileName, setPhotoFileName] = useState<{ create: string; edit: string }>({
    create: "",
    edit: "",
  });
  const [photoIsHeic, setPhotoIsHeic] = useState<{ create: boolean; edit: boolean }>({
    create: false,
    edit: false,
  });
  const [analyzing, setAnalyzing] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const createPreviewRef = useRef<string | null>(null);
  const editPreviewRef = useRef<string | null>(null);

  function revokePreview(target: "create" | "edit") {
    const ref = target === "create" ? createPreviewRef : editPreviewRef;
    if (ref.current) {
      URL.revokeObjectURL(ref.current);
      ref.current = null;
    }
  }

  function setLocalPreview(target: "create" | "edit", file: File) {
    revokePreview(target);
    const localUrl = URL.createObjectURL(file);
    if (target === "create") {
      createPreviewRef.current = localUrl;
      setForm((f) => ({ ...f, imageUrl: localUrl }));
    } else {
      editPreviewRef.current = localUrl;
      setEditForm((f) => ({ ...f, imageUrl: localUrl }));
    }
  }

  useEffect(() => {
    return () => {
      revokePreview("create");
      revokePreview("edit");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup object URLs on unmount only
  }, []);

  async function loadProducts() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }

  useEffect(() => {
    if (ready) {
      loadProducts();
    }
  }, [ready]);

  async function handleUpload(file: File, target: "create" | "edit") {
    const wasHeic = isHeicFile(file);
    setUploading(target);
    setMessage("");
    setPhotoError((prev) => ({ ...prev, [target]: "" }));
    setPhotoFileName((prev) => ({ ...prev, [target]: file.name }));
    setPhotoIsHeic((prev) => ({ ...prev, [target]: wasHeic }));

    try {
      let uploadFile: File;

      if (wasHeic) {
        // Browsers (esp. Chrome) cannot decode HEIC — upload original; server converts to JPEG.
        if (file.size > 4 * 1024 * 1024) {
          throw new Error(
            "HEIC file is too large (max 4MB). Export as JPEG or use a smaller photo."
          );
        }
        uploadFile = file;
      } else {
        // Resize + JPEG-encode client-side so phone photos stay under Vercel body limits.
        try {
          uploadFile = await compressImageForUpload(file);
        } catch (prepErr) {
          throw new Error(
            prepErr instanceof Error
              ? prepErr.message
              : "Could not prepare photo for upload"
          );
        }
        setLocalPreview(target, uploadFile);
      }

      const body = new FormData();
      // Two-arg append preserves File name + type (image/jpeg, etc.).
      body.append("file", uploadFile);

      let res: Response;
      try {
        res = await fetch("/api/upload", {
          method: "POST",
          body,
          credentials: "same-origin",
        });
      } catch (networkErr) {
        const detail =
          networkErr instanceof Error ? networkErr.message : "network error";
        throw new Error(
          `Upload request failed (${detail}). Check your connection and try again.`
        );
      }

      const raw = await res.text();
      if (
        res.status === 413 ||
        /FUNCTION_PAYLOAD_TOO_LARGE|Request Entity Too Large/i.test(raw)
      ) {
        throw new Error(
          wasHeic
            ? "HEIC file is too large to upload. Export as JPEG or use a smaller photo."
            : "Photo still too large after compression. Try a smaller photo or export as JPEG."
        );
      }

      let data: { url?: string; error?: string } = {};
      try {
        data = raw ? (JSON.parse(raw) as { url?: string; error?: string }) : {};
      } catch {
        throw new Error(
          res.ok
            ? "Invalid server response"
            : `Upload failed (${res.status}): ${raw.slice(0, 160) || res.statusText}`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const url = typeof data.url === "string" ? data.url.trim() : "";
      if (!isPublicImageUrl(url) && !url.startsWith("/uploads/")) {
        throw new Error(
          `Upload did not return a usable image URL${url ? ` (got: ${url.slice(0, 80)})` : ""}`
        );
      }

      // Durable public URL for Save (replaces temporary blob: preview).
      revokePreview(target);
      if (target === "create") {
        setForm((f) => ({ ...f, imageUrl: url }));
      } else {
        setEditForm((f) => ({ ...f, imageUrl: url }));
      }
      setMessage(wasHeic ? "HEIC converted and uploaded." : "Image uploaded.");
      setPhotoError((prev) => ({ ...prev, [target]: "" }));
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Upload failed";
      setPhotoError((prev) => ({ ...prev, [target]: errorText }));
      setMessage(errorText);
      // Keep local JPEG preview when compress succeeded but upload failed.
    } finally {
      setUploading(null);
    }
  }

  function onPhotoSelected(target: "create" | "edit", input: HTMLInputElement) {
    const file = input.files?.[0] ?? null;
    // Reset so the same file can be re-selected after a failed upload.
    input.value = "";
    if (!file) {
      setPhotoError((prev) => ({
        ...prev,
        [target]: "No file was selected. Try again, or pick a JPG/PNG/WebP photo.",
      }));
      return;
    }
    void handleUpload(file, target);
  }

  /**
   * Vision models need a public https URL or a data:image payload.
   * Browser blob: previews are converted to base64 so AI works before/without
   * a finished upload (OpenAI cannot fetch blob: URLs).
   */
  async function resolveImageForDescribe(imageUrl: string): Promise<string> {
    const value = imageUrl.trim();
    if (!value) {
      throw new Error("Add a photo first, then generate a description.");
    }
    if (value.startsWith("https://") || value.startsWith("http://")) {
      return value;
    }
    if (value.startsWith("data:image/")) {
      return value;
    }
    if (value.startsWith("blob:") || value.startsWith("/uploads/")) {
      const res = await fetch(value);
      if (!res.ok) {
        throw new Error("Could not read the photo for AI description.");
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("Could not read the photo for AI description.");
      }
      // Ensure a data:image/... payload even when the blob MIME is missing.
      const imageBlob =
        blob.type.startsWith("image/")
          ? blob
          : new Blob([blob], { type: "image/jpeg" });
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = typeof reader.result === "string" ? reader.result : "";
          if (!result.startsWith("data:image/")) {
            reject(new Error("Could not encode the photo for AI description."));
            return;
          }
          resolve(result);
        };
        reader.onerror = () =>
          reject(new Error("Could not read the photo for AI description."));
        reader.readAsDataURL(imageBlob);
      });
    }
    throw new Error("Add a photo first, then generate a description.");
  }

  function applyAnalysis(target: "create" | "edit", analysis: ListingAnalysis) {
    const patch: Partial<ListingForm> = {
      name: analysis.name,
      description: analysis.description,
      sku: analysis.sku,
      price: analysis.price > 0 ? analysis.price.toFixed(2) : "",
      category: analysis.category,
      condition: analysis.condition,
    };

    if (target === "create") {
      setForm((f) => ({ ...f, ...patch }));
    } else {
      setEditForm((f) => ({ ...f, ...patch }));
    }
  }

  function formHasAiContent(target: "create" | "edit"): boolean {
    const current = target === "create" ? form : editForm;
    return Boolean(
      current.name.trim() ||
        current.description.trim() ||
        current.sku.trim() ||
        current.price.trim()
    );
  }

  async function fetchListingAnalysis(
    target: "create" | "edit"
  ): Promise<ListingAnalysis> {
    const imageUrl = target === "create" ? form.imageUrl : editForm.imageUrl;
    if (!imageUrl.trim()) {
      throw new Error("Add a photo first, then run AI fill.");
    }
    const payloadUrl = await resolveImageForDescribe(imageUrl);
    const res = await fetch("/api/admin/products/describe-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ imageUrl: payloadUrl }),
    });
    let data: ListingAnalysis & { error?: string } = {
      name: "",
      description: "",
      sku: "",
      price: 0,
      category: "other",
      condition: "pre-owned",
    };
    try {
      data = (await res.json()) as ListingAnalysis & { error?: string };
    } catch {
      throw new Error(
        res.ok ? "Invalid server response" : `AI analysis failed (${res.status})`
      );
    }
    if (!res.ok) {
      throw new Error(data.error || "AI analysis failed");
    }
    const analysis: ListingAnalysis = {
      name: String(data.name || "").trim() || "Untitled item",
      description: String(data.description || "").trim() || "Resale item.",
      sku: String(data.sku || "").trim().toUpperCase(),
      price: Number(data.price) > 0 ? Number(data.price) : 0,
      category: data.category || "other",
      condition: data.condition || "pre-owned",
    };
    return analysis;
  }

  async function handleAutoFillFromPhoto(
    target: "create" | "edit",
    options?: { skipConfirm?: boolean }
  ) {
    const imageUrl = target === "create" ? form.imageUrl : editForm.imageUrl;
    if (!imageUrl.trim()) {
      const err = "Add a photo first, then auto-fill.";
      setMessage(err);
      setPhotoError((prev) => ({ ...prev, [target]: err }));
      return;
    }

    if (
      !options?.skipConfirm &&
      formHasAiContent(target) &&
      !confirm(
        "Replace title, description, SKU, price, category, and condition with AI suggestions from this photo?"
      )
    ) {
      return;
    }

    setAnalyzing(target);
    setMessage("");
    setPhotoError((prev) => ({ ...prev, [target]: "" }));
    try {
      const analysis = await fetchListingAnalysis(target);
      applyAnalysis(target, analysis);
      setMessage(
        "Listing auto-filled from photo — review title, price, category, and condition before saving."
      );
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Auto-fill failed";
      setMessage(errorText);
      setPhotoError((prev) => ({ ...prev, [target]: errorText }));
    } finally {
      setAnalyzing(null);
    }
  }

  function AutoFillButton({ target }: { target: "create" | "edit" }) {
    const imageUrl = target === "create" ? form.imageUrl : editForm.imageUrl;
    const busy = analyzing === target;
    const disabled = !imageUrl.trim() || busy;

    return (
      <div className="min-w-0 flex-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleAutoFillFromPhoto(target)}
          className="rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Analyzing photo…" : "Auto-fill from photo"}
        </button>
        <p className="mt-2 text-xs text-stone-500">
          Fills title, description, SKU, suggested price, category, and condition from
          the photo. Edit anything before saving. Requires{" "}
          <code className="rounded bg-stone-100 px-1">OPENAI_API_KEY</code> on Vercel.
        </p>
      </div>
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (uploading === "create") {
      setMessage("Wait for the photo upload to finish.");
      return;
    }
    if (form.imageUrl.startsWith("blob:")) {
      setMessage("Photo upload did not finish. Fix the photo error and try again.");
      return;
    }
    const sku = form.sku.trim();
    if (!sku) {
      setMessage("SKU is required — used to match photos during mass upload.");
      return;
    }
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        sku,
        price: Number(form.price),
        stock: Number(form.stock),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to create product");
      return;
    }
    revokePreview("create");
    setForm(emptyForm);
    setPhotoFileName((prev) => ({ ...prev, create: "" }));
    setPhotoIsHeic((prev) => ({ ...prev, create: false }));
    setPhotoError((prev) => ({ ...prev, create: "" }));
    setMessage("Product added.");
    await loadProducts();
  }

  function startEdit(product: Product) {
    revokePreview("edit");
    setEditingId(product.id);
    setPhotoError((prev) => ({ ...prev, edit: "" }));
    setPhotoFileName((prev) => ({ ...prev, edit: "" }));
    setPhotoIsHeic((prev) => ({ ...prev, edit: false }));
    setEditForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      condition: getProductCondition(product),
      imageUrl: product.imageUrl || "",
      stock: String(product.stock),
      soldCount: String(product.soldCount),
      sku: product.sku || "",
    });
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setMessage("");
    if (uploading === "edit") {
      setMessage("Wait for the photo upload to finish.");
      return;
    }
    if (editForm.imageUrl.startsWith("blob:")) {
      setMessage("Photo upload did not finish. Fix the photo error and try again.");
      return;
    }
    const res = await fetch(`/api/products/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        soldCount: Number(editForm.soldCount),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to update product");
      return;
    }
    revokePreview("edit");
    setEditingId(null);
    setPhotoFileName((prev) => ({ ...prev, edit: "" }));
    setPhotoIsHeic((prev) => ({ ...prev, edit: false }));
    setPhotoError((prev) => ({ ...prev, edit: "" }));
    setMessage("Product updated.");
    await loadProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await loadProducts();
  }

  if (!ready) {
    return <div className="px-4 py-16 text-center text-sm text-stone-500">Loading…</div>;
  }

  const createBusy = uploading === "create";
  const editBusy = uploading === "edit";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Listings</h1>
          <p className="mt-1 text-sm text-stone-600">
            Add items one at a time, or use{" "}
            <Link href="/admin/import" className="font-medium underline">
              Import &amp; Export
            </Link>{" "}
            for bulk updates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/products/export?format=csv"
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            Export CSV
          </a>
          <a
            href="/api/admin/products/export?format=xlsx"
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-50"
          >
            Export Excel
          </a>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">Add new item</h2>
          <Link
            href="/admin/import"
            className="text-sm font-medium text-stone-600 underline hover:text-stone-900"
          >
            Import many from Excel →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            SKU <span className="text-red-600">*</span>
            <input
              required
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="e.g. 710090R"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Required for photo mass upload — name image files{" "}
              <code className="rounded bg-stone-100 px-1">SKU.jpg</code> to match this item.
            </span>
          </label>
          <label className="block text-sm sm:col-span-2">
            Description
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Price (USD)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Stock
            <input
              required
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Category
            <select
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as ProductCategory })
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {SHOP_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Quality / condition
            <select
              value={form.condition}
              onChange={(e) =>
                setForm({ ...form, condition: e.target.value as ProductCondition })
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              {PRODUCT_CONDITIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {getConditionLabel(condition)}
                </option>
              ))}
            </select>
          </label>
          <div className="block text-sm sm:col-span-2">
            <label className="block">
              Photo
              <input
                type="file"
                accept={PHOTO_ACCEPT}
                disabled={createBusy}
                onChange={(e) => onPhotoSelected("create", e.target)}
                className="mt-1 block w-full text-sm"
              />
            </label>
            <PhotoFieldStatus
              uploading={createBusy}
              converting={createBusy && photoIsHeic.create}
              error={photoError.create}
              fileName={photoFileName.create}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-4">
          <AdminImagePreview src={form.imageUrl} alt="Preview" />
          <AutoFillButton target="create" />
        </div>
        <button
          type="submit"
          disabled={createBusy}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          Add product
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <h2 className="font-medium">Current listings ({products.length})</h2>
        <p className="text-sm text-stone-500">
          Click Edit to update price, stock, sold count, photos, category, condition, or
          description.
        </p>
        {products.map((p) => (
          <div key={p.id} className="rounded-xl border border-stone-200 bg-white p-4">
            {editingId === p.id ? (
              <form onSubmit={handleUpdate} className="space-y-3">
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <textarea
                  required
                  rows={2}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    placeholder="Price"
                  />
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    placeholder="Stock"
                  />
                  <label className="block text-sm sm:col-span-2">
                    Sold count
                    <input
                      type="number"
                      min="0"
                      value={editForm.soldCount}
                      onChange={(e) =>
                        setEditForm({ ...editForm, soldCount: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    />
                    <span className="mt-1 block text-xs text-stone-500">
                      Usually updated automatically when someone buys on the site. Edit here
                      for sales on eBay, Facebook, or in person.
                    </span>
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        category: e.target.value as ProductCategory,
                      })
                    }
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    {PRODUCT_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {SHOP_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editForm.condition}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        condition: e.target.value as ProductCondition,
                      })
                    }
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    {PRODUCT_CONDITIONS.map((condition) => (
                      <option key={condition} value={condition}>
                        {getConditionLabel(condition)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="block text-sm">
                  <label className="block">
                    Photo
                    <input
                      type="file"
                      accept={PHOTO_ACCEPT}
                      disabled={editBusy}
                      onChange={(e) => onPhotoSelected("edit", e.target)}
                      className="mt-1 block w-full text-sm"
                    />
                  </label>
                  <PhotoFieldStatus
                    uploading={editBusy}
                    converting={editBusy && photoIsHeic.edit}
                    error={photoError.edit}
                    fileName={photoFileName.edit}
                  />
                </div>
                <label className="block text-sm">
                  SKU
                  <input
                    value={editForm.sku}
                    onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                    placeholder="e.g. 710090R"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="flex flex-wrap items-start gap-4">
                  <AdminImagePreview src={editForm.imageUrl} alt="Preview" />
                  <AutoFillButton target="edit" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editBusy}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      revokePreview("edit");
                      setEditingId(null);
                      setPhotoError((prev) => ({ ...prev, edit: "" }));
                      setPhotoFileName((prev) => ({ ...prev, edit: "" }));
                      setPhotoIsHeic((prev) => ({ ...prev, edit: false }));
                    }}
                    className="text-sm underline"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AdminThumb src={p.imageUrl || ""} alt={p.name} />
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-stone-500">
                      ${p.price.toFixed(2)} · {getCategoryLabel(p.category)} ·{" "}
                      {getConditionLabel(getProductCondition(p))} · {p.stock} in stock ·{" "}
                      {p.soldCount} sold
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <button type="button" onClick={() => startEdit(p)} className="underline">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {message && (
        <p
          className={`mt-4 text-sm font-medium ${
            /fail|error|add openai|required|could not|forbidden|sign in/i.test(message)
              ? "text-red-600"
              : "text-stone-600"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
