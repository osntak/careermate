# verifications 기록·조회·평가 집계 — Career-OS Phase B-2 상세 설계

> 횡단 결정 정본 = [CONTRACT.md](../CONTRACT.md). 이 문서는 **B-2 구현 스펙(설계만, 코드 미수정)**. CareerMate 내부 LLM 없음.

## 1. 목적·범위

Phase B-2 컴포넌트 `06-verifications-io`는 검증 메타데이터를 **단일 정규화 테이블 `verifications`(append-only)** 에 기록하고, 최신/이력 조회와 **평가 점수 집계(EVALUATION envelope)** 를 제공한다. 핵심은 다음 세 가지다.

1. **provenance 3분할의 영속화.** 모든 검증 출력은 출처별로 분리되어 컬럼 수준까지 내려간다: `serverComputed`(외부 AI 입력 0) → `computed_json`, 외부 AI 자기보고 + `mixed`(양쪽 파생) → `ai_reported_json`, 평탄화된 숫자 메트릭 → `metrics_json`. **불변식: `mixed`/`ai`값을 `computed_json`에 넣는 것은 det 사칭이라 금지**되며, 이를 dev assert가 아니라 **타입·함수 시그니처(단일 생성 경로)** 로 강제한다(§3.3, §4.2).
2. **기록 주체의 단일화.** 검증 행을 쓰는 곳은 `save_*` core fn 안의 `recordVerification`뿐이다. `validate_*`/`check_*`(readOnly preview)는 `verifications`/`activityRepo`에 **절대 쓰지 않는다**(CONTRACT C4).
3. **정직한 라벨링.** `gate_status` 컬럼은 EVALUATION 어휘(`pass`/`hard_fail`/`needs_ai_review`)를 그대로 저장한다. `needs_ai_review`(ai 위임 미완료)를 `advise`로 뭉개는 lossy 압축은 금지(§2.3, 적대 리뷰 mustFix). 검증 결과는 항상 `det lint + advisory`로만 라벨링되고 `disclaimer`("통과해도 합격이 아님")가 동반된다.

**범위 밖(다른 컴포넌트 소유, 본 컴포넌트는 소비자):** 게이트 enforcement(`gateableCheckIds` 재계산 fail) = `05-gate`; 해시 정규화 계산 = `04-freshness/hash`(TODO R3 선행); det 가중치 정의 = 도메인 루브릭(`@careermate/knowledge`). 본 컴포넌트는 이들의 산출을 **측정·기록·조회**만 한다.

---

## 2. 데이터/타입 계약 (TS 인터페이스 / SQL DDL)

### 2.1 마이그레이션 슬롯 — SLOT index 5 (= v6) `verifications`

스파인 정본 슬롯 순서 `2=hard_gate, 3=rejection_reviews, 4=hash, 5=verifications`를 준수한다. `packages/db/src/schema.ts`의 `MIGRATIONS` 배열 **tail에 append**하며, 기존 v1..v5 문자열은 **불변(immutable)**. 단일 `BEGIN`/`COMMIT` 한 문자열로 묶는다.

```sql
-- MIGRATIONS[5] (= "v6")
BEGIN;
CREATE TABLE IF NOT EXISTS verifications (
  id                    TEXT PRIMARY KEY,
  artifact_type         TEXT NOT NULL,          -- VERIFICATION_ARTIFACT_TYPES: resume|cover_letter|interview|linkedin|fit (free TEXT, CHECK 없음)
  artifact_id           TEXT NOT NULL,          -- 값 참조(FK 없음, append-only)
  artifact_content_hash TEXT,                   -- 검증 대상 산출물 정규화 해시(사후 drift 감지)
  resume_content_hash   TEXT,                   -- 비교에 쓴 대표 이력서 해시(무버전 documents — D5, version FK 금지)
  jd_hash               TEXT,                   -- 비교에 쓴 JD 해시(정규화 규칙 선행 — TODO R3)
  rubric_id             TEXT NOT NULL,          -- VerifierId
  computed_json         TEXT NOT NULL DEFAULT '{}',  -- serverComputed det ONLY(외부입력 0)
  ai_reported_json      TEXT NOT NULL DEFAULT '{}',  -- 외부 AI 자기보고 + mixed 산출('unverified' 표식)
  metrics_json          TEXT NOT NULL DEFAULT '{}',  -- 평탄화 Record<string,number>(_artifact_score 동거)
  gate_status           TEXT,                   -- EVALUATION 어휘: pass|hard_fail|needs_ai_review (§2.3)
  checked_at            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verifications_latest
  ON verifications (artifact_type, artifact_id, checked_at DESC, id DESC);
COMMIT;
```

