# mutate 도구 (save_rejection_review·evaluate_offer) — Career-OS Phase B-2 상세 설계

> 횡단 결정 정본 = [CONTRACT.md](../CONTRACT.md). 이 문서는 **B-2 구현 스펙(설계만, 코드 미수정)**. CareerMate 내부 LLM 없음.

---

## 1. 목적·범위

Phase B-2 "mutate 도구" 컴포넌트. 두 개의 mutate MCP 도구(`save_rejection_review`, `evaluate_offer`)와 두 개의 read-only 도구(`get_rejection_patterns`, `get_reapply_timing`)를 정의한다. 모두 core 단일 진입점을 경유하고(web REST + mcp 공유, C9-3), 결과는 CareerMate에 영속하며 `activityRepo.log`로 감사한다.

**절대 제약(C2):** CareerMate 내부 LLM 0. det 체크만 `serverComputed`(외부 AI 입력 0)로 자동 계산하고, **단계 분류·사유 판정·오퍼 스코어링 같은 의미판단은 모두 외부 AI가 주입한 `aiExtractedInput`으로 받아 그대로 저장**한다. `aiExtractedInput`이 한 방울이라도 섞인 파생값은 `det`/`hard`/게이트로 표기 금지 — `mixed`(advisory only)로 격하한다.

**이 컴포넌트는 거의 차단하지 않는다(C0/C4).** `gateableAnalysis`가 확정했듯 `gateableCheckIds`는 1~2개뿐이고 truthfulness-critical 체크는 전부 `ai`라 hard 게이트 불가다. 따라서 본 컴포넌트의 두 mutate 도구는 **상태 게이트(8단계 전이 합법성·능력 해금)와 데이터 정합 가드만 강제**하고, 내용 품질은 외부 AI 자가검증 + 넛지에 맡긴다. 산출물은 **설계 문서만**(코드 미수정); 스키마·도구·마이그레이션은 제안 스펙이다.

본 컴포넌트가 **직접 소유**하는 것: 슬롯 index 3 (`rejection_reviews` CREATE), `REJECTION_STAGES` 등 enum 상수 추가, `RejectionReviewInput/Record` 스키마, `rejectionReviewRepo`, `core.saveRejectionReview` / `core.evaluateOffer` / `core.getRejectionPatterns` / `core.getReapplyTiming`, 4개 ToolDef.
**의존(미소유)**: `verifications` 테이블·`VerificationInput`(C5, owner=VERIFIERS) — `evaluate_offer`가 적재만 의존. 슬롯 2(hard_gate)·4(hash)·5(verifications)는 타 컴포넌트 소유.

---

## 2. 데이터/타입 계약 (TS 인터페이스 / SQL DDL)

### 2.1 마이그레이션 — slot index 3 (= `v4`), `rejection_reviews` CREATE

