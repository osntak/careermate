# det 평가 엔진 (core/verify) — Career-OS Phase B-2 상세 설계

> 횡단 결정 정본 = [CONTRACT.md](../CONTRACT.md). 이 문서는 **B-2 구현 스펙(설계만, 코드 미수정)**. CareerMate 내부 LLM 없음.
> 도구 표면·출력 봉투(`DetObservation`)·시그니처 정본은 [03-compute-validate-tools](03-compute-validate-tools.md)이 소유한다. 본 문서는 그 도구들이 호출하는 **core det 엔진의 내부 구현**을 소유한다(인터페이스는 03 §3.7과 1:1 일치).

---

## 1. 목적·범위

det 엔진은 `@careermate/core`에 사는 **순수 결정론 계산 모듈**이다. `RubricCheck.detLogic`(`DetSpec` 5종)을 입력 텍스트에 적용해 **외부 AI 주입 0짜리 관측치**(`serverComputed`)만 계산하고, 의미판단이 필요한 항목은 `residual_ai_checks`로 패스스루한다. **LLM 호출 없음, DB 쓰기 없음.**

소유 범위:
- `runVerifierPass` / `runTraceability` / `runStaleness`(03 §3.7 시그니처)의 **내부 로직**.
- `DetSpec` 5종(`pattern` / `count_threshold` / `keyword_coverage` / `staleness` / `traceability`) 각각의 실행기.
- 한국어/영어 토큰화·글자수 산정, 정규식 합성·1회 컴파일·캐싱, `SHARED_LEXICONS` 비공개 적용, `serverComputed`/`aiExtractedInput`/`mixed` 출처 분리 강제, `requiresSchemaVersion` graceful-degrade.

범위 밖(명시):
- 도구 description·zod 입력·출력 키 정본 = **03**. 게이트 재계산·`verifications` 적재·`activityRepo.log` = **04**. 마이그레이션·해시 컬럼·정규화 규칙(R3) = **01(migrations)**. 검증기 루브릭 데이터(`VERIFIERS`)·`SHARED_LEXICONS` 데이터 = `@careermate/knowledge`(VERIFIERS.md 소유). 본 엔진은 그 데이터를 **읽어 실행만** 한다.

**핵심 제약(절대):** `serverComputed` 버킷에는 외부 AI 주입이 0인 값만 담는다. `aiExtractedInput`이 한 방울이라도 섞인 파생값(`keyword_coverage_ratio`·`traceability`·`freshness_ratio`)은 **`mixed`(advisory:true)** 로만 내보내고 절대 `det`/`hard`/gate로 표기하지 않는다(CONTRACT C2, det 사칭 차단).

---

## 2. 데이터/타입 계약 (TS 인터페이스)

본 엔진은 신규 타입을 거의 만들지 않는다 — 03 §2가 `DetObservation`·`MixedValue`·`Grade`·`DetSpec`·`RubricCheck`를 정본으로 정의한다. 엔진 전용 내부 타입만 추가한다.

```ts
// packages/core/src/verify/types.ts (core 내부; 외부 노출 없음)
import type { DetSpec, RubricCheck, DetObservation } from '@careermate/knowledge';

// 컴파일된 정규식 캐시 엔트리. 모듈 로드 시 1회 빌드(C9-6).
interface CompiledLexicon {
  ref: string;                 // lexiconRef (예: 'slop.ko', 'hype.ko', 'cliche.ko')
  regex: RegExp;               // 합성 패턴(alternation), flags 고정
  patternCount: number;        // 패턴 개수(상한 검사용)
}

// 토큰화 정책 — locale·count_mode에 따른 글자/어절 산정(D1, VERIFIERS R4 의존).
interface TokenPolicy {
  locale: 'ko' | 'en';
  countMode: 'with_space' | 'no_space' | 'byte';
}

// 한 RubricCheck 실행 결과 → DetObservation 버킷으로 병합되는 중간형.
type CheckOutcome =
  | { bucket: 'serverComputed'; key: string; value: number }
  | { bucket: 'aiExtractedInput'; key: string; value: number }
  | { bucket: 'mixed'; key: string; value: number | null; basis: string }
  | { bucket: 'residual'; id: string; aiPrompt: string }
  | { bucket: 'degraded'; field: string; reason: string };
```

`DetObservation`/`MixedValue` 불변식(03 §2.1 재확인): `mixed.*`는 전부 `advisory:true`; 계산 불가 키는 `serverComputed`에서 **제거**하고 `degraded`로만 표기(`false`로 남기지 않음 → "드리프트 없음=신선" 오독 차단).

