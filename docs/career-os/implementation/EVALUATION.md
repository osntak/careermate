# 평가 지표 — CareerMate Career-OS (Phase B 설계)

> **횡단 결정은 [CONTRACT.md](CONTRACT.md)가 정본(충돌 시 우선)** — grade 타입·도구명·게이트·테이블·envelope·범위는 CONTRACT의 C2/C3/C4/C5/C8/C9를 따른다.
>
> Career-OS 산출물(이력서·자소서·면접 자료·적합도 분석)의 품질을 **도메인 횡단 개념**으로 이름 붙이고, 각 측정을 `det`(CareerMate가 LLM 없이 계산)·`ai`(외부 AI 의미판정)·`mixed`(둘이 섞임)로 1급 분류한 뒤, 보고 형태(per-check / per-artifact)와 집계 규칙을 표준화한다. **CareerMate 내부에는 LLM이 없다.** 두뇌(의미판단)는 외부 AI, CareerMate는 루브릭·임계를 데이터로 serve하고 셀 수 있는 항목만 결정론으로 compute한다. 모든 보고에는 "루브릭 통과 ≠ 합격, 형식·표면 위생 점검일 뿐"이라는 disclaimer가 필수로 붙는다. 이 문서는 **설계(제안 스펙)** 만 만든다 — 코드·스키마·마이그레이션은 적용하지 않으며, AGENTS.md는 "제안 패치 블록"으로만 보여준다.
>
> **Phase 분리(CONTRACT C0 — 최상위)**: CONTRACT v2는 Phase B를 **B-1(serve-only, 마이그레이션 0·게이트 0)** 과 **B-2(det 엔진·게이트·`verifications` 영속·데이터모델)** 로 나눈다. EVALUATION에서:
> - **(B-1)** = **score envelope "개념"만**. 독립 10-metric 카탈로그·`Metric` 타입·전용 metric-serve 도구는 **신설하지 않고**, 작성 기준 임계는 `get_playbook`/`get_verifier`(CONTRACT C3, B-1 serve) 출력에 동봉해 알린다. det 합산·envelope 산출·`validate_*`/`lint_*` 도구·`gateStatus` 영속은 모두 **B-2**다.
> - **(B-2)** = det 엔진(`DetMetricEvaluator`)·`validate_*`/`lint_*` compute 도구·envelope `score`/`gateStatus` 산출·`verifications` 적재. 핵심 3 det 카운트(`slop_density`·`keyword_coverage`·`quantification_rate`)부터 들인다.
> - **폐기 도구명 금지(CONTRACT C3)**: `get_evaluation_metrics`는 폐기 이름이다 — B-1에서도 B-2에서도 **신설하지 않는다**. 아래 본문의 `get_evaluation_metrics`/독립 `METRICS` 카탈로그·`Metric` 타입은 모두 **이월된 설계 스케치**일 뿐이며, 정본 도구 레지스트리(C3)에는 없다.
>
> Phase A 지식(metric 출처): [knowledge/resume.md](../knowledge/resume.md) · [cover-letter.md](../knowledge/cover-letter.md) · [interview-behavioral.md](../knowledge/interview-behavioral.md) · [fit-matching.md](../knowledge/fit-matching.md) · 검증기 [verifiers/human-voice.md](../knowledge/verifiers/human-voice.md) · [verifiers/truthfulness.md](../knowledge/verifiers/truthfulness.md). 인덱스 [KNOWLEDGE.md](KNOWLEDGE.md). 형제 Phase B: [VERIFIERS.md](VERIFIERS.md)(검증기·`verifications` 테이블 소유) · [LOOP_ENGINE.md](LOOP_ENGINE.md)(루프 종료 판정 소유) · [EXPERTS.md](EXPERTS.md)(master router). 현행 아키텍처: [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).

---

## 1. 목적·범위

**Phase B-1(serve-only, 마이그레이션 0·게이트 0 — CONTRACT C0):**

