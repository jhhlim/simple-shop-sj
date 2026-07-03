import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createOrder, markOrderFailed, updateOrderPaymentRefs } from "@/lib/orders";
import { paypalKeysProblem } from "@/lib/payments";
import { buildCartPricing } from "@/lib/pricing";
import { releaseStock, reserveStock } from "@/lib/products";
import {
  formatShippingForStorage,
  validateShippingInfo,
} from "@/lib/shipping-validation";
import { STORAGE_ERROR_MESSAGE } from "@/lib/storage";
import type { CartItem, ShippingInfo } from "@/lib/types";

async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const base =
    process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) return null;

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
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

  const paypalAuth = await getPayPalAccessToken();
  if (!paypalAuth) {
    return NextResponse.json(
      { error: "PayPal login failed — double-check your client ID and secret." },
      { status: 503 }
    );
  }

  let reservedItems: { productId: string; quantity: number }[] | null = null;
  let pendingOrderId: string | null = null;

  try {
    const body = await request.json();
    const { items, shipping: rawShipping, couponCode } = body as {
      items: CartItem[];
      shipping: ShippingInfo;
      couponCode?: string | null;
    };

    const session = await auth();
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

    const reserveItems = lines.map(({ product, item }) => ({
      productId: product.id,
      quantity: item.quantity,
    }));
    const stockError = await reserveStock(reserveItems);
    if (stockError) {
      return NextResponse.json({ error: stockError }, { status: 409 });
    }
    reservedItems = reserveItems;

    const orderItems = lines.map(({ product, item }) => ({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: item.quantity,
    }));

    const paypalItems = lines.map(({ product, item }) => ({
      name: product.name.slice(0, 127),
      unit_amount: {
        currency_code: "USD",
        value: product.price.toFixed(2),
      },
      quantity: String(item.quantity),
    }));

    let order;
    try {
      order = await createOrder({
        items: orderItems,
        shipping,
        subtotal: totals.subtotal,
        shippingFee: totals.shippingFee,
        discount: totals.discount,
        discountPercent: totals.discountPercent,
        couponCode: totals.couponCode || undefined,
        total: totals.total,
        paymentMethod: "paypal",
        userId: session?.user?.id,
      });
    } catch (err) {
      await releaseStock(reserveItems);
      throw err;
    }
    pendingOrderId = order.id;

    const origin = request.headers.get("origin") || "http://localhost:3000";

    const breakdown: Record<string, { currency_code: string; value: string }> = {
      item_total: { currency_code: "USD", value: totals.subtotal.toFixed(2) },
      shipping: { currency_code: "USD", value: totals.shippingFee.toFixed(2) },
    };
    if (totals.discount > 0) {
      breakdown.discount = {
        currency_code: "USD",
        value: totals.discount.toFixed(2),
      };
    }

    const paypalOrderBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: order.id,
          amount: {
            currency_code: "USD",
            value: totals.total.toFixed(2),
            breakdown,
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

    const res = await fetch(`${paypalAuth.base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paypalAuth.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paypalOrderBody),
    });

    if (!res.ok) {
      await markOrderFailed(order.id).catch(() => undefined);
      reservedItems = null;
      pendingOrderId = null;
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    const data = (await res.json()) as {
      id: string;
      links: { rel: string; href: string }[];
    };
    const approve = data.links.find((l) => l.rel === "approve");

    await updateOrderPaymentRefs(order.id, { paypalOrderId: data.id });

    return NextResponse.json({
      url: approve?.href,
      orderId: order.id,
      expiresAt: order.expiresAt,
      paypalOrderId: data.id,
    });
  } catch (err) {
    if (pendingOrderId) {
      await markOrderFailed(pendingOrderId).catch(() => undefined);
    } else if (reservedItems) {
      await releaseStock(reservedItems).catch(() => undefined);
    }
    const raw = err instanceof Error ? err.message : "PayPal checkout failed";
    const message =
      raw.includes("EROFS") || raw.includes("read-only file system")
        ? STORAGE_ERROR_MESSAGE
        : raw;
    const status = message === STORAGE_ERROR_MESSAGE ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
