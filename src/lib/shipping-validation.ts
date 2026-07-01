import { CA_PROVINCE_CODES, US_STATE_CODES } from "./regions";
import type { ShippingInfo } from "./types";

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const US_ZIP_RE = /^\d{5}(-\d{4})?$/;
const CA_POSTAL_RE = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;

export type ShippingFieldErrors = Partial<Record<keyof ShippingInfo, string>>;

export function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function formatUsPhone(value: string): string {
  const digits = digitsOnlyPhone(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatCaPostal(value: string): string {
  const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)} ${raw.slice(3)}`;
}

export function formatUsZip(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required";
  if (!EMAIL_RE.test(trimmed)) return "Enter a valid email (e.g. name@example.com)";
  return null;
}

export function validatePhone(phone: string, country: string): string | null {
  const digits = digitsOnlyPhone(phone);
  if (!digits) return "Phone number is required";
  if (country === "US") {
    if (digits.length !== 10) return "Enter a 10-digit US phone number";
    if (digits[0] === "0" || digits[0] === "1") return "Enter a valid US phone number";
    return null;
  }
  if (country === "CA") {
    if (digits.length !== 10) return "Enter a 10-digit Canadian phone number";
    return null;
  }
  if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number";
  return null;
}

export function validateFullName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Full name is required";
  if (!/^[\p{L}\s'.-]+$/u.test(trimmed)) return "Name contains invalid characters";
  return null;
}

export function validateStreet(street: string): string | null {
  const trimmed = street.trim();
  if (trimmed.length < 5) return "Street address is required (at least 5 characters)";
  if (!/\d/.test(trimmed) && !/\b(box|po)\b/i.test(trimmed)) {
    return "Include a street number (e.g. 123 Main St)";
  }
  return null;
}

export function validateZip(zip: string, country: string): string | null {
  const trimmed = zip.trim();
  if (!trimmed) return "ZIP / postal code is required";
  if (country === "US" && !US_ZIP_RE.test(trimmed)) {
    return "Enter a valid US ZIP (12345 or 12345-6789)";
  }
  if (country === "CA" && !CA_POSTAL_RE.test(trimmed)) {
    return "Enter a valid Canadian postal code (e.g. A1A 1A1)";
  }
  return null;
}

export function validateState(state: string, country: string): string | null {
  const code = state.trim().toUpperCase();
  if (!code) return "State / province is required";
  if (country === "US" && !US_STATE_CODES.has(code as never)) {
    return "Select a valid US state";
  }
  if (country === "CA" && !CA_PROVINCE_CODES.has(code as never)) {
    return "Select a valid Canadian province";
  }
  return null;
}

export function validateCity(city: string): string | null {
  const trimmed = city.trim();
  if (trimmed.length < 2) return "City is required";
  return null;
}

export function validateShippingInfo(shipping: ShippingInfo): {
  valid: boolean;
  errors: ShippingFieldErrors;
} {
  const errors: ShippingFieldErrors = {};

  const fullName = validateFullName(shipping.fullName);
  if (fullName) errors.fullName = fullName;

  const email = validateEmail(shipping.email);
  if (email) errors.email = email;

  const phone = validatePhone(shipping.phone, shipping.country);
  if (phone) errors.phone = phone;

  const street = validateStreet(shipping.street);
  if (street) errors.street = street;

  const city = validateCity(shipping.city);
  if (city) errors.city = city;

  const state = validateState(shipping.state, shipping.country);
  if (state) errors.state = state;

  const zip = validateZip(shipping.zip, shipping.country);
  if (zip) errors.zip = zip;

  if (!shipping.country) errors.country = "Country is required";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function formatShippingForStorage(shipping: ShippingInfo): ShippingInfo {
  return {
    ...shipping,
    fullName: shipping.fullName.trim(),
    email: shipping.email.trim().toLowerCase(),
    phone:
      shipping.country === "US"
        ? formatUsPhone(shipping.phone)
        : digitsOnlyPhone(shipping.phone),
    street: shipping.street.trim(),
    street2: shipping.street2?.trim() || "",
    city: shipping.city.trim(),
    state: shipping.state.trim().toUpperCase(),
    zip:
      shipping.country === "CA"
        ? formatCaPostal(shipping.zip)
        : formatUsZip(shipping.zip),
    country: shipping.country,
  };
}
