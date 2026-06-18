# Career-OS 정본 계약 (CONTRACT.md)

> **이 문서는 Career-OS Phase B 설계의 횡단(cross-cutting) 결정 단일 정본이다.**
> 다른 모든 career-os 문서(ARCHITECTURE/CONSUMPTION/EXPERTS/VERIFIERS/LOOP_ENGINE/CONSENSUS_ENGINE/EVALUATION/TODO/KNOWLEDGE)는 아래 결정을 **재정의하지 않고 참조**한다. 충돌 시 **CONTRACT가 이긴다.** 각 문서의 §5(정합 규칙)는 여기 C9를 가리킬 뿐 재서술하지 않는다.
>
> 제약 재확인: CareerMate 내부 LLM 없음. 지식은 데이터로 serve, 검증의 det만 CareerMate가 계산, 의미판단(ai)은 외부 AI. 본 Phase B는 **설계 문서만** 만든다(코드 미수정).
>
> **개정 이력:** v2(2026-06-17) — 외부 독립 리뷰(Codex GPT-5.5, xhigh) 반영. **Phase B를 B-1(serve-only)·B-2(det+gate+persist)로 분리**(C0), `validate_*`/검증 게이트/`verifications` 테이블/데이터모델을 B-2로 이월, det/ai 경계를 `serverComputed`/`aiExtractedInput`로 강화(C2), 소비 경로를 가장 강한 진입점에 박는 방식으로 격상(C7), 도메인 16·검증기 6 enum 고정(C3).

---

## C0 — Phase 분리 (B-1 serve-only / B-2 det·gate·persist) **[v2 신설, 최상위]**

Codex 리뷰의 핵심: **순수 det+hard로 실제 save를 막을 수 있는 체크가 거의 없고**(truthfulness critical이 전부 `ai`), `validate_*`의 readOnly와 영속/로그가 모순이며, 마이그레이션 의존 det를 먼저 배선하면 빈 입력이 pass를 낸다. 따라서 범위를 둘로 자른다.

- **Phase B-1 = serve-only + 라우팅(마이그레이션 0, 게이트 0).**
  - 신규: `packages/knowledge` 데이터(C1) + serve 도구 `get_playbook`/`get_verifier`/`get_fact_anchors`/`get_shared_lexicons`(C3).
  - 확장(기존 도구 코드 수정, 스키마 변경 없음): `get_workflow_guide`(마스터 라우터), **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입**(C7).
  - 소비 배선: `AGENTS.md`/`system.ts` #9 패치(제안) + **MCP server instructions**(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가.
  - **게이트 없음.** 외부 AI가 루브릭을 받아 **스스로** 자가검증한다. CareerMate는 아무것도 차단하지 않는다(기존 `saveInterviewPrep` 상태게이트만 유지).
- **Phase B-2 = det 엔진 + 검증 게이트 + 영속(마이그레이션 필요).**
  - det 계산 도구(`check_traceability`/`check_staleness` 등 compute), save-time 게이트(C4 `gateableCheckIds`), `verifications` 테이블(C5), 데이터모델(C6: `rejection_reviews`/`hard_gate`/hash 컬럼), `save_rejection_review`/`evaluate_offer`.
  - B-2는 B-1 출시·검증 후 착수. B-1이 B-2 없이도 독립적으로 가치를 낸다(지식 제공 + 라우팅 + 자가검증 안내).

아래 C1~C9의 각 항목에 **(B-1)** 또는 **(B-2)** 적용 단계를 표기한다.

## C1 — `@careermate/knowledge` 패키지 **(B-1)**

신규 단일 데이터-모듈 패키지(`shared`만 의존). 기존 `@careermate/workflows`·`@careermate/prompts` 패턴 차용(상속 아님). 내부 모듈:
- `experts.ts` — `EXPERTS: ExpertPlaybook[]` (16 도메인 플레이북). `WorkflowDefinition` extend 안 함.
- `verifiers.ts` — `VERIFIERS: Verifier[]` (6 검증기 + RubricCheck **데이터**; det 계산 *로직*은 B-2 `core`에).
- `lexicons.ts` — `SHARED_LEXICONS` (정량·키워드·슬롭 사전 단일 정본; `HUMANIZE_WRITING_GUIDE`를 슬롭 시드로 재사용). **원문 비공개 serve**(anti-gaming).
- `routes.ts` — `CAREER_ROUTES` (goal → expertSequence/verifierSequence/loop 데이터).

