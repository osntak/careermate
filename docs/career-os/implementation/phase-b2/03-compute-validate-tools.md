# compute·validate 도구 계약 — Career-OS Phase B-2 상세 설계

> 횡단 결정 정본 = [CONTRACT.md](../CONTRACT.md). 이 문서는 **B-2 구현 스펙(설계만, 코드 미수정)**. CareerMate 내부 LLM 없음.

---

## 1. 목적·범위

Phase B-2의 "compute·validate 도구 계약" 컴포넌트는 **CareerMate가 내부 LLM 없이 결정론적(det)으로만 계산할 수 있는 신호**를 외부 AI에게 돌려주는 도구 표면을 정의한다. 두 부류다.

1. **compute 도구 (신규 2종, `check_traceability` / `check_staleness`)** — 외부 AI가 NER·미앵커 판정 같은 의미판단 결과를 `aiExtractedInput`으로 **명시 주입**하면, CareerMate는 토큰 수 세기·날짜 산술·해시 비교 같은 외부입력 0짜리 계산만 수행해 돌려준다. CONTRACT C3에 따라 신규 compute 도구는 **정확히 이 2종**이며 consistency/responsiveness 전용 도구나 JD 키워드 추출-serve 도구는 신설하지 않는다.
2. **validate 도구 (readOnly preview 3종, `validate_cover_letter` / `validate_resume_draft` / `validate_interview_kit`)** — `save_*`로 저장하기 **직전** 외부 AI가 자가검증하도록 det 신호(슬롭 밀도·플레이스홀더·키워드 교집합)를 미리보기로 준다. **아무것도 저장·차단하지 않는다.**

**범위 밖(명시):**

- **강제·영속**(gateableCheckIds 재계산, `verifications` 테이블 적재, `activityRepo.log('verification_run')`)은 전부 **`save_*` gate 컴포넌트(04) 소관**이다. 본 컴포넌트의 도구는 단 하나도 `verificationRepo`·`activityRepo`를 호출하지 않는다 (CONTRACT C4 CRITICAL 2 — 한 도구가 "미리보기"와 "강제·기록"을 겸하면 `readOnlyHint`가 거짓이 됨).
- `evaluate_offer` / `offer_evaluated` 활동은 **mutate 도구이며 04 소관**이다. 본 컴포넌트 밖.
- `hash` 컬럼 마이그레이션(슬롯 v5)·해시 정규화 규칙은 **05(migrations) 소관**이며, 본 컴포넌트의 `check_staleness`는 그 선행물에 의존한다(§7).

**핵심 제약(절대):** 모든 출력은 `DetObservation` 3버킷 출처태깅 봉투로 돌려주고, `aiExtractedInput`이 한 방울이라도 섞인 파생값은 **det/hard/gate로 표기 금지(mixed = advisory only)**. `serverComputed` 버킷에는 외부 AI 주입이 0인 값만 담는다 (CONTRACT C2). 게이트가 막을 수 있는 truthfulness-critical 체크는 **사실상 0건**이다(§4.6) — 이 도구들은 신호만 주고 아무것도 막지 않는다.

---

## 2. 데이터/타입 계약 (TS 인터페이스 / SQL DDL)

### 2.1 `DetObservation<T>` — 모든 compute 출력의 루트 (CONTRACT C2)

`packages/shared/src/schemas.ts`에 신설(또는 `@careermate/knowledge`에서 재노출). 데이터 전용 타입, 로직·LLM·DB 없음.

```ts
export interface DetObservation<T = Record<string, number>> {
  serverComputed: T;                            // 외부 AI 주입 0으로 완전 계산. gateable iff hard.
  aiExtractedInput?: Record<string, number>;    // 외부 AI가 NER/recent-fact 매핑으로 주입한 값.
  mixed?: Record<string, MixedValue>;           // 둘에서 파생(traceability·freshness_ratio) => advisory only.
  residual_ai_checks?: { id: string; aiPrompt: string }[]; // 외부 AI가 아직 돌려야 할 ai 항목.
  degraded?: { field: string; reason: string }[]; // requiresSchemaVersion/정규화 규칙 미충족 등으로 강등된 항목.
}

// mixed 값은 항상 advisory:true를 달아 hard 취급 누수를 타입 레벨에서 차단(detSpoofingRisk 반영).
export interface MixedValue { value: number | null; advisory: true; basis: string; }
```

**불변식(detSpoofingRisk 반영):**

- `mixed` 항목은 전부 `advisory:true`. 외부 AI/구현자가 mixed를 hard로 승격할 수 없도록 봉투가 강제 표기한다.
- 계산 불가(미저장·해시부재·스키마버전 미충족·정규화 규칙 미합의) 시 해당 키는 **`serverComputed`에서 제거**하고 `degraded`로만 표기한다. `serverComputed`에 boolean을 false로 남기지 않는다(= "드리프트 없음=신선" 오독 방지).

