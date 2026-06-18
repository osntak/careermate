# B-2 마이그레이션·데이터모델 — Career-OS Phase B-2 상세 설계

> 횡단 결정 정본 = [CONTRACT.md](../CONTRACT.md). 이 문서는 **B-2 구현 스펙(설계만, 코드 미수정)**. CareerMate 내부 LLM 없음.

## 1. 목적·범위

이 컴포넌트는 CONTRACT **C6**(데이터모델 정본, 소유=TODO)과 **C5**(verifications 테이블, 소유=VERIFIERS)의 전 스키마 변경을 `packages/db/src/schema.ts`의 `MIGRATIONS` 배열에 **append-only 슬롯**으로 명세하고, `packages/shared/src/enums.ts`·`schemas.ts`의 동반 타입을 정의한다. 구체적으로:

1. **마이그레이션 슬롯 4건**(인덱스 2~5, `v3`~`v6`) — `profile.hard_gate`(C6), `rejection_reviews` 테이블(C6), `fit_analyses`/`cover_letter_versions` 신선도 해시 컬럼(C6), `verifications` 테이블(C5).
2. **enum 추가**(마이그레이션 아님) — `REJECTION_STAGES`, `ACTIVITY_TYPES`/`ENTITY_TYPES` 확장. `status` 컬럼이 free TEXT라 DDL 불필요.
3. **shared zod 타입** — `HardGateSchema`, `RejectionReviewInput/Record`, `VerificationInput/Record`.
4. **db repository** — `rejectionReviewRepo`, `verificationRepo`, fit/coverLetter save의 hash write 확장.

**범위 밖**(다른 B-2 컴포넌트 소유): det 엔진(`runDetChecks`), save-time 게이트 로직, `gateableCheckIds` 멤버십 판정, tool handler. 본 문서는 **테이블·컬럼·repo·타입**만 제공한다.

**제약(절대):** det 체크만 CareerMate가 외부 입력 없이 계산(`serverComputed`). 의미판단·NER·추출은 외부 AI(`aiExtractedInput`). `aiExtractedInput`이 섞인 값(`mixed`)은 det/hard/게이트로 표기 금지 — 물리 배치(컬럼 분리)로 이를 강제하되, **DB는 CHECK로 막지 못하므로 컬럼 분리는 "규약 명시화"이지 "물리 강제"가 아님**(§6 참조, 적대 리뷰 detSpoofingRisk 반영).

---

## 2. 데이터/타입 계약 (TS 인터페이스 / SQL DDL)

### 2.0 마이그레이션 안전성 모델 (멱등성 근거 — 적대 리뷰 핵심 정정)

`migrate()`(schema.ts:288-307)의 실제 동작:

```text
from = _meta.schema_version (없으면 0)        // schema.ts:293, 진입 시 1회만 read
for (v = from; v < MIGRATIONS.length; v++) db.exec(MIGRATIONS[v])   // :295-297
to = MIGRATIONS.length; if (to !== from) schema_version ← to (ON CONFLICT)  // :299-305, 전 슬롯 후 1회 bump
```

**정정 1 — 안전 근거는 "schema_version 슬롯당 1회 게이트"이지 "CREATE IF NOT EXISTS 멱등"이 아니다.** `ALTER ADD COLUMN`은 `IF NOT EXISTS`가 없어 같은 슬롯 재실행 시 `duplicate column` 크래시로 부팅 불가가 된다(슬롯 2·4가 ALTER).

**정정 2 — `schema_version` bump가 "전 슬롯 후 1회 후행"이라, 다중 비멱등 슬롯 웨이브에서 뒤 슬롯이 실패하면 앞의 ALTER 슬롯이 영구 재실행 크래시를 일으킨다(단일 프로세스에서도 발생).** 예: 슬롯 2 COMMIT → 슬롯 3 COMMIT → 슬롯 4 중간 크래시 시 `schema_version`은 아직 0. 다음 부팅이 `from=0`으로 슬롯 2(ALTER profile.hard_gate)를 재실행 → 컬럼 이미 존재 → 크래시. 이는 동시성과 무관한 단일 프로세스 결함이다.

**대응(이 컴포넌트의 확정 spec — open으로 강등 금지).** 각 비멱등 ALTER 슬롯의 ALTER를 **`PRAGMA table_info` 선검사로 조건부 멱등화**하거나, `migrate()` 루프를 **슬롯별 `BEGIN IMMEDIATE` → exec → 즉시 `schema_version`을 해당 슬롯 인덱스+1로 bump → COMMIT**으로 재구성한다(version bump를 슬롯 경계로 이동). 후자가 정본 권장:

