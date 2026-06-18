# 구현 로드맵·선행의존성 — CareerMate Career-OS (Phase B 설계)

> **횡단(cross-cutting) 결정은 [CONTRACT.md](CONTRACT.md)가 정본이다(충돌 시 우선).** 이 문서는 C6(데이터모델·마이그레이션·시퀀싱)의 소유 문서이며, 그 밖의 횡단 결정(도구명·게이트·grade·검증 영속)은 CONTRACT을 재정의하지 않고 참조한다.
>
> Career-OS 지식층의 **무엇을 먼저 만들고 무엇이 무엇에 막혀 있는가**를 위상정렬한 단일 시퀀싱 문서. **CareerMate 내부에는 LLM이 없다** — 지식은 `packages/knowledge`에 데이터로 저장되고 read-only MCP 도구로 serve되며, 검증 루브릭의 `det` 항목만 CareerMate가 LLM 없이 `core`에서 계산하고 의미판단(`ai`)은 외부 AI가 한다(두뇌=외부 AI, 저장·제공·결정론 계산=CareerMate). 이 문서는 **설계 문서만** 만든다 — 스키마·도구·마이그레이션·AGENTS.md 패치는 모두 **제안 스펙**이며 적용하지 않는다. 자매 문서: [ARCHITECTURE.md](./ARCHITECTURE.md)(패키지 레이어·컬럼 타입·repository 시그니처 owner), [VERIFIERS.md](./VERIFIERS.md), [LOOP_ENGINE.md](./LOOP_ENGINE.md), [CONSENSUS_ENGINE.md](./CONSENSUS_ENGINE.md). Phase A 지식 원본: [KNOWLEDGE.md](./KNOWLEDGE.md), [knowledge/](../knowledge/). 현행 아키텍처는 [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).

---

## 1. 목적·범위

### 설계하는 것
- **선행의존성 레지스트리**: `det` 루브릭이 "진짜 결정론"이 되기 위해 필요한 데이터모델 변경(정형 `hard_gate`, `rejection_reviews` 테이블+enum, 버전/신선도 추적 필드)을 "어느 루브릭이 어느 필드에 막혀 있는가" 의존 매트릭스로 명세.
- **Phase 위상정렬(B-1/B-2)**: 데이터 의존이 **없는** B-1(순수 지식 serve+기존 도구 확장+소비배선, 즉시 가치)과 데이터모델 마이그레이션을 **선행조건**으로 요구하는 B-2(`det` 계산·게이트·persist)를, "우선순위"가 아니라 "의존 그래프+출시 순서"로 분리한다(CONTRACT C0).
- **멱등 마이그레이션 정책**: `MIGRATIONS` 배열 append-only·기존 문자열 불변·`_meta.schema_version` 게이트·2-프로세스 부팅 동시성 안전 규칙.
- **소비경로 배선 체크리스트**: 3중 트리거(도구 description·AGENTS.md 패치·출력 넛지)를 어느 지점에 심는가, 그중 무엇이 "신규 도구 추가"이고 무엇이 "기존 코드 수정"인가.
- **carry-forward 백로그**: Phase A 완전성 비평이 식별한 thin area(비테크 면접·신입/공채 보상·측정불가 R4·timestamp 불안정 R8)를 "병목=지식/데이터 부재"로 후속 페이즈에 명시 격리.