### 2.2 `Grade` / `DetSpec` / `RubricCheck` (CONTRACT C2 — `@careermate/knowledge` OWNS 데이터, core OWNS 평가)

```ts
export type Grade = 'det' | 'ai' | 'mixed';            // 2값(det/ai) 금지: mixed 손실압축 방지.
type DetBase = { requiresSchemaVersion?: number };     // 미충족 => core가 해당 check를 'ai'로 graceful-degrade.
export type DetSpec =
  | (DetBase & { kind: 'pattern'; lexiconRef?: string; patterns?: string[]; flags: 'g'|'gi'; min?: number; max?: number })
  | (DetBase & { kind: 'count_threshold'; metric: string; op: '>='|'<='; value: number; minWords?: number })
  | (DetBase & { kind: 'keyword_coverage'; lexiconRef?: string; required?: string[]; minMatch: number })
  | (DetBase & { kind: 'staleness'; maxAgeDays: number; anchorField: string })
  | (DetBase & { kind: 'traceability'; requireSourceFor: string[] });
export interface RubricCheck {
  id: string; label: string; severity: 'soft'|'hard'; grade: Grade;
  critical?: boolean; detLogic?: DetSpec; aiPrompt?: string;
}
```

### 2.3 `LoopVerdictRule` — verdict 평가기가 아니라 데이터 (LOOP_ENGINE §3.3)

CareerMate는 신규 verdict 평가기를 두지 않는다. validate_* 출력에 **규칙 데이터**만 동봉하고, 적용은 루프를 도는 외부 AI가 한다.

```ts
export interface LoopVerdictRule {
  kind: 'gate' | 'advisory';                    // resume draft 등은 'advisory'(hardGate=false).
  passCondition: 'detClear && aiReported_all_zero'; // 직렬화된 규칙식(외부 AI가 적용).
  hardGate: boolean;
  disclaimer: string;                           // "통과=합격 아님, det lint + 코칭일 뿐."
}
```

> **빈/공백 입력 불변식(크리틱 mustFix 반영):** validate_* core는 `text`가 빈 문자열·공백뿐이면 `verdictRule`을 `invalid`로 반환하고 `passCondition`을 평가하지 않는다. `slop_count=0·placeholder_count=0`이 자명하게 detClear를 성립시켜 거짓 pass가 나는 것을 차단한다. 즉 `verdictRule.kind`에 사실상 `'invalid'`를 포함시키거나, core가 빈 입력에서 `fail('내용이 비어 있습니다')`를 던진다(`reqBody`의 EMPTY_MSG 정신, `schemas.ts:60`).

### 2.4 `VerificationRecord` — 참조만 (소유는 04/VERIFIERS)

본 컴포넌트는 적재하지 않으므로 타입 정의는 **04 소관**이다. 단, **출력 키 정본**은 본 컴포넌트가 못 박는다(missing 반영): validate_*가 외부 AI에게 돌려주는 키는 `DetObservation` 필드명을 **그대로** 노출한다 — `residual_ai_checks`(별칭 `pendingAiChecks`를 두지 **않음**). 04의 `save_*`가 메타를 매칭할 때 동일 키 `residual_ai_checks`를 쓴다. 별칭을 두지 않는 것이 cross-doc 키 일관성의 정본 결정이다.

### 2.5 마이그레이션 — 본 컴포넌트가 **소비**하는 슬롯 (소유는 05)

본 컴포넌트는 신규 마이그레이션 슬롯을 **소유하지 않는다.** `check_staleness.content_hash_drift`가 의존하는 freshness hash 컬럼은 공유 스파인의 **SLOT index 4 (= `"v5"`)** 이며 05가 추가한다. 참조용으로 그 DDL을 적되, 정본은 05다.

```sql
-- SLOT index 4 (= "v5") — append-only at MIGRATIONS 배열 꼬리. 기존 v1/v2 문자열 IMMUTABLE.
-- 순서 의존: fit_analyses(v2 슬롯1에서 DROP+RENAME 재생성), cover_letter_versions(동) 이후여야 함 => index 4 > 1 충족.
BEGIN;
ALTER TABLE fit_analyses ADD COLUMN resume_content_hash TEXT;
ALTER TABLE fit_analyses ADD COLUMN jd_hash TEXT;
ALTER TABLE cover_letter_versions ADD COLUMN resume_content_hash TEXT;
ALTER TABLE cover_letter_versions ADD COLUMN jd_hash TEXT;
COMMIT;
```

