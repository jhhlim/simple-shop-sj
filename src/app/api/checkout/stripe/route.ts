import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createOrder } from "@/lib/orders";
import { stripeKeyProblem } from "@/lib/payments";
import { buildCartPricing } from "@/lib/pricing";
import {
  formatShippingForStorage,
  validateShippingInfo,
} from "@/lib/shipping-validation";
import { STORAGE_ERROR_MESSAGE } from "@/lib/storage";
import type { CartItem, ShippingInfo } from "@/lib/types";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const configError = stripeKeyProblem(stripeKey);
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { items, shipping: rawShipping, couponCode } = body as {
      items: CartItem[];
      shipping: ShippingInfo;
      couponCode?: string | null;
    };

    const shipping = formatShippingForStorage(rawShipping);
    const { valid, errors } = validateShippingInfo(shipping);
    if (!items?.length || !valid) {
      const firstError = Object.values(errors)[0];
      return NextResponse.json(
        { error: firstError || "Cart and complete shipping info are required" },
        { status: 400 }
      );
    }

    const { lines, totals, error: pricingError } = await buildCartPricing(items, couponCode);
    if (pricingError || lines.length === 0) {
      return NextResponse.json(
        { error: pricingError || "Could not calculate order total" },
        { status: 400 }
      );
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = lines.map(
      ({ product, item }) => ({
        price_data: {
          currency: "usd",
          product_data: { name: product.name, description: product.description },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      })
    );

    const orderItems = lines.map(({ product, item }) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    }));

    const order = await createOrder({
      items: orderItems,
      shipping,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      discount: totals.discount,
      discountPercent: totals.discountPercent,
      couponCode: totals.couponCode || undefined,
      total: totals.total,
      paymentMethod: "stripe",
    });

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Flat-rate shipping" },
        unit_amount: Math.round(totals.shippingFee * 100),
      },
      quantity: 1,
    });

    const stripe = new Stripe(stripeKey!);
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: shipping.email,
      line_items: lineItems,
      payment_method_types: ["card", "alipay"],
      success_url: `${origin}/success?order=${order.id}`,
      cancel_url: `${origin}/checkout`,
      metadata: { orderId: order.id },
    };

    if (totals.discount > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(totals.discount * 100),
        currency: "usd",
        duration: "once",
        name: totals.couponCode || "Discount",
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Stripe checkout failed";
    const message =
      raw.includes("EROFS") || raw.includes("read-only file system")
        ? STORAGE_ERROR_MESSAGE
        : raw;
    const status = message === STORAGE_ERROR_MESSAGE ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
