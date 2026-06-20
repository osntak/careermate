# i18n 구현 계획 — Phase 0(인프라) + Phase 1(랜딩 /en)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 다국어 기반(로케일 계약 + `t()` 레이어 + 키 패리티 가드)을 세우고, 위험 낮은 영어 랜딩(`/en/`)을 SEO 정확하게 출시한다.

**Architecture:** 코드가 아니라 계약을 공유한다 — 저장 키 `localStorage['careermate-lang']`, 감지 규칙 `ko*→ko / else→en`, `<html lang>`=활성 로케일. 대시보드는 라이브러리 없는 ~35줄 `i18n.js`(`t()`+`Intl.PluralRules`), 랜딩은 정적 `/en/` 서브패스 + 상호 hreflang. 설계 전문: [`I18N_DESIGN.md`](./I18N_DESIGN.md).

**Tech Stack:** 바닐라 ESM(번들러 없음), 정적 HTML/CSS/JS, Vercel(`cleanUrls`), Node ≥22.5, 테스트는 `scripts/run.mjs` 검증 스크립트 패턴.

**테스트 관례(중요):** 이 repo엔 jest/vitest가 없다. 검증 스크립트는 표준출력에 `XXX_VERDICT PASS`를 찍고, `node --no-warnings scripts/run.mjs <script> "XXX_VERDICT PASS"`로 실행한다(`run.mjs`가 Windows tsx 종료코드 오염을 우회). 순수 노드 가드(`check-i18n-keys.mjs`)는 실패 시 `process.exit(1)`.

---

## 파일 구조 (Phase 0–1에서 생성/수정)

**생성**
- `apps/web/public/i18n.js` — 리졸버: `detect/getLang/setLang/onLangChange/t`. lib.js에 **의존하지 않음**(순환 방지).
- `apps/web/public/i18n/ko.js`, `apps/web/public/i18n/en.js` — 플랫 점표기 카탈로그(`export default {…}`).
- `scripts/check-i18n-keys.mjs` — 카탈로그 키 패리티 + 복수범주 가드(CI/`npm test`).
- `scripts/test-i18n.ts` — `i18n.js`의 `t()`/보간/복수/폴백 단위 검증(verdict 패턴).
- `site/en/index.html`, `site/en/start.html` — 영어 랜딩(정적 복사본 + 영어 카피).
- `site/og-en.png` — 영어 OG 이미지(`gen-og.mjs --locale en` 산출).

**수정**
- `apps/web/public/index.html` — 사전 페인트 lang 인라인 스크립트 추가(테마 스크립트 미러).
- `apps/web/public/pages/settings.js` — `LanguageSwitcher`(Theme 클론) 추가(일단 ko만 채워도 동작).
- `site/index.html`, `site/start.html` — hreflang/og:locale:alternate 추가, **start.html 자기 canonical 선결 수정**.
- `site/landing.js` — `scenes[]`·복사문구 로케일 룩업 + 1회 영어 배너.
- `site/sitemap.xml` — `xmlns:xhtml` + ko/en 상호 대안.
- `scripts/gen-og.mjs` — `--locale en` 파라미터화.
- `package.json` — `test`에 `check-i18n-keys` 추가, `gen:og:en` 스크립트(선택).

---

## ⚠️ Task 0: 착수 전 SEO 플랫폼 검증 (블로커 — 코드 작성 전 반드시)

설계가 "vercel.json 변경 불필요"를 가정한다. 검증 없이 hreflang/canonical을 박으면 리다이렉트 타깃이 깨질 수 있다.

**Files:** (임시) `site/en/index.html`, `site/en/start.html` — 검증용 placeholder, 검증 후 Task 9에서 실제 내용으로 교체.

- [ ] **Step 1: Vercel 프로젝트 Root Directory 확인**

Vercel 대시보드 → CareerMate 프로젝트 → Settings → Build & Deployment → **Root Directory = `site`** 인지 확인.
`site/vercel.json`은 루트가 `site/`일 때만 적용된다. 루트가 repo면 `cleanUrls`가 꺼져 전 전략이 무효 → 이 경우 멈추고 사용자에게 보고.

- [ ] **Step 2: 검증용 임시 영어 페이지 2개 생성**

```bash
mkdir -p site/en
printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>en probe</title></head><body>en index probe</body></html>' > site/en/index.html
printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>en start probe</title></head><body>en start probe</body></html>' > site/en/start.html
```

- [ ] **Step 3: 프리뷰 배포**

```bash
npx vercel deploy --prebuilt=false 2>/dev/null || npx vercel
```
(또는 브랜치 푸시로 프리뷰 자동 생성.) 배포 URL을 `$PREVIEW`로 둔다.

- [ ] **Step 4: 4개 URL 형태가 단일 200(리다이렉트 없음)인지 확인**