**멱등성 근거(아키텍트 mustFix·inconsistentWithCodebase 반영):** `ALTER ADD COLUMN`은 **비멱등**이다(재실행 시 `duplicate column name` 크래시). `schema.ts:5-7`의 헤더 주석("Applying is idempotent and safe to run on every process start")은 이 슬롯에 대해 **거짓**이며, 실제 안전장치는 `CREATE IF NOT EXISTS` 멱등성이 아니라 `migrate()`(`schema.ts:288-307`)의 **once-per-slot version gate**(`for v=from; v<MIGRATIONS.length; v++`)다. 05는 이 슬롯을 추가할 때 헤더 주석을 "안전성은 version gate에 의존하며 ALTER 슬롯은 비멱등"으로 갱신해야 한다(비개발자 기여자가 "CREATE IF NOT EXISTS면 안전" 오해로 ALTER 슬롯을 재배치하는 위험 차단).

**2-프로세스 boot 선행조건(아키텍트 mustFix, 05/R1 소관이나 본 컴포넌트의 hard 차단 의존):** `connection.ts`의 `getDb()`는 web·MCP 양쪽이 boot 시 `migrate()`를 호출한다. 비멱등 ALTER 슬롯(v5)은 `migrate()` **전체를 `BEGIN IMMEDIATE` 쓰기락으로 감싸고 락 획득 후 `schema_version`을 재독(double-checked)** 하지 않으면, 두 프로세스가 동시에 `from=구버전`을 읽고 둘 다 ALTER를 실행 → `duplicate column` 부팅 크래시(Node 25 Windows 하드크래시 계열)가 난다. `busy_timeout`은 B를 대기시킬 뿐 `schema_version`을 재독하지 않는다. **이는 openQuestion이 아니라 v5(따라서 `content_hash_drift`) 도입의 출하 선행조건**이다(§7 R1).

---

## 3. 함수·도구 시그니처

모든 도구: `openWorldHint=false`(외부세계 접근 0, CONTRACT C9-8), `readOnlyHint=true`(`ToolDef.readOnly`, `result.ts:24`). handler는 thin — core 호출 + `ok`/`fail`만. 출력은 항상 plain object 래핑(최상위 배열 금지, CONTRACT C9-1).

### 3.1 compute-tool 입력 zod (CONTRACT C9-2/C9-4 재사용)

`packages/shared/src/schemas.ts`에 append, `optBody`/`reqLine` 재사용. 영속 대상이 아니므로 Input/Record split 없음.

```ts
export const CheckTraceabilityInputSchema = z.object({
  artifact_id: z.string(),
  aiExtractedInput: z.object({
    N_unanchored: z.number().int().min(0),
    N_unverified: z.number().int().min(0),
    placeholder_count: z.number().int().min(0),
  }),
});
export const CheckStalenessInputSchema = z.object({
  artifact_id: z.string().optional(),
  now: z.string().max(MAX_LINE).optional(),
  text: optBody,
});
export const ValidateCoverLetterInputSchema = z.object({
  text: optBody,
  job_id: z.string().optional(),
  locale: z.enum(['ko', 'en']).optional(),
  count_mode: z.enum(['with_space', 'no_space', 'byte']).optional(),
});
export const ValidateResumeDraftInputSchema = z.object({
  text: optBody, job_id: z.string().optional(), locale: z.enum(['ko', 'en']).optional(),
});
export const ValidateInterviewKitInputSchema = z.object({
  questions: z.array(z.string().max(MAX_NOTE)).max(MAX_ITEMS).optional(),
  self_introduction: optBody,
  job_id: z.string().optional(),
});
export type CheckTraceabilityInput = z.infer<typeof CheckTraceabilityInputSchema>;
// …나머지 z.infer 동형.
```

### 3.2 `check_traceability` (compute, readOnly)

| 항목 | 값 |
|---|---|
| `name` | `check_traceability` |
| `title` | `추적성 카운트(det)` |
| `readOnly` | `true` |
| `inputSchema` | `CheckTraceabilityInputSchema.shape` |
| handler→core | `runTraceability(artifact_id, aiExtractedInput)` |

**description(트리거):**
> "자소서·이력서를 `save_*`로 저장하기 직전에 호출하세요. **이 도구는 수치의 사실성을 판정하지 못하며 아무것도 저장·차단하지 않습니다(미리보기).** 당신(AI)이 미앵커 수치 개수(`N_unanchored`)·미검증 정밀도(`N_unverified`)·플레이스홀더 수를 세어 넘기면, CareerMate는 전체 정량 토큰 수(`N_total`)와 플레이스홀더 증감만 det로 계산해 추적성 비율을 돌려줍니다. **비율의 분자는 당신이 넣은 값이라 참고용(advisory)** 이며, critical 0 판단은 당신이 합니다."