```text
// 권장 migrate() 재구성 (의사코드 — 정확한 시그니처는 ARCHITECTURE R1 owner)
for (v = from; v < MIGRATIONS.length; v++) {
  db.exec('BEGIN IMMEDIATE;');                 // 즉시 RESERVED 락 (2-프로세스 직렬화)
  const cur = readSchemaVersion(db);            // 락 획득 후 재read (CAS)
  if (cur > v) { db.exec('ROLLBACK;'); continue; } // 패자: 이미 적용됨 → skip
  db.exec(MIGRATIONS[v]);                        // 슬롯 SQL은 BEGIN/COMMIT 없이 DDL만 (아래 주의)
  bumpSchemaVersion(db, v + 1);                 // 슬롯 단위 bump
  db.exec('COMMIT;');
}
```

> **주의(node:sqlite 중첩 트랜잭션 금지).** 위 재구성을 채택하면 슬롯 SQL **문자열 안의 `BEGIN; ... COMMIT;`를 제거**해야 한다 — 외부 `BEGIN IMMEDIATE`와 슬롯 내부 `BEGIN`이 중첩되면 node:sqlite가 `cannot start a transaction within a transaction`으로 거부한다(`tx()` 재진입 가드 `_inTx`가 막는 것과 같은 제약, connection.ts:40-41). 따라서 슬롯 SQL은 **순수 DDL만** 담고 트랜잭션 경계는 `migrate()`가 소유한다. **현 v1/v2 슬롯은 자체 `BEGIN/COMMIT`을 가지므로, 이 재구성은 신규 슬롯에만 적용하거나(루프에서 인덱스>=2일 때만 외부 BEGIN), v1/v2를 그대로 두고 신규 슬롯 진입 전에만 외부 BEGIN IMMEDIATE를 거는 분기를 둔다.** 정확한 분기 형태는 ARCHITECTURE R1.

> **`BEGIN IMMEDIATE`만으로는 불충분.** 락은 트랜잭션 시작 시점에 잡히나, 패자가 **락 획득 후 `schema_version`을 재read(CAS)하지 않으면** 같은 ALTER를 재실행한다. `busy_timeout=5000`(connection.ts:18) 만료 시 패자는 에러가 아니라 **락 획득 성공으로 진행**하므로, "락 후 from 재평가 → skip"이 핵심이다.

**대안(채택 시 슬롯 SQL 변경 최소).** `migrate()`를 건드리지 않고 슬롯 SQL을 자기-멱등화: 각 ALTER 앞에 `PRAGMA table_info(<table>)` 결과를 검사해 컬럼 부재 시에만 ALTER. 단 SQL 문자열만으론 조건부 ALTER가 불가하므로(SQLite DDL은 if-not-exists-column 미지원), 이 경로는 `migrate()`가 슬롯을 exec하기 전 JS에서 컬럼 존재를 검사하는 **슬롯 전처리 훅**을 요구 → 결국 `migrate()` 수정. **결론: `migrate()` 구조 변경이 불가피하며, 본 컴포넌트는 이를 R1 확정 작업으로 명시한다(open이 아니라 must-do).**

### 2.1 슬롯 인덱스 배정 (정본 — cross-doc 단일 contiguous)

| 슬롯 idx | 별칭 | 변경 | 소유 | 순서 의존 |
|---|---|---|---|---|
| 2 | v3 | `profile.hard_gate` ALTER | TODO(C6) | 없음(v1 테이블) |
| 3 | v4 | `rejection_reviews` CREATE | TODO(C6) | `jobs` 이후(idx>=2 자동 충족) |
| 4 | v5 | freshness hash 4컬럼 ALTER | TODO(C6) | **반드시 idx 1(v2) 이후** |
| 5 | v6 | `verifications` CREATE | VERIFIERS(C5) | 없음(무FK 값참조) |

기존 v1(idx0)/v2(idx1) 문자열은 **불변**. tail append만 허용(슬롯 수정은 이미 지난 DB에 미적용, 끼워넣기는 인덱스 밀림→이중실행). VERIFIERS와 TODO가 같은 웨이브이므로 이 4행이 정본 — 두 저자가 `v3`를 동시 claim 금지.

### 2.2 슬롯 2 (v3) — `profile.hard_gate`

```sql
-- 슬롯 문자열(트랜잭션은 migrate()가 소유하므로 BEGIN/COMMIT 미포함; §2.0 주의 참조)
ALTER TABLE profile ADD COLUMN hard_gate TEXT NULL;   -- JSON TEXT 1개 컬럼
```

