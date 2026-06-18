# save-time 게이트 (gateableCheckIds) — Career-OS Phase B-2 상세 설계

> 횡단 결정 정본 = [CONTRACT.md](../CONTRACT.md). 이 문서는 **B-2 구현 스펙(설계만, 코드 미수정)**. CareerMate 내부 LLM 없음.

## 1. 목적·범위

CONTRACT C4의 핵심 질문을 **정직하게 종결**한다: 실제로 `save_*`가 persist를 막을 수 있는 체크 집합(`gateableCheckIds`)을 명시 열거한다. 6개 검증기 + 16개 도메인 루브릭을 전수해 **(a) 순수 serverComputed(외부 AI 주입 0) AND (b) severity:`hard`** 를 동시에 만족하는 체크만 게이트로 인정한다.

**전수 결과(정직):** truthfulness의 critical 체크(C1/C2/C3/C5 = 숫자 anchoring·fabrication·실세계 fact-check)는 **전부 `grade:'ai'`** (한국어 NER + 실세계 대조), C10 traceability는 `mixed`(분자 N_unanchored가 C1의 ai 출력), C7 placeholder_count는 순수 serverComputed지만 docs가 `severity:'soft'`라 hard 아님. 즉 **가장 중요한 검증기는 아무것도 차단하지 못한다** — 허위 수치가 든 자소서는 막을 수 없고 넛지만 가능하다. 이것이 false-pass 비대칭의 핵심: ai 자기보고는 위조 가능한 명예 시스템이다.

따라서 B-2 게이트의 실제 가치는 "게이트"가 아니라 **(B-1) 루브릭 데이터 서빙·라우팅·자기검증 가이드 + (B-2) provenance-split `verifications` 1행 기록(C5)** 이다. 본 컴포넌트는 게이트를 **"det lint + advisory"** 로 한정 광고하고, 모든 ai/mixed 위반은 **넛지 전용**으로 라우팅한다.

**범위:** `gateableCheckIds` 동결 enumeration(데이터), `runGateableChecks` det 엔진 부분집합, `saveCoverLetterVersion`/`saveFitAnalysis` 게이트 배선, `validate_*`/`check_*` advisory preview 도구. 본 컴포넌트는 **마이그레이션 슬롯을 소유하지 않고 소비만** 한다(슬롯 소유 = 01-datamodel / 02-verifications-table).

### 1.1 두 적대 리뷰 반영 요약 (변경점 정본)

1. **[DET 사칭 — 치명, 두 리뷰 공통 mustFix]** 게이트는 hash를 **입력 파라미터로 받지 않는다.** 외부 AI가 `input.resume_content_hash`를 주입하면 그것은 `aiExtractedInput`이고, 게이트가 그 값으로 통과/실패를 판정하면 false-pass(일치 해시 위조)·false-fire(임의 해시) 둘 다 가능 → zero-ai 불변식 붕괴. **해결:** `runGateableChecks`는 hash를 인자로 받지 않고, CareerMate가 `documentRepo`/`jobRepo`에서 stored 본문을 직접 읽어 정규화·해시한다. 입력 hash 필드는 **기록 전용**(`verifications`에만 적재, 게이트 평가에서 완전 배제).
2. **[원자성, 아키텍트 mustFix]** 게이트 throw + persist + `verifications.insert` + `activityRepo.log`를 **단일 `tx()`로 래핑**(connection.ts:40, re-entrant). pass 경로에서 insert 실패 시 artifact만 커밋되는 audit 불일치를 막는다.
3. **[fit 본문 부재, 두 리뷰 missing/inconsistent]** `fit_analyses`에는 자유 본문 컬럼이 없다(score/summary/strengths/gaps/keywords/recommendations만). 따라서 `saveFitAnalysis` 게이트는 **content_hash_drift만** 평가하고 fact_number_preservation은 적용 불가(대상 본문 없음).
4. **[UPSERT deadend, 크리틱 mustFix]** `fitRepo.save`/`coverLetterRepo.addVersion`은 신규 INSERT가 아니라 UPSERT/append다. content_hash_drift는 **저장 시점 항상 통과**(방금 계산한 현재값과 비교 → drift 0)이므로 본질적으로 read-time 경고에 가깝다. 이를 정직히 명문화하고, 게이트 fail의 복구 경로(`force` 플래그)를 정의한다.
5. **[gate=0 위장, 크리틱 missing/spoofing]** 활성 게이트가 0이면 `gate_status:'pass'`가 "검증 통과"로 오인된다. **`gate_status:'advise'`** 를 별도 기록해 false confidence를 막는다(GATE_STATUSES에 이미 `'advise'` 존재).
6. **[DetSpec kind 불일치, 크리틱 inconsistent]** content_hash_drift는 날짜 산술이 아니라 해시 동등 비교이므로 `kind:'staleness'`(maxAgeDays/anchorField, 날짜 기반)가 아니라 **신규 `kind:'hash_drift'`** 로 둔다.
7. **[컬럼 실재 방어, 크리틱 missing]** version gate(`requiresSchemaVersion>=4`)는 "슬롯 실행됨"이지 "컬럼 존재"가 아니다. 게이트는 `PRAGMA table_info`로 컬럼 실재를 확인 후 평가하고, 없으면 graceful-degrade한다.

