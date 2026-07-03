"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useAdminGate } from "@/components/AdminAuth";
import type { Product } from "@/lib/types";

type CouponRow = { code: string; percentOff: number; active: boolean };

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "goods" as Product["category"],
  imageUrl: "",
  stock: "1",
};

export default function AdminPage() {
  const { ready } = useAdminGate();
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [couponForm, setCouponForm] = useState({ code: "", percentOff: "10" });

  async function loadProducts() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }

  async function loadCoupons() {
    const res = await fetch("/api/admin/coupons");
    if (!res.ok) return;
    const data = await res.json();
    setCoupons(data.coupons || []);
  }

  useEffect(() => {
    if (ready) {
      loadProducts();
      loadCoupons();
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
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
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

  async function handleCreateCoupon(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: couponForm.code,
        percentOff: Number(couponForm.percentOff),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to create coupon");
      return;
    }
    setCouponForm({ code: "", percentOff: "10" });
    setMessage(`Coupon ${data.code} created.`);
    await loadCoupons();
  }

  async function toggleCoupon(code: string, active: boolean) {
    await fetch("/api/admin/coupons", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, active }),
    });
    await loadCoupons();
  }

  async function removeCoupon(code: string) {
    if (!confirm(`Delete coupon ${code}?`)) return;
    await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, {
      method: "DELETE",
    });
    await loadCoupons();
  }

  if (!ready) {
    return <div className="px-4 py-16 text-center text-sm text-stone-500">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Manage listings</h1>
          <p className="mt-1 text-sm text-stone-600">
            <Link href="/admin/orders" className="font-medium underline">
              Fulfill orders →
            </Link>
            {" · "}
            <Link href="/admin/import" className="font-medium underline">
              Bulk import CSV &amp; photos →
            </Link>
          </p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium">New product</h2>
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
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, "edit");
                  }}
                  className="text-sm"
                />
                {editForm.imageUrl && (
                  <p className="text-xs text-stone-500">Image: {editForm.imageUrl}</p>
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
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-stone-500">
                    ${p.price.toFixed(2)} · {p.category} · {p.stock} in stock · {p.soldCount}{" "}
                    sold
                  </p>
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

      <form
        onSubmit={handleCreateCoupon}
        className="mt-10 space-y-4 rounded-xl border border-stone-200 bg-white p-5"
      >
        <h2 className="font-medium">Coupon codes</h2>
        <div className="flex flex-wrap gap-3">
          <input
            required
            placeholder="CODE"
            value={couponForm.code}
            onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm uppercase"
          />
          <input
            required
            type="number"
            min="1"
            max="100"
            value={couponForm.percentOff}
            onChange={(e) => setCouponForm({ ...couponForm, percentOff: e.target.value })}
            className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
          />
          <span className="self-center text-sm text-stone-500">% off</span>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm text-white hover:bg-stone-700"
          >
            Add coupon
          </button>
        </div>
        <ul className="space-y-2 text-sm">
          {coupons.map((c) => (
            <li
              key={c.code}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
            >
              <span>
                <strong>{c.code}</strong> — {c.percentOff}% off{" "}
                {!c.active && <span className="text-amber-700">(inactive)</span>}
              </span>
              <span className="flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleCoupon(c.code, !c.active)}
                  className="underline"
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => removeCoupon(c.code)}
                  className="text-red-600 underline"
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      </form>

      {message && <p className="mt-4 text-sm text-stone-600">{message}</p>}
    </div>
  );
}
