// Merge data/catalog.raw.json (freshly scanned folder, ids starting at 1)
// into data/catalog.json, continuing ids from the current max, and applying
// summaries from the given summaries module.
//
// Usage: node scripts/add-folder.mjs scripts/summaries-plumbing.mjs
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const summariesPath = process.argv[2];
if (!summariesPath) {
  console.error("Usage: node scripts/add-folder.mjs <summaries-module-path>");
  process.exit(1);
}

const { SUMMARIES } = await import(pathToFileURL(path.resolve(summariesPath)).href);

const RAW_FILE = path.join(process.cwd(), "data", "catalog.raw.json");
const CATALOG_FILE = path.join(process.cwd(), "data", "catalog.json");

const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));
const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf-8"));

const offset = catalog.reduce((max, item) => Math.max(max, item.id), 0);

let missing = 0;
for (const item of raw) {
  const s = SUMMARIES[item.id];
  if (!s) missing++;
  catalog.push({
    ...item,
    id: item.id + offset,
    summary_ko: s ? s.summary_ko : "",
    keywords_ko: s ? s.keywords_ko : [],
    keywords_en: s ? s.keywords_en : [],
  });
}

fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), "utf-8");
console.log(`${raw.length}개 항목 추가 (id ${offset + 1}~${offset + raw.length}), 요약 누락: ${missing}개`);
console.log(`총 ${catalog.length}개 자료`);