---

## 2. 데이터/타입 계약 (TS 인터페이스 / SQL DDL)

### 2.1 `gateableCheckIds` — 동결 enumeration (소유 = `@careermate/knowledge`)

데이터만(eval 로직은 core). `packages/knowledge/src/gateable.ts`:

```ts
import type { DetSpec } from './detspec.ts'; // 03-det-engine 소유 타입

export interface GateableCheck {
  /** 'verifierId.rubricCheckId' 형식. */
  checkId: string;
  verifierId: 'recency-staleness' | 'human-voice';
  detLogic: DetSpec;
  /** 정의상 항상 'hard'. soft 체크는 gateable이 될 수 없다. */
  severity: 'hard';
  /**
   * 활성화 선결조건. 미충족이면 core가 해당 체크를 평가에서 제외(graceful-degrade).
   * - schemaVersion: hash 컬럼(slot 4) 존재 요구.
   * - precondition: 코드/규칙 합의가 선행돼야 zero-ai가 성립하는 항목.
   */
  requires?: {
    schemaVersion?: number;
    precondition?: 'hash_normalization_agreed' | 'derivation_link_server_known';
  };
}

export const GATEABLE_CHECKS: readonly GateableCheck[] = [
  {
    checkId: 'recency-staleness.content_hash_drift',
    verifierId: 'recency-staleness',
    // 날짜 산술 아님 — 순수 해시 동등 비교(신규 kind). 03-det-engine DetSpec에 추가.
    detLogic: { kind: 'hash_drift', sources: ['resume', 'jd'] },
    severity: 'hard',
    requires: { schemaVersion: 4, precondition: 'hash_normalization_agreed' },
  },
  {
    checkId: 'human-voice.fact_number_preservation',
    verifierId: 'human-voice',
    // 원본 본문 숫자 토큰 집합 ⊆ 대상 본문 집합(집합비교). human-voice C8 severity:hard.
    detLogic: {
      kind: 'pattern',
      patterns: ['\\d[\\d,.]*\\s*(%|억|만|원|명|건|배|개월|년|시간|ms|x|개)'],
      flags: 'g',
    },
    severity: 'hard',
    requires: { precondition: 'derivation_link_server_known' },
  },
];

export const gateableCheckIds: readonly string[] = GATEABLE_CHECKS.map((c) => c.checkId);
```

> **HONESTY NOTE(코드 주석 + docs 동기):** 두 후보의 `precondition`이 모두 미해결(§7)이므로 **현 시점 활성 게이트 = 0**으로 수렴할 가능성이 매우 높다. 그 경우 B-2 게이트는 no-op이고 `verifications`는 `gate_status:'advise'`로만 기록된다. **이를 "검증 통과"로 광고하는 것은 정직성 위반이다.**

### 2.2 게이트가 배제하는 체크 (gateable 아님 — 정본 근거)

