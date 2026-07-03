"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { functionalCookiesAllowed } from "@/lib/cookie-consent";
import type { CartItem } from "@/lib/types";

const STORAGE_KEY = "lim-resale-cart";
const COUPON_KEY = "lim-resale-coupon";

type CartContextValue = {
  items: CartItem[];
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  addItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  isSyncing: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<CartItem[]>([]);
  const [couponCode, setCouponCodeState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const mergedForUser = useRef<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
      if (functionalCookiesAllowed()) {
        const savedCoupon = localStorage.getItem(COUPON_KEY);
        if (savedCoupon) setCouponCodeState(savedCoupon);
      }
    } catch {
      setItems([]);
    }
    setHydrated(true);

    const onPrefs = () => {
      if (!functionalCookiesAllowed()) {
        localStorage.removeItem(COUPON_KEY);
        setCouponCodeState(null);
      }
    };
    window.addEventListener("cookie-preferences-updated", onPrefs);
    return () => window.removeEventListener("cookie-preferences-updated", onPrefs);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (session?.user?.id) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated, session?.user?.id]);

  useEffect(() => {
    if (!hydrated || status !== "authenticated" || !session?.user?.id) return;
    if (mergedForUser.current === session.user.id) return;

    let cancelled = false;
    setIsSyncing(true);

    (async () => {
      try {
        const localRaw = localStorage.getItem(STORAGE_KEY);
        const localItems: CartItem[] = localRaw ? JSON.parse(localRaw) : [];

        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ localItems }),
        });

        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setItems(data.items || []);
            localStorage.removeItem(STORAGE_KEY);
            mergedForUser.current = session.user.id;
          }
        }
      } catch {
        // keep local cart on failure
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, status, session?.user?.id]);

  useEffect(() => {
    if (!hydrated || status !== "authenticated" || !session?.user?.id) return;
    if (mergedForUser.current !== session.user.id) return;

    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      } catch {
        // ignore sync errors
      }
    }, 400);

    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [items, hydrated, status, session?.user?.id]);

  useEffect(() => {
    if (status === "unauthenticated") {
      mergedForUser.current = null;
    }
  }, [status]);

  const setCouponCode = useCallback((code: string | null) => {
    setCouponCodeState(code);
    if (code && functionalCookiesAllowed()) {
      localStorage.setItem(COUPON_KEY, code);
    } else {
      localStorage.removeItem(COUPON_KEY);
    }
  }, []);

  const addItem = useCallback((productId: string) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      couponCode,
      setCouponCode,
      addItem,
      removeItem,
      setQuantity,
      clearCart,
      totalItems,
      isSyncing,
    }),
    [items, couponCode, setCouponCode, addItem, removeItem, setQuantity, clearCart, totalItems, isSyncing]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
