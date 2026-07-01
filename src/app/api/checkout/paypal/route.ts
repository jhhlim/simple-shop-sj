import { NextResponse } from "next/server";
import { SHIPPING_FEE } from "@/lib/constants";
import { createOrder } from "@/lib/orders";
import { getProduct } from "@/lib/products";
import { paypalKeysProblem } from "@/lib/payments";
import {
  formatShippingForStorage,
  validateShippingInfo,
} from "@/lib/shipping-validation";
import type { CartItem, ShippingInfo } from "@/lib/types";

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base =
    process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string };
  return { token: data.access_token, base };
}

export async function POST(request: Request) {
  const configError = paypalKeysProblem(
    process.env.PAYPAL_CLIENT_ID,
    process.env.PAYPAL_CLIENT_SECRET
  );
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  const auth = await getPayPalAccessToken();
  if (!auth) {
    return NextResponse.json(
      { error: "PayPal login failed — double-check your client ID and secret." },
      { status: 503 }
    );
  }

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

  const orderItems: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
  }[] = [];
  let subtotal = 0;
  const paypalItems: {
    name: string;
    unit_amount: { currency_code: string; value: string };
    quantity: string;
  }[] = [];

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
    paypalItems.push({
      name: product.name.slice(0, 127),
      unit_amount: {
        currency_code: "USD",
        value: product.price.toFixed(2),
      },
      quantity: String(item.quantity),
    });
  }

  const total = subtotal + SHIPPING_FEE;
  const order = await createOrder({
    items: orderItems,
    shipping,
    subtotal,
    shippingFee: SHIPPING_FEE,
    total,
    paymentMethod: "paypal",
  });

  const origin = request.headers.get("origin") || "http://localhost:3000";

  const paypalOrder = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: order.id,
        amount: {
          currency_code: "USD",
          value: total.toFixed(2),
          breakdown: {
            item_total: { currency_code: "USD", value: subtotal.toFixed(2) },
            shipping: { currency_code: "USD", value: SHIPPING_FEE.toFixed(2) },
          },
        },
        items: paypalItems,
        shipping: {
          name: { full_name: shipping.fullName },
          address: {
            address_line_1: shipping.street,
            ...(shipping.street2 ? { address_line_2: shipping.street2 } : {}),
            admin_area_2: shipping.city,
            admin_area_1: shipping.state,
            postal_code: shipping.zip.replace(/\s+/g, ""),
            country_code: shipping.country.slice(0, 2).toUpperCase(),
          },
        },
      },
    ],
    application_context: {
      return_url: `${origin}/success?order=${order.id}&provider=paypal`,
      cancel_url: `${origin}/checkout`,
      shipping_preference: "SET_PROVIDED_ADDRESS",
    },
  };

  const res = await fetch(`${auth.base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(paypalOrder),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const data = (await res.json()) as {
    id: string;
    links: { rel: string; href: string }[];
  };
  const approve = data.links.find((l) => l.rel === "approve");

  return NextResponse.json({ url: approve?.href, orderId: data.id });
}