- 테이블명은 **단수 `profile`**(schema.ts:14). `profiles`로 ALTER 시 `no such table` 부팅 크래시.
- 4컬럼이 아니라 **단일 JSON 컬럼 1개** → 비멱등 ALTER 위험표면 4→1.
- `profile`은 싱글톤(profileRepo.get에 id 인자 없음) → 공고별 knockout은 여기 못 산다. 그건 `jobHardGate`(위치 미정, owner=ARCHITECTURE R2).
- 런타임 매핑: `HardGateSchema`(§2.6)로 `JSON.parse`/`stringify`.

### 2.3 슬롯 3 (v4) — `rejection_reviews`

```sql
CREATE TABLE IF NOT EXISTS rejection_reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,                  -- REJECTION_STAGES 8값 (free TEXT, DB CHECK 없음)
  external_factor TEXT,                 -- enum 아님, 자유 TEXT (C6)
  perceived_reason TEXT,
  feedback_received TEXT,
  lessons TEXT,                         -- JSON array
  improvement_actions TEXT,             -- JSON array
  reapply_eligible_after TEXT,          -- YYYY-MM
  rejected_at TEXT,                     -- nullable 앵커: rejected 진입 시각 (작성 시각=created_at과 분리, D7)
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rr_job ON rejection_reviews(job_id);
```

- FK는 **CREATE 시점에 embed**(SQLite는 ALTER로 FK 추가 불가). v2의 `REFERENCES jobs(id) ON DELETE CASCADE` 전례(schema.ts:241/263)와 일관.
- `jobs`는 v1 생성·v2 미재생성(v2는 applications/fit/clv/interview만 rebuild)이라 FK 타깃이 idx>=2에서 안정.
- `UNIQUE(job_id)` = 건당 1리뷰(UPSERT-by-job).
- **`rejected_at` nullable 앵커 추가(적대 리뷰 missing 반영, D7):** `created_at`은 "리뷰 작성 시각"이라 30일 reapply/집계 윈도우가 틀어진다. 테이블 신설 시점에 `rejected_at`을 같이 두지 않으면 후속에 또 ALTER 슬롯이 필요(append-only 비용). 채움 책임은 게이트 컴포넌트(save_rejection_review가 application의 rejected 진입 시각을 주입)이며 미상 시 NULL 허용.
- 빈 신규 테이블이라 v2식 `PRAGMA foreign_keys=OFF` 토글 불필요(복사·orphan 정리 없음). 이는 정본 D2의 "PRAGMA OFF/ON 권장"과 다른데, **그 권장은 파괴적 rebuild(DROP+RENAME) 전용**이고 빈 CREATE/단순 ALTER에는 해당 없음 — 본 컴포넌트는 이 차이를 명시적으로 정당화하여 D2를 따른다(적대 리뷰 mustFix 반영).

### 2.4 슬롯 4 (v5) — freshness hash 컬럼

```sql
ALTER TABLE fit_analyses          ADD COLUMN resume_content_hash TEXT;
ALTER TABLE fit_analyses          ADD COLUMN jd_hash             TEXT;
ALTER TABLE cover_letter_versions ADD COLUMN resume_content_hash TEXT;
ALTER TABLE cover_letter_versions ADD COLUMN jd_hash             TEXT;
```

- **반드시 idx 1(v2) 이후.** `fit_analyses`(v2 218-236)·`cover_letter_versions`(v2 201-215)는 v2에서 DROP+RENAME rebuild → v2 이전 테이블 ALTER 시 컬럼 소실. idx 4>1이 POST-rebuild ALTER 보장.
- **`resume_version_id` 금지.** `documents`는 무버전 in-place UPDATE(documentRepo.update, content 덮어쓰기, version_no/이력 없음) → version-id FK 타깃이 영원히 부재 = 죽은 컬럼. content hash는 JD `jd_hash`와 대칭 성립해 "버전관리 서브시스템 신설" 선행의존 회피.
- 4 ALTER 모두 비멱등 → §2.0 멱등화/슬롯-bump 모델 적용.
- **정규화 규칙(R3, B-2 진입 선행):** `resume_content_hash`/`jd_hash`는 이력서·JD 공통 단일 정규화(공백 collapse·소문자·줄 순서·Unicode NFC) 후 해시. 미합의 시 동일 JD 재저장이 다른 해시→recency C4가 false-fire. **이 컴포넌트는 슬롯 4 DDL을 출하하되, 정규화 함수 합의 전에는 게이트가 hash를 det로 쓰지 못하도록 §6에 차단 게이트를 둔다.**

### 2.5 슬롯 5 (v6) — `verifications`

