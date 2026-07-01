import Link from "next/link";
import { SHOP_NAME } from "@/lib/constants";

export function Header({ cartCount = 0 }: { cartCount?: number }) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-semibold tracking-tight text-stone-900">
          {SHOP_NAME}
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-stone-600 hover:text-stone-900">
            Shop
          </Link>
          <Link href="/cart" className="text-stone-600 hover:text-stone-900">
            Cart{cartCount > 0 ? ` (${cartCount})` : ""}
          </Link>
          <Link href="/admin" className="text-stone-400 hover:text-stone-700">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