- **score envelope "개념"만**: envelope(checks / artifact 2-tier + disclaimer)의 **모양과 보고 규약만** 정의한다. 실제 envelope를 산출하는 `validate_*`/`lint_*` 도구·det 합산·`verifications` 적재는 **B-2**다(아래). B-1에서는 작성 기준 임계를 `get_playbook`/`get_verifier`(CONTRACT C3 serve) 출력에 동봉해 외부 AI가 **스스로** 루브릭으로 자가검증하게 한다.
- **소비 경로 강화 배선(CONTRACT C7, B-1)**: 가장 강한 진입점에 박는다 — `get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입 + MCP server instructions에 "저장 전 verifier 경로" 추가 + 보조로 description 트리거·AGENTS.md 제안 패치·출력 넛지. **게이트는 없다**(차단 0).

**Phase B-2(det 엔진·게이트·영속, 마이그레이션 필요 — CONTRACT C0):**

- **score envelope 산출 도구**: `validate_*`/`lint_*` 도구가 같은 보고 envelope로 반환. **VERIFIERS.md의 기존 `RubricCheck`들에서** det 점수만 합산하고 ai는 위임 플래그. 별도 `METRICS const` 신설 없이 verifier 체크의 score envelope만 끌어낸다.
- **핵심 3 det 카운트부터**: det 합산은 `slop_density`·`keyword_coverage`·`quantification_rate` 3개 카운트로 시작하고(§3.2), 나머지는 외부 AI 위임으로 둔다. envelope의 `score`·`gateStatus`는 새 테이블 없이 `verifications`(B-2)에 흡수(결정 5, CONTRACT C5).
- **save-time 게이트**: `save_*` 핸들러가 저장 직전 **순수 `serverComputed`·`severity:'hard'`** 체크(`gateableCheckIds`)만 재계산해 차단(CONTRACT C4). `ai`/`mixed`-ai는 절대 차단 금지.

**후속 Phase로 이월(CONTRACT C8):**

- **독립 metric 카탈로그(data-as-knowledge)** `@careermate/knowledge`의 `METRICS: Metric[]` + 전용 metric-serve 도구(**폐기명 `get_evaluation_metrics` 금지** — CONTRACT C3). 흩어진 루브릭 체크(resume R1–R9, cover-letter R1–R12, behavioral R1–R13, fit R1–R10, human-voice C1–C11, truthfulness C1–C10)를 **도메인 횡단으로 재발하는 개념**만 metric으로 끌어올리는 것(예: quantification_rate가 resume R2·cover R4·behavioral R5·human-voice C11에 걸침)은 카탈로그·도구와 함께 이월한다. 아래 §3.1·§4.1·§4.4의 metric 카탈로그·`Metric` 타입은 그 이월된 작업의 설계 스케치다.

### 설계하지 않는 것 (명시적 비범위)

- **코드 구현·실제 마이그레이션 적용**. 모든 스키마·도구·enum·테이블은 "제안 스펙"이다.
- **AGENTS.md / `prompts/system.ts` 실제 수정**. §4.5의 "제안 패치 블록"으로만 보여준다.
- **검증기 루브릭 정의 자체** — 그것은 [VERIFIERS.md](VERIFIERS.md) 소유다. 본 문서는 그 `RubricCheck`들을 `metricId`로 **그룹핑·집계**할 뿐, 임계를 복제하지 않는다(KNOWLEDGE.md §3 단일 정본).
- **루프 종료 판정(`verdict`)·재분석 큐** — [LOOP_ENGINE.md](LOOP_ENGINE.md) 소유. 본 문서는 그 엔진이 읽을 보고 envelope만 정의한다(§2 결정 6).
- **검증 메타 저장 테이블의 신설** — VERIFIERS.md의 `verifications` 테이블을 **재사용**한다(§2 결정 5). 새 테이블을 만들지 않는다.
- **의미판단(ai) 계산**. fabrication 진위·역할 분류·전이가능성·off-topic 판정은 외부 AI 몫. CareerMate는 흉내내지 않는다.

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### 결정 1 — metric은 "루브릭 체크 위의 파생 뷰"다, 새 임계 정본이 아니다

metric은 여러 `RubricCheck`(VERIFIERS.md 소유)를 같은 `metricId`로 묶는 **집계 단위**다. 체크 ID는 각 도메인 문서에 canonical하게 남고, metric은 **도메인 횡단으로 재발하는 개념에만** 신설한다. 도메인-로컬 체크(resume R7 역시간순)는 metric으로 승격하지 않고 도메인 점수에만 둔다. metric의 임계는 그 metric이 참조하는 verifier `DetSpec`/합격기준에서 가져오며, EVALUATION이 임계를 **복제 소유하지 않는다**.

- **근거**: KNOWLEDGE.md §0(안티게이밍)·§3(단일 정본 소유)를 측정에 적용. 임계가 metric·verifier 두 곳에 중복되면 per-domain threshold drift·게이밍이 되살아난다.
- **코드/문서**: resume.md §3 R2, cover-letter.md §3 R4, interview-behavioral.md §3 R5, human-voice.md §2 C11이 모두 단위 동반 숫자 패턴을 측정; slop 밀도는 human-voice.md C1과 cover-letter.md R3이 공유. 이 공유 항목들이 metric 후보다.
- **리뷰 반영(simplerAlternative)**: 별도 `METRICS const`로 임계를 또 들고 있으면 VERIFIERS와 이중 유지보수가 된다는 지적을 받아, `Metric`은 `sourceChecks`로 verifier 체크를 **참조**하고 임계 숫자는 verifier `DetSpec`을 가리키는 형태로 둔다(§4.1).

### 결정 2 — `grade`를 `det`/`ai`/`mixed` 3진으로 두고 VERIFIERS의 grade 어휘를 그대로 상속한다

`CheckResult.grade`(envelope, §4.3)와 보류된 `Metric.grade`/`MetricResult.grade`는 모두 **`'det' | 'ai' | 'mixed'`** 다(CONTRACT C2: 3값, 2값 금지). `mixed` 항목(예: traceability = det 산술 + ai가 넘긴 `N_unanchored`, responsiveness C3/C10, behavioral R7 "존재 det + 적합 ai")은 `det` 부분(`detSpec`)과 `ai` 부분(`aiPrompt`)을 **동시에** 갖는다.

- **근거(리뷰 mustFix #1 반영)**: 같은 `@careermate/knowledge` 패키지의 VERIFIERS.md 결정 1(§2)이 responsiveness-on-target C3/C10·behavioral R7 때문에 `grade`를 이미 `'det'|'ai'|'mixed'`로 확정했다. EVALUATION이 `det|ai` 2진으로 두면 동일 필드가 패키지 안에서 타입 비호환이 되고, mixed 항목이 한쪽으로 강제되어 truthfulness.md:21·interview-behavioral.md:91이 경고한 **"grade spoofing"(ai인데 det로 사칭)** 을 구조적으로 유발한다.
- **분할선·출처 태깅(CONTRACT C2 v2)**: 모든 결과 필드는 `serverComputed`(CareerMate가 외부 입력 없이 완전 계산) 또는 `aiExtractedInput`(외부 AI가 의미추출해 주입한 값)으로 **출처 태깅**한다. `det`/`mixed`의 결정론 부분만 core가 `serverComputed`로 계산하고, `ai`/`mixed`의 의미 부분은 `aiPrompt` + context로 외부 AI에 위임(`aiExtractedInput`). **`aiExtractedInput`이 한 방울이라도 섞인 값은 절대 `det`/`hard`/게이트로 표기 금지**(CONTRACT C2): `freshness_ratio`(recent-fact 매핑=ai)·`proper_nouns`/`titles`/`credentials`를 자유텍스트에서 추출(=한국어 NER=ai)은 `mixed`로 두고 날짜 산술·집합 비교만 `serverComputed`. `keyword_coverage`의 키워드 집합도 ai 주입이므로 비율은 `serverComputed`지만 그 입력이 ai라 hard 게이트 승격 금지.
- **코드**: truthfulness.md §2 critical C1·C2·C3·C5가 전부 `ai`이고 det는 C7(placeholder)·C10(traceability 비율)뿐; C10의 분모는 C1(`ai`) 출력 → "간판 det 지표"조차 ai 입력을 받는다.

### 결정 3 — fabrication 절대 게이트의 실제 집행 수단을 det 프록시로 **결정**한다 (openQuestion 승격)

`fabrication_count = 0`은 의미상 절대 게이트이지만 **진위 판정은 `grade: 'ai'`** 다. ai 게이트가 저장 시점에 미실행이면 CareerMate가 LLM 없이 강제할 수 있는 것이 없다. 따라서 다음을 본문 결정으로 못박는다:

1. **절대 게이트의 det 프록시**는 (a) `evidence_substring_integrity`(fit.R3: 인용 근거가 저장 원문의 substring인가, det bool), (b) `traceability` 비율(truthfulness C10, det 산술), (c) `placeholder_delta`(truthfulness C7: `[회사명]`류 미치환 카운트, det), (d) **저장 시점 수치 literal-match**(behavioral.md:83·resume.md:78: 답변/문장의 숫자 리터럴이 사용자 입력 `metrics[].value`에 literal-match되는가)다. 이 4개가 통과해도 진위(ai)는 **보고됨일 뿐 검증됨이 아니다**.
2. **ai 미실행이면 `gateStatus`는 `pass`가 될 수 없고 `needs_ai_review`로 강등**된다(결정 4). 즉 "ai 절대 게이트"는 det가 흉내내는 게 아니라, det 프록시가 모두 깨끗하더라도 **ai 보고가 0으로 들어오기 전까지는 통과 라벨을 주지 않는** 방식으로 정직하게 집행된다.

- **근거(리뷰 missing·inconsistentWithCodebase 반영)**: LOOP_ENGINE.md D1이 "critical C1·C2·C3·C5는 전부 ai, det로 직접 계산 불가(C7 placeholder뿐)"를 이미 확정했고, interview-behavioral.md:83은 literal-match 프록시를, truthfulness.md:64–66은 검증 메타(`critical_failures:0`/`traceability:1.0`) 저장 패턴을 이미 답했다. openQuestion으로 되돌리지 않고 이 답들을 채택한다.

### 결정 4 — `gateStatus`는 **보고 라벨**이다 (B-1=게이트 0 / B-2=`save_*` save-time 게이트, CONTRACT C4 v2)

`gateStatus ∈ { pass, hard_fail, needs_ai_review }`는 그 자체로는 **보고 라벨**이며 `validate_*`/`lint_*`(readOnly) 경로에선 차단하지 않는다. core(`evaluation.ts`)는 이 라벨을 계산해 envelope에 담을 뿐 readOnly 경로에선 throw하지 않는다.
- **(B-1)** 검증 게이트 0. 외부 AI가 `get_verifier` 루브릭으로 스스로 자가검증하고, CareerMate는 아무것도 막지 않는다. 기존 게이트만 유지: 전이 합법성(`assertStatusTransition`)·능력 해금(`saveInterviewPrep` 상태값 검사 services.ts:172–186). B-1은 게이트가 아니라 **"det lint + advisory"** 다(CONTRACT C4).
- **(B-2)** save-time 게이트. `save_*` 핸들러가 저장 직전 **순수 `serverComputed`·`severity:'hard'`** 체크 집합(`gateableCheckIds`)만 재계산해 위반 시 `fail()`로 차단(현재 후보 1~2개뿐임을 정직히 인정). `ai`/`mixed`-ai는 **절대 차단 금지**(자가신고 위조 불가 = false-pass 명예 시스템). `validate_*`/`lint_*` 자신은 readOnly·무저장이고, 영속·강제는 `save_*`가 담당한다(CONTRACT C4 v2 — 한 도구가 둘을 겸하지 않음).
det 위반은 출력 넛지(C7)와 description으로 외부 AI/사용자에게 **advise**한다.

- **`gateStatus` 산출 규칙**: `criticalFailures`(det 프록시가 깨진 절대 게이트류)가 있으면 `hard_fail`; 그렇지 않은데 위임된 `ai`/`mixed` 체크가 하나라도 남으면 `needs_ai_review`; **모든 det 통과 + 위임 0**일 때만 `pass`. **det-only-pass를 `pass`로 라벨하는 것은 금지**(ai가 미실행이면 항상 `needs_ai_review`).
- **근거(리뷰 mustFix #2 반영)**: VERIFIERS.md 결정 3(§2)이 "det 위반은 차단력 아님, advise + 출력 넛지뿐, `validate_*`/`lint_*`(readOnly)는 새 throw 경로를 더하지 않는다"를 확정했다. `validate_*`/`lint_*` 경로에서 `hard_fail`을 core 1급 throw로 두면 형제 문서가 거부한 차단을 재도입하는 것이라, readOnly 경로에선 `hard_fail`을 "advise 라벨"로 격하한다. 실제 차단은 B-2 `save_*` 핸들러가 `gateableCheckIds`(순수 serverComputed·hard)만 재계산해 가하는 별도 경로다(CONTRACT C4 v2 — readOnly preview ↔ save-time enforce 분리). "두뇌=외부 AI" 분할선은 ai/mixed-ai를 절대 차단하지 않음으로 유지된다.
- **코드**: services.ts:160–165 `updateApplicationStatus`의 `hint`가 출력-넛지 선례; saveInterviewPrep(services.ts:178)이 유일한 서버 차단.

### 결정 5 — 검증/평가 메타는 VERIFIERS.md의 단일 `verifications` 테이블을 **재사용**한다 (새 테이블 없음)

별도 `artifact_evaluations` 테이블을 신설하지 않는다. **이 테이블·영속은 모두 (B-2)다**(CONTRACT C5/C0). score·gateStatus는 CONTRACT C5가 확정한 정규화 `verifications` 테이블 컬럼에 **흡수**한다: `score`는 `metrics_json`(평탄화 `Record<string,number>`)의 `"_artifact_score"` 키로, `gateStatus`는 **전용 `gate_status TEXT` 컬럼**(별 키나 `version_json`이 아니라 v2가 신설한 1급 컬럼)에 담는다. det/ai 정직성을 위해 `serverComputed` det는 `computed_json`에, 외부 AI 자기보고는 `ai_reported_json`('미검증' 표식)에 분리 적재한다(CONTRACT C2/C5). cross-tab(`get_rejection_patterns`)도 같은 테이블을 읽는다.

- **근거(리뷰 mustFix #4·simplerAlternative 반영)**: 같은 Phase B에서 같은 검증-메타를 두 테이블에 흩뿌리면 KNOWLEDGE.md §3 단일 정본 위반이고, 둘 다 `MIGRATIONS`에 append 시 순서가 미정이 되는 정합 리스크다. `metrics_json` 평탄화가 union 직렬화 없이 score를 흡수하고 `gate_status`는 전용 컬럼이라, EVALUATION이 새 컬럼·새 테이블·새 마이그레이션을 더할 필요가 없다(B-2 마이그레이션은 CONTRACT C5·TODO.md 소유).
- **소유권 경계**: 테이블 스키마·마이그레이션은 **VERIFIERS.md/CONTRACT C5 소유(B-2)**, EVALUATION은 `metrics_json`에 담을 키(`_artifact_score`)와 `gate_status` 컬럼에 담을 라벨 의미만 명세한다.
- **코드**: schema.ts:91–99/117–129(`cover_letter_versions`/`fit_analyses`에 `UNIQUE(job_id)` 부재 → 행별 ALTER 흩뿌리기 부적합); schema.ts:288–307 `MIGRATIONS`(forward-only, `CREATE TABLE IF NOT EXISTS`).

### 결정 6 — 보고 envelope는 EVALUATION 소유, 루프 종료 판정은 LOOP_ENGINE 소유 (경계 1문장)

`ArtifactEvaluation` envelope(Phase B-1 = checks/artifact 2-tier + disclaimer; metrics tier는 metric 카탈로그와 함께 보류, CONTRACT C8)는 **EVALUATION이 소유**하고 모든 `validate_*`/`lint_*` 도구가 이 모양으로 반환한다. 그 envelope의 1급 필드를 LOOP_ENGINE의 어휘에 정렬한다: `detClear: boolean`(모든 `block`+`det` 통과)와 `delegatedToAI`(= LOOP_ENGINE의 `aiReported` 입력원). **`verdict`(pass/revise/defer) 산출은 LOOP_ENGINE 소유**이며 EVALUATION은 verdict를 계산하지 않는다(CareerMate는 ai 판정을 흉내내지 않는다).

- **근거(리뷰 mustFix #4 반영)**: VERIFIERS.md:25/§3.4가 루프 닫힘을 LOOP_ENGINE/EVALUATION 둘에 떠넘겨 경계가 없었다. 두 envelope가 충돌하면 `validate_*`가 어느 모양을 반환할지 모호해지므로, "리포트 envelope=EVALUATION, 종료판정=LOOP_ENGINE"으로 1문장 확정하고 EVALUATION envelope에 LOOP_ENGINE이 읽을 `detClear`/`delegatedToAI`를 1급으로 둔다.
- **코드/문서**: LOOP_ENGINE.md D1(`detClear`/`aiReported` 분리, "보고됨 ≠ 검증됨").

### 결정 7 — artifact score는 det 체크만 합산, ai/mixed의 ai 부분은 점수 제외·위임 플래그 (no inflation)

`artifact.score`(0~1)는 **det 체크만** critical/major/minor 가중으로 합산한다. ai·mixed의 의미 부분은 점수에 넣지 않고 `delegatedToAI`로 플래그만 한다. **가중치 소유권**: 도메인별 critical/major/minor 가중(cover-letter.md:85의 60/30/10)은 **도메인 루브릭 소유**이고, EVALUATION은 그 가중으로 **측정만** 한다(cross-domain 가중을 EVALUATION이 새로 소유하지 않음 — keyDecision과 openQuestion의 자기모순 제거, 리뷰 inconsistentWithCodebase 반영).

- **근거(리뷰 strongPoint 유지 + inconsistentWithCodebase 반영)**: cover-letter.md:85가 regex/count/ratio만 auto-score하고 ai는 위임으로 명시. ai 점수를 섞어 부풀리는 게이밍을 차단한다.
- **cross-tab은 신규 로직(grounding 아님)**: `get_rejection_patterns`가 metric 추세(평균 keyword coverage 하락 등)를 reject된 지원 전반에서 집계하는 것은 KNOWLEDGE.md §4(global 집계, 미존재)가 요구하는 **신규** 기능이다. services.ts:145–168 `updateApplicationStatus`는 status 변경+activity 로그만 하고 metric을 집계하지 않으므로, cross-tab은 "근거"가 아니라 "제안"으로 표기한다(리뷰 inconsistentWithCodebase 반영).

---

## 3. 컴포넌트·책임·경계

### 3.1 `METRICS` 데이터 모듈 (`@careermate/knowledge` `metrics.ts`) — **보류(CONTRACT C8)**
> 독립 metric 카탈로그 모듈과 전용 serve 도구는 **후속 Phase로 이월**한다. Phase B-1은 이 모듈 없이 §3.2의 핵심 3 det 카운트를 verifier 체크에서 직접 끌어낸다. 아래는 그 보류된 작업의 설계 스케치다.
- **무엇**: 도메인 횡단 metric 정의의 단일 소유자. `interface Metric` + `export const METRICS: Metric[]` + `getMetric(id)`/`listMetricsByGrade(grade)` 헬퍼(`getWorkflow`/`getVerifier` 미러).
- **어떻게**: 전용 serve 도구가 통째로 serve(`get_writing_style_guide` 패턴, tools.ts:616). 도메인 루브릭은 `metricId`로 참조하고 임계를 복제하지 않음.
- **의존**: `shared`만(ARCHITECTURE.md §2/§8). NO LLM, NO 런타임 fetch, NO core. 측정을 실행하지 않는 순수 데이터+getter. VERIFIERS·EXPERT_PLAYBOOKS와 같은 패키지 패턴.

### 3.2 `DetMetricEvaluator` (`packages/core` `evaluation.ts`) — **(B-2)**
- **무엇**: det metric을 LLM 없이 계산하는 단일 코어 fn 셋(`pattern`/`count_threshold`/`keyword_coverage`/`staleness`/`traceability`). per-check 결과·det 가중 점수·잔여 ai 체크를 §4.3 envelope로 반환.
- **경계**: apps/web REST와 mcp-tools가 **같은 fn 호출**(ARCHITECTURE.md §2 단일 진입점). NO LLM. ai/mixed의 의미 부분은 `aiPrompt`+context로 패스스루만. **persist 안 함**(read-only compute); 저장 게이팅은 별도. 앵커 추출(자연어→구조화) 안 함 — 구조화 입력(`aiExtracted`) 또는 저장 구조화 필드만 비교(VERIFIERS.md 결정 5).
- **ROI 주의(리뷰 simplerAlternative)**: 차단력 대부분이 ai에 있으므로(LOOP_ENGINE D1), 신규 패키지+10 metric+5 DetSpec+엔진을 한 번에 다 만들지 말고 **`slop_density`/`keyword_coverage`/`quantification_rate` 3개 카운트부터** 코어로 들이고 나머지는 외부 AI 위임으로 시작한다.

### 3.3 `EvaluationReport` 타입 (`packages/shared` 스키마) — **(개념=B-1, 산출=B-2)**
> envelope 모양·`disclaimer`/`gateStatus` required 규약은 B-1에서 합의하되, 이 타입을 채워 반환하는 도구·core 산출은 B-2다.
- **무엇**: `CheckResult`/`MetricResult`/`ArtifactEvaluation`의 zod 스키마+타입. `score`·`gateStatus`·`criticalFailures`·`delegatedToAI`·필수 `disclaimer` 포함.
- **경계**: shared 레이어, 타입만(측정 로직 없음). `disclaimer`·`gateStatus`를 **zod required**로 둬 false pass를 타입 수준에서 차단.

### 3.4 `validate_*`/`lint_*` 도구군 (`packages/mcp-tools` 핸들러) — **(B-2)**
> CONTRACT C3은 `validate_*`를 B-2 레지스트리에 둔다(B-1 레지스트리엔 없음). CONTRACT C4 v2: 이 도구들은 **readOnly·무저장 미리보기**(verifications 적재·activity 로그 금지)이고, 영속·게이트는 `save_*` 핸들러가 담당한다.
- **무엇**: read-only `validate_resume_draft`/`lint_cover_letter`/`lint_interview_kit`; core를 호출해 envelope를 `ok()`로 반환하는 thin 핸들러. description은 self-verify 트리거로 시작하고 `save_*` 넛지로 끝남.
- **경계**: `readOnly: true`, persist 안 함; 로직은 core; zod 입력은 shared 스키마 재사용. **저장 데이터 의존 metric**(keyword_coverage·traceability·R5 수치 출처)은 핸들러가 인자(자유텍스트)만 받지 않고 **core가 `get_resumes`/`jobs.requirements`를 직접 조회**해 비교(리뷰 missing 반영 — AI가 통과할 키워드만 주입하는 게이밍 표면 차단).

### 3.5 `AggregationView` (`get_rejection_patterns` + 대시보드) — **(B-2)**
- **무엇**: 지원 이력 전반의 metric 추세(평균 keyword coverage·quantification_rate·slop_density of rejected)를 cross-tab해 측정 기반 피드백 제공.
- **경계**: `rejection_reviews` 테이블·global 집계(KNOWLEDGE.md §4)에 **선행 의존(미존재, 제안)**. 저장된 `verifications.metrics`를 읽을 뿐 artifact score를 재계산하지 않음. **이 컴포넌트는 제안이며 grounding 아님**(결정 7).

---

## 4. 구체 스펙

### 4.1 `Metric` / `MetricResult` (TS 데이터 스키마)

```ts
// @careermate/knowledge metrics.ts (제안)
export interface Metric {
  id: string;                 // 'quantification_rate'
  label: string;              // '정량화 비율'
  grade: 'det' | 'ai' | 'mixed';   // VERIFIERS와 동일 어휘 (결정 2)
  unit: 'ratio' | 'percent' | 'count' | 'bool';
  defaultPassBar: { op: '<=' | '>=' | '==' ; value: number };
  detSpec?: DetSpec;          // det/mixed의 결정론 부분 (§4.2)
  aiPrompt?: string;          // ai/mixed의 의미 부분 (외부 AI에 위임)
  lexiconRefs?: string[];     // SHARED_LEXICONS id (정본은 VERIFIERS 소유)
  sourceChecks: string[];     // 출처 체크 ID: ['resume.R2','cover-letter.R4',...]
  profiles?: Record<string, { op: '<=' | '>=' | '=='; value: number }>;
  // ↑ years/locale/jobFamily/artifactType별 임계 분기 (정당한 분기)
}
export interface MetricResult {
  metricId: string;
  grade: 'det' | 'ai' | 'mixed';
  value: number | boolean | null;     // null = ai 미실행/입력 부재
  passBar: Metric['defaultPassBar'];
  passed: boolean | 'delegated';      // ai/mixed-ai 부분은 'delegated'
  evidence?: string[];
}
```

**10-metric 카탈로그(보류 — CONTRACT C8 후속 Phase)**(전부 `sourceChecks`로 verifier 참조, 임계는 verifier `DetSpec` 소유). Phase B-1은 이 중 **굵게 표시한 핵심 3 det**(`keyword_coverage`·`quantification_rate`·`slop_density`)만 score envelope에 들이고 나머지는 이월한다:

| id | grade | unit | passBar | 출처 체크 |
|---|---|---|---|---|
| **`keyword_coverage`** (B-1) | det | percent | `>= 50` | resume.R8 · fit.R7 · cover.R10 |
| `must_have_coverage` | det | percent | 맥락 신호(게이트 아님) | fit.R5 |
| `hard_gate_clear` | mixed | bool | `== true` | fit.R6 (det proxy + ai) |
| `star_completeness` | det | ratio | `>= 1.0`(result 비어있지 않음) | behavioral.R1 |
| **`quantification_rate`** (B-1) | det | ratio | `>= 0.6`(신입 0.3) | resume.R2 · cover.R4 · behavioral.R5 |
| **`slop_density`** (B-1) | det | count/100w | `<= 1.5`(<100단어면 절대 카운트로 폴백) | human-voice.C1 · cover.R3 |
| `cliche_count` | det | count | `== 0` | human-voice.C2 |
| `fabrication_count` | ai | count | `== 0` (절대 게이트, det 프록시는 결정 3) | truthfulness.C1/C2/C3/C5 |
| `traceability` | mixed | ratio | `>= 1.0` | truthfulness.C10(det 산술)+C1(ai 입력) |
| `evidence_substring_integrity` | det | bool | `== true` | fit.R3 |
| `generic_opener_count` | det | count | `== 0` | cover.R2 |

> **`must_have_coverage`와 `hard_gate_clear`는 분리한다**(리뷰 inconsistentWithCodebase 반영): fit-matching.md가 "충족률(FM-04, 맥락 신호)과 하드게이트(FM-05, 단독 게이트)의 산술 충돌을 제거, 섞지 말 것"을 강제한다. 따라서 충족률은 게이트 아닌 percent metric, 하드게이트는 별도 bool 게이트로 둔다. **fit.R6의 server rejection은 `requirements[].hardGate` 필드에 의존하는데 그 필드는 KNOWLEDGE.md §4가 "현재 코드에 없음, 신설 필요"로 명시한 미존재 데이터모델**이다 → `hard_gate_clear`는 현 코드로는 집행 불가한 aspirational 게이트이며, `rejection_reviews`/`hardGate` 선행 의존이 충족되기 전까지 **`needs_ai_review`로만** 보고한다.

> **분모 통일(리뷰 missing 반영, openQuestion 아님)**: `quantification_rate`는 resume.R2(result 불릿 한정 ratio)와 human-voice.C11(본문 전체 절대 count ≥2)에서 분모·측정종류가 근본적으로 다르다. 단일 metricId로 묶되 분모를 **`profiles`로 명시 분기**한다: `profiles.resume = {ratio over result-bullets}`, `profiles.humanVoice = {absolute count over body}`. profiles는 정당한 분기이고, **사용자 임의 override는 게이밍 벡터이므로 profiles(years/locale/jobFamily)와 분리**해 dashboard override는 별도 영속·재현 규칙으로 둔다(§6).

### 4.2 `DetSpec` discriminated union

```ts
export type DetSpec =
  | { kind: 'pattern'; patterns: string[]; lexiconRef?: string; flags?: string;
      exclude?: string[] }                         // exclude = 연도/버전 등 맥락 숫자 (false-positive 차단)
  | { kind: 'count_threshold'; metric: string; op: '<=' | '>=' | '==';
      value: number; per?: '100w' | 'sentence' | 'artifact'; minWords?: number }
  | { kind: 'keyword_coverage'; required: string[]; minMatch: number;
      normalize: true; synonyms?: Record<string, string[]> }
  | { kind: 'staleness'; maxAgeDays: number; anchorField: string }
  | { kind: 'traceability'; requireSourceFor: string[]; substring: true };
