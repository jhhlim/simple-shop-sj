"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Product } from "@/lib/types";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "goods" as Product["category"],
    imageUrl: "",
  });
  const [uploading, setUploading] = useState(false);

  async function loadProducts() {
    const res = await fetch("/api/products");
    setProducts(await res.json());
  }

  useEffect(() => {
    if (loggedIn) loadProducts();
  }, [loggedIn]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setMessage("");
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Wrong password");
      return;
    }
    setLoggedIn(true);
    setMessage("");
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setMessage("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "x-admin-password": password },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm((f) => ({ ...f, imageUrl: data.url }));
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
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({
        ...form,
        price: Number(form.price),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(
        data.error === "Unauthorized"
          ? "Session expired or wrong password — log out and sign in again."
          : data.error || "Failed to create product"
      );
      return;
    }
    setForm({ name: "", description: "", price: "", category: "goods", imageUrl: "" });
    setMessage("Product added.");
    await loadProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    await loadProducts();
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16">
        <h1 className="text-xl font-semibold">Admin login</h1>
        <form onSubmit={handleLogin} className="mt-4 space-y-3">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-stone-900 py-2 text-white hover:bg-stone-700"
          >
            Enter
          </button>
        </form>
        {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Manage listings</h1>
      <p className="mt-1 text-sm text-stone-600">
        Add used goods and jewelry for sale.{" "}
        <Link href="/admin/orders" className="font-medium underline">
          Fulfill orders →
        </Link>
      </p>

      <form onSubmit={handleCreate} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">New product</h2>
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
                if (file) handleUpload(file);
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
        {message && <p className="text-sm text-stone-600">{message}</p>}
      </form>

      <div className="mt-8 space-y-3">
        <h2 className="font-medium">Current listings ({products.length})</h2>
        {products.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-stone-500">
                ${p.price.toFixed(2)} · {p.category}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(p.id)}
              className="text-sm text-red-600 hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