### 설계하지 **않는** 것 (다른 owner)
- `ExpertPlaybook`/`Verifier`/`RubricCheck`/`DetSpec` 데이터 형태와 도구 description 전문 → [ARCHITECTURE.md](./ARCHITECTURE.md)·[VERIFIERS.md](./VERIFIERS.md)·EXPERTS(작성 예정).
- `det`/`ai` 등급 판정 로직·`DetSpec` 판별 union의 의미 → [VERIFIERS.md](./VERIFIERS.md).
- draft→verify→revise 루프 엔진·출력 넛지 체이닝 본문 → [LOOP_ENGINE.md](./LOOP_ENGINE.md)/[CONSENSUS_ENGINE.md](./CONSENSUS_ENGINE.md).
- **실제 코드 적용**. 이 문서의 스키마·도구·마이그레이션·AGENTS.md 패치는 모두 제안이다. `node:sqlite` 내부 LLM 비목표는 불변.

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### D1 — 4-웨이브 직렬화가 아니라 **2-페이즈(B-1 serve-only → B-2 det·gate·persist)**로 시퀀싱한다 (CONTRACT [C0](CONTRACT.md) 정본)
**결정.** CONTRACT C0대로 구현을 두 페이즈로 자른다(이 문서가 Phase 시퀀싱 owner). **Phase B-1(마이그레이션 0·게이트 0)**: `@careermate/knowledge` 패키지 부트스트랩 → 순수 지식 serve 도구(`get_playbook`·`get_verifier`·`get_fact_anchors`·`get_shared_lexicons`) + 기존 도구 확장(`get_workflow_guide` 마스터 라우터·`get_application_context`에 `{recommended_route, verifier_sequence, next_tool}` 주입) → 소비경로 배선(AGENTS.md/system.ts #9 + MCP server instructions). **Phase B-2(데이터 의존·마이그레이션 필요)**: 데이터모델 마이그레이션(`hard_gate`·`rejection_reviews`·신선도 해시 필드) → 그 위에서만 성립하는 `det` 계산(`check_traceability`·`check_staleness`·`validate_*`)·save-time 게이트(`gateableCheckIds`)·`verifications` 테이블·`save_rejection_review`/`evaluate_offer`. B-1과 B-2는 데이터 의존이 겹치지 않으나, **B-2는 B-1 출시·검증 후 착수**한다(C0: B-1이 B-2 없이도 독립적 가치 — 지식 제공+라우팅+자가검증 안내). B-2 임계경로는 `[데이터모델 → det → 게이트]` 단방향이다.

**rationale.** KNOWLEDGE.md §0이 "Phase B의 1급 산출물 = 소비 경로"라고 못박았고, `get_writing_style_guide`류 순수 serve 도구는 `core`/스키마 변경 없이 `tools.ts`에 `ToolDef` 추가만으로 동작한다(B-1). 반대로 §2/§4의 `det` 검증기는 정형 필드가 없으면 `[ai]`/H로 정직 강등될 수밖에 없으므로(recruiter-screen R3·R5·R9, recency C1·C3·C4) 마이그레이션이 **선행조건(의존)**이라 B-2로 이월한다. Codex 리뷰 핵심(C0): 순수 det+hard로 실제 save를 막을 수 있는 체크가 거의 없고(truthfulness critical 전부 ai), 마이그레이션 의존 det를 먼저 배선하면 빈 입력이 pass를 낸다 — 그래서 B-1은 **게이트 0(자가검증 안내만)**이고, 차단은 전부 B-2 `save_*` 게이트로 미룬다. "데이터 무변경 serve를 전부 먼저"라는 직렬 4단계는 과설계이며, 시퀀싱 문서가 의도한 "무엇이 무엇에 막혀 있는가"는 B-1/B-2 절단으로 표현할 때 더 정확하다.

**코드 근거.** `packages/mcp-tools/src/tools.ts:616-623`(`get_writing_style_guide`: `readOnly:true`, `inputSchema:{}`, `HUMANIZE_WRITING_GUIDE` 반환, `core` 무호출). KNOWLEDGE.md §0(1급 산출물=소비경로), §4(det 선행의존성이 코드에 "없음").

### D2 — 신규 스키마는 `MIGRATIONS` 배열에 **append-only**, 기존 문자열은 절대 불변. 안전성의 근거는 "CREATE IF NOT EXISTS 멱등"이 **아니라** "`_meta.schema_version` 게이트의 1회 실행"이다 **(B-2)**
**결정.** 모든 신규 변경은 `packages/db/src/schema.ts`의 `MIGRATIONS` 배열 **끝에 문자열 N건 append**로만 추가한다. 기존 문자열(v1·v2)은 절대 수정하지 않는다. 각 신규 문자열은 v2 관례를 따라 `PRAGMA foreign_keys=OFF; BEGIN; … COMMIT; PRAGMA foreign_keys=ON;`로 **한 트랜잭션** 안에 감싼다(부분 실패 시 자동 롤백, 버전 bump는 그 뒤에만 일어남).

**rationale(리뷰 반영 — 멱등성 주장 정정).** `migrate()`는 `from=schema_version`부터 `MIGRATIONS.length`까지 순차 `exec`하고, **모든 pending이 끝난 뒤 단 한 번** 버전을 bump한다(schema.ts:295-305). 따라서 안전성의 실제 근거는 "각 슬롯이 정확히 1회만 실행된다"는 **버전 게이트**이지, "CREATE TABLE IF NOT EXISTS의 멱등성"이 아니다. `ALTER TABLE ADD COLUMN`은 **멱등이 아니다** — 같은 문자열 재실행 시 `duplicate column` 에러다. 그래서 슬롯을 트랜잭션으로 감싸 부분 실패가 버전을 올리지 못하게 막아야 한다(v2가 이미 `BEGIN`을 쓰는 이유). 또한 한 `exec` 문자열 안에서 `ALTER ADD COLUMN` 직후 같은 트랜잭션에서 그 새 컬럼을 **참조하지 않는다**(prepared-statement 스키마 캐시 함정 회피) — DDL만 두고, 새 컬럼을 읽는 로직은 런타임 repository로 분리한다.

**코드 근거.** `schema.ts:288-307`(`migrate()`: `from=_meta.schema_version`, `for v=from..length exec`, 종료 후 `ON CONFLICT` 버전 1회 갱신). `schema.ts:178-285`(v2가 `BEGIN`/`COMMIT` 한 트랜잭션·`PRAGMA foreign_keys` 토글로 파괴적 rebuild를 안전화한 정본 패턴).

### D3 — 정형 hard-gate는 `profile`(단수)에 **단일 `hard_gate` JSON TEXT 컬럼** 1개로 추가한다 (4개 ALTER 아님) **(B-2)**
**결정.** `ALTER TABLE profile ADD COLUMN hard_gate TEXT NULL` 단 1건. 값은 `{ minYears?, visaStatus?, location?, salaryFloor? }` JSON. `core`가 `JSON.parse` 후 저장값 1:1 수치 비교(`salaryFloor >=`, `visaStatus` 일치)로 `det`을 돌린다. fit-matching의 "hardGate 라벨"(AI가 공고에서 도출)과 이름이 겹치므로, 저장 입력은 `profile.hard_gate`로 명명하고 `ApplicationContext`가 fit용 AI 라벨과 **구분해** 노출한다.

**rationale(리뷰 반영 — 테이블명·컬럼 수).** ① 실제 테이블명은 **단수 `profile`**이다(schema.ts:14 `CREATE TABLE IF NOT EXISTS profile`). `profiles`로 ALTER하면 `no such table`로 부팅이 깨진다. ② 4개 컬럼 ALTER 대신 1개 JSON 컬럼이면 비-멱등 ALTER가 4→1로 줄고(D2의 위험 표면 축소), `HardGateSchema` zod object와 1:1 매핑되며, `det` 비교는 `JSON.parse` 한 번으로 끝난다. ③ 현재 연봉·지역·근무형태는 `profile.desired_conditions` 단일 자유텍스트뿐이라 수치 비교가 불가능하고, 이 정형 필드가 recruiter-screen R3·R5의 `[ai]`/H를 `[det]` 수치비교로 승격시키는 **유일한** 선행조건이다(B-2 det 계산). **단, `profile`은 단일행 싱글톤(`profileRepo.get`에 id 없음)이라 "공고별 knockout 대조 요건"은 여기 살 수 없다** — 그 공고별 `jobHardGate`(fit-matching 도출 라벨, 이름 구분)는 jobs/applications 측 필드이며 **위치 미정→owner는 ARCHITECTURE**(CONTRACT [C6](CONTRACT.md), §6 R2).

**코드 근거.** `schema.ts:14`(`profile` 단수). recruiter-screen.md §3·§5(hard-gate 정형화는 Phase B 선행, 현재 `desired_conditions` 자유텍스트). 스파인 `conventionsToReuse`(shared zod 재사용).

### D4 — `rejection_reviews`는 FK를 **CREATE 시점에 포함한 신규 테이블**로 신설하고, 상태 변경은 `updateApplicationStatus`를 경유한다 **(B-2)**
**결정.** `CREATE TABLE IF NOT EXISTS rejection_reviews (… job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE …)`. `enums.ts`에 `REJECTION_STAGES`(8개)를 추가하고, `ACTIVITY_TYPES`에 `'rejection_reviewed'`·`'offer_evaluated'`·`'verification_run'`을, `ENTITY_TYPES`에 `'rejection_review'`·`'offer'`를 추가한다(CONTRACT C6). `external_factor`는 별도 enum이 아니라 `rejection_reviews`의 자유 TEXT 컬럼(C6 컬럼 목록)으로 둔다. `save_rejection_review`는 `applications.status`를 **직접 쓰지 않고**, status가 `rejected`로 바뀌어야 하면 `updateApplicationStatus`를 경유한다(active→draft 금지 불변 보존).

**rationale(리뷰 반영 — FK·ON DELETE·이중 로깅).** ① 신규 테이블이므로 FK를 CREATE 시점에 박을 수 있다(SQLite는 ALTER로 FK 추가 불가) — v2가 explicit `ON DELETE`를 단 것과 일관되게 `job_id`에 `ON DELETE CASCADE`를 명시한다(공고 삭제 시 리뷰도 정리). `UNIQUE(job_id)`가 건당 1리뷰를 보장한다. ② `updateApplicationStatus`는 항상 `activity_status_changed`를 로그하고 `interview_unlocked` 힌트를 계산해 반환하는데(services.ts:153-165), rejection 흐름에서 그 힌트(면접 준비 제안)는 부적절하다. **`saveRejectionReview` core fn은 status 전환이 필요할 때만 `updateApplicationStatus`를 호출하되, 그 반환 `hint`를 자기 출력 넛지에 흡수하지 않고 무시하고, 자신은 `rejection_reviewed` 1건만 로그한다** — 한 사용자 행동에 활동로그 2건이 남되 의미가 다르므로(상태변경 1 + 리뷰작성 1) 의도된 것이며, 부적절한 면접 힌트는 차단된다.

**코드 근거.** `enums.ts:67-91`(`ALLOWED_STATUS_TRANSITIONS`, `rejected`는 비종착이라 enum 변경 불필요·active→draft만 금지). `services.ts:145-168`(`updateApplicationStatus`가 `hint` 계산·`application_status_changed` 로그). rejection-triage-iteration.md §5(테이블·enum·도구 원형).

### D5 — 이력서 "버전" 추적은 존재하지 않는 `resume_version_id` 대신 **`resume_content_hash` + `jd_hash`**로 한다 **(B-2)**
**결정.** `fit_analyses`·`cover_letter_versions`에 `resume_content_hash TEXT NULL`·`jd_hash TEXT NULL`을 추가한다(CONTRACT C6: 두 해시 컬럼만, `resume_version_id`·별도 신선도 컬럼 금지). `check_staleness`는 저장된 `resume_content_hash`를 **현재 primary resume content의 정규화 해시**와 비교해 드리프트(C4)를 `det` 판정한다. 벤치마크 신선도(C1)는 별도 테이블을 신설하지 않고, 저장된 분석·자소서의 해시/날짜를 외부 AI 주입 컨텍스트와 대조하는 ai 환원으로 둔다(가짜 det 회피).

**rationale(리뷰 반영 — 죽은 컬럼 회피).** `documents`(이력서 저장처)에는 **버전 개념이 없다** — `documentRepo.update`는 in-place `UPDATE`(content 덮어쓰기)이고 `version_no`/버전이력 테이블이 없다(`cover_letter_versions`와 달리). 따라서 `resume_version_id`는 비교 대상(`latest_resume_version_id`)이 **절대 존재할 수 없는 죽은 컬럼**이며, recency C3/C4 `det` 게이트가 영구 판정불능이 된다. recency-staleness.md C3는 "resumeVersionId **OR** JD해시"라 했으므로, JD엔 `jd_hash`를, 이력서엔 **content hash**를 주면 대칭이 성립하고 "이력서 버전관리 서브시스템 신설"이라는 거대한 미명시 선행의존성을 회피한다. 해시 정규화 규칙(공백·대소문자·순서)은 **이력서·JD 공통 1개**로 통일한다(CONTRACT [C6](CONTRACT.md): "정규화 규칙 1개 통일이 선행") — 미정 시 동일 JD가 재저장만으로 다른 해시가 되어 C4 critical(즉시 불합격)이 오발동하므로, **이 정규화 합의는 open question이 아니라 B-2 진입 차단 선행조건**이다(§6 R3).

**코드 근거.** `schema.ts:69-79`(`documents` 무버전·in-place). `schema.ts:91-99`(`cover_letter_versions`만 `version_no` 보유 — 비대칭 확인). recency-staleness.md §2 C1·C3·C4·§5(freshness 메타).

### D6 — `det` 게이트의 정본은 `validate_*`가 아니라 **`save_*` 핸들러 안**이다 (advisory와 enforcement 분리) **(B-2)**
**결정.** **이 전 항목은 B-2다.** B-1에는 검증 게이트가 전혀 없다(CONTRACT [C0](CONTRACT.md)/[C4](CONTRACT.md): B-1=게이트 0, 외부 AI가 `get_verifier` 루브릭으로 **스스로** 자가검증, CareerMate는 아무것도 차단 안 함; 기존 `saveInterviewPrep` 상태게이트만 유지). B-2에서: `validate_*`/`check_staleness`/`check_traceability`는 `readOnly:true`인 **선택적 미리보기**(영속화 안 함, `verifications` 적재·`activityRepo.log` **금지** — readOnly 힌트 진실 유지, C4 CRITICAL 2)로 둔다. "저장 전 자가검증"의 **강제력 있는 정본**은 해당 `save_*` core fn 안에 둔다 — `save_cover_letter_version`/`save_fit_analysis`가 persist **직전** `gateableCheckIds`(C4에서 열거; **순수 `serverComputed`(외부 AI 주입 0)이고 `severity:'hard'`인 체크만**, 현재 후보 1~2개)를 재계산해 위반이면 `fail()`로 거절하고, 통과 시 `verifications`에 기록한다(C5). `ai`/`mixed`-ai 위반은 절대 차단 금지(자가신고 위조 불가 영역=명예 시스템) — 강한 넛지만. `det` 검증기는 단계(stage)를 게이트하지 않는다 — stage 게이트는 `status` enum(`INTERVIEW_UNLOCK_STATUSES`)이 담당하고, 검증기는 **산출물 저장**을 게이트한다.

**rationale(리뷰 반영 — 강제력 정직성).** `readOnly` `validate_*`는 영속화하지 않으므로 외부 AI가 `validate`를 건너뛰고 곧장 `save_*`를 호출하면 **막을 방법이 없다**. `saveInterviewPrep`의 status 게이트는 DB의 `application.status`를 서버가 읽어 강제하지만(services.ts:178), det 슬롭/키워드 위반은 "저장될 텍스트 자체"에 대한 판정이라 `save_*` 핸들러 안에서 다시 det를 돌리지 않으면 우회된다. 따라서 "validate_*가 게이트한다"는 서술은 강제력 없는 advisory를 강제처럼 포장한 것이다 — **게이트의 정본을 `save` 핸들러로 옮겨**(C4: "검증=readOnly preview / 강제·기록=save", 한 도구가 둘을 겸하지 않음) `saveInterviewPrep`식 진짜 서버 게이트와 동급으로 만들고, `validate_*`는 "AI가 저장 전 미리 보고 싶을 때의 미리보기"로 정직하게 격하한다. det만 core가 계산하고 ai는 절대 시뮬레이션하지 않는 분리는 유지된다.

**코드 근거.** `services.ts:172-186`(`saveInterviewPrep`: `!INTERVIEW_UNLOCK_STATUSES.includes(app.status)`면 persist 전 throw — 정본 서버 게이트). `result.ts:32`(`fail()`). 스파인 `statusGatingModel`(검증기는 산출물 저장 게이트, status는 단계 게이트).

### D7 — Phase A thin area는 코드로 끌어오지 않고 **carry-forward 백로그**로 격리한다 (CONTRACT C8)
**결정.** CONTRACT C8의 Phase B-1 보류 정책에 맞춰 다음을 후속 페이즈로 명시 이월한다: (1) **비테크 면접 트랙**(현재 interview-technical이 코딩 중심), (2) **신입/공채 보상**(offer-evaluation이 RSU·경력직 BATNA 중심), (3) **R4 측정불가**(회사 연봉테이블 데이터 부재→한국 내규 초과 self-knockout 판정 불가), (4) **R8 timestamp 불안정**(30일 윈도우 rejected 카운트의 앵커 부재), (5) **offer/rejection unlock status 집합 enum 미정의**. (C8의 다른 두 보류 — CONSENSUS 2차 det co-violation 탐지, EVALUATION 10-metric 카탈로그 — 는 각각 CONSENSUS_ENGINE·EVALUATION이 owner이며 본 문서 범위 밖이다.)

**rationale.** 이 항목들의 병목은 마이그레이션이 아니라 "지식·데이터 소스 부재"라 B-1/B-2 시퀀스로 풀리지 않는다. 명시 격리가 없으면 구현자가 RSU 모델을 신입 보상에 오적용하거나 측정불가 R4를 **가짜 det**로 채우는 게이밍이 발생한다. 특히 **R8**: `rejection_reviews.created_at`은 "리뷰 작성 시각"이지 "rejected 진입 시각"이 아니다 — 사용자가 한 달 뒤 3건을 몰아 리뷰하면 모두 같은 30일 윈도우에 잘못 집계된다. 안정 앵커가 되려면 status 변경 audit log가 필요하므로 R8을 carry-forward로 둔다(§6 R4).

**코드 근거.** recruiter-screen.md R4("측정 불가/H" 회사 연봉테이블 부재). rejection-triage-iteration.md R8(30일 윈도우는 `updated_at` 단일이라 카운트 불안정→H). offer-evaluation-decision.md §2(RSU=미국 빅테크 모델). KNOWLEDGE.md §5(16 도메인·6 검증기 경계).

---

## 3. 컴포넌트·책임·경계

| 컴포넌트 | 책임 | 경계(무엇에 의존 / 무엇이 아닌가) |
|---|---|---|
| **PhaseSequencing (B-1 / B-2)** | 두 페이즈의 의존 그래프와 각 단계의 진입/종료 조건 정의. **B-1**=지식 serve+기존 도구 확장+소비배선(마이그레이션 0·게이트 0), **B-2**=데이터모델→det→게이트→verifications→`save_*`(B-1 출시 후). | 순서·의존만. 개별 도구/스키마 내부 스펙은 ARCHITECTURE·VERIFIERS·EXPERTS owner. 코드 적용 안 함. CONTRACT C0 정본. |
| **DataModelPrerequisites (선행의존성 레지스트리) (B-2)** | det가 진짜 결정론이 되기 위한 3개 변경(`hard_gate`·`rejection_reviews`+enum·신선도 필드)을 "어느 루브릭이 어느 필드에 막혀 있는가" 매트릭스(§3.1)로 명세. | 필드 존재/형태와 의존 검증기만. det/ai 등급 로직은 VERIFIERS, 컬럼 타입 세부는 ARCHITECTURE owner. |
| **MigrationPlan (멱등 마이그레이션 정책) (B-2)** | append-only·불변·트랜잭션·`schema_version` 게이트·2-프로세스 부팅 안전(§4.1). 각 테이블/컬럼을 슬롯에 배치. | 메커니즘·안전 원칙만. SQL 적용은 범위 밖. repository 메서드 시그니처는 ARCHITECTURE owner. |
| **ConsumptionPathWiring (소비경로 배선) (B-1)** | 소비 신호를 가장 강한 진입점에 박는다 — `get_application_context` 응답 주입 + MCP server instructions + 보조 트리거(§4.4). 확장된 `get_workflow_guide`(마스터 라우터, C3)를 단일 진입점으로. | 배선 지점·순서만. 트리거 문구 원본은 EXPERTS/LOOP_ENGINE owner. AGENTS.md/system.ts는 제안 블록만(C7). |
| **CarryForwardBacklog (이월 목록)** | thin area를 "왜 빠지는가(병목=지식/데이터)"와 함께 후속 페이즈로 격리(§2 D7·§6). | 무엇을 미루는지·이유만. 후속 지식 작성·도구 구현은 범위 밖. 16도메인·6검증기 경계 불변. |

### 3.1 선행의존성 매트릭스 (어느 det 체크가 어느 필드에 막혀 있는가)

| det 체크 (verifier) | 막혀 있는 필드(선행) | 필드 없을 때 등급 | Phase |
|---|---|---|---|
| recruiter-screen R3 (salaryFloor 수치비교) | `profile.hard_gate.salaryFloor` | `[ai]`/H | B-2 |
| recruiter-screen R5 (visa/location 일치) | `profile.hard_gate.visaStatus/location` | `[ai]`/H | B-2 |
| recruiter-screen R9 (minYears) | `profile.hard_gate.minYears` | `[ai]`/H | B-2 |
| recency C1 (벤치마크 staleness) | 벤치마크 신선도 데이터(**부재** — 별도 테이블 신설 안 함, C6) | ai 환원 | carry-forward |
| recency C3 (provenance) | `fit_analyses.jd_hash` + `resume_content_hash` | 게이트 FAIL | B-2 |
| recency C4 (버전 드리프트) | `resume_content_hash` + `jd_hash` (정규화 규칙 합의 필수) | 판정불능 | B-2 |
| rejection R1 (탈락 단계 분류) | `rejection_reviews.stage` (enum) | notes 토큰매칭(false positive) | B-2 |
| recruiter-screen R4 (내규 초과) | 회사 연봉테이블 데이터 (**부재**) | 측정불가/H | **carry-forward** |
| rejection R8 (30일 카운트) | status 변경 audit log (**부재**) | H | **carry-forward** |

`[ai]`/H 항목은 정직하게 외부 AI에 환원한다 — **가짜 det로 채우지 않는다**(KNOWLEDGE.md §2 no-internal-LLM).

---

## 4. 구체 스펙

### 4.1 멱등 마이그레이션 슬롯 (B-2)

`packages/db/src/schema.ts`의 `MIGRATIONS` 배열 끝에 **제안 슬롯 3건**을 append한다. 기존 v1·v2 문자열은 불변. 각 슬롯은 v2 관례대로 한 트랜잭션.

- **`[+v3]` `profile.hard_gate`**: `BEGIN; ALTER TABLE profile ADD COLUMN hard_gate TEXT NULL; COMMIT;`
- **`[+v4]` `rejection_reviews`**: `BEGIN; CREATE TABLE IF NOT EXISTS rejection_reviews ( id TEXT PRIMARY KEY, job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE, stage TEXT NOT NULL, external_factor TEXT, perceived_reason TEXT, feedback_received TEXT, lessons TEXT /*JSON*/, improvement_actions TEXT /*JSON*/, reapply_eligible_after TEXT /*YYYY-MM*/, created_at TEXT NOT NULL, updated_at TEXT NOT NULL ); CREATE INDEX IF NOT EXISTS idx_rr_job ON rejection_reviews(job_id); COMMIT;`
- **`[+v5]` 신선도 해시 필드**(CONTRACT C6: 두 해시 컬럼만, `captured_at`·별도 벤치마크 테이블 신설 안 함): `BEGIN; ALTER TABLE fit_analyses ADD COLUMN resume_content_hash TEXT; ALTER TABLE fit_analyses ADD COLUMN jd_hash TEXT; ALTER TABLE cover_letter_versions ADD COLUMN resume_content_hash TEXT; ALTER TABLE cover_letter_versions ADD COLUMN jd_hash TEXT; COMMIT;`

부팅 시 `getDb()→migrate()`가 `from=schema_version`부터 자동 실행. `ALTER ADD COLUMN`은 비-멱등이므로 버전 게이트가 1회만 보장한다(D2). **2-프로세스 동시성**: web+MCP가 동시에 `migrate()`를 돌릴 수 있다 — 슬롯 진입 시 `BEGIN IMMEDIATE`로 쓰기 락을 선점해 한쪽만 ALTER하고 다른 쪽은 락 해제 후 이미-올라간 버전을 보고 skip하도록 한다(§6 R1, owner=ARCHITECTURE).

산출물 freshness 메타 규약(모든 신선도 `save_*` 공유): `{ ratio, stale_count, version: { resumeContentHash, jobId|jdHash }, checked_at, as_of }`.

### 4.2 enum 변경 (`packages/shared/src/enums.ts`) **(B-2)**
```ts
export const REJECTION_STAGES = ['pre_screen','recruiter_screen','aptitude_test','assignment','interview','final_fit','ghosted_pre','ghosted_post'] as const;
// ACTIVITY_TYPES 에 'rejection_reviewed','offer_evaluated','verification_run' 추가 (CONTRACT C6).
// ENTITY_TYPES 에 'rejection_review','offer' 추가 (CONTRACT C6).
// external_factor 는 rejection_reviews 의 자유 TEXT 컬럼이지 enum 아님(C6).
// ALLOWED_STATUS_TRANSITIONS 변경 없음(rejected 는 이미 비종착, enums.ts:74).
```

### 4.3 MCP 도구 계약 (대표 5종 — `ToolDef`, `tools.ts`의 `TOOLS` 배열에 append). **Phase 열로 B-1/B-2 명시(CONTRACT [C0](CONTRACT.md)/[C3](CONTRACT.md)).**

| 도구 | Phase | shape | inputSchema(zod) | description 트리거(앞문장) | output / readOnly |
|---|---|---|---|---|---|
| **`get_workflow_guide`** (확장 — 마스터 라우터, CONTRACT C3) | **B-1** | 기존 도구 확장 | 기존 `workflow_id` enum 유지 + 신규 `{ goal?: z.enum([...]).describe(...) }` 추가 optional(둘 중 하나·충돌 없음) | "어떤 커리어 작업을 시작하기 직전에 호출하세요…" (기존 get_workflow_guide 패턴 확장) | `CAREER_ROUTES`에서 `{expertSequence, verifierSequence, loop}`를 additive 반환. 신규 라우터 도구 안 만듦. `core` 무호출. `readOnly:true`. 출력 넛지로 시퀀스 첫 도구 가리킴(보조 트리거). |
| **`get_playbook({ domain })`** (신규 serve, C3) | **B-1** | 순수 serve | `{ domain: z.enum([...16도메인 — `linkedin-profile`로 통일, `linkedin` 단독 금지]) }` | "해당 커리어 도메인의 작성·판단 원칙을 받고 싶을 때 호출하세요…" | 16 도메인 단일 디스패처(도메인별 도구 금지). `EXPERTS`에서 `{playbook}` 반환. `core` 무호출. `readOnly:true`. |
| **미리보기 compute (validate_\* / `check_traceability`)** | **B-2** | read-only compute | `{ job_id: z.string().optional(), text: z.string() }` / `{ artifact_id }` | "저장 전 자기소개서를 미리 점검하고 싶을 때 호출하세요(선택)…" | core가 `DetSpec`만 결정론 실행(pattern 슬롭/클리셰, count_threshold 밀도, keyword_coverage JD, traceability=`check_traceability`가 N_total·placeholder_delta만). per-check `serverComputed` pass/fail+잔여 `aiExtractedInput` 프롬프트 반환. **영속화 안 함**(`verifications` 적재·`activityRepo.log` 금지), **게이트 아님**(D6·C4). `readOnly:true`. |
| **`save_rejection_review`** (mutating) | **B-2** | mutating | `RejectionReviewInputSchema.shape`(신규 shared zod: `job_id`, `stage: z.enum(REJECTION_STAGES)`, `external_factor?`, `perceived_reason?`, `feedback_received?`, `lessons?`, `improvement_actions?`, `reapply_eligible_after?`) | "지원이 불합격으로 끝났을 때 다음 지원에 환류할 회고를 남기려면 호출하세요…" | core `saveRejectionReview()`: `rejection_reviews` UPSERT(job_id UNIQUE)+`activityRepo.log('rejection_reviewed')`. status 전환 시 `updateApplicationStatus` 경유(hint 흡수 안 함, D4). 출력 넛지→`get_rejection_patterns`. **readOnly 없음.** |
| **`check_staleness`** (신규 compute, C3) | **B-2** | read-only compute | `{ artifact_id: z.string(), now: z.string().optional() }` | "저장된 분석·자소서가 아직 최신인지 점검하고 싶을 때 호출하세요…" | core `computeStaleness()`: 날짜비교·해시대조 det 부분은 `serverComputed`(저장된 `resume_content_hash`/`jd_hash`를 현재 primary 정규화 해시와 대조, C4 버전 드리프트). `freshness_ratio`(recent-fact 매핑=ai)·벤치마크 신선도(C1)·C2·C6·C8은 `aiExtractedInput`으로 환원(C2: det 사칭 금지). `readOnly:true`. |

**게이트의 정본**(D6·C4, **B-2**): `save_cover_letter_version`/`save_fit_analysis` 핸들러는 persist 직전 `gateableCheckIds`(순수 `serverComputed`·`severity:'hard'`만)를 재실행해 위반이면 `fail()`, 통과 시 `verifications` 기록 — 이게 강제력이고, `validate_*`는 미리보기다. **B-1에는 이 게이트가 없다**(자가검증 안내만). 모든 도구 `openWorldHint=false`(apps/mcp 등록에서 전역, `readOnlyHint`는 `ToolDef.readOnly`에서).

### 4.4 소비경로 배선 — 가장 강한 진입점에 박는다 (**B-1**, CONTRACT [C7](CONTRACT.md) 강화)
C7 v2(Codex MAJOR 3): pull+신뢰 모델은 description+AGENTS만으로는 약하다(AGENTS 안 읽는 클라이언트엔 트리거 무력). 따라서 **가장 강한 기존 진입점에 신호를 박는다**. owner=CONSUMPTION이며 본 문서는 배선 지점·"신규 추가 vs 기존 수정" 구분만 남긴다.
1. **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입**(C7 핵심) — 외부 AI가 분석·작성 전 거의 항상 부르는 도구(tools.ts:443 호출 강제 문구·:453 넛지 전례)라 verifier 경로를 사실상 못 피한다. 스키마 변경 없음(반환 JSON만) = **기존 `tools.ts` 수정**(신규 도구 추가 아님).
2. **MCP server instructions(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가** — AGENTS를 안 읽는 클라이언트에도 전달된다.
3. **보조 트리거** — 신규 도구 description 문구 + AGENTS.md/system.ts #9(제안 패치 블록만, §4.5) + 도구 출력 💡 넛지. (신규 도구의 description·넛지는 신규 추가의 일부, 기존 `get_application_context`·`updateApplicationStatus` 넛지 추가는 기존 `tools.ts` 수정.)

실제 강제(차단)는 **B-2 `save_*` 게이트뿐**이다. B-1은 "최대한 잘 보이는 신호등"+자가검증 안내까지이고, 본 Phase B는 위 전부를 **제안 스펙**으로만 둔다(실제 적용은 후속).

### 4.5 AGENTS.md 제안 패치 블록 (#9 저장 전 자가검증 — **실제 수정 금지**, **B-1**, owner=CONSUMPTION C7)
CONTRACT C7대로 신규 원칙 **#9 "저장 전 관련 루브릭으로 자가검증" 1개만** 추가하고, 기존 `get_writing_style_guide` 불릿(AGENTS.md:18)을 이 안으로 접어 **총 불릿 수 불변**(CONSENSUS 충돌 규칙도 #9 본문에 흡수, 별도 #10 안 만듦):

> - **산출물을 저장하기 전, 당신이 해당 도메인 플레이북으로 작성하고 verifier로 자가검증하라.** 어떤 커리어 작업이든 `get_workflow_guide`로 적용할 전문 도메인·검증기 순서를 먼저 받고, 저장(`save_*`) 직전 당신이 직접 점검한다(CareerMate는 셀 수 있는 항목만 계산해 돕고, 판단은 당신이 한다).

`get_workflow_guide`(확장된 마스터 라우터) **하나만** 명명(도메인 디스패처 `get_playbook`·per-tool 20+개는 description에 위임, AGENTS.md의 "기술 용어 비노출" 규칙 존중). `prompts/system.ts`의 `CAREERMATE_SYSTEM_PROMPT`에 동일 `#9 저장 전 자가검증`을 본문(:48 종료 후)·요약(:50) 사이에 미러링(두 정본 드리프트 방지, C7).

---

## 5. 기존 아키텍처·코드와의 정합

공유 보일러플레이트(structuredContent 객체 래핑·길이캡 상속·core 단일진입점·zod 재사용·본문 미누수·정규식 안전·2-프로세스/WAL·openWorldHint=false)는 **재서술하지 않는다 → [CONTRACT.md](CONTRACT.md) §C9 참조.** 아래는 이 문서(C6 데이터모델·마이그레이션·시퀀싱) **고유의** 정합 포인트만 남긴다.

- **멱등 마이그레이션 게이트(C6 정본)**: append-only·기존 문자열 불변·각 슬롯 `BEGIN/COMMIT`·`_meta.schema_version` 1회 게이트(D2)는 `migrate()`(schema.ts:288-307) 동작과 정확히 일치. 안전근거는 "CREATE IF NOT EXISTS 멱등"이 아니라 버전 게이트이며 `ALTER ADD COLUMN`은 비멱등이다. FK가 필요한 변경은 v2처럼 신규 테이블 CREATE 시점에 박는다(SQLite ALTER FK 불가). 2-프로세스 동시 `migrate()` 경합은 C9-7대로 트랜잭션으로 가드(`BEGIN IMMEDIATE`+버전 게이트, owner=ARCHITECTURE).
- **서버측 게이팅(C4 정본 재사용, B-2)**: 신규 `save_*`는 `saveInterviewPrep`(services.ts:178)의 throw-before-persist를 복제하고, status 전환은 `updateApplicationStatus`→`setStatus` 한 경로만 경유해 `assertStatusTransition`(repositories.ts:751/762, active→draft 금지) 불변을 보존(raw UPDATE 금지). 검증 게이트는 **`gateableCheckIds`(순수 `serverComputed`(외부 AI 주입 0)+`severity:'hard'`)**만 persist 직전 재계산해 거부하고, `ai`/`mixed`-ai는 차단 않고 넛지(C2·C4). **B-1에는 이 게이트가 없다**(자가검증 안내만). 모든 mutation은 `activityRepo.log`로 `list_recent_activity`/대시보드에 반영하고, 검증 메타는 정규화 `verifications` 테이블에 append(C5, owner=VERIFIERS; `validate_*` 미리보기는 적재 금지).

---

## 6. 미해결 질문 / 리스크

- **R1 (B-2 메커니즘, owner=ARCHITECTURE).** 2-프로세스 동시 `migrate()` 시 `ALTER ADD COLUMN` 경합. `BEGIN IMMEDIATE`+버전 CAS로 한쪽만 실행하게 막는 정확한 패턴 — schema.ts의 `migrate()` 시그니처를 바꿔야 하는지.
- **R2 (hard_gate 위치, owner=ARCHITECTURE).** `profile`(단일행 싱글톤)은 지원자 **전역** 조건만 담는다. 공고별 knockout 대조 요건(job별)은 `profile`에 살 수 없으므로 jobs/applications 측 정형 필드가 추가로 필요할 수 있다 — 양쪽 owner 결정 필요.
- **R3 (B-2 진입 차단 선행).** `jd_hash`/`resume_content_hash` **정규화 규칙**(공백·대소문자·순서) 미합의 시 C4가 동일 입력을 다르게 판정해 critical 오발동→무의미 재분석 루프. open question이 아니라 B-2 `det` 진입 전 **합의 필수**(이력서·JD 공통 1규칙).
- **R4 (carry-forward 의존).** R8 30일 카운트의 안정 앵커는 `rejection_reviews.created_at`(=리뷰 작성 시각)으로 **불충분**하다(rejected 진입 시각 아님). 신뢰 가능 det에는 status 변경 audit log 테이블(추가 슬롯 1건)이 필요 — 현재 carry-forward로 분류, 후속 페이즈에서 재검토.
- **R5 (정본 이중화 일관성).** `get_shared_lexicons`(KNOWLEDGE §3 단일 정본)가 `HUMANIZE_WRITING_GUIDE`(prompts)를 seed로 흡수하기 전까지는 슬롭 사전 정본이 **둘**(prompts+knowledge)이다. `get_writing_style_guide`를 깨지 않으면서 prompts→knowledge 이전을 B-1의 어느 시점에 할지, prompts 패키지 의존을 어떻게 정리할지.
- **R6 (라우터 — CONTRACT C3에서 결정됨).** 신규 라우터 도구를 만들지 않고 **기존 `get_workflow_guide`를 확장**해 `CAREER_ROUTES`로 `expertSequence`·`verifierSequence`·`loop`를 additive 반환한다(도구 1개로 수렴, 두 진입점 공존 회피). 남은 owner=EXPERTS 결정은 goal enum이 기존 5 표준 워크플로우와 1:1인가 확장인가의 데이터 범위뿐.
- **R7 (carry-forward).** offer/rejection 도구의 unlock status 집합(`INTERVIEW_UNLOCK_STATUSES`에 상응하는 `OFFER_UNLOCK_STATUSES` 등)이 enum에 미정의. 복수 오퍼 비교는 `final_passed` 없이도 생길 수 있어 단순 매핑이 안 됨.

---

## 7. 관련 문서 (cross-links)

- [KNOWLEDGE.md](./KNOWLEDGE.md) §0(소비경로 3트리거+draft-verify-revise), §2(det/ai 정직 분리), §3(`get_shared_lexicons` 정본), §4(데이터모델 선행의존성 4건), §5(16 도메인·6 검증기 경계)
- [ARCHITECTURE.md](./ARCHITECTURE.md) — `@careermate/knowledge` 레이어·컬럼 타입·repository 시그니처·2-프로세스 migrate 동시성 owner; 본 문서는 시퀀싱만
- [VERIFIERS.md](./VERIFIERS.md) — `RubricCheck` det/ai 등급(`serverComputed`/`aiExtractedInput` 출처태깅)·`DetSpec` 판별 union·6 검증기 owner; B-2 det 계산이 의존
- [LOOP_ENGINE.md](./LOOP_ENGINE.md) / [CONSENSUS_ENGINE.md](./CONSENSUS_ENGINE.md) — draft→verify→revise 루프·B-1 자가검증 안내·출력 넛지 체이닝 owner; B-1 배선 참조
- EXPERTS.md (작성 예정) — `ExpertPlaybook` 데이터·`get_playbook` description 전문 owner; B-1 serve가 소비
- [knowledge/recruiter-screen.md](../knowledge/recruiter-screen.md) §3·§5 — hard-gate 정형 선행·R3/R4/R5/R9 원형
- [knowledge/rejection-triage-iteration.md](../knowledge/rejection-triage-iteration.md) §5 — `rejection_reviews`·`REJECTION_STAGES`·`save_rejection_review`/`get_rejection_patterns`·R8 원형
- [knowledge/offer-evaluation-decision.md](../knowledge/offer-evaluation-decision.md) §2·§5 — RSU/BATNA 모델·신입 보상 carry-forward 근거
- [knowledge/verifiers/recency-staleness.md](../knowledge/verifiers/recency-staleness.md) §2·§5 — 신선도 필드·`check_staleness`·freshness 메타 규약·C3/C4
- [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md) §2/§3.1/§3.2/§8 (현행) — 레이어 규칙·migrate at boot·openWorldHint=false·`@careermate/*` 별칭
- 코드 앵커: `enums.ts:48·67-91` · `core/services.ts:145-186` · `mcp-tools/result.ts:18-49` · `mcp-tools/tools.ts:443·453·591·616` · `db/schema.ts:14·178-285·288-307`
