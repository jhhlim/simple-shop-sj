import type { Order, ShippingInfo, TrackingStatus } from "./types";

const SHIPPO_API = "https://api.goshippo.com";

export function shippoConfigured(): boolean {
  return !!process.env.SHIPPO_API_TOKEN?.trim();
}

export type ShippoAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
};

export type ShippoRate = {
  object_id: string;
  provider: string;
  servicelevel: { name: string; token: string };
  amount: string;
  currency: string;
  estimated_days?: number;
};

export type ShippoShipment = {
  object_id: string;
  rates: ShippoRate[];
};

export type ShippoTransaction = {
  object_id: string;
  status: string;
  tracking_number: string;
  tracking_url_provider: string;
  label_url: string;
  rate: { provider: string; servicelevel: { name: string } };
};

function getToken(): string {
  const token = process.env.SHIPPO_API_TOKEN?.trim();
  if (!token) throw new Error("SHIPPO_API_TOKEN is not set in .env.local");
  return token;
}

async function shippoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SHIPPO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `ShippoToken ${getToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { detail?: string }).detail ||
      (data as { message?: string }).message ||
      JSON.stringify(data);
    throw new Error(`Shippo error: ${msg}`);
  }
  return data as T;
}

export function getShopFromAddress(): ShippoAddress {
  const required = [
    "SHIPPO_FROM_NAME",
    "SHIPPO_FROM_STREET",
    "SHIPPO_FROM_CITY",
    "SHIPPO_FROM_STATE",
    "SHIPPO_FROM_ZIP",
  ] as const;

  for (const key of required) {
    if (!process.env[key]?.trim()) {
      throw new Error(
        `Missing ${key}. Add your return/ship-from address to .env.local (see README).`
      );
    }
  }

  return {
    name: process.env.SHIPPO_FROM_NAME!.trim(),
    street1: process.env.SHIPPO_FROM_STREET!.trim(),
    street2: process.env.SHIPPO_FROM_STREET2?.trim(),
    city: process.env.SHIPPO_FROM_CITY!.trim(),
    state: process.env.SHIPPO_FROM_STATE!.trim(),
    zip: process.env.SHIPPO_FROM_ZIP!.trim(),
    country: process.env.SHIPPO_FROM_COUNTRY?.trim() || "US",
    phone: process.env.SHIPPO_FROM_PHONE?.trim(),
    email: process.env.SHIPPO_FROM_EMAIL?.trim(),
  };
}

function toShippoAddress(shipping: ShippingInfo): ShippoAddress {
  return {
    name: shipping.fullName,
    street1: shipping.street,
    street2: shipping.street2,
    city: shipping.city,
    state: shipping.state,
    zip: shipping.zip.replace(/\s+/g, ""),
    country: shipping.country === "CA" ? "CA" : "US",
    phone: shipping.phone,
    email: shipping.email,
  };
}

function defaultParcel() {
  return {
    length: process.env.SHIPPO_PARCEL_LENGTH_IN || "8",
    width: process.env.SHIPPO_PARCEL_WIDTH_IN || "6",
    height: process.env.SHIPPO_PARCEL_HEIGHT_IN || "2",
    distance_unit: "in" as const,
    weight: process.env.SHIPPO_PARCEL_WEIGHT_OZ || "8",
    mass_unit: "oz" as const,
  };
}

export async function createShipmentForOrder(order: Order): Promise<ShippoShipment> {
  return shippoFetch<ShippoShipment>("/shipments/", {
    method: "POST",
    body: JSON.stringify({
      address_from: getShopFromAddress(),
      address_to: toShippoAddress(order.shipping),
      parcels: [defaultParcel()],
      async: false,
      metadata: order.id,
    }),
  });
}

export function pickUspsRate(rates: ShippoRate[]): ShippoRate | undefined {
  const usps = rates.filter((r) => r.provider.toUpperCase() === "USPS");
  if (!usps.length) return undefined;
  return usps.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];
}

export async function purchaseLabel(rateId: string): Promise<ShippoTransaction> {
  return shippoFetch<ShippoTransaction>("/transactions/", {
    method: "POST",
    body: JSON.stringify({
      rate: rateId,
      label_file_type: "PDF",
      async: false,
    }),
  });
}

export async function createUspsLabelForOrder(order: Order): Promise<{
  transaction: ShippoTransaction;
  rate: ShippoRate;
  shipmentId: string;
}> {
  const shipment = await createShipmentForOrder(order);
  const rate = pickUspsRate(shipment.rates);
  if (!rate) {
    throw new Error("No USPS rates returned for this address. Check Shippo from/to addresses.");
  }

  const transaction = await purchaseLabel(rate.object_id);
  if (transaction.status !== "SUCCESS") {
    throw new Error(`Label purchase failed: ${transaction.status}`);
  }

  return { transaction, rate, shipmentId: shipment.object_id };
}

export function mapShippoTrackingStatus(status: string): TrackingStatus {
  const s = status.toUpperCase();
  if (s === "DELIVERED") return "delivered";
  if (s === "TRANSIT" || s === "IN_TRANSIT") return "in_transit";
  if (s === "PRE_TRANSIT" || s === "UNKNOWN") return "pre_transit";
  return "unknown";
}
