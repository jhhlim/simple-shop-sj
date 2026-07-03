"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setGoogleEnabled(!!d.google))
      .catch(() => setGoogleEnabled(false))
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Registration failed");
      return;
    }

    const signInRes = await signIn("credentials", {
      login: username.trim().toLowerCase(),
      password,
      redirect: false,
    });

    setLoading(false);
    if (signInRes?.error) {
      setError("Account created — please sign in.");
      return;
    }
    const welcomeQuery = data.emailSent ? "?welcome=1" : "";
    window.location.href = `/account${welcomeQuery}`;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-stone-600">
        Save your cart and checkout faster next time. Or{" "}
        <Link href="/checkout" className="underline">
          shop as guest
        </Link>
        .
      </p>

      {authChecked && googleEnabled && (
        <>
          <div className="mt-6">
            <GoogleSignInButton label="Sign up with Google" />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
            <div className="h-px flex-1 bg-stone-200" />
            or register with username
            <div className="h-px flex-1 bg-stone-200" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${googleEnabled ? "" : "mt-6"}`}>
        <label className="block text-sm">
          Username *
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="letters, numbers, underscore"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Email *
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Password * <span className="text-stone-400">(min 8 characters)</span>
          <input
            required
            type="password"
            minLength={8}
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