```sql
CREATE TABLE IF NOT EXISTS verifications (
  id TEXT PRIMARY KEY,
  artifact_type TEXT NOT NULL,          -- resume|cover_letter|interview|linkedin|fit
  artifact_id TEXT NOT NULL,
  artifact_content_hash TEXT,
  resume_content_hash TEXT,
  jd_hash TEXT,
  rubric_id TEXT NOT NULL,              -- VerifierId
  computed_json TEXT,                   -- serverComputed det ONLY (외부AI 주입 0)
  ai_reported_json TEXT,                -- 외부AI 자기보고 + mixed ('미검증' 표식)
  metrics_json TEXT,                    -- flattened Record<string, number>
  gate_status TEXT,                     -- advise|pass|fail
  checked_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_verifications_latest
  ON verifications(artifact_type, artifact_id, checked_at DESC);
```

- FK 없음 — `artifact_id`가 5종 테이블을 cross-reference(단일 FK 불가). 무FK 값참조 + 인덱스로 최신 조회.
- **append-only**(UPDATE/DELETE 없음). 보존 정책은 §6(append-only 폭증 대책).
- **출처분리 불변(규약):** `computed_json`엔 `serverComputed`만, `mixed`/`ai` 자기보고는 `ai_reported_json`. `gate_status='pass'`의 의미는 **"극소수 det 체크만 통과, 나머지는 미검증 honor-system"**(§6 detSpoofing).
- `artifact_id` 안정성(적대 리뷰 mustFix): `fit`의 경우 fitRepo.save는 existing 있으면 UPDATE(id 유지), 없으면 새 `fit_` id. **save_* 게이트는 fitRepo.save가 반환한 `FitAnalysisRecord.id`를 artifact_id로 박는다**(재저장이 UPDATE면 같은 id 유지되어 최신조회 일관). 이 채움 책임은 게이트 컴포넌트 소유이며 본 컴포넌트는 규약만 박는다.

### 2.6 shared zod 타입 (모두 `packages/shared/src/schemas.ts` 내부 정의)

> **제약(적대 리뷰 inconsistent 반영):** `reqLine`/`optLine`/`optNote`/`optBody`/`strList`/`MAX_LINE`/`MAX_BODY`/`baseRecord`는 schemas.ts **module-private const(export 0건)**. 따라서 신규 스키마는 **반드시 schemas.ts 같은 파일 안에** 정의해야 재사용 가능. 별도 파일/패키지로 빼면 import 불가.

```ts
// HardGate — profile.hard_gate JSON 매핑 (전역 지원자 조건; job별 jobHardGate와 구분)
export const HardGateSchema = z.object({
  minYears: z.number().optional(),
  visaStatus: z.string().max(MAX_LINE).optional(),
  location: z.string().max(MAX_LINE).optional(),
  salaryFloor: z.number().optional(),
});
export type HardGate = z.infer<typeof HardGateSchema>;

// RejectionReview
export const RejectionReviewInputSchema = z.object({
  job_id: reqLine,
  stage: z.enum(REJECTION_STAGES),
  external_factor: optLine,                                  // 자유 TEXT, enum 아님
  perceived_reason: optNote,
  feedback_received: optNote,
  lessons: strList.optional(),                               // JSON array
  improvement_actions: strList.optional(),                   // JSON array
  reapply_eligible_after: z.string().regex(/^\d{4}-\d{2}$/).optional(),  // YYYY-MM (적대 리뷰: regex 추가)
  rejected_at: z.string().optional(),                        // nullable 앵커(D7)
});
export type RejectionReviewInput = z.infer<typeof RejectionReviewInputSchema>;
// RejectionReviewRecord = { ...RejectionReviewInput, ...baseRecord }  // id/created_at/updated_at

// Verification (owner=VERIFIERS; 컬럼 매핑은 이 슬롯이 정의)
export const VERIFICATION_ARTIFACT_TYPES = ['resume','cover_letter','interview','linkedin','fit'] as const;
export const GATE_STATUSES = ['advise','pass','fail'] as const;
export interface VerificationInput {
  artifact_type: (typeof VERIFICATION_ARTIFACT_TYPES)[number];
  artifact_id: string;
  artifact_content_hash?: string;
  resume_content_hash?: string;
  jd_hash?: string;
  rubric_id: string;
  computed: Record<string, number>;          // → computed_json (serverComputed ONLY)
  ai_reported?: Record<string, unknown>;     // → ai_reported_json (mixed + ai 자기보고)
  metrics?: Record<string, number>;          // → metrics_json
  gate_status?: (typeof GATE_STATUSES)[number];
}
export interface VerificationRecord extends VerificationInput { id: string; checked_at: string; }
// INVARIANT: mixed 값은 ai_reported, NEVER computed (det 사칭 금지) — 규약(§6 detSpoofing)
```

