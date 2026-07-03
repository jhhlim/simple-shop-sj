"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

function LoginForm() {
  const searchParams = useSearchParams();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (searchParams.get("verified") === "1") {
      setNotice("Your email is confirmed. Sign in to continue.");
    } else if (searchParams.get("verify") === "invalid") {
      setNotice("That confirmation link is invalid or expired. Sign in to resend one.");
    } else if (searchParams.get("verify") === "missing") {
      setNotice("Confirmation link was missing. Sign in to resend one.");
    }
  }, [searchParams]);

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

    try {
      const res = await signIn("credentials", {
        login,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid username/email or password");
        return;
      }
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      window.location.href = callbackUrl;
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
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

      {authChecked && googleEnabled && (
        <>
          <div className="mt-6">
            <GoogleSignInButton label="Sign in with Google" />
          </div>

          <div className="my-6 flex items-center gap-3 text-xs text-stone-400">
            <div className="h-px flex-1 bg-stone-200" />
            or use username &amp; password
            <div className="h-px flex-1 bg-stone-200" />
          </div>
        </>
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
        <p className="text-right text-sm">
          <Link href="/forgot-password" className="underline text-stone-600 hover:text-stone-900">
            Forgot password?
          </Link>
        </p>
        {notice && (
          <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
            {notice}
          </p>
        )}
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-center text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