**출력 (`DetObservation`):**
```jsonc
{
  "serverComputed": { "N_total": <int>, "placeholder_delta": <int|null> },
  "aiExtractedInput": { "N_unanchored": <int>, "N_unverified": <int>, "placeholder_count": <int> },
  "mixed": { "traceability": { "value": <ratio|null>, "advisory": true, "basis": "분자=ai 주입, 분모=N_total(det)" } },
  "residual_ai_checks": [{ "id": "C1", "aiPrompt": "각 정량 토큰을 저장 앵커/산술 파생식에 매핑" }, …]
}
```
`traceability = (N_total − N_unanchored − N_unverified) / N_total`. 분자가 ai라 **mixed**. `N_total`은 저장된 artifact 본문에서 `quant_pattern` 정규식으로 센다 — 정규식 정의는 SHARED_LEXICONS 정본에 고정(detSpoofingRisk: 정규식이 흔들리면 N_total 재현성 깨짐). 끝에 💡 넛지: `traceability<1.0`이면 `get_playbook({domain:"cover-letter"})`로 미앵커 문장 보강/하향정렬 후 재검증.

### 3.3 `check_staleness` (compute, readOnly)

| 항목 | 값 |
|---|---|
| `name` | `check_staleness` |
| `title` | `신선도 드리프트(det)` |
| `readOnly` | `true` |
| `inputSchema` | `CheckStalenessInputSchema.shape` |
| handler→core | `runStaleness({ artifact_id, now, text })` |

**description:**
> "적합도·자소서를 `save_*`로 저장하기 직전에 호출하세요. **저장·차단하지 않는 미리보기입니다.** 저장 시점에 비교에 쓴 이력서/JD 해시와 현재 해시를 비교해 드리프트(낡음)와 날짜 없는 시점 표현 수를 det로 셉니다. 최근 사실 매핑(freshness)은 당신이 판단하고, CareerMate는 날짜 산술·해시 비교만 합니다."

**출력 (`DetObservation`):**
```jsonc
{
  "serverComputed": { "undated_temporal_count": <int> /* content_hash_drift는 조건부, 아래 참조 */ },
  "mixed": { "freshness_ratio": { "value": <ratio|null>, "advisory": true, "basis": "recent-fact 매핑=ai" } },
  "residual_ai_checks": [{ "id": "R-fresh", "aiPrompt": "temporal 표현이 가리키는 사실이 현재도 유효한지 판정" }],
  "degraded": [{ "field": "content_hash_drift", "reason": "<사유>" }]
}
```

**`content_hash_drift` 게이트 적격성 — 조건부(아키텍트·크리틱 mustFix 반영):**
- 평가 가능 조건이 **모두** 충족돼야 `serverComputed.content_hash_drift: boolean`을 채운다.
  1. `DetSpec.staleness.requiresSchemaVersion`(=v5 hash 컬럼) 충족.
  2. 해시 **정규화 규칙(R3)** 합의 완료 (스키마 버전 충족 ≠ 정규화 합의 — 별도 사유로 명시).
  3. 비교 대상 저장 해시가 **DB에 실제 존재**(`artifact_id`로 조회 성공).
- 하나라도 미충족이면 `content_hash_drift`를 **`serverComputed`에서 제거**하고 `degraded`에만 사유와 함께 표기한다. `false`(=드리프트 없음=신선)로 남기지 않는다 — det 사칭 차단.
- `text`(미저장 본문)만 준 경로는 비교할 저장 해시가 없으므로 항상 `degraded`. 미저장 본문에 대한 drift는 정의 불가.

### 3.4 `validate_cover_letter` (readOnly preview)

| 항목 | 값 |
|---|---|
| `name` | `validate_cover_letter` |
| `title` | `자기소개서 자가검증(det)` |
| `readOnly` | `true` |
| `inputSchema` | `ValidateCoverLetterInputSchema.shape` (`optBody`=`schemas.ts:69` 재사용 → 200KB 캡 상속) |
| handler→core | `runVerifierPass(['human-voice','ats-compat','truthfulness'] det 부분, { text, kind:'cover_letter' }, ctx)` |

**description (첫 문장에 미판정·무저장 강제 — detSpoofingRisk 반영):**
> "자기소개서를 `save_cover_letter_version`으로 저장하기 직전에 호출하세요. **이 도구는 사실성·동문서답·격상을 판정하지 못하며 아무것도 저장·차단하지 않습니다(미리보기).** 슬롭 밀도·키워드 커버리지·플레이스홀더를 CareerMate가 det로 세어 드립니다 — **단, 교집합 셈만 det이고 키워드 집합은 당신이 추출한 값이라 커버리지 비율은 참고용(advisory)** 입니다. 허위수치·동문서답 같은 의미 판단은 당신이 직접 해 critical 0을 확인한 뒤 저장하세요."