### 2.7 enum 추가 (`packages/shared/src/enums.ts`, **마이그레이션 아님**)

```ts
export const REJECTION_STAGES = [
  'pre_screen','recruiter_screen','aptitude_test','assignment',
  'interview','final_fit','ghosted_pre','ghosted_post',
] as const;
export type RejectionStage = (typeof REJECTION_STAGES)[number];   // APPLICATION_STATUSES/INTERVIEW_UNLOCK_STATUSES와 별개 축
// + REJECTION_STAGE_LABELS Record (기존 LABELS 패턴)

// ACTIVITY_TYPES(enums.ts:116-126) += 'rejection_reviewed','offer_evaluated','verification_run'
// ENTITY_TYPES(enums.ts:130-141)   += 'rejection_review','offer'
```

- `status` 컬럼은 free TEXT, CHECK 제약 0 → enum 추가에 DDL 불필요(schema_version 영향 0).
- `ALLOWED_STATUS_TRANSITIONS` **변경 없음** — `rejected`가 이미 비종착(enums.ts:74).
- `activityRepo.log`가 `ActivityType` 타입강제(repositories.ts) → ACTIVITY_TYPES 추가는 typecheck 선행조건.

---

## 3. 함수·도구 시그니처

### 3.1 db repository (raw-SQL 단일 레이어 유지, `packages/db/src/repositories.ts`)

```ts
// rejectionReviewRepo — fitRepo getByJob+UPSERT shape(repositories.ts:651-697) 차용
export const rejectionReviewRepo = {
  getByJob(jobId: string): RejectionReviewRecord | null;     // SELECT * WHERE job_id=?
  get(id: string): RejectionReviewRecord | null;
  save(input: RejectionReviewInput): RejectionReviewRecord;  // getByJob 있으면 UPDATE, 없으면 INSERT(newId('rej_'))
  // UNIQUE(job_id)가 UPSERT-by-job 보장. lessons/improvement_actions는 toJson/fromJson(connection.ts:62-73).
  // FK ON DELETE CASCADE는 embed된 제약에 의존(코드 처리 불요).
};

// verificationRepo — append-only
export const verificationRepo = {
  insert(input: VerificationInput): VerificationRecord;
  // INSERT(newId('ver_'), checked_at=now(), computed_json=toJson(input.computed),
  //        ai_reported_json=toJson(input.ai_reported ?? {}), metrics_json=toJson(input.metrics ?? {}))
  latest(artifact_type: string, artifact_id: string): VerificationRecord | null;
  // SELECT * WHERE artifact_type=? AND artifact_id=? ORDER BY checked_at DESC LIMIT 1 (idx_verifications_latest)
  // UPDATE/DELETE 없음(append-only 불변).
};
```

### 3.2 hash write 확장 (적대 리뷰 inconsistent 반영 — 두 repo 구조 차이 명시)

- **fit:** `fitRepo.save`의 UPDATE(repositories.ts:665)·INSERT(:681) **모두 hash 컬럼 미포함** → 컬럼 추가만으로 안 채워짐. **별도 `fitRepo.setHashes(id, { resume_content_hash, jd_hash })` 메서드로 분리**(기존 save 호출부 시그니처 영향 최소화, 권장). save 시그니처 확장은 호출부 전파 비용 큼.
- **cover_letter_versions:** `addVersion`(repositories.ts:472-505)은 **append-only INSERT(:497)뿐, UPDATE-or-INSERT 아님** → hash는 **INSERT 시점에만 바인딩**하면 됨(UPDATE 확장 불필요). 즉 두 repo는 동형이 아니다 — fit은 setHashes 분리, clv는 addVersion INSERT에 hash 인자 추가.
- check_staleness 비교: 저장된 `resume_content_hash` vs 현재 primary resume(`documentRepo.primary('resume')`)의 **동일 정규화 함수** 해시(R3 함수 공유 필수).

### 3.3 compute 도구 I/O (readOnly preview — serverComputed vs aiExtractedInput 분리)

> compute 도구(`validate_*`/`check_*`)는 **readOnly:true PREVIEW** — core를 호출하나 `verifications`·`activityRepo.log`에 **쓰지 않음**(C4). 출력은 모두 `DetObservation` envelope. tool은 mcp-tools 컴포넌트 소유이며, 본 문서는 **입력에 외부AI 주입 분리가 드러나야 한다**는 계약만 명시.