## C2 — RubricCheck.grade·DetSpec·det/ai 경계 **(데이터=B-1, 계산=B-2)**

```ts
type Grade = 'det' | 'ai' | 'mixed';   // 3값. 2값 금지.
interface RubricCheck {
  id: string; check: string; passBar: string; severity: 'soft' | 'hard';
  grade: Grade;
  detLogic?: DetSpec;     // serverComputed 전용
  aiPrompt?: string;      // aiExtractedInput 필요 부분
}
type DetSpec =            // 5종. (stat·set_preserve 금지)
  | { kind: 'pattern'; regex: string; exclude?: string[]; min?: number; max?: number }
  | { kind: 'count_threshold'; pattern: string; op: '>=' | '<='; threshold: number; minWords?: number }
  | { kind: 'keyword_coverage'; ratioAtLeast: number }
  | { kind: 'staleness'; field: string; maxMonths: number }
  | { kind: 'traceability' };
```
**det/ai 분리 정직성(Codex 반영 — det 사칭 차단):** 모든 검증 결과 필드는 `serverComputed`(CareerMate가 외부 입력 없이 완전 계산) 또는 `aiExtractedInput`(외부 AI가 의미추출해 주입한 값)으로 **출처 태깅**한다.
- `aiExtractedInput`이 한 방울이라도 섞인 값은 **절대 `det`/`hard`/게이트로 표기 금지.**
- 구체 금지 사례: `freshness_ratio`(recent-fact 매핑=ai), `proper_nouns`/`titles`/`credentials` 앵커를 자유텍스트에서 추출(=한국어 NER=ai). 이들은 `mixed`로 두고 det 부분(날짜 산술·집합 비교)만 `serverComputed`, 추출은 `aiExtractedInput`.
- `keyword_coverage`의 키워드 집합도 외부 AI 주입이므로, 커버리지 비율은 `serverComputed`지만 **그 입력이 ai라 hard 게이트로 승격 금지**.

## C3 — MCP 도구 레지스트리 (정본 이름·Phase·enum 고정)

폐기 이름(get_career_playbook, get_expert_playbook, get_jd_keywords, run_consistency_check, check_responsiveness, get_freshness_anchors, get_verifier_dictionaries, get_evaluation_metrics)은 **쓰지 않는다**.

### Phase B-1 (serve-only)
| 도구 | 종류 | 비고 |
|---|---|---|
| `get_workflow_guide` | **확장** | 마스터 라우터. `CAREER_ROUTES`로 expertSequence/verifierSequence/loop를 additive 반환. 기존 `workflow_id` enum은 그대로 유지하고 신규 `goal?`을 **추가 optional 입력**으로(둘 중 하나; 충돌 없음). 신규 라우터 도구 안 만듦 |
| `get_application_context` | **확장** | 응답에 `{recommended_route, verifier_sequence, next_tool}` 추가(C7 소비 강화 핵심). 스키마 변경 없음(반환 JSON만) |
| `get_playbook({ domain })` | 신규 serve | `domain` = 아래 **16 enum 고정** |
| `get_verifier({ id })` | 신규 serve | `id` = 아래 **6 enum 고정**. 루브릭 데이터만 serve(consistency·responsiveness 포함; det 계산은 B-2) |
| `get_fact_anchors({ scope })` | 신규 serve | 저장 데이터의 **구조화 필드**만 serve(자유텍스트 NER 아님). 추출은 외부 AI 몫 |
| `get_shared_lexicons` | 신규 serve | C1 lexicons.ts. 원문 비공개 |
| `get_writing_style_guide` | **기존 재사용** | human-writing 산문 가이드 정본 |

**`get_playbook` domain enum (16, 고정):** `resume`, `ats`, `cover-letter`, `interview-behavioral`, `interview-technical`, `company-research`, `human-writing`, `fit-matching`, `networking-referrals`, `salary-negotiation`, `linkedin-profile`, `portfolio`, `offer-evaluation-decision`, `recruiter-screen`, `onboarding-first-90-days`, `rejection-triage-iteration`. (표기 `linkedin-profile`로 통일 — `linkedin` 금지.)

**`get_verifier` id enum (6, 고정):** `truthfulness`, `ats-compat`, `human-voice`, `consistency`, `recency-staleness`, `responsiveness-on-target`. **`fit`은 검증기가 아니다**(도메인 `fit-matching`). `get_verifier({id:'fit'})` 금지.

### Phase B-2 (det·gate·persist — 후속)
`check_traceability`/`check_staleness`(det compute), `validate_*`(아래 C4 단서), `save_rejection_review`/`evaluate_offer`(C6 의존). **B-1 레지스트리엔 없다.**

