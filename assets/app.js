const RESULTS_EL = document.getElementById("results");
const SEARCH_EL = document.getElementById("search-input");
const COUNT_EL = document.getElementById("result-count");
const TOTAL_EL = document.getElementById("total-count");

const formatSize = (bytes) => {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)}GB`;
  return `${mb.toFixed(1)}MB`;
};

const renderCard = (item) => {
  const keywords = [...(item.keywords_ko || []), ...(item.keywords_en || [])];
  const linkHtml = item.oneDriveUrl
    ? `<a class="card-link" href="${item.oneDriveUrl}" target="_blank" rel="noopener">원본 열기 →</a>`
    : `<span class="card-link disabled">원본 링크 준비중</span>`;

  return `
    <article class="card">
      <span class="card-category">${item.category}</span>
      <h2 class="card-title">${item.title}</h2>
      <p class="card-summary">${item.summary_ko || "(요약 준비중)"}</p>
      <div class="card-meta">${item.type === "folder" ? `${item.fileCount}개 파일 · ` : ""}${formatSize(item.sizeBytes)}</div>
      <div class="keywords">${keywords.map((k) => `<span class="keyword">${k}</span>`).join("")}</div>
      ${linkHtml}
    </article>
  `;
};

const renderResults = (items) => {
  if (items.length === 0) {
    RESULTS_EL.innerHTML = `<div class="empty">검색 결과가 없습니다.</div>`;
    COUNT_EL.textContent = "";
    return;
  }
  RESULTS_EL.innerHTML = items.map(renderCard).join("");
  COUNT_EL.textContent = `${items.length}개 결과`;
};

fetch("data/catalog.json")
  .then((res) => res.json())
  .then((catalog) => {
    TOTAL_EL.textContent = catalog.length;

    const fuse = new Fuse(catalog, {
      keys: [
        { name: "title", weight: 0.3 },
        { name: "summary_ko", weight: 0.3 },
        { name: "keywords_ko", weight: 0.25 },
        { name: "keywords_en", weight: 0.1 },
        { name: "category", weight: 0.05 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
    });

    renderResults(catalog);
    COUNT_EL.textContent = "";

    SEARCH_EL.addEventListener("input", (e) => {
      const query = e.target.value.trim();
      if (!query) {
        renderResults(catalog);
        COUNT_EL.textContent = "";
        return;
      }
      const found = fuse.search(query).map((r) => r.item);
      renderResults(found);
    });
  })
  .catch((err) => {
    RESULTS_EL.innerHTML = `<div class="empty">자료를 불러오지 못했습니다: ${err.message}</div>`;
  });