```ts
// check_traceability — 외부 AI가 ai-extracted 카운트를 명시 주입(CareerMate엔 NER 없음)
{ artifact_id: z.string(),
  aiExtractedInput: z.object({ N_unanchored: z.number(), N_unverified: z.number(), placeholder_count: z.number() }) }
// → 출력: { serverComputed:{N_total}, mixed:{traceability_ratio}, ... }  // ratio는 mixed=advisory only

// validate_cover_letter — shared-zod 재사용, MAX_BODY 자동 바운드
{ text: optBody, job_id: z.string().optional() }
// 주의(§6): optBody는 min 없음 → 빈/미제공 text도 통과. serverComputed det의 vacuous-pass 차단 가드 필요.

// check_staleness — now는 외부 입력 금지(아래)
{ artifact_id: z.string() }   // now 입력 제거: 서버 Date.now() 고정(외부 now 주입 시 det 오염)
```

**`check_staleness`의 `now` 입력 제거(적대 리뷰 detSpoofing 반영):** `now`를 외부 AI가 주입하면 staleness(date arithmetic)가 `aiExtractedInput` 오염 → 더는 `serverComputed`/det가 아니다. 서버 `Date.now()`로 고정하고 입력 스키마에서 제거해야 "det" 표기가 성립.

### 3.4 mutate 도구

`save_rejection_review`(readOnly:false) → core가 `rejectionReviewRepo.save` + `activityRepo.log('rejection_reviewed')`, 상태 변경은 `updateApplicationStatus`→`setStatus` 경유(raw `applications.status` UPDATE 금지, assertStatusTransition 불변 보존). `evaluate_offer` → core. handler는 thin(core 호출 + ok/fail). `toCallToolResult`(result.ts:37-48)는 payload를 **plain object로 래핑**해야 `structuredContent` 부착(top-level array는 드롭, C9-1).

---

## 4. 로직 (단계별 의사코드)

### 4.1 migrate() — 슬롯별 멱등 + 2-프로세스 직렬화

```text
function migrate(db):
  ensure _meta table
  from = readSchemaVersion(db)            // 0 if absent
  for v in [from .. MIGRATIONS.length):
    db.exec('BEGIN IMMEDIATE;')           // 즉시 RESERVED 락 → web/MCP 중 1프로세스만
    cur = readSchemaVersion(db)           // 락 후 재read (CAS) — busy_timeout 만료 후 진입한 패자 차단
    if cur > v:                           // 다른 프로세스가 이미 적용
      db.exec('ROLLBACK;'); continue
    db.exec(MIGRATIONS[v])                // 순수 DDL (슬롯 문자열엔 BEGIN/COMMIT 없음 — 중첩 금지)
    bumpSchemaVersion(db, v+1)            // 슬롯 단위 bump (뒤 슬롯 실패가 앞 ALTER 재실행 안 유발)
    db.exec('COMMIT;')
  return { from, to: MIGRATIONS.length }
```

(v1/v2는 자체 BEGIN/COMMIT 보유 → 신규 슬롯에만 외부 BEGIN IMMEDIATE 적용하는 분기, 또는 v1/v2 슬롯을 DDL-only로 정규화. 정확한 형태 = ARCHITECTURE R1.)

### 4.2 save 게이트 hash 흐름 (게이트 컴포넌트와 경계)

```text
save_fit_analysis / save_cover_letter_version (게이트 컴포넌트 소유, 여기선 hash 채움 경계만):
  resumeHash = normalize_and_hash(primary_resume_content)   // R3 공통 함수
  jdHash     = normalize_and_hash(job_description)           // 같은 함수
  fitRepo.setHashes(fitId, { resume_content_hash: resumeHash, jd_hash: jdHash })   // fit
  // clv는 addVersion INSERT에 hash 인자로 전달
  runDetChecks(gateableCheckIds)  // serverComputed만 — content_hash_drift 등
  verificationRepo.insert({ ..., computed: serverComputed, ai_reported: mixed+ai, gate_status })
```

---

## 5. 기존 코드 정합 (파일:심볼)

