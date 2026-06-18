# UI/UX 설계 노트

CareerMate 대시보드의 화면 설계 의도를 정리한 문서다. 무엇을 어떻게 만들었는지뿐 아니라 **왜 그렇게 했는지**를 남겨, 새 화면을 추가하거나 기존 화면을 손볼 때 일관성을 잃지 않도록 한다.

대시보드는 프레임워크·번들러·CDN 없이 동작하는 바닐라 JS + 자체 CSS 디자인 시스템으로 만들어졌다. 모든 컴포넌트와 토큰은 다음 두 파일에 모여 있다.

- `apps/web/public/lib.js` — DOM 헬퍼, API 클라이언트, 공용 컴포넌트
- `apps/web/public/styles.css` — 디자인 토큰과 컴포넌트 스타일

화면을 만드는 규칙은 [`apps/web/UI_CONTRACT.md`](../../apps/web/UI_CONTRACT.md)에, 기준이 되는 참고 구현은 [`apps/web/public/pages/home.js`](../../apps/web/public/pages/home.js)에 있다. 이 문서는 그 둘의 배경이 되는 설계 원칙을 담는다.

---

## 1. 디자인 원칙

### 1.1 "진짜 생산성 도구"를 지향한다

`styles.css` 첫머리 주석이 톤을 규정한다.

> CareerMate design system — a calm, dense, real-productivity-tool aesthetic.
> Inspired by the restraint of Linear / Notion / Raycast — not AI-flashy.

차분하고(calm), 밀도 있고(dense), 실제 일이 되는(real-productivity) 도구가 목표다. 화려한 그라데이션이나 과장된 모션이 아니라, 매일 들여다봐도 피로하지 않은 절제된 화면을 만든다.

### 1.2 AI 슬롭(AI slop)을 회피한다

CareerMate는 사용자의 AI(ChatGPT·Claude·Gemini)가 MCP로 호출하는 도구이지, 내부에 LLM이 없다. 그래서 화면이 "AI 제품"처럼 보일 이유가 없다. [`UI_CONTRACT.md`](../../apps/web/UI_CONTRACT.md)의 컨벤션이 이를 못박는다.

> Dense, calm, real-product feel. Avoid emoji-heavy or flashy "AI" styling.

- 반짝이·로봇·마법봉 같은 과시적 표현을 화면 곳곳에 뿌리지 않는다. (`sparkle` 아이콘이 `lib.js`에 존재하지만 강조 포인트로 아껴 쓴다.)
- 이모지를 정보 전달 수단으로 남용하지 않는다.
- 결과를 "AI가 만들었다"는 식으로 포장하지 않는다. 자기소개서 버전 출처는 `직접 입력 / 파일 업로드 / AI 생성 / 직접 수정`(`documents.js`의 `SOURCE_LABELS`)처럼 담백한 라벨로 사실만 표기한다.

### 1.3 밀도(density)

한 화면에서 많은 정보를 빠르게 훑을 수 있어야 한다.

- 기본 본문 폰트 14px, 줄간격 1.55 (`body`).
- 컴포넌트마다 의도된 작은 글자 크기 단계가 있다. 예: 네비 라벨 11px, 카드 부제 12.5px, 통계 값 26px.
- `.stat`, `.table`, `.board-card`, `.timeline` 등으로 목록·표·칸반·타임라인을 조밀하게 배치한다.
- 숫자는 `font-variant-numeric: tabular-nums`(`.tnum`)로 자릿수를 고정해 표/통계에서 흔들리지 않게 한다.

밀도는 "빽빽함"이 아니라 "여백을 낭비하지 않음"이다. 카드·셀의 패딩은 일정한 토큰 체계를 따른다.

### 1.4 친절한 empty state

비어 있는 화면이야말로 첫인상이다. 모든 목록은 비었을 때 다음을 제공한다(컨벤션상 필수, [`UI_CONTRACT.md`](../../apps/web/UI_CONTRACT.md) "Always provide a friendly empty state").

1. 무엇을 하는 공간인지 한 문장 설명
2. **MCP로 자동 저장된다**는 안내 — 사용자가 AI와 대화하면 채워진다는 점을 알려준다
3. 직접 추가할 수 있는 1차 액션 버튼