**멱등성 근거.** 안전 보장은 `CREATE IF NOT EXISTS`의 멱등성이 **아니라** `migrate()`(schema.ts:288-307)의 **schema_version 1회 게이트**다: `for v=from; v<MIGRATIONS.length; v++ db.exec(MIGRATIONS[v])` 후 `schema_version`을 `MIGRATIONS.length`로 ON CONFLICT-bump한다. 슬롯당 정확히 한 번만 exec되므로, 본 슬롯은 `ALTER ADD COLUMN`(비멱등)을 포함하지 않는 **단독 CREATE 1건**이라 재실행 위험이 원천 없다.

**별도 테이블인 이유(C5).** `cover_letter_versions`(schema.ts:91-99)와 `fit_analyses`(schema.ts:117-129)에는 `job_id`/artifact UNIQUE가 **없어** "산출물 1건당 검증 1건" 가정이 성립하지 않는다. 검증은 매 재검증마다 1행 append되는 **N:1 카디널리티**이므로 별도 테이블 + 최신조회 인덱스로 흡수한다.

**인덱스 tie-break.** `ORDER BY checked_at DESC` 단독은 동일 ms 2건 insert 시 `latest`가 비결정적이다(`now()`는 ISO TEXT). 인덱스와 쿼리 모두 `checked_at DESC, id DESC`로 못박아 **결정적 최신행**을 보장한다(적대 리뷰 missing: tie-break). `id`는 시간순 prefix(`ver_` + ULID-류)라 2차 키로 충분하다.

> **2-프로세스 동시성(C9-7).** web+MCP 둘 다 boot에서 `getDb()->migrate()`를 호출한다. 본 슬롯(5)은 `CREATE IF NOT EXISTS`라 슬롯 자체는 재실행에 안전하다. **그러나** 같은 `migrate()` 호출이 슬롯 2/4(`ALTER ADD COLUMN`, 비멱등)도 함께 돈다. `connection.ts`에는 `busy_timeout=5000`만 있고 `BEGIN IMMEDIATE`/진입 직렬화가 **없으므로**, 동시 진입 시 슬롯 2/4가 `duplicate column` 또는 busy timeout으로 boot crash할 수 있다. 따라서 **본 컴포넌트는 "슬롯 5만 안전"을 통합 안전으로 주장하지 않는다.** `migrate()` 진입 직렬화(`BEGIN IMMEDIATE` write-lock + schema_version 재확인, loser는 bump된 버전 재독 후 skip)는 **이 wave의 blocking precondition(R1)** 으로 격상한다(§7).

### 2.2 신규 shared 타입 (zod + z.infer split)

`packages/shared/src/schemas.ts`에 추가. `reqLine`/`MAX_LINE`/`MAX_BODY` 등 기존 헬퍼(schemas.ts:55-76) 재사용. `as const` enum 배열은 `enums.ts`.

```ts
// enums.ts
export const VERIFICATION_ARTIFACT_TYPES =
  ['resume', 'cover_letter', 'interview', 'linkedin', 'fit'] as const;
export type VerificationArtifactType = (typeof VERIFICATION_ARTIFACT_TYPES)[number];

// schemas.ts
export const VerificationInputSchema = z.object({
  artifact_type: z.enum(VERIFICATION_ARTIFACT_TYPES),
  artifact_id: reqLine,
  artifact_content_hash: z.string().max(MAX_LINE).optional(),
  resume_content_hash: z.string().max(MAX_LINE).optional(),
  jd_hash: z.string().max(MAX_LINE).optional(),
  rubric_id: reqLine,                                 // VerifierId
  computed: z.record(z.number()).default({}),         // serverComputed ONLY -> computed_json
  ai_reported: z.record(z.unknown()).default({}),     // 외부 AI 자기보고 + mixed -> ai_reported_json
  metrics: z.record(z.number()).default({}),          // 평탄화 -> metrics_json
  gate_status: z.enum(GATE_STATUSES).optional(),      // §2.3
});
export type VerificationInput = z.infer<typeof VerificationInputSchema>;
export interface VerificationRecord extends VerificationInput { id: string; checked_at: string; }
```