```bash
for u in /en /en/ /en/start /en/start/; do
  echo -n "$u -> "; curl -s -o /dev/null -w '%{http_code} redirect=%{redirect_url}\n' "$PREVIEW$u"
done
```
Expected: `/en` 과 `/en/start` 가 **200, redirect 비어있음**. `/en/`·`/en/start/`가 308로 슬래시 없는 형태로 보내면 → **canonical 형태 = 슬래시 없는 `/en`, `/en/start`** 로 확정. 만약 `/en`이 308→`/en/`이면 그 반대로 확정.

- [ ] **Step 5: 확정된 canonical 형태를 문서에 기록**

`I18N_DESIGN.md` §4-1 체크리스트에 실제 200 형태를 적는다(이후 모든 canonical/og:url/hreflang/sitemap/토글 href가 이 형태를 바이트 단위로 따른다).

- [ ] **Step 6: Commit (임시 파일은 Task 9에서 대체되므로 커밋하지 않거나 wip)**

```bash
git stash  # 임시 probe 파일 보관, Task 9에서 실제 내용으로 교체
```

---

## Task 1: 카탈로그 + 리졸버 `i18n.js`

**Files:**
- Create: `apps/web/public/i18n.js`
- Create: `apps/web/public/i18n/ko.js`, `apps/web/public/i18n/en.js`

- [ ] **Step 1: 빈-시드 카탈로그 2개 생성(공통 키 1개로 패리티 가드가 동작하도록)**

`apps/web/public/i18n/ko.js`:
```js
// 한국어 카탈로그 — 플랫 점표기 키. ko엔 복수 객체 금지(CLDR 'other'만).
export default {
  'common.cancel': '취소',
  'common.confirm': '확인',
  'common.close': '닫기',
};
```

`apps/web/public/i18n/en.js`:
```js
// English catalog — flat dotted keys. Count nouns use { one, other } objects.
export default {
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',
};
```

- [ ] **Step 2: `i18n.js` 작성 (설계 §4-2 그대로)**

```js
// apps/web/public/i18n.js
// 로케일 리졸버 + t(). lib.js에 의존하지 않는다(순환 방지: lib.js가 i18n.js를 import).
import ko from '/i18n/ko.js';
import en from '/i18n/en.js';

const CATALOGS = { ko, en };
const FALLBACK = 'ko';
export const LOCALES = Object.keys(CATALOGS); // ['ko','en'] — 3번째 = import 1줄 + 맵 1줄

function detect() {
  try {
    const s = localStorage.getItem('careermate-lang');
    if (s && CATALOGS[s]) return s;
  } catch (e) { /* private mode */ }
  return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

let lang = detect();
const subs = new Set();

export const getLang = () => lang;

export function setLang(next) {
  if (!CATALOGS[next] || next === lang) return;
  lang = next;
  try { localStorage.setItem('careermate-lang', next); } catch (e) {}
  document.documentElement.lang = next;
  subs.forEach((fn) => fn(lang));
}

export function onLangChange(fn) { subs.add(fn); return () => subs.delete(fn); }

const _pr = {};
const pr = (l) => (_pr[l] ||= new Intl.PluralRules(l));

export function t(key, vars) {
  let m = CATALOGS[lang]?.[key] ?? CATALOGS[FALLBACK]?.[key] ?? key;
  if (vars && typeof m === 'object') m = m[pr(lang).select(vars.count)] ?? m.other ?? key;
  return vars ? String(m).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? `{{${k}}}`)) : m;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/i18n.js apps/web/public/i18n/ko.js apps/web/public/i18n/en.js
git commit -m "feat(i18n): add locale resolver + empty catalogs (ko/en)"
```

---

## Task 2: `i18n.js` 단위 검증 스크립트

**Files:**
- Create: `scripts/test-i18n.ts`

- [ ] **Step 1: 실패하는 검증 작성 (브라우저 전역 stub 후 동적 import)**

```ts
// scripts/test-i18n.ts — i18n.js의 t()/보간/복수/폴백을 노드에서 검증.
// 브라우저 전역을 최소 stub 한 뒤 ESM 파일을 직접 import.
const g = globalThis as any;
g.localStorage = { _v: {} as Record<string, string>, getItem(k: string) { return this._v[k] ?? null; }, setItem(k: string, v: string) { this._v[k] = v; }, removeItem(k: string) { delete this._v[k]; } };
g.navigator = { language: 'en-US' };
g.document = { documentElement: { lang: 'en' } };

// i18n.js는 '/i18n/ko.js' 같은 절대 경로 import라 노드가 못 푼다 → file URL로 직접 평가.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const PUB = path.resolve('apps/web/public');
// 절대 import를 상대 file URL로 치환해 메모리에서 평가.
function loadModule(rel: string): Promise<any> {
  const file = path.join(PUB, rel);
  let src = readFileSync(file, 'utf8').replace(/from '\/i18n\//g, `from '${pathToFileURL(path.join(PUB, 'i18n')).href}/`);
  const data = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
  return import(data);
}

const i18n = await loadModule('i18n.js');
let pass = true;
const check = (name: string, cond: boolean) => { if (!cond) { pass = false; console.error('FAIL:', name); } };