예: 자기소개서 탭(`documents.js`)의 빈 상태.

```
title: '자기소개서가 없어요'
body:  'ChatGPT·Claude에게 작성을 요청하면 자동으로 여기에 저장되고,
        수정할 때마다 버전이 기록됩니다. 직접 추가할 수도 있어요.'
action: '새 자기소개서'
```

공고 목록(`home.js`의 `RecentJobs`), 문서 탭, 면접 준비 영역도 같은 패턴을 따른다. 빈 상태는 `EmptyState({ iconName, title, body, action })` 컴포넌트(`lib.js`)로만 만든다.

### 1.5 비개발자 용어

사용자는 개발자가 아닐 수 있다. 화면 문구는 한국어 우선이고, 기술 용어를 노출하지 않는다.

- 상태 코드는 내부적으로 `document_passed`지만, 사용자에게는 항상 라벨(`서류 합격`)로 보인다. 8단계 라벨은 [`UI_CONTRACT.md`](../../apps/web/UI_CONTRACT.md)에 정의돼 있다: `작성 중 / 지원 예정 / 지원 완료 / 서류 합격 / 면접 진행 / 최종 합격 / 불합격 / 보류`.
- 오류 메시지도 한국어다. `api()`(`lib.js`)는 실패 시 `요청 실패 (${status})`로, `toastError`는 제목 `오류`로 표시한다.
- 상대 시간도 사람 말투다: `방금 전 / N분 전 / N시간 전 / N일 전`(`fmtRelative`).

### 1.6 MCP·localhost는 설정에서만

CareerMate의 동작 기반(127.0.0.1 바인딩, MCP stdio 서버, 데이터 디렉터리, server.json 핸드셰이크)은 사용자가 매일 신경 쓸 대상이 아니다. 그래서 이런 기술적 디테일은 **Settings 페이지에만** 둔다. Home·Jobs·Applications 같은 일상 화면에는 포트 번호나 MCP 연결 상태 같은 내부 개념을 노출하지 않는다. 일상 화면은 "내 커리어"라는 도메인 언어로만 이야기한다.

---

## 2. 정보 구조 (7페이지)

좌측 고정 사이드바(`--sidebar-w: 248px`)로 7개 페이지를 오간다. 라우팅은 해시 기반(`navigate(hash)` → `location.hash`)이고, `params`는 페이지 id 뒤 경로 세그먼트다(`#/jobs/abc` → `params=['abc']`).

| 페이지 | 역할 |
| --- | --- |
| **Home** | "지금 뭘 해야 하지?"를 한눈에. 통계 타일, 온보딩 카드, 최근 공고, 진행 중 지원, 면접 할 일, 최근 활동 |
| **Profile** | 프로필·경험·프로젝트·스킬 관리, 프로필 완성도 |
| **Jobs** | 저장된 공고 목록과 상세(적합도, 분석, 연결된 지원) |
| **Applications** | 지원 현황 칸반(8단계 상태 보드) |
| **Documents** | 자기소개서(버전 타임라인)와 이력서·경력기술서 문서 |
| **Interview** | 면접 준비 — 서류 합격 이상에서 해금 |
| **Settings** | 데이터 위치, MCP 연결, 테마 등 기술적 설정 |

### Home이 정보 구조의 중심인 이유

Home(`home.js`)은 다른 페이지로의 진입점이다. 구성:

- **PageHead** — 프로필 이름이 있으면 `{name}님, 안녕하세요`, 없으면 `환영합니다`. 부제는 `ChatGPT·Claude와 함께 쓰는 내 커리어 흐름 관리 도구`.
- **온보딩 카드** — 온보딩 미완료이거나 다음 할 일이 남았을 때만 노출(`!s.onboarding.completed || s.onboarding.next_steps.length`). 진행 바로 프로필 완성도를 보여주고, 다음 할 일을 최대 4개까지 나열한다.
- **통계 타일 4개**(`grid--4`) — 저장된 공고 / 진행 중 지원 / 자기소개서 / 면접 준비 필요. 면접 준비가 있으면 힌트 `서류 통과 후 준비하세요`.
- **2열 레이아웃**(`grid--2`) — 좌: 최근 공고 + 진행 중 지원, 우: 면접 할 일 + 최근 활동.