> **provenance 강제는 스키마가 아니라 생성 경로로.** `z.record(z.number())`는 키 출처를 검증하지 못한다 — 외부 AI가 `mixed`/`ai`값을 `computed`에 직접 주입해도 zod는 통과시킨다. 따라서 **`recordVerification`은 raw `VerificationInput.computed`를 신뢰하지 않고**, `runDetChecks`가 반환한 `DetObservation.serverComputed`에서만 `computed_json`을 채운다(§3.3, §4.2). 즉 `VerificationInputSchema`는 MCP **입력 검증용**이지, `computed_json`의 정직성 원천이 아니다. 정직성 원천은 core의 단일 생성 경로다.

### 2.3 `gate_status` 어휘 — EVALUATION 단일 정본 (mustFix 반영)

`gate_status` 컬럼은 **EVALUATION이 소유**하는 라벨(EVALUATION 결정5)을 **그대로** 저장한다. 본 컴포넌트는 신규 어휘를 발명하지 않는다.

```ts
// enums.ts — EVALUATION 정본 어휘(REPORT_GATE_STATUS와 동일 의미, 단일 정본으로 통합)
export const GATE_STATUSES = ['pass', 'hard_fail', 'needs_ai_review'] as const;
export type GateStatus = (typeof GATE_STATUSES)[number];
```

- 초기 설계안의 `['advise','pass','fail']` 매핑은 **폐기**한다. `needs_ai_review`→`advise`로의 압축은 "ai 검증 미완료"라는 핵심 정직성 신호를 `advise`(순수 det-only advisory)와 영구 구별 불가하게 만들어 EVALUATION 결정4("det-only-pass를 pass로 라벨 금지")를 영속 계층에서 위반한다.
- **단일 정본 원칙:** `GATE_STATUSES`와 EVALUATION의 `REPORT_GATE_STATUS`는 **같은 enum 하나**여야 한다(동일 의미 enum 2개 공존 금지). `enums.ts`에 `GATE_STATUSES` 단 하나를 두고 EVALUATION 문서가 이를 참조한다.

---

## 3. 함수·도구 시그니처

### 3.1 `verificationRepo` (db 패키지, 유일 raw-SQL 레이어)

`packages/db/src/repositories.ts`에 추가. `activityRepo`(:835-851) append-only insert + `fitRepo.getByJob`(:652-657) `ORDER BY ... DESC LIMIT 1` 패턴 미러. **UPDATE/UPSERT 없음.**

