import type { ProductCategory } from "./types";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "clothing",
  "shoes",
  "bags",
  "jewelry",
  "accessories",
  "toys",
  "collectibles",
  "goods",
  "other",
];

export const SHOP_CATEGORY_LABELS: Record<ProductCategory, string> = {
  clothing: "Clothing",
  shoes: "Shoes",
  bags: "Bags",
  jewelry: "Jewelry",
  accessories: "Accessories",
  toys: "Toys",
  collectibles: "Collectibles",
  goods: "Used goods",
  other: "Other",
};

const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  clothing: "clothing",
  clothes: "clothing",
  apparel: "clothing",
  shoes: "shoes",
  footwear: "shoes",
  bags: "bags",
  handbags: "bags",
  purses: "bags",
  jewelry: "jewelry",
  jewellery: "jewelry",
  accessories: "accessories",
  accessory: "accessories",
  toys: "toys",
  toy: "toys",
  collectibles: "collectibles",
  collectible: "collectibles",
  goods: "goods",
  "used goods": "goods",
  used: "goods",
  "used good": "goods",
  other: "other",
  misc: "other",
  miscellaneous: "other",
};

const KEYWORD_CATEGORY_RULES: { category: ProductCategory; keywords: string[] }[] = [
  {
    category: "jewelry",
    keywords: [
      "jewelry",
      "jewellery",
      "ring",
      "necklace",
      "bracelet",
      "earring",
      "pendant",
      "brooch",
      "gem",
    ],
  },
  {
    category: "shoes",
    keywords: ["shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "footwear", "sandal", "heels"],
  },
  {
    category: "bags",
    keywords: ["bag", "purse", "handbag", "tote", "backpack", "clutch", "wallet"],
  },
  {
    category: "clothing",
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
      "skirt",
      "shorts",
      "tee",
      "t-shirt",
    ],
  },
  {
    category: "accessories",
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
    ],
  },
  {
    category: "toys",
    keywords: ["toy", "toys", "plush", "doll", "lego", "action figure", "stuffed", "game", "puzzle"],
  },
  {
    category: "collectibles",
    keywords: [
      "collectible",
      "collectibles",
      "vintage",
      "trading card",
      "funko",
      "memorabilia",
      "limited edition",
    ],
  },
];

export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && PRODUCT_CATEGORIES.includes(value as ProductCategory);
}

export function normalizeProductCategory(value: unknown): ProductCategory {
  if (isProductCategory(value)) return value;
  return "goods";
}

/** Map spreadsheet / admin Category column to shop category. */
export function mapShopCategory(raw: string): ProductCategory {
  const c = raw.trim().toLowerCase();
  if (!c) return "goods";
  if (CATEGORY_ALIASES[c]) return CATEGORY_ALIASES[c];
  for (const rule of KEYWORD_CATEGORY_RULES) {
    if (rule.keywords.some((k) => c.includes(k))) return rule.category;
  }
  return "goods";
}

/** Map marketplace category strings (Square, eBay) to shop category. */
export function mapCategoryFromMarketplace(sourceCategory: string): ProductCategory {
  return mapShopCategory(sourceCategory);
}

export function getCategoryLabel(category: ProductCategory): string {
  return SHOP_CATEGORY_LABELS[category] || category;
}