- **`packages/db/src/schema.ts:11`** `MIGRATIONS: string[]` length=2(idx0=v1, idx1=v2). B-2는 4슬롯 append → length 6. 기존 문자열 불변.
- **`schema.ts:14`** `CREATE TABLE IF NOT EXISTS profile`(**단수**) — 슬롯 2 ALTER 타깃.
- **`schema.ts:288-307`** `migrate()` — `from` 1회 read(:293), 전 슬롯 후 1회 bump(:299-305). §2.0/4.1 재구성 대상.
- **`schema.ts:201-236`** v2가 cover_letter_versions(:201-215)·fit_analyses(:218-236) DROP+RENAME rebuild → 슬롯 4가 반드시 idx>1.
- **`schema.ts:241/263`** v2의 `REFERENCES jobs(id) ON DELETE CASCADE` 전례 → 슬롯 3 FK embed 근거.
- **`packages/db/src/connection.ts:13-19`** `getDb()`가 WAL + `foreign_keys=ON`(:17) + **`busy_timeout=5000`(:18)** 직후 `migrate()`(:19). 동시성 분석의 전제. `tx()`/`_inTx`(:31-59) 재진입 가드 = 중첩 BEGIN 금지 근거.
- **`repositories.ts:651-697`** `fitRepo.getByJob`/`save`(UPSERT-by-job) — rejectionReviewRepo 패턴 원형. UPDATE(:665)·INSERT(:681) hash 미포함 → setHashes 분리 근거.
- **`repositories.ts:472-505`** `coverLetterRepo.addVersion` append-only INSERT(:497), UPDATE 경로 없음 → hash는 INSERT 시점 바인딩.
- **`repositories.ts` `activityRepo.log`** `(type, summary, entity_type?, entity_id?)` — `ActivityType` 타입강제.
- **`connection.ts:62-73`** `toJson`/`fromJson` — lessons/improvement_actions/computed_json 직렬화.
- **`packages/shared/src/schemas.ts:55-78`** `MAX_BODY=200_000`/`MAX_LINE=500`/`reqLine`/`optLine`/`optNote`/`optBody`/`strList`/`baseRecord` — **module-private(export 0)** → 신규 스키마는 schemas.ts 내부 정의 필수(C9-2/C9-4).
- **`packages/shared/src/enums.ts:67-91`** `ALLOWED_STATUS_TRANSITIONS`(rejected 비종착 :74) 변경 없음. `:116-126` ACTIVITY_TYPES, `:130-141` ENTITY_TYPES 확장.
- **`packages/mcp-tools` `result.ts:37-48`** `toCallToolResult` — plain object래핑 시에만 structuredContent 부착(C9-1). ToolDef `readOnly` → readOnlyHint.

---

## 6. 엣지·실패 모드·테스트 포인트

1. **다중 슬롯 웨이브 중간 실패(단일 프로세스).** 슬롯 4 실패 시 §2.0 정정2의 영구 크래시. **테스트:** from=0에서 슬롯 4를 강제 실패시키고 재부팅 → 슬롯 2가 재실행되지 않고 정상 복구되는지(슬롯-bump 모델 검증).
2. **2-프로세스 동시 부팅.** web+MCP가 from=0 동시 read → 둘 다 ALTER 슬롯 도달. `busy_timeout=5000` 만료 후 패자가 ALTER 재실행 안 하는지(락 후 CAS skip 검증).
3. **`profiles` 오타.** 슬롯 2가 `profile`(단수)인지 — `profiles`면 `no such table` 부팅 크래시 회귀 테스트.
4. **빈 입력 vacuous-pass(적대 리뷰 missing).** `validate_cover_letter({text:''})`가 serverComputed det "위반 0"으로 pass 받는 문제. **가드:** 게이트는 `len(normalize(text)) >= 최소 임계` 선행 검사 후에만 det 평가 — 미달 시 `gate_status` 부여 금지(advise도 아님, "내용 부족"). 본 컴포넌트는 컬럼만 제공, 가드는 게이트 컴포넌트 소유이나 규약을 여기 박는다.
5. **`gate_status` 비대칭(적대 리뷰 missing).** `gateableCheckIds`가 현실적으로 0~1개(§gateableAnalysis: truthfulness-critical 0개)라 거의 모든 행이 `advise`/`pass`. `'fail'`은 content_hash_drift(R3 합의+hard 승격 시)에서만 드물게. **컬럼 의미 정본:** `advise`=비차단(기록만), `pass`=극소수 det 통과+나머지 미검증, `fail`=가테이블 det 위반으로 save 차단. 이 의미를 데이터모델이 박아야 게이밍 방지.
6. **det 사칭 — 물리 강제 부재(detSpoofing).** `computed_json` "serverComputed only"는 **CHECK 불가(JSON blob)** → 코드 규약일 뿐. **테스트:** verificationRepo.insert 호출 경로에서 mixed 값이 computed에 들어가지 않는지 유닛 검사(게이트 컴포넌트). 본 컴포넌트는 "물리 강제 아님, 규약 + 코드 검사로 보증"을 정직하게 표기(C2/C5).
7. **`gate_status='pass'` 오인 위험.** 같은 행에 `ai_reported_json`(미검증 자기보고)과 `pass`가 공존 → "det 검증된 pass"로 오독 가능. **대시보드/응답 표기 규약:** pass는 "일부 det lint 통과, 진실성은 미검증 honor-system"으로 좁혀 표기.
8. **hash 정규화 미합의(R3) 상태 채움 유혹.** 슬롯 4 컬럼이 먼저 존재하므로 게이트가 미완성 정규화로 채울 위험. **차단:** 정규화 함수가 shared/core에 단일 확정되기 전에는 게이트가 hash를 det로 쓰지 않음(컬럼 NULL 허용으로 무해 저장만). 동일 JD 재저장이 다른 해시→false-fire 회귀 테스트.
9. **`check_staleness.now` 외부 주입 차단.** now 입력 제거 회귀 — 외부 now가 들어오면 staleness가 mixed로 강등되어야 하나, 서버시각 고정으로 det 유지.
10. **verifications append-only 폭증.** 반복 freshness 재검증이 단조 증가. **보존 정책:** artifact당 최신 N개 유지(예: 20) 또는 주기 vacuum. `idx_verifications_latest`는 조회만 빠르게 하지 폭증을 막지 못함 — 보존 잡(게이트/유지보수 컴포넌트)이 필요함을 명시.
11. **`reapply_eligible_after` 형식.** regex `^\d{4}-\d{2}$` 미적용 시 자유 텍스트로 reapply 게이팅 무의미 — §2.6에서 regex 추가.