핵심은 **"무엇을 보여줄지보다, 무엇을 다음에 할지"**를 안내한다는 점이다.

---

## 3. 디자인 시스템

### 3.1 토큰 (CSS 변수)

`styles.css`의 `:root`에 모든 토큰이 모여 있다. 화면에서 색·반경·간격을 하드코딩하지 않고 토큰만 쓴다.

- **중립 팔레트**: `--bg`, `--bg-subtle`, `--bg-sunken`, `--surface`, `--surface-hover`, `--border`, `--border-strong`, `--text`, `--text-secondary`, `--text-tertiary`.
- **악센트**: 차분한 에메랄드. `--accent: #0f7256`, `--accent-hover`, `--accent-soft`, `--accent-border`. (이전 인디고 `#4f46e5`는 폐기 — DESIGN_GUIDE 참조.)
- **시맨틱 색**: `green / teal / blue / violet / amber / red / slate` 각각 본색·`-soft`·`-border` 3종. 상태 배지와 점수 색(`score-strong/mid/weak`)에 쓴다.
- **엘리베이션**: `--shadow-sm/md/lg`.
- **지오메트리**: `--radius-sm: 6px`, `--radius: 9px`, `--radius-lg: 14px`, `--sidebar-w`, `--topbar-h: 56px`, `--maxw: 1080px`.
- **타이포**: `--font`(Pretendard 우선, 한글 폴백 포함), `--mono`.

### 3.2 다크 모드

다크 모드는 **시스템 설정 자동 추종 + 명시적 강제** 두 경로를 모두 지원한다.

- `@media (prefers-color-scheme: dark)` 안에서 `:root:not([data-theme='light'])`에 다크 토큰을 적용 → 시스템이 다크이고 사용자가 라이트로 고정하지 않았으면 다크.
- `:root[data-theme='dark']` → 사용자가 명시적으로 다크를 고른 경우.
- 즉 `data-theme` 속성(`light`/`dark`/없음)으로 사용자 의도가 시스템 설정을 덮어쓴다.

다크 모드는 같은 토큰의 값만 교체하므로 컴포넌트 CSS는 변경 없이 그대로 동작한다. 이것이 토큰 우선 설계의 핵심 이득이다.

### 3.3 상태 배지 (Badge)

`Badge(status, label)`(`lib.js`)는 `badge badge--<status>` 클래스를 가진 캡슐을 만든다. 작은 점(`.dot`) + 라벨 구성이다. 8개 상태가 시맨틱 색과 1:1로 매핑된다(`styles.css`).

| 상태 | 색 |
| --- | --- |
| `draft` | slate |
| `planned` | blue |
| `applied` | violet |
| `document_passed` | teal |
| `interview` | amber |
| `final_passed` | green |
| `rejected` | red |
| `on_hold` | slate |

색은 단계가 진행될수록 따뜻해지고, 합격은 초록, 불합격은 빨강이라는 직관을 따른다. 배지는 "대표 자기소개서/문서" 표시에도 재활용된다(`final_passed` 색으로 `대표` 라벨, `documents.js`).

### 3.4 칸반 보드

Applications 페이지의 보드는 `.board`(가로 스크롤, `grid-auto-flow: column`, 열 너비 272px)와 `.board__col` / `.board__col-head`(상태명 + 개수 카운트) / `.board__cards` / `.board-card`로 구성한다. 카드 한 장은 회사명·직무·메타(상태 배지 등)를 담는다. 열 높이는 `calc(100vh - 200px)`로 묶고 내부 스크롤한다. 8단계 상태가 그대로 보드의 열이 된다.

### 3.5 버전 타임라인

Documents의 자기소개서 상세는 **버전 기록**을 세로 타임라인으로 보여준다(`documents.js`의 `CoverDetailBody` → `VersionItem`). 마크업은 `.timeline` 안에 `.tl-item`(레일 점 `.tl-item__dot` + 연결선 `.tl-item__line` + 본문 `.tl-item__body`)을 쌓는 구조다.