`packages/db/src/schema.ts`의 `MIGRATIONS` 배열 꼬리에 append-only로 추가한다. 기존 v1(index 0)·v2(index 1) 문자열은 **불변**. 스파인 canonical 순서(2=hard_gate → 3=rejection_reviews → 4=hash → 5=verifications)를 준수하며, 본 컴포넌트가 직접 책임지는 슬롯은 **index 3**이다.

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS rejection_reviews (
  id                     TEXT PRIMARY KEY,
  job_id                 TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  stage                  TEXT NOT NULL,
  external_factor        TEXT,                 -- free TEXT (C6), NOT an enum
  perceived_reason       TEXT,
  feedback_received      TEXT,
  lessons                TEXT,                 -- JSON array
  improvement_actions    TEXT,                 -- JSON array
  reapply_eligible_after TEXT,                 -- 'YYYY-MM'
  rejected_at            TEXT,                 -- 거절 '발생' 시각 (외부 AI 주입; created_at과 분리)
  created_at             TEXT NOT NULL,        -- 리뷰 '저장' 시각
  updated_at             TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rr_job ON rejection_reviews(job_id);
COMMIT;
```

**멱등성·동시성 근거.** 본 슬롯은 `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`로만 구성되어 **재실행 무해(멱등)**다. 따라서 ALTER ADD COLUMN을 쓰는 슬롯 2/4(비멱등, 타 컴포넌트 소유)와 달리, web+MCP 2-프로세스가 `getDb()→migrate()`를 동시에 호출해도 슬롯 3 자체는 안전하다(loser의 재실행이 no-op). 안전 보장은 `schema_version` once-per-slot 게이트 + 본 슬롯의 멱등성 **둘 다**에 의존한다 (스파인 `migrate()` 분석, schema.ts:288-307).

**FK·순서 의존.** `jobs`는 v1(schema.ts:101)부터 존재하고 v2 FK 재구축에서 `jobs` 자체는 재생성되지 않으므로(applications/fit/clv만 rebuild) index≥2에서 `REFERENCES jobs(id)`가 안정적이다. SQLite는 ALTER-add FK가 불가하므로 FK·`ON DELETE CASCADE`는 CREATE 시점에 임베드한다(v2 applications의 `ON DELETE CASCADE` 패턴 미러링). `UNIQUE(job_id)`는 job당 1리뷰를 강제한다.

**`rejected_at` 컬럼 결정(critic OQ #5 해소).** `created_at`은 '리뷰 저장' 시각이라 '거절 발생' 시각과 괴리될 수 있다(거절 후 한참 뒤 회고). append-only 마이그레이션에서 사후 컬럼 추가는 또 다른 슬롯을 요구하므로, **지금 슬롯 3 CREATE에 `rejected_at TEXT NULL`을 포함**한다. 외부 AI가 채우는 `aiExtractedInput`이며, 비면 `created_at`으로 폴백한다. 30일 윈도우는 `COALESCE(rejected_at, created_at)`를 앵커로 쓴다(§4.3).

**`evaluate_offer` 전용 테이블 없음.** 스파인 슬롯 할당(2~5)에 offer 전용 테이블이 배정되지 않았고 CONTRACT C5가 "새 테이블 신설 금지·score는 `verifications`에"라 명시하므로, 본 슬롯 묶음에 `offer_decisions` 테이블을 만들지 **않는다**. 적재는 `verifications` 재사용(§2.4, §7 OPEN).

### 2.2 enum 상수 (마이그레이션 아님 — `enums.ts` as-const 편집)

`activities.type`/`entity_type` 컬럼은 자유 TEXT이고 CHECK 제약이 없어(schema.ts:154-161) enum 값 추가에 DDL이 불필요하다. `schema_version` 무영향, TS 1회 편집으로 출하한다.

```ts
// packages/shared/src/enums.ts
export const REJECTION_STAGES = [
  'pre_screen', 'recruiter_screen', 'aptitude_test', 'assignment',
  'interview', 'final_fit', 'ghosted_pre', 'ghosted_post',
] as const;                                              // Phase A 8값 정본
export type RejectionStage = (typeof REJECTION_STAGES)[number];
// APPLICATION_STATUSES/INTERVIEW_UNLOCK_STATUSES와 별개 축. 전이 enum 변경 불필요.

// ACTIVITY_TYPES 끝에 추가:
//   'rejection_reviewed', 'offer_evaluated', 'verification_run'
// ENTITY_TYPES 끝에 추가:
//   'rejection_review', 'offer'
```

`APPLICATION_STATUSES`/`ALLOWED_STATUS_TRANSITIONS`는 **불변**: `rejected`가 이미 비종착(enums.ts:74에서 draft 포함 7개로 재전이 가능)이라 거절 흐름에 전이 enum 변경이 필요 없다.

**`external_factor`는 free TEXT (CONTRACT C6 정본 채택).** rejection-triage §5 힌트가 5값 enum(`mismatch`/`internal_candidate`/`position_closed`/`reference_check`/`none`)을 제시하지만, **CONTRACT C6가 "free TEXT, NOT an enum"으로 못박았고 머리말 규칙상 정본이 이긴다.** 따라서 본 스펙은 **free TEXT를 기본(정본)으로 채택**하고, enum 강타입은 C6 개정이 선행되어야 하는 **대안으로만 surface**한다(§7). `REJECTION_EXTERNAL_FACTORS` enum 상수는 **추가하지 않는다**(이전 초안의 enum 선취 철회).

### 2.3 `RejectionReviewInput` / `RejectionReviewRecord` (`schemas.ts`)

zod + `z.infer` split, 기존 `reqLine`/`optNote`/`strList`/`baseRecord` 재사용(C9-2/C9-4).

```ts
// packages/shared/src/schemas.ts
export const RejectionReviewInputSchema = z.object({
  job_id:              reqLine,
  stage:               z.enum(REJECTION_STAGES),
  external_factor:     optLine,                    // free TEXT (C6), NOT an enum
  perceived_reason:    optNote,
  feedback_received:   optNote,
  lessons:             strList.optional(),         // JSON array
  improvement_actions: strList.optional(),         // JSON array
  reapply_eligible_after: z.string().regex(/^\d{4}-\d{2}$/, 'YYYY-MM 형식이어야 합니다').optional(),
  rejected_at:         z.string().datetime().optional(),  // 거절 발생 시각(외부 AI 주입). 비면 created_at 폴백
  status_implication:  z.enum(APPLICATION_STATUSES).optional(),  // 명시 시에만 setStatus 경유
});
export type RejectionReviewInput = z.infer<typeof RejectionReviewInputSchema>;

export interface RejectionReviewRecord {
  id: string;
  job_id: string;
  stage: RejectionStage;
  external_factor: string | null;
  perceived_reason: string | null;
  feedback_received: string | null;
  lessons: string[];
  improvement_actions: string[];
  reapply_eligible_after: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}
```

**출처 태깅(C2).** `stage`·`external_factor`·`perceived_reason`·`feedback_received`·`lessons`·`improvement_actions`·`rejected_at` = **전부 `aiExtractedInput`** (외부 AI가 분류·작성). CareerMate가 `serverComputed`로 자동 수행하는 것은 **enum 멤버십 검증 + `reapply_eligible_after` 정규식 형식검증뿐**이다(형식은 ai-free; 단 그 '값'은 ai가 stage로 판단해 채운 것 — 봉투에서 "형식만 det" 경계 유지).

### 2.4 `OfferEvaluationInput` (`schemas.ts`) — 영속 타깃 = `verifications`

오퍼 스코어카드 **전체는 외부 AI가 계산한 `aiExtractedInput`**으로 받아 그대로 저장한다. CareerMate는 가중합·세후환산을 계산하지 않는다(offer-evaluation §3 "det 카운트만으로 승인 금지").

```ts
// packages/shared/src/schemas.ts
export const OfferEvaluationInputSchema = z.object({
  job_id:   reqLine,
  decision: z.enum(['accept', 'decline', 'counter', 'pending']),
  ai_reported: z.object({                          // 전부 aiExtractedInput
    weighted_matrix: z.array(z.object({
      axis: reqLine, weight: z.number().int(),
      score_per_offer: z.record(z.number()),
    })).max(MAX_ITEMS),
    batna_type: z.enum(['current_job', 'other_process', 'no_offer']),
    decision_threshold_pct: z.number().int().optional(),
    tiebreaker_order: strList.optional(),
    total_comp: z.object({
      base: z.number().optional(), stock: z.number().optional(),
      bonus: z.number().optional(), sign_on: z.number().optional(),
      after_tax_estimate: z.number().optional(), multiyear_raise_pct: z.number().optional(),
    }).optional(),
    scripts: z.object({
      decline: optBody, accept: optBody,
      extend_request: optBody, counteroffer_response: optBody,
    }).optional(),
    rationale: optNote,
    locale: z.enum(['KR', 'GLOBAL']).optional(),
  }),
  metrics: z.record(z.number()).optional(),        // 외부 AI 자가보고 점수(flattened)
});
export type OfferEvaluationInput = z.infer<typeof OfferEvaluationInputSchema>;
```

**적재 = `verifications`(C5 1순위, owner=VERIFIERS).** 본 컴포넌트는 신규 테이블을 만들지 않고 `VerificationInput`을 **호출만** 한다. 컬럼 매핑:

| `VerificationInput` 필드 | 값 |
|---|---|
| `artifact_type` | `'offer'` — **C5 owner와 합의해 `VERIFICATION_ARTIFACT_TYPES`에 `'offer'` 추가 필요(블로킹 의존, §7)** |
| `artifact_id` | `evaluate_offer`가 생성한 결정 id (`off_*`) |
| `rubric_id` | `'offer-evaluation'` |
| `computed` (→ `computed_json`) | **빈 객체 `{}`** — ai-free 파생값이 없으므로(§3.2). det 사칭 금지 |
| `ai_reported` (→ `ai_reported_json`) | `weighted_matrix`/`scripts`/`total_comp` 원본 + 파생 카운트(전부 mixed) |
| `metrics` (→ `metrics_json`) | `input.metrics` (외부 AI 자가보고 점수, 'unverified' 마커) |
| `gate_status` | `'advise'` (오퍼 평가는 hard 게이트 없음) |

> **블로킹 의존(architect/critic mustFix):** 스파인 `VERIFICATION_ARTIFACT_TYPES = ['resume','cover_letter','interview','linkedin','fit']`에 `'offer'`가 없다. `'fit'`로 적재하면 의미 오염, `'offer'`는 zod 거부. 따라서 **C5 owner(VERIFIERS)와 `'offer'` 추가를 합의하기 전에는 `evaluate_offer`의 영속 단계가 구현 불가**다. §7에서 정본 owner 확정을 요구한다.

---

## 3. 함수·도구 시그니처

### 3.1 mutate ToolDef (`packages/mcp-tools/src/tools.ts`)

핸들러는 thin: core 호출 + `ok`/`fail`(result.ts:18-32). 반환 `data`는 **plain object**로 래핑해 `structuredContent`가 붙게 한다(result.ts:37-48, C9-1). `openWorldHint=false` 전역, `readOnlyHint=false`.

```ts
// save_rejection_review — readOnly:false
{ name: 'save_rejection_review', title: '탈락 회고 저장',
  description: '지원 결과가 불합격일 때 탈락 단계·체감 사유·다음 개선점을 구조화해 저장합니다. ...',
  inputSchema: RejectionReviewInputSchema.shape, readOnly: false,
  handler: (args) => {
    try {
      const r = core.saveRejectionReview(args);
      return ok(
        `탈락 회고를 저장했어요. 대시보드: http://127.0.0.1:4319` +
        (r.status_changed ? ' (지원 상태도 갱신됨)' : '') +
        ` 💡 반복되는 패턴은 get_rejection_patterns로 확인할 수 있어요.`, r);
    } catch (e) { return fail((e as Error).message); }
  } }

// evaluate_offer — readOnly:false
{ name: 'evaluate_offer', title: '오퍼 평가·결정 저장',
  description: '받은 오퍼(들)의 가중 비교·총보상·결정/스크립트를 저장합니다. 외부 AI가 계산한 값을 그대로 보관합니다. ...',
  inputSchema: OfferEvaluationInputSchema.shape, readOnly: false,
  handler: (args) => {
    try {
      const r = core.evaluateOffer(args);
      return ok(`오퍼 평가를 저장했어요. 대시보드: http://127.0.0.1:4319 ` +
                `(아래 카운트는 참고용 lint이며 합격/불합격 판정이 아닙니다.)`, r);
    } catch (e) { return fail((e as Error).message); }  // 상태 게이트 위반 시 Korean fail
  } }
```

### 3.2 read-only ToolDef (`readOnly:true`, 진짜 무저장 — C4/C9-8)

```ts
// get_rejection_patterns — readOnly:true, 인자 없음
{ name: 'get_rejection_patterns', title: '탈락 패턴 보기',
  inputSchema: {}, readOnly: true,
  handler: () => ok('탈락 패턴 요약입니다.', core.getRejectionPatterns()) }

// get_reapply_timing — readOnly:true
{ name: 'get_reapply_timing', title: '재지원 시점 권고',
  inputSchema: { job_id: z.string() }, readOnly: true,
  handler: (args) => ok('재지원 권고입니다.', core.getReapplyTiming(args.job_id)) }
```

두 read 도구는 **`verifications`/`activityRepo.log` 쓰기를 절대 하지 않는다**(readOnly 진실, C4 CRITICAL 2: 한 도구가 preview와 enforce를 겸하지 않는다).

### 3.3 core 시그니처 — `serverComputed` vs `aiExtractedInput` 분리

```ts
// packages/core/src/services.ts
export function saveRejectionReview(input: RejectionReviewInput): {
  review: RejectionReviewRecord;
  application: ApplicationRecord | null;
  status_changed: boolean;
};

export function evaluateOffer(input: OfferEvaluationInput): DetObservation & {
  evaluation_id: string;
};

export function getRejectionPatterns(): DetObservation;     // 봉투 반환 (단일 Record 금지)
export function getReapplyTiming(jobId: string): {
  recommendation: string;                                   // serve 문구 (det 아님)
  basis_is_ai: true;                                        // stage/external_factor가 ai 입력임을 명시
  reapply_eligible_after: string | null;                    // 저장값(있으면 우선)
};
```

**det-spoofing 교정(양 리뷰 detSpoofingRisk).** `evaluateOffer`·`getRejectionPatterns` 반환은 **`DetObservation` 봉투**로 고정한다(이전 초안의 `serverComputed: Record<string,number>` 단일 시그니처 폐기 — 구조적으로 mixed를 표현할 자리가 없어 사칭을 강제했음). 봉투 규약:

- `serverComputed` ← **ai-free 값만**: `getRejectionPatterns.total_rejected`(=`applications.status='rejected'` row 카운트, status는 `setStatus`가 검증한 det 전이 결과), `rejected_in_window_30d`. `evaluateOffer`는 ai-free 값이 없으므로 `serverComputed = {}`.
- `mixed` ← **입력이 ai인 모든 파생**: `getRejectionPatterns.stage_counts`(stage 라벨이 ai 분류값 → count도 mixed), `structural_signal_stage`, `recurring_missing_keywords`; `evaluateOffer`의 `axes_count`/`weights_sum`/`batna_column_scored`/`phases_count`/`anecdotal_caveat_ok`(전부 `ai_reported.weighted_matrix`에서 파생 → mixed).
- `residual_ai_checks` ← 외부 AI가 추가로 돌려야 할 의미판단(§4.3).

---

## 4. 로직 (단계별 의사코드)

### 4.1 `core.saveRejectionReview` — tx 래핑 + rejected 정합 가드

```text
saveRejectionReview(input):
  return tx(() => {                                  # 원자성: connection.ts:40 tx() (architect mustFix #1)
    job = jobRepo.get(input.job_id)
    if (!job) throw '공고를 찾을 수 없습니다: ...'     # saveFitAnalysis 패턴

    # 정합 가드 (architect/critic mustFix): '탈락' 회고는 application이 rejected를
    # 함의해야 성립. ensure(draft)만 부르면 'draft인데 면접 단계 탈락' 비정합이 영속됨.
    app = applicationRepo.getByJob(job.id)           # ensure(draft) 호출 금지 — 신규 draft 생성 방지
    target = input.status_implication ?? 'rejected'  # 명시 없으면 rejected를 함의

    # 상태 전이를 review 저장 '前'에 검증/적용 (throw가 tx 전체를 롤백)
    if (!app || app.status !== target):
      result = updateApplicationStatus(job.id, target, note?)   # setStatus→assertStatusTransition (repo 불변식)
      app = result.application                       # interview_unlocked hint는 거절 맥락 무의미 → 폐기 (D4)
      status_changed = true
    else:
      status_changed = false

    review = rejectionReviewRepo.save(input)         # UPSERT by UNIQUE(job_id)

    activityRepo.log('rejection_reviewed',
      `${job.company} · ${job.position} 탈락 회고를 저장했습니다 (단계: ${STAGE_LABEL[stage]}).`,
      'rejection_review', review.id)                 # 본문(perceived_reason/feedback)은 summary 미포함 (C9-5)

    return { review, application: app, status_changed }   # plain object (C9-1)
  })
```

**가드 핵심.** `input.status_implication`이 없으면 **기본 타깃을 `rejected`로** 둔다(회고 = 불합격 함의). 현재 app이 이미 `rejected`면 전이 없이 통과, 아니면 `updateApplicationStatus`로 `rejected` 전이를 시도한다 — 이는 `setStatus→assertStatusTransition`(repositories.ts:762)을 타므로 불법 전이는 Korean throw로 거부되고, **tx 래핑 덕에 review 저장 전이라 반쪽 상태가 남지 않는다**. `applications.status` raw UPDATE는 절대 금지(불변식 우회).

### 4.2 `core.evaluateOffer` — 상태 게이트(throw-before-persist) + verifications 적재

```text
evaluateOffer(input):
  return tx(() => {
    job = jobRepo.get(input.job_id)
    if (!job) throw '공고를 찾을 수 없습니다: ...'

    # 상태 게이트 (saveInterviewPrep:177-183 복제, throw-before-persist)
    app = applicationRepo.getByJob(job.id)           # ensure 호출 안 함
    if (!app):
      throw '이 공고에는 지원 기록이 없습니다. 먼저 update_application_status로 지원 상태를 기록하세요.'
    if (!OFFER_GATE_STATUSES.includes(app.status)):  # = INTERVIEW_UNLOCK_STATUSES (document_passed+), §7 결정
      throw `오퍼 평가는 '서류 합격' 이상에서만 저장할 수 있습니다. 현재 상태: '${LABEL[app.status]}'.`

    offerId = newId('off_')

    # serverComputed = 없음 (입력 ai_reported가 전부 aiExtractedInput → ai-free 파생 0)
    mixed = {
      axes_count:          input.ai_reported.weighted_matrix.length,
      weights_sum:         sum(weighted_matrix[].weight),
      batna_column_scored: weighted_matrix 모든 행이 batna 열 점수 보유 ? 1 : 0,
      phases_count:        scripts 단계 수,
      anecdotal_caveat_ok: (일화적 통계 등장 시 한정어 동반) ? 1 : 0,
    }                                                # 전부 mixed (advisory) — 게이트 아님, det 아님

    # 영속: verifications 재사용 (C5). artifact_type='offer' (VERIFIERS와 합의 필요, §7 블로킹)
    verificationRepo.save({                          # owner=VERIFIERS, 본 컴포넌트는 호출만
      artifact_type: 'offer', artifact_id: offerId, rubric_id: 'offer-evaluation',
      computed: {},                                  # ai-free 없음 → 빈 객체 (det 사칭 금지)
      ai_reported: { ...input.ai_reported, derived: mixed },
      metrics: input.metrics ?? {}, gate_status: 'advise',
    })

    activityRepo.log('offer_evaluated',
      `${job.company} 오퍼 평가를 저장했습니다 (결정: ${DECISION_LABEL[input.decision]}).`,
      'offer', offerId)                              # scripts/총보상 본문 미포함 (C9-5)

    return {                                         # DetObservation 봉투 (C9-1)
      serverComputed: {}, mixed,
      residual_ai_checks: [
        { id: 'matrix_weight_consistency', aiPrompt: '가중치 합이 100%이고 각 축 점수가 일관된가' },
        { id: 'after_tax_realism', aiPrompt: '세후 추정이 지역(locale) 세제와 맞는가' },
        { id: 'script_truthfulness', aiPrompt: '스크립트 4요소(거절/수락/연장/카운터)에 허위 수치가 없는가' },
      ],
      evaluation_id: offerId,
    }
  })
```

**게이트 정직성.** 유일한 hard 게이트는 **상태(`document_passed`+)**다. 가중합·세후환산·매트릭스 정합성·스크립트 진위는 전부 외부 AI 몫이며 CareerMate는 차단하지 않는다(offer-evaluation §3 "종합 판정은 ai 판정까지 통과해야 진짜 통과"). `mixed` 카운트는 **저장 거부 게이트가 아니라 참고 lint**로만 advertise한다.

### 4.3 `core.getRejectionPatterns` / `core.getReapplyTiming`

```text
getRejectionPatterns():                              # readOnly, 무저장
  rows = rejectionReviewRepo.listRejected()          # applications LEFT JOIN rejection_reviews
  total_rejected      = rows.length                  # ai-free → serverComputed
  rejected_in_window_30d = count(COALESCE(rejected_at, created_at) >= now-30d)  # serverComputed

  reviewed = rows.filter(r => r.stage != null && !isVacuous(r))   # 빈 회고 제외 (critic missing)
  stage_counts = groupCount(reviewed, 'stage')       # stage가 ai 분류값 → mixed
  structural_signal_stage =                           # 비율≥60% AND 카운트≥3 → mixed (advisory)
    maxStage where (count/|reviewed| >= 0.6 && count >= 3)  # 분모는 reviewed (빈 회고 배제)
  recurring_missing_keywords =                        # fit_analyses.missing_keywords 교집합 → mixed
    intersect(rejected jobs의 fitRepo.getByJob 최신1건)   # ※ 공고당 최신1건 한계 (§7)

  return DetObservation {
    serverComputed: { total_rejected, rejected_in_window_30d },          # ai-free만
    mixed: { stage_counts, structural_signal_stage, recurring_missing_keywords },
    residual_ai_checks: [
      { id: 'external_factor_exclusion',
        aiPrompt: '구조적 단정 전 미스매치/내정/포지션클로즈/레퍼런스 등 외부요인을 먼저 배제했는가' },
      { id: 'stage_accuracy',
        aiPrompt: '각 건의 단계 분류가 정확한가(notes 토큰 매칭은 false positive)' },
    ],
  }                                                   # structuredContent 객체 래핑 (C9-1)

getReapplyTiming(jobId):                              # readOnly, 무저장
  r = rejectionReviewRepo.getByJob(jobId)
  rec = lookup by r.stage:                            # 입력(stage/external_factor)이 ai → 권고도 ai 의존
    서류만(pre_screen/recruiter_screen) → 즉시
    면접까지(interview/final_fit)        → 3~6개월
    동일 포지션 재오픈                    → 6~12개월
    한국 정기공채                         → 다음 회차
  return { recommendation: rec, basis_is_ai: true,   # 'det 산출 권고일'로 오인 방지 라벨
           reapply_eligible_after: r?.reapply_eligible_after ?? null }   # 저장값 우선
```

**30일 윈도우 앵커.** `COALESCE(rejected_at, created_at)`를 쓴다 — `rejected_at`(거절 발생, ai 주입)이 있으면 그것을, 없으면 `created_at`(저장 시각)을 앵커로 한다. 지표 의미를 "최근 탈락 빈도"로 정의한다.

---

## 5. 기존 코드 정합 (파일:심볼)

| 항목 | 근거 심볼 |
|---|---|
| 마이그레이션 슬롯 append-only·once-per-slot 게이트 | `schema.ts:11-286` MIGRATIONS(len 2), `schema.ts:288-307` migrate() |
| FK 타깃 안정성(jobs v2 미재생성) | `schema.ts:101` jobs(v1), v2 rebuild는 applications/fit/clv만 |
| 원자성 — 멀티라이트 tx 래핑 | `connection.ts:40-59` tx()(재진입: 내부 updateApplicationStatus가 외부 tx에 합류) |
| 상태 전이 불변식(raw UPDATE 금지) | `repositories.ts:751` upsert·`:762` setStatus assertStatusTransition / `services.ts:145-168` updateApplicationStatus 위임 |
| throw-before-persist 게이트 패턴 | `services.ts:172-187` saveInterviewPrep(getByJob 사용, ensure 아님) |
| `rejected` 비종착 — 전이 enum 불변 | `enums.ts:74` ALLOWED_STATUS_TRANSITIONS[rejected] |
| ensure(draft) 부작용 회피 | `repositories.ts:736-746` ensure가 없으면 draft 신규 생성 → 가드에서 getByJob만 사용 |
| repo getByJob+UPSERT 형태 | `repositories.ts:788-831` interviewRepo / `:651-697` fitRepo |
| UPSERT 레이스 회피 | `INSERT ... ON CONFLICT(job_id) DO UPDATE`(UNIQUE(job_id) 활용) — web+MCP 동시 호출 안전 |
| activity 자유 TEXT(enum 추가 무 DDL) | `schema.ts:154-161` CHECK 없음 / `repositories.ts:836` activityRepo.log(type,summary,entity_type?,entity_id?) |
| structuredContent 객체 래핑(C9-1) | `result.ts:37-48` toCallToolResult(top-level array 드롭) |
| 길이 캡 상속(C9-2) | `schemas.ts:55-76` MAX_BODY=200KB, optBody/strList/reqLine 재사용 |
| zod .shape 재사용(C9-4) | `tools.ts:279-282` add_resume의 .omit().shape 선례 |
| 2-프로세스/WAL | `connection.ts:13-22` getDb()(프로세스당 단일 연결·WAL·busy_timeout 5s), 슬롯 3 멱등이라 동시 migrate 안전 |
| repositories.ts 단일 raw-SQL 경계 | rejectionReviewRepo는 repositories.ts에만, core/db에 det compute 없음 |

**`rejectionReviewRepo`(repositories.ts, 신규).** `mapRejectionReview(r)`로 `lessons`/`improvement_actions`를 `fromJson(r.x, [])`. `getByJob(jobId)`·`get(id)`·`save(input)`(UPSERT: `INSERT INTO rejection_reviews(...) VALUES(...) ON CONFLICT(job_id) DO UPDATE SET stage=excluded.stage, ..., updated_at=excluded.updated_at`, id는 신규 시 `newId('rr_')`, created_at은 INSERT 시각 보존)·`listRejected()`(= `SELECT a.job_id,a.status, r.stage,r.external_factor,r.rejected_at,r.created_at,r.perceived_reason FROM applications a LEFT JOIN rejection_reviews r ON r.job_id=a.job_id WHERE a.status='rejected'`). FK `ON DELETE CASCADE`는 슬롯 3 임베디드 제약에 의존(repo 별도 처리 불필요). 본문 로그 누수 금지(C9-5).

---

## 6. 엣지·실패 모드·테스트 포인트

1. **반쪽 상태(원자성):** review INSERT 성공 + status 전이 throw → tx 미사용이면 review만 남음. **tx 래핑 + 상태검증을 review 저장 前**에 두어 롤백. 테스트: 불법 전이를 유발하는 `status_implication` 입력 → review row가 **남지 않아야** 함.
2. **rejected 정합:** 공고만 있고 application 없음 + `status_implication` 없음 → 기본 타깃 `rejected`로 `updateApplicationStatus` 경유(`setStatus`가 `ensure` 후 `assertStatusTransition`). `draft→rejected`는 enums.ts:68에 허용 → 통과. 테스트: 저장 후 app.status == 'rejected' 확인('draft인데 면접 탈락' 비정합 부재).
3. **불법 전이:** 현재 app이 `rejected`이고 `status_implication='final_passed'` → enums.ts:74에 `rejected→final_passed` 허용 → 통과(비종착). `active→draft`만 금지. 테스트: `status_implication` 없이 이미 rejected → 전이 없이 review만 UPSERT(`status_changed=false`).
4. **evaluate_offer 게이트:** app 없음 → '지원 기록 없음' 분기(게이트 메시지와 구분). `applied`(< document_passed) → 게이트 throw. `document_passed`+ → 통과. 테스트: 각 상태별 분기 메시지.
5. **빈 회고(vacuous):** `{job_id, stage}`만으로 저장 성공(C0 빈 입력 우려). `getRejectionPatterns`는 `isVacuous`(perceived_reason/lessons/improvement_actions 모두 빈)인 행을 `structural_signal` 분모에서 제외. 테스트: 빈 회고 3건이 60% 신호를 만들지 않음.
6. **UPSERT 레이스:** web+MCP 동시 `save` → `ON CONFLICT(job_id) DO UPDATE`로 UNIQUE 충돌 시 INSERT가 깨지지 않고 UPDATE로 수렴. 테스트: 동일 job_id 병행 저장 → 1 row, 마지막 값.
7. **det 사칭 회귀:** `getRejectionPatterns().serverComputed`에 `stage_counts`가 **없어야** 하고, `evaluateOffer().serverComputed`가 **`{}`**여야 함. 테스트: 봉투 키 분포 단언(stage_counts ∈ mixed, total_rejected ∈ serverComputed).
8. **30일 앵커:** `rejected_at` 있는 행과 없는(created_at 폴백) 행 혼재 → `COALESCE` 정확. 테스트: 31일 전 rejected_at 행 제외, 29일 전 created_at(rejected_at null) 행 포함.
9. **structuredContent:** 4개 도구 모두 반환 data가 plain object → `structuredContent` 부착(top-level array 아님). 테스트: result.ts 래핑 통과.

---

## 7. 미해결/의존

1. **[블로킹] `evaluate_offer` 영속 타깃 + `artifact_type='offer'`.** `verifications` 재사용(C5 정합) 1순위지만 `VERIFICATION_ARTIFACT_TYPES`에 `'offer'`가 없어 **C5 owner(VERIFIERS)와 enum 추가를 합의하기 전에는 적재 단계 구현 불가**. 대안: (a) `VERIFICATION_ARTIFACT_TYPES += 'offer'`(권장), (b) 전용 `offer_decisions` 테이블 슬롯 6 신설(스파인 슬롯 번호 cross-doc 합의 선행, 'offer는 검증 아티팩트가 아니라 결정 산출물'이라 verifications 의미와 어긋남), (c) `evaluate_offer`를 ARCHITECTURE owner로 이관. **ARCHITECTURE/TODO 정본 owner 확정 필요.**
2. **`evaluate_offer` 상태 게이트 값.** 프롬프트는 `final_passed`를 시사하나 offer-evaluation §5는 "applied 이상·복수 application 동시 진행"에서 호출 — 오퍼는 `final_passed`(=사실상 수락)에 **도달하기 위한** 결정 도구라 `final_passed` 전제는 '수락 전 복수오퍼 비교' 1차 유스케이스를 차단한다. **본 스펙은 `INTERVIEW_UNLOCK_STATUSES`(document_passed+)로 완화 채택**(`OFFER_GATE_STATUSES = INTERVIEW_UNLOCK_STATUSES`)하되, `applied+` 추가 완화 또는 게이트 제거(넛지만)는 정본 owner 확정 필요.
3. **`external_factor` 타입.** 본 스펙은 **CONTRACT C6 정본(free TEXT) 채택**. rejection-triage §5의 5값 enum(R3 det 배제검사 강화 목적)을 원하면 C6 개정이 선행. enum 도입 시 `REJECTION_EXTERNAL_FACTORS` 상수 추가 + 스키마를 `z.enum(...).optional()`로 교체.
4. **`recurring_missing_keywords` 범위.** `fitRepo.getByJob`이 공고당 최신 1건만 반환(repositories.ts:654)해 과거 fit_analysis 누락. `mixed`로 표기했으나 job별 전체 fit history helper가 필요한지(스코프 확대) vs 최신 1건 한계를 외부 AI에 고지만 할지 결정 필요.
5. **`rejected_at` 채움 책임.** 슬롯 3에 컬럼은 확보했으나 외부 AI가 거절 발생 시각을 일관되게 주입할지 불확실. 미주입 시 `created_at` 폴백이라 30일 지표 의미가 "최근 회고 빈도"로 흐려짐 — 워크플로우 가이드에서 `rejected_at` 주입을 권장하도록 CONSUMPTION 측과 조율 필요.
6. **`status_implication` 결합도(C4 정신).** 회고 저장과 상태 전이를 한 도구가 겸하는 것이 'preview/enforce 겸직 금지' 정신과 충돌하는지 검토. 본 스펙은 **enforce-only 두 동작의 결합**이라 C4(preview vs enforce 분리)와는 결이 다르다고 보고 optional로 유지하되, 명시 없을 때 기본 `rejected` 함의가 과한지 정본 검토 권고.
