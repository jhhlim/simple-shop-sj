"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-stone-400">…</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/account" className="text-stone-600 hover:text-stone-900">
          {session.user.name || "Account"}
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-stone-500 hover:text-stone-800"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login" className="text-stone-600 hover:text-stone-900">
        Sign in
      </Link>
      <Link
        href="/register"
        className="rounded-lg border border-stone-300 px-2.5 py-1 text-stone-700 hover:bg-stone-50"
      >
        Create account
      </Link>
    </div>
  );
}
