import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { SHIPPING_FEE, SHOP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from "@/lib/constants";

export const metadata = {
  title: `Terms & Conditions — ${SHOP_NAME}`,
  description: `Terms of sale, shipping, returns, and use of the ${SHOP_NAME} online shop.`,
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions">
      <p>
        Welcome to {SHOP_NAME}. By accessing this website, creating an account, or placing an order,
        you agree to these Terms &amp; Conditions (&quot;Terms&quot;). If you do not agree, please
        do not use our site.
      </p>

      <h2>1. About our shop</h2>
      <p>
        {SHOP_NAME} sells <strong>used goods and jewelry</strong> through this website. Item
        descriptions, photos, and condition notes are provided in each listing. Used items may show
        normal wear consistent with their age and prior use.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>18 years old</strong> and able to form a binding contract to
        purchase from us. By ordering, you represent that the information you provide is accurate
        and complete.
      </p>

      <h2>3. Accounts</h2>
      <p>
        You may check out as a guest or create an account (username/password or Google sign-in). You
        are responsible for keeping your login credentials secure and for activity under your
        account. Notify us promptly if you suspect unauthorized access.
      </p>

      <h2>4. Orders and payment</h2>
      <ul>
        <li>
          All prices are in <strong>U.S. dollars (USD)</strong> unless stated otherwise.
        </li>
        <li>
          A flat <strong>${SHIPPING_FEE.toFixed(2)} shipping fee</strong> applies to each order as
          shown at checkout.
        </li>
        <li>
          We accept payment methods displayed at checkout (e.g., card, Alipay via Stripe, PayPal).
          Payment is processed by third-party providers subject to their terms.
        </li>
        <li>
          We may refuse or cancel an order (for example, due to pricing errors, suspected fraud, or
          product unavailability) and will refund any payment if an order is canceled after charge.
        </li>
        <li>
          Promotional coupon codes are subject to their stated terms and may be modified or
          discontinued at any time.
        </li>
      </ul>

      <h2>5. Shipping and delivery</h2>
      <p>
        We pack orders and ship to the address you provide at checkout. Estimated delivery times are
        not guaranteed. Risk of loss passes to you upon delivery to the carrier, except where
        prohibited by law. You are responsible for providing a correct, deliverable shipping
        address.
      </p>
      <p>
        Tracking information will be sent to the email address on your order when available.
      </p>

      <h2>6. Returns, refunds, and all sales final</h2>
      <p>
        <strong>All sales are final</strong> unless a specific listing states otherwise. Because we
        sell used goods, we generally do not accept returns or exchanges for buyer&apos;s remorse,
        fit, or subjective preference.
      </p>
      <p>
        If an item arrives materially not as described or is damaged in shipping, contact us within{" "}
        <strong>7 days of delivery</strong> at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        with your order number and photos. We will work with you in good faith; any remedy (refund,
        partial refund, or replacement if available) is at our discretion and may require return of
        the item at your expense unless we agree otherwise.
      </p>

      <h2>7. Product condition and disclaimers</h2>
      <p>
        Except as expressly stated in a listing, items are sold <strong>&quot;as is&quot; and
        &quot;as available.&quot;</strong> To the fullest extent permitted by law, we disclaim all
        warranties, express or implied, including merchantability and fitness for a particular
        purpose. We do not warrant that the site will be uninterrupted or error-free.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, {SHOP_NAME} and its operators will not be
        liable for any indirect, incidental, special, consequential, or punitive damages, or for
        lost profits or data, arising from your use of the site or purchase of products. Our total
        liability for any claim relating to an order will not exceed the amount you paid for that
        order.
      </p>
      <p>
        Some states do not allow certain limitations; in those states, our liability is limited to
        the greatest extent permitted by law.
      </p>

      <h2>9. Prohibited conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the site for unlawful purposes or to violate others&apos; rights</li>
        <li>Attempt to interfere with site security or access others&apos; accounts</li>
        <li>Submit false or misleading order or contact information</li>
        <li>Scrape, copy, or misuse site content without permission</li>
      </ul>

      <h2>10. Intellectual property</h2>
      <p>
        Site content, branding, and materials are owned by {SHOP_NAME} or its licensors and are
        protected by applicable intellectual property laws. You may not reproduce or exploit them
        without prior written consent.
      </p>

      <h2>11. Privacy</h2>
      <p>
        Our collection and use of personal information is described in our{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        , which is incorporated into these Terms by reference.
      </p>

      <h2>12. Disputes and governing law</h2>
      <p>
        These Terms are governed by the laws of the <strong>State of California</strong> and the
        United States, without regard to conflict-of-law rules. Any dispute arising from these Terms
        or your use of the site will be brought in the state or federal courts located in California,
        and you consent to their jurisdiction, except where prohibited by law.
      </p>
      <p>
        Before filing a claim, you agree to contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>{" "}
        and attempt to resolve the matter informally.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may update these Terms at any time. The &quot;Last updated&quot; date reflects the latest
        version. Material changes may be noted on the site. Continued use after changes constitutes
        acceptance.
      </p>

      <h2>14. Contact</h2>
      <ul>
        <li>
          Email:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
        </li>
        <li>
          Phone:{" "}
          <a href={`tel:${SUPPORT_PHONE}`} className="underline">
            {SUPPORT_PHONE}
          </a>
        </li>
        <li>
          <Link href="/contact" className="underline">
            Customer support
          </Link>
        </li>
      </ul>
    </LegalPage>
  );
}
