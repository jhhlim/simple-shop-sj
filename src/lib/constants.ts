export const SHIPPING_FEE = 5;
export const SHOP_NAME = "LIMWARE";
export const SHIPPING_LABEL_NOTE =
  "We pack your order carefully and ship it to the address you provided. You'll receive an email with tracking once your package ships.";

export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL?.trim() || "limware@yahoo.com";

export const SUPPORT_PHONE = process.env.SUPPORT_PHONE?.trim() || "5105160826";

export const CONTACT_MESSAGE_MAX_LENGTH = 500;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
