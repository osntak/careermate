# 다국어(i18n) 설계: 랜딩 + 대시보드 영어 지원

- **작성일**: 2026-06-20
- **상태**: 설계 확정(2026-06-20) · **Phase 0(인프라)+1(랜딩 en) 구현·검증 완료** · Phase 2~5 남음 · 미커밋(출시 전 §4-1 SEO 검증 필요)
- **범위**: 마케팅 사이트(`site/`) + 대시보드(`apps/web`) + 데모(`site/demo`) + OG 이미지. 1차 로케일 = `ko`(기본) · `en`
- **관련**: [ROADMAP](./ROADMAP.md)(i18n 항목), [ARCHITECTURE](./ARCHITECTURE.md), [careermate-i18n-output-language 메모](#) (AI 출력 언어 — 별개 축)

> 이 문서는 "다국어를 일반적으로 어떤 구조로 가져가는지"를 먼저 조사한 뒤(정적 사이트 SEO·라우팅 표준,
> 프레임워크 없는 바닐라 JS SPA 번역 레이어 표준), CareerMate에 맞춰 **검증된 아키텍처 한 벌**로 정리한 것이다.
> 8개 에이전트 리서치 + 3개 적대적 리뷰(SEO·아키텍처 완전성·작업량)를 거쳐 1차 합성안의 누락/오류를 바로잡았다.

---

## TL;DR

- **하나의 계약, 두 런타임.** 로케일 = `ko | en`, 저장 키 = `localStorage['careermate-lang']`, `<html lang>` = 활성 로케일.
  랜딩(정적, Vercel)과 대시보드(로컬 Node SPA)는 **JS를 공유할 수 없으므로 "계약"만 공유**한다(같은 키·같은 감지 규칙·같은 키네이밍).
- **랜딩**: 로케일 서브패스. 한국어는 루트(기본 + `x-default`), 영어는 `/en/`에 **정적 파일 복사본**. (Stripe·Linear·Notion·Astro 패턴)
  **하드 리다이렉트 없음** — 1회성 배너 + nav 토글만(구글: 언어/IP 자동 리다이렉트는 색인을 깨뜨림).
- **대시보드**: 라이브러리 없이 **손수 만든 ~35줄 `i18n.js`** (`t(key, vars)` + `{{var}}` 보간 + `Intl.PluralRules`).
  로케일별 **플랫 점 표기 키 카탈로그**(`i18n/ko.js`, `i18n/en.js`). 기존 **테마 설정 패턴을 그대로 복제**.
- **enum 라벨은 클라이언트에서** 안정적인 CODE로 현지화(서버 `Accept-Language` 왕복 불필요 → `meta()` 캐시 staleness 문제도 동시 소멸).
- **`llms-install.txt`는 번역하지 않는다** (AI가 AGENTS.md 지침대로 사용자 언어로 알아서 안내). 영어판은 `/en/start`의 **둘러싼 안내 문장만** 번역.
- **데모는 별도 작업이 필요**하다: `demo-shim.js`(~775줄, 한국어 하드코딩 API)를 로케일 인식하게 만들고, `build-demo.mjs`의 `/demo/` 접두사를 파라미터화하며, 데모는 **noindex** 처리.
- **순서 재배치**: 위험 낮고 가치 큰 **랜딩 영어화를 먼저**, 대시보드 본문(롱폴)을 뒤에. 서버 자유문구 현지화는 마지막(또는 1.1로 연기).

---

## 1. 조사 요약 — "일반적으로 어떻게 하는가"

### 1-1. 정적 마케팅 사이트 (SEO·라우팅)

| 전략 | 평가 |
| --- | --- |
| **로케일 서브패스 `/en/`** (채택) | 한 도메인에 SEO 권위 집중, `cleanUrls`로 무설정 서빙, hreflang 깔끔. Stripe·Linear·Notion·Supabase·Astro docs가 이 방식. |
| 서브도메인 | 링크 권위 분산·DNS/인증서 부담. 과함. |
| ccTLD | 비쌈·"언어"가 아니라 "지역" 신호. |
| 쿼리 파라미터 `?lang=` | SEO 안티패턴, 색인 불량. 금지. |
| 단일 파일 + JS 텍스트 스왑 | 색인 가능한 영어 URL이 사라짐. 금지. |

핵심 표준: **상호·자기참조 hreflang + `x-default` + 자기 canonical만**(상대 언어로 cross-point 금지), 페이지별 `lang`/`og:locale`/`og:url`,
sitemap의 `xhtml:link` 대안, **하드 리다이렉트 금지**(배너로 대체).
출처: Google "localized versions" 문서, Vercel `vercel.json` 문서, Mueller(리다이렉트는 색인을 깸).

### 1-2. 프레임워크 없는 바닐라 JS SPA (번역 레이어)

i18next·FormatJS·Polyglot·Lingui의 **공통 최소 표면** = ① `t(key, vars)` 조회 ② `{{var}}` 보간 ③ 플랫폼 `Intl.PluralRules` 복수형.
2개 소형 로케일·번들러 없음·CDN 없음(로컬 서빙) 환경에서는 **라이브러리를 넣지 않고 ~35줄로 직접 구현**하는 것이 정답
(i18next ≈ 40KB+ & 번들러 가정, FormatJS는 ICU 파서/컴파일, Lingui는 추출 빌드 단계 — 전부 no-build 제약과 충돌).
Polyglot.js(Airbnb)가 "작은 t()+보간+복수형"이 업계에서 검증된 선택임을 증명. 한국어는 CLDR 복수 범주가 항상 `other`라 **복수형은 영어 전용**.
카탈로그를 단일 출처로 두고 **키 패리티를 ~15줄 Node 가드 스크립트**로 CI에서 강제(라이브러리의 빌드타임 추출기를 대체).

---

## 2. 설계 원칙 — "계약을 공유하되 코드는 공유하지 않는다"

랜딩은 Vercel이 서빙하는 정적 파일, 대시보드는 사용자 PC의 로컬 Node 서버가 서빙하는 SPA다. 둘은 **같은 JS 런타임을 공유할 수 없다.**
그래서 **코드가 아니라 계약을 공유**한다:

- **저장 키**: `localStorage['careermate-lang']` (기존 `careermate-theme` 선례와 동일한 스킴)
- **기본 감지 규칙**: `navigator.language` 소문자화 → `ko*`면 `ko`, 아니면 `en`
- **`<html lang>` 의미**: 활성 로케일을 정확히 반영
- **키네이밍·영어 카피 레지스터**: 동일 규칙(아래 §6, §7)

플랫폼이 강제하는 곳에서만 갈라진다(정적=URL별 고정 lang, SPA=런타임 스왑).
`careermate.life` 랜딩과 `/demo`는 **같은 오리진**이라 토글 선택이 데모로 자연히 이어진다.

---

## 3. 결정 사항 (리뷰 반영 최종본)

| # | 주제 | 결정 | 근거 / 리뷰 반영 |
| --- | --- | --- | --- |
| D1 | 랜딩 라우팅 | 로케일 서브패스. ko=루트(기본·x-default), en=`/en/`에 정적 복사본 | `cleanUrls`로 무설정 서빙, SEO 권위 집중. **단, §4-1의 사전 검증 필수** |
| D2 | 랜딩 전환 UX | 하드 리다이렉트 없음. 1회성 배너(저장값 없음 ∧ 브라우저 영어 ∧ 현재 한국어 페이지) + nav 토글(같은 페이지로 딥링크, `careermate-lang` 저장) | 자동 리다이렉트는 크롤러를 튕기고 색인을 깸 |
| D3 | 대시보드 번역 레이어 | 라이브러리 없이 `i18n.js`(~35줄) + 로케일별 플랫 키 ES 모듈. 동기 import | no-build 제약·기존 idiom과 일치 |
| D4 | 런타임 간 공유 | 코드 아님, **계약** 공유(같은 키·감지·lang 의미). 사전 페인트 인라인 스크립트로 FOUC 방지(테마 선례) | 오리진/서빙 경로가 달라 모듈 공유 불가 |
| D5 | **enum 라벨 현지화** | **클라이언트에서 안정 CODE→라벨**(status/kind/source). 서버 `Accept-Language` 왕복 제거 | 클라가 이미 로케일을 앎 + CODE가 계약. **`meta()` 캐시 staleness 문제 동시 해소.** (리뷰: 최대 YAGNI 절감) |
| D6 | 서버 자유문구 | `HttpError` 등 클라가 못 만드는 문구만 별도. **enum/전이 에러는 CODE로 내려 클라가 현지화.** 자유문구 서버 현지화는 마지막 단계(또는 1.1 연기) | 가장 위험·가시성 낮음 → 임계경로에서 분리 |
| D7 | 확인 단어 게이트 | 로케일별 게이트 단어(ko `초기화`/`가져오기`, en `RESET`/`IMPORT`, ASCII) 단일 상수. **wire 토큰(`DELETE`/`RESTORE`) 불변.** `settings.js:416` 버그 동시 수정 | 현재 4개 비교지점은 맞고 L416 재활성 비교만 어긋남 |
| D8 | 날짜/숫자/정렬/복수 | `Intl.RelativeTimeFormat`/`DateTimeFormat`/`NumberFormat`/`localeCompare(활성로케일)`/`Intl.PluralRules`. 복수형은 영어 전용 | 플랫폼 표준, '5분 전' 영어 오류·점 표기 날짜·한글 콜레이션 정렬 해결 |
| D9 | 폰트/lang | Pretendard 유지(라틴 내장). 대시보드 `font-display: block→swap`, `--font`에 라틴 폴백 추가. `<html lang>`은 사전 페인트 + `setLang()`에서만 설정(라우트마다 X) | Pretendard가 영어 양호, FOIT만 보완 |
| D10 | 데모 전파 | 대시보드 **소스** 번역 → `build-demo.mjs`로 전파. **`demo-shim.js` 로케일 인식화 + 접두사 파라미터화 + `<title>` 마커화 + 데모 noindex** | 리뷰 블로커: 셰임/빌드 접두사/색인 누락 |
| D11 | `llms-install.txt` | **번역하지 않음.** 단일 정본을 양 로케일 prompt가 그대로 참조. `/en/start`의 안내 문장만 영어 | AI가 AGENTS.md대로 스스로 사용자 언어로 안내 |
| D12 | 영어 데모 데이터 | 1차: 번역된 UI 크롬으로 **동일 데이터셋** 렌더 + 눈에 보이는 시드 문자열 소수만 번역. 전용 `seed.en.js`는 별도 콘텐츠 작업으로 분리 | 가장 낮은 레버리지, 임계경로 제외 |
| D13 | 영속 한국어 요약 | **확정: 신규 항목만 현지화, 과거 활동/타임라인 요약은 작성 로케일 유지.** 구조화 마이그레이션은 후속 | 실제 영어 신규 사용자는 빈 DB로 시작 → 이 제약은 그들에게 보이지 않음(기존 ko 사용자가 전환할 때만 옛 줄 몇 개가 한국어) |
| D14 | 런처/폴더명 | **확정: 설치 시 저장 로케일 따라감**(en이면 `CareerMate Dashboard`). `shortcutFolder()`/README/런처 echo가 설치 로케일(폴백 ko) | 요청 컨텍스트 없는 디스크 산출물 |
| D15 | 영어 배너 | **확정: 1회성 비강제 배너 노출**(저장값 없음 ∧ 브라우저 영어 ∧ 한국어 페이지). 닫으면 재노출 안 함 | SEO 안전(리다이렉트 아님) |

---

## 4. 아키텍처

### 4-1. 랜딩(정적 `/en/`) — **착수 전 SEO 사전 검증(블로커)**

1차 합성안은 "vercel.json 변경 불필요"를 **미검증 가정**으로 단정했다. 착수 전 반드시:

- [ ] **Vercel 프로젝트 Root Directory = `site/`** 확인. (루트가 repo면 `site/vercel.json`이 무효 → `cleanUrls` 자체가 꺼져 전 전략이 붕괴)
- [ ] 임시 `site/en/index.html`·`site/en/start.html`를 프리뷰 배포 후 `curl -sI`로 `/en`, `/en/`, `/en/start`, `/en/start/` 가 **리다이렉트 없이 단일 200**인지 확인. 디렉터리 인덱스(`/en/`)와 명명 파일(`/en/start`)은 `cleanUrls`+`trailingSlash:false`에서 **비대칭**이라 308/404가 흔히 발생.
- [ ] 200을 반환하는 **정확한 URL 형태**로 canonical·og:url·hreflang·nav 토글 href·sitemap loc을 **바이트 단위로 통일**. 형태가 어긋나면 explicit rewrite/redirect 추가하고 한 형태만 canonical.

페이지별 `<head>` 필수 요소(ko·en 양쪽, **상호** 적용):

```html
<!-- /  (한국어, 루트) -->
<html lang="ko">
<link rel="canonical" href="https://careermate.life/" />
<link rel="alternate" hreflang="ko" href="https://careermate.life/" />
<link rel="alternate" hreflang="en" href="https://careermate.life/en" />
<link rel="alternate" hreflang="x-default" href="https://careermate.life/" />
<meta property="og:locale" content="ko_KR" />
<meta property="og:locale:alternate" content="en_US" />
<meta property="og:url" content="https://careermate.life/" />

<!-- /en (영어) -->
<html lang="en">
<link rel="canonical" href="https://careermate.life/en" />
<link rel="alternate" hreflang="ko" href="https://careermate.life/" />
<link rel="alternate" hreflang="en" href="https://careermate.life/en" />
<link rel="alternate" hreflang="x-default" href="https://careermate.life/" />
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="ko_KR" />
<meta property="og:url" content="https://careermate.life/en" />
<meta property="og:image" content="https://careermate.life/og-en.png" />
```

리뷰가 잡은 **선결 수정**:
- `site/start.html`에 **자기 canonical이 없음**(기존 버그) → `https://careermate.life/start` self-canonical 추가하고 `/en/start`도 동일.
- 기존 ko 페이지에도 **`og:locale:alternate=en_US` 추가**(상호성).
- **`sitemap.xml`**: `xmlns:xhtml` 추가, 각 url 블록에 **자기 포함 완전한 대안 집합**(ko·en·x-default) 동일하게. 비상호면 구글이 전체 무시.
- **`/demo`·`/en/demo`는 sitemap에서 제외** + 데모 인덱스 템플릿에 `<meta name="robots" content="noindex,follow">`. (robots.txt `Disallow` 금지 — 그러면 noindex를 못 읽음)
- **정적 페이지 `<html lang>`는 파일별 고정.** `landing.js`는 **절대 `document.documentElement.lang`을 변경하지 않는다**(렌더 lang ↔ hreflang 불일치 방지). `careermate-lang` 키는 랜딩에서 (a) 배너 노출 판단, (b) 대시보드로 선택 전달 용도로만.
- **nav 토글 딥링크**: 1:1 매핑 맵 유지. 대상 로케일에 대응 페이지가 없으면(예: 미래의 ko 전용 페이지) **그 로케일 홈으로 폴백**(맹목적 `/en` 접두 → 404 방지).

`site/landing.js`(ko·en 공용): `scenes[]`·복사버튼 문구를 작은 인라인 로케일 룩업으로 분기. **씬 카피 단일 출처**를 정함 — `landing.js`가 모든 씬 카피(ko·en)를 소유하고 HTML hero는 `data-*` 또는 부팅 시 `landing.js`에서 채움(현재 index.html에 중복된 씬0 리터럴 제거).

### 4-2. 대시보드(no-build 바닐라 SPA)

```js
// apps/web/public/i18n.js  (lib.js에 의존하지 않음 — 순환 방지. lib.js가 i18n.js를 import)
import ko from '/i18n/ko.js';
import en from '/i18n/en.js';
const CATALOGS = { ko, en };
const FALLBACK = 'ko';
const LOCALES = Object.keys(CATALOGS);            // ['ko','en'] — 3번째 = import 1줄 + 맵 1줄
function detect() {
  const s = localStorage.getItem('careermate-lang');
  if (s && CATALOGS[s]) return s;
  return (navigator.language || '').toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
let lang = detect(); const subs = new Set();
export const getLang = () => lang;
export function setLang(n) {
  if (!CATALOGS[n] || n === lang) return;
  lang = n; localStorage.setItem('careermate-lang', n);
  document.documentElement.lang = n;
  clearMeta();                                    // ← enum 라벨 캐시 무효화(아래)
  subs.forEach(f => f(lang));                      // 라우터가 현재 뷰 재렌더
}
export function onLangChange(fn) { subs.add(fn); return () => subs.delete(fn); }
const _pr = {}; const pr = l => (_pr[l] ||= new Intl.PluralRules(l));
export function t(key, vars) {
  let m = CATALOGS[lang]?.[key] ?? CATALOGS[FALLBACK]?.[key] ?? key;   // 절대 빈 문자열 아님
  if (vars && typeof m === 'object') m = m[pr(lang).select(vars.count)] ?? m.other ?? key;
  return vars ? m.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`) : m;
}
```

- **런타임 스왑**: `setLang()` → `onLangChange` → 기존 `route()`/`mount()`로 **현재 라우트만 재실행**(절대 `location.reload()` 금지 — 인메모리 상태·스크롤 보존).
- **`t()`는 각 페이지 `render(ctx)` 안에서 호출**. 모듈 로드 시점에 번역 문자열을 const로 캡처하면 스왑 때 안 바뀜(금지).
- **enum 라벨(클라이언트 현지화, D5)**: `lib.js`의 `meta()`는 `/api/meta`를 **영구 캐시**(`let _meta=null`)라 스왑 후 stale. → 두 가지 동시 적용: (1) `meta()`가 enum **코드**만 주도록(라벨은 클라가 `t('status.'+code)`로 해결), (2) `clearMeta()`를 `setLang()`에서 호출(서버가 여전히 일부 라벨을 줄 경우 대비). status/kind/source 키는 **CODE와 동일**하게 명명(§6).
- **언어 스위처**: `settings.js`의 Theme 컴포넌트를 1:1 복제 — ghost `Btn` 행 + `aria-pressed`/`is-selected` + `paint()`. 2~3개는 버튼, **4개+가 되면 동일 `setLang()` 핸들러로 기존 `Select()`만 교체**(로직 변경 아님). **지금은 Select 만들지 않음.**

### 4-3. 데모(`site/demo`, `site/en/demo`) — 리뷰 블로커 3건 반영

`site/demo`는 `apps/web/public`에서 `scripts/build-demo.mjs`로 **생성·커밋**되는 산출물. 단, 다음이 누락되면 `/en/demo`가 깨진다:

1. **`demo-shim.js`(~775줄)는 별도 한국어 API.** `window.fetch`를 가로채 `STATUS_LABELS`·`DOC_KIND_LABELS`·타임라인 제목/요약·에러·온보딩·데모바 크롬을 **하드코딩 한국어**로 생성하며 `build-demo`가 **그대로 복사**한다(소스 번역이 전파되지 않음). → 셰임을 로케일 인식하게: 클라 카탈로그(또는 공유 라벨맵)를 import해 자체 리터럴 제거, init 시 `careermate-lang`/`<html lang>`로 로케일 해석, 합성 타임라인/에러/온보딩/데모바를 그 로케일로. **키 패리티 가드에 셰임 라벨도 포함.**
2. **`build-demo.mjs`의 `/demo/` 접두사 하드코딩.** `rewritePaths()`가 `$1/demo/…`로 고정 → `/en/demo` 빌드 시 자산이 여전히 `/demo/…`를 가리킴. → `rewritePaths(code, base)`·`injectDemo(html, base)`로 **파라미터화**, ko→`site/demo`/en→`site/en/demo` 2회 실행. 빌드 후 `/en/demo/index.html`이 `/demo/`를 참조하면 **빌드 실패 단언** 추가. (참고: `/i18n.js`·`/i18n/` 추가는 기존 `/pages/` 규칙과 동일한 사소한 정규식 토큰 추가)
3. **`injectDemo()`의 정확 문자열 매치가 load-bearing.** `<title>CareerMate — 내 커리어 흐름 관리</title>`(L108) 등 5개 exact `.replace`. i18n로 title을 비우거나 `t()`화하면 **조용히 no-op**. → 소스 `<title>`을 비우고 부팅 시 `t()`로 채워 매치 제거, 또는 HTML 주석 마커(`<!--demo-inject-->`)로 교체 + **치환 0건이면 빌드 실패**. 사전 페인트 lang 인라인 스크립트도 `injectDemo()`에 주입(테마 스크립트 미러).

### 4-4. 서버(트림됨)

- **enum/전이 에러는 현지화하지 않고 CODE로 내려보냄** → 클라가 현지화(D5/D6). `packages/shared/src/enums.ts`의 `assertStatusTransition`(L86-96)이 던지는 한국어 문구는 **CODE 기반 에러**로 바꿔 경계에서 매핑(이 코드는 MCP에도 던져지므로 MCP는 한국어 유지 가능).
- **자유문구**(`HttpError` 메시지, `http.ts` 파싱 에러, `settings.ts` README/런처/`parseBackup` 메시지)만 별도. 1차에서는 **서버 기본 ko 유지 + 클라가 표시 가능한 것만 클라 현지화**, 본격 서버 카탈로그는 **마지막 단계 또는 1.1 연기**(가장 위험·가시성 낮음).
- `server.ts`의 `/install` 리다이렉트는 로케일 인식(ko→`careermate.life/`, en→`/en/`).
- MCP 레이어 라벨은 **한국어 유지**(청중이 AI, AGENTS.md가 출력 언어를 따로 관장).

---

## 5. 로케일 위험요소 처리

### 5-1. 즉시 처리(헬퍼 중앙화)

| 위험 | 위치 | 처리 |
| --- | --- | --- |
| 확인 단어 게이트 한국어 고정 | `settings.js:385-416`(reset), `:321-369`(import) | 로케일별 게이트 단어 단일 상수(전체 5지점). wire 토큰 불변. **L416 버그 수정**. 안내문은 `{{word}}` 보간 단일 카탈로그 항목으로(조각 연결 금지) |
| `fmtRelative` 한국어 버킷('방금 전','N분 전') | `lib.js:165-173` | `Intl.RelativeTimeFormat(locale,{numeric:'auto'})` |
| `fmtDate`/`fmtBackupDate` 점 표기 고정 | `lib.js:159-164`, `settings.js:296-301` | `Intl.DateTimeFormat(locale, …)` |
| `localeCompare(…, 'ko')` | `settings.js:306` | `localeCompare(b, 활성로케일)` |
| 숫자 그룹핑 | `settings.js:267` 등 | 그룹핑 의미 있는 곳 `Intl.NumberFormat(locale)` |
| 폰트 FOIT·라틴 폴백 | `apps/web/public/styles.css:10-19,63-64` | `font-display: swap`, `--font`에 `'Segoe UI', system-ui` 추가 |
| 복수형/조사(개/건/점/명/님 존댓말) | home/jobs/documents/profile/interview/applications | 카운트는 `{one,other}` 복수 항목(en) / ko는 카운터 접미사. **문장 단위 카탈로그 항목**으로 재구성(어순 차이) |
| `document.title` 라우트 시 미갱신·`<html lang>` 고정 | `app.js:9-16,70,78,93` | ROUTES 라벨 `t()`화, 라우트마다 `document.title=t(label)`. lang은 사전 페인트+`setLang()`에서만 |
| OG 이미지·title/description 한국어 | `site/og.png`, 각 `<head>` | `og-en.png` 생성(§ gen-og), 페이지별 title/description/og:image:alt 영어 |

### 5-2. 영속 데이터(작성 로케일로 저장됨) — **1차 결정 필요 항목**

**"활동/타임라인"이란**: ① **활동** = 홈의 "최근 활동" 피드("○○ 공고를 저장했습니다." 등 행동마다 한 줄). ② **타임라인** = 공고/지원별 진행 기록("공고 등록"→"적합도 분석(종합 85점)"→"면접 준비(예상 질문 12개)").
`packages/core/src/services.ts`가 이 요약을 **작성 시점에 한국어 텍스트로 DB 저장**한다
(`activityRepo.log('job_saved', '${회사} 공고를 저장했습니다.')`, 타임라인 `종합 ${score}점` 등).
경계 현지화는 **요청마다 생성되는** 문자열만 커버하므로, 한국어로 쌓인 과거 요약은 영어로 전환해도 **그대로 한국어**로 남는다.

- **확정(1차)**: 신규 chrome/라벨은 현지화하되, **과거 활동/타임라인 자유 요약은 작성 로케일 유지**한다. 근거: 실제 영어 신규 사용자는 **빈 DB로 시작**하므로 이 제약이 보이지 않고, 기존 한국어 사용자가 전환할 때만 옛 줄 몇 개가 한국어로 보인다(사소). 신규 항목은 가능하면 **구조화(코드+파라미터) 저장**으로 점진 전환.
- **완전판(후속)**: 요약을 `{kind, params}` 구조로 저장하고 **읽기 시점에 `t(locale)`로 렌더**(`status_label`과 동일 방식). 마이그레이션 필요.

---

## 6. 키네이밍 규칙

플랫 점 표기, 소문자, `area.component.element[.variant]`. **모든 카탈로그가 동일 키 집합**.

- area: `home.` `jobs.` `documents.` `profile.` `settings.` `interview.` `applications.` + 공통 `common.`(cancel/confirm/close/save) · `toast.` · `err.`
- **안정 식별자 미러**: `status.<CODE>`(enum 코드와 동일) · `nav.<route-id>` · `kind.<CODE>` · `source.<CODE>` → 클라·(있다면)서버·MCP가 같은 키로 교차참조. enum 코드가 곧 계약이라 클라이언트 현지화가 드리프트하지 않음.
- 복수/카운트는 **en.js에서만 객체**: `documents.versions.count` → en `{ one:'{{count}} version', other:'{{count}} versions' }`, ko `'버전 {{count}}개'`. **ko에 복수 객체 금지.**
- 보간은 항상 `{{var}}`(i18next 관례). 값은 `el()`/textContent로 흘러 XSS 안전 — `html:` prop로 보내지 않음.
- **한 키 = 한 완성 문장.** 번역 조각을 코드에서 연결하지 않음(어순이 로케일마다 달라짐).
- 게이트 단어: `settings.reset.gateWord`/`settings.import.gateWord`(타이핑 단어만; wire 토큰은 별도 비번역 상수).

---

## 7. 검증 게이트 / 가드

- **`scripts/check-i18n-keys.mjs`**(~15줄, `npm test`/CI): 모든 카탈로그 키 집합의 합집합 대비 **누락 키가 있으면 실패**. 추가로 (a) 소스의 `t('...')` 리터럴 키를 best-effort 스캔해 카탈로그에 없는 키 경고, (b) 복수 객체가 `Intl.PluralRules(locale).resolvedOptions().pluralCategories`의 모든 범주를 갖는지 단언. 데모 셰임 라벨도 패리티 집합에 포함.
- **런타임 폴백**: 카탈로그 → `FALLBACK(ko)` → 원시 키(절대 빈칸 X) → 누락이 화면에 키로 보임(조용한 공백 아님).
- **빌드 단언**: `injectDemo` 치환 0건 실패, `/en/demo`가 `/demo/` 참조 시 실패.
- **SEO 검증**: 프리뷰에서 sitemap의 모든 URL `curl -sI`로 200·redirect 없음 단언(CI 체크 권장). 구글 hreflang 검증기/Screaming Frog로 상호성 확인.

---

## 8. 단계별 구현 계획 (위험·가치 기준 재배치)

> 원칙: 디커플드·저위험·고가치를 먼저. 대시보드 본문(롱폴)과 서버(고위험·저가시성)는 뒤로.

- **Phase 0 — 인프라 + 가드(가시 변화 없음)**
  `i18n.js`(리졸버+`t()`)·빈 `i18n/ko.js|en.js`, `check-i18n-keys.mjs`(CI), 대시보드 index.html 사전 페인트 lang 스크립트, settings.js 언어 스위처(테마 클론, 일단 ko만).

- **Phase 1 — 랜딩 `/en/` + SEO(정적, 앱 위험 0, 즉시 가치)** ← **front-load**
  §4-1 사전 검증 → `site/en/index.html`·`site/en/start.html`(자연스러운 영어, 페이지별 lang/og/canonical/hreflang/x-default, 딥링크 토글), `landing.js` 씬·복사문구 로케일화 + 1회 배너, `og-en.png`, `sitemap.xml` 상호 대안, **start.html canonical·og:locale:alternate 선결 수정**. `llms-install.txt` 미번역(안내 문장만).

- **Phase 2 — 대시보드 셸 + lib.js + 위험요소(게이트 버그 포함)**
  lib.js(api/friendlyStatus/toast/modal `t()`, fmtRelative/fmtDate→Intl, `getActiveLocale()`, `clearMeta()`), app.js(ROUTES `t()`, document.title, `onLangChange(()=>route())`, aria), settings.js(게이트 단어 상수+L416, localeCompare, fmtBackupDate→Intl, COUNT/BACKUP 라벨), styles.css(swap+라틴 폴백). enum 라벨 **클라 현지화** 배선. ko/en 채움(셸+lib+settings).

- **Phase 3 — 대시보드 페이지(롱폴, 파일 클러스터로 분할·독립 그린 게이트)**
  - **3a**: `profile.js`·`jobs.js`·`documents.js`(최대 표면 + 중복 라벨맵 삭제 + enum 키 정렬)
  - **3b**: `home.js`·`interview.js`·`applications.js`
  - 존댓말/조사/복수 **문장 단위 재구성**을 별도 라인아이템으로(찾기-바꾸기 아님, 편집 작업).

- **Phase 4 — 데모 재생성(셰임 로케일화 + 빌드 파라미터화 + noindex)**
  `demo-shim.js` 로케일 인식, `build-demo.mjs` 접두사 파라미터화·title 마커·사전 페인트 lang·`/en/demo` 패스, 데모 noindex, 보이는 시드 문자열 소수 번역(전용 `seed.en.js`는 분리).

- **Phase 5 — 서버 자유문구(선택/연기 가능) + 종단 검증**
  남은 서버 자유문구 현지화(필요 시), 영속 요약 정책 확정(§5-2). 전체 검증: 토글 시 현재 라우트 무리로드 재렌더·상태 보존, en에서 날짜/복수/정렬, 양 로케일 게이트, hreflang/canonical 200, 누락 키 0.

---

## 9. 결정 완료(사용자 확인됨, 2026-06-20)

- **Q1 — 영속 한국어 요약(§5-2).** ✅ **신규만 현지화, 과거 활동/타임라인 요약은 작성 로케일 유지.** (실제 영어 사용자는 빈 DB 시작이라 비가시)
- **Q2 — 영어 데모 데이터.** ✅ 1차는 동일 데이터셋 + 보이는 문자열 소수만 번역. 전용 `seed.en.js`는 별도 콘텐츠 작업.
- **Q3 — 런처/README/디스크 폴더명.** ✅ **설치 시 저장 로케일 따라감**(en이면 `CareerMate Dashboard`).
- **Q4 — 랜딩 영어 배너.** ✅ **1회성 비강제 배너 노출**(닫으면 재노출 안 함).

---

## 10. 확장성(요지)

3번째 로케일 추가 = (대시보드) `i18n/<l>.js` 생성 + `i18n.js`에 import 1줄·맵 1줄 + 스위처 옵션 1줄.
(랜딩) `site/<l>/` 복사 + sitemap·og·hreflang 1줄씩(상호 hreflang의 O(페이지수) 비용 — 서브패스 i18n의 알려진 트레이드오프).
가드는 새 카탈로그를 자동 포함. **2개 로케일을 위해 어떤 추가 추상화도 만들지 않는다**(`Object.keys(CATALOGS)`로 LOCALES 도출이면 충분).
