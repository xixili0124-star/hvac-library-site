# 기술자료 검색 사이트

엔지니어링 PDF 자료(현재 시범: "1 Mech HVAC 관련" 폴더, 52개 자료)를 한글/영문으로
검색할 수 있는 정적 사이트입니다. 원본 파일은 OneDrive에 그대로 두고, 이 사이트는
제목/카테고리/한글 요약/키워드만 보여주며 "원본 열기" 링크로 OneDrive로 연결합니다.

## 로컬에서 확인하기

```
npx serve .
```

브라우저에서 안내된 주소(예: http://localhost:3000)로 접속해 검색창에 한글/영문
키워드(예: "펌프", "배관", "refrigeration")를 입력해 보세요.

## 배포 절차 (무료: GitHub + Cloudflare Pages + Cloudflare Access)

### 1) GitHub 저장소 생성 & Push

1. https://github.com/new 에서 새 저장소 생성 (Public 또는 Private 모두 가능 -
   접근 제한은 Cloudflare Access에서 처리하므로 Private이 아니어도 됩니다)
2. 이 폴더에서:
   ```
   git init
   git add .
   git commit -m "Initial library search site"
   git remote add origin https://github.com/<your-id>/<repo-name>.git
   git branch -M main
   git push -u origin main
   ```

### 2) Cloudflare Pages 연결

1. https://dash.cloudflare.com → "Workers & Pages" → "Create" → "Pages" → "Connect to Git"
2. 위에서 만든 GitHub 저장소 선택
3. 빌드 설정: **Framework preset = None**, Build command = (비워둠), Build output
   directory = `/` (루트)
4. Save and Deploy → 배포 완료 후 `https://<프로젝트명>.pages.dev` 주소로 접속 가능

### 3) Cloudflare Access로 로그인(이메일 화이트리스트) 설정

1. Cloudflare 대시보드 → "Zero Trust" → "Access" → "Applications" → "Add an application"
2. Application type: "Self-hosted" 선택
3. Application domain: 위에서 생성된 `<프로젝트명>.pages.dev` 도메인 입력
4. Policy 생성: Action = "Allow", Include 규칙에 허용할 이메일 주소(또는 이메일 도메인)를
   추가 → 해당 이메일로만 로그인 코드(One-time PIN)를 받아 접속 가능
5. 저장하면 사이트 접속 시 이메일 인증 화면이 먼저 표시됩니다

## 자료 업데이트 / 폴더 추가 방법

1. 새 폴더 스캔 (임시 id 1부터 시작하는 `data/catalog.raw.json` 생성):
   ```
   node scripts/scan-folder.mjs "F:\OneDrive - 세익엠이씨\이석희 개인자료\자료\<폴더명>" "<카테고리명>"
   ```

2. (선택) 본문 일부를 추출해 더 정확한 요약을 작성하고 싶을 때:
   ```
   node -e "..."   # data/download-list.json 생성 (raw.json의 각 항목 대표 PDF 경로)
   node scripts/extract-text.mjs
   ```
   → `data/excerpts.json`에 각 항목의 앞부분 텍스트(최대 3000자)가 저장됩니다.
   OneDrive 동기화 클라이언트가 실행 중이면 클라우드 전용(미동기화) 파일도
   읽을 때 자동으로 다운로드됩니다 (30MB 초과 파일은 건너뜀).

3. `scripts/summaries-<폴더명>.mjs` 같은 새 파일을 만들어, raw.json의 임시 id별로
   한글 요약(`summary_ko`)과 키워드(`keywords_ko`, `keywords_en`)를 작성
   (요약은 `data/excerpts.json`의 발췌문 또는 책 제목 기반 지식을 참고)

4. ```
   node scripts/add-folder.mjs scripts/summaries-<폴더명>.mjs
   ```
   → `data/catalog.raw.json`의 항목들을 기존 `data/catalog.json`에 이어지는 id로
   추가합니다 (기존 자료는 유지됨)

5. OneDrive 공유 링크 생성 (새로 추가된 항목만 대상으로 자동 처리):
   ```
   Connect-MgGraph -Scopes "Files.ReadWrite"
   .\scripts\create-onedrive-links.ps1
   ```
   → "조직 내 사용자만" 권한으로 공유 링크 생성, `data/onedrive-links.json`에
   id별 링크가 저장됩니다. `catalog.json`을 직접 덮어쓰지 못하면(파일 잠김 등)
   아래로 병합:
   ```
   node -e "
   const fs = require('fs');
   const strip = (s) => s.replace(/^﻿/, '');
   const catalog = JSON.parse(strip(fs.readFileSync('data/catalog.json','utf-8')));
   const links = JSON.parse(strip(fs.readFileSync('data/onedrive-links.json','utf-8')));
   for (const item of catalog) {
     const url = links[String(item.id)];
     if (url && !item.oneDriveUrl) item.oneDriveUrl = url;
   }
   fs.writeFileSync('data/catalog.json', JSON.stringify(catalog, null, 2), 'utf-8');
   "
   ```

6. 임시 파일 정리 후 커밋/푸시:
   ```
   rm data/catalog.raw.json data/download-list.json data/excerpts.json data/onedrive-links.json
   git add .
   git commit -m "Add <폴더명> 자료"
   git push
   ```
   → Cloudflare Pages가 자동으로 재배포합니다

## 폴더 구조

```
library-site/
  index.html             # 검색 페이지
  assets/style.css       # 스타일
  assets/app.js          # 검색 로직 (Fuse.js)
  data/catalog.json       # 자료 목록 (제목, 카테고리, 요약, 키워드, OneDrive 링크)
  scripts/
    scan-folder.mjs        # 폴더 스캔 → catalog.raw.json (임시 id 1부터)
    extract-text.mjs        # 대표 PDF 텍스트 발췌 → excerpts.json
    summaries-*.mjs          # 폴더별 id 한글 요약/키워드
    add-folder.mjs           # raw.json + summaries → catalog.json에 이어붙이기
    create-onedrive-links.ps1 # OneDrive 공유 링크 생성 (Microsoft Graph)
    build-catalog.mjs        # (구) raw + summaries.mjs → catalog.json 전체 재생성
```
