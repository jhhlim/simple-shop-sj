#!/usr/bin/env node
/**
 * Scrape eBay seller store pages for listing titles and images (Puppeteer).
 *
 * Usage:
 *   node scripts/scrape-ebay-seller.mjs <seller> <startPage> <endPage> <outputDir> [--ipg=200]
 *
 * Example:
 *   node scripts/scrape-ebay-seller.mjs limware 1 3 /Users/jasonlim/Desktop/test2 --ipg=200
 */

import { writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer";

const seller = process.argv[2] || "limware";
const startPage = parseInt(process.argv[3] || "1", 10);
const endPage = parseInt(process.argv[4] || String(startPage), 10);
const outDir = process.argv[5] || ".";
const ipgArg = process.argv.find((a) => a.startsWith("--ipg="));
const itemsPerPage = ipgArg ? parseInt(ipgArg.split("=")[1], 10) : 48;

const EXTRACT_FN = () => {
  const seen = new Set();
  const items = [];
  for (const a of document.querySelectorAll('a[href*="/itm/"]')) {
    const m = a.href.match(/\/itm\/(\d+)/);
    if (!m || seen.has(m[1])) continue;
    let title = (a.getAttribute("aria-label") || a.title || a.textContent || "").trim();
    if (!title || title.length < 8 || /^watch /i.test(title)) continue;
    const card = a.closest("li, .s-item, [class*=\"card\"]") || a.parentElement?.parentElement;
    const imgEl = a.querySelector("img") || card?.querySelector("img");
    const img = imgEl?.src || imgEl?.getAttribute("data-src") || "";
    if (!img.includes("ebayimg")) continue;
    seen.add(m[1]);
    items.push({ itemId: m[1], title, img });
  }
  return items;
};

function mergeAllPages(dir) {
  const pageFiles = readdirSync(dir)
    .filter((f) => /^ebay-page\d+\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

  const seen = new Set();
  const all = [];
  for (const file of pageFiles) {
    const list = JSON.parse(readFileSync(join(dir, file), "utf-8"));
    for (const item of list) {
      if (seen.has(item.itemId)) continue;
      seen.add(item.itemId);
      all.push(item);
    }
  }
  const outPath = join(dir, "ebay-all-items.json");
  writeFileSync(outPath, JSON.stringify(all, null, 2));
  return { count: all.length, outPath, pageFiles: pageFiles.length };
}

async function scrapePage(pageNum, browserPage) {
  const url = `https://www.ebay.com/usr/${seller}?_ipg=${itemsPerPage}&_pgn=${pageNum}`;
  await browserPage.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await browserPage.waitForSelector('a[href*="/itm/"]', { timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  return browserPage.evaluate(EXTRACT_FN);
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const browserPage = await browser.newPage();
  await browserPage.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );

  const results = [];
  for (let page = startPage; page <= endPage; page++) {
    const items = await scrapePage(page, browserPage);
    const outPath = join(outDir, `ebay-page${page}.json`);
    writeFileSync(outPath, JSON.stringify(items, null, 2));
    console.log(`Page ${page} (_ipg=${itemsPerPage}): ${items.length} items -> ${outPath}`);
    results.push({ page, count: items.length, outPath });
    if (items.length === 0) {
      console.log("Empty page, stopping.");
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  await browser.close();

  const merged = mergeAllPages(outDir);
  console.log(`Merged ${merged.count} unique items from ${merged.pageFiles} pages -> ${merged.outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