- 버전은 `version_no` 내림차순으로 정렬(최신이 위).
- 현재 버전은 `.is-current`로 점이 악센트 색으로 강조되고, 헤더에 `현재 버전` 배지가 붙는다.
- 각 항목에 출처 칩(`직접 입력 / 파일 업로드 / AI 생성 / 직접 수정`), 변경 메모, 상대 시간이 표시된다.
- 항목 액션: `이 버전 보기`(상단 미리보기 교체), `현재 버전으로 지정`, `복사`.

미리보기(`.doc-preview`)는 현재 버전 본문을 기본 표시하고, "이 버전 보기"로 특정 버전을 끼워 볼 수 있다.

### 3.6 그 밖의 공용 컴포넌트

`lib.js`가 제공하는 컴포넌트만 사용하고, 스타일을 손으로 짜지 않는다. `Card`, `Stat`, `Btn`(`primary/ghost/danger`), `IconBtn`, `EmptyState`, `Chips`, `Field`/`Input`/`Textarea`/`Select`, `PageHead`, `openModal`/`confirmDialog`, `toast`/`toastOk`/`toastError`, `Spinner`(스켈레톤). 아이콘은 `icon(name)`으로 1.7px 스트로크 SVG 세트를 쓴다.

피드백 패턴도 통일돼 있다. 변경 작업은 `try/catch`로 감싸 성공 시 `toastOk`, 실패 시 `toastError`, 위험한 삭제는 `confirmDialog`로 한 번 더 묻는다.

---

## 4. XSS-safe 렌더링 원칙

이 원칙은 타협하지 않는다. 데이터(이력서·자기소개서 본문 등)는 사용자/AI가 채우므로, 신뢰할 수 없는 문자열로 취급한다.

`lib.js` 상단 주석이 규칙을 명문화한다.

> XSS safety: el() puts strings into textContent (never innerHTML). User content (résumé/cover-letter text) is always rendered as text. Only our own trusted icon SVG strings use innerHTML.

구체적으로:

- `el(tag, props, ...children)`에서 문자열·숫자 자식은 `document.createTextNode`로 들어간다(`appendChildren`). 따라서 본문에 `<script>`가 있어도 코드로 실행되지 않고 글자로 보인다.
- `innerHTML`은 오직 **신뢰된 호출자**만 쓴다. `props.html` 키와 `icon()`의 SVG 주입이 전부이며, 이는 우리가 만든 고정 문자열이다. DB/사용자 문자열을 `html:`로 넘기지 않는다.
- 자기소개서·이력서 본문은 `.doc-preview` 요소에 텍스트로 넣는다. CSS가 `white-space: pre-wrap; word-break: break-word`를 처리하므로 줄바꿈·서식이 살아 있으면서도 안전하다(`documents.js`의 미리보기, 버전 보기).

새 페이지를 만들 때도 [`UI_CONTRACT.md`](../../apps/web/UI_CONTRACT.md)가 같은 점을 강조한다: *"never use innerHTML with user/DB content."*

---

## 5. 직접 수정 → 새 버전 저장 UX

자기소개서는 **덮어쓰지 않고 버전을 쌓는다**는 것이 핵심 UX다. 사용자가 손으로 고친 결과도 사라지지 않고 기록으로 남는다.

흐름(`documents.js`의 `EditNewVersion`):

1. 상세 모달에서 `수정하여 새 버전 저장` 버튼을 누르면 편집 영역이 펼쳐지고, 현재 버전 본문이 편집창에 채워진다.
2. 내용을 고치고 선택적으로 변경 메모(예: `지원동기 보강, 문장 다듬기`)를 적는다.
3. `새 버전으로 저장`을 누르면 `POST /api/cover-letters/{id}/versions`로 새 버전이 생성된다. 이때 출처는 `source: 'edit'`(`직접 수정`)으로 기록된다.
4. 저장 후 타임라인이 갱신되고, 방금 저장한 버전이 최신으로 올라온다.

이 설계의 의도:

- **이력 보존** — AI가 생성한 버전과 사람이 고친 버전이 출처 라벨로 구분되어 한 타임라인에 공존한다.
- **되돌리기 가능** — 어떤 버전이든 `현재 버전으로 지정`(`PUT .../current-version`)으로 다시 활성화할 수 있다. 직접 수정이 곧 파괴가 아니다.
- **내보내기 분리** — 보관·열람과 별개로 MD/HTML 내보내기(`/api/export/cover-letter/{id}`)는 읽기 전용 GET이라 토큰 없이 동작한다.