**출력:**
```jsonc
{
  "serverComputed": { "slop_count": <int>, "keyword_intersection_count": <int>, "placeholder_count": <int>, "char_count": <int> },
  "aiExtractedInput": { "jd_keywords": <int> },   // job_id 주면 core가 jobs.keywords 길이를 셈
  "mixed": { "keyword_coverage_ratio": { "value": <ratio|null>, "advisory": true, "basis": "키워드 집합=ai 추출" } },
  "residual_ai_checks": [ … truthfulness C1/C2/C3/C5 ai 항목 … ],
  "verdictRule": { "kind": "gate", "passCondition": "detClear && aiReported_all_zero", "hardGate": false, "disclaimer": "det lint+advisory; 통과≠합격" },
  "flags": { "draft_unsaved_delta": true }   // 미저장 draft면 C7 delta 미검증
}
```
C7 placeholder_delta는 미저장 draft에서 신뢰 불가(`cover_letter_versions`에 직전버전 포인터 없음, `schema.ts:91-99`)이므로 **절대수 `placeholder_count`만 `serverComputed`로 제공**하고, 증감 delta는 `flags.draft_unsaved_delta=true`로 위임(delegated). 💡 넛지: `verdictRule` 적용 결과 revise면 `get_playbook({domain:"cover-letter"})`로 다듬고 재검증, defer면 사용자에게 쉬운 말로 확인.

### 3.5 `validate_resume_draft` (readOnly preview)

| 항목 | 값 |
|---|---|
| `name` | `validate_resume_draft` / `title` | `이력서 초안 자가검증(det)` / `readOnly` `true` |
| `inputSchema` | `ValidateResumeDraftInputSchema.shape` |
| handler→core | `runVerifierPass(['human-voice','ats-compat'] det, { text, kind:'resume' }, ctx)` |

**description:** "이력서를 `add_resume`로 저장하기 직전에 호출하세요. **저장·차단하지 않는 미리보기이며 사실성을 판정하지 않습니다.** 슬롭·과장어·플레이스홀더·(`job_id` 주면)키워드 커버리지를 det로 세어 줍니다. 수치 사실성·고유명사 보존은 당신 몫입니다." `verdictRule.kind='advisory'`(`hardGate:false`). 고유명사 보존(consistency)·수치 앵커링(truthfulness)은 `residual_ai_checks`로 위임.

### 3.6 `validate_interview_kit` (readOnly preview)

| 항목 | 값 |
|---|---|
| `name` | `validate_interview_kit` / `title` | `면접 자료 자가검증(det)` / `readOnly` `true` |
| `inputSchema` | `ValidateInterviewKitInputSchema.shape`(`InterviewPrepInputSchema` 필드 재사용 정신) |
| handler→core | `runVerifierPass(['human-voice'] det, { text: self_introduction, kind:'interview' }, ctx)` |

**description:** "면접 준비 자료를 `save_interview_prep`으로 저장하기 직전에 호출하세요. **이 미리보기는 저장·차단하지 않으며 답변 사실성·STAR 일관성을 판정하지 않습니다.** 자기소개의 슬롭·플레이스홀더를 det로 세어 줍니다. **면접 준비 저장 자체의 상태 게이트(서류 합격 이상)는 `save_interview_prep`이 따로 검사합니다**(이 도구는 검사하지 않음)." `readOnly`라 `saveInterviewPrep`의 `INTERVIEW_UNLOCK` 게이트(`services.ts:178`)는 **재현하지 않는다**(미저장 미리보기). truthfulness+consistency(STAR)는 `residual_ai_checks`로 위임.

### 3.7 core det 엔진 (B-2 신설 함수)

`packages/core/src/services.ts` (또는 `core/verify/` 서브모듈, `services.ts` 비대화 시 ARCH R1). `updateApplicationStatus`/`saveInterviewPrep` 옆에 신설.

```ts
export function runVerifierPass(
  verifierIds: VerifierId[],
  artifact: { text: string; kind: 'cover_letter' | 'fit' | 'resume' | 'interview' },
  ctx: { jobId?: string; aiExtractedInput?: Record<string, number>; now?: string; locale?: 'ko'|'en'; countMode?: 'with_space'|'no_space'|'byte' },
): DetObservation & { verdictRule: LoopVerdictRule };

export function runTraceability(artifactId: string, ai: { N_unanchored: number; N_unverified: number; placeholder_count: number }): DetObservation;
export function runStaleness(input: { artifactId?: string; now?: string; text?: string }): DetObservation;
```

- det 체크만 JS 결정론 실행(`pattern`/`count_threshold`/`keyword_coverage`/`staleness`/`traceability`). ai/mixed-ai는 `residual_ai_checks`로 패스스루. **NO LLM. NO persist.**
- `previousArtifactText`/keywords는 외부 AI 입력으로 받지 **않고** `ctx.jobId`로 core가 DB에서 끌어온다(안티게이밍). 단 `jobs.keywords`(`schema.ts:110`, JSON TEXT)는 외부 AI가 `save_job_posting`으로 넣은 **ai 산물**이므로 키워드 집합 자체가 ai-유래 → `keyword_coverage`는 `serverComputed`가 아니라 `mixed`(교집합 셈만 det).
- `DetSpec.requiresSchemaVersion` 미충족 시 해당 check를 `'ai'`로 graceful-degrade + `degraded` 표기.
- mcp-tools handler와 `apps/web` REST가 공유하는 **단일 진입점**. 이 함수는 `verificationRepo`·`activityRepo`를 호출하지 않는다 — 그건 04 소관.

