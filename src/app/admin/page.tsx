"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
import { prepareImageForUpload } from "@/lib/heic-client";
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
  sku: "",
};

const PHOTO_ACCEPT = "image/*,.heic,.heif,image/heic,image/heif";

/**
 * Preview only public http(s) URLs, or local /uploads/ paths from dev storage.
 * Empty, relative-on-Vercel, and unloadable (e.g. HEIC mislabeled as JPEG) show "No photo".
 */
function canPreviewImageUrl(src: string): boolean {
  const value = src.trim();
  if (!value) return false;
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

export default function AdminPage() {
  const { ready } = useAdminGate();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [describing, setDescribing] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

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
    setUploading(true);
    setMessage("");
    try {
      const uploadFile = await prepareImageForUpload(file);
      const body = new FormData();
      body.append("file", uploadFile);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = typeof data.url === "string" ? data.url : "";
      if (!isPublicImageUrl(url) && !url.startsWith("/uploads/")) {
        throw new Error("Upload did not return a usable image URL");
      }
      if (target === "create") setForm((f) => ({ ...f, imageUrl: url }));
      else setEditForm((f) => ({ ...f, imageUrl: url }));
      setMessage("Image uploaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerateDescription(target: "create" | "edit") {
    const imageUrl = target === "create" ? form.imageUrl : editForm.imageUrl;
    if (!imageUrl.trim()) {
      setMessage("Upload a photo first, then generate a description.");
      return;
    }

    const currentDescription =
      target === "create" ? form.description : editForm.description;
    if (
      currentDescription.trim() &&
      !confirm("Replace the current description with an AI-generated one?")
    ) {
      return;
    }

    setDescribing(target);
    setMessage("");
    try {
      const res = await fetch("/api/admin/products/describe-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate description");
      if (target === "create") {
        setForm((f) => ({ ...f, description: data.description }));
      } else {
        setEditForm((f) => ({ ...f, description: data.description }));
      }
      setMessage("Description generated.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI description failed");
    } finally {
      setDescribing(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setMessage("");
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
    setForm(emptyForm);
    setMessage("Product added.");
    await loadProducts();
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      condition: getProductCondition(product),
      imageUrl: product.imageUrl || "",
      stock: String(product.stock),
      sku: product.sku || "",
    });
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setMessage("");
    const res = await fetch(`/api/products/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to update product");
      return;
    }
    setEditingId(null);
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
          <label className="block text-sm sm:col-span-2">
            Photo
            <input
              type="file"
              accept={PHOTO_ACCEPT}
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, "create");
                e.target.value = "";
              }}
              className="mt-1 block w-full text-sm"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <AdminImagePreview src={form.imageUrl} alt="Preview" />
          <button
            type="button"
            disabled={!form.imageUrl || describing === "create" || uploading}
            onClick={() => handleGenerateDescription("create")}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {describing === "create" ? "Generating…" : "Generate AI description"}
          </button>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add product
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <h2 className="font-medium">Current listings ({products.length})</h2>
        <p className="text-sm text-stone-500">
          Click Edit to update price, stock, photos, category, condition, or description.
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
                  />
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    placeholder="Stock"
                  />
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
                <label className="block text-sm">
                  Photo
                  <input
                    type="file"
                    accept={PHOTO_ACCEPT}
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, "edit");
                      e.target.value = "";
                    }}
                    className="mt-1 block w-full text-sm"
                  />
                </label>
                <div className="flex flex-wrap items-start gap-3">
                  <AdminImagePreview src={editForm.imageUrl} alt="Preview" />
                  <button
                    type="button"
                    disabled={!editForm.imageUrl || describing === "edit" || uploading}
                    onClick={() => handleGenerateDescription("edit")}
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {describing === "edit" ? "Generating…" : "Generate AI description"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
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

      {message && <p className="mt-4 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
