# CareerMate 대시보드 — 디자인 가이드 (안티-AI-슬롭 규칙집)

이 문서는 CareerMate 웹 대시보드의 **디자인 원칙과 컨벤션**입니다. `UI_CONTRACT.md`가 "페이지를 *어떻게* 짜는가(컴포넌트·API 계약)"라면, 이 문서는 "결과물이 *어떻게 보여야 하는가*"를 규정합니다. **새 화면을 만들거나 기존 화면을 고치기 전에 반드시 읽고**, 마지막의 감사 체크리스트로 자가 점검하세요.

근거: Anthropic `frontend-design`/`interface-design` 스킬, Linear·Vercel(Geist)·Notion·Stripe·shadcn 디자인 가이드, Refactoring UI, Polaris, NN/g. (출처는 맨 아래.)

> 북극성: **"누가 봐도 AI가 만든 것 같다"의 반대.** 차분하고 밀도 있고, 정보가 먼저 오고, 장식이 아니라 위계로 말한다. Linear/Notion/Raycast의 절제.

---

## 0. AI 슬롭 5대 증상 (이 프로젝트에서 실제로 발견된 것)

1. **제목 중복** — 같은 단어가 사이드바 active + 상단바 + 페이지 `<h1>`로 3번.
2. **버튼 중복** — 동일한 1차 액션("공고 추가")이 상단바 + 페이지헤더 + 빈 상태에 동시에.
3. **필러 설명문** — 제목을 그대로 풀어 쓴 "…를 한눈에 보고 …확인/관리하세요".
4. **반복 보일러플레이트** — "ChatGPT/Claude에게 …하면 자동으로 저장됩니다"가 화면마다.
5. **과한 카드화** — 빈 상태 하나도 카드로 감싸고, 카드 안에 카드.

이 5가지가 보이면 슬롭입니다. 아래 규칙으로 제거합니다.

---

## 1. 핵심 규칙 (Rulebook)

1. **제목은 한 곳에만 — 상단바.** 현재 화면 제목은 **앱 셸 상단바**가 한 번만 표시한다(사이드바 active는 위치 표시일 뿐, 콘텐츠에서 제목을 반복하지 않는다). 인덱스 페이지(채용공고/지원현황/문서/면접/프로필)에는 in-content `PageHead` `<h1>`·설명을 **두지 않고** 곧장 콘텐츠로 시작. 예외: 상세(`jobs/:id`)는 회사명을 in-content `<h1>`으로 가진다(nav가 못 보여주는 콘텐츠).
2. **1차 액션은 한 개, 한 곳(상단바 `ctx.setActions`).** `PageHead({actions})`·빈 상태의 중복 버튼 금지. 리스트가 비었을 때만 빈 상태에 생성 CTA를 두고, 그 핸들러는 상단바와 동일.
3. **필러 설명 금지.** 설명 줄은 *수치·제약·상태·자명하지 않은 이유*를 말할 때만 허용. 제목을 바꿔 말하면 삭제. **"한눈에" 금지.**
4. **설정/MCP 안내는 단 한 곳(홈 '시작하기' 카드)에만.** 빈 상태는 화면별 **고유 한 문장**. "ChatGPT/Claude에게 …저장됩니다" 반복·`MCP_HINT` 공용 상수 금지.
5. **위계는 타이포·여백으로, 박스로 X.** 단일 빈 상태/단일 블록을 `.card`로 감싸지 않는다. 카드는 **반복·선택 가능한 객체**(공고 행, 자소서, 보드 카드)에만. **카드 in 카드 금지.**
6. **악센트(에메랄드 `--accent: #0f7256`)는 절제.** 1차 버튼·링크·포커스 링·active nav에만. 랜딩(site)과 동일한 크림 페이퍼 + 에메랄드 팔레트로 통일(인디고 폐기). **장식용 보라 그라데이션 금지** (`.sidebar__logo`, `.progress__bar`의 `135deg accent→#7c3aed`는 평면 `var(--accent)`로). 코드에 raw hex 금지 — 색은 CSS 변수로만.
7. **버튼 라벨은 동사+명사, 흐름 내내 일관.** 모달 저장 버튼은 `저장`이 아니라 **`공고 저장`/`경력 저장`**. 생성 라벨과 성공 토스트의 명사가 일치(`공고 저장`→`공고를 저장했습니다`). 맨동사는 `취소`·`닫기`·`복사`만.
8. **인덱스 페이지는 툴바+행으로 직행.** 설명 헤더 블록은 settings/profile/온보딩/상세에만. 상세(`jobs/:id`)의 회사명 `<h1>`은 nav가 못 보여주는 *콘텐츠*이므로 유일한 정당한 예외.
9. **숫자 열은 우정렬 + `.tnum`.** 적합도 점수·파일 크기 등은 `text-align:right`로 자릿수를 정렬.
10. **여백은 스케일에 스냅.** 4/8/12/16/24/32. 페이지 모듈의 일회성 인라인 px(`'9px'`, `'8px 0'`, `'440px'`…) 금지 — `.stack-*`/`.gap-*`/`.mt-*` 유틸 또는 토큰 사용.