```ts
export const verificationRepo = {
  insert(input: VerificationInput): VerificationRecord {
    const ts = now();
    const id = newId('ver_');
    getDb().prepare(
      `INSERT INTO verifications
        (id,artifact_type,artifact_id,artifact_content_hash,resume_content_hash,jd_hash,
         rubric_id,computed_json,ai_reported_json,metrics_json,gate_status,checked_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id, input.artifact_type, input.artifact_id,
      input.artifact_content_hash ?? null, input.resume_content_hash ?? null, input.jd_hash ?? null,
      input.rubric_id,
      toJson(input.computed ?? {}), toJson(input.ai_reported ?? {}), toJson(input.metrics ?? {}),
      input.gate_status ?? null, ts,
    );
    return this.get(id)!;
  },
  get(id: string): VerificationRecord | null { /* SELECT * WHERE id=? → mapVerification */ },
  latest(artifact_type: VerificationArtifactType, artifact_id: string): VerificationRecord | null {
    const r = getDb().prepare(
      `SELECT * FROM verifications WHERE artifact_type=? AND artifact_id=?
       ORDER BY checked_at DESC, id DESC LIMIT 1`,    // idx_verifications_latest 사용, 결정적 tie-break
    ).get(artifact_type, artifact_id);
    return r ? mapVerification(r) : null;
  },
  list(artifact_type: VerificationArtifactType, artifact_id: string): VerificationRecord[] {
    /* 같은 인덱스, ORDER BY checked_at DESC, id DESC — 전체 이력 */
  },
};
```

`mapVerification(r)`은 `computed_json`/`ai_reported_json`/`metrics_json`을 `fromJson` 디코드해 `VerificationRecord` 형태로 복원한다. **NO det compute in db**(스파인 moduleBoundaries).

### 3.2 `aggregateScore` (core, EVALUATION envelope 집계 — read-side)

`packages/core/src/services.ts`(또는 `core/evaluation.ts`). **det 체크만 가중 합산**, ai/mixed의 ai 부분은 점수 제외 + `delegatedToAI`에만 등재. 본 fn은 EVALUATION의 canonical `ArtifactEvaluation` envelope를 **재사용**한다(중복 정의 금지 — 적대 리뷰 inconsistentWithCodebase). canonical 소유가 `core/evaluation.ts`의 `DetMetricEvaluator`라면 본 컴포넌트는 그 산출을 **소비**한다.

```ts
export function aggregateScore(checks: CheckResult[]): ArtifactEvaluation {
  // ArtifactEvaluation(EVALUATION canonical):
  //   { score, detClear, criticalFailures, delegatedToAI: {checkId,aiPrompt,context}[],
  //     gateStatus: GateStatus, disclaimer }  ← disclaimer는 zod required(false-pass 차단)
  //
  // 규칙(EVALUATION 결정4 + 빈입력 가드):
  //   ① det 체크 수 === 0  OR  기대 verifierSequence 미충족  -> 'needs_ai_review' (pass 금지)
  //   ② criticalFailures > 0                                  -> 'hard_fail'
  //   ③ delegatedToAI.length > 0                              -> 'needs_ai_review'
  //   ④ 그 외(det 전부 통과 + 위임 0 + det 체크 ≥1)           -> 'pass'
  //   score는 det 체크만 가중(no inflation, 결정7). disclaimer는 항상 포함.
}
```

> **빈입력 pass 구멍 차단(mustFix).** `checks=[]`(외부 AI 메타 미제공)이면 `criticalFailures=0 && delegatedToAI=0`이라 순진한 규칙은 `pass`를 낸다 — "아무 검증 안 함"이 최상위 라벨을 받는 false-pass. 규칙 ①이 **det 체크 0 또는 verifierSequence 미충족이면 `pass`를 금지**(`needs_ai_review`로 강등)해 이를 막는다.

산출 매핑: `score` → `metrics_json._artifact_score`, `gateStatus` → `gate_status` 컬럼(EVALUATION 어휘 그대로, §2.3). `_artifact_score`는 **det 산출임을 출처로 못박기 위해** `metrics_json`에 들어가되 reserved key(`_` prefix)로 외부 AI 주입 `metrics`와 구별한다(§6, det 사칭 차단).

### 3.3 `recordVerification` (core, 영속 싱크 — write-side)

게이트(`05-gate`의 `gateableCheckIds` 재계산 fail) 통과 + persist **직후에만** 호출. **raw input이 아니라 `DetObservation`을 받아** `computed_json`의 단일 생성 경로를 타입으로 강제한다.

```ts
export function recordVerification(args: {
  artifact_type: VerificationArtifactType;
  artifact_id: string;
  rubric_id: string;
  obs: DetObservation;                 // runDetChecks 반환 — computed_json은 여기 serverComputed에서만
  evaluation: ArtifactEvaluation;      // aggregateScore 반환 — gate_status/_artifact_score
  hashes?: { artifact_content_hash?: string; resume_content_hash?: string; jd_hash?: string };
  company?: string;                    // activity summary용(본문 아님) — 호출자가 job.company 전달
}): VerificationRecord {
  return tx(() => {                                       // connection.ts:40 tx() — 2-write 원자성
    const rec = verificationRepo.insert({
      artifact_type: args.artifact_type,
      artifact_id: args.artifact_id,
      rubric_id: args.rubric_id,
      computed:     args.obs.serverComputed,               // ZERO 외부입력만
      ai_reported:  { ...(args.obs.aiExtractedInput ?? {}), ...(args.obs.mixed ?? {}), _unverified: true },
      metrics:      { ...args.evaluation.flatMetrics, _artifact_score: args.evaluation.score },
      gate_status:  args.evaluation.gateStatus,            // EVALUATION 어휘
      ...args.hashes,
    });
    activityRepo.log(
      'verification_run',
      `${args.company ?? labelFor(args.artifact_type)} 검증 기록(${args.evaluation.gateStatus}).`,  // 본문 미누수
      'verification', rec.id,
    );
    return rec;
  });
}
```

- **`computed`는 `args.obs.serverComputed`에서만** 온다. raw `computed` 파라미터가 없으므로 외부 AI가 `computed_json`에 직접 주입할 경로가 타입 레벨에서 닫힌다(적대 리뷰 detSpoofingRisk 차단).
- `mixed`/`aiExtractedInput`은 전부 `ai_reported`로 합쳐지고 `_unverified: true` 표식이 붙는다. **INVARIANT: `mixed`는 절대 `computed`로 가지 않는다.**
- `tx()`로 insert + activity log를 **원자화**(부분쓰기 방지 — 적대 리뷰 missing).
- `company`는 호출자(`save_*` core fn)가 이미 조회한 `job.company`를 넘긴다(기존 activity log가 `job.company`를 쓰는 것과 동일). `recordVerification`은 별도 job 조회를 하지 않는다.

### 3.4 compute 도구 (mcp-tools, readOnly preview — 절대 기록 안 함)

`packages/mcp-tools/src/tools.ts`. `readOnly:true`, `core`의 det 엔진을 호출하되 **`verificationRepo`/`activityRepo`에 쓰지 않는다**(C4 readOnly 진실). 출력은 `DetObservation` envelope를 plain object로 래핑.

```ts
// validate_cover_letter (readOnly: true) — 미리보기 lint, 기록 없음
inputSchema: { text: optBody, job_id: z.string().optional() }
// check_traceability (readOnly: true) — 외부 AI가 ai-extracted 카운트를 명시 주입(CareerMate는 NER 안 함)
inputSchema: { artifact_id: z.string(),
  aiExtractedInput: z.object({ N_unanchored: z.number(), N_unverified: z.number(), placeholder_count: z.number() }) }