---

## 4. 로직 (단계별 의사코드 수준)

### 4.1 validate_* handler (mcp-tools, thin)

```
handler(args):
  parse args via ZodSchema           # 길이캡·enum 자동 적용
  if text/self_introduction is empty/whitespace:
      return fail('내용이 비어 있습니다(공백만으로는 검증할 수 없습니다).')   # 빈입력 거짓 pass 차단
  obs = core.runVerifierPass(verifierIds, { text, kind }, ctx)
  # handler는 verificationRepo·activityRepo를 절대 호출하지 않음 (readOnly 진실)
  summary = 한국어 요약(슬롭 N, 플레이스홀더 N, 커버리지(참고용), residual_ai N건)
  return ok(summary, { ...obs, flags })        # plain object 래핑 → structuredContent 부착
```

### 4.2 runVerifierPass (core det 엔진)

```
result = { serverComputed:{}, aiExtractedInput:{}, mixed:{}, residual_ai_checks:[], degraded:[] }
schemaVer = readSchemaVersion(db)              # PRAGMA/_meta 재조회 (부팅 캐시 아님 — 2프로세스 분기 방지)
for vId in verifierIds:
  for check in knowledge.getVerifier(vId).checks:
    if check.grade == 'ai':
        result.residual_ai_checks.push({ id: check.id, aiPrompt: check.aiPrompt }); continue
    if check.detLogic.requiresSchemaVersion && schemaVer < that:
        result.degraded.push({ field: check.id, reason: 'schema_version<required' }); 
        result.residual_ai_checks.push(...); continue          # graceful-degrade to ai
    switch check.detLogic.kind:
      pattern/count_threshold:    result.serverComputed[metric] = countDet(text, lexicon)   # 1회 컴파일·캐싱
      keyword_coverage:           inter = |jdKeywords(ctx.jobId) ∩ textTokens|
                                  result.serverComputed.keyword_intersection_count = inter
                                  result.aiExtractedInput.jd_keywords = |jdKeywords|
                                  result.mixed.keyword_coverage_ratio = { value: inter/|jdKeywords|, advisory:true, basis:'키워드 집합=ai' }
      staleness:                  computeStaleness(...)   # §4.4
      traceability:               (check_traceability 전용; runVerifierPass에선 미앵커 입력 없으면 residual로)
verdictRule = knowledge.getVerdictRule(verifierIds)   # 데이터, core 평가기 아님
return { ...result, verdictRule }
```

### 4.3 runTraceability

```
artifact = repo.getArtifactById(artifactId)            # §5 read 메서드 필요
if !artifact: return fail('대상을 찾을 수 없습니다: '+artifactId)   # 미저장/대상부재 => fail (NaN 방지)
N_total = countQuantTokens(artifact.text)              # quant_pattern 정규식 (정의 고정)
ratio = N_total>0 ? (N_total - ai.N_unanchored - ai.N_unverified)/N_total : null
placeholder_delta = artifact.priorText ? count(now)-count(prior) : null
return {
  serverComputed: { N_total, placeholder_delta },
  aiExtractedInput: ai,
  mixed: { traceability: { value: ratio, advisory:true, basis:'분자=ai' } },
  residual_ai_checks: [...]
}
```

### 4.4 runStaleness (content_hash_drift 조건부)

```
sc = { undated_temporal_count: countUndatedTemporal(text or artifact.text) }
degraded = []
canDrift = schemaVer >= V5 && normalizationRuleAgreed() && artifactId provided
if canDrift:
   stored = repo.getHashesById(artifactId)             # resume_content_hash, jd_hash
   if stored exists:
       sc.content_hash_drift = (normalize(currentResume) != stored.resume_content_hash)
                            || (normalize(currentJD)     != stored.jd_hash)
   else: degraded.push({ field:'content_hash_drift', reason:'stored hash 부재' })
else:
   degraded.push({ field:'content_hash_drift', reason: !V5 ? 'schema_version<v5' : !ruleAgreed ? '정규화 규칙 미합의' : '미저장 본문' })
return { serverComputed: sc, mixed: { freshness_ratio:{value:null,advisory:true,basis:'recent-fact=ai'} }, residual_ai_checks:[...], degraded }
```

### 4.5 check_* / validate_* 와 save_* gate(04)의 관계

| 단계 | 누가 | 무엇 | 영속/차단 |
|---|---|---|---|
| 저장 직전 미리보기 | 본 컴포넌트(03) validate_*/check_* | det 신호 + residual_ai + verdictRule 데이터 | **없음** |
| 저장 시점 게이트 | 04 save_* core fn | `gateableCheckIds` 재계산 → 위반 시 `fail()`, 통과 시 `verificationRepo` 적재 + `activityRepo.log` | 있음 |

