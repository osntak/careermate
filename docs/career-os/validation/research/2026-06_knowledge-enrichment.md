# 지식 보강 리서치 — 앵커데이터 우선 (2026-06-26)

> 보조 문서(런타임 소비 경로 아님). `validation/research/`의 리서치 출처 모음에 속한다.
> 이 라운드의 산출물(앵커데이터 자산)은 `knowledge/anchors/`에 둔다.

## 0. TL;DR

4개 도메인(자소서·경력기술서·면접·적합도)에 대해 **검증된 외부 리서치 + 기존 코퍼스 대비 갭 분석**을 멀티에이전트로 수행했다. 결론은 한 줄이다:

> **산문(지침) 코퍼스는 이미 완성되어 있다. 새로 추가할 산문은 0건이고, 유일한 품질 레버는 "코퍼스가 Phase B로 약속만 하고 만들지 않은 구조화 앵커데이터"를 실제로 materialize 하는 것이다.**

이는 검증 루프 R7~R15의 핵심 교훈(*지침 양↑ ≠ 품질↑, 과적재는 환각·회귀; 레버 = 갭 + LLM이 앵커할 데이터*)과 정확히 일치한다. 4개 도메인의 synth가 **독립적으로 모두 `addAsReference=0`** 를 반환했다.

| 도메인 | 새 산문 | 중복(이미 커버) | 앵커데이터 자산 | EOP 변경 제안 |
|---|---|---|---|---|
| 자소서 | 0 | 24 | **2종** | 0 |
| 적합도 | 0 | 23 | **4종** | 2 (게이트) |
| 면접 | 0 | 27 | **1종** | 0 |
| 경력기술서 | 0 | (코퍼스 매우 충실) | **후보 다수** (검증 누락 — §3.4) | 0 |

## 1. 배경·방법

- **요청:** "자소서·경력기술서·모의면접·적합도에 필요한 검증된 정보를 최대한 찾아 정리하고, EOP·지식에 어떻게 통합해야 LLM 능력이 향상될지 판단해 진행."
- **제약(필수):** 코퍼스는 이미 대학 커리어센터·NCS·ATS 벤더 등 [1차]/[2차] 출처로 충실하고, 자체 교차검증이 **지침 추가는 회귀**(자소서 보강 median 94→68 기각)임을 증명했다. 따라서 (1) 진짜 커버리지 갭과 (2) LLM이 발명 대신 앵커할 구조화 데이터만 노린다.
- **방법:** 도메인 × 5개 권위 앵글 팬아웃 → 적대적 출처검증(인용 URL 실재·정확성, 미확인 기각) → 도메인별 통합 설계 → 통합 계획.
- **운영 메모:** 워크플로우 런타임이 마지막 Plan 단계 직전에 hung(career-description 파인더 1개 stall → 해당 도메인 체인·pipeline 배리어 정지). synth 3종(자소서·적합도·면접)은 완료됐고, career-description은 파인더 리서치까지 복구했다(§3.4). Plan 산출물은 본 문서로 대체한다.

## 2. 헤드라인 결론

1. **산문 추가 금지가 옳다.** synth 3종 모두 `addAsReference=[]`. 70+ 항목이 "이미 cover-letter.md / fit-matching.md / interview-*.md / eop·verifier에 있음"으로 중복 판정.
2. **레버는 앵커데이터.** 코퍼스가 반복적으로 "Phase B 도구 아이디어"로만 적어둔 것들(KR 문항 스키마, 동사 레지스터, 전이스킬 등가, 녹아웃 택소노미, count_mode 룩업, 역량 enum)을 실제 데이터로 만들면, LLM이 매 실행마다 **재발명**하던 값을 **조회**하게 된다 → 환각·불일치 감소.
3. **EOP는 게이트.** 앵커데이터를 생성 경로에서 실제로 소비하게 묶는 배선(EOP 참조 줄, get_playbook/get_verifier attach)은 LLM 추론 경로를 바꾸므로 **무음 적용 금지** — K=5 A/B 검증 후에만.