---

## 3. 함수·도구 시그니처

본 엔진은 도구가 아니다. 03 §3.7이 부르는 core fn 3종의 시그니처를 **그대로** 구현한다(재서술하지 않음 → 03 §3.7 정본). 내부 헬퍼만 정의한다.

```ts
// packages/core/src/verify/engine.ts
// 단일 DetSpec 실행기 — switch 디스패치. 외부 AI 주입은 ctx로만 받는다.
function runDetCheck(
  check: RubricCheck,
  text: string,
  ctx: { schemaVer: number; jobId?: string; ai?: Record<string, number>; policy: TokenPolicy },
): CheckOutcome[];

// lexiconRef → 컴파일된 정규식(캐시 히트). 미존재 ref는 throw(개발자 오류).
function getCompiledLexicon(ref: string): CompiledLexicon;

// 한/영 토큰화·글자수. count_mode·locale 반영.
function tokenize(text: string, policy: TokenPolicy): { tokens: string[]; charCount: number; wordCount: number };

// 저장된 키워드 집합 로드(안티게이밍: 외부 AI 입력으로 안 받고 DB에서). jobs.keywords(ai 산물)임을 호출부가 인지.
function loadJobKeywords(jobId: string): string[];
```

`runVerifierPass`(03 §3.7)는 `verifierIds`를 순회하며 각 `check`에 대해 `runDetCheck`를 호출하고 `CheckOutcome[]`을 `DetObservation` 버킷으로 reduce한 뒤, `knowledge.getVerdictRule(verifierIds)`(데이터)를 동봉해 반환한다. **엔진은 verdict를 평가하지 않는다**(LOOP_ENGINE: 적용은 외부 AI).

---

## 4. 로직 (DetSpec 5종 실행기)

`runDetCheck`의 `switch (check.detLogic.kind)`. 모든 분기 공통 선처리:

```
if check.grade === 'ai': return [{bucket:'residual', id:check.id, aiPrompt:check.aiPrompt}]
if detLogic.requiresSchemaVersion && ctx.schemaVer < detLogic.requiresSchemaVersion:
    return [{bucket:'degraded', field:check.id, reason:'schema_version<required'},
            {bucket:'residual', id:check.id, aiPrompt: check.aiPrompt ?? '구조화 필드 미충족: 외부 AI 판정'}]   # graceful-degrade to ai
```

### 4.1 `pattern` (슬롭·과장어·상투구·플레이스홀더 카운트)
```
{ kind:'pattern', lexiconRef, patterns?, flags, min?, max? }
re = lexiconRef ? getCompiledLexicon(lexiconRef).regex : compileInline(patterns, flags)   # 캐시/1회 컴파일
n  = (text.match(re) || []).length                                                          # text는 MAX_BODY bound
→ [{bucket:'serverComputed', key: check.id /* 예: 'slop_count' */, value: n}]
```
- 순수 `serverComputed`. `severity:'hard'`인 pattern 체크가 있으면 04 gateable 후보(현실적으로 slop은 soft).
- `flags`는 `'g'|'gi'`로 고정. 동적 사용자 입력으로 정규식을 만들지 않는다(ReDoS 차단). 패턴 개수 상한·합성 1회 컴파일은 §5 C9-6.
- `min`/`max`는 카운트 자체가 아니라 **호출부(04 게이트)** 가 해석할 임계 — 엔진은 카운트만 낸다(per-check pass/fail 금지, 03 §3.7).

### 4.2 `count_threshold` (글자수 상한·정량화율 등)
```
{ kind:'count_threshold', metric, op, value, minWords? }
m = metricValue(metric, text, ctx.policy)   # 예: char_count(count_mode), result_bullet_ratio
→ [{bucket:'serverComputed', key: metric, value: m}]
# minWords 미만이면 분모 부족 → 관측치는 내되, '못 셈' 구분을 위해 분모도 노출(§6 0의 의미)
```
- `char_count`는 `ctx.policy.count_mode`(with_space/no_space/byte)·`locale`로 산정(D1 의존). **count_mode가 미합의면 `char_count`는 호출마다 흔들려 재현성 미달** → D1 해소 전에는 `serverComputed` 등급 부적격 위험(§7 D1).
- 영문=단어수, 국문=글자수/어절수 분기(`tokenize`).

