"use client";

import { useState } from "react";

type Props = {
  emailVerified: boolean;
  initialBanner?: "welcome" | "verified" | "invalid" | "missing" | null;
};

export function AccountEmailBanner({ emailVerified, initialBanner }: Props) {
  const [verified, setVerified] = useState(emailVerified);
  const [banner, setBanner] = useState(initialBanner);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resending, setResending] = useState(false);

  async function resendVerification() {
    setResendMessage("");
    setResendError("");
    setResending(true);
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await res.json();
    setResending(false);
    if (!res.ok) {
      setResendError(data.error || "Could not send email");
      return;
    }
    setResendMessage("Confirmation email sent — check your inbox.");
    setBanner(null);
  }

  return (
    <div className="space-y-3">
      {banner === "welcome" && (
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Welcome! We sent a confirmation email — please click the link to verify your address.
        </p>
      )}
      {banner === "verified" && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          Your email address is confirmed. Thanks!
        </p>
      )}
      {banner === "invalid" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          That confirmation link is invalid or expired. You can request a new one below.
        </p>
      )}
      {banner === "missing" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Confirmation link was missing. Check your welcome email or resend below.
        </p>
      )}

      {!verified && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p>Your email is not verified yet.</p>
          <button
            type="button"
            onClick={resendVerification}
            disabled={resending}
            className="mt-2 font-medium underline disabled:opacity-50"
          >
            {resending ? "Sending…" : "Resend confirmation email"}
          </button>
          {resendMessage && <p className="mt-2 text-green-800">{resendMessage}</p>}
          {resendError && <p className="mt-2 text-red-700">{resendError}</p>}
        </div>
      )}

      {verified && banner !== "verified" && (
        <p className="text-sm text-green-700">Email verified</p>
      )}
    </div>
  );
}
