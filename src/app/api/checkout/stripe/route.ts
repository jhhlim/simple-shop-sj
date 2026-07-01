import { NextResponse } from "next/server";
import Stripe from "stripe";
import { SHIPPING_FEE } from "@/lib/constants";
import { createOrder } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import type { CartItem, ShippingInfo } from "@/lib/types";

function validateShipping(shipping: ShippingInfo) {
  const required: (keyof ShippingInfo)[] = [
    "fullName",
    "email",
    "phone",
    "street",
    "city",
    "state",
    "zip",
    "country",
  ];
  for (const key of required) {
    if (!shipping[key]?.trim()) return false;
  }
  return true;
}

export async function POST(request: Request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local" },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { items, shipping } = body as {
    items: CartItem[];
    shipping: ShippingInfo;
  };

  if (!items?.length || !validateShipping(shipping)) {
    return NextResponse.json(
      { error: "Cart and complete shipping info are required" },
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

  const stripe = new Stripe(stripeKey);
  const origin = request.headers.get("origin") || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: shipping.email,
    line_items: lineItems,
    success_url: `${origin}/success?order=${order.id}`,
    cancel_url: `${origin}/checkout`,
    metadata: { orderId: order.id },
    shipping_address_collection: { allowed_countries: ["US", "CA"] },
  });

  return NextResponse.json({ url: session.url });
}
