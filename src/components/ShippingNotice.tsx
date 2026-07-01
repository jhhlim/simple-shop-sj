import { SHIPPING_FEE, SHIPPING_LABEL_NOTE } from "@/lib/constants";

export function ShippingNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-amber-200 bg-amber-50 text-amber-950 ${
        compact ? "p-3 text-sm" : "p-4"
      }`}
    >
      <p className="font-medium">Shipping: ${SHIPPING_FEE.toFixed(2)} flat rate</p>
      <p className={`mt-1 ${compact ? "text-xs" : "text-sm"} text-amber-900/80`}>
        {SHIPPING_LABEL_NOTE}
      </p>
    </div>
  );
}
