"use client";

import { FormEvent, useState } from "react";
import { SUPPORT_EMAIL } from "@/lib/constants";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
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
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="How can we help?"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
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
