import { ProductCatalog } from "@/components/ProductCatalog";
import { ShippingNotice } from "@/components/ShippingNotice";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Used goods &amp; jewelry</h1>
          <p className="mt-2 max-w-2xl text-stone-600">
            Curated pre-owned items at fair prices. Every order includes a flat $5 shipping fee.
          </p>
        </div>
        <ShippingNotice />
      </section>

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
          No items listed yet.
        </div>
      ) : (
        <ProductCatalog products={products} />
      )}
    </div>
  );
}