// check_staleness (readOnly: true)
inputSchema: { artifact_id: z.string(), now: z.string().optional() }
```

handler는 thin: `core` 호출 → `ok(text, detObservationObject)`. **한 도구가 preview와 enforce를 겸하지 않는다**(C4 CRITICAL 2). serverComputed vs aiExtractedInput 분리는 `DetObservation` 형태로 응답에 그대로 노출된다.

### 3.5 enum 추가 (코드 상수, 마이그레이션 슬롯 없음)

`packages/shared/src/enums.ts`. `status` 컬럼은 free TEXT라 CHECK 제약이 없어 **DDL 불필요**(zero schema_version impact).

- `ACTIVITY_TYPES += 'verification_run'` (enums.ts:116-126 기존 9종 뒤 append)
- `ENTITY_TYPES += 'verification'` (enums.ts:130-141 기존 뒤 append)

`ActivityType`/`EntityType`는 `typeof ...[number]`로 자동 확장. 스파인이 같은 wave에 추가하는 `offer_evaluated`/`rejection_reviewed` 등과 충돌 없이 한 번에 편집한다.

---

## 4. 로직 (단계별 의사코드)

### 4.1 검증 기록 흐름 (save-time)

```
save_fit_analysis / save_cover_letter_version / save_interview_prep (core fn):
  1. (기존) 산출물 persist 전 검증/게이트 선행
     - saveInterviewPrep: INTERVIEW_UNLOCK_STATUSES 게이트(services.ts:172-186) throw-before-persist
     - saveFitAnalysis/saveCoverLetterVersion: 05-gate의 gateableCheckIds 재계산
       → 위반 시 fail()/throw (이때 verifications 행은 §4.3 정책에 따라 별도 기록)
  2. (기존) 산출물 repo.save() — fit/clv/interview persist
  3. (기존) activityRepo.log(fit_analysis_saved 등)
  4. [신규] 외부 AI가 검증 메타(obs/evaluation/hashes)를 넘겼으면:
       recordVerification({ artifact_type, artifact_id, rubric_id, obs, evaluation, hashes, company: job.company })
     메타 없으면 skip (B-1 호환). 외부 AI 자기보고는 advise일 뿐 저장을 차단하지 않는다(C4).
  5. applications.status 변경이 필요하면 updateApplicationStatus->setStatus 경유
     (raw applications.status UPDATE 금지; assertStatusTransition 불변식 보존)