## 3. 도메인별 결과

### 3.1 자소서 (cover-letter)

- **앵커데이터 2종** → `knowledge/anchors/`
  1. **`kr-question-directives`** (question-bank): `question_type`(지원동기·성장과정·직무역량·입사후포부·약점/실패/갈등) → `{aliases, hidden_intent, required_directives, length_default, R4_quant_exempt, anti_pattern}`. 코퍼스가 의도 산문은 갖췄으나(`responsiveness-on-target` C2, EOP §2-2) 머신 조회용 스키마는 미구현. `R4_quant_exempt`는 약점·성장·포부 문항이 "정량 ≥1" 게이트에 잘못 걸리는 걸 막는다.
  2. **`charcount-modes`** (dictionary): 플랫폼/맥락 → `count_mode(with_space|no_space|byte)` + byte/한글. 코퍼스가 "count_mode는 공고마다 갈린다(가장 흔한 실격 사유)"라 반복하면서 플랫폼별 기본값을 안 줌 → LLM이 매번 추측. 미지정 시 fail-safe=byte 가정 + 1회 확인.
- **출처:** 코퍼스에 **이미 인용된** 출처만 사용(jasoseol 문항의도, HAIJOB 항목별, jobkorea textcount 등). 신규 sourcing 없음.
- **게이트 불필요:** 두 자산 모두 advisory 룩업 데이터일 뿐 게이트 임계값(R4/R9/C2/C6)을 바꾸지 않는다. 단, 향후 디렉티브 행이 게이트 pass/fail을 **자동 플립**하도록 배선하면 그 배선은 load-bearing → K=5 필요.

### 3.2 적합도 (fit-analysis)

- **앵커데이터 4종** → `knowledge/anchors/`
  1. **`seniority-verb-register`** (dictionary): 동사 → 시니어리티 tier(entry/mid/senior/lead) ko/en + scope_mismatch 규칙. EOP가 "동사 레지스터로 시니어리티 추론"을 지시하나 3-tier 예시만 줘 LLM이 임의 동사를 임의 tier로 발명. **tier는 SIGNAL이며 hard knockout 아님 — `[추정—출처에 없음]` 라벨 유지.**
  2. **`transferable-skill-adjacency`** (dictionary): 도구 등가(`JS↔JavaScript`, `GA4↔구글애널리틱스`…) + 스킬 인접성(`AWS↔GCP moderate`, `A/B테스트↔실험설계 strong`…) with strength·why. adjacency는 'partial'만 라이선스(절대 'met' 아님), 증거는 사용자 이력서 불릿이 제공.
  3. **`knockout-criteria-taxonomy`** (taxonomy): 카테고리 → `is_hard_knockout(always/conditional/never)` + binary_test + 예시 + inflation_warning(우대=가점≠녹아웃, 연차 인플레이션, 한국 채용절차법 학력 가드). "이게 녹아웃인가?" 결정을 일관화.
  4. **`fit-self-check-rubric`** (rubric): R1~R10을 get_verifier가 serve하는 구조화 형태로 컴파일(**0 신규 내용**, fit-matching.md §3 + eop §5 verbatim 재구성).
- **EOP 변경 제안 2건 (둘 다 `needsValidation=true` — K=5 게이트):**
  - (a) `eop/fit-analysis.md` §3·§0a에 "동사/전이/녹아웃 판정 시 위 사전 참조" 1줄 추가. → 추론 경로 변경 가능(partial·녹아웃 빈도) → 게이트.
  - (b) `fit-self-check-rubric`을 `get_verifier({id:fit-matching})` serve 경로에 배선. → 0 신규 내용이나 소비 경로(load-bearing) 변경 → "동일 입력 동일 판정" 무회귀 증거화 필요.

### 3.3 면접 (interview)