| 검증기/루브릭 | 최강 후보 | grade | gateable? | 근거 |
|---|---|---|---|---|
| truthfulness C1/C2/C3/C5 (critical) | — | `ai` | ✗ | 한국어 NER + 실세계 대조 |
| truthfulness C10 traceability | — | `mixed` | ✗ | 분자 N_unanchored = C1 ai 출력 |
| truthfulness C7 placeholder_count | placeholder_delta | `soft` | ✗ | docs가 soft 등급 — 임의 hard 승격 금지 |
| human-voice C1 slop_density | count_threshold | `soft` | ✗ | 스타일 advisory를 hard 차단 = 적대적 UX |
| human-voice C8 숫자 보존 | fact_number_preservation | `hard` | △ | **원본=stored artifact일 때만 zero-ai** (선결조건) |
| human-voice C9 고유명사 보존 | — | `ai` | ✗ | NER = ai, 영구 제외 |
| ats-compat keyword_coverage | — | `mixed` | ✗ | keyword SET = aiExtractedInput(C2 hard 승격 금지) |
| recency-staleness C4 version drift | content_hash_drift | `hard` | △ | **hash 정규화 합의 선행**(선결조건) |
| recency-staleness freshness_ratio | — | `mixed` | ✗ | recent-fact 매핑 = ai |
| consistency / responsiveness | — | `ai` | ✗ | pairwise anchor 비교·비정량 제약 |
| 도메인 16 루브릭(resume/cover-letter §3) | — | (미태깅) | ✗ | machine-readable `severity:hard` 태그 없음 → 후보 0 |

### 2.3 의존 마이그레이션 슬롯 (소비만 — 본 컴포넌트 신규 슬롯 0개)

스파인 canonical 순서를 그대로 준수한다(append-only, 기존 v1/v2 IMMUTABLE, schema_version once-per-slot 게이트 = 안전장치).

| 슬롯 index | 버전 | DDL | 소유 | 본 컴포넌트 용도 |
|---|---|---|---|---|
| 4 | v5 | `fit_analyses`/`cover_letter_versions`에 `resume_content_hash`·`jd_hash` ALTER ADD | 01-datamodel | `content_hash_drift`의 `requiresSchemaVersion=4` 근거(기록 전용 컬럼) |
| 5 | v6 | `verifications` CREATE TABLE + `idx_verifications_latest` | 02-verifications-table | pass/advise 기록 대상 |

slot 4 DDL(소비 전제, 정본은 01):

```sql
BEGIN;
ALTER TABLE fit_analyses ADD COLUMN resume_content_hash TEXT;
ALTER TABLE fit_analyses ADD COLUMN jd_hash TEXT;
ALTER TABLE cover_letter_versions ADD COLUMN resume_content_hash TEXT;
ALTER TABLE cover_letter_versions ADD COLUMN jd_hash TEXT;
COMMIT;
```

- **멱등성 근거:** `migrate()`(schema.ts:288-307)는 CREATE IF NOT EXISTS 멱등성이 아니라 **`for v=from; v<MIGRATIONS.length` once-per-slot version gate**가 안전장치다. `ALTER ADD COLUMN`은 **비멱등**(재실행 시 duplicate column 크래시)이므로 슬롯 게이트에 전적으로 의존한다.
- **2-프로세스 경합(C9-7, ARCH R1 open):** web+MCP가 동시 boot하면 둘 다 `from=2`를 읽고 slot 4 ALTER를 중복 실행 → 두 번째가 `duplicate column` 크래시. connection.ts:5 주석("WAL handles ... cleanly")과 달리 `migrate()`는 `BEGIN IMMEDIATE` 없이 `db.exec`를 순차 실행한다(schema.ts:295-297). **본 게이트는 slot 4 존재에 의존하므로 이 부팅 크래시 리스크를 상속한다** — "읽기만 하니 안전"이 아니다. 해결은 `migrate()`에 `BEGIN IMMEDIATE` write-lock + version 재확인(ARCH R1 owner)이며, 본 컴포넌트는 이를 **dependency-blocker로 명시**한다.

### 2.4 NOT-A-MIGRATION (코드 상수, schema_version 영향 0이지만 **컴파일 hard 전제**)

```ts
// packages/shared/src/enums.ts — ACTIVITY_TYPES (현재 enums.ts:116, 'verification_run' 부재)
export const ACTIVITY_TYPES = [
  /* ...기존 9개... */,
  'verification_run', // 신규
] as const;
```

> **아키텍트 mustFix:** `activityRepo.log(type: ActivityType, ...)`는 정적 타입(repositories.ts:836, enums.ts:127). `'verification_run'`을 `ACTIVITY_TYPES`에 추가하지 않으면 게이트 배선의 `activityRepo.log('verification_run', ...)` 호출이 **tsc 컴파일 에러**다. 이 enum 추가는 "곁다리"가 아니라 본 컴포넌트의 hard 컴파일 전제다. `status` 컬럼은 free TEXT라 CHECK 제약이 없으므로 enum 추가에 DDL은 불필요.

