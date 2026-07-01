"use client";

import { FormEvent, useState } from "react";
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  EMAIL_PATTERN,
  SUPPORT_EMAIL,
} from "@/lib/constants";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  function validateEmail(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError("Email is required");
      return false;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!validateEmail(email)) return;
    if (message.trim().length > CONTACT_MESSAGE_MAX_LENGTH) {
      setError(`Message must be ${CONTACT_MESSAGE_MAX_LENGTH} characters or less`);
      setStatus("error");
      return;
    }

    setStatus("sending");
    setError("");

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, orderId, message }),
    });
    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setError(data.error || "Could not send message");
      return;
    }

    setStatus("sent");
    setName("");
    setEmail("");
    setOrderId("");
    setMessage("");
    setEmailError("");
  }

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
        <p className="font-medium">Message sent!</p>
        <p className="mt-1">We&apos;ll get back to you at the email you provided.</p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-3 text-sm underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <label className="block text-sm">
        Your name *
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Your email *
        <input
          required
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          onBlur={() => email && validateEmail(email)}
          className={`mt-1 w-full rounded-lg border px-3 py-2 ${
            emailError ? "border-red-400" : "border-stone-300"
          }`}
        />
        {emailError && <p className="mt-1 text-sm text-red-600">{emailError}</p>}
      </label>
      <label className="block text-sm">
        Order ID <span className="text-stone-400">(optional)</span>
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="From your confirmation email"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Message *
        <textarea
          required
          rows={5}
          maxLength={CONTACT_MESSAGE_MAX_LENGTH}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
        <span className="mt-1 block text-right text-xs text-stone-500">
          {message.length}/{CONTACT_MESSAGE_MAX_LENGTH}
        </span>
      </label>
      {error && (
        <p className="text-sm text-red-600">
          {error}
          {error.includes("not configured") && (
            <>
              {" "}
              Email us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
                {SUPPORT_EMAIL}
              </a>
            </>
          )}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-lg bg-stone-900 py-3 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
