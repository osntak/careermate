# 검증 시스템 (6 검증기) — CareerMate Career-OS (Phase B 설계)

> 6개 횡단 검증기(truthfulness, consistency, recency-staleness, responsiveness-on-target, ats-compat, human-voice)를 **verifier-as-data**로 구조화하고, 각 루브릭 항목을 `det`(CareerMate가 LLM 없이 정규식·카운트·임계·커버리지·날짜비교로 계산)와 `ai`(외부 AI 의미판정)로 분리한다. **CareerMate 내부에는 LLM이 없다.** 두뇌(의미판단)는 외부 AI, CareerMate는 루브릭을 데이터로 serve하고 셀 수 있는 항목만 결정론으로 compute한다. 이 문서는 **설계(제안 스펙)** 만 만든다 — 코드·스키마·마이그레이션은 적용하지 않으며, AGENTS.md는 "제안 패치 블록"으로만 보여준다.
>
> **횡단 결정은 [CONTRACT.md](CONTRACT.md)가 정본(충돌 시 우선)이다.** 이 문서는 verifications 테이블(C5)·6 검증기·SHARED_LEXICONS(C2)를 소유하되, grade 타입·도구명·게이트·enum 등 횡단 결정은 CONTRACT을 재정의하지 않고 참조한다.
>
> **Phase 분리(CONTRACT C0, v2):** Phase B는 **B-1(serve-only, 마이그레이션·게이트 0)** 과 **B-2(det 엔진·게이트·verifications·데이터모델)** 로 나뉜다. 본 문서에서 **(B-1)** = `get_verifier`/`get_fact_anchors`/`get_shared_lexicons`로 **루브릭·앵커 데이터만 serve**(차단 없음, 외부 AI 자가검증). **(B-2)** = `check_traceability`/`check_staleness` det compute·save-time 게이트·`verifications` 테이블. 아래 각 스펙에 적용 단계를 표기한다.
>
> **det/ai 출처태깅(CONTRACT C2, v2):** 모든 결과 필드를 `serverComputed`(외부 입력 0으로 CareerMate가 완전 계산) 또는 `aiExtractedInput`(외부 AI가 의미추출해 주입)으로 태깅한다. `aiExtractedInput`이 한 방울이라도 섞이면 `det`/`hard`/게이트로 표기 금지(`mixed`). `freshness_ratio`(recent-fact 매핑=ai)·`proper_nouns`/`titles`/`credentials` 앵커 추출(=한국어 NER=ai)이 대표적 금지 사례다.
>
> Phase A 지식: [knowledge/verifiers/truthfulness.md](../knowledge/verifiers/truthfulness.md) · [consistency.md](../knowledge/verifiers/consistency.md) · [recency-staleness.md](../knowledge/verifiers/recency-staleness.md) · [responsiveness-on-target.md](../knowledge/verifiers/responsiveness-on-target.md) · [ats-compat.md](../knowledge/verifiers/ats-compat.md) · [human-voice.md](../knowledge/verifiers/human-voice.md) · 인덱스 [KNOWLEDGE.md](KNOWLEDGE.md). 현행 아키텍처: [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).

---

## 1. 목적·범위

### 설계하는 것

- **verifier-as-data 스키마 (B-1 데이터 / B-2 계산)**: `@careermate/knowledge` 패키지의 `VERIFIERS: Verifier[]`. 각 `RubricCheck`가 `grade: 'det' | 'ai' | 'mixed'` 를 1급 필드로 가지며, `det`/`mixed`의 결정론 부분만 `DetSpec` discriminated union으로 표현. 데이터 정의는 B-1, 그 `DetSpec`의 실제 det 계산 *로직*은 B-2 `core`에.
- **공유 사전 단일 정본 (B-1)**: `SHARED_LEXICONS`(slop/cliché/hype/filler/quant/temporal). verifier의 `DetSpec`이 `lexiconRefs`로 참조해 resume/ats/cover-letter/human-voice가 한 사전을 공유. `get_shared_lexicons`로 serve(원문은 비공개 serve, anti-gaming).
- **MCP 도구 계약(제안)**: **(B-1 serve)** 루브릭 serve(`get_verifier` — consistency·responsiveness도 별도 도구 없이 이 안에서 루브릭으로 serve), 비교 기준 serve(`get_fact_anchors`). **(B-2 compute)** det compute(`check_traceability`/`check_staleness`). JD 키워드는 별도 추출-serve 도구 없이 `get_application_context`/`get_job_posting`의 job 레코드(`jobs.keywords`/`jobs.requirements`)에서 외부 AI가 추출한다(CONTRACT C3). 모두 `ToolDef` 모양, `get_writing_style_guide`(tools.ts:616-623) 패턴.
- **검증 결과 메타의 저장·소비 모델 (B-2)**: 정규화된 `verifications` 테이블(제안), 그리고 그 메타를 상태 전이의 **advise** 신호로 쓰는 방식. 테이블·게이트·영속은 B-2(마이그레이션 필요).
- **소비 경로 3중 트리거** 배선(description / AGENTS.md 제안 패치 / 출력 넛지). B-1은 게이트 없이 신호등·자가검증 안내만(CONTRACT C7).

### 설계하지 않는 것 (명시적 비범위)

- **코드 구현·실제 마이그레이션 적용**. 모든 스키마·도구·enum·테이블은 "제안 스펙"이다.
- **AGENTS.md / system.ts 실제 수정**. §4.7의 "제안 패치 블록"으로만 보여준다.
- **앵커 추출 자체(자연어 → 구조화 NER)**. 이건 의미판단이므로 외부 AI가 수행한다. CareerMate는 **구조화 필드** 또는 **외부 AI가 넘긴 구조화 입력**만 비교한다(§2 결정 5, §6 리스크 R2).
- **보상 벤치마크 데이터모델**(`compensation_benchmarks` 테이블·`save_compensation_benchmark`·repo)과 **`rejection_reviews`/`hardGate`**: 이들은 verifier의 *선행* 데이터모델이며 별도 형제 문서(EXPERTS / salary-negotiation 라인)로 분리한다. 이 문서는 의존 사실만 §6에 적고 마이그레이션을 제안하지 않는다(리뷰 simplerAlternative 반영).
- **draft→verify→revise 루프의 닫힘**과 **자동 재분석 큐**: [LOOP_ENGINE.md](LOOP_ENGINE.md)/[EVALUATION.md](EVALUATION.md)(작성 예정). 본 문서는 그 루프에 진입하는 *진입점*만 설계한다.

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### 결정 1 — 검증기를 verifier-as-data로 정의하고 `grade`를 1급 필드로 둔다