---

## 3. 함수·도구 시그니처

### 3.1 `runGateableChecks` (소유 = `packages/core`, det 엔진의 hard-only·zero-ai 부분집합)

```ts
// packages/core/src/services.ts (또는 core/verify/ 서브모듈 — services.ts 비대화 시, ARCH R1)
export interface GateOutcome {
  /** 활성 게이트가 1개라도 평가됐고 모두 통과 = 'pass'; 위반 = 'fail'; 활성 게이트 0 = 'advise'. */
  gate_status: 'pass' | 'fail' | 'advise';
  violations: { checkId: string; observed: number; expected: string }[];
  /** serverComputed ONLY → verifications.computed_json. mixed/ai 절대 금지. */
  computed: Record<string, number>;
}

export function runGateableChecks(artifact: {
  type: 'cover_letter' | 'fit';
  id: string;
  /** stored 본문 — cover_letter_versions.content. fit은 본문이 없어 undefined. */
  content?: string;
}): GateOutcome;
```

**zero-ai 봉인(두 리뷰 치명 mustFix 반영):**
- **hash를 인자로 받지 않는다.** `content_hash_drift`는 함수 내부에서 `documentRepo.primary('resume')?.content`와 `jobRepo.get(jobId)?.description`을 읽어 **CareerMate가 직접 정규화·해시**하고, artifact에 저장된 hash 컬럼(slot 4)과 비교한다. 외부 AI가 끼어들 입력 표면이 시그니처에 없다.
- `aiExtractedInput` 파라미터 없음(타입으로 봉인). 어떤 ai 자기보고도 `runGateableChecks`에 도달하지 못한다 → `computed`에 mixed/ai가 새어들 수 없다(C2 det 사칭 ban의 코드 단위 강제).
- `getSchemaVersion()`은 인자가 아니라 함수 내부에서 db를 통해 조회(§3.4).

### 3.2 `saveCoverLetterVersion` / `saveFitAnalysis` 게이트 배선 (소유 = core)

기존 함수(services.ts:98-106, :110-133)를 **단일 `tx()`로 재구성**(saveInterviewPrep:172-186의 throw-before-persist 패턴 + 원자성):

```ts
// saveCoverLetterVersion — 게이트 + persist + verification + activity 를 한 tx로
export function saveCoverLetterVersion(input: CoverLetterVersionInput) {
  return tx(() => {
    const gate = runGateableChecks({
      type: 'cover_letter',
      id: input.cover_letter_id ?? '(new)',
      content: input.content,
    });
    if (gate.gate_status === 'fail' && input.force !== true) {
      throw new Error(
        `저장 전 자동 점검에서 막혔습니다: ${gate.violations.map((v) => v.expected).join(' / ')}. ` +
          `근거 데이터가 바뀌었거나 원본 수치가 누락됐는지 확인 후 다시 저장하세요(그대로 저장하려면 force:true).`,
      );
    }
    const { coverLetter, version } = coverLetterRepo.addVersion({ /* ...기존... */ });
    // ...application 연결(기존 services.ts:121-126)...
    verificationRepo.insert({
      artifact_type: 'cover_letter',
      artifact_id: coverLetter.id,
      resume_content_hash: input.resume_content_hash, // 기록 전용 — 게이트 평가엔 안 씀
      jd_hash: input.jd_hash,                         // 기록 전용
      rubric_id: '(gate)',
      computed: gate.computed, // serverComputed only
      gate_status: gate.gate_status, // 'pass' | 'advise' (fail은 throw로 도달 불가)
    });
    activityRepo.log('cover_letter_version_saved', `...v${version.version_no}...`, 'cover_letter', coverLetter.id);
    activityRepo.log('verification_run', `${coverLetter.title} 저장 전 자동 점검 ${gate.gate_status}`, 'cover_letter', coverLetter.id);
    return { coverLetter, version };
  });
}
```

`saveFitAnalysis`도 동일하되 **content_hash_drift만 평가**(fit_analyses에 본문 컬럼 없음 → `content: undefined` → fact_number_preservation 자동 SKIP). `force` 플래그는 양 함수의 Input 스키마에 optional boolean으로 추가(§3.3).

