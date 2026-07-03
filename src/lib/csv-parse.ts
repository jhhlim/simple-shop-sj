/** Minimal RFC 4180 CSV parser (handles quoted fields and newlines in quotes). */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
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

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim()));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };

  const headerIndex = nonEmpty.findIndex((r) => looksLikeHeaderRow(r));
  if (headerIndex < 0) {
    return { headers: nonEmpty[0].map((h) => h.trim()), rows: nonEmpty.slice(1) };
  }

  const headers = nonEmpty[headerIndex].map((h) => h.trim().replace(/\n/g, " "));
  const dataRows = nonEmpty.slice(headerIndex + 1);
  return { headers, rows: dataRows };
}

function looksLikeHeaderRow(row: string[]): boolean {
  const joined = row.join(" ").toLowerCase();
  return (
    joined.includes("reference handle") ||
    joined.includes("item name") ||
    joined.includes("custom label") ||
    joined.includes("start price") ||
    joined.includes("title") ||
    joined.includes("sku")
  );
}

export function rowsToObjects(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      if (header) obj[header] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}

export function pickField(row: Record<string, string>, aliases: string[]): string {
  const keys = Object.keys(row);
  for (const alias of aliases) {
    const target = alias.toLowerCase();
    const key = keys.find((k) => k.toLowerCase().replace(/\s+/g, " ") === target);
    if (key && row[key]) return row[key].trim();
    const partial = keys.find((k) => k.toLowerCase().includes(target));
    if (partial && row[partial]) return row[partial].trim();
  }
  return "";
}