### 4.3 `keyword_coverage` (mixed — 교집합만 det)
```
{ kind:'keyword_coverage', lexiconRef?, required?, minMatch }
jdSet   = required ?? loadJobKeywords(ctx.jobId)        # ai 산물(save_job_posting 입력)
textTok = tokenize(text, policy).tokens                 # 정규화(소문자·공백/점 제거) 후 토큰
inter   = |normalize(jdSet) ∩ normalize(textTok)|
→ [{bucket:'serverComputed',  key:'keyword_intersection_count', value: inter},
   {bucket:'aiExtractedInput', key:'jd_keywords',               value: |jdSet|},
   {bucket:'mixed', key:'keyword_coverage_ratio', value: |jdSet|>0 ? inter/|jdSet| : null,
    basis:'키워드 집합=ai 추출, 교집합 셈만 det'}]
```
- **교집합 카운트만 `serverComputed`**, 키워드 집합이 ai 유래라 **비율은 `mixed`**(CONTRACT C2 — 비율을 det로 표기하면 det 사칭). 정규화(약어/동의어/한국어 어간)는 `SHARED_LEXICONS`의 synonym 사전으로 — 단순 문자열 매칭 금지(이력서 도메인 R8 정신).

### 4.4 `staleness` (날짜 산술 = serverComputed, recent-fact 매핑 = ai)
03 §4.4 `runStaleness`와 동일. 엔진 관점:
```
{ kind:'staleness', maxAgeDays, anchorField }
undated_temporal_count = countUndatedTemporal(text)                       # serverComputed (정규식)
content_hash_drift     = (조건 충족 시) normalize(cur)!=stored ? 1 : 0    # serverComputed, 조건부(03 §3.3)
freshness_ratio        = mixed(advisory, basis:'recent-fact=ai')          # 항상 mixed
```
- `content_hash_drift`는 **(a) schemaVer≥v5 ∧ (b) 정규화 규칙(R3) 합의 ∧ (c) 저장 해시 존재** 모두일 때만 `serverComputed`에 채우고, 아니면 `degraded`(false로 안 남김). 미저장 본문(`text`-only)은 비교 대상 없으니 항상 `degraded`.

### 4.5 `traceability` (mixed — 분모만 det)
`runVerifierPass` 경로에서는 미앵커 입력이 없으면 `residual`로 패스스루하고, 전용 입력이 오면 03 §4.3 `runTraceability`로 위임:
```
N_total = countQuantTokens(text)                                   # serverComputed (quant_pattern 고정 정규식)
placeholder_delta = priorText ? count(now)-count(prior) : null     # serverComputed (저장 직전버전 있을 때만)
traceability = N_total>0 ? (N_total - ai.N_unanchored - ai.N_unverified)/N_total : null   # mixed (분자=ai)
```
- `N_total`/`placeholder_count`는 `serverComputed`, **비율은 `mixed`**. `quant_pattern` 정의는 정본에 고정(흔들리면 N_total 재현성 깨짐 — detSpoofingRisk).

### 4.6 reduce → DetObservation
`CheckOutcome[]`을 버킷별로 모은다. 동일 key 충돌 시 마지막 승(검증기 순서 결정적). `residual`은 누적, `degraded`는 누적. 최종 `{serverComputed, aiExtractedInput?, mixed?, residual_ai_checks?, degraded?}` + (runVerifierPass면) `verdictRule`.

---

## 5. 기존 코드 정합 (파일:심볼)

