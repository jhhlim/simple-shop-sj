import Link from "next/link";
import { ContactForm } from "./ContactForm";
import { SHOP_NAME, SUPPORT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: `Contact — ${SHOP_NAME}`,
  description: "Customer support for orders, shipping, and questions.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Customer support</h1>
      <p className="mt-2 text-stone-600">
        Questions about an order, shipping, or an item? We&apos;re here to help.
      </p>

      <section className="mt-8 space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <h2 className="font-medium">Contact us</h2>
        <p>
          Email:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-stone-900 underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
        <p className="text-sm text-stone-500">
          We usually reply within 1–2 business days. For order status, try{" "}
          <Link href="/track" className="underline">
            track your order
          </Link>{" "}
          first.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 font-medium">Send a message</h2>
        <ContactForm />
      </section>
    </div>
  );
}
