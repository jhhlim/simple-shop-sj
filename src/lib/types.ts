export type ProductCategory =
  | "clothing"
  | "shoes"
  | "bags"
  | "jewelry"
  | "accessories"
  | "toys"
  | "collectibles"
  | "goods"
  | "other";

export type ProductCondition = "new" | "excellent" | "pre-owned" | "fair";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  condition?: ProductCondition;
  imageUrl: string;
  stock: number;
  soldCount: number;
  sku?: string;
  importHandle?: string;
  importToken?: string;
  createdAt: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type ShippingInfo = {
  fullName: string;
  email: string;
  phone: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type OrderStatus = "pending" | "paid" | "shipped" | "failed" | "expired";

export type TrackingStatus = "pre_transit" | "in_transit" | "delivered" | "unknown";

export type Order = {
  id: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  shipping: ShippingInfo;
  subtotal: number;
  shippingFee: number;
  discount?: number;
  discountPercent?: number;
  couponCode?: string;
  total: number;
  paymentMethod: "stripe" | "paypal" | "alipay";
  status: OrderStatus;
  createdAt: string;
  expiresAt?: string;
  userId?: string;
  stripeSessionId?: string;
  paypalOrderId?: string;
  paymentId?: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
  trackingStatus?: TrackingStatus;
  shippedAt?: string;
  deliveredAt?: string;
  trackingEmailSentAt?: string;
  inTransitEmailSentAt?: string;
  deliveredEmailSentAt?: string;
  labelUrl?: string;
  shippoTransactionId?: string;
  shippoShipmentId?: string;
  labelCost?: number;
};
