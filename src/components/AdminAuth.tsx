"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

export function useAdminAuth() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    return fetch("/api/admin/session", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthenticated(!!d.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  useEffect(() => {
    refresh().finally(() => setChecking(false));
  }, [refresh]);

  async function login(password: string) {
    setError("");
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Wrong password");
      return false;
    }
    await refresh();
    return true;
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAuthenticated(false);
  }

  return { authenticated, checking, error, setError, login, logout, refresh };
}

export function adminFetch(input: RequestInfo, init?: RequestInit) {
  return fetch(input, { ...init, credentials: "include" });
}

export function AdminLoginForm({
  onLogin,
  error,
}: {
  onLogin: (password: string) => Promise<boolean>;
  error: string;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    await onLogin(password);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold">Admin login</h1>
      <p className="mt-1 text-sm text-stone-500">Store management — not linked in the shop menu.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-stone-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-900 py-2 text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Enter"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