i18n.setLang('en');
check('en lookup', i18n.t('common.cancel') === 'Cancel');
check('missing key falls back to key', i18n.t('nope.key') === 'nope.key');
check('interpolation', i18n.t('common.cancel', { x: 1 }) === 'Cancel'); // no {{}} in value → unchanged
i18n.setLang('ko');
check('ko lookup', i18n.t('common.cancel') === '취소');

console.log(pass ? 'I18N_VERDICT PASS' : 'I18N_VERDICT FAIL');
```

- [ ] **Step 2: 실행해 PASS 확인**

Run: `node --no-warnings scripts/run.mjs scripts/test-i18n.ts "I18N_VERDICT PASS"`
Expected: 출력에 `I18N_VERDICT PASS`, 종료코드 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-i18n.ts
git commit -m "test(i18n): unit-check t()/interpolation/fallback/locale switch"
```

---

## Task 3: 키 패리티 가드 `check-i18n-keys.mjs`

**Files:**
- Create: `scripts/check-i18n-keys.mjs`
- Modify: `package.json:69` (`test` 스크립트에 가드 추가)

- [ ] **Step 1: 가드 스크립트 작성**

```js
// scripts/check-i18n-keys.mjs — 모든 카탈로그가 동일 키 집합을 갖는지, en 복수 객체가
// Intl.PluralRules('en') 범주를 모두 갖는지 검사. 실패 시 exit(1).
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DIR = path.resolve('apps/web/public/i18n');
const LOCALES = ['ko', 'en'];

async function loadCatalog(loc) {
  const mod = await import(pathToFileURL(path.join(DIR, `${loc}.js`)).href);
  return mod.default;
}

const cats = Object.fromEntries(await Promise.all(LOCALES.map(async (l) => [l, await loadCatalog(l)])));
const allKeys = new Set(LOCALES.flatMap((l) => Object.keys(cats[l])));

const errors = [];
for (const key of allKeys) {
  for (const loc of LOCALES) {
    if (!(key in cats[loc])) errors.push(`[missing] ${loc}.js lacks "${key}"`);
  }
}

// en 복수 객체 범주 검사
const enCats = new Intl.PluralRules('en').resolvedOptions().pluralCategories; // ['one','other']
for (const [key, val] of Object.entries(cats.en)) {
  if (val && typeof val === 'object') {
    for (const cat of enCats) {
      if (!(cat in val)) errors.push(`[plural] en.js "${key}" missing category "${cat}"`);
    }
  }
}
// ko엔 복수 객체가 있으면 안 됨
for (const [key, val] of Object.entries(cats.ko)) {
  if (val && typeof val === 'object') errors.push(`[plural] ko.js "${key}" must be a string, not a plural object`);
}

if (errors.length) {
  console.error('i18n key check FAILED:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(`i18n key check OK — ${allKeys.size} keys across ${LOCALES.join('/')}`);
```

- [ ] **Step 2: 통과 확인**

Run: `node --no-warnings scripts/check-i18n-keys.mjs`
Expected: `i18n key check OK — 3 keys across ko/en`, 종료코드 0.

- [ ] **Step 3: 일부러 깨서 실패 확인**

`apps/web/public/i18n/en.js`에서 `'common.close': 'Close',` 줄을 잠시 지우고:
Run: `node --no-warnings scripts/check-i18n-keys.mjs; echo "exit=$?"`
Expected: `[missing] en.js lacks "common.close"` + `exit=1`. 확인 후 줄 복구.

- [ ] **Step 4: `package.json` test에 연결**

`package.json:69` 의 `test`를 다음으로 수정(맨 앞에 가드 추가):
```json
"test": "node --no-warnings scripts/check-i18n-keys.mjs && node --no-warnings scripts/run.mjs scripts/test-i18n.ts \"I18N_VERDICT PASS\" && node --no-warnings scripts/run.mjs scripts/test-init.ts \"INIT_TEST_VERDICT PASS\" && node --no-warnings scripts/run.mjs scripts/test-bridge.ts \"BRIDGE_TEST_VERDICT PASS\" && node --no-warnings scripts/run.mjs scripts/test.ts \"TEST_VERDICT PASS\"",
```

- [ ] **Step 5: 전체 test 통과 확인 + Commit**

Run: `npm test 2>&1 | tail -20`
Expected: 모든 VERDICT PASS, i18n key check OK.
```bash
git add scripts/check-i18n-keys.mjs package.json
git commit -m "test(i18n): add catalog key-parity + plural-category guard to npm test"
```

---

## Task 4: 대시보드 사전 페인트 lang 스크립트

**Files:**
- Modify: `apps/web/public/index.html:7-14` (기존 테마 사전 페인트 스크립트 옆)

- [ ] **Step 1: 기존 테마 스크립트 아래에 lang 리졸버 추가**

