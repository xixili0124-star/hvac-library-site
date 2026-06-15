// catalog.raw.json + summaries.mjs(들) → data/catalog.json 생성
// 사용법: node scripts/build-catalog.mjs

import fs from "fs";
import path from "path";
import { SUMMARIES } from "./summaries.mjs";

const RAW_FILE = path.join(process.cwd(), "data", "catalog.raw.json");
const OUT_FILE = path.join(process.cwd(), "data", "catalog.json");

const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf-8"));

let missing = 0;
const merged = raw.map((item) => {
  const s = SUMMARIES[item.id];
  if (!s) {
    missing++;
    return item;
  }
  return {
    ...item,
    summary_ko: s.summary_ko,
    keywords_ko: s.keywords_ko,
    keywords_en: s.keywords_en,
  };
});

fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2), "utf-8");
console.log(`총 ${merged.length}개 중 요약 누락: ${missing}개`);
console.log(`${OUT_FILE} 생성 완료`);
