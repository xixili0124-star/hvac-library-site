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

1. 새 폴더 스캔:
   ```
   node scripts/scan-folder.mjs "F:\OneDrive - 세익엠이씨\이석희 개인자료\자료\<폴더명>" "<카테고리명>"
   ```
   → `data/catalog.raw.json`에 새 폴더의 자료 목록이 생성됩니다 (덮어쓰기되므로,
   기존 자료를 유지하려면 결과를 기존 `catalog.json`과 병합해야 합니다)

2. `scripts/summaries.mjs`에 새 id에 대한 한글 요약(`summary_ko`)과 키워드
   (`keywords_ko`, `keywords_en`)를 추가

3. ```
   node scripts/build-catalog.mjs
   ```
   → `data/catalog.json` 갱신

4. (선택) 각 자료의 `oneDriveUrl` 필드에 OneDrive 공유 링크를 채워 넣으면
   "원본 열기" 버튼이 활성화됩니다

5. ```
   git add .
   git commit -m "Add <폴더명> 자료"
   git push
   ```
   → Cloudflare Pages가 자동으로 재배포합니다

## 폴더 구조

```
library-site/
  index.html          # 검색 페이지
  assets/style.css    # 스타일
  assets/app.js       # 검색 로직 (Fuse.js)
  data/catalog.json   # 자료 목록 (제목, 카테고리, 요약, 키워드, OneDrive 링크)
  scripts/
    scan-folder.mjs    # 폴더 스캔 → catalog.raw.json
    summaries.mjs      # id별 한글 요약/키워드
    build-catalog.mjs  # raw + summaries → catalog.json
```
