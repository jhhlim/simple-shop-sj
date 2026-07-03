"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAdminGate } from "@/components/AdminAuth";
import type { Product } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "goods" as Product["category"],
  imageUrl: "",
  stock: "1",
  sku: "",
};

export default function AdminPage() {
  const { ready } = useAdminGate();
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
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
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (target === "create") setForm((f) => ({ ...f, imageUrl: data.url }));
      else setEditForm((f) => ({ ...f, imageUrl: data.url }));
      setMessage("Image uploaded.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
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
      imageUrl: product.imageUrl,
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
                setForm({ ...form, category: e.target.value as Product["category"] })
              }
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            >
              <option value="goods">Used goods</option>
              <option value="jewelry">Jewelry</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm sm:col-span-2">
            Photo
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file, "create");
              }}
              className="mt-1 block w-full text-sm"
            />
          </label>
        </div>
        {form.imageUrl && (
          <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-stone-100">
            <Image src={form.imageUrl} alt="Preview" fill className="object-cover" />
          </div>
        )}
        <button
          type="submit"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
        >
          Add product
        </button>
      </form>

      <div className="mt-8 space-y-3">
        <h2 className="font-medium">Current listings ({products.length})</h2>
        <p className="text-sm text-stone-500">Click Edit to update price, stock, photos, or description.</p>
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
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
                <div className="grid gap-2 sm:grid-cols-3">
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
                        category: e.target.value as Product["category"],
                      })
                    }
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  >
                    <option value="goods">Used goods</option>
                    <option value="jewelry">Jewelry</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <label className="block text-sm">
                  Photo
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, "edit");
                    }}
                    className="mt-1 block w-full text-sm"
                  />
                </label>
                {editForm.imageUrl ? (
                  <div className="relative h-32 w-32 overflow-hidden rounded-lg bg-stone-100">
                    <Image
                      src={editForm.imageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      sizes="128px"
                    />
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-xs text-stone-500">
                    No photo — upload an image above
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm text-white"
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
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center border border-dashed border-stone-300 px-1 text-center text-[10px] font-medium uppercase tracking-wide text-stone-400">
                        No photo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-stone-500">
                      ${p.price.toFixed(2)} · {p.category} · {p.stock} in stock · {p.soldCount}{" "}
                      sold
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