## C4 — 게이트 강제력 **(B-1=게이트 0 / B-2=명시 게이트)**

- **(B-1) 검증 게이트 없음.** CareerMate는 산출물 저장을 막지 않는다. 외부 AI가 `get_verifier` 루브릭으로 **스스로** 자가검증한다. 기존 게이트만 유지: 전이 합법성=`assertStatusTransition`(`repositories.ts:751/762`), 능력 해금=`saveInterviewPrep` throw-before-persist(`services.ts:178`).
- **(B-2) save-time 게이트.** save 직전 재계산해 차단할 수 있는 체크는 **순수 `serverComputed`(외부 AI 주입 0)이고 `severity:'hard'`인 것만**. 그 명시 집합 = **`gateableCheckIds`**(B-2에서 열거; 현재 후보가 1~2개뿐임을 정직히 인정 → B-1은 게이트가 아니라 **"det lint + advisory"**라 부른다). `ai`/`mixed`-ai는 절대 차단 금지(자가신고 위조 불가 영역 = false-pass 명예 시스템). 예: 자소서 허위수치(truthfulness 핵심=ai)는 차단 불가 → 강한 넛지 + 기존 "이 수치 확인됨?" save 확인.
- **(B-2) `validate_*` 모순 해소(Codex CRITICAL 2):** `validate_*`는 **readOnly·무저장 미리보기**(`verifications` 적재·`activityRepo.log` **금지** — readOnly 힌트 진실 유지). 영속과 게이트는 **`save_*` 핸들러**가 담당(저장 직전 `gateableCheckIds` 재계산 → 위반 시 `fail()` → 통과 시 `verifications` 기록). 즉 "검증=readOnly preview / 강제·기록=save". 한 도구가 둘을 겸하지 않는다.

## C5 — 검증/평가 메타 영속 **(B-2)**

단일 정규화 테이블 **`verifications`**(소유=VERIFIERS.md). append-only. 컬럼(Codex MAJOR 4 — 실제 스키마 구체화):
```
id TEXT PK, artifact_type TEXT,             -- enum: resume|cover_letter|interview|linkedin|fit|...
artifact_id TEXT, artifact_content_hash TEXT,
resume_content_hash TEXT, jd_hash TEXT,     -- 사후 drift 감지
rubric_id TEXT,
computed_json TEXT,                          -- serverComputed det
ai_reported_json TEXT,                       -- 외부 AI 자기보고('미검증' 표식)
metrics_json TEXT,                           -- 평탄화 Record<string,number>(EVALUATION score 동거)
gate_status TEXT, checked_at TEXT
-- INDEX(artifact_type, artifact_id, checked_at DESC)  -- 최신 verification 조회
```
LOOP_ENGINE의 `verification_run` activity 로그는 **감사 보완**(대체 아님). EVALUATION의 score·gateStatus는 이 테이블에 저장(새 테이블 신설 금지).

## C6 — 데이터모델 정본 **(B-2, 소유=TODO.md)**

- `REJECTION_STAGES`(enums.ts) = `['pre_screen','recruiter_screen','aptitude_test','assignment','interview','final_fit','ghosted_pre','ghosted_post']` (Phase A rejection-triage 정본 8값).
- 신규 테이블 `rejection_reviews`: `job_id`(UNIQUE FK ON DELETE CASCADE), `stage`(enum), `external_factor?`, `perceived_reason?`, `feedback_received?`, `lessons`(JSON), `improvement_actions`(JSON), `reapply_eligible_after?`(YYYY-MM), `created_at`/`updated_at`.
- `ACTIVITY_TYPES` 추가 = `'rejection_reviewed'`, `'offer_evaluated'`, `'verification_run'`. `ENTITY_TYPES` 추가 = `'rejection_review'`, `'offer'`.
- hard-gate: 단수 `profile` 테이블(`schema.ts:14`)에 단일 `hard_gate` JSON TEXT 컬럼 1개. 공고별 knockout(fit-matching 도출 라벨)=`jobHardGate`(이름 구분, 위치 미정→ARCHITECTURE owner).
- 버전 신선도: `documents` 무버전 in-place → `resume_content_hash` + `jd_hash`(정규화 규칙 1개 통일이 선행).
- 마이그레이션: `MIGRATIONS` append-only·기존 문자열 불변·각 슬롯 `BEGIN/COMMIT`. 안전근거=`_meta.schema_version` 1회 게이트(`schema.ts:295-305`). ALTER ADD COLUMN 비멱등. 2-프로세스 동시 migrate 경합은 트랜잭션 가드.