**불변식:**
- throw가 persist BEFORE(부분 저장 없음) + 전체가 1 tx(원자성).
- `verifications` 기록은 fail이 아닐 때(pass/advise)만, append-only.
- ai/mixed 위반은 **여기서 평가조차 안 됨** → 차단 불가. 넛지는 도구 출력 💡로(C7, CONSUMPTION.md).
- `input.resume_content_hash`/`jd_hash`는 `verifications`에 **기록만**(audit), 게이트 평가에서 분리.

### 3.3 `force` 복구 플래그 (크리틱 deadend mustFix)

```ts
// packages/shared/src/schemas.ts — CoverLetterVersionInput / FitAnalysisInput 에 추가
force: z.boolean().optional(), // 게이트 fail을 무시하고 저장(사용자 명시 의사). 기록은 gate_status:'fail'로 남김.
```

`force:true`로 우회 저장 시에도 `verifications`에 `gate_status:'fail'`을 **정직히 기록**(우회됐음을 audit). UPSERT 산출물을 고쳐서 다시 저장하는 경로(deadend 방지)를 보장한다.

### 3.4 `getSchemaVersion()` 신규 db API (아키텍트 missing — openQuestion 승격)

```ts
// packages/db/src/connection.ts — runGateableChecks가 컬럼 실재 graceful-degrade에 사용.
export function getSchemaVersion(): number {
  const row = getDb().prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as
    | { value: string } | undefined;
  return row ? Number(row.value) : 0;
}
```

> version gate는 "슬롯 실행됨"만 보장하므로, `content_hash_drift`는 추가로 `PRAGMA table_info(fit_analyses)`로 `resume_content_hash` 컬럼 실재를 확인 후 평가한다(부분 실패 ALTER 방어, 크리틱 missing).

### 3.5 `verificationRepo.insert` / `.latest` (소비 측 — 소유 = 02-verifications-table)

