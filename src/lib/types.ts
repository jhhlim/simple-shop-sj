export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "jewelry" | "goods" | "other";
  imageUrl: string;
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
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type Order = {
  id: string;
  items: { productId: string; name: string; price: number; quantity: number }[];
  shipping: ShippingInfo;
  subtotal: number;
  shippingFee: number;
  total: number;
  paymentMethod: "stripe" | "paypal";
  status: "pending" | "paid" | "failed";
  createdAt: string;
  paymentId?: string;
};