문서(이력서·경력기술서)는 버전 타임라인 대신 단일 본문 수정(`PUT /api/documents/{id}`) 모델을 쓴다. 자기소개서만 버전 누적이 의미 있다고 보고 차등 적용했다.

---

## 6. 접근성

복잡한 ARIA를 쌓기보다, 시맨틱 마크업과 키보드·포커스 기본기를 지킨다.

- **포커스 가시성**: `:focus-visible`에 `2px` 악센트 아웃라인(`outline-offset: 2px`). 키보드 사용자가 현재 위치를 항상 알 수 있다.
- **아이콘 버튼 라벨**: `IconBtn`은 `aria-label`을 자동으로 붙인다(`title || name`). 글자가 없는 버튼도 스크린리더가 읽는다.
- **모달 키보드**: `openModal`은 `Escape`로 닫히고, 열릴 때 첫 입력 요소(`input,textarea,select,button`)에 포커스를 준다. 스크림 클릭으로도 닫힌다.
- **색에만 의존하지 않음**: 상태 배지는 색뿐 아니라 라벨 텍스트와 점을 함께 제공한다. 점수도 색(`score-strong/mid/weak`)과 숫자(`N점`)를 같이 보여준다.
- **시맨틱 요소**: 표는 `table/thead/th/tbody`, 제목은 `h1~h4`, 폼은 `label`과 컨트롤을 `Field`로 묶는다.
- **시스템 테마 존중**: `prefers-color-scheme`를 따라가므로 OS의 다크 선호를 자동 반영한다.

라이브 영역(toast 등)과 포커스 트랩 등은 추후 보강 여지가 있는 지점으로 남겨 둔다.

---

## 7. 참고 서비스의 영향과 차별점

`styles.css` 주석이 밝히듯 **Linear / Notion / Raycast의 절제**에서 톤을 빌렸다.

| 서비스 | 빌려온 것 |
| --- | --- |
| **Linear** | 조밀한 정보 밀도, 키보드 친화, 차분한 단색 악센트, 상태 칸반 |
| **Notion** | 중립 팔레트, 부드러운 카드·경계선, 콘텐츠 우선의 차분한 표면 |
| **Raycast** | 군더더기 없는 표면, 빠른 액션, "도구다움"의 미니멀함 |

차별점:

- **완전 오프라인·로컬 전용**: 프레임워크·CDN 없이 동작하고(`styles.css` 주석: *"works fully offline; nothing leaves the machine"*), 모든 데이터가 로컬에만 남는다. 위 서비스들이 클라우드 SaaS인 것과 정반대다.
- **MCP-우선, LLM 내장 없음**: 화면은 AI가 채우지만, 제품 자체는 "AI 앱"으로 보이지 않게 의도적으로 절제했다(§1.2). 분석·작성은 사용자의 AI가, 보관·구조화·열람은 CareerMate가 맡는다.
- **단일 도메인 특화**: 범용 노트(Notion)나 이슈 트래커(Linear)가 아니라, "취업 준비 한 사이클"(공고 → 적합도 → 자기소개서 → 지원 상태 → 면접)에 정확히 맞춘 정보 구조와 상태 모델을 갖는다.
- **빌드리스 바닐라**: 디자인 시스템이 CSS 변수 토큰 + 소수의 JS 컴포넌트로만 이뤄져, 번들러·런타임 의존성이 없다. 무거운 디자인 시스템 패키지 대신 `lib.js` 한 파일이 그 역할을 한다.

---

## 관련 문서

- 화면 작성 규칙: [`apps/web/UI_CONTRACT.md`](../../apps/web/UI_CONTRACT.md)
- 참고 구현(Home): [`apps/web/public/pages/home.js`](../../apps/web/public/pages/home.js)
- 디자인 토큰·스타일: [`apps/web/public/styles.css`](../../apps/web/public/styles.css)
- 컴포넌트·API 클라이언트: [`apps/web/public/lib.js`](../../apps/web/public/lib.js)