```

### 4.2 provenance 분기 (recordVerification 내부)

```
obs: DetObservation = { serverComputed, aiExtractedInput?, mixed?, residual_ai_checks? }
  computed_json    ← obs.serverComputed                       # 외부입력 0만
  ai_reported_json ← { ...obs.aiExtractedInput, ...obs.mixed, _unverified: true }
  metrics_json     ← { ...evaluation.flatMetrics, _artifact_score: evaluation.score }
  gate_status      ← evaluation.gateStatus                    # pass|hard_fail|needs_ai_review
# INVARIANT(타입 강제): computed에 mixed 키가 섞일 경로가 없음(raw computed 파라미터 부재)
```

### 4.3 게이트 FAIL 시 감사 기록 (missing 반영)

게이트가 차단(`hard_fail`)한 시도야말로 감사상 가장 중요한 이벤트다. `saveInterviewPrep`식 throw-before-persist는 "차단 시 무기록" 공백을 상속하므로, **차단 직전에 `recordVerification`을 `gate_status='hard_fail'`로 1행 남기고 산출물 persist는 막는다**:

```
05-gate 위반 감지 시:
  recordVerification({ ..., evaluation: { gateStatus: 'hard_fail', ... } })   # 감사 행은 남김
  throw / fail()                                                              # 산출물 persist는 차단
```

이때 `recordVerification`의 `tx()`는 검증 행만 커밋하고, 산출물 트랜잭션과 분리한다(검증 감사 ≠ 산출물 영속).

### 4.4 조회·표시 흐름 (read-time)

```
대시보드/REST 산출물 카드:
  rec = verificationRepo.latest(artifact_type, artifact_id)
  if (!rec) → '미검증'(unverified) 배지 표시          # §6 false-pass 가시화
  else:
    badge   = rec.gate_status                          # pass|hard_fail|needs_ai_review 그대로
    if (rec.artifact_content_hash !== current_norm_hash) → 'stale verification(검증 후 내용 변경됨)' 표식
    disclaimer = '이 점검은 형식·표면 위생만 봅니다. 통과해도 합격이 아닙니다.'   # 필수
  본문 텍스트 미노출. 'det lint + advisory'로만 라벨링.