동일 det를 03은 미리보기로 보여주고 04는 재계산·강제·적재한다. **한 도구가 둘을 겸하지 않는다**(C4 CRITICAL 2).

### 4.6 게이트가 실제로 막는 것 — 정직한 결론 (gateableAnalysis)

`gateableCheckIds`에 들어갈 후보는 **현실적으로 0~1개, 많아야 2개**이며 **truthfulness-critical은 0건**이다.

- **truthfulness** C1/C2/C3/C5(수치 앵커링·날조·실세계 사실)는 전부 `grade:'ai'`(한국어 NER·실세계 사실확인). C10 traceability는 분자가 ai라 `mixed`. C7 placeholder-count만 순수 serverComputed지만 `severity:'soft'` → not hard. **→ 허위수치 자소서를 hard로 막을 수 없다.** false-pass 비대칭(ai 자가보고=위조 가능한 명예제도)이 봉투의 중심 정직성이다.
- **human-voice** slop_density는 순수 serverComputed지만 `severity:'soft'`(스타일 권고). hard 승격은 적대적 UX → not gateable.
- **ats-compat** keyword_coverage는 키워드 집합이 ai 추출이라 오염(C2가 hard 승격 금지). format/parse 체크 중 `severity:'hard'`로 문서화된 것이 있으면 유일한 현실 후보지만, 막는 건 진실이 아니라 ATS 포맷이다.
- **recency-staleness** content_hash_drift는 순수 serverComputed(날짜 산술+해시 비교)이며 gate-FAIL 후보 — **단 hard 승격 + 정규화 규칙(R3) 합의가 선행**돼야 동일 JD 재저장 거짓 드리프트를 막는다.

**결론:** 본 컴포넌트의 가치는 게이트가 아니라 (a) det 신호 미리보기, (b) provenance 분리 출처태깅, (c) `residual_ai_checks`로 외부 AI 자가검증 안내다. 어떤 도구도 truthfulness hard gate를 광고하지 않는다.

---

## 5. 기존 코드 정합 (파일:심볼)