6개 검증기를 `@careermate/knowledge`의 `VERIFIERS: Verifier[]`로 컴파일한다. 각 `RubricCheck`는 `grade: 'det' | 'ai' | 'mixed'`를 갖고, `det`/`mixed`의 결정론 부분만 `DetSpec`으로 표현한다. `get_verifier`는 `get_writing_style_guide`처럼 **코어 호출 없는 순수 serve**다.

- **근거**: 6개 verifier 문서가 §2에서 항목별 `[det]`/`[ai]` 표기와 측정법을 이미 정의했고, 데이터로 두면 타입 수준에서 "내부 LLM 없음"을 강제한다.
- **코드**: tools.ts:616-623 `get_writing_style_guide`(readOnly:true, inputSchema `{}`, 코어 호출 없이 `HUMANIZE_WRITING_GUIDE` 반환). definitions.ts:9-20 `WorkflowDefinition`(interface + exported const data + getter/render 헬퍼).
- **리뷰 반영(mixed 등급)**: responsiveness-on-target.md §2의 C3·C10은 문서가 **det+ai 혼합**으로 명시한다. `grade: 'det' | 'ai'`로만 두면 원본을 손실 압축하므로 `'mixed'`를 추가하고, `mixed` 항목은 `DetSpec`(결정론 부분)과 `aiPrompt`(의미 부분)를 **동시에** 갖는다(리뷰 missing 반영).

### 결정 2 — `det`/`ai` 분할선을 도구 입출력 타입에 새긴다: `aiExtractedInput` vs `serverComputed` 출처 태깅 (CONTRACT C2 정본)

`check_*`(B-2) 도구의 모든 결과 필드를 **`serverComputed`(CareerMate가 외부 입력 0으로 완전 계산)** 와 **`aiExtractedInput`(외부 AI가 의미추출해 주입한 값)** 로 **출처 태깅**한다. 예: traceability 비율 = `(N_total − N_unanchored) / N_total`에서 `N_total`(정규식 토큰 수)만 `serverComputed`이고, `N_unanchored`는 C1(`ai`)의 출력이라 외부 AI가 `aiExtractedInput`로 넣는다. CareerMate는 그 둘로 **나눗셈만** 한다 → 비율 자체는 입력이 ai라 `mixed`이지 순수 det가 아니다(아래 결과 참조).

- **근거(리뷰 mustFix 반영)**: truthfulness.md §2에서 critical 항목 C1·C2·C3·C5가 전부 `ai`이고 `det`는 C7(placeholder count)·C10(traceability 비율)뿐이다. C10의 분자/분모 `N_unanchored`는 C1(`ai`)의 출력이다. 즉 "간판 det 지표"조차 ai 출력을 입력으로 받는다. 도구 경계에서 어느 필드가 `aiExtractedInput`이고 어느 필드가 `serverComputed`인지 분리하지 않으면 "두뇌=외부 AI, 계산=CareerMate" 분할선이 무너지고 ai 값을 det로 사칭하게 된다(Codex MAJOR1).
- **결과**: `check_traceability`의 반환은 `{ serverComputed: { N_total, placeholder_delta }, aiExtractedInput: { N_unanchored, N_unverified }, mixed: { traceability }, residual_ai_checks: [...] }` 모양으로, **외부 입력 0으로 완전 계산한 부분만** `serverComputed`에, `aiExtractedInput`을 한 항이라도 먹는 비율(`traceability`·`freshness_ratio`)은 `mixed`에 둔다. `aiExtractedInput`이 섞인 값은 `det`/`hard`/게이트로 표기 금지(C2).

### 결정 3 — 게이트 강제력은 출처로 갈린다 → **B-1=게이트 0(자가검증) / B-2=`serverComputed`+hard만 차단, ai/mixed는 advise+넛지**(CONTRACT C0·C4)

