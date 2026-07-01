"use client";

import { useState } from "react";
import { CA_PROVINCES, US_STATES } from "@/lib/regions";
import {
  formatCaPostal,
  formatUsPhone,
  formatUsZip,
  validateShippingInfo,
  type ShippingFieldErrors,
} from "@/lib/shipping-validation";
import type { ShippingInfo } from "@/lib/types";

const inputClass = (hasError: boolean) =>
  `mt-1 w-full rounded-lg border px-3 py-2 ${
    hasError ? "border-red-400 bg-red-50" : "border-stone-300"
  }`;

type Props = {
  shipping: ShippingInfo;
  onChange: (shipping: ShippingInfo) => void;
  fieldErrors: ShippingFieldErrors;
  onFieldErrorsChange: (errors: ShippingFieldErrors) => void;
};

export function ShippingForm({
  shipping,
  onChange,
  fieldErrors,
  onFieldErrorsChange,
}: Props) {
  const [zipLookupMessage, setZipLookupMessage] = useState("");

  function updateField<K extends keyof ShippingInfo>(key: K, value: ShippingInfo[K]) {
    const next = { ...shipping, [key]: value };
    onChange(next);
    if (fieldErrors[key]) {
      const { errors } = validateShippingInfo(next);
      onFieldErrorsChange({ ...fieldErrors, [key]: errors[key] });
    }
  }

  function handleCountryChange(country: string) {
    onChange({
      ...shipping,
      country,
      state: "",
      zip: "",
      city: "",
      phone: country === "US" ? formatUsPhone(shipping.phone) : shipping.phone,
    });
    onFieldErrorsChange({});
    setZipLookupMessage("");
  }

  async function lookupZip() {
    setZipLookupMessage("");
    const zip = shipping.zip.trim();
    if (!zip) return;

    const minLen = shipping.country === "US" ? 5 : 3;
    if (shipping.country === "US" && zip.replace(/\D/g, "").length < minLen) return;

    try {
      const res = await fetch(
        `/api/shipping/lookup?zip=${encodeURIComponent(zip)}&country=${shipping.country}`
      );
      const data = await res.json();
      if (!res.ok) {
        setZipLookupMessage(data.error || "Could not find that ZIP / postal code");
        return;
      }
      onChange({
        ...shipping,
        city: data.city,
        state: data.state,
        zip: data.zip,
      });
      setZipLookupMessage(`Found: ${data.city}, ${data.state}`);
      onFieldErrorsChange({
        ...fieldErrors,
        city: undefined,
        state: undefined,
        zip: undefined,
      });
    } catch {
      setZipLookupMessage("Could not look up ZIP / postal code");
    }
  }

  const regions = shipping.country === "CA" ? CA_PROVINCES : US_STATES;
  const regionLabel = shipping.country === "CA" ? "Province" : "State";
  const zipLabel = shipping.country === "CA" ? "Postal code" : "ZIP code";

  return (
    <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-medium">Shipping information</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          Full name *
          <input
            required
            autoComplete="name"
            value={shipping.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            onBlur={() => {
              const { errors } = validateShippingInfo(shipping);
              onFieldErrorsChange({ ...fieldErrors, fullName: errors.fullName });
            }}
            className={inputClass(!!fieldErrors.fullName)}
          />
          {fieldErrors.fullName && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.fullName}</span>
          )}
        </label>

        <label className="block text-sm">
          Email *
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={shipping.email}
            onChange={(e) => updateField("email", e.target.value)}
            onBlur={() => {
              const { errors } = validateShippingInfo(shipping);
              onFieldErrorsChange({ ...fieldErrors, email: errors.email });
            }}
            className={inputClass(!!fieldErrors.email)}
          />
          {fieldErrors.email && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.email}</span>
          )}
        </label>

        <label className="block text-sm">
          Phone *
          <input
            required
            type="tel"
            autoComplete="tel"
            placeholder={shipping.country === "US" ? "(555) 123-4567" : "5551234567"}
            value={shipping.phone}
            onChange={(e) =>
              updateField(
                "phone",
                shipping.country === "US" ? formatUsPhone(e.target.value) : e.target.value
              )
            }
            onBlur={() => {
              const { errors } = validateShippingInfo(shipping);
              onFieldErrorsChange({ ...fieldErrors, phone: errors.phone });
            }}
            className={inputClass(!!fieldErrors.phone)}
          />
          {fieldErrors.phone && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.phone}</span>
          )}
        </label>

        <label className="block text-sm sm:col-span-2">
          Street address *
          <input
            required
            autoComplete="address-line1"
            placeholder="123 Main St"
            value={shipping.street}
            onChange={(e) => updateField("street", e.target.value)}
            onBlur={() => {
              const { errors } = validateShippingInfo(shipping);
              onFieldErrorsChange({ ...fieldErrors, street: errors.street });
            }}
            className={inputClass(!!fieldErrors.street)}
          />
          {fieldErrors.street && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.street}</span>
          )}
        </label>

        <label className="block text-sm sm:col-span-2">
          Apt, suite, unit, etc. <span className="text-stone-400">(optional)</span>
          <input
            autoComplete="address-line2"
            placeholder="Apt 4B, Suite 200"
            value={shipping.street2 || ""}
            onChange={(e) => updateField("street2", e.target.value)}
            className={inputClass(false)}
          />
        </label>

        <label className="block text-sm">
          Country *
          <select
            required
            autoComplete="country"
            value={shipping.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className={inputClass(!!fieldErrors.country)}
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
        </label>

        <label className="block text-sm">
          {zipLabel} *
          <input
            required
            autoComplete="postal-code"
            placeholder={shipping.country === "US" ? "95112" : "A1A 1A1"}
            value={shipping.zip}
            onChange={(e) =>
              updateField(
                "zip",
                shipping.country === "US"
                  ? formatUsZip(e.target.value)
                  : formatCaPostal(e.target.value)
              )
            }
            onBlur={lookupZip}
            className={inputClass(!!fieldErrors.zip)}
          />
          {fieldErrors.zip && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.zip}</span>
          )}
          {zipLookupMessage && (
            <span
              className={`mt-1 block text-xs ${
                zipLookupMessage.startsWith("Found") ? "text-green-700" : "text-amber-700"
              }`}
            >
              {zipLookupMessage}
            </span>
          )}
        </label>

        <label className="block text-sm">
          City *
          <input
            required
            autoComplete="address-level2"
            value={shipping.city}
            onChange={(e) => updateField("city", e.target.value)}
            onBlur={() => {
              const { errors } = validateShippingInfo(shipping);
              onFieldErrorsChange({ ...fieldErrors, city: errors.city });
            }}
            className={inputClass(!!fieldErrors.city)}
          />
          {fieldErrors.city && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.city}</span>
          )}
        </label>

        <label className="block text-sm">
          {regionLabel} *
          <select
            required
            autoComplete="address-level1"
            value={shipping.state}
            onChange={(e) => updateField("state", e.target.value)}
            className={inputClass(!!fieldErrors.state)}
          >
            <option value="">Select {regionLabel.toLowerCase()}</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name}
              </option>
            ))}
          </select>
          {fieldErrors.state && (
            <span className="mt-1 block text-xs text-red-600">{fieldErrors.state}</span>
          )}
        </label>
      </div>
      <p className="text-xs text-stone-500">
        Enter your {zipLabel.toLowerCase()} and tab out — city and {regionLabel.toLowerCase()}{" "}
        will auto-fill when found.
      </p>
    </section>
  );
}
