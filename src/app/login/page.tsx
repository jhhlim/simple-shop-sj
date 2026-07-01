"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(!!d.google))
      .catch(() => setGoogleEnabled(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      login,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Invalid username/email or password");
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-stone-600">
        Sign in to save your cart across devices. Or{" "}
        <Link href="/checkout" className="underline">
          continue as guest
        </Link>
        .
      </p>

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white py-3 font-medium hover:bg-stone-50"
          >
            Continue with Google
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
            <div className="h-px flex-1 bg-stone-200" />
            or sign in with username
            <div className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}

      {!googleEnabled && (
        <p className="mt-4 text-xs text-stone-500">
          Google sign-in is not configured yet — use username/password or continue as guest.
        </p>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${googleEnabled ? "" : "mt-6"}`}>
        <label className="block text-sm">
          Username or email
          <input
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-900 py-3 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        No account?{" "}
        <Link href="/register" className="font-medium underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
