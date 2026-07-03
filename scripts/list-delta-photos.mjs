#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "fs";
import path from "path";

const base = process.argv[2] || path.join(process.env.HOME, "Desktop/test2");

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

function normalizeTitle(s) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

const skuMap = loadSkuMap(readFileSync(path.join(base, "limware-import-from-square.csv"), "utf8"));

const oldIds = new Set();
for (let p = 1; p <= 5; p++) {
  const items = JSON.parse(readFileSync(path.join(base, `ebay-page${p}.json`), "utf8"));
  for (const it of items) oldIds.add(it.itemId);
}

const all = JSON.parse(readFileSync(path.join(base, "ebay-all-items.json"), "utf8"));
const oldSkus = new Set();
const newItems = [];

for (const it of all) {
  const sku = findSku(it.title, skuMap);
  if (!sku) continue;
  if (oldIds.has(it.itemId)) oldSkus.add(sku);
  else newItems.push({ sku, title: it.title });
}

const uniq = [...new Map(newItems.map((x) => [x.sku, x])).values()].sort((a, b) =>
  a.sku.localeCompare(b.sku)
);

const outDir = path.join(base, "mass-upload-delta");
const newDir = path.join(outDir, "photos-new");
mkdirSync(newDir, { recursive: true });

const lines = uniq.map((x) => `${x.sku}.jpg`);
writeFileSync(path.join(outDir, "NEW-PHOTOS-ONLY.txt"), lines.join("\n") + "\n");

let copied = 0;
for (const x of uniq) {
  const src = path.join(base, "mass-upload-photos", `${x.sku}.jpg`);
  const dest = path.join(newDir, `${x.sku}.jpg`);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    copied++;
  }
}

writeFileSync(
  path.join(outDir, "README-DELTA-PHOTOS.md"),
  `# Delta photos (pages 6+ scrape)

\`mass-upload-photos\` is **not ordered** by scrape batch — every file is \`{SKU}.jpg\`.

These **${uniq.length}** photos are new vs the original pages 1–5 scrape (${oldSkus.size} SKUs). Copied to \`photos-new/\`.

**Upload:** Select all files in \`photos-new/\` if you already uploaded the first 178. Or upload all 227 from \`mass-upload-photos\`.

6 Square SKUs still have no eBay photo — see \`listings-missing-photos.csv\`.
`
);

console.log(`NEW: ${uniq.length}, copied: ${copied}`);
for (const x of uniq) console.log(`${x.sku}.jpg`);