---

## 2. 감사 체크리스트 (커밋 전 grep)

```
한눈에                         → 0건이어야 함 (필러 설명 시그니처)
확인하세요|관리하세요|관리하고   → 제목 재진술 설명이면 삭제
ChatGPT/Claude|자동으로 저장     → 최대 1건(홈 시작하기 카드)
MCP_HINT                        → 삭제 (화면별 고유 문구로)
공고 추가 (단일 1차 라벨)        → 한 화면에 1번만
Btn('저장'                      → 동사+명사로 (공고 저장 등)
linear-gradient (styles.css)    → 장식 보라 그라데이션 2건 제거
#7c3aed / pages 내 raw hex       → CSS 변수로
Card( 가 EmptyState( 를 감쌈     → 카드 제거
class:'card' in card body        → 카드 in 카드 제거
PageHead( (인덱스 페이지)        → 제거 (상단바 제목으로 충분; 홈 인사·jobs 상세만 허용)
```

추가 육안 테스트(페이지마다):
- **눈 가늘게 뜨기 테스트**: 채워진 악센트(에메랄드) 버튼은 정확히 1개. 2개가 경쟁하면 하나를 ghost로 강등.
- **h1 개수**: 인덱스 0개(사이드바가 제목) / 상세·설정·프로필 1개. h1→h3 건너뜀 없음.
- **빈 상태 형태**: 제목 + 고유 한 문장 + (있다면) 버튼 1개. 검색결과 없음은 '필터 초기화'지 생성 CTA가 아님.

---

## 3. 페이지 셸 컨벤션 (제목·액션의 단일 출처)

- **제목** = 상단바(`#topbar-title`). `app.js`가 nav 라벨로 한 번 설정하며, 콘텐츠 안에서 이를 반복하지 않는다(인덱스 페이지 in-content `PageHead` 제거). 상세 페이지는 `ctx.setTitle()`로 맥락(회사명 등)을 덮어쓴다.
- **1차 액션** = 상단바 `#topbar-actions`(`ctx.setActions([...])`), 우측 정렬. 화면당 최대 1개의 `btn--primary`.
- **PageHead 사용처**: 홈(인사 배너), 프로필·설정(h1 + 진짜 상태 줄), 공고 상세(회사명 in-content 헤더). 그 외 인덱스 페이지에서는 사용하지 않음.
- 모든 라우트에서 이전 페이지 액션이 새지 않도록 `clear(actionsEl)` 유지(이미 됨).

---

## 4. 마이크로카피 규칙 (예시 포함)

