#!/usr/bin/env node
/**
 * Compare Square import SKUs, local bulk photos, and scraped eBay items.
 *
 * Usage:
 *   node scripts/compile-photo-delta.mjs \
 *     <limware-import.csv> \
 *     <mass-upload-photos-dir> \
 *     <ebay-all-items.json> \
 *     <output-dir> [--download]
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  createWriteStream,
} from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import path from "path";

const csvPath = process.argv[2];
const photosDir = process.argv[3];
const ebayPath = process.argv[4];
const outDir = process.argv[5] || "mass-upload-delta";
const shouldDownload = process.argv.includes("--download");

if (!csvPath || !photosDir || !ebayPath) {
  console.error(
    "Usage: node scripts/compile-photo-delta.mjs <csv> <photos-dir> <ebay.json> <out-dir> [--download]"
  );
  process.exit(1);
}

function normalizeTitle(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') inQuotes = false;
      else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      fields.push(field);
      field = "";
      continue;
    }
    field += ch;
  }
  fields.push(field);
  return fields;
}

function loadListings(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const idx = (name) => headers.findIndex((h) => h.toLowerCase() === name);
  const nameIdx = idx("name");
  const skuIdx = idx("sku");
  const priceIdx = idx("price");
  const catIdx = idx("category");
  const stockIdx = idx("stock");
  const imageIdx = idx("image url");

  const listings = [];
  const bySku = new Map();
  const titleToSku = new Map();

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const name = cols[nameIdx]?.trim() || "";
    const sku = cols[skuIdx]?.trim() || "";
    if (!sku) continue;
    const row = {
      sku,
      name,
      price: cols[priceIdx]?.trim() || "",
      category: cols[catIdx]?.trim() || "",
      stock: cols[stockIdx]?.trim() || "",
      imageUrl: cols[imageIdx]?.trim() || "",
    };
    listings.push(row);
    bySku.set(sku.toLowerCase(), row);
    if (name) titleToSku.set(normalizeTitle(name), sku);
  }
  return { listings, bySku, titleToSku };
}

function loadSkuMap(titleToSku) {
  return titleToSku;
}

function findSku(title, skuMap) {
  const norm = normalizeTitle(title);
  if (skuMap.has(norm)) return skuMap.get(norm);

  for (const [csvTitle, sku] of skuMap) {
    if (norm === csvTitle) return sku;
    if (norm.includes(csvTitle) || csvTitle.includes(norm)) return sku;
  }

  const normTokens = new Set(norm.split(" ").filter((t) => t.length > 2));
  let best = { sku: null, score: 0 };
  for (const [csvTitle, sku] of skuMap) {
    const csvTokens = csvTitle.split(" ").filter((t) => t.length > 2);
    let overlap = 0;
    for (const t of csvTokens) if (normTokens.has(t)) overlap++;
    const score = overlap / Math.max(csvTokens.length, 1);
    if (score > best.score && score >= 0.6) best = { sku, score };
  }
  return best.sku;
}

function loadPhotoSkus(dir) {
  const skus = new Set();
  const files = [];
  if (!existsSync(dir)) return { skus, files };
  for (const name of readdirSync(dir)) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) continue;
    const stem = name.replace(/\.[^.]+$/, "");
    skus.add(stem.toLowerCase());
    files.push({ sku: stem, file: path.join(dir, name) });
  }
  return { skus, files };
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  writeFileSync(filePath, lines.join("\n") + "\n");
}

function ebayImageToJpgUrl(url) {
  return url
    .replace(/\/s-l\d+\.(webp|jpg|png)/i, "/s-l1600.jpg")
    .replace(/\.webp$/i, ".jpg");
}

async function downloadImage(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      Accept: "image/*",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

const { listings, bySku, titleToSku } = loadListings(readFileSync(csvPath, "utf-8"));
const skuMap = loadSkuMap(titleToSku);
const { skus: photoSkus, files: photoFiles } = loadPhotoSkus(photosDir);
const ebayItems = JSON.parse(readFileSync(ebayPath, "utf-8"));

mkdirSync(outDir, { recursive: true });
const deltaPhotosDir = path.join(outDir, "photos");
if (shouldDownload) mkdirSync(deltaPhotosDir, { recursive: true });

const listingsMissingPhotos = listings
  .filter((l) => !photoSkus.has(l.sku.toLowerCase()))
  .map((l) => ({
    sku: l.sku,
    name: l.name,
    price: l.price,
    category: l.category,
    stock: l.stock,
    imageUrl: l.imageUrl,
  }));

const photosWithoutListing = photoFiles
  .filter((p) => !bySku.has(p.sku.toLowerCase()))
  .map((p) => ({ sku: p.sku, file: p.file }));

const ebayMatched = [];
const ebayUnmatched = [];
const ebaySkuToItem = new Map();

for (const item of ebayItems) {
  const sku = findSku(item.title, skuMap);
  if (!sku) {
    ebayUnmatched.push({
      title: item.title,
      itemId: item.itemId || "",
      img: item.img || "",
      reason: "no SKU match in Square import",
    });
    continue;
  }
  const hasPhoto = photoSkus.has(sku.toLowerCase());
  const listing = bySku.get(sku.toLowerCase());
  const row = {
    sku,
    name: listing?.name || item.title,
    title: item.title,
    itemId: item.itemId || "",
    img: item.img || "",
    hasLocalPhoto: hasPhoto ? "yes" : "no",
  };
  ebayMatched.push(row);
  if (!ebaySkuToItem.has(sku.toLowerCase())) ebaySkuToItem.set(sku.toLowerCase(), item);
}

const ebayNotDownloaded = ebayMatched.filter((r) => r.hasLocalPhoto === "no");

const listingsNotOnEbayScrape = listings
  .filter((l) => {
    const onEbay = ebayMatched.some((e) => e.sku.toLowerCase() === l.sku.toLowerCase());
    return !onEbay;
  })
  .map((l) => ({
    sku: l.sku,
    name: l.name,
    price: l.price,
    category: l.category,
    hasLocalPhoto: photoSkus.has(l.sku.toLowerCase()) ? "yes" : "no",
    reason: "not in scraped eBay seller pages",
  }));

const downloadResults = { downloaded: [], errors: [] };

if (shouldDownload) {
  for (const row of ebayNotDownloaded) {
    const item = ebaySkuToItem.get(row.sku.toLowerCase());
    if (!item?.img) continue;
    const dest = path.join(deltaPhotosDir, `${row.sku}.jpg`);
    if (existsSync(dest)) continue;
    const imgUrl = ebayImageToJpgUrl(item.img);
    try {
      await downloadImage(imgUrl, dest);
      downloadResults.downloaded.push({ sku: row.sku, file: dest });
      process.stdout.write(".");
    } catch {
      try {
        await downloadImage(item.img, dest);
        downloadResults.downloaded.push({ sku: row.sku, file: dest, fallback: true });
        process.stdout.write(".");
      } catch (err2) {
        downloadResults.errors.push({
          sku: row.sku,
          title: row.title,
          error: err2 instanceof Error ? err2.message : String(err2),
        });
        process.stdout.write("x");
      }
    }
  }
  if (ebayNotDownloaded.length) console.log("");
}

writeCsv(path.join(outDir, "listings-missing-photos.csv"), [
  "sku",
  "name",
  "price",
  "category",
  "stock",
  "imageUrl",
], listingsMissingPhotos);

writeCsv(path.join(outDir, "photos-without-listing.csv"), ["sku", "file"], photosWithoutListing);

writeCsv(path.join(outDir, "ebay-not-downloaded.csv"), [
  "sku",
  "name",
  "title",
  "itemId",
  "img",
  "hasLocalPhoto",
], ebayNotDownloaded);

writeCsv(path.join(outDir, "ebay-unmatched-titles.csv"), [
  "title",
  "itemId",
  "img",
  "reason",
], ebayUnmatched);

writeCsv(path.join(outDir, "listings-not-on-ebay-scrape.csv"), [
  "sku",
  "name",
  "price",
  "category",
  "hasLocalPhoto",
  "reason",
], listingsNotOnEbayScrape);

const summary = {
  generatedAt: new Date().toISOString(),
  counts: {
    squareListings: listings.length,
    localPhotos: photoSkus.size,
    ebayScrapedItems: ebayItems.length,
    listingsMissingPhotos: listingsMissingPhotos.length,
    photosWithoutListing: photosWithoutListing.length,
    ebayMatchedToSku: ebayMatched.length,
    ebayUnmatchedTitles: ebayUnmatched.length,
    ebayMatchedButNoPhoto: ebayNotDownloaded.length,
    listingsNotOnEbayScrape: listingsNotOnEbayScrape.length,
    deltaPhotosDownloaded: downloadResults.downloaded.length,
    deltaDownloadErrors: downloadResults.errors.length,
  },
  notes: [
    "Square CSV = limware shop catalog SKUs (source of truth for bulk photo matching).",
    "eBay scrape = seller store pages (see ebay-all-items.json item count).",
    "listings-missing-photos = Square SKUs with no file in mass-upload-photos.",
    "listings-not-on-ebay-scrape = Square listings with no title match in scraped eBay JSON.",
    "ebay-not-downloaded = scraped eBay item matched SKU but no local photo (downloadable if still on eBay).",
  ],
};

writeFileSync(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));

const md = `# Limware photo / listing delta

Generated: ${summary.generatedAt}

## Counts

| Source | Count |
|--------|------:|
| Square import listings (with SKU) | ${listings.length} |
| Local photos (\`mass-upload-photos\`) | ${photoSkus.size} |
| eBay scraped items | ${ebayItems.length} |
| **Listings missing local photo** | **${listingsMissingPhotos.length}** |
| Photos with no Square SKU | ${photosWithoutListing.length} |
| eBay items matched to SKU | ${ebayMatched.length} |
| eBay titles with no SKU match | ${ebayUnmatched.length} |
| eBay matched but no local photo | ${ebayNotDownloaded.length} |
| Square listings not in eBay scrape | ${listingsNotOnEbayScrape.length} |

## Where is the delta?

1. **${listings.length - photoSkus.size} listings vs photos** — Square has ${listings.length} SKUs; only ${photoSkus.size} photos exist locally.
2. **${listings.length - ebayItems.length} listings vs eBay scrape** — Scrape captured ${ebayItems.length} items; Square has ${listings.length} SKUs.
3. **${listingsNotOnEbayScrape.length} listings not on scraped eBay** — In Square but no title match in \`ebay-all-items.json\` (never scraped, delisted on eBay, or title mismatch).
4. **${ebayNotDownloaded.length} eBay matches without photo** — Item was scraped and SKU matched, but no \`{SKU}.jpg\` in mass-upload-photos (should be 0 if scrape+download was complete).

## Files

- \`listings-missing-photos.csv\` — upload these SKUs still need photos
- \`listings-not-on-ebay-scrape.csv\` — need manual photo or re-scrape more eBay pages
- \`ebay-not-downloaded.csv\` — eBay had image + SKU match, no local file
- \`photos-without-listing.csv\` — orphan photo files
- \`ebay-unmatched-titles.csv\` — scraped eBay titles that didn't map to a Square SKU
- \`photos/\` — ${shouldDownload ? "attempted download of eBay images for missing SKUs" : "run script with --download to fetch missing eBay images here"}

## Next steps

1. Bulk upload \`mass-upload-photos\` + \`mass-upload-delta/photos\` via admin Import.
2. Re-scrape eBay seller pages if \`listings-not-on-ebay-scrape.csv\` is non-empty.
3. For \`listings-not-on-ebay-scrape.csv\`, add Image URL in spreadsheet or photograph manually.
`;

writeFileSync(path.join(outDir, "README.md"), md);

if (downloadResults.downloaded.length || downloadResults.errors.length) {
  writeFileSync(
    path.join(outDir, "download-report.json"),
    JSON.stringify(downloadResults, null, 2)
  );
}

console.log(JSON.stringify(summary.counts, null, 2));
console.log(`\nWrote reports to ${outDir}`);