`apps/web/public/index.html`의 `<head>` 사전 페인트 `<script>` 블록(테마 해석) **바로 다음**에:
```html
<script>
  // 첫 페인트 전에 저장된 로케일을 <html lang>에 반영(FOUC 방지). i18n.js와 동일 규칙.
  (function () {
    try {
      var s = localStorage.getItem('careermate-lang');
      var lang = (s === 'ko' || s === 'en') ? s
        : ((navigator.language || '').toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en');
      document.documentElement.lang = lang;
    } catch (e) { document.documentElement.lang = 'ko'; }
  })();
</script>
```
(주의: 이 스크립트는 정적 HTML의 `lang` 속성을 동적으로 바꾸지만, **대시보드는 단일 URL이 양 로케일을 서빙**하므로 정적 사이트와 달리 허용된다. 설계 §4-1 참고 — 정적 랜딩은 절대 lang을 런타임 변경하지 않음.)

- [ ] **Step 2: 수동 확인**

Run: `npm run dev` 후 브라우저 콘솔에서 `localStorage.setItem('careermate-lang','en'); location.reload();` → `document.documentElement.lang === 'en'` 확인.

- [ ] **Step 3: Commit**

```bash
git add apps/web/public/index.html
git commit -m "feat(i18n): pre-paint <html lang> resolver on dashboard shell"
```

---

## Task 5: 언어 스위처 컴포넌트 (Theme 클론)

**Files:**
- Modify: `apps/web/public/pages/settings.js` (Theme 함수 아래에 `LanguageSwitcher` 추가, `render`에 mount)

- [ ] **Step 1: import에 i18n 추가**

`settings.js` 상단 import 블록 끝에:
```js
import { getLang, setLang, onLangChange } from '/i18n.js';
```

- [ ] **Step 2: Theme() 함수 바로 아래에 LanguageSwitcher 추가**

```js
/* ------------------------------------------------------------- 언어 */
function LanguageSwitcher() {
  const options = [
    { value: 'ko', label: '한국어' },
    { value: 'en', label: 'English' },
  ];
  const row = el('div', { class: 'flex gap-2 wrap' });

  function paint() {
    const active = getLang();
    mount(row, ...options.map((o) => {
      const b = Btn(o.label, { variant: 'ghost', onClick: () => setLang(o.value) });
      b.setAttribute('aria-pressed', String(o.value === active));
      if (o.value === active) b.classList.add('is-selected');
      return b;
    }));
  }
  paint();
  onLangChange(paint);

  return Card({
    title: '언어 / Language',
    sub: '대시보드 표시 언어',
    body: row,
  });
}
```

- [ ] **Step 3: render()의 stack에 추가 (Theme 다음 줄)**

`render(ctx)`의 `el('div', { class: 'stack-4' }, … Theme(), …)` 에서 `Theme(),` 다음에 `LanguageSwitcher(),` 삽입.

- [ ] **Step 4: 수동 확인**