**(B-1)** 검증 게이트가 아예 없다 — 외부 AI가 `get_verifier` 루브릭으로 스스로 자가검증하고 CareerMate는 차단하지 않는다(기존 `saveInterviewPrep` 상태게이트만 유지). 아래는 **(B-2)** save-time 게이트 설계다. ai/mixed 체크는 산출물을 **차단하지 않는다**(자가신고는 위조 불가 영역이라 hard 게이트가 false-pass 명예 시스템이 됨). 위반은 출력 넛지(트리거 #3)와 description으로만 안내한다. **예외**: 외부 AI 주입 입력 없이 CareerMate가 저장 산출물·저장 데이터만으로 완전 계산 가능한 **순수 det이고 severity='hard'인 체크**만, save_* 핸들러가 persist 직전 재계산해 위반 시 `fail()`로 거부한다(CONTRACT C4). truthfulness 허위수치(핵심=ai)는 차단 불가 → 강한 넛지 + 기존 "이 수치 확인됨?" save 확인. 능력 해금 hard 게이트는 기존 `saveInterviewPrep`(서버 소유 *상태값* 검사)뿐이며, verifier는 전이 경로에 새 throw를 더하지 않는다.

- **근거(리뷰 mustFix 반영, 게이트 강도 미결을 결정으로 승격)**:
  1. **false-pass 비대칭**: applied+ 전환 전 "truthfulness critical=0" hard throw를 두면, 게이트가 읽는 `verification` 메타는 외부 AI가 *자기 보고*하는 값이다. AI가 검증을 건너뛰고 메타를 안 넣으면 `ai_reported_json`의 critical 카운트가 부재 → 게이트 통과(false pass). 반대로 "메타 부재=fail"로 두면 모든 합법적 수동 전이까지 막혀 UX가 파탄난다. `saveInterviewPrep`의 `INTERVIEW_UNLOCK_STATUSES` 게이트는 **서버가 소유한 상태값**을 보므로 우회 불가하지만, 검증 게이트는 **외부 AI가 넘긴 메타**를 보므로 동급이 아니다. → 동급인 척하지 않는다.
  2. **전이 게이트 배선 부재(아래 결정 4)** 때문에, "기존 검증된 전이 throw에 verifier를 얹는다"는 전제 자체가 거짓이다.
  3. statusGatingModel이 이미 "det는 readiness *advise*만, 전이는 사용자/AI 몫"이라 했으므로 **전이 게이트**는 그 입장으로 일관 수렴한다. 단, **산출물 저장(save_*) 시점**의 순수 det+hard 체크는 외부 AI 주입 없이 CareerMate가 완전 계산하므로 위조 불가 → 여기에 한해 persist 직전 `fail()` 차단이 정직하게 성립한다(CONTRACT C4).
- **코드**: services.ts:160-165 `updateApplicationStatus`의 `hint`(save_interview_prep 넛지)가 출력-넛지 선례. 검증 advise는 이 `hint` 어휘를 확장한다(새 제어 흐름 없음).

### 결정 4 — 상태 전이 합법성 강제 지점은 `services.ts`가 아니라 `repositories.ts`다 (사실 정정)

코드 정밀 확인 결과, `updateApplicationStatus`(services.ts:145-168)는 `assertStatusTransition`/`canTransitionStatus`를 **호출하지 않는다**. 전이 합법성은 그 아래 `applicationRepo.setStatus`(repositories.ts:762)와 `upsert`(:751)가 `assertStatusTransition`을 호출하며 강제한다. `enums.ts`(:79/:85)는 규칙을 *정의*만 한다.

- **설계 함의**: 이전 스파인/codeFactsConfirmed의 "`updateApplicationStatus`가 전이를 server-enforce" / "`enums.ts`가 server-enforced legality" 서술은 **부정확**하다. 따라서 만약 verifier 게이트를 둔다면 그것은 "기존 전이 게이트 재사용"이 아니라 *새 진입점 신설*이다. 결정 3에서 verifier 게이트를 advise로 두므로 이 신설은 회피되지만, 본 문서는 사실을 정정해 후속 문서가 같은 오류를 답습하지 않게 한다.
- **코드**: repositories.ts:751/762 `assertStatusTransition`; services.ts:145-168 `updateApplicationStatus`(assert 호출 0건); shared/enums.ts:79/85 정의부.
- **규칙**: 새 `save_*`/상태변경은 `applications.status`를 직접 쓰지 말고 `updateApplicationStatus`(→ `setStatus`) 경유 — 이래야 전이 불변식이 repo 레이어에서 한 번에 강제된다.

### 결정 5 — 앵커 추출은 외부 AI 책임, CareerMate는 비교만 (단일 책임 확정, CONTRACT C2·C3)

`get_fact_anchors`**(B-1 serve)** 는 **이미 구조화된 저장 필드만** serve한다(freshness 앵커는 별도 도구를 만들지 않고 B-2 `check_staleness`가 날짜비교로 흡수). 자유텍스트(경력/프로젝트 본문)에서 numbers/`proper_nouns`/`titles`/`credentials`를 뽑는 것은 한국어 NER = 의미판단이므로 CareerMate가 하지 않는다(이 추출은 `aiExtractedInput`이지 `serverComputed`가 아니다, C2). 자유텍스트 대조가 필요하면 외부 AI가 앵커를 추출해 `aiExtractedInput`로 B-2 `check_*`에 넘긴다.

- **근거(리뷰 missing R2 반영)**: truthfulness.md §2가 "한국어 NER·실세계 사실확인은 결정론으로 100% 셀 수 없다"고 자인한다. 따라서 두 컴포넌트의 책임을 단일화한다 — 앵커 *추출*은 외부 AI, CareerMate는 (a) 구조화 필드 serve, (b) AI가 넘긴 구조화 입력 비교. "앵커 도구가 자유텍스트에서 추출해 serve"라는 모순된 서술을 제거한다.
- **JD 키워드는 별도 추출-serve 도구 없음(CONTRACT C3)**: `jobs.keywords`/`jobs.requirements` 컬럼(schema.ts:109-110)이 이미 구조화 저장돼 있으므로 신규 `get_jd_keywords` 도구를 만들지 않는다. 외부 AI가 `get_application_context`/`get_job_posting`가 반환하는 job 레코드에서 키워드를 **그대로 읽어** 커버리지 입력으로 쓴다(추출=ai, CareerMate는 카운트만=det). → AGENTS.md "기존 데이터 먼저" 원칙과 정합.

### 결정 6 — det 카운트가 의존하는 사전/패턴은 `SHARED_LEXICONS` 단일 정본에서만 소유

verifier의 `DetSpec.patterns`/`keyword_coverage`는 `lexiconRefs`/id로 `SHARED_LEXICONS`를 참조한다. human-voice의 slop/hype/cliché/filler와 truthfulness/ats의 정량·키워드 패턴이 같은 출처를 공유한다.

- **근거**: KNOWLEDGE.md §3가 "정량·키워드·슬롭 공유 사전"의 정본을 신규 공유 모듈 `get_shared_lexicons`로 못박았다(중복 유지보수·안티게이밍 방지). 기존 `HUMANIZE_WRITING_GUIDE`(`@careermate/prompts`)는 slop-ko/hype/cliché lexicon의 **시드**로 재사용해 `get_writing_style_guide` 하위호환을 유지한다.
- **임계 추적성(리뷰 missing 반영)**: `STALENESS_THRESHOLDS` 등 모든 임계 상수는 출처를 verifier 문서 합격기준에 명시 주석으로 단다(임의 상수 금지 — 이 프로젝트가 산출물에 요구하는 traceability를 설계 문서 스스로 지킨다).

### 결정 7 — 검증 메타는 정규화된 `verifications` 테이블 하나로 (제안) **(B-2)**

`verification_json`을 `cover_letter_versions`/`fit_analyses` 각각에 ALTER로 흩뿌리지 않고, 별도 `verifications` 테이블 하나로 둔다. 이 문서가 테이블 **단일 정본 소유자**다(CONTRACT C5, Codex MAJOR4 구체 스키마). 컬럼은 **출처 태깅 + 사후 drift 스키마**다: `id, artifact_type, artifact_id, artifact_content_hash, resume_content_hash, jd_hash, rubric_id, computed_json`(`serverComputed` det 산출), `ai_reported_json`(외부 AI 자기보고 + `mixed` 산출, '미검증' 표식), `metrics_json`(평탄화된 `Record<string,number>`), `gate_status, checked_at` + `INDEX(artifact_type, artifact_id, checked_at DESC)`. det 계산(`computed_json`=`serverComputed`만)과 외부 AI 자기보고/mixed(`ai_reported_json`)를 컬럼 수준에서 분리해 "두뇌=외부 AI, 계산=CareerMate" 분할선을 영속에서도 정직하게 유지하고, 세 hash 컬럼으로 검증 시점 입력을 박제해 사후 drift를 감지한다. EVALUATION의 score·gateStatus도 이 테이블에 저장(신규 테이블 신설 안 함). 테이블·마이그레이션은 B-2(B-1 미적용).

- **근거(리뷰 simplerAlternative + inconsistentWithCodebase 반영)**:
  - `cover_letter_versions`(schema.ts:91-99)는 append-only 버전 이력이고 `UNIQUE(job_id)`가 없다. `fit_analyses`(:117-129)도 `job_id` UNIQUE가 없다. "산출물 1건의 검증 메타"라는 단일성 가정이 두 테이블의 카디널리티와 안 맞는다.
  - 별도 테이블이면 "어느 행이 canonical인가"는 `artifact_id` FK + `checked_at` 최신으로 해소되고, verifier별로 다른 메타 모양(traceability vs freshness_ratio)은 `metrics: Record<string,number>` 평탄화로 union 직렬화 없이 흡수된다.
  - 마이그레이션이 `CREATE TABLE IF NOT EXISTS` 한 건으로 단순해진다.
- **코드**: schema.ts:91-99/117-129(UNIQUE 부재 확인); :131-133 `applications.job_id`만 UNIQUE.

---

## 3. 컴포넌트·책임·경계

### 3.1 `VERIFIERS` 데이터 모듈 (`@careermate/knowledge`)

- **무엇**: 6개 `Verifier`를 `interface` + `export const VERIFIERS: Verifier[]`로 정의. `getVerifier(id)`/`renderVerifierMarkdown(id)` 헬퍼는 `getWorkflow`/`renderWorkflowMarkdown`를 그대로 미러.
- **어떻게**: `get_verifier` 도구가 통째로 serve. det 항목의 임계/패턴은 `SHARED_LEXICONS`를 `lexiconRefs`로 참조.
- **의존**: `shared`만(ARCHITECTURE.md §2/§8 레이어). NO LLM, NO 런타임 fetch, NO core. 의미판단을 수행하지 않고 `aiPrompt` 문자열만 보유. 산출물을 읽거나 변경하지 않음(serve 전용).

### 3.2 det 평가 엔진 (`packages/core/src/services.ts` 신규 fns) **(B-2)**

- **무엇**: `DetSpec` discriminated union을 LLM 없이 결정론 JS로 평가(pattern/count_threshold/keyword_coverage/staleness/traceability). `check_*` 핸들러가 호출하는 단일 코어 진입점. `serverComputed`(외부 입력 0 계산) + `mixed`(ai 주입 섞인 산출) + 잔여 `ai` 항목(aiPrompt) 반환. **B-1엔 없다**(B-1은 루브릭 데이터 serve만).
- **경계**: `serverComputed` det만 계산하고, `aiExtractedInput`을 한 항이라도 먹는 산출은 `mixed`로 분류(`det` 사칭 금지, C2). `ai`/`mixed`의 의미 부분은 평가하지 않고 패스스루. 산출물을 persist하지 않음(read-only compute). **앵커 추출(자연어→구조화)은 하지 않음** — 구조화 입력(`aiExtractedInput`) 또는 저장 구조화 필드를 받아 비교만(결정 5). apps/web REST와 mcp-tools가 같은 fn 호출(ARCHITECTURE.md §2 단일 진입점).
- **ROI 주의(리뷰 simplerAlternative)**: 차단력이 대부분 `ai`에 있으므로(결정 3), Phase B의 핵심 가치는 "루브릭을 데이터로 serve"하는 것이다. det 엔진은 slop 밀도·키워드 커버리지·신선도 같은 **반복적이고 게이밍 표면이 되는 카운트**만 코어로 들이고(외부 AI마다 임계가 흔들리지 않게 정본화), 나머지는 외부 AI가 루브릭대로 스스로 돌린다. 새 패키지+5종 DetSpec을 한 번에 다 구현하지 말고 `pattern`/`count_threshold`/`keyword_coverage`부터 착수한다.

### 3.3 앵커 serve 도구 (`get_fact_anchors`) **(B-1)**

- **무엇**: 저장된 **구조화 필드**에서 det 비교 기준(앵커 집합)을 serve. 신선도 앵커는 별도 도구 없이 B-2 `check_staleness`의 날짜비교가, JD 키워드는 별도 도구 없이 `get_application_context`/`get_job_posting`의 job 레코드가 담당한다(CONTRACT C3).
- **경계**: read-only serve. 산출물을 검증하지 않고 비교 기준만 제공. 자유텍스트 NER을 하지 않음(결정 5). 코어/repo read는 하되 mutation 없음. set(정확매칭)+정규화 규칙(콤마/단위/한글수사)을 함께 제공해 거짓양성 감소.

### 3.4 검증 메타 기록기 (`verifications` 테이블 + `save_*` core fn 확장) **(B-2)**

- **무엇**: 외부 AI가 넘긴 검증 메타를 `verifications` 테이블(C5 스키마)에 기록. `save_cover_letter_version`/`save_fit_analysis`/`save_interview_prep`의 **core fn**이 메타를 받아 기록 + `activityRepo.log`. **테이블·게이트·영속은 B-2**(마이그레이션 필요); B-1은 이 기록기 없이 `get_verifier` 루브릭으로 외부 AI가 자가검증만 한다(차단 0).
- **경계(리뷰 inconsistentWithCodebase 반영)**: 메타 persist 로직은 **핸들러가 아니라 core fn/repo**에 둔다(handlers stay thin — tools.ts:464-470/504-511 패턴). 외부 AI 자기보고 메타(`ai_reported_json`)는 advise 신호일 뿐 저장을 차단하지 않음(결정 3). **`serverComputed`(외부 AI 주입 0)이고 severity='hard'인 체크만**(= `gateableCheckIds`, CONTRACT C4) save_* core fn이 persist 직전 재계산해 위반 시 `fail()`로 거부; `ai`/`mixed`는 절대 차단 금지. `applications.status` 직접 쓰기 금지 — `updateApplicationStatus`(→ `setStatus`, repositories.ts:762) 경유(결정 4).

### 3.5 소비 경로 배선 (description + AGENTS.md 제안 패치 + 출력 넛지 + master router)

- **무엇**: 외부 AI를 "저장 전 자가검증" 경로로 유도하는 3중 트리거. 각 verifier/check 도구 description이 "저장 직전 호출" 문장으로 시작; `get_workflow_guide`(마스터 라우터, `CAREER_ROUTES` 확장)가 goal별 verifierSequence를 additive 반환; `check_*` 출력과 det 위반이 다음 도구를 💡로 넛지.
- **경계**: pull+신뢰 모델 — 강제 아님. AGENTS.md는 trigger #2라 master router(`get_workflow_guide`)만 명명, 세부 도구명(`get_verifier`/`check_*`)은 description(trigger #1)에 위임(AGENTS.md:22 "기술 용어 노출 최소화"). 단계 리스트는 `@careermate/workflows`/`get_workflow_guide`에 위임(중복 금지). AGENTS.md 실제 수정 안 함(제안 블록만, CONTRACT C7: 신규 원칙 #9 1개만 추가).

---

## 4. 구체 스펙

> 모두 **제안 스펙**이며 Phase B에서 적용하지 않는다.

### 4.1 `Verifier` / `RubricCheck` / `DetSpec` 데이터 스키마

`packages/knowledge/src/verifiers.ts`:

```ts
export type VerifierId =
  | 'truthfulness' | 'consistency' | 'recency-staleness'
  | 'responsiveness-on-target' | 'ats-compat' | 'human-voice';

export interface Verifier {
  id: VerifierId;
  name: string;        // 한국어 표시명
  risk: string;        // 이 검증기가 막는 실패의 위험 설명
  checks: RubricCheck[];
}

export interface RubricCheck {
  id: string;          // 'C1' .. 'C12' (verifier 문서 §2와 1:1)
  label: string;
  severity: 'soft' | 'hard';       // CONTRACT C2 정본(2값). hard=순수 det만 게이트 가능(C4)
  grade: 'det' | 'ai' | 'mixed';   // ← 'mixed' 1급 (responsiveness C3/C10). CONTRACT C2 정본
  critical?: boolean;  // critical 등급 (truthfulness C1~C3,C5 등)
  detLogic?: DetSpec;  // grade 'det' | 'mixed' 의 결정론 부분
  aiPrompt?: string;   // grade 'ai' | 'mixed' 의 의미판단 지시
}

// CONTRACT C2 정본 — DetSpec 5종 고정. stat·set_preserve 신설 금지(det 사칭 방지).
export type DetSpec =
  | { kind: 'pattern'; regex: string; exclude?: string[]; min?: number; max?: number }
  | { kind: 'count_threshold'; pattern: string; op: '>=' | '<='; threshold: number; minWords?: number }
  | { kind: 'keyword_coverage'; ratioAtLeast: number }   // 키워드 집합은 외부 AI 주입
  | { kind: 'staleness'; field: string; maxMonths: number }
  | { kind: 'traceability' };                             // N_total만 CareerMate 계산

export const VERIFIERS: Verifier[];
export function getVerifier(id: VerifierId): Verifier | undefined;
export function renderVerifierMarkdown(id: VerifierId): string | undefined;
```

예시:

```ts
// truthfulness C1 (수치 앵커링) — 순수 ai, critical
{ id: 'C1', label: '수치 앵커링', severity: 'soft', grade: 'ai', critical: true,
  aiPrompt: '각 정량 토큰을 저장 앵커 또는 산술 파생식에 매핑하고 미앵커 수(N_unanchored)를 보고하라.' }

// truthfulness C10 (traceability) — det 나눗셈이지만 분자가 ai 출력 → mixed
{ id: 'C10', label: '추적성 비율', severity: 'soft', grade: 'mixed',
  detLogic: { kind: 'traceability' },   // N_total만 CareerMate 계산, N_unanchored는 ai 주입
  aiPrompt: 'N_unanchored, N_unverified 를 산출해 넣어라. N_total 은 CareerMate가 센다.' }

// responsiveness C3 — 문서가 det+ai 혼합으로 명시
{ id: 'C3', label: '제약 충족', severity: 'soft', grade: 'mixed',
  detLogic: { kind: 'count_threshold', pattern: '.', op: '<=', threshold: 0 /* char_limit from input */ },
  aiPrompt: '톤·관점 같은 비계량 제약 충족 여부를 판정하라.' }

// human-voice C1 (slop 밀도) — 순수 det, 공유 사전 참조
{ id: 'C1', label: '슬롭 밀도', severity: 'soft', grade: 'det',
  detLogic: { kind: 'count_threshold', pattern: 'slop_lexicon', op: '<=', threshold: 1, minWords: 100 } }

// human-voice (문장길이 표준편차/burstiness) — NER·의미판단 아님이나
// 순수 det로 사칭 금지: stat kind 신설 안 함 → 카운트 가능 부분만 det, 나머지 ai (CONTRACT C2)
// 고유명사 보존(consistency proper-noun)도 NER=의미판단이라 grade:'mixed' 또는 'ai'
```

### 4.2 `SHARED_LEXICONS` 데이터 스키마

`packages/knowledge/src/lexicons.ts`:

```ts
export interface Lexicon {
  id: string;
  kind: 'slop' | 'cliché' | 'translationese' | 'hype' | 'filler' | 'quant_pattern' | 'temporal_pattern' | 'ats_keyword';
  lang?: 'ko' | 'en';
  match: 'substring' | 'regex';
  entries: string[];
  notes?: string;   // 임계/출처 추적 주석
}

export const SHARED_LEXICONS: Lexicon[];   // get_shared_lexicons 로 serve
export function getLexicon(id: string): Lexicon | undefined;
```

시드 항목(`HUMANIZE_WRITING_GUIDE`에서 추출):

- `slop-en` (substring): `delve, leverage, utilize, harness, robust, seamless, …`
- `slop-ko` (substring): `오늘날과 같은, 급변하는, ~의 세계, 가교 역할, …`
- `cliche-ko` (substring): `지원하게 되어 영광입니다, 귀사의 무궁한 발전을, …`
- `hype` (substring): `혁신적, 획기적, cutting-edge, …`
- `filler-ko` (substring): `열정, 최선을 다하겠습니다, …`
- `quant_pattern` (regex): `\d[\d,.]*\s*(%|억|만|원|명|건|배|개월|년|시간|ms|x)`
- `temporal_pattern` (regex): `최근|요즘|현재|올해|작년|recent|currently|as of`

### 4.3 `get_verifier` (MCP 도구) **(B-1 serve)**

`packages/mcp-tools/src/tools.ts`의 `TOOLS` 배열에 append.

| 필드 | 값 |
| --- | --- |
| `name` | `get_verifier` |
| `title` | `검증기 루브릭` |
| `readOnly` | `true` |
| `inputSchema` | `{ verifier_id: z.enum(['truthfulness','consistency','recency-staleness','responsiveness-on-target','ats-compat','human-voice']).optional() }` |
| `description` (트리거#1) | `'커리어 산출물을 저장하기 직전에 호출하세요. 6개 교차검증기 중 하나의 루브릭(검사 항목·합격기준·det/ai/mixed 등급·정규식 패턴·critical 등급)을 그대로 돌려줍니다. 의미 판단은 당신이 하고, CareerMate는 셀 수 있는 항목만 보조 계산합니다. 이 루브릭으로 자가검증한 뒤 save_*로 저장하세요. verifier_id를 생략하면 6개 목록을 돌려줍니다.'` |
| `handler` | `verifier_id`면 `ok(renderVerifierMarkdown(id), { verifier })`; 생략 시 `ok('검증기 6개', { verifiers: VERIFIERS.map(v => ({id, name, risk})) })`. **코어 호출 없음**(get_writing_style_guide 패턴). |

> **structuredContent 주의(리뷰 missing 반영)**: result.ts:42-43은 `data`가 **plain object**일 때만 `structuredContent`로 노출하고 **배열이면 누락**한다. 따라서 목록도 `{ verifiers: [...] }` 처럼 **객체로 감싸** 반환한다(아래 모든 도구 동일). 배열을 최상위로 넘기면 text-block JSON으로만 전달돼 "외부 AI가 structuredContent로 읽는다"는 소비 가정과 어긋난다.

### 4.4 앵커 serve 도구 (`get_fact_anchors`) **(B-1 serve)**

`readOnly: true`, core read-only read.

```
get_fact_anchors
  inputSchema: { scope: z.enum(['profile','resume','all']).optional() }
  description: '진실성·일관성 검증 직전에 호출하세요. 저장된 구조화 필드에서 앵커
                후보({numbers, proper_nouns, titles, credentials, timeline})와 정규화
                규칙을 돌려줍니다. 자유텍스트 본문은 추출하지 않으니, 본문 대조가
                필요하면 당신이 앵커를 뽑아 check_traceability에 넘기세요.'
  output: { anchors: { numbers[], proper_nouns[], titles[], credentials[], timeline[] },
            normalization_rules: {...} }
```

- **신선도 앵커**(latest_resume_content_hash/jd_hash, credentials expires_at, now)는 별도 `get_freshness_anchors` 도구를 만들지 않고, `check_staleness`가 입력 시점(now)과 저장 날짜를 직접 비교한다(CONTRACT C3·C6 `resume_content_hash`+`jd_hash`). benchmark staleness는 보상 데이터모델 신설 후(§6 비범위).
- **JD 키워드**는 별도 추출-serve 도구(`get_jd_keywords`)를 만들지 않는다(CONTRACT C3). `jobs.keywords`/`jobs.requirements`(schema.ts:109-110)는 `get_application_context`/`get_job_posting`가 이미 job 레코드로 반환하므로, 외부 AI가 그걸 그대로 읽어 키워드 커버리지 입력으로 쓴다. 약어 매핑·하드스킬 선별 같은 의미판단은 외부 AI가 한다.

### 4.5 det compute 도구 (`check_traceability` / `check_staleness`) **(B-2 compute)**

신규 det compute 도구는 **이 둘만**(CONTRACT C3) 이며 **B-2에서만 등장**(B-1 레지스트리엔 없다). consistency·responsiveness는 별도 `run_consistency_check`/`check_responsiveness` 도구를 만들지 않고, B-1 `get_verifier`가 그 루브릭(det/ai/mixed 등급 포함)을 serve하면 외부 AI가 루브릭대로 자가 수행한다(consistency proper-noun·responsiveness 비계량 제약은 NER=의미판단이라 순수 det 도구로 셀 수 없음, C2). 두 도구 모두 `readOnly: true`(persist 없음 — readOnly preview, 게이트·영속은 `save_*`가 담당, CONTRACT C4). 핸들러는 §3.2 코어 det fn 호출. **반환은 `serverComputed`(외부 입력 0 계산)·`aiExtractedInput`(AI 주입)·`mixed`(ai 섞인 산출)로 출처 태깅**(결정 2, C2)하고 `residual_ai_checks`로 잔여 ai 항목을 넘긴다. description은 "…저장하기 직전에 호출하세요"로 시작하고 끝에 통과 후 `save_*` 명명 + 💡 넛지.

```
check_traceability
  inputSchema: { artifact_id: z.string(), aiExtractedInput: z.object({
                   N_unanchored: z.number(), N_unverified: z.number(),
                   placeholder_count: z.number() }) }
  // serverComputed 부분만: N_total·placeholder_delta(외부 입력 0). traceability는 분자가 ai라 mixed(CONTRACT C2·C3)
  output: { serverComputed: { N_total, placeholder_delta },
            aiExtractedInput: { N_unanchored, N_unverified },
            mixed: { traceability },   // (N_total − N_unanchored)/N_total — 분자 ai → det/hard 표기 금지
            residual_ai_checks: [{ id, aiPrompt }] }

check_staleness
  inputSchema: { artifact_id: z.string().optional(), now: z.string().optional() }
  // serverComputed: 날짜 산술·해시 비교만(CONTRACT C3). resume_content_hash/jd_hash 사후 비교로 드리프트 감지
  output: { serverComputed: { content_hash_drift, undated_temporal_count },
            mixed: { freshness_ratio },   // recent-fact 매핑=ai 주입 → mixed(det 단독 금지, CONTRACT C2)
            residual_ai_checks: [...] }    // benchmark staleness 는 보상 모델 신설 후(§6)
```

> **det/ai 표기 정직성(리뷰 mustFix + Codex MAJOR1 반영)**: det는 "항목 단위"가 아니라 "항목 내 단계 단위"다. `freshness_ratio`는 recent-fact 매핑이 `aiExtractedInput`이므로 `serverComputed`가 아니라 `mixed`이고(C2 det 사칭 차단), `undated_temporal_count`(정규식 카운트)·`content_hash_drift`(해시 비교)만 `serverComputed`다. 키워드 커버리지 카운트도 questions/JD를 외부 AI가 구조화한 *뒤* CareerMate가 교집합만 센다(구조화=`aiExtractedInput`, 카운트=`serverComputed`이나 입력이 ai라 hard 게이트 승격 금지, C2). 그래서 별도 `check_responsiveness` 도구를 신설하는 대신, 키워드 집합을 외부 AI가 주입하는 `keyword_coverage` DetSpec(C2)으로만 표현하고 의미판단은 `get_verifier` 루브릭의 `aiPrompt`에 남긴다. 구현자가 "셈만 하면 det"로 착각하지 않도록 `aiExtractedInput` 입력을 명시 필드로 받는다.

### 4.6 `verifications` 테이블 (제안 마이그레이션) **(B-2)**

`packages/db/src/schema.ts`의 `MIGRATIONS` 배열에 **append**(forward-only/idempotent — `migrate()`가 `_meta.schema_version` 게이트로 정확히 한 번만 실행, schema.ts:288-307). **마이그레이션은 B-2 범위**(B-1은 마이그레이션 0):

CONTRACT C5 출처 태깅 스키마(Codex MAJOR4 — 실제 스키마 구체화). 이 문서가 테이블 단일 정본 소유자다.

```sql
-- 새 마이그레이션 문자열 1건 (BEGIN/COMMIT 으로 감쌈)
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL,         -- enum: resume|cover_letter|interview|linkedin|fit|...
  artifact_id TEXT NOT NULL,
  artifact_content_hash TEXT,          -- 검증 대상 산출물 본문 해시(사후 drift 감지)
  resume_content_hash TEXT,            -- 비교에 쓴 대표 이력서 해시(무버전 documents — C6)
  jd_hash TEXT,                        -- 비교에 쓴 JD 해시(정규화 규칙 1개 통일 선행)
  rubric_id TEXT NOT NULL,             -- VerifierId
  computed_json TEXT NOT NULL DEFAULT '{}',   -- serverComputed det 산출(외부 입력 0: N_total/undated_temporal_count/...)
  ai_reported_json TEXT NOT NULL DEFAULT '{}',-- 외부 AI 자기보고('미검증' 표식 / mixed 산출 포함)
  metrics_json TEXT NOT NULL DEFAULT '{}',    -- 평탄화 Record<string,number>(EVALUATION score 동거)
  gate_status TEXT,                    -- 게이트 결과(C4 advise/pass/fail). EVALUATION score·gateStatus도 여기
  checked_at TEXT NOT NULL
);
-- 최신 verification 조회용
CREATE INDEX IF NOT EXISTS idx_verifications_latest
  ON verifications (artifact_type, artifact_id, checked_at DESC);
```

> 컬럼이 `computed_json`(**`serverComputed` det만** — 외부 입력 0)과 `ai_reported_json`(외부 AI 자기보고 + **`mixed` 산출**: `freshness_ratio`·`traceability`처럼 `aiExtractedInput`이 섞인 값)을 **출처별로 분리**하는 게 핵심이다(C5·C2). `mixed` 값을 `computed_json`에 넣으면 det 사칭이므로 금지. `artifact_content_hash`/`resume_content_hash`/`jd_hash`는 검증 시점 입력을 박제해 사후 drift를 감지한다(C5). 영속 계층에서도 "두뇌=외부 AI, 계산=CareerMate" 분할선을 흐리지 않는다. `cover_letter_versions`/`fit_analyses`에 ALTER로 흩뿌리지 않고, LOOP_ENGINE의 `verification_run` activity 로그는 감사 보완이지 이 테이블의 대체가 아니다.

> **멱등성 정정(리뷰 missing 반영)**: "`CREATE TABLE IF NOT EXISTS`/`ALTER`가 멱등"이라서 안전한 게 아니다. `ALTER ADD COLUMN`은 재실행 시 duplicate column 에러로 **멱등하지 않다**. 안전한 이유는 `migrate()`(schema.ts:295)가 `schema_version` 게이트로 각 마이그레이션을 *정확히 한 번만* 실행하기 때문이다. 그래서 본 설계는 verifier 메타를 **별도 테이블 CREATE 1건**으로 두어 ALTER를 아예 피한다(결정 7). 마이그레이션 문자열은 `BEGIN; … COMMIT;`로 감싸 부분 적용을 막는다(:283 기존 패턴).

### 4.7 AGENTS.md 제안 패치 블록 (실제 수정 금지)

규칙 리스트(AGENTS.md:15 부근)에 **1불릿 추가**하고, 기존 `get_writing_style_guide` 불릿(AGENTS.md:18)을 이 안으로 접어 **총 개수 불변**:

```diff
+ - **산출물을 저장하기 전, 당신이 직접 자가검증하라.** 적합도 분석·자소서·면접
+   자료를 save_* 도구로 보관하기 전에, 해당 도메인 플레이북으로 작성하고
+   CareerMate가 제공하는 verifier 루브릭으로 점검한다. 어떤 검증기를 어떤 순서로
+   적용할지는 get_workflow_guide가 알려준다. 사실·시점·응답성 판단은
+   당신이 하고, CareerMate는 셀 수 있는 항목(슬롭 밀도·키워드 커버리지·신선도·
+   추적성)만 계산해 보조한다. 사람이 쓴 듯한 글이 필요할 때는 작성 직전
+   get_writing_style_guide를 함께 적용한다.
```

- master router(`get_workflow_guide`)만 명명, `get_verifier`/`check_*` 세부는 도구 description(트리거#1)에 위임(AGENTS.md:22 "기술 용어 노출 최소화" 준수). CONTRACT C7: 신규 원칙은 #9 1개만 추가하고 기존 get_writing_style_guide 불릿을 흡수.
- 프라임 디렉티브 "두뇌는 당신, 저장은 CareerMate" 프레이밍 유지 — "당신이 자가검증"으로 표현(CareerMate가 분석하는 것처럼 읽히지 않게).
- **게이트 표현 삭제(결정 3)**: 초안에 있던 "진실성 검증 미통과 산출물은 applied로 올리지 않는다"는 hard 게이트 문장은 **넣지 않는다**. false-pass 비대칭 때문에 advise로만 두므로, 강제처럼 읽히는 문장은 잘못된 안전감을 준다.

`CAREERMATE_SYSTEM_PROMPT`(prompts/system.ts:11)에 동일 길이의 `#9 저장 전 자가검증` 원칙 추가 제안(#1 맥락 먼저 / #2 저장 / #8 AI 티와 동기화). 역시 advise 프레이밍.

---

## 5. 기존 아키텍처·코드와의 정합

> 공통 보일러플레이트(structuredContent 객체 래핑·길이캡 상속·core 단일 진입점·zod 재사용·본문 미누수·정규식 캐싱·2-프로세스/WAL·openWorldHint)는 **→ [CONTRACT.md](CONTRACT.md) §C9 참조**. 아래는 이 문서(검증 시스템) 고유의 정합 포인트만 남긴다.

- **TOCTOU는 결정적 진실이 아니라 advise 신호다(이 문서 고유)**: `get_fact_anchors`/`check_*`가 resume 버전+jobs를 가로질러 read하며 신선도를 비교할 때, 검증 시점 latest와 저장 시점 latest가 다를 수 있다. → 설계 입장: drift는 **advise 신호**(결정 3)이며, `verifications`에 검증에 쓴 `resume_content_hash`/`jd_hash`(C6: 무버전 documents이므로 `resume_version_id` 금지)를 기록해 *사후 비교*로만 감지한다. 실시간 락·스냅샷 일관성 보장은 요구하지 않는다(WAL 정합은 C9).
- **상태 게이팅(결정 4 + CONTRACT C4 정합)**: **(B-1)** 검증 게이트 없음 — 외부 AI가 `get_verifier` 루브릭으로 **스스로** 자가검증하고 CareerMate는 아무것도 차단하지 않는다(기존 `saveInterviewPrep` 상태게이트만 유지). **(B-2)** 전이 합법성 정본은 `applicationRepo.setStatus`/`upsert`(repositories.ts:751/762)의 `assertStatusTransition`(services.ts 아님) — verifier는 이 경로에 **새 throw를 더하지 않는다**. 능력 해금 정본은 `saveInterviewPrep`(services.ts:178)의 throw-before-persist. save-time 게이트는 **`serverComputed`(외부 AI 주입 0)이고 severity='hard'인 체크만**(= `gateableCheckIds`, 현재 후보 1~2개뿐) `save_*` 핸들러가 persist 직전 재계산해 위반 시 `fail()`로 거부하고, **`ai`/`mixed` 체크는 절대 차단하지 않고 advise+넛지**(자가신고 위조 불가 → hard 게이트는 false-pass 명예 시스템). `validate_*`(B-2, readOnly·무저장 preview — `verifications` 적재·`activityRepo.log` 금지)는 강제력 없는 미리보기이며 게이트가 아니다(영속·게이트는 `save_*`가 담당, C4).
- **`verifications` 테이블 소유(C5) (B-2)**: 이 문서가 단일 정본 소유자. C5 구체 스키마(`artifact_content_hash`/`resume_content_hash`/`jd_hash`/`computed_json`/`ai_reported_json`/`metrics_json`/`gate_status` + INDEX). `CREATE TABLE IF NOT EXISTS` 1건을 `MIGRATIONS`에 append, `BEGIN/COMMIT` 래핑(C6: schema_version 1회 게이트가 안전근거, CREATE 멱등이 아님). `cover_letter_versions`/`fit_analyses`에 ALTER로 흩뿌리지 않음. 마이그레이션은 B-2(B-1 미적용).
- **activityRepo.log**: 메타 기록 시 로그 → `list_recent_activity`/대시보드 노출(services.ts:153/185 패턴). LOOP_ENGINE `verification_run` activity는 감사 보완이지 테이블 대체가 아님(C5).

---

## 6. 미해결 질문 / 리스크

- **R1 (게이트 vs advise 최종)**: 본 설계는 결정 3에서 verifier를 **advise**로 확정했다. 만약 후속에서 hard 게이트가 필요하다고 판단되면, "메타 부재=fail" 시 합법적 수동 전이까지 막히는 UX 파탄과, "메타 부재=skip" 시 게이트 무의미 사이의 트레이드오프를 먼저 해소해야 한다. 그 전엔 "게이트"라 부르지 않는다.
- **R2 (앵커 추출 책임)**: 결정 5로 "외부 AI 추출"을 확정했으나, 외부 AI가 앵커를 누락/왜곡하면 det 비교가 거짓음성을 낼 수 있다. 선택지: CareerMate가 `read_document` 본문에서 정규식으로 1차 앵커(숫자·날짜 등 *형식적* 토큰)만 뽑아 교차검증할지(추가 det), 순수 외부 위임으로 둘지. 형식적 토큰(NER 불필요)만 보조 추출하는 절충이 유력.
- **R3 (루프 닫힘)**: `check_*`가 `residual_ai_checks`를 반환한 뒤 외부 AI가 그걸 수행하고 결과를 `save_*` 메타로 환류하는 "닫힌 루프"의 마지막 연결은 [LOOP_ENGINE.md](LOOP_ENGINE.md)/[EVALUATION.md](EVALUATION.md) 소관이다. 본 문서의 진입점 설계가 그 루프 완결에 의존하는 순환이 있으므로, `save_*` core fn이 "메타에 `ai` 항목 미완료 표식이 있으면 넛지"하는 최소 장치를 그 문서에서 정의해야 한다.
- **R4 (임계 프로파일 위치)**: `STALENESS_THRESHOLDS`/responsiveness/human-voice 임계의 locale(KR/global)·산출물유형(이력서 vs 자소서) 프로파일을 `SHARED_LEXICONS` 옆 설정 데이터 모듈에 둘지, verifier 파라미터에 둘지, `profile.locale` 런타임 선택으로 둘지 미정. 모든 임계는 verifier 문서 합격기준 출처를 주석으로 단다(임의 상수 금지).
- **R5 (선행 데이터모델 분리)**: recency C1(benchmark staleness)와 rejection 게이팅의 진짜 결정론은 `compensation_benchmarks` 테이블·`save_compensation_benchmark`·`rejection_reviews`(소유=TODO)·`REJECTION_STAGES`·`profile.hard_gate`(C6)에 달려 있다. 이들은 verifier 문서 범위를 벗어나므로 별도 형제 문서(EXPERTS / TODO / salary-negotiation)에서 신설하고, 본 문서의 `check_staleness`는 그 선행 모델이 들어오면 benchmark staleness 비교를 추가한다.

---

## 7. 관련 문서 (cross-links)

- Phase A 지식 — [knowledge/verifiers/truthfulness.md](../knowledge/verifiers/truthfulness.md) · [consistency.md](../knowledge/verifiers/consistency.md) · [recency-staleness.md](../knowledge/verifiers/recency-staleness.md) · [responsiveness-on-target.md](../knowledge/verifiers/responsiveness-on-target.md) · [ats-compat.md](../knowledge/verifiers/ats-compat.md) · [human-voice.md](../knowledge/verifiers/human-voice.md)
- 인덱스 — [KNOWLEDGE.md](KNOWLEDGE.md) (§0 소비 경로 3중 트리거 / §2 6 검증기 / §3 공유 사전 정본 / §4 데이터모델 선행 의존성)
- Phase B 형제 — [EXPERTS.md](EXPERTS.md)(플레이북 `verifierIds` 참조, 선행 데이터모델) · [ARCHITECTURE.md](ARCHITECTURE.md)(`@careermate/knowledge` 레이어·도구 계약) · [LOOP_ENGINE.md](LOOP_ENGINE.md)(draft→verify→revise 루프) · CONSENSUS_ENGINE.md · EVALUATION.md *(작성 예정)*
- 현행 코드 앵커 — `packages/shared/src/enums.ts:48/67-91`(unlock·전이 정의) · `packages/db/src/repositories.ts:751/762`(전이 합법성 *강제* 지점) · `packages/core/src/services.ts:145-187`(updateApplicationStatus·saveInterviewPrep) · `packages/mcp-tools/src/tools.ts:591-623`(get_workflow_guide·get_writing_style_guide 템플릿) · `packages/mcp-tools/src/result.ts:37-48`(toCallToolResult / structuredContent plain-object 제약) · `packages/db/src/schema.ts:91-129/288-307`(테이블 카디널리티·migrate) · `packages/workflows/src/definitions.ts:9-20`(데이터모듈 패턴)