## C7 — 소비 경로 정본 **(소유=CONSUMPTION.md)** — **강화(Codex MAJOR 3)**

pull+신뢰 모델은 description+AGENTS만으로는 약하다(AGENTS 안 읽는 클라이언트엔 Trigger2 무력). **가장 강한 기존 진입점에 박는다(B-1):**
1. **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입** — 외부 AI가 분석·작성 전 거의 항상 부르는 도구라 여기 라우트를 실으면 verifier 경로를 사실상 못 피한다(`tools.ts:443` 호출 강제 문구 + `:453` 넛지 전례).
2. **MCP server instructions(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가** — 현재는 `get_application_context`+저장만 강조하고 verifier 언급 없음. 서버 인스트럭션은 AGENTS를 안 읽는 클라이언트에도 전달된다.
3. 보조: 도구 description 트리거 문구 + `AGENTS.md`/`system.ts` #9(저장 전 자가검증, 충돌규칙 흡수, 별도 #10 금지; system.ts :48~:50 미러) + 도구 출력 💡 넛지.

실제 강제는 (B-2) `save_*` 게이트뿐. B-1은 "최대한 잘 보이는 신호등" + 자가검증 안내까지.

## C8 — 후속 Phase 이월

- **Phase B-2 전체**(det 엔진·게이트·verifications·데이터모델·save_*).
- CONSENSUS_ENGINE의 2차 det 동시위반 탐지(det가 XOR 충돌 변별 불가). B-1=`CANONICAL_OWNERSHIP` 데이터+타이브레이크 serve.
- EVALUATION의 10-metric 카탈로그+`get_evaluation_metrics`(B-1=score envelope 개념만, 실제 집계는 B-2 verifications 위에서).
- Phase A thin areas(비테크 면접·신입/국내 보상 등): carry-forward 백로그.

## C9 — 공유 정합 규칙 (모든 문서 §5는 이 절만 참조)

1. **structuredContent 객체 래핑** — `toCallToolResult`(result.ts:37)는 plain object에만 structuredContent를 싣고 배열 최상위는 누락(result.ts:42-43). serve/compute 반환을 객체로 감쌈.
2. **길이캡 상속** — 입력 본문 `MAX_BODY = 200_000`(schemas.ts:57) 상속(`optBody` 재사용).
3. **core 단일 진입점** — 신규 로직은 `@careermate/core`, web/mcp 공유. 핸들러는 core 호출 + `toCallToolResult`.
4. **zod 재사용** — 신규 입력 스키마는 기존 `.omit/.pick().shape` 재사용(add_resume:279 전례).
5. **본문 미누수** — 이력서/자소서 본문은 로그·에러 응답 노출 금지.
6. **정규식 안전** — 합성 정규식 모듈 로드 1회 컴파일·캐싱, 본문 길이캡 bound, 패턴 개수 상한.
7. **2-프로세스/WAL** — 신규 테이블/컬럼은 `getDb()→migrate()` 동시 호출에 안전(C6 트랜잭션). stdout=MCP 전송(로그 금지).
8. **openWorldHint=false** — 신규 도구도 외부 세계 접근 0. readOnly serve는 `readOnly:true`(그리고 진짜 무저장 — C4).

---

## 부록 — 정본 소유권 요약

| 영역 | 정본 문서 |
|---|---|
| Phase 분리·패키지·컴포넌트 맵 | ARCHITECTURE.md (C0·C1~C9) |
| 소비 경로·get_application_context 주입·AGENTS/system.ts/server-instructions 패치 | CONSUMPTION.md (C7) |
| 16 도메인·get_playbook·라우터 | EXPERTS.md (C3) |
| 6 검증기·det/ai 출처태깅·verifications 테이블(B-2)·SHARED_LEXICONS | VERIFIERS.md (C2·C5) |
| draft→verify→revise 루프·정지조건·B-1 자가검증 안내 | LOOP_ENGINE.md (C4) |
| 전문가 충돌·CANONICAL_OWNERSHIP | CONSENSUS_ENGINE.md (C8) |
| 품질 지표·score envelope | EVALUATION.md (C8) |
| 데이터모델·마이그레이션·Phase 시퀀싱 | TODO.md (C0·C6) |
| 도메인↔도구↔상태 레지스트리 | KNOWLEDGE.md (C3 동기화) |
