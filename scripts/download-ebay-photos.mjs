#!/usr/bin/env node
/**
 * Download eBay listing photos renamed by SKU for Limware bulk photo upload.
 *
 * Usage:
 *   node scripts/download-ebay-photos.mjs <ebay-items.json> <sku-csv> <output-dir>
 *
 * ebay-items.json: [{ "title": "...", "img": "https://i.ebayimg.com/..." }, ...]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const itemsPath = process.argv[2];
const csvPath = process.argv[3];
const outDir = process.argv[4] || "mass-upload-photos";

if (!itemsPath || !csvPath) {
  console.error(
    "Usage: node scripts/download-ebay-photos.mjs <ebay-items.json> <sku-csv> <output-dir>"
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

function loadSkuMap(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const nameIdx = headers.findIndex((h) => h.toLowerCase() === "name");
  const skuIdx = headers.findIndex((h) => h.toLowerCase() === "sku");
  const map = new Map();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const name = cols[nameIdx]?.trim();
    const sku = cols[skuIdx]?.trim();
    if (name && sku) map.set(normalizeTitle(name), sku);
  }
  return map;
}

function ebayImageToJpgUrl(url) {
  // s-l300.webp -> s-l1600.jpg for higher quality JPEG
  return url
    .replace(/\/s-l\d+\.(webp|jpg|png)/i, "/s-l1600.jpg")
    .replace(/\.webp$/i, ".jpg");
}

function findSku(title, skuMap, ebayItems) {
  const norm = normalizeTitle(title);
  if (skuMap.has(norm)) return skuMap.get(norm);

  // Fuzzy: substring match on normalized titles
  for (const [csvTitle, sku] of skuMap) {
    if (norm === csvTitle) return sku;
    if (norm.includes(csvTitle) || csvTitle.includes(norm)) return sku;
  }

  // Token overlap score
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
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("image")) throw new Error(`Not an image: ${ct}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

const ebayItems = JSON.parse(readFileSync(itemsPath, "utf-8"));
const skuMap = loadSkuMap(readFileSync(csvPath, "utf-8"));
mkdirSync(outDir, { recursive: true });

const usedSkus = new Set();
const report = { downloaded: [], skipped: [], unmatched: [], errors: [] };

for (const item of ebayItems) {
  const sku = findSku(item.title, skuMap);
  if (!sku) {
    report.unmatched.push({ title: item.title, img: item.img });
    continue;
  }
  if (usedSkus.has(sku)) {
    report.skipped.push({ sku, title: item.title, reason: "duplicate SKU" });
    continue;
  }

  const dest = `${outDir}/${sku}.jpg`;
  if (existsSync(dest)) {
    usedSkus.add(sku);
    report.skipped.push({ sku, title: item.title, reason: "already exists" });
    continue;
  }

  const imgUrl = ebayImageToJpgUrl(item.img);
  try {
    await downloadImage(imgUrl, dest);
    usedSkus.add(sku);
    report.downloaded.push({ sku, title: item.title, file: dest });
    process.stdout.write(".");
  } catch (err) {
    // Fallback to original URL
    try {
      await downloadImage(item.img, dest);
      usedSkus.add(sku);
      report.downloaded.push({ sku, title: item.title, file: dest, fallback: true });
      process.stdout.write(".");
    } catch (err2) {
      report.errors.push({
        sku,
        title: item.title,
        error: err2 instanceof Error ? err2.message : String(err2),
      });
      process.stdout.write("x");
    }
  }
}

console.log("\n");
console.log(
  `Downloaded: ${report.downloaded.length}, unmatched: ${report.unmatched.length}, errors: ${report.errors.length}`
);
writeFileSync(`${outDir}/_report.json`, JSON.stringify(report, null, 2));
if (report.unmatched.length) {
  writeFileSync(`${outDir}/_unmatched.txt`, report.unmatched.map((u) => u.title).join("\n"));
}