---

## 7. 미해결/의존

- **R1 (owner=ARCHITECTURE, must-do — open 강등 금지):** `migrate()` 재구성의 정확한 형태(슬롯별 BEGIN IMMEDIATE+버전 CAS+슬롯-bump, v1/v2 자체 BEGIN과의 분기 처리, 시그니처 변경 여부). 비멱등 ALTER 슬롯(2·4)을 도입하는 이 컴포넌트가 동시성·다중슬롯 실패 가드를 확정해야 설계가 완전.
- **R3 (B-2 진입 선행, open 아님):** `resume_content_hash`/`jd_hash` 단일 정규화 규칙(공백·대소문자·줄순서·NFC). save측 기록과 staleness측 비교가 **동일 함수 공유**(shared 또는 core 단일 위치 확정). 미확정 시 슬롯 4 컬럼은 저장만 하고 det 미사용.
- **R2 (owner=ARCHITECTURE):** 공고별 knockout(`jobHardGate`, fit-matching AI 도출 라벨) 저장 위치. profile 싱글톤엔 불가 → jobs/applications 측 정형 컬럼이 추가 슬롯으로 필요할 수 있음. 추가 시 본 컴포넌트 슬롯 배정(2~5)을 6으로 확장.
- **artifact_id 채움 책임(게이트 컴포넌트):** save_* core fn이 어느 시점에 어떤 해시를 계산해 `VerificationInput`에 넣는지. `artifact_content_hash`/`resume_content_hash`/`jd_hash`는 R3 정규화 함수와 동일 함수 공유 필수(drift 방지). 본 컴포넌트는 컬럼·규약만 제공.
- **fit hash write 방식:** `fitRepo.setHashes` 분리(권장, 호출부 영향 최소) vs `save` 시그니처 확장 — owner=ARCHITECTURE repository 시그니처 결정.
- **verifications 보존 정책 소유:** §6-10 폭증 대책의 구현 위치(게이트 컴포넌트 또는 별도 유지보수 잡).
- **slot 인덱스 cross-doc 정합:** verifications(VERIFIERS)·rejection_reviews/hash(TODO) 독립 설계 → 최종 통합 시 정본 배정(2=hard_gate, 3=rejection_reviews, 4=hash, 5=verifications) 두 저자 합의.

### crossRefs

- [CONTRACT.md](../CONTRACT.md) C6(데이터모델 정본, TODO 소유)·C5(verifications, VERIFIERS 소유)·C2(serverComputed/aiExtractedInput 출처태깅)·C4(readOnly preview vs save 게이트)·C9-1(structuredContent 객체래핑)·C9-2/C9-4(zod 재사용·길이캡)·C9-7(2-프로세스/WAL).
- B-2 컴포넌트 `게이트·save_*` — `rejectionReviewRepo`/`verificationRepo` 호출·`gateableCheckIds` 게이트(본 컴포넌트는 테이블·repo·규약만 제공).
- B-2 컴포넌트 `shared 타입` — REJECTION_STAGES/ACTIVITY_TYPES/ENTITY_TYPES·HardGateSchema·RejectionReviewInput·VerificationInput(DB 컬럼과 1:1).
- [ARCHITECTURE.md](../ARCHITECTURE.md) — migrate() 동시성 정확 패턴(R1)·repository 시그니처·jobHardGate 위치(R2).
- 코드 앵커: `schema.ts:11/14/201-236/241/263/288-307`, `connection.ts:13-19/31-59/62-73`, `repositories.ts:472-505/651-697`, `enums.ts:67-91/116-126/130-141`, `schemas.ts:55-78`.
