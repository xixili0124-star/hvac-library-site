// 폴더를 스캔해 자료 메타데이터를 추출해 data/catalog.raw.json 으로 저장
// (OneDrive 클라우드 전용 파일은 본문을 읽을 수 없으므로 파일명/크기 등 메타데이터만 사용)
// 사용법: node scripts/scan-folder.mjs "F:\OneDrive - 세익엠이씨\이석희 개인자료\자료\1 Mech HVAC 관련" "1 Mech HVAC 관련"

import fs from "fs";
import path from "path";

const ROOT = process.argv[2];
const CATEGORY_LABEL = process.argv[3] || path.basename(ROOT);
const OUT_FILE = path.join(process.cwd(), "data", "catalog.raw.json");

if (!ROOT) {
  console.error("사용법: node scan-folder.mjs <스캔할 폴더 경로> [카테고리 라벨]");
  process.exit(1);
}

const isPdf = (name) => name.toLowerCase().endsWith(".pdf");

function listEntries(dir) {
  return fs.readdirSync(dir, { withFileTypes: true });
}

// 디렉터리 하위(재귀)의 모든 PDF 파일 경로 목록
function collectPdfs(dir) {
  let out = [];
  for (const entry of listEntries(dir)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out = out.concat(collectPdfs(full));
    } else if (entry.isFile() && isPdf(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function cleanTitle(name) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sumSize(files) {
  return files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
}

const results = [];

function processDir(dir, category) {
  const entries = listEntries(dir);
  const subdirs = entries.filter((e) => e.isDirectory());
  const directPdfs = entries.filter((e) => e.isFile() && isPdf(e.name));

  const total = collectPdfs(dir).length;
  const hasSignificantSubdir = subdirs.some(
    (d) => collectPdfs(path.join(dir, d.name)).length >= 3
  );

  if (total >= 3 && !hasSignificantSubdir) {
    // 전체 폴더를 하나의 자료(책)로 취급
    const allPdfs = collectPdfs(dir);
    console.log(`[BOOK] ${path.basename(dir)} (${allPdfs.length} files)`);
    results.push({
      id: results.length + 1,
      title: cleanTitle(path.basename(dir)),
      type: "folder",
      category,
      relativePath: path.relative(process.cwd(), dir),
      fileCount: allPdfs.length,
      sizeBytes: sumSize(allPdfs),
      oneDriveUrl: "",
      summary_ko: "",
      keywords_ko: [],
      keywords_en: [],
    });
    return;
  }

  for (const e of directPdfs) {
    const full = path.join(dir, e.name);
    console.log(`[PDF]  ${e.name}`);
    results.push({
      id: results.length + 1,
      title: cleanTitle(e.name),
      type: "pdf",
      category,
      relativePath: path.relative(process.cwd(), full),
      fileCount: 1,
      sizeBytes: fs.statSync(full).size,
      oneDriveUrl: "",
      summary_ko: "",
      keywords_ko: [],
      keywords_en: [],
    });
  }

  for (const d of subdirs) {
    const full = path.join(dir, d.name);
    if (collectPdfs(full).length === 0) continue; // PDF가 없는 폴더는 스킵
    processDir(full, `${category} > ${d.name}`);
  }
}

processDir(ROOT, CATEGORY_LABEL);

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), "utf-8");
console.log(`\n총 ${results.length}개 자료를 ${OUT_FILE} 에 저장했습니다.`);