```

---

## 5. 기존 코드 정합 (파일:심볼)

- **마이그레이션 슬롯:** `schema.ts:286` `MIGRATIONS` 배열 tail에 index 5(=v6) append. 안전 = `schema.ts:288-307 migrate()`의 schema_version 1회 게이트(`for v=from; v<MIGRATIONS.length`). v1/v2 및 B-2 슬롯 2~4 문자열 불변.
- **별도 테이블 근거:** `schema.ts:91-99 cover_letter_versions`·`:117-129 fit_analyses`에 `job_id`/artifact UNIQUE 부재 → 산출물당 검증 N건이므로 별도 N:1 테이블.
- **repo 패턴:** `repositories.ts:835-851 activityRepo.log` append-only insert + `repositories.ts:652-657 fitRepo.getByJob` `ORDER BY ... DESC LIMIT 1` 미러. `repositories.ts`는 **유일 raw-SQL 레이어**(모듈 doc) — `verificationRepo`도 db 패키지에. 단, fitRepo는 UPSERT(단일행)라 tie가 없지만 verifications는 진짜 append라 `id DESC` 2차 정렬키를 추가(미러 한계 보정).
- **core save 훅:** `services.ts:98-106 saveFitAnalysis`, `:110-134 saveCoverLetterVersion`, `:172-187 saveInterviewPrep`(throw-before-persist 정본)에 `recordVerification` 훅 추가. **메타가 core fn에 도달하는 경로:** `FitAnalysisInput`/`CoverLetterVersionInput`에 검증 메타 필드를 추가하는 대신, 외부 AI가 별도 mutate 도구(또는 save 인자의 optional `verification` 블록)로 `obs`/`evaluation`/`hashes`를 넘긴다 — 이 스키마 확장 지점을 `05-gate`/통합 단계에서 명시 합의(§7).
- **status 불변식:** `repositories.ts:751 upsert`·`:762 setStatus`가 `assertStatusTransition` 호출. recordVerification은 status를 건드리지 않으며, 상태 변경이 필요하면 `services.ts:145-168 updateApplicationStatus`→`setStatus` 경유(raw UPDATE 금지).
- **2-프로세스/WAL:** `connection.ts`는 `busy_timeout=5000`만 보유, `BEGIN IMMEDIATE`/진입 직렬화 부재. ALTER 슬롯(2/4)과 동일 `migrate()` 실행이므로 migrate 직렬화는 **blocking precondition(R1, §7)**. 본 슬롯(5)은 CREATE IF NOT EXISTS라 슬롯 단위는 재실행 안전.
- **structuredContent 객체 래핑(C9-1):** `result.ts:42-46 toCallToolResult`는 `isPlainObject`(typeof object && non-null && !Array.isArray)일 때만 `structuredContent` 부착. compute 도구·serve 출력은 **plain object로 래핑**(top-level 배열 금지). `ToolDef.readOnly`(result.ts:24)가 `readOnlyHint` 구동.
  - **web REST는 범주가 다름:** `toCallToolResult`는 MCP 경로 전용이고 REST는 일반 JSON 직렬화라 `structuredContent` 개념이 없다. REST 응답은 plain object면 충분하되, **레이어 순서(shared→db→core→web)** 준수를 위해 web은 `verificationRepo`를 직접 호출하지 않고 **core의 조회/집계 fn(예: `getVerificationView`)을 거친다**(repo 직접 호출 = core 우회 금지).
- **길이캡·zod 재사용(C9-2/C9-4):** `schemas.ts:55-76` `MAX_BODY=200KB`/`optBody`/`reqLine`/`MAX_LINE` 재사용. compute 입력은 `optBody`로 자동 바운드. `tools.ts:279-282` `.omit/.pick().shape` 재사용 선례 따름.
- **enum:** `enums.ts:116-126 ACTIVITY_TYPES`(verification_run 부재)·`:130-141 ENTITY_TYPES`(verification 부재)에 append. status free TEXT라 CHECK·DDL 불필요.

---

## 6. 엣지·실패 모드·테스트 포인트

| # | 엣지/실패 모드 | 처리 | 테스트 포인트 |
|---|---|---|---|
| E1 | 외부 AI가 `computed`에 `mixed`/`ai`값 주입 시도 | `recordVerification`이 raw computed를 안 받고 `obs.serverComputed`만 사용 → 타입 레벨 차단 | `recordVerification`은 `DetObservation`만 받음. raw `computed` 경로 부재 단위 검증 |
| E2 | `checks=[]`(메타 미제공) → false-pass | `aggregateScore` 규칙①: det 체크 0/verifierSequence 미충족 → `needs_ai_review`(pass 금지) | `aggregateScore([])` → `gateStatus==='needs_ai_review'` |
| E3 | `gate_status` 어휘 손실 | 컬럼이 EVALUATION 어휘(`pass`/`hard_fail`/`needs_ai_review`) 그대로 저장, advise 매핑 폐기 | `needs_ai_review` 행이 `advise`로 뭉개지지 않음 |
| E4 | 동일 ms 2건 insert → latest 비결정적 | `ORDER BY checked_at DESC, id DESC` 결정적 tie-break | 같은 `checked_at` 2행 insert → `latest`가 `id` 최대행 반환 |
| E5 | insert 성공 후 activity log 실패(부분쓰기) | `tx()`로 2-write 원자화 | activity log throw 시 verifications 행 롤백 |
| E6 | 게이트 FAIL 차단 = 무기록 | §4.3: 차단 직전 `gate_status='hard_fail'` 행 1건 기록 후 persist 차단 | hard_fail 시도 후 `verifications`에 hard_fail 행 존재 |
| E7 | 메타 부재 = false-pass(명예 시스템) | 대시보드 `latest()===null` → **'미검증' 배지 명시 노출**(침묵 금지) | 검증 안 된 산출물 카드가 '검증 통과'와 구별됨 |
| E8 | latest 덮어쓰기 게이밍(빈 메타 재append로 pass 위장) | 권고: `latest` 표시에 **최악 라벨 단조성**(최근 N건 중 `hard_fail` 존재 시 경고 동반) 또는 보존정책 합의(§7) | needs_ai_review 후 빈 재제출이 pass를 단독 표시하지 못함 |
| E9 | `artifact_content_hash` drift false-fire | 정규화 규칙(TODO R3) 미합의 시 drift 표식은 **advisory only(차단 0)** | 동일 산출물 재직렬화가 stale 차단을 유발하지 않음 |
| E10 | `_artifact_score`가 외부 AI 주입 `metrics`와 혼동 | `_` prefix reserved key로 det 산출 구별, 외부 `metrics`는 reserved key 못 씀(validation에서 거름) | `metrics`에 `_artifact_score` 주입 시도 거부 |
| E11 | compute 도구가 검증 기록 시도 | `validate_*`/`check_*`는 `readOnly:true`, `verificationRepo`/`activityRepo` 미호출 | readOnly 도구 실행 후 `verifications` 행 증가 0 |

---

## 7. 미해결/의존

1. **(R1, blocking) `migrate()` 진입 직렬화.** 본 슬롯(5)은 CREATE IF NOT EXISTS라 안전하지만, 같은 `migrate()`가 비멱등 ALTER 슬롯(2/4)도 돌리고 `connection.ts`에 진입 직렬화가 없다. `BEGIN IMMEDIATE` + schema_version 재확인(loser skip)을 **이 wave의 선행조건**으로 격상해야 한다. "슬롯 5만 안전"은 통합 안전이 아님 — TODO 떠넘김 금지.
2. **검증 메타의 core 도달 경로 합의.** `recordVerification`은 `obs`/`evaluation`/`hashes`를 받아야 하는데 현재 `FitAnalysisInput`/`CoverLetterVersionInput`에 해당 필드가 없다. save 인자의 optional `verification` 블록으로 확장할지, 별도 mutate 도구로 받을지 `05-gate`/통합 단계와 확정.
3. **(R3 선행) `artifact_content_hash` 정규화 정본.** `04-freshness/hash`가 정규화 규칙을 확정하기 전엔 stale 표식을 **advisory only**로 둔다. 또한 검증 시점 스냅샷(`verifications`의 hash)과 산출물 현재값(`fit_analyses`/`cover_letter_versions` 슬롯4 hash)이 충돌할 때 **검증 시점 스냅샷이 canonical**(drift 감지의 기준점)임을 규약으로 못박는다.
4. **보존정책/무한증가.** append-only N행이므로 장기 비대. `idx_verifications_latest`는 latest엔 충분하나 `checked_at` 단독 범위삭제용 보조 인덱스가 없다 — 보존정책(artifact별 최근 N건 prune vs 영구 감사로그)을 **슬롯 확정 전** C5 owner와 합의해 인덱스를 한 번에 맞춘다(추후 인덱스 변경 = 새 마이그레이션).
5. **latest 단조성 vs 게이밍(E8).** 빈/깨끗한 메타 재append로 이전 `hard_fail`/`needs_ai_review`를 `pass`로 덮어쓰는 게이밍 표면. 최악 라벨 우선 표시 또는 단조성 규약을 `LOOP_ENGINE`(닫힌 루프 R3)과 합의.
6. **'미검증' 가시화 정책(E7).** 게이트가 거의 0인 본 컴포넌트에서 유일한 정직성 장치는 '미검증 가시화'다. 메타 부재를 대시보드에서 어떻게(배지/필터) 노출할지 확정 — 침묵은 false-pass를 숨긴다.

---

### 교차 참조

- [CONTRACT.md](../CONTRACT.md) C2(provenance 출처태깅), C4(readOnly preview vs save-time enforce 분리), C5(verifications 단일 정규화 테이블 정본), C6/C7(hash 결속), C9(구현 정합)
- EVALUATION.md 결정4·5·7 — `gate_status` 어휘 단일 정본, det만 가중(no inflation), `_artifact_score`/`gate_status` 컬럼 매핑, canonical `ArtifactEvaluation` envelope 재사용
- VERIFIERS.md — RubricCheck.grade/DetSpec, 검증 메타 기록기는 핸들러 아닌 core fn/repo
- `05-gate` — `gateableCheckIds` 재계산 fail 게이트(본 컴포넌트는 통과/차단 직후 영속 싱크)
- `04-freshness/hash` — `artifact_content_hash`/`resume_content_hash`/`jd_hash` 정규화 계산(본 컴포넌트는 소비자, 저장만)
- 스파인 `migrationSlots`/`sharedTypes` — 슬롯 정본 순서(5=verifications, no FK, append-only), `VerificationInput`/`Record` 시그니처 + INVARIANT(mixed는 ai_reported, never computed)