- **앵커데이터 1종** → `knowledge/anchors/`
  1. **`competency-enum`** (taxonomy): `interview-behavioral.md` §3에 **인라인**으로만 존재하는 12개 역량 enum(leadership/ownership/conflict/failure-learning/initiative/data-driven/customer-focus/collaboration/deadline-pressure/ambiguity/influence/mentoring)을 단일 원본 파일로 승격. EOP·behavioral·technical 세 문서가 같은 리스트를 각자 재진술 → 드리프트 발생. 단일화하면 `save_interview_prep`가 distinct-count를 결정론적으로 검증 가능, 태그 인플레이션(R7/R11) 방지. **인라인 리스트의 리팩터(신규 내용 0).**
- **EOP 변경 0.**

### 3.4 경력기술서 (career-description) — ⚠ 검증 단계 누락

워크플로우가 이 도메인의 파인더 1개에서 hung되어 **적대적 출처검증과 synth가 실행되지 않았다.** 파인더 리서치는 완료됐고(아래), 코퍼스 자체는 4파일(resume·ats·career-description·job-analysis)로 매우 충실하다(coverage thinAreas 13개 식별). 아래는 **후보**이며, 코퍼스에 쓰기 전 출처 재검증을 거친다.

- **[1차] 공식(고신뢰, 검증 후 자산화 가능):**
  - NCS **경력(금전적 보수 받음) vs 경험(보수 없이 수행)** 공식 구분 — 코퍼스는 '경험기술서'를 모호하게만 앎.
  - NCS 블라인드 표준지원서 섹션 구조 / 직무기술서(JD) 표준 필드 / **직업기초능력 10개** 택소노미(의사소통·수리·문제해결·자기개발·자원관리·대인관계·정보·기술·조직이해·직업윤리).
- **[2차] 시장(보류 — 출처 재검증 필수):**
  - Wanted "정량화 이력서" 벤치마크(서류합격 이력서가 정량표현 36%↑, 합격률 +13%p) — 파인더 자신이 "원출처 확인 필요"로 표시. **검증 전 자산화 금지.**
  - 직무별 winning 키워드(개발자·PM, 3M Wanted 이력서) / Searchright 3-템플릿(역순연대기식·직무중심식·혼합형) — 벤더 블로그, 검증 후 advisory로만.
- **조치:** 본 라운드에서는 **[1차] NCS 공식 항목만** 검증 후 `knowledge/anchors/ncs-official.md`로 자산화. [2차] 통계·키워드는 후속 검증 과제로 남긴다(coverage thinAreas와 함께).

## 4. 통합 계획

사용자 승인 방침 = **가산형 중심 + 게이트드 EOP.**

### 4-A. 가산형 (지금 적용 — 회귀 위험 0)

새 `.md` 파일은 `EXPERT_DOMAINS`(고정 16) 밖이라 빌드·typecheck·serve에 영향 없음. 순수 추가.

| 산출물 | 위치 | 비고 |
|---|---|---|
| `kr-question-directives.md`, `charcount-modes.md` | `knowledge/anchors/` | 자소서 앵커 2 (이미 인용된 출처만) |
| `seniority-verb-register.md`, `transferable-skill-adjacency.md`, `knockout-criteria-taxonomy.md`, `fit-self-check-rubric.md` | `knowledge/anchors/` | 적합도 앵커 4 |
| `competency-enum.md` | `knowledge/anchors/` | 면접 앵커 1 (인라인 리스트 단일화) |
| `ncs-official.md` | `knowledge/anchors/` | 경력기술서 [1차] 공식만, 검증 후 |
| `anchors/README.md` | `knowledge/anchors/` | 디렉터리 규약(advisory·`_meta` version/sourceDate·serve는 게이트) |

각 자산은 `_meta{ version:1, sourceDate:2026-06-26, sources:[…], status:advisory }`를 갖고, 의도/anti-pattern 같은 의미 필드는 `ai-judge`로 명시한다.

