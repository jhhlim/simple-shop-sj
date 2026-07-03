import { readFileSync, writeFileSync } from "fs";

const SQUARE_PATH = process.argv[2];
const OUT_PATH = process.argv[3] || "limware-import-from-square.csv";

if (!SQUARE_PATH) {
  console.error("Usage: node scripts/convert-square-to-limware.mjs <square-export.csv> [output.csv]");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
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
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      if (ch === "\r") i++;
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim())) rows.push(row);
  const headerIndex = rows.findIndex((r) =>
    r.join(" ").toLowerCase().includes("reference handle")
  );
  const headers = rows[headerIndex].map((h) => h.trim());
  const dataRows = rows.slice(headerIndex + 1);
  return { headers, dataRows };
}

function pick(row, headers, names) {
  for (const name of names) {
    const i = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());
    if (i >= 0 && row[i]?.trim()) return row[i].trim();
  }
  return "";
}

function parseStock(row, headers) {
  const values = [
    pick(row, headers, ["Current Quantity Limware", "Current Quantity"]),
    pick(row, headers, ["New Quantity Limware", "New Quantity"]),
    pick(row, headers, ["Quantity", "Stock"]),
  ];
  let best = -1;
  for (const v of values) {
    if (!v) continue;
    const n = Number(v.replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) best = Math.max(best, Math.floor(n));
  }
  return best >= 0 ? best : 1;
}

function mapCategory(raw) {
  const c = raw.toLowerCase();
  if (/jewelry|jewellery|ring|necklace|bracelet|earring|pendant|brooch|watch|gem/.test(c)) {
    return "Jewelry";
  }
  if (!c || c === "other") return "Other";
  return "Used goods";
}

function csvEscape(s) {
  const v = String(s ?? "");
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

const text = readFileSync(SQUARE_PATH, "utf-8");
const { headers, dataRows } = parseCsv(text);
const out = ["Name,Description,Price,Category,Stock,SKU,Image URL"];
let skipped = 0;

for (const row of dataRows) {
  const archived = pick(row, headers, ["Archived"]).toUpperCase();
  if (archived === "Y" || archived === "YES") {
    skipped++;
    continue;
  }
  const name = pick(row, headers, ["Customer-facing Name", "Item Name"]);
  const priceRaw = pick(row, headers, ["Online Sale Price", "Price"]).replace(/[$,]/g, "");
  const price = Number(priceRaw);
  if (!name || !Number.isFinite(price) || price <= 0) {
    skipped++;
    continue;
  }
  const description = pick(row, headers, ["Description", "SEO Description"]) || name;
  const category = mapCategory(
    pick(row, headers, ["Categories", "Reporting Category"])
  );
  const stock = parseStock(row, headers);
  const sku = pick(row, headers, ["SKU"]);
  out.push(
    [name, description, price.toFixed(2), category, String(stock), sku, ""]
      .map(csvEscape)
      .join(",")
  );
}

writeFileSync(OUT_PATH, out.join("\n"));
console.log(`Wrote ${out.length - 1} items to ${OUT_PATH} (skipped ${skipped})`);
