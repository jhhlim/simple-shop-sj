import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AccountEmailBanner } from "@/components/AccountEmailBanner";
import { AccountOrderHistory, ChangePasswordForm } from "@/components/AccountExtras";
import { findUserById } from "@/lib/users";
import { getUserCart } from "@/lib/cart-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Promise<{ welcome?: string; verified?: string; verify?: string }>;

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    if (params.verified === "1") redirect("/login?verified=1");
    if (params.verify === "invalid") redirect("/login?verify=invalid");
    if (params.verify === "missing") redirect("/login?verify=missing");
    redirect("/login");
  }
  const user = await findUserById(session.user.id);
  const cart = await getUserCart(session.user.id);

  let initialBanner: "welcome" | "verified" | "invalid" | "missing" | null = null;
  if (params.welcome === "1") initialBanner = "welcome";
  else if (params.verified === "1") initialBanner = "verified";
  else if (params.verify === "invalid") initialBanner = "invalid";
  else if (params.verify === "missing") initialBanner = "missing";

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Your account</h1>

      <div className="mt-4">
        <AccountEmailBanner
          emailVerified={!!user?.email_verified}
          initialBanner={initialBanner}
        />
      </div>

      <div className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5 text-sm">
        <div>
          <p className="text-stone-500">Name</p>
          <p className="font-medium">{user?.name || session.user.name}</p>
        </div>
        <div>
          <p className="text-stone-500">Username</p>
          <p className="font-medium">{user?.username || "—"}</p>
        </div>
        <div>
          <p className="text-stone-500">Email</p>
          <p className="font-medium">{user?.email || session.user.email}</p>
        </div>
        <div>
          <p className="text-stone-500">Saved cart</p>
          <p className="font-medium">
            {cart.length === 0
              ? "Empty"
              : `${cart.reduce((n, i) => n + i.quantity, 0)} item(s)`}
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Order history</h2>
        <div className="mt-3">
          <AccountOrderHistory />
        </div>
      </section>

      {user?.password_hash && (
        <div className="mt-8">
          <ChangePasswordForm />
        </div>
      )}

      <Link href="/cart" className="mt-6 inline-block text-sm font-medium underline">
        View cart
      </Link>
    </div>
  );
}
