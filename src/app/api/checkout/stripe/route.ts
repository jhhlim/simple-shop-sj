import { NextResponse } from "next/server";
import Stripe from "stripe";
import { SHIPPING_FEE } from "@/lib/constants";
import { createOrder } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { stripeKeyProblem } from "@/lib/payments";
import {
  formatShippingForStorage,
  validateShippingInfo,
} from "@/lib/shipping-validation";
import type { CartItem, ShippingInfo } from "@/lib/types";

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const configError = stripeKeyProblem(stripeKey);
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { items, shipping: rawShipping } = body as {
      items: CartItem[];
      shipping: ShippingInfo;
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

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: {
      productId: string;
      name: string;
      price: number;
      quantity: number;
    }[] = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await getProduct(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }
      subtotal += product.price * item.quantity;
      orderItems.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
      });
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: product.name, description: product.description },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      });
    }

    const total = subtotal + SHIPPING_FEE;
    const order = await createOrder({
      items: orderItems,
      shipping,
      subtotal,
      shippingFee: SHIPPING_FEE,
      total,
      paymentMethod: "stripe",
    });

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Flat-rate shipping" },
        unit_amount: Math.round(SHIPPING_FEE * 100),
      },
      quantity: 1,
    });

    const stripe = new Stripe(stripeKey!);
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: shipping.email,
      line_items: lineItems,
      payment_method_types: ["card", "alipay"],
      success_url: `${origin}/success?order=${order.id}`,
      cancel_url: `${origin}/checkout`,
      metadata: { orderId: order.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