```
- 각 kind는 `evaluation.ts`에 하나의 결정론 executor. 의미 항목은 `DetSpec` 없이 `aiPrompt`만.
- `count_threshold.minWords`(짧은 산출물 방어, 리뷰 missing 반영): `<minWords`(예 100단어)면 `per:'100w'` 정규화를 끄고 **절대 카운트로 폴백** — 1분 자기소개·STAR 1건에서 1개만 걸려도 1.5/100w를 폭파시키는 false-positive 차단.
- `exclude`(리뷰 strongPoint 유지): resume.R2 false-positive·cover R4 negative-lookahead 요구를 데이터 스키마로 흡수.

### 4.3 `EvaluationReport` envelope (zod, shared)

```ts
export interface CheckResult {
  id: string;                          // 'resume.R2'
  grade: 'det' | 'ai' | 'mixed';
  passed: boolean | null | 'delegated';
  value?: number | boolean;
  passBar?: { op: string; value: number };
  severity: 'block' | 'warn' | 'info';
  note?: string;                       // 'skipped: needs structured input'
  evidence?: string[];
}
export interface ArtifactEvaluation {
  artifactType: 'resume' | 'cover_letter' | 'interview_kit' | 'fit_analysis';
  checks: CheckResult[];
  metrics: MetricResult[];
  score: number;                       // 0~1, det 가중만 (결정 7)
  detClear: boolean;                   // LOOP_ENGINE 정렬 (결정 6)
  gateStatus: 'pass' | 'hard_fail' | 'needs_ai_review';  // zod required, 보고 라벨 (결정 4)
  criticalFailures: number;
  delegatedToAI: { checkId: string; aiPrompt: string; context: unknown }[];
  disclaimer: string;                  // zod required (false-pass 차단)
}
```
- `gateStatus`/`disclaimer` **zod required**. det-only-pass는 ai 위임이 남으면 `pass` 금지 → `needs_ai_review`(결정 4).
- `disclaimer` 고정 문구: "이 점검은 형식·표면 위생(키워드 커버리지·정량화·슬롭·근거 추적)만 봅니다. 통과해도 합격이 아니며, 의미·적합·진정성 판단은 당신(AI)이 끝내야 합니다."

### 4.4 MCP 도구 계약 (제안, `ToolDef` 모양 — result.ts:18) — **(B-2)**

> CONTRACT C3은 `validate_*`/`lint_*`(det compute)를 **B-2 레지스트리**에 둔다. 아래 계약은 B-2 착수 시 구현하며, **B-1 도구 레지스트리엔 없다**. B-1에서 작성 기준 안내는 `get_playbook`/`get_verifier`(serve) 출력으로 대체한다.

모두 `toCallToolResult`로 surface(JSON 텍스트 블록 + structuredContent, output schema 없음). `openWorldHint=false`는 apps/mcp 등록에서 전역(ARCHITECTURE.md §3.2).

- **`validate_resume_draft`** · `readOnly: true`
  - description(트리거 #1): "**이력서를 저장하거나 손보기 직전에 호출해 형식 위생을 자가검증하세요.** action verb·정량화 비율·키워드 커버리지·PII 노출을 CareerMate가 LLM 없이 셉니다. 통과 후 `add_resume`로 저장하세요. 이 점검은 합격을 보장하지 않습니다."
  - inputSchema: `{ resumeText: z.string(), jobKeywords: z.array(z.string()).optional(), yearsExperience: z.number().optional(), jobFamily: z.enum(['eng','design','pm','research','sales','newgrad']).optional(), language: z.enum(['en','ko']).optional() }`
  - handler → `core.evaluateResume` → `ArtifactEvaluation`. R6 ATS 구조는 평문에선 `note: 'original-format-unverified'`, R7 역시간순은 구조화 입력 없으면 skipped.

- **`lint_cover_letter`** · `readOnly: true`
  - description: "**`save_cover_letter_version` 직전에 호출하세요.** generic opener·빈 형용사 슬롭·정량 성과·숫자 출처·길이를 regex/count/ratio로 자동 채점하고, 회사 고유성(R6)·근거 페어링(R8)·역할 구조(R1)는 당신(AI)에게 위임합니다. `save_cover_letter_version`으로 저장하세요."
  - inputSchema: `{ text: z.string(), jobId: z.string().optional(), locale: z.enum(['ko','en']), countMode: z.enum(['with_space','no_space','byte']) }`
  - handler → `core.lintCoverLetter`. R5 숫자 출처는 core가 `get_resumes` 대조; R10은 키워드 부재 시 `passed: null`. **criticalFailures 게이트는 순수 det만**: R2(generic opener 도입패턴)·R4(델타 패턴)만; **R3(사전 우회 가능)·R5(저장 데이터 조회 필요)는 감점, R6(부분 ai = mixed)은 위임** — ai 부분을 det로 hard_fail하면 grade spoofing이므로 게이트에서 제외(리뷰 mustFix #3·inconsistentWithCodebase 반영).

- **`lint_interview_kit`** · `readOnly: true`
  - description: "**스토리 뱅크를 검토할 때 호출하세요.** STAR 완성도·1인칭 비율·정량 결과·꼬리질문 3종·뱅크 커버리지를 셉니다. 역량 적합(R7)·최신성(R13)은 위임합니다. 면접 준비 저장은 '서류 합격' 이상에서만 됩니다."
  - inputSchema: `{ jobId: z.string().optional() }`
  - handler → `core.lintInterviewKit`. R4/R9는 `entry.lang` 분기; R7·R13은 `delegatedToAI`. **저장 게이트는 `save_interview_prep` 서비스가 별도로 강제**(services.ts:172–186) — lint은 read만, save가 gate.

- **~~`get_evaluation_metrics`~~ — 폐기명, 신설 금지(CONTRACT C3) · 이월(C8)**
  > `get_evaluation_metrics`는 CONTRACT C3 폐기 도구명 목록에 든다 — B-1·B-2 어디서도 이 이름으로 신설하지 않는다. 전용 metric-serve 도구 자체가 후속 Phase로 이월이며, B-1은 작성 기준을 `get_playbook`/`get_verifier`(CONTRACT C3 serve) 출력에 score envelope 임계를 동봉해 알린다. 후속 Phase에서 metric 카탈로그를 serve할 필요가 생기면 폐기명이 아닌 새 정본 이름을 C3에 추가해 쓴다. 아래는 이월된 설계 스케치다.
  - 가상 description(스케치): "각 품질 metric이 어떻게(det/ai/mixed) 측정되고 합격 기준이 무엇인지 미리 알아 작성 기준을 맞추려 할 때."
  - inputSchema(스케치): `{ artifactType: z.enum([...]).optional(), grade: z.enum(['det','ai','mixed']).optional() }`
  - handler(스케치) → 필터링된 `METRICS` 순수 serve(`get_writing_style_guide` 패턴, tools.ts:616). 응답에 disclaimer 동봉.

> **소비 경로 배선(CONTRACT C7 v2 — 가장 강한 진입점)**: pull+신뢰 모델은 description만으론 약하므로 v2는 가장 강한 기존 진입점에 박는다. (1, B-1) **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입**(tools.ts:443 호출강제 문구·:453 넛지 전례) — 외부 AI가 분석·작성 전 거의 항상 부르는 도구라 verifier 경로를 사실상 못 피한다. (2, B-1) **MCP server instructions(apps/mcp/src/index.ts:26)에 "저장 전 verifier 경로" 추가** — AGENTS를 안 읽는 클라이언트에도 전달. (3, 보조) description 트리거·AGENTS.md #9·출력 넛지. (B-2) `save_cover_letter_version`/`save_fit_analysis` core fn이 det 위반·`needs_ai_review`를 발견하면 `💡 lint_cover_letter / 해당 playbook으로 자가검증 후 다시 저장하세요` 넛지를 붙인다(services.ts hint 어휘 확장). master router `get_workflow_guide`(CONTRACT C3 확장, B-1) 출력은 해당 verifier 시퀀스를 넛지.

### 4.5 `REPORT_GATE_STATUS` enum (제안)

```ts
export const REPORT_GATE_STATUS = ['pass', 'hard_fail', 'needs_ai_review'] as const;
// 규칙(결정 4): criticalFailures>0 → hard_fail; else delegatedToAI.length>0 → needs_ai_review;
//               else (det 전부 통과 + 위임 0) → pass. det-only-pass의 pass 라벨은 ai 체크 0인 artifact에서만 가능.
```
core throw 아님 — 보고 라벨. 차단은 `saveInterviewPrep` 상태 게이트 하나(결정 4).

### 4.6 테이블 (신설 없음) — **(B-2)**

EVALUATION은 **새 테이블을 제안하지 않는다**(결정 5). CONTRACT C5의 `verifications` 테이블(B-2)을 재사용하며, 그 `metrics_json`(평탄화 `Record<string,number>`)에 `"_artifact_score"`를, **전용 `gate_status TEXT` 컬럼**에 gateStatus 라벨을 담는다(det는 `computed_json`, 외부 AI 자기보고는 `ai_reported_json`). cross-tab(`get_rejection_patterns`)도 같은 테이블을 읽는다. 마이그레이션·`MIGRATIONS` append는 **CONTRACT C5/VERIFIERS.md/TODO.md 소유**(schema.ts:288–307 패턴, forward-only). **B-1은 이 테이블을 만들지도 쓰지도 않는다**(게이트·영속 0).

### 4.7 AGENTS.md 제안 패치 블록 (적용 안 함)

> 아래는 **제안**이며 실제로 AGENTS.md를 수정하지 않는다. 스파인 원칙대로 최대 1불릿, master router 1회만 노출, verifier 이름은 description에 위임.

기존 `get_writing_style_guide` 불릿(AGENTS.md:18)을 접어 한 불릿으로:

```markdown
- **산출물을 저장하기 전, 해당 도메인 플레이북으로 작성하고 CareerMate의 det 점검(키워드 커버리지·정량화 비율·슬롭 밀도·날조 0)으로 형식 위생을 확인한 뒤, 의미·적합·진정성 판단은 당신이 마무리하라.** 통과는 합격이 아니라 "형식 결함이 적다"일 뿐이다. 어떤 순서로 점검할지는 `get_workflow_guide`에 물어라.
```

`prompts/system.ts`(CAREERMATE_SYSTEM_PROMPT 번호 목록, system.ts:11)에 동길이 항목 미러(#1 맥락 먼저·#2 저장·#8 AI 티와 동기화):

```text
9. 저장 전 자가검증: 이력서·자소서·면접 자료·적합도 분석을 저장하기 전, CareerMate의 형식 점검(키워드·정량화·슬롭·날조 0)으로 표면을 확인하고 의미 판단은 네가 끝낸다. 통과 ≠ 합격.
```

---

## 5. 기존 아키텍처·코드와의 정합

공통 보일러플레이트(structuredContent 객체 래핑·길이캡 상속·core 단일 진입점·zod 재사용·본문 미누수·정규식 안전·2-프로세스/WAL·openWorldHint=false)는 **→ [CONTRACT.md](CONTRACT.md) §C9 참조**. 아래는 이 문서 고유의 정합 포인트만:

- **읽기/쓰기 주체 분리**: `validate_*`/`lint_*`는 `readOnly`로 **compute만, persist 안 함**(C9.8). 영속화는 `save_*` core fn이 외부 AI가 넘긴 메타가 아니라 **core가 재계산한 det 결과**를 `verifications`에 기록(VERIFIERS.md 결정 2의 `computed` vs `aiExtracted` 분리 차용) → AI 주입 score를 신뢰하지 않으므로 2-프로세스 WAL(C9.7)에서 쓰기 주체가 명확.
- **envelope 표면화**: §4.3 `ArtifactEvaluation`은 plain object라 `toCallToolResult`로 structuredContent에 실린다(C9.1 — 배열 최상위 반환 금지). `gateStatus`/`disclaimer`는 shared zod에서 **required**로 두어 false-pass를 타입 수준 차단.
- **테이블 0건(결정 5, CONTRACT C5, B-2)**: 새 `artifact_evaluations` 테이블을 신설하지 않고 CONTRACT C5 소유의 `verifications` 1건만 재사용(score=`metrics_json._artifact_score`, gateStatus=전용 `gate_status` 컬럼). EVALUATION은 `MIGRATIONS` append를 소유하지 않는다. 이 영속은 B-2이며 B-1엔 없다.
- **새 throw 경로 없음(결정 4, CONTRACT C4)**: 저장 차단은 `saveInterviewPrep`의 상태 게이트 하나(services.ts:178)뿐. `gateStatus`는 보고 라벨이며 core가 throw하지 않는다.
- **cross-tab은 제안(결정 7)**: `get_rejection_patterns` 집계는 신규 로직. 기존 `updateApplicationStatus`(services.ts:153)는 metric을 집계하지 않음 — grounding 아님.

---

## 6. 미해결 질문 / 리스크

- **사용자 임계 override 영속·재현**: `slop_density 1.5/100w`·`quantification 60/30`은 heuristic. `profiles`(years/locale/jobFamily) 분기는 정당하지만 **dashboard에서 사용자가 임계를 낮춰 게이밍하는 경로**(slop 1.5→5.0)는 분리해야 한다. override 값의 저장 위치·재현 규칙·감사 로그 미결.
- **`fabrication_count` 절대 게이트의 잔여 위험**: det 프록시(traceability substring + literal-match + placeholder_delta, 결정 3)가 깨끗해도 진위(ai)는 보고됨일 뿐. ai 미실행 시 `needs_ai_review`로 강등하나, 외부 AI가 `aiReported`를 0으로 거짓 보고하면 막을 수 없음(LOOP_ENGINE D1의 "보고됨 ≠ 검증됨"과 동일 한계).
- **`verifications.metrics_json`에 score 평탄화의 한계(B-2)**: `Record<string,number>`엔 숫자만 들어가므로 `_artifact_score`는 OK지만, gateStatus 같은 문자열 라벨은 v2가 신설한 전용 `gate_status TEXT` 컬럼에 담는다(별 키 우회 불필요). 키 네이밍은 CONTRACT C5 테이블 소유자와 합의.
- **`artifact_ref` 버전 충돌**: `cover_letter_version`/`resume_version` 같은 버전 산출물을 가리킬 때, 재분석 트리거(fit.R10 freshness)와 version-id 변경 감지가 `staleness` DetSpec의 `anchorField`와 겹치는 처리 미정.
- **`hard_gate_clear` 선행 의존**: `requirements[].hardGate` 필드 미존재(KNOWLEDGE.md §4) → fit.R6 서버거부는 현 코드로 집행 불가. 이 metric은 `rejection_reviews`/`hardGate` 데이터모델 신설 전까지 `needs_ai_review`로만 보고.

---

## 7. 관련 문서 (cross-links)

- Phase A 지식(metric 출처): [knowledge/resume.md](../knowledge/resume.md) §3 R1–R9 · [knowledge/cover-letter.md](../knowledge/cover-letter.md) §3 R1–R12 · [knowledge/interview-behavioral.md](../knowledge/interview-behavioral.md) §3 R1–R13 · [knowledge/fit-matching.md](../knowledge/fit-matching.md) §3 R1–R10
- Phase A 검증기: [knowledge/verifiers/human-voice.md](../knowledge/verifiers/human-voice.md) §2 C1–C11 · [knowledge/verifiers/truthfulness.md](../knowledge/verifiers/truthfulness.md) §2 C1–C10
- Phase B 형제: [VERIFIERS.md](VERIFIERS.md)(`VERIFIERS`·`RubricCheck` det/ai/mixed·`verifications` 테이블 소유) · [EXPERTS.md](EXPERTS.md)(`get_playbook` 디스패처 · `get_workflow_guide` master router, CONTRACT C3) · [LOOP_ENGINE.md](LOOP_ENGINE.md)(`detClear`/`aiReported`·verdict·StopCondition 소유) · [CONSENSUS_ENGINE.md](CONSENSUS_ENGINE.md)
- 인덱스: [KNOWLEDGE.md](KNOWLEDGE.md) §0(3-트리거 소비·draft-verify-revise) · §2(det/ai 정직 분리) · §3(공유 사전 단일 정본) · §4(데이터모델 의존: `rejection_reviews`·`hardGate`·버전 신선도)
- 아키텍처: [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md) §2/§8(레이어·단일 core) · §3.1/§3.2(migrate·openWorldHint) · §5(ToolResult·문서 본문 비노출)
- 코드: `mcp-tools/result.ts:18`(`ToolDef`)·`:37`(`toCallToolResult`); `tools.ts:616-623`(`get_writing_style_guide` serve)·`:591-612`(`get_workflow_guide` router); `db/schema.ts:288-307`(`MIGRATIONS`); `core/services.ts:172-186`(`saveInterviewPrep` 게이트)·`:145-168`(`updateApplicationStatus` hint 넛지); `shared/enums.ts:48`(`INTERVIEW_UNLOCK_STATUSES`)·`:67-91`(전이 규칙)
