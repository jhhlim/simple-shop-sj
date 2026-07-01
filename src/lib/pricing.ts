import { SHIPPING_FEE } from "./constants";
import { validateCoupon } from "./coupons";
import { getProduct } from "./products";
import type { CartItem, Product } from "./types";

export type PricedLine = {
  item: CartItem;
  product: Product;
  lineTotal: number;
};

export type OrderTotals = {
  subtotal: number;
  shippingFee: number;
  discount: number;
  discountPercent: number;
  couponCode: string | null;
  total: number;
};

function emptyTotals(): OrderTotals {
  return {
    subtotal: 0,
    shippingFee: 0,
    discount: 0,
    discountPercent: 0,
    couponCode: null,
    total: 0,
  };
}

export async function buildCartPricing(
  items: CartItem[],
  couponCode?: string | null
): Promise<{ lines: PricedLine[]; totals: OrderTotals; error?: string }> {
  const lines: PricedLine[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = await getProduct(item.productId);
    if (!product) {
      return {
        lines: [],
        totals: emptyTotals(),
        error: `Product not found: ${item.productId}`,
      };
    }
    const lineTotal = product.price * item.quantity;
    subtotal += lineTotal;
    lines.push({ item, product, lineTotal });
  }

  if (lines.length === 0) {
    return { lines, totals: emptyTotals() };
  }

  let discountPercent = 0;
  let couponApplied: string | null = null;

  if (couponCode?.trim()) {
    const coupon = await validateCoupon(couponCode);
    if (!coupon) {
      return {
        lines,
        totals: {
          subtotal,
          shippingFee: SHIPPING_FEE,
          discount: 0,
          discountPercent: 0,
          couponCode: null,
          total: subtotal + SHIPPING_FEE,
        },
        error: "Invalid or expired coupon code",
      };
    }
    discountPercent = coupon.percentOff;
    couponApplied = coupon.code;
  }

  const discount = Math.round(((subtotal * discountPercent) / 100) * 100) / 100;
  const shippingFee = SHIPPING_FEE;
  const total = Math.max(0, Math.round((subtotal - discount + shippingFee) * 100) / 100);

  return {
    lines,
    totals: {
      subtotal,
      shippingFee,
      discount,
      discountPercent,
      couponCode: couponApplied,
      total,
    },
  };
}
