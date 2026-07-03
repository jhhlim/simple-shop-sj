import { getProducts } from "@/lib/products";
import { HomePageContent } from "@/components/home/HomePageContent";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();

  return <HomePageContent products={products} />;
}