`npm run dev` → 설정 페이지에 "언어 / Language" 카드가 보이고 한국어/English 버튼이 토글되며 `localStorage['careermate-lang']`가 바뀌는지 확인. (아직 페이지 텍스트는 안 바뀜 — Phase 2에서 배선.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/pages/settings.js
git commit -m "feat(i18n): add language switcher to settings (Theme-pattern clone)"
```

---

## Task 6: 기존 랜딩(ko) SEO 선결 수정

**Files:**
- Modify: `site/start.html:14-21` (canonical 추가)
- Modify: `site/index.html:29-30` (og:locale:alternate 추가)
- Modify: `site/start.html` `<head>` (og:locale + alternate, 현재 누락)

- [ ] **Step 1: start.html 자기 canonical 추가 (기존 버그 수정)**

`site/start.html`의 `<link rel="icon" …>` 위에 (Task 0에서 확정한 형태 사용; 예시는 슬래시 없는 형태):
```html
<link rel="canonical" href="https://careermate.life/start" />
```

- [ ] **Step 2: index.html에 og:locale:alternate 추가**

`site/index.html:29` `<meta property="og:locale" content="ko_KR" />` 바로 아래:
```html
<meta property="og:locale:alternate" content="en_US" />
```

- [ ] **Step 3: hreflang 3종을 index.html과 start.html 양쪽에 추가**

`site/index.html` `<head>`(canonical 근처):
```html
<link rel="alternate" hreflang="ko" href="https://careermate.life/" />
<link rel="alternate" hreflang="en" href="https://careermate.life/en" />
<link rel="alternate" hreflang="x-default" href="https://careermate.life/" />
```
`site/start.html` `<head>`:
```html
<link rel="alternate" hreflang="ko" href="https://careermate.life/start" />
<link rel="alternate" hreflang="en" href="https://careermate.life/en/start" />
<link rel="alternate" hreflang="x-default" href="https://careermate.life/start" />
```

- [ ] **Step 4: Commit**

```bash
git add site/index.html site/start.html
git commit -m "fix(seo): add start.html canonical + reciprocal hreflang/og:locale:alternate on ko pages"
```

---

## Task 7: `gen-og.mjs` 영어 파라미터화 + `og-en.png`

**Files:**
- Modify: `scripts/gen-og.mjs` (카피 3블록 + 폰트 스택을 로케일 객체로)
- Create: `site/og-en.png` (생성 산출물, 커밋)

- [ ] **Step 1: gen-og.mjs의 한국어 카피를 로케일 객체로 추출**

`scripts/gen-og.mjs`에서 하드코딩된 헤드라인/서브/필 문자열을 찾아 상단에:
```js
const COPY = {
  ko: { headline: '내 AI를 나만의 커리어 비서로', sub1: '<원래 ko 1줄>', sub2: '<원래 ko 2줄>', pill: '로컬 전용 · MCP · 무료', font: "'Malgun Gothic','Apple SD Gothic Neo',sans-serif" },
  en: { headline: 'Turn your AI into your career assistant', sub1: 'Resumes, postings, cover letters, applications —', sub2: 'organized on your own computer.', pill: 'Local-only · MCP · Free', font: "'Segoe UI','Helvetica Neue',Arial,sans-serif" },
};
const locale = process.argv.includes('--locale') ? process.argv[process.argv.indexOf('--locale') + 1] : 'ko';
const c = COPY[locale] || COPY.ko;
const OUT = locale === 'en' ? 'site/og-en.png' : 'site/og.png';
```
그리고 템플릿 리터럴의 한국어 리터럴/폰트/출력 경로를 `c.headline`/`c.sub1`/`c.sub2`/`c.pill`/`c.font`/`OUT`으로 교체.
(원래 ko 카피 문자열은 기존 파일에서 그대로 옮겨 `COPY.ko`를 채운다 — 동작 동일 보장.)

- [ ] **Step 2: ko 회귀(동일 산출) 확인**

Run: `node scripts/gen-og.mjs` → `site/og.png` 가 기존과 동일 크기/모양인지 git diff로 확인(바이너리라 시각 확인).

- [ ] **Step 3: 영어 OG 생성**

Run: `node scripts/gen-og.mjs --locale en`
Expected: `site/og-en.png` 1200x630 생성. (Playwright/chromium 필요 — 없으면 `npx playwright install chromium`.)

- [ ] **Step 4: Commit**

```bash
git add scripts/gen-og.mjs site/og-en.png
git commit -m "feat(seo): parameterize gen-og by locale; add English og-en.png"
```

---

## Task 8: `landing.js` 로케일 룩업 + 1회 영어 배너

**Files:**
- Modify: `site/landing.js` (scenes/copy 로케일 분기 + 배너)

- [ ] **Step 1: 파일 상단에 로케일 해석 + 문자열 테이블**

`site/landing.js` IIFE 최상단(`'use strict';` 다음):
```js
// 정적 랜딩은 <html lang>을 파일별로 고정한다. 여기선 그 lang을 읽기만 하고 절대 바꾸지 않는다.
var LANG = document.documentElement.lang === 'en' ? 'en' : 'ko';
var STR = {
  ko: { copied: '복사됨', copiedStatus: '클립보드에 복사되었습니다.' },
  en: { copied: 'Copied', copiedStatus: 'Copied to clipboard.' },
};
var SCENES = {
  ko: [ /* 기존 한국어 scenes 배열 6개 그대로 이동 */ ],
  en: [
    { status: 'Add document', file: 'cover-letter.pdf', fileState: 'Uploaded', command: 'Read this cover letter and save it to CareerMate.', result: 'Saved it as a cover-letter version and pulled out 4 key experiences.' },
    { status: 'Career doc', file: 'resume.pdf', fileState: 'Source', command: 'Draft a career description from my resume.', result: 'Organized your experience and projects into a results-focused career doc. Flagged numbers that need a source.' },
    { status: 'Dashboard', file: '127.0.0.1:4319', fileState: 'Open', command: 'Open the dashboard — I want to see my applications.', result: 'Opened it. You have 2 drafts, 3 submitted, and 1 in interview prep.' },
    { status: 'Job analysis', file: 'recruit.example.com/product-designer', fileState: 'Link', command: 'Analyze this posting against my background.', result: 'Compared the requirements to your experience. Keywords to emphasize: collaboration, experimentation, measurable impact.' },
    { status: 'Cover draft', file: 'Product Designer · Acme', fileState: 'Posting', command: "Draft a cover letter for this role — keep it warm, not stiff.", result: 'Wrote a tailored draft and saved it as v1. The opener leads with your motivation.' },
    { status: 'Interview prep', file: 'Acme · Passed screening', fileState: 'Status change', command: 'I passed the screening. Prep me for this interview.', result: 'Prepared 12 likely questions, STAR answer outlines, and a 1-minute intro draft.' },
  ],
};
var scenes = SCENES[LANG];
```
그리고 기존 `var scenes = [ … ]` 정의를 위 `scenes = SCENES[LANG]`로 대체. 복사 핸들러의 `'복사됨'`/`'클립보드에…'`를 `STR[LANG].copied`/`STR[LANG].copiedStatus`로 교체.

- [ ] **Step 2: 1회성 영어 배너 (ko 페이지에서만)**

IIFE 안에 추가:
```js
// 저장된 선택 없음 ∧ 브라우저가 영어 선호 ∧ 현재 한국어 페이지일 때만 1회 배너.
(function () {
  if (LANG !== 'ko') return;
  var saved; try { saved = localStorage.getItem('careermate-lang'); } catch (e) {}
  if (saved) return;
  if ((navigator.language || '').toLowerCase().indexOf('ko') === 0) return;
  if (sessionStorage.getItem('cm-en-banner-dismissed')) return;
  var bar = document.createElement('div');
  bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Language');
  bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;gap:.75rem;justify-content:center;align-items:center;padding:.6rem 1rem;background:var(--surface,#1b1a16);border-top:1px solid var(--border,#333);font-size:.95rem';
  var msg = document.createElement('span'); msg.textContent = 'This site is also available in English.';
  var go = document.createElement('a'); go.href = '/en'; go.textContent = 'View in English →'; go.style.fontWeight = '650';
  go.addEventListener('click', function () { try { localStorage.setItem('careermate-lang', 'en'); } catch (e) {} });
  var x = document.createElement('button'); x.type = 'button'; x.textContent = '✕'; x.setAttribute('aria-label', 'Dismiss');
  x.style.cssText = 'background:none;border:0;cursor:pointer;color:inherit;font-size:1rem';
  x.addEventListener('click', function () { try { sessionStorage.setItem('cm-en-banner-dismissed', '1'); } catch (e) {} bar.remove(); });
  bar.appendChild(msg); bar.appendChild(go); bar.appendChild(x);
  document.body.appendChild(bar);
})();
```

- [ ] **Step 3: 수동 확인 (ko·en 둘 다)**

`site/`를 정적 서빙(`npx serve site` 등) 후: `/` 에서 영어 브라우저면 배너 노출·닫힘 1회성 확인; `/en`(Task 9 후) 에서 씬이 영어로 회전하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add site/landing.js
git commit -m "feat(i18n): locale-aware landing scenes/copy + one-time English banner"
```

---

## Task 9: 영어 랜딩 페이지 `site/en/index.html`

**Files:**
- Create: `site/en/index.html` (Task 0 임시본 대체)

- [ ] **Step 1: index.html을 복사하고 head를 영어 SEO로 교체**

`site/index.html`을 `site/en/index.html`로 복사한 뒤 `<head>`를 다음 원칙으로 수정(canonical 형태는 Task 0 확정값):
```html
<html lang="en" data-theme="dark">
<title>CareerMate — Organize your career by just talking to your AI</title>
<meta name="description" content="Tell an AI like Claude or Codex to register your resume, analyze postings, write cover letters, and track applications. CareerMate keeps the results on your own computer." />
<link rel="canonical" href="https://careermate.life/en" />
<link rel="alternate" hreflang="ko" href="https://careermate.life/" />
<link rel="alternate" hreflang="en" href="https://careermate.life/en" />
<link rel="alternate" hreflang="x-default" href="https://careermate.life/" />
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="ko_KR" />
<meta property="og:url" content="https://careermate.life/en" />
<meta property="og:title" content="CareerMate — Organize your career by just talking to your AI" />
<meta property="og:description" content="Keep your resume, cover letters, and applications on your own computer. Your AI does the analysis and writing; CareerMate stores the data." />
<meta property="og:image" content="https://careermate.life/og-en.png" />
<meta property="og:image:alt" content="CareerMate — a local-only, MCP career workspace" />
<meta name="twitter:title" content="CareerMate — Organize your career by just talking to your AI" />
<meta name="twitter:description" content="Resume, cover letters, applications — on your own computer. Your data never leaves." />
<meta name="twitter:image" content="https://careermate.life/og-en.png" />
```
(google-site-verification, theme-color, preload, analytics 등 나머지 head 요소는 그대로 유지.)

- [ ] **Step 2: 본문 문자열을 자연스러운 영어로 (한국어 의도 보존)**

§"영어 카피 데크"(이 문서 맨 끝)를 따라 nav·hero·how·features·preview(figcaption/alt)·install·privacy·footer를 교체. 모든 내부 링크는 `/en` 계열로:
- `href="start.html"` → `href="/en/start"`
- `href="#preview"`, `#install` 등 앵커는 그대로(같은 페이지)
- `href="demo/"` → `href="/demo/"` (데모는 1차에 ko 공용; Phase 4에서 `/en/demo`)
- 설치 `<pre>` 프롬프트의 `https://careermate.life/llms-install.txt`는 **그대로 유지**(번역 안 함). 둘러싼 안내 문장만 영어.
- nav에 KO/EN 토글 추가: `<a href="/" hreflang="ko">한국어</a>` (현재 EN 표시). 한국어 페이지(site/index.html)엔 대응으로 `<a href="/en" hreflang="en">English</a>` 추가(Task 6 후속 미세수정).

- [ ] **Step 3: 정적 서빙으로 시각 확인**

`/en` 에서 레이아웃·테마 토글·캐러셀·복사버튼(영어 "Copied")·씬 회전(영어)이 동작하는지.

- [ ] **Step 4: Commit**

```bash
git add site/en/index.html site/index.html
git commit -m "feat(i18n): English landing /en (natural localized copy + SEO head + nav toggle)"
```

---

## Task 10: 영어 위저드 `site/en/start.html`

**Files:**
- Create: `site/en/start.html`

- [ ] **Step 1: start.html 복사 + head 영어 SEO**

`site/start.html` → `site/en/start.html`. `<html lang="en">`, title `"New here? — Getting started with CareerMate"`, description 영어, **자기 canonical `https://careermate.life/en/start`**, hreflang 3종(ko→`/start`, en→`/en/start`, x-default→`/start`).

- [ ] **Step 2: 위저드 본문 영어화**

Q1/Q2, 3개 설치 경로(Claude/Codex/기타) × 단계, 도움말 아코디언을 자연스러운 영어로. 내부 링크 `index.html#…` → `/en#…`(또는 `/en/index.html#…` Task 0 형태). 설치 `<pre>`의 llms-install URL은 유지, 안내 문장만 영어. (위저드 인라인 JS는 사용자 문자열 없음 — 그대로.)

- [ ] **Step 3: 시각 확인 + Commit**

`/en/start`에서 라디오 선택 시 해당 경로가 영어로 표시되는지.
```bash
git add site/en/start.html
git commit -m "feat(i18n): English getting-started wizard /en/start"
```

---

## Task 11: `sitemap.xml` 상호 대안

**Files:**
- Modify: `site/sitemap.xml`

- [ ] **Step 1: xhtml 네임스페이스 + ko/en 블록(자기 포함 완전 집합)**

`/demo`·`/en/demo`는 **넣지 않는다**(데모 noindex). 각 url 블록에 ko·en·x-default를 **동일하게**:
```xml
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://careermate.life/</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="https://careermate.life/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://careermate.life/en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://careermate.life/" />
  </url>
  <url>
    <loc>https://careermate.life/en</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="https://careermate.life/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://careermate.life/en" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://careermate.life/" />
  </url>
  <url>
    <loc>https://careermate.life/start</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="https://careermate.life/start" />
    <xhtml:link rel="alternate" hreflang="en" href="https://careermate.life/en/start" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://careermate.life/start" />
  </url>
  <url>
    <loc>https://careermate.life/en/start</loc>
    <xhtml:link rel="alternate" hreflang="ko" href="https://careermate.life/start" />
    <xhtml:link rel="alternate" hreflang="en" href="https://careermate.life/en/start" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://careermate.life/start" />
  </url>
</urlset>
```

- [ ] **Step 2: 데모 noindex (sitemap에서 제거했으므로 메타로 차단)**

`scripts/build-demo.mjs`의 `injectDemo()`가 데모 index에 `<meta name="robots" content="noindex,follow">`를 주입하도록 (Phase 4에서 본격화하되, 지금 sitemap에서 빼는 것과 짝을 맞춰 최소 주입). robots.txt엔 `Disallow` 추가 금지.

- [ ] **Step 3: 검증 + Commit**

배포 프리뷰에서 sitemap의 4개 loc 전부 `curl -sI` 200·redirect 없음. 구글 Rich Results / hreflang 검증기로 상호성 확인.
```bash
git add site/sitemap.xml scripts/build-demo.mjs
git commit -m "feat(seo): sitemap xhtml alternates for ko/en; keep demo out (noindex)"
```

---

## Task 12: Phase 1 종단 검증

- [ ] **Step 1: 전체 test 통과**

Run: `npm test 2>&1 | tail -20` → 모든 VERDICT PASS + i18n key check OK.

- [ ] **Step 2: SEO 정적 검증**

배포 프리뷰에서:
```bash
for u in / /en /start /en/start; do echo -n "$u "; curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$PREVIEW$u"; done
```
모두 200·redirect 없음. 각 페이지 `view-source`로 canonical/hreflang/og:locale 상호성 육안 확인.

- [ ] **Step 3: 기능 확인**

`/en` 영어 카피·씬 회전·복사버튼; `/` 영어 브라우저에서 1회 배너; nav 토글이 같은 페이지로 딥링크(`/`↔`/en`, `/start`↔`/en/start`).

- [ ] **Step 4: 최종 커밋/푸시 (사용자 승인 후)**

```bash
git log --oneline -12
```

---

## 영어 카피 데크 (index.html 본문 — 한국어 의도 보존, 자연스러운 영어)

> 실행 시 Task 9 Step 2에서 이 매핑대로 교체. 직역 아님 — 한국어의 구어체·정서를 살린 마케팅 영어.

| 위치 | 한국어(원본) | English |
| --- | --- | --- |
| skip-link | 본문으로 건너뛰기 | Skip to content |
| nav | 사용 예시 / 할 수 있는 일 / 화면 / 설치 / 개인정보 | How it works / What it does / Screens / Install / Privacy |
| pill | 로컬 전용 · 가입 없음 | Local-only · No sign-up |
| hero h1 | AI에게 말하면 / 커리어가 정리됩니다 | Just talk to your AI — / your career organizes itself |
| hero lede | 이력서, 공고, 자기소개서, 지원 현황까지. 말하면 내 컴퓨터에 저장됩니다. | Resumes, postings, cover letters, applications — say the word and it's saved on your own computer. |
| trust | 내 컴퓨터에만 저장 / 외부 업로드 없음 / 별도 가입 없음 | Stored only on your computer / Nothing uploaded / No account needed |
| CTA | 처음 시작하기 / 데모 보기 | Get started / See the demo |
| hero note | 명령어를 외우지 않아도 됩니다. 그냥 이렇게 말하면 돼요. | No commands to memorize. Just say it like this. |
| how h2 | AI에게 시키고, CareerMate에서 확인하세요 | Tell your AI; review it in CareerMate |
| how lede | 어려운 설정 이름을 기억할 필요 없이, 평소 대화하듯 커리어 작업을 이어가면 됩니다. | No settings to memorize — just keep working on your career the way you'd chat. |
| how 01 | 파일을 주고 말하기 / 이력서나 자기소개서를 올리고 "읽고 등록해줘"라고 말하세요. | Hand over a file / Upload a resume or cover letter and say "read this and save it." |
| how 02 | 공고를 붙이고 분석 / 채용공고 링크나 텍스트를 주면 내 경력과 맞춰 강점·보완점을 정리합니다. | Paste a posting / Drop a job link or text and it lines up your strengths and gaps against the role. |
| how 03 | 대시보드에서 확인 / 자소서 버전, 지원 상태, 면접 준비 자료가 한 곳에 모입니다. | Check the dashboard / Cover-letter versions, application status, and interview prep in one place. |
| features h2 | 말로 시킬 수 있는 일 | What you can ask for |
| features lede | 처음 정리한 경력은 다음 공고와 다음 자기소개서에도 계속 이어집니다. | Organize your background once; it carries into every next posting and cover letter. |
| features (6 checks) | 이력서·경력기술서·자기소개서 등록 / 채용공고 저장 / 내 경력과 공고 비교 / 공고별 자기소개서 / 지원 현황 관리 / 면접 준비 | Register resumes, career docs & cover letters / Save job postings / Match your background to a posting / Per-posting cover letters / Track applications / Interview prep (+ 각 span 설명 자연 영어) |
| preview h2 | 내 데이터를 눈으로 확인 | See your data for yourself |
| preview lede | 지원 현황과 문서를 한 화면에서 확인하세요. | Applications and documents on one screen. |
| preview CTA | 데모 둘러보기 → | Explore the demo → |
| preview figcaptions | 홈 / 지원 현황 / 채용공고 / 문서 / 면접 준비 / 설정 (+ 부제) | Home / Applications / Postings / Documents / Interview prep / Settings (+ subcaptions) |
| install h2 | 설치는 세 단계면 충분합니다 | Three steps and you're set |
| install lede | 앱을 열고, 아래 문장을 붙여넣고, 연결됐는지만 확인하세요. | Open your app, paste the line below, and confirm it connected. |
| install steps | AI 앱 선택 / 프롬프트 붙여넣기 / 연결 확인 (+ 본문) | Pick your AI app / Paste the prompt / Confirm the connection (+ bodies) |
| install labels | AI에게 보낼 문장 / 터미널 명령어 | Paste this to your AI / Terminal command |
| install footnote | 웹·모바일 AI 앱은 내 컴퓨터의 로컬 도구를 직접 열 수 없어 연결 대상이 아닙니다. | Web and mobile AI apps can't reach local tools on your computer, so they aren't supported. |
| privacy h2 | 당신의 데이터는 당신 컴퓨터를 떠나지 않습니다 | Your data never leaves your computer |
| privacy body | (서버 127.0.0.1 바인딩, 최신 버전 확인만 외부, …) | (The dashboard binds to 127.0.0.1; only an optional update check goes out; your career data is never sent. Your chosen AI does the analysis and writing.) |
| privacy list | 저장 위치 / 내보내기 / 삭제·관리 | Storage / Export / Delete & manage |
| footer | 로컬에서 동작하는 MCP 기반 커리어 관리 도구. 모든 데이터는 이 컴퓨터에만 저장됩니다. / 맨 위로·기능·설치 | A local, MCP-based career workspace. All data stays on this computer. / Top · Features · Install |

> `start.html` 카피 데크는 Task 10 실행 시 동일 형식으로 작성(밀도가 높아 페이지를 열고 섹션별로 진행). 트리키한 문자열(설치 프롬프트 `<pre>`)은 번역하지 않고 유지.

---

## 이후 계획(별도 문서로 작성)

- **`I18N_PLAN_phase2-3.md`** — 대시보드 셸+lib.js+위험요소(게이트 버그, Intl, `clearMeta`) → 7개 페이지(3a: profile/jobs/documents, 3b: home/interview/applications). enum 라벨 클라 현지화 배선. 카탈로그 대량 채움.
- **`I18N_PLAN_phase4.md`** — 데모: `demo-shim.js` 로케일 인식, `build-demo.mjs` 접두사 파라미터화+title 마커+사전페인트 lang+`/en/demo`, 데모 noindex, 보이는 시드 문자열 번역.
- **`I18N_PLAN_phase5.md`** — 서버 자유문구(선택), 영속 요약 정책(신규만), 종단 검증.