```ts
// packages/db/src/repositories.ts — 본 게이트는 insert + latest 만 소비. verifications 테이블 정본은 02.
export const verificationRepo = {
  insert(v: VerificationInput): VerificationRecord {
    const id = newId('ver_');
    const ts = now();
    getDb().prepare(
      `INSERT INTO verifications
       (id,artifact_type,artifact_id,artifact_content_hash,resume_content_hash,jd_hash,
        rubric_id,computed_json,ai_reported_json,metrics_json,gate_status,checked_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id, v.artifact_type, v.artifact_id, v.artifact_content_hash ?? null,
      v.resume_content_hash ?? null, v.jd_hash ?? null, v.rubric_id,
      toJson(v.computed ?? {}),                          // serverComputed ONLY
      v.ai_reported ? toJson(v.ai_reported) : null,      // ai 자기보고 + mixed
      v.metrics ? toJson(v.metrics) : null,
      v.gate_status ?? 'advise', ts,
    );
    return { ...v, id, checked_at: ts };
  },
  latest(artifactType: string, artifactId: string): VerificationRecord | null {
    /* idx_verifications_latest(artifact_type,artifact_id,checked_at DESC) ORDER BY checked_at DESC LIMIT 1 */
  },
};
```

> **INVARIANT(스파인):** `computed_json` = serverComputed만, `mixed`/ai 자기보고 = `ai_reported_json`. 게이트는 `computed`만 채운다. hash 인자를 받지 않으므로(§3.1) `computed`에 ai 파생값이 위장 적재될 표면이 없다. raw `applications.status` UPDATE 금지(여긴 verifications 전용, append-only).

### 3.6 `validate_cover_letter` / `check_staleness` (advisory preview, **비게이트** — 소유 = mcp-tools)

```ts
// packages/mcp-tools/src/tools.ts — readOnly:true. 게이트와 엄격 분리(C4 CRITICAL 2).
{
  name: 'validate_cover_letter',
  readOnly: true,
  // ZodRawShape 직접(이미 raw shape — .shape 아님; ToolDef.inputSchema=ZodRawShape, result.ts:22)
  inputSchema: { text: optBody, job_id: z.string().optional() },
  handler: async (a) =>
    ok('자동 점검 미리보기', toCallToolResult(/* plain object 래핑, C9-1 */ {
      serverComputed: { /* slop_count 등 det */ },
      mixed: { /* freshness_ratio 등 advisory only */ },
      residual_ai_checks: [{ id: 'truthfulness.C1', aiPrompt: '...' }], // 외부 AI에 위임
    }).structuredContent),
}
```

- 반환은 **plain object 래핑**(top-level array 금지 → structuredContent 드롭, result.ts:42-46). `openWorldHint=false`, `readOnlyHint = ToolDef.readOnly`.
- core `runGateableChecks`/det 엔진을 호출해 미리보기를 만들되 **`verifications`/`activityRepo` 기록 절대 금지**(readOnly 진실성, C4 readOnly truth). "이렇게 하면 막힐 수 있다"를 사전 안내만, 강제는 `save_*`만.
- ai/mixed 항목은 `residual_ai_checks`로 외부 AI에 위임(CareerMate는 판정 안 함).

> **타입 정정(아키텍트 mustFix):** `inputSchema`는 `ZodRawShape`이고 `{ text: optBody, ... }`는 이미 raw shape 객체이므로 `.shape`를 붙이지 않는다(`.shape`는 `z.object(...)`에만 존재). 또한 `optBody`/`reqLine`/`strList`는 schemas.ts:55-76에서 **모듈-로컬 const(미export)** 이므로, knowledge/mcp-tools 재사용 전 **schemas.ts에서 `export` 선행**이 필수다(현재 미export → "reuse" 불가, C9-2/C9-4 precondition).

---

## 4. 로직 (단계별 의사코드)

### 4.1 `runGateableChecks(artifact)`

```
1. version = getSchemaVersion()                       # connection.ts 신규 API
2. outcome = { gate_status:'advise', violations:[], computed:{} }
3. activeCount = 0
4. for check in GATEABLE_CHECKS:
     # 선결조건 게이트 (graceful-degrade → 평가 제외)
     if check.requires.schemaVersion && version < it: continue
     if check.requires.precondition not satisfied:     # §7 미해결이면 전부 continue
         continue
     # 컬럼 실재 방어 (version gate ≠ 컬럼 존재)
     if check needs hash cols && !PRAGMA table_info has them: continue
     activeCount++

     switch check.checkId:
       'recency-staleness.content_hash_drift':
         storedResume = documentRepo.primary('resume')?.content   # CareerMate가 직접 읽음
         storedJd     = jobRepo.get(artifact.jobId)?.description   # 외부 AI 입력 0
         curHash      = { resume: normHash(storedResume), jd: normHash(storedJd) }   # 정규화 규칙(§7) 적용
         savedHash    = read artifact row's resume_content_hash / jd_hash (slot 4)
         if savedHash != null && savedHash != curHash:            # 둘 다 stored값 → serverComputed
             outcome.violations.push({checkId, observed:1, expected:'근거 이력서/공고가 저장 시점과 달라졌습니다'})
         outcome.computed['hash_drift'] = mismatch ? 1 : 0

       'human-voice.fact_number_preservation':
         if !artifact.content: continue                            # fit 등 본문 없음 → SKIP
         origin = stored derivation source (derivation_link_server_known 필요, §7)
         if origin == null: continue                               # 파생 링크 서버 미인지 → SKIP
         originNums = regexSet(origin.content)                     # 양쪽 다 stored 본문
         targetNums = regexSet(artifact.content)                   # → serverComputed 집합비교
         missing    = originNums - targetNums
         if missing.size > 0:
             outcome.violations.push({checkId, observed:missing.size, expected:'원본 수치 일부가 누락됐습니다'})
         outcome.computed['number_missing'] = missing.size

5. if activeCount == 0:  outcome.gate_status = 'advise'            # 게이트 0 ≠ 'pass' (위장 방지)
   elif outcome.violations.length > 0: outcome.gate_status = 'fail'
   else: outcome.gate_status = 'pass'
