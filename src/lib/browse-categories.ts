import type { Product } from "./types";

/** Display browse categories for the homepage — mapped to keyword + base-category filters. */
export type BrowseCategoryId =
  | "clothing"
  | "shoes"
  | "bags"
  | "jewelry"
  | "accessories"
  | "toys"
  | "collectibles"
  | "new-arrivals";

export type BrowseCategory = {
  id: BrowseCategoryId;
  label: string;
  keywords: string[];
  baseCategories?: Product["category"][];
};

const NEW_ARRIVAL_DAYS = 30;

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  {
    id: "clothing",
    label: "Clothing",
    keywords: [
      "shirt",
      "dress",
      "jacket",
      "pants",
      "jeans",
      "sweater",
      "hoodie",
      "blouse",
      "coat",
      "apparel",
      "clothing",
      "top",
      "skirt",
      "shorts",
      "tee",
      "t-shirt",
    ],
    baseCategories: ["clothing", "goods"],
  },
  {
    id: "shoes",
    label: "Shoes",
    keywords: ["shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "footwear", "sandal", "heels"],
    baseCategories: ["shoes", "goods"],
  },
  {
    id: "bags",
    label: "Bags",
    keywords: ["bag", "purse", "handbag", "tote", "backpack", "clutch", "wallet"],
    baseCategories: ["bags", "goods", "other"],
  },
  {
    id: "jewelry",
    label: "Jewelry",
    keywords: ["ring", "necklace", "bracelet", "earring", "earrings", "pendant", "brooch", "jewelry", "jewellery"],
    baseCategories: ["jewelry"],
  },
  {
    id: "accessories",
    label: "Accessories",
    keywords: [
      "accessory",
      "accessories",
      "scarf",
      "hat",
      "belt",
      "sunglasses",
      "watch",
      "gloves",
      "headband",
      "hair",
    ],
    baseCategories: ["accessories", "goods", "other"],
  },
  {
    id: "toys",
    label: "Toys",
    keywords: ["toy", "toys", "plush", "doll", "lego", "action figure", "stuffed", "game", "puzzle"],
    baseCategories: ["toys", "goods", "other"],
  },
  {
    id: "collectibles",
    label: "Collectibles",
    keywords: [
      "collectible",
      "collectibles",
      "vintage",
      "rare",
      "figure",
      "trading card",
      "funko",
      "memorabilia",
      "limited edition",
    ],
    baseCategories: ["collectibles", "goods", "jewelry", "other"],
  },
  {
    id: "new-arrivals",
    label: "New Arrivals",
    keywords: [],
  },
];

function productText(product: Product): string {
  return `${product.name} ${product.description}`.toLowerCase();
}

function matchesKeywords(product: Product, keywords: string[]): boolean {
  const text = productText(product);
  return keywords.some((kw) => text.includes(kw));
}

function isNewArrival(product: Product): boolean {
  const created = new Date(product.createdAt).getTime();
  const cutoff = Date.now() - NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
  return created >= cutoff;
}

export function productMatchesBrowseCategory(
  product: Product,
  categoryId: BrowseCategoryId | "all"
): boolean {
  if (categoryId === "all") return true;

  if (categoryId === "new-arrivals") {
    return isNewArrival(product);
  }

  const config = BROWSE_CATEGORIES.find((c) => c.id === categoryId);
  if (!config) return true;

  // Prefer explicit product category when it matches the browse bucket.
  if (product.category === categoryId) return true;

  // Legacy "goods" listings still match via keywords / baseCategories.
  if (config.baseCategories?.includes(product.category) && matchesKeywords(product, config.keywords)) {
    return true;
  }

  return matchesKeywords(product, config.keywords);
}

export function getFeaturedProducts(products: Product[], limit = 6): Product[] {
  const inStock = products.filter((p) => p.stock > 0);
  const withImages = inStock.filter((p) => p.imageUrl);
  const withoutImages = inStock.filter((p) => !p.imageUrl);
  const sorted = [...withImages, ...withoutImages].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted.slice(0, limit);
}

export function getNewArrivalProducts(products: Product[], limit = 8): Product[] {
  return [...products]
    .filter((p) => p.stock > 0 && isNewArrival(p))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
