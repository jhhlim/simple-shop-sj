#!/usr/bin/env node
import { writeFileSync } from "fs";

const pages = [PAGE2, PAGE3, PAGE4, PAGE5];
const page1 = JSON.parse(await import("fs").then((fs) => fs.readFileSync("/Users/jasonlim/Desktop/test2/ebay-page1.json", "utf8")));

const seen = new Set();
const all = [];
for (const list of [page1, ...pages]) {
  for (const item of list) {
    if (seen.has(item.itemId)) continue;
    seen.add(item.itemId);
    all.push(item);
  }
}

writeFileSync("/Users/jasonlim/Desktop/test2/ebay-all-items.json", JSON.stringify(all, null, 2));
console.log("Merged", all.length, "unique listings");
