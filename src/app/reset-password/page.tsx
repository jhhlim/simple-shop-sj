"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not reset password");
      return;
    }
    setDone(true);
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Reset password</h1>
        <p className="mt-4 text-sm text-red-600">This reset link is invalid. Request a new one.</p>
        <Link href="/forgot-password" className="mt-6 inline-block text-sm font-medium underline">
          Forgot password
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold">Password updated</h1>
        <p className="mt-4 text-sm text-stone-600">You can now sign in with your new password.</p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-lg bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-700"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          New password
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Confirm password
          <input
            required
            type="password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-stone-900 py-3 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="px-4 py-12 text-center text-sm">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