6. return outcome
```

### 4.2 `saveCoverLetterVersion` / `saveFitAnalysis` 흐름

```
tx(() => {
  gate = runGateableChecks(artifact)                 # zero-ai (hash 인자 없음)
  if gate.gate_status == 'fail' && !input.force:
      throw Error(한국어 안내)                        # persist BEFORE — 부분저장 없음
  persist (addVersion / fitRepo.save UPSERT)
  verificationRepo.insert({ ..., computed:gate.computed,
                            gate_status: input.force ? gate.gate_status('fail') : gate.gate_status })
  activityRepo.log(기존 saved 타입)
  activityRepo.log('verification_run', ...)
})                                                    # 전부 1 tx — atomic (아키텍트 mustFix)
# ai/mixed 위반은 평가도 안 됨 → 호출자가 residual_ai_checks를 받아 💡 넛지(C7)
```

---

## 5. 기존 코드 정합 (파일:심볼)

| 영역 | 코드 사실 | 본 설계 반영 |
|---|---|---|
| throw-before-persist | `services.ts:172-186` saveInterviewPrep — `interviewRepo.save` 전에 한국어 throw | 게이트 throw를 persist 직전 + **추가로 `tx()` 래핑**(saveInterviewPrep은 단발 INSERT라 tx 불필요했지만 게이트는 4-step이라 필요) |
| 원자성 | `connection.ts:40-59` `tx()` re-entrant(`_inTx` 가드, nested join). `addVersion`은 자체 `tx()`(repositories.ts:484) | 바깥 `tx()`가 `addVersion`의 내부 tx를 join → 단일 커밋. fail 롤백 시 verifications도 함께 롤백 |
| fit 본문 부재 | `fit_analyses`(schema.ts:117-129): score/summary/strengths/gaps/keywords/recommendations만, **자유 본문 없음** | `saveFitAnalysis`는 content_hash_drift만, fact_number_preservation은 `content:undefined`로 자동 SKIP |
| UPSERT no-op | `fitRepo.save`(repositories.ts:658) getByJob+UPDATE; `addVersion`(:484) append | content_hash_drift는 저장 시점 항상 통과(현재값 비교) → "save-gate로는 거의 no-op, read-time 경고"임을 §1.1·§6에 명문화 |
| 전이 합법성 | `repositories.ts:751` upsert·`:762` setStatus 둘 다 `assertStatusTransition`. `services.ts:145-168` updateApplicationStatus는 직접 호출 안 하고 setStatus 위임 | (rejection_review는 별 컴포넌트지만) **raw `applications.status` UPDATE 금지** 원칙 공유 — 본 게이트도 status를 만지지 않는다 |
| migrate 멱등성 | `schema.ts:288-307` `for v=from;v<len` + ON CONFLICT once. ALTER ADD COLUMN 비멱등 | slot 4/5 소비. 안전장치 = version gate(once-per-slot), CREATE IF NOT EXISTS 아님 |
| 2-프로세스/WAL | `connection.ts:5` "WAL ... cleanly" 주석 vs `migrate()` `BEGIN IMMEDIATE` 없음 | slot 4 ALTER 중복 실행 crash 리스크 상속 → **dependency-blocker(ARCH R1)** 로 명시(§2.3) |
| structuredContent | `result.ts:37-48` plain object(non-array)만 structuredContent 첨부 | compute/preview 출력을 plain object로 래핑(C9-1) |
| 길이 캡 | `schemas.ts:55-76` MAX_BODY=200_000, `optBody`/`reqLine`/`strList` **미export const** | preview 입력 `text: optBody`(200KB bound). **schemas.ts에서 export 선행 필수**(C9-2/C9-4) |
| ToolDef | `result.ts:18-26` `inputSchema:ZodRawShape`, `readOnly?`, `ok()/fail()` | `validate_*` readOnly:true, raw shape 직접(`.shape` 아님) |
| activity 정적타입 | `activityRepo.log(type:ActivityType,...)`(repositories.ts:836), `ACTIVITY_TYPES`(enums.ts:116) | `'verification_run'` 추가는 컴파일 hard 전제(§2.4) |
| 정규식 안전 | C9-6 | regex 모듈 로드 1회 컴파일·캐싱, 본문 MAX_BODY bound |

---

## 6. 엣지·실패 모드·테스트 포인트

- **빈/공백 본문 pass(크리틱 missing):** 신규 자소서(stored 원본 없음)는 content_hash_drift 비교 대상이 없어 자동 통과; 빈 대상은 fact_number_preservation도 vacuous pass. **즉 텅 빈 자소서가 게이트를 통과해 저장된다 — 게이트는 품질을 보증하지 않는다(det lint 한계).** zod `reqBody`(EMPTY_MSG)가 빈 본문을 막는 1차 방어이며 게이트가 아니다.
- **활성 게이트 0(위장 방지):** `gate_status:'advise'` 기록. `verifications.latest`를 읽는 측은 `advise`를 "검증 안 함"으로 해석해야 한다(테스트: gate=0일 때 `pass`가 기록되면 실패).
- **content_hash_drift 저장 시점 no-op:** 저장과 동시에 hash를 쓰면 drift=0 → 항상 pass. **테스트:** 저장 후 stored 이력서를 바꾸고 재조회하면 `latest`가 drift를 잡는지(read-time 의미) 확인. save-time에서 fail이 나면 오히려 정규화 버그 신호.
- **force 우회:** `force:true`로 fail을 우회해도 `verifications.gate_status='fail'`로 정직히 기록(테스트: force 저장 후 latest가 fail인지).
- **컬럼 부분 실재:** slot 4가 한 컬럼만 추가된 상태 → `PRAGMA table_info` 방어로 게이트 SKIP(크래시 금지, 테스트).
- **2-프로세스 boot crash:** web+MCP 동시 첫 boot 시 slot 4 중복 ALTER → 두 번째 duplicate column crash(ARCH R1 미해결 시 재현 테스트로 회귀 감시).
- **det 사칭 회귀(핵심):** `runGateableChecks` 시그니처에 hash/ai_reported 파라미터가 **추가되지 않았는지** 타입 레벨 테스트. 추가되면 zero-ai 불변식 붕괴 → 빌드 실패로 막아야 함.
- **ai_reported 누수(크리틱 missing):** `save_*`가 `ai_reported`를 받아 `verifications.ai_reported_json`에 기록하더라도, `runGateableChecks`는 그것을 인자로 받지 못하게(별도 호출 경로) → 게이트 입력 누수 0임을 단위 테스트로 봉인.
- **원자성:** verificationRepo.insert를 강제 throw시켜 artifact가 롤백되는지(C5 audit 무결성) 테스트.

---

## 7. 미해결 / 의존

1. **hash-normalization 규칙(TODO R3 — content_hash_drift hard precondition):** 무엇을 정규화하나(공백/개행/대소문자/유니코드 NFC)? 미합의 시 동일 JD 재저장이 다른 해시 → 게이트 false-fire. **이 규칙 합의 전까지 `content_hash_drift`는 영구 비활성(활성 게이트 0).** 정규화 함수 `normHash`의 정본은 01/03 owner가 정한다.
2. **fact_number_preservation의 파생 링크(`derivation_link_server_known`):** documents는 versionless(D5, documentRepo.update 인플레이스)라 자소서 버전↔원본 이력서를 잇는 서버측 식별자가 **없다**. `derived_from_document_id`를 input으로 받으면 그 식별자 선택이 외부 AI 판단(어느 이력서가 원본인가) → **mixed 오염 → 게이트 자격 상실**. 서버가 파생을 독립 추론할 수단이 없으면 이 게이트도 영구 비활성. (둘 다 미해결 시 **활성 게이트 = 0**으로 수렴.)
3. **gate=0일 때 verifications 기록 여부:** `gate_status:'advise'` 1행 기록(audit 가치) vs 빈 행 노이즈. 본 설계는 **advise 기록 채택**(검증 부재를 명시적으로 audit, false confidence 차단). 재검토 시 02-verifications-table owner와 합의.
4. **`getSchemaVersion()` db API:** 본 문서가 신규 export 스펙을 제안(§3.4). 정본 구현 owner = db/ARCH.
5. **넛지(💡) 입력 = `ai_reported` optional:** ai/mixed 위반을 `save_*` 성공 응답에 실으려면 `ai_reported`를 input으로 받아 `ai_reported_json`에 기록. **분리 보장:** `runGateableChecks`는 `ai_reported`를 절대 인자로 못 받는 별도 호출(타입 레벨)로 게이트 평가 누수 0을 강제(§6 테스트).
6. **saveFitAnalysis 게이트 실효성:** fit_analyses 본문 부재 + UPSERT no-op으로 사실상 게이트할 것이 거의 없다. 배선은 일관성·audit 1행 기록을 위해 유지하되, "saveFitAnalysis 게이트는 거의 항상 advise/pass"임을 인정.
7. **migrate() 2-프로세스 경합(C9-7/ARCH R1):** slot 4 비멱등 ALTER의 동시 실행 crash. `BEGIN IMMEDIATE` + version 재확인 해결은 ARCH owner. 본 게이트의 부팅 안정성은 이 해결에 의존.