> **업데이트(2026-06-26, serve-wiring 구현됨):** 처음엔 자산을 staged로만 두고 배선을 게이트로 미뤘으나, 사용자 명시 승인으로 **serve-wiring을 구현**했다 — `get_playbook({domain})` 출력에 그 도메인 앵커를 자동 첨부(`renderDomainAnchors`, 추가 왕복 0), 신규 `get_anchor({asset})` 도구(read-only, SAFE), `get_workflow_guide` 라우트 안내에 "첨부 앵커" 한 줄. 권한 4곳 동기화(`tools.ts` 레지스트리·`manifest.json`·`init.ts` SAFE_TOOLS·`docs/MCP_TOOLS.md`). typecheck·86/86 테스트(test-init 드리프트 가드 포함)·기능검증 8/8·빌드 모두 green. **이제 앵커는 런타임에 LLM에 닿는다(라이브).** 코드: `packages/knowledge/src/index.ts`, `packages/mcp-tools/src/tools.ts`.

### 4-B. 게이트드 EOP / serve-wiring (K=5 A/B 검증 후에만)

| 변경 | 이유 | 정본 절차 |
|---|---|---|
| `eop/fit-analysis.md` §3·§0a 사전 참조 1줄 | 추론 경로(partial·녹아웃 빈도) 변경 가능 | `validation/PROTOCOL.md` §10 (K≥5 median, 결함 ≥⌈K/2⌉ 재현 시만 인정) |
| `get_playbook`/`get_verifier`가 앵커데이터를 attach serve | 소비 경로(load-bearing) 변경 — 주입량↑ | 동일 게이트 + "동일 입력 동일 판정" 무회귀 증거 |
| 디렉티브 행이 게이트 pass/fail 자동 플립(자소서 R4 자동면제 등) | 게이트 동작 변경 | 동일 게이트 |

> 4-B는 본 라운드에서 적용하지 않는다. 자산이 준비되면 별도 브랜치에서 게이트를 돌려 무회귀를 증거화한 뒤 머지.

### 4-C. 실행 순서

1. (now) 4-A 자산 파일 생성 + 참조 줄 + 빌드 확인 → 커밋.
2. (후속) career-description [2차] 통계·키워드 출처 재검증 → 통과분만 추가.
3. (게이트) 4-B serve-wiring을 K=5 A/B로 검증 → 통과분만 머지.

## 5. 출처(등급)

- **[1차]** NCS/직업기초능력·직무기술서(ncs.go.kr), 블라인드 표준지원서(alio.go.kr), 자소서 도메인 기존 인용(Harvard FAS·Georgetown·Princeton·Yale OCS·U Maryland·U Cincinnati), 적합도/면접 기존 인용(I/O 심리학 구조화면접 타당도 등 — 각 도메인 `.md` §출처 참조).
- **[2차]** Wanted/Searchright/jobkorea/HAIJOB/jasoseol(시장·플랫폼; advisory, 인과 주장은 일화적).
- 상세 출처는 각 자산 파일의 `_meta.sources`와 기존 도메인 `.md`의 §출처에 둔다. **신규 sourcing은 4-A에서 [1차] 공식만 추가.**

## 6. 상태·후속

- **적용·검증 완료(라이브):** `knowledge/anchors/` 자산 8종 + README **+ serve-wiring**(get_playbook 자동첨부·`get_anchor` 도구·라우트 안내·권한 4곳 동기화). typecheck exit0·86/86 테스트·기능검증 8/8·빌드 exit0.
- **아직 게이트(K=5 A/B 필요, 미적용):** `eop/fit-analysis.md` §0a·§3에 "동사 레지스터/전이스킬/녹아웃 판정 시 사전 참조" **명시 지시 줄**(synth eopChangeProposals — LLM 추론 경로를 바꾸므로). 현재는 `renderDomainAnchors`의 일반 안내("수치·등급·분류·동사 레벨을 발명하지 말고 첨부 데이터에서 찾아라")로 대부분 커버되나, EOP §3 정밀 배선은 게이트 뒤.
- **보류(출처검증 후):** career-description [2차] 통계·키워드(Wanted +13%/36% 등).
- **원천 데이터:** 본 라운드 워크플로우 산출물(synth 3종·coverage 4종·findings 19종)은 세션 스크래치에 보존. 정본 결론은 본 문서.