| 영역 | 실제 심볼 | 정합 결정 |
|---|---|---|
| 엔진 위치 | `packages/core/src/services.ts`(`updateApplicationStatus`/`saveInterviewPrep` 거주) | det 엔진은 `core/verify/`(engine.ts/types.ts) 서브모듈로 분리(`services.ts` 비대화 방지, ARCH R1). web REST·mcp 핸들러가 공유하는 **단일 진입점**. |
| NO LLM / NO persist | — | 엔진은 `verificationRepo`·`activityRepo`·네트워크를 **호출하지 않는다**. 적재·게이트는 04. |
| 길이캡 | `schemas.ts:55` `MAX_BODY=200_000` | `text`는 입력 zod(`optBody`)에서 이미 200KB bound. 정규식은 bound된 입력에만 적용(이벤트 루프 블록 방지, C9-6). |
| 정규식 안전 | `SHARED_LEXICONS`(@careermate/knowledge) | `getCompiledLexicon`이 모듈 로드 시 1회 합성·컴파일·캐싱. `flags` 고정, 패턴 개수 상한. 사용자 입력으로 정규식 생성 금지(ReDoS). |
| schema_version 재독 | `schema.ts:288-307` `migrate()`·`_meta.schema_version` | `runVerifierPass`/`runStaleness`는 **부팅 캐시가 아니라 런타임 `_meta`/PRAGMA 재조회**로 `requiresSchemaVersion` 판정 → 2-프로세스(web·MCP)가 다른 degraded 상태로 갈리지 않게(03 §6). |
| 키워드 출처 | `schema.ts:110` `jobs.keywords`(JSON TEXT, `save_job_posting` 입력) | `loadJobKeywords`가 DB에서 끌어옴(외부 AI 입력 안 받음=안티게이밍). 단 키워드 집합 자체가 ai 산물 → `keyword_coverage`는 `mixed`. |
| 본문 미누수 | `result.ts:38-40` `r.data`가 ```json 펜스로 text에 복제 | 엔진 출력 `data`에는 **카운트/메트릭만**, 200KB 원문 절대 미포함(C9-5). |
| structuredContent | `result.ts:42-46` plain object만 | 엔진 반환은 항상 객체(배열 아님). 도구 핸들러가 `ok(text, obs)`로 래핑(C9-1). |

---

## 6. 엣지·실패 모드·테스트 포인트

- **graceful-degrade 결정성:** `requiresSchemaVersion` 미충족 체크는 `serverComputed`에 안 나타나고 `degraded`+`residual`에만. **테스트:** v5 이전 스키마에서 `staleness.content_hash_drift`가 `serverComputed`에 **부재**(false도 아님).
- **빈/공백 입력:** 엔진은 `text=''`에서 모든 카운트 0을 내지만, 호출부(03 validate_* handler)가 빈 입력을 `fail`로 막는다 — 엔진은 분모(검사 토큰 수·`char_count`)를 함께 내 "0=문제없음"과 "0=못 셈" 구분을 가능케 한다.
- **det 사칭 회귀:** `keyword_coverage_ratio`·`traceability`·`freshness_ratio`가 출력에서 **반드시 `mixed`(advisory:true)** 버킷임을 단언. **테스트:** 이 3키가 `serverComputed`에 나타나면 실패.
- **정규식 재현성:** 동일 입력·동일 lexicon 버전 → 동일 카운트. lexicon 버전 변경 시 카운트 변동을 회귀셋으로 추적(human-voice 캘리브레이션 의존). **테스트:** golden 입력 셋의 `slop_count` 고정.
- **2-프로세스 schema_version 분기:** web·MCP 부팅 타이밍이 달라도 `runVerifierPass`가 런타임 재독으로 동일 degraded 판정. **테스트:** v4/v5 경계에서 두 진입점 동일 출력.
- **한/영 혼용 char_count:** `count_mode`별 산정이 호출 간 안정(D1). **테스트:** 동일 텍스트·동일 count_mode → 동일 `char_count`.
- **per-check pass/fail 금지:** 엔진 출력에 boolean `passed`가 없음(관측치만). **테스트:** 출력 스키마에 pass/fail 키 부재.

---

## 7. 미해결/의존

| ID | 항목 | 분류 | 소관 |
|---|---|---|---|
| D1 | `count_mode`(with_space/no_space/byte)·`locale` 기본값 + 한/영 혼용 글자수 산정 알고리즘 **단일 정본**. 미정 시 `char_count`가 호출마다 흔들려 `serverComputed` 등급 부적격. inputSchema vs 설정 모듈 위치 결정(VERIFIERS R4와 동일 이슈). | **선행 의존(blocker for count_threshold char metrics)** | 01/knowledge + 03 |
| D4 | `SHARED_LEXICONS`의 `lexiconRef` 네임스페이스·버전 필드·`quant_pattern`/`temporal_pattern` 정본 위치 확정(원문 비공개 serve와 양립). lexicon 버전이 카운트 재현성·캘리브레이션의 기준. | 의존 | knowledge(VERIFIERS) |
| H2 | `loadJobKeywords`가 쓰는 동의어/약어/한국어 어간 정규화 사전을 `SHARED_LEXICONS`에서 공급(이력서 R8·fit-matching R7 공유). 미공급 시 keyword_coverage가 단순 문자열 매칭으로 퇴화(구조적 false negative). | 의존 | knowledge(VERIFIERS) |
| R1 | (참조, 05 소관) v5 ALTER 비멱등 + 2-프로세스 boot → `migrate()` `BEGIN IMMEDIATE`+double-checked version 가드. `content_hash_drift` 출하 선행조건. | 선행 의존 | 05/db |
| D5 | det 엔진을 `core/verify/` 서브모듈로 분리할지 `services.ts`에 둘지(파일 비대화 임계). 인터페이스는 동일하므로 구현 시 결정(ARCH R1). | 미해결 | core |