- **길이 예산**: 페이지 제목 ≤ 약 12자(명사구) · 버튼 2~4단어 · 빈 상태 본문 한 문장 ≤ 약 40자 · 에러는 "무엇이 왜 + 어떻게"를 한 문장.
- **빈 상태(화면별 고유, MCP 설명 없이)**
  - 채용공고: `저장된 공고가 없어요` / `관심 있는 채용공고를 추가해 적합도와 진행 상태를 관리해 보세요.` · CTA `공고 추가`
  - 적합도(상세): `적합도 분석 전이에요` / `이 공고와 내 프로필을 비교한 분석 결과가 여기에 표시됩니다.`
  - 자기소개서: `아직 자기소개서가 없어요` / `작성하거나 붙여넣어 버전과 함께 보관하세요.` · CTA `새 자기소개서`
  - 면접: `면접 준비 자료가 아직 없어요` / `예상 질문과 1분 자기소개를 정리해 두면 한곳에서 연습할 수 있어요.`
  - 문서: `저장된 문서가 없어요` / `이력서·경력기술서·포트폴리오 텍스트를 보관하세요.` · CTA `문서 추가`
  - 검색결과 없음: `조건에 맞는 항목이 없어요` + `필터 초기화` (생성 CTA 아님)
- **버튼·토스트 일치**: `공고 저장`→`공고를 저장했습니다`. 에러는 제품 보이스로(`회사와 직무를 입력해야 저장할 수 있어요.`), 막연한 `오류` 금지.
- **자격 미달 상태**(면접 단계 전, 분석 전)는 가짜 CTA 대신 차분한 설명 한 줄, 버튼 없음.

---

## 5. 패턴별 지침

- **페이지 헤더**: 인덱스는 헤더 없이 툴바+리스트로 직행. 설명 줄은 수치/상태만(`면접 준비 대상 ${n}곳`처럼).
- **버튼 위계**: 화면당 `btn--primary` 1개. 보조는 `btn--ghost`/텍스트. 상세 페이지의 `수정`은 상단바 1개만, `삭제`는 위험 액션이므로 보조/케밥으로.
- **리스트/테이블**: 1px 하단 헤어라인, 균일 패딩, 숫자 열 우정렬+`.tnum`, 클릭 행 ≥44px. 가능하면 `ListRow` 프리미티브 재사용.
- **빈 상태**: `EmptyState` 컴포넌트만(카드로 감싸지 않음). 제목+한 문장+버튼≤1.
- **카드/과카드화**: `.card`는 반복·선택 객체에만. 단일 빈 상태·프로필 하위 항목·모달 내부 행은 카드로 감싸지 말고 `.stack-*`+`.divider`로 구분. 카드 in 카드 금지.
- **여백·타이포·색**: 인라인 px → 유틸/토큰(4/8/12/16/24/32). 3단계 텍스트 램프(`--text`/`--text-secondary`/`--text-tertiary`) 유지. heading weight ≤ 650 유지(이미 됨). 보라 그라데이션 제거, 악센트는 평면.
- **폰트**: Pretendard를 **self-host**(`/fonts/PretendardVariable.woff2` + `@font-face`)해 시스템 폴백이 아니라 의도한 서체가 모든 기기에서 항상 렌더되게 한다. *선언만 하고 로드 안 하면 결국 Segoe UI·맑은 고딕 같은 시스템 기본(=제네릭)으로 떨어진다 — "디폴트는 인프라에 숨는다".* Inter/Roboto/Arial 같은 "AI 디폴트 폰트"는 1차 서체·폴백 어디에도 쓰지 않는다.

---

## 출처
- Anthropic `frontend-design` 스킬 — <https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md>
- Anthropic `claude-code` frontend-design 플러그인 — <https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md>
- `interface-design` principles — <https://raw.githubusercontent.com/Dammyjay93/interface-design/main/.claude/skills/interface-design/references/principles.md>
- awesome-design-md: Linear / Vercel(Geist) / Notion / Stripe DESIGN.md — <https://github.com/VoltAgent/awesome-design-md>
- Geist Button — <https://vercel.com/geist/button> · Polaris Page actions — <https://polaris-react.shopify.com/components/page-actions>
- Reverse engineering Linear (Header) — <https://pustelto.com/blog/reverse-engineer-linear-1-header/>
- NN/g Headlines & Page Titles — <https://www.nngroup.com/articles/microcontent-how-to-write-headlines-page-titles-and-subject-lines/>
- Refactoring UI 요약 · Impeccable slop catalogue — <https://impeccable.style/slop/>
