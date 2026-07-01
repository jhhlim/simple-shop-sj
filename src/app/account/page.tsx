import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findUserById } from "@/lib/users";
import { getUserCart } from "@/lib/cart-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = findUserById(session.user.id);
  const cart = getUserCart(session.user.id);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Your account</h1>
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
      <Link href="/cart" className="mt-6 inline-block text-sm font-medium underline">
        View cart
      </Link>
    </div>
  );
}