| 영역 | 실제 심볼 | 정합 결정 |
|---|---|---|
| 마이그레이션 슬롯 | `schema.ts:11` `MIGRATIONS` length=2, `migrate()` `schema.ts:288-307` once-per-slot version gate | hash 컬럼은 **SLOT index 4(="v5")**, append-only, 기존 v1/v2 IMMUTABLE. ALTER 비멱등 → version gate가 안전장치(§2.5). |
| 2-프로세스/WAL | `connection.ts` `getDb()`→`migrate()`(web+MCP boot) | v5 ALTER 도입 전 `migrate()`를 `BEGIN IMMEDIATE`+double-checked version 재독으로 가드(05/R1 선행). |
| fit hash read | `repositories.ts:651-678` `fitRepo.save` = `getByJob`+`ORDER BY updated_at DESC LIMIT 1`; `fit_analyses`에 `UNIQUE(job_id)` 없음(`schema.ts:117-129`) | `runStaleness`가 쓸 **`fitRepo.getHashesById(id)` get-by-id read 메서드를 05에서 추가**해야 함(현재 getByJob만 존재 — artifact_id 키 접근경로 갭). 본 컴포넌트는 이 의존을 명시. |
| cover hash read | `cover_letter_versions` version_no 기반(`schema.ts:91-99`), artifact UNIQUE 없음 | `coverLetterVersionRepo.getHashesById(version_id)` read 메서드 필요(05). |
| structuredContent | `result.ts:42-46` `isPlainObject` 게이트(배열 드롭) | 모든 출력 plain object 래핑(`ok(text, {…})`), 최상위 배열 금지(C9-1). |
| 길이캡·zod 재사용 | `schemas.ts:55-76` `MAX_BODY=200_000`, `optBody`/`reqLine`/`strList`, `tools.ts:279-282` `.omit/.shape` 전례 | compute 입력 스키마는 `optBody` 등 재사용(C9-2/C9-4). |
| readOnly 힌트 | `result.ts:18-26` `ToolDef.readOnly`→`readOnlyHint`; `ok()`/`fail()` `:28/:32` | validate_*/check_* 전부 `readOnly:true`. |
| activity 로그 패턴 | `services.ts:153/185` `activityRepo.log`는 mutation(save) **후에만** | readOnly 도구는 로그 없음(C4) — validate_*는 `activityRepo` 미호출. |
| 상태 게이트 전례 | `services.ts:172-186` `saveInterviewPrep` throw-before-persist | validate_interview_kit는 이 게이트를 **재현하지 않음**(미저장 미리보기); 게이트는 `save_interview_prep`이 소유. |
| 본문 미누수 | `result.ts:38-40` `r.data` 전체가 ```json 펜스로 text content에 복제 | 큰 `observation` 객체가 text로 2배 노출됨 → validate_* `data`에는 **메트릭/카운트만** 담고 200KB 원문은 절대 담지 않음(C9-5). |
| 정규식 안전 | SHARED_LEXICONS lexiconRefs | 패턴 1회 컴파일·캐싱, 본문 `MAX_BODY` bound, 패턴 개수 상한(C9-6). `quant_pattern`/`temporal_pattern` 정의는 정본에 고정(재현성). |

---

## 6. 엣지·실패 모드·테스트 포인트

- **빈/공백 입력:** validate_*는 `text`가 빈/공백이면 `fail`(또는 `verdictRule=invalid`) — `slop_count=0`이 거짓 detClear를 성립시키는 게이밍 차단. **테스트:** `text=''`, `text='   '` → pass 절대 불가.
- **0의 의미 구분:** `serverComputed` 카운트가 0일 때, count 도구는 분모(`minWords`·검사 토큰 수·`char_count`)를 함께 노출해 "문제 없음"과 "못 셈/빈 입력"을 외부 AI가 구분하게 한다.
- **content_hash_drift 미저장/해시부재/규칙미합의:** `serverComputed`에서 키 제거 + `degraded` 표기. **테스트:** v5 이전 스키마, 정규화 규칙 미합의, `text`-only 입력 각각에서 `content_hash_drift`가 `serverComputed`에 **없음**을 확인(false도 없음).
- **check_traceability 대상부재/미저장:** `artifact_id` 조회 실패 시 `fail` — `N_total=0`으로 인한 `NaN`/음수 비율 방지. **테스트:** 존재하지 않는 id → fail.
- **TOCTOU/대상 바꿔치기:** 외부 AI가 "저장 직전 draft"와 다른 "이미 저장된 구버전 artifact_id"를 가리키면 검증대상≠저장대상. 04 save_* gate가 저장 시점에 동일 콘텐츠로 재계산하므로 최종 강제는 04가 보장(03은 미리보기라 본질적으로 신뢰 한계 있음 — 명시).
- **keyword_coverage det 오인:** description이 "키워드 커버리지를 det로 세어 드립니다"만 쓰면 ratio를 det로 오인 → "교집합 셈만 det, 키워드 집합=ai라 비율은 참고용" 문구 필수. **테스트:** 출력의 `keyword_coverage_ratio`에 `advisory:true` 부착 확인.
- **2-프로세스 schema_version 분기:** `runVerifierPass`/`runStaleness`는 부팅 캐시가 아니라 런타임 `_meta`/`PRAGMA`를 재조회해 `requiresSchemaVersion`을 판정 — web·MCP가 다른 degraded 상태로 갈리지 않게.
- **structuredContent:** 모든 도구 출력이 plain object(배열 아님)임을 확인 — `result.ts:42-46` 게이트 통과. **테스트:** `toCallToolResult(out).structuredContent !== undefined`.

---

## 7. 미해결/의존

| ID | 항목 | 분류 | 소관 |
|---|---|---|---|
| R1 | `migrate()`를 `BEGIN IMMEDIATE`+double-checked `schema_version` 재독으로 가드 (비멱등 v5 ALTER 2-프로세스 boot 크래시 방지). `migrate()` 시그니처 변경 가능. **openQuestion 아님 — v5 출하 선행조건.** | **선행 의존(blocker)** | 05/db |
| R3 | JD·이력서 해시 **정규화 규칙 단일 정본**(콤마/단위/공백/한글수사). 미합의 시 동일 JD 재저장이 거짓 드리프트 → `content_hash_drift`는 그때까지 `degraded`로만 동작(스키마버전 충족 ≠ 정규화 합의를 별도 사유로 표기). | **선행 의존(blocker)** | 05 |
| H1 | `fitRepo.getHashesById` / `coverLetterVersionRepo.getHashesById` **get-by-id read 메서드 추가**(현재 getByJob/version_no만 — artifact_id 접근경로 갭). hash 컬럼 write는 fit/coverLetter `save()` 확장. | 의존 | 05/db, 04 |
| D1 | `count_mode`(with_space/no_space/byte)·`locale` **기본값과 한/영 혼용 글자수 산정 알고리즘 정본**. 미정 시 `char_count`가 호출마다 흔들려 det 재현성 미달(serverComputed 등급 부적격 위험). inputSchema vs 설정 모듈 위치 결정 필요(VERIFIERS R4). | 미해결 | 01/knowledge + 03 |
| D2 | `validate_interview_kit`를 별도 도구로 둘지 `self_introduction`만 `validate_cover_letter`에 흡수할지(면접 det 표면=자기소개 슬롭뿐, ROI 검토). C3는 validate_* 개수 미고정. | 미해결 | 04/01 통합 시 합의 |
| D3 | (해소됨) 출력 키 정본 = `residual_ai_checks` 그대로(별칭 `pendingAiChecks` 두지 않음). 04 save_* 메타도 동일 키 사용. | 결정 | 03(본 문서) |
