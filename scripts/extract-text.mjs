import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";

const list = JSON.parse(fs.readFileSync("data/download-list.json", "utf-8"));
const outPath = "data/excerpts.json";
const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf-8")) : {};

const MAX_SIZE = 30 * 1024 * 1024; // 30MB - skip larger files (too slow to hydrate)

for (const item of list) {
  if (out[item.id]) {
    console.log(`[SKIP] ${item.id} ${item.title} (already done)`);
    continue;
  }
  if (!item.samplePath) {
    console.log(`[SKIP] ${item.id} ${item.title} (no sample path)`);
    continue;
  }
  try {
    const size = fs.statSync(item.samplePath).size;
    if (size > MAX_SIZE) {
      console.log(`[SKIP] ${item.id} ${item.title} (${(size / 1024 / 1024).toFixed(0)}MB too large)`);
      continue;
    }
    const buf = fs.readFileSync(item.samplePath);
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText({ first: 8 });
    const text = result.text.replace(/\s+/g, " ").trim().slice(0, 3000);
    out[item.id] = text;
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
    console.log(`[OK] ${item.id} ${item.title} (${text.length} chars)`);
  } catch (e) {
    console.log(`[FAIL] ${item.id} ${item.title}: ${e.message}`);
  }
}

console.log("Saved to data/excerpts.json");
