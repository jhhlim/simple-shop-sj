import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { SHOP_NAME, SUPPORT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: `Privacy Policy — ${SHOP_NAME}`,
  description: `How ${SHOP_NAME} collects, uses, and protects your personal information in the United States.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {SHOP_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates an online shop
        for used goods and jewelry in the United States. This Privacy Policy explains how we
        collect, use, disclose, and protect personal information when you visit our website, create
        an account, or make a purchase.
      </p>

      <h2>1. Information we collect</h2>
      <p>We may collect the following categories of information:</p>
      <ul>
        <li>
          <strong>Account information:</strong> username, email address, and password (stored in
          hashed form) if you register or sign in with Google.
        </li>
        <li>
          <strong>Order and shipping information:</strong> name, email, phone number, and shipping
          address when you checkout.
        </li>
        <li>
          <strong>Payment information:</strong> payments are processed by third-party providers
          (Stripe and PayPal). We do not store full credit card or bank account numbers on our
          servers.
        </li>
        <li>
          <strong>Communications:</strong> messages you send through our contact form or customer
          support channels.
        </li>
        <li>
          <strong>Technical data:</strong> browser type, device information, IP address, and
          cookies or similar technologies used for cart, sign-in sessions, and site security.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <p>We use personal information to:</p>
      <ul>
        <li>Process and fulfill orders, including shipping and delivery updates</li>
        <li>Send order confirmations, shipping notifications, and customer support replies</li>
        <li>Operate accounts, saved carts, and authentication (including Google sign-in)</li>
        <li>Prevent fraud, abuse, and unauthorized access</li>
        <li>Comply with legal obligations and respond to lawful requests</li>
        <li>Improve our website and customer experience</li>
      </ul>

      <h2>3. Cookies and similar technologies</h2>
      <p>
        We use cookies and local storage in the following categories. You can choose your
        preferences using our cookie banner or the &quot;Cookie settings&quot; link in the footer.
      </p>
      <ul>
        <li>
          <strong>Strictly necessary:</strong> sign-in sessions, shopping cart, checkout, security,
          and storing your cookie choices. These cannot be turned off.
        </li>
        <li>
          <strong>Functional:</strong> optional preferences such as remembering an applied coupon
          code.
        </li>
        <li>
          <strong>Analytics and marketing:</strong> not currently used on this site. If we add them
          in the future, we will ask for your consent first.
        </li>
      </ul>
      <p>
        We do not use cookies for third-party advertising or cross-site tracking on this shop.
      </p>

      <h2>4. How we share information</h2>
      <p>We share personal information only as needed to operate the shop, including with:</p>
      <ul>
        <li>
          <strong>Payment processors</strong> (Stripe, PayPal) to complete transactions
        </li>
        <li>
          <strong>Shipping partners</strong> (e.g., Shippo, USPS) to create labels and provide
          tracking
        </li>
        <li>
          <strong>Email providers</strong> (Resend) to send transactional emails
        </li>
        <li>
          <strong>Authentication providers</strong> (Google) if you choose Google sign-in
        </li>
        <li>
          <strong>Hosting and database providers</strong> (e.g., Vercel, Neon) that host our
          application and store order data
        </li>
      </ul>
      <p>
        <strong>We do not sell your personal information.</strong> We do not share your data for
        third-party marketing purposes.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We retain order and account information as long as needed to fulfill orders, provide
        support, meet tax and record-keeping requirements, and resolve disputes. You may request
        deletion of your account subject to legal and operational limits (for example, we may need
        to retain order records for completed purchases).
      </p>

      <h2>6. Security</h2>
      <p>
        We use reasonable administrative, technical, and organizational measures to protect personal
        information. No method of transmission or storage is 100% secure; we cannot guarantee absolute
        security.
      </p>

      <h2>7. Your privacy rights (United States)</h2>
      <h3>California residents (CCPA / CPRA)</h3>
      <p>
        If you are a California resident, you may have the right to know what personal information we
        collect, request access to or deletion of certain information, and correct inaccurate
        information. Because we do not sell personal information, opt-out of sale rights generally
        do not apply. We will not discriminate against you for exercising privacy rights.
      </p>
      <p>
        To submit a privacy request, contact us at{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
          {SUPPORT_EMAIL}
        </a>
        . We may verify your identity before fulfilling a request.
      </p>
      <h3>Other U.S. states</h3>
      <p>
        Residents of certain other states may have similar privacy rights under applicable state
        laws. Contact us using the information below and we will respond in accordance with
        applicable law.
      </p>

      <h2>8. Children&apos;s privacy</h2>
      <p>
        Our shop is not directed to children under 13, and we do not knowingly collect personal
        information from children under 13. If you believe a child has provided us information,
        contact us and we will take steps to delete it.
      </p>

      <h2>9. Third-party links</h2>
      <p>
        Our site may link to third-party services (payment checkout, carrier tracking, Google
        sign-in). Their privacy practices are governed by their own policies, not this one.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
        the top will reflect changes. Continued use of the site after changes constitutes acceptance
        of the updated policy.
      </p>

      <h2>11. Contact us</h2>
      <p>
        Questions about this Privacy Policy or your personal information:
      </p>
      <ul>
        <li>
          Email:{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline">
            {SUPPORT_EMAIL}
          </a>
        </li>
        <li>
          <Link href="/contact" className="underline">
            Contact form
          </Link>
        </li>
      </ul>
      <p>
        See also our{" "}
        <Link href="/terms" className="underline">
          Terms &amp; Conditions
        </Link>
        .
      </p>
    </LegalPage>
  );
}
