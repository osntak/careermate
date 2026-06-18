# 전문가 시스템 (16 도메인) — CareerMate Career-OS (Phase B 설계)

> **횡단 결정은 [CONTRACT.md](CONTRACT.md)가 정본(충돌 시 우선)** — 도구명·grade 타입·게이트·enum·테이블·**Phase 분리(C0)**는 CONTRACT C0~C9를 따른다.
>
> **Phase 분리(CONTRACT C0)**: 본 문서의 산출물은 두 단계로 나뉜다. **(B-1) serve-only**(마이그레이션 0·게이트 0): `get_playbook` serve + `get_workflow_guide` 확장(마스터 라우터) + `get_application_context` 응답 주입(C7). **(B-2) det·gate·persist**(마이그레이션 필요·B-1 출시 후): `rejection_reviews`/`hard_gate` 데이터모델·`REJECTION_STAGES` enum·`save_rejection_review`/`evaluate_offer`/`get_rejection_patterns` 단계 도구. 아래 각 절·스펙에 **(B-1)**/**(B-2)**를 표기한다.
>
> 16개 커리어 전문 도메인의 플레이북(원칙·Do·Don't·Before→After)을 **playbook-as-data**로 `@careermate/knowledge`에 컴파일하고, 단일 `get_playbook({domain})` serve 도구 + `get_workflow_guide` 확장(마스터 라우터)으로 외부 AI에 제공한다. **CareerMate 내부에는 LLM이 없다.** 플레이북은 작성 *판단*을 외부 AI가 하도록 serve하는 지식일 뿐이고, 검증 *계산*(det)은 형제 문서 [VERIFIERS.md](VERIFIERS.md)가 소유한다. 이 문서는 **설계(제안 스펙)** 만 만든다 — 코드·스키마·마이그레이션은 적용하지 않으며, AGENTS.md는 "제안 패치 블록"으로만 보여준다.
>
> Phase A 지식: 도메인 16종 [knowledge/](../knowledge/) (resume·ats·cover-letter·interview-behavioral·interview-technical·company-research·human-writing·fit-matching·networking-referrals·salary-negotiation·linkedin-profile·portfolio·offer-evaluation-decision·recruiter-screen·onboarding-first-90-days·rejection-triage-iteration) · 인덱스 [KNOWLEDGE.md](KNOWLEDGE.md). 현행 아키텍처: [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).
>
> **형제 문서 정합 주의**: 검증기·`SHARED_LEXICONS`·`DetSpec`·det compute 도구(`check_*`/`validate_*`)·`verifications` 테이블은 모두 [VERIFIERS.md](VERIFIERS.md) 소유다. 본 문서는 그 결정을 **재발명하지 않고 참조**한다(§2 결정 6, §6 R1). 이 문서가 새로 소유하는 것은 **플레이북·마스터 라우터·선행 데이터모델(`rejection_reviews`/`hardGate`)** 뿐이다.

---

## 1. 목적·범위

### 설계하는 것

- **(B-1) playbook-as-data 스키마**: `@careermate/knowledge`의 `EXPERT_PLAYBOOKS: ExpertPlaybook[]`. `WorkflowDefinition`(definitions.ts:9-20)의 데이터모듈 패턴을 따르되 `steps[]`(절차)가 아니라 `principles`/`dos`/`donts`/`beforeAfter`(판단)를 담는다.
- **(B-1) 단일 serve 도구 + 마스터 라우터**: `get_playbook({ domain })`(16값 z.enum, `get_workflow_guide` 패턴) + `get_workflow_guide` **확장**(목표→도메인·검증기·루프 순서를 `CAREER_ROUTES`로 additive 반환; 기존 `workflow_id` enum 유지 + 신규 `goal?` additive optional). 신규 라우터 도구를 만들지 않고 기존 `get_workflow_guide`를 확장한다(CONTRACT C3). 도메인마다 별도 도구 16개를 만들지 **않는다**(§2 결정 1).
- **(B-1) `get_application_context` 응답 주입(C7 소비 강화 핵심)**: 외부 AI가 분석·작성 전 거의 항상 부르는 `get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}`을 additive로 실어 verifier 경로를 사실상 못 피하게 한다(스키마 변경 없음, 반환 JSON만; CONTRACT C7). 정본 소유=CONSUMPTION.md, 본 문서는 플레이북/라우트 쪽 입력만 제공.
- **(B-1) 플레이북→검증기 참조**: `ExpertPlaybook.verifierIds: VerifierId[]` + `lexiconRefs: string[]`. 검증기/사전 *정의*는 VERIFIERS.md 소유, 본 문서는 **참조만** 한다(§4.5 매핑 표가 1급 산출물).
- **(B-2) 선행 데이터모델(제안)**: `rejection-triage`의 `rejection_reviews` 테이블 + `REJECTION_STAGES` enum, `recruiter-screen`의 정형 `hardGate` 필드. VERIFIERS.md §6 R5가 본 문서로 위임한 항목이다. **마이그레이션 의존이라 B-1엔 없고 B-2에서 착수**(CONTRACT C0).
- **(B-2) 오퍼/탈락 단계 도구**: `save_rejection_review`/`get_rejection_patterns`/`evaluate_offer`의 계약과 **상태 게이팅 정합**(§2 결정 4). 데이터모델 의존이라 B-2(CONTRACT C0·C3 "B-1 레지스트리엔 없다").
- **(B-1) 소비 경로 3중 트리거** 배선(description / AGENTS.md 제안 패치 / 출력 넛지) — VERIFIERS.md(CONSUMPTION.md 소유 C7)와 동일 모델, 플레이북 쪽 진입점만. 실제 강제(save-time 게이트)는 B-2 몫이며 B-1은 게이트 0(자가검증 안내).

### 설계하지 않는 것 (명시적 비범위)

- **검증기·`DetSpec`·`SHARED_LEXICONS`·det compute(`check_*`/`validate_*`)·`verifications` 테이블**. 전부 [VERIFIERS.md](VERIFIERS.md) 소유. 본 문서는 `verifierIds`/`lexiconRefs`로 **참조만** 한다(중복 정의 금지 — KNOWLEDGE.md §3 정본 소유권 규칙).
- **코드 구현·실제 마이그레이션 적용**. 모든 스키마·도구·enum·테이블은 "제안 스펙"이다.
- **AGENTS.md / system.ts 실제 수정**. §4.6의 "제안 패치 블록"으로만 보여준다.
- **보상 벤치마크 데이터모델**(`compensation_benchmarks`)과 **draft→verify→revise 루프의 닫힘**: 전자는 salary-negotiation 라인, 후자는 [LOOP_ENGINE.md](LOOP_ENGINE.md)(작성 예정) 소관. 본 문서는 진입점만 설계한다.

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### 결정 1 — 도메인마다 도구 16개가 아니라 `get_playbook({domain})` 단일 serve 도구 1개 + 마스터 라우터

16 도메인을 `EXPERT_PLAYBOOKS: ExpertPlaybook[]`로 컴파일하고, **하나의** `get_playbook({ domain })`이 `domain` z.enum(16값)으로 라우팅해 serve한다. `get_workflow_guide`가 이미 정확히 이 "1-도구-N-항목" 패턴(`workflow_id` optional z.enum)이다.

- **근거(리뷰 simplerAlternative 반영)**: 16개 개별 도구는 (a) 단일 `TOOLS` 배열을 비대하게 만들고(외부 AI의 선택 표면↑ = 오라우팅↑), (b) description 16개를 각각 트리거 문구로 유지보수해야 하며, (c) MCP 도구 목록 토큰을 16배로 늘린다. 1개 enum 도구면 "신호등"이 더 또렷하고 유지보수가 1곳이다. 마스터 라우터(`get_workflow_guide` 확장)가 *goal*로 진입점을 잡고, `get_playbook`이 *domain*으로 본문을 serve하는 2-도구 체계로 충분하다(신규 라우터 도구 미생성, CONTRACT C3).
- **코드**: tools.ts:591-612 `get_workflow_guide`(`workflow_id` optional enum, 생략 시 목록 반환). tools.ts:616-623 `get_writing_style_guide`(readOnly:true, 코어 호출 없는 순수 serve — `get_playbook`/`get_workflow_guide`(확장) 핸들러 템플릿). definitions.ts:9-20 데이터모듈 패턴.
- **KNOWLEDGE.md §1 정합**: 표는 도메인별로 `get_resume_playbook` 등 이름을 *열거*하지만, 이는 "어떤 지식이 있는가"의 레지스트리 표기이지 "도구를 N개 만든다"는 계약이 아니다. 실제 표면은 `get_playbook({domain})` 단일 도구이며, `domain` enum 값이 그 16개 이름을 흡수한다(예: `domain:'resume'`). KNOWLEDGE.md §1의 `get_writing_style_guide(확장)` 표기처럼 human-writing 도메인은 **신규 도구 없이** 기존 `get_writing_style_guide`를 유지한다(아래 결정 3).

### 결정 2 — `ExpertPlaybook`은 `WorkflowDefinition`을 extend하지 않고 **분리 유지**한다

플레이북은 `WorkflowDefinition`(절차 `steps[]`)을 상속하지 않는다. 두 개념은 책임이 다르다: `@careermate/workflows`는 *순서*(steps), `@careermate/knowledge`는 *판단*(principles/dos/donts). `ExpertPlaybook`은 `WorkflowDefinition.trigger`의 **자연어 트리거 관례만** 차용한다.

- **근거(리뷰 simplerAlternative 반영)**: 한 인터페이스로 묶으면 `get_workflow_guide`와 `get_playbook`의 반환이 섞여, KNOWLEDGE.md §0의 "단계 리스트 중복 금지" 원칙과 충돌한다. 단계는 workflows가, 원칙은 knowledge가 단독 소유해야 소비 경로가 깨끗하다.
- **코드**: definitions.ts:16-17 `trigger`("when to start" 자연어) — 이 필드 *관례*만 재사용. `steps`(definitions.ts:18-19)는 재사용하지 않음.

### 결정 3 — human-writing(도메인)과 human-voice(검증기)의 정본 소유권을 못박는다: `HUMANIZE_WRITING_GUIDE`는 한 곳만 소유

`HUMANIZE_WRITING_GUIDE`(`@careermate/prompts`)의 정본 소유권을 다음으로 확정한다(리뷰 mustFix·openQuestion 해소):

- **slop/hype/cliché/filler 사전 항목** → `SHARED_LEXICONS`의 시드(VERIFIERS.md §4.2 소유). human-voice 검증기와 resume/ats/cover-letter가 `lexiconRefs`로 공유.
- **글쓰기 작성 규칙(산문)** → 기존 `get_writing_style_guide`(tools.ts:616-623)가 `HUMANIZE_WRITING_GUIDE`를 **그대로 계속 serve**. human-writing 도메인은 **신규 플레이북 본문을 만들지 않고** 이 도구를 정본으로 가리킨다(`EXPERT_PLAYBOOKS`의 human-writing 항목은 `principles` 대신 "get_writing_style_guide 참조" 포인터 + `verifierIds:['human-voice']`만 보유).
- 즉 **한 자산이 두 주인을 섬기지 않는다**: 사전 추출본은 VERIFIERS가, 산문 가이드는 `get_writing_style_guide`가 소유하고, EXPERTS는 양쪽을 *참조*만 한다.

- **근거(리뷰 inconsistentWithCodebase 반영)**: `HUMANIZE_WRITING_GUIDE`는 `get_writing_style_guide` 핸들러(tools.ts:622)와 `CAREERMATE_SYSTEM_PROMPT` 합성(prompts) 양쪽에서 쓰인다. knowledge 패키지로 자산을 *이식*하면 prompts↔knowledge 이중 소유가 생기므로, **이식하지 않고 참조**한다 — `get_writing_style_guide`는 그대로, 사전은 `HUMANIZE_WRITING_GUIDE`에서 *추출*(복제가 아니라 파생 시드)해 `SHARED_LEXICONS`로 정규화한다.
- **코드**: tools.ts:616-623 `get_writing_style_guide`; prompts/system.ts:11 `CAREERMATE_SYSTEM_PROMPT`(잔존 사용처).

### 결정 4 — (B-2) 오퍼/탈락 단계 `save_*`는 `applications.status`를 직접 쓰지 않고 `updateApplicationStatus`(→ `setStatus`) 경유

`save_rejection_review`가 상태 변경(예: `rejected` 진입)을 함의하면, 반드시 `updateApplicationStatus`를 거친다. 전이 합법성 강제 지점은 `applicationRepo.setStatus`/`upsert`(repositories.ts:762/751)의 `assertStatusTransition`이며, **`services.ts`가 아니다**(VERIFIERS.md 결정 4와 동일 사실 — 공유 스파인 `codeFactsConfirmed[0]` 정정).

- **근거(리뷰 missing 반영)**: 코드 정밀 확인 결과 `updateApplicationStatus`(services.ts:145-168)는 `assertStatusTransition`을 **호출하지 않는다** — 실제 강제는 repositories.ts:762(`setStatus`)·:751(`upsert`)이다. `rejected`는 `ALLOWED_STATUS_TRANSITIONS`상 모든 active 상태에서 도달 가능(enums.ts:68-75 확인)하므로 전이 자체는 합법이지만, `save_rejection_review`가 status를 직접 쓰면 active→draft 금지 불변식(enums.ts:61-63)을 우회할 여지가 생긴다. → 상태변경은 단일 경로(`updateApplicationStatus`→`setStatus`)로 강제.
- **`hardGate`/`rejection_reviews`는 게이팅 메커니즘을 새로 만들지 않는다**: `evaluate_offer`/`save_rejection_review`가 단계 게이트가 필요하면 `saveInterviewPrep`(services.ts:172-186)와 **동일한 throw-before-persist** 패턴(상태셋 검사 후 한국어 에러 throw)을 따른다. 새 제어 흐름이 아니라 검증된 패턴 복제다.
- **코드**: repositories.ts:751/762 `assertStatusTransition`(강제); services.ts:145-168 `updateApplicationStatus`(assert 0건); :172-186 `saveInterviewPrep`(throw-before-persist 템플릿); enums.ts:48/67-91.

### 결정 5 — (B-2) 선행 데이터모델은 별도 테이블 CREATE로 두고 ALTER를 피한다 (멱등성 정정)

`rejection_reviews`는 **별도 `CREATE TABLE IF NOT EXISTS` 1건**으로 둔다. `hardGate`는 `profile`에 컬럼 ALTER가 아니라 가능하면 구조화 JSON 컬럼 1개(`hard_gate TEXT`) 또는 별도 보관으로 둔다.

- **근거(리뷰 missing 반영)**: "`CREATE TABLE IF NOT EXISTS`/`ALTER`가 멱등이라 안전"은 **오해**다. `ALTER ADD COLUMN`은 재실행 시 duplicate column 에러로 멱등하지 않다. 안전한 진짜 이유는 `migrate()`(schema.ts:295)가 `_meta.schema_version` 게이트로 각 마이그레이션을 *정확히 한 번만* 실행하기 때문이다. 그래도 ALTER 남발은 부분-적용·롤백 취약을 키우므로, 신규 정형 데이터는 CREATE TABLE로 흡수한다(VERIFIERS.md §4.6 `verifications` 테이블과 동일 전략).
- **det 의존 순서 명시(리뷰 missing 반영)**: `recency-staleness`/`traceability` det가 "진짜 결정론"이 되려면 `resumeVersionId`/`captured_at` 추적과 `rejection_reviews`/`hardGate` 정형 필드가 *선행*해야 한다(KNOWLEDGE.md §4). 데이터모델 없이 det 도구만 serve하면 빈 입력이 거짓 `pass`를 낸다. → **Phase B-2 내부 슬라이싱(CONTRACT C0)**: ① 선행 데이터모델(본 문서 제안 마이그레이션) → ② 그 위에서만 det `pass`가 의미를 갖는다. (det 엔진·게이트 자체가 B-2이고, B-1은 데이터모델·det 없이 serve+라우팅+자가검증 안내만 한다.) 이 의존을 §6 R3에 박는다.
- **코드**: schema.ts:288-307 `migrate()`(MIGRATIONS append + schema_version 게이트, BEGIN/COMMIT 래핑 :283).

### 결정 6 — 검증기·사전의 정의는 VERIFIERS.md 소유, EXPERTS는 참조만 (패키지 내부 모듈 경계)

`@careermate/knowledge`는 한 패키지 안에 두 데이터 모듈을 가진다: `experts.ts`(본 문서 소유: `EXPERT_PLAYBOOKS`, `CAREER_ROUTES`) 와 `verifiers.ts`/`lexicons.ts`(VERIFIERS.md 소유: `VERIFIERS`, `SHARED_LEXICONS`). `ExpertPlaybook.verifierIds`/`lexiconRefs`는 **id 문자열 참조**일 뿐, 검증기/사전 객체를 정의하지 않는다.

- **근거(리뷰 inconsistentWithCodebase 반영)**: 같은 패키지 안 모듈이라도 소유권은 갈린다 — `lexicons.ts`/`verifiers.ts`를 VERIFIERS.md가, `experts.ts`/`routes.ts`를 EXPERTS.md가 소유한다. EXPERTS가 components에 "lexicons 소유"를 적으면 형제 문서와 모순되므로, 본 문서 §3은 명시적으로 **참조-only**라고 적는다.
- **코드 근거**: KNOWLEDGE.md §3(line 67) 공유 사전 정본 = 신규 공유 모듈 1곳. VERIFIERS.md §4.1/§4.2가 그 모듈을 이미 정의.

### 결정 7 — 목록·라우터 반환은 반드시 plain object로 감싼다 (structuredContent gotcha)

`get_playbook`(목록)·`get_workflow_guide`(확장 라우터)의 반환 `data`는 배열을 최상위로 넘기지 않고 `{ playbooks: [...] }`/`{ route: {...} }`처럼 **객체로 감싼다**(→ CONTRACT §C9.1).

- **근거(리뷰 mustFix 반영)**: result.ts:42-43은 `data`가 plain object일 때만 `structuredContent`로 노출하고 **배열이면 누락**해 ```json 텍스트 블록으로만 전달한다. `get_workflow_guide`(tools.ts:607-610)는 실제로 `WORKFLOWS.map(...)` 배열을 최상위로 반환 — 즉 마스터 라우터가 이 패턴을 그대로 베끼면 "외부 AI가 structuredContent로 읽는다"는 소비 가정이 깨진다. 따라서 라우터/목록 반환은 객체 래핑을 강제한다(VERIFIERS.md §4.3과 동일).
- **코드**: result.ts:37-48 `toCallToolResult`(isPlainObject 분기 :42-43).

---

## 3. 컴포넌트·책임·경계

### 3.1 `EXPERT_PLAYBOOKS` 데이터 모듈 (`@careermate/knowledge/src/experts.ts`)

- **무엇**: 16개 `ExpertPlaybook`을 `interface` + `export const EXPERT_PLAYBOOKS: ExpertPlaybook[]`로 정의. `getPlaybook(domain)`/`renderPlaybookMarkdown(domain)` 헬퍼는 `getWorkflow`/`renderWorkflowMarkdown`를 그대로 미러.
- **어떻게**: `get_playbook` 도구가 domain별로 serve. `verifierIds`/`lexiconRefs`는 id 문자열로 VERIFIERS 모듈을 가리킴(참조-only).
- **의존**: `shared`만(ARCHITECTURE.md §2/§8). NO LLM, NO 런타임 fetch, NO core. 산출물을 읽거나 변경하지 않음(serve 전용).

### 3.2 `CAREER_ROUTES` 마스터 라우터 데이터 (`@careermate/knowledge/src/routes.ts`)

- **무엇**: `goal`(공고분석/자소서/면접준비/오퍼결정/탈락환류 등) → `{ expertSequence: domain[], verifierSequence: VerifierId[], loop? }`. `get_workflow_guide` 확장(마스터 라우터)이 `CAREER_ROUTES`를 additive 반환(CONTRACT C3).
- **경계**: 순서를 *반환*만 한다(실행은 외부 AI). `verifierSequence`는 VERIFIERS.md의 `VerifierId`만 참조. 단계 절차는 `@careermate/workflows`에 위임(중복 금지, 결정 2).

### 3.3 검증기·사전 모듈 (참조-only 경계)

- **무엇**: `verifiers.ts`(`VERIFIERS`)·`lexicons.ts`(`SHARED_LEXICONS`)는 **VERIFIERS.md가 소유**. 본 문서의 `ExpertPlaybook`은 이 둘을 id로 참조할 뿐 정의하지 않음(결정 6).
- **경계**: EXPERTS는 사전 *내용*을 작성하지 않는다. 단, human-writing 도메인 시드(slop/hype/cliché)는 `HUMANIZE_WRITING_GUIDE`에서 파생됨을 §4.2(VERIFIERS) 주석에 명시(결정 3).

### 3.4 (B-2) 선행 데이터모델 (`rejection_reviews` 테이블 + `hardGate` + 단계 도구 core fn)

- **무엇**: `rejection_reviews`(탈락 단계·사유·다음 액션) + `REJECTION_STAGES` enum + `profile.hard_gate`(정형 최소조건). `save_rejection_review`/`get_rejection_patterns`/`evaluate_offer`의 core fn이 read/write.
- **경계(리뷰 missing 반영)**: 상태변경 함의 시 `updateApplicationStatus`(→ `setStatus`) 경유, 직접 `applications.status` 쓰기 금지(결정 4). 단계 게이트가 필요하면 `saveInterviewPrep` throw-before-persist 패턴 복제. mutation 후 `activityRepo.log`(services.ts:153/185 패턴). 핸들러는 thin — core fn이 게이트·persist 담당.

### 3.5 (B-1) 소비 경로 배선 (get_application_context 주입 + description + AGENTS.md 제안 패치 + 출력 넛지 + master router)

- **무엇**: 외부 AI를 "작성 전 플레이북, 저장 전 자가검증" 경로로 유도. **가장 강한 진입점=`get_application_context` 응답 주입**(C7 1순위): 응답에 `{recommended_route, verifier_sequence, next_tool}`을 additive로 실어, 분석·작성 전 거의 항상 부르는 도구에 라우트를 박는다(tools.ts:443 호출 강제 문구·:453 넛지 전례). 그 위에 3중 트리거: `get_playbook`/`get_workflow_guide`(확장) description이 "…직전에 호출하세요"로 시작; 라우터 출력이 `verifierSequence`의 첫 검증기를 💡로 넛지; AGENTS.md는 master router(`get_workflow_guide`)만 명명. 정본 소유=CONSUMPTION.md(C7), 본 문서는 플레이북/라우트 입력만 제공.
- **경계**: pull+신뢰(B-1 게이트 0, 강제 아님 — 실제 강제는 B-2 `save_*` 게이트). AGENTS.md는 trigger #2라 `get_workflow_guide`만 명명, 세부 도메인/검증기명은 description(trigger #1)에 위임(AGENTS.md:39-40 "기술 용어 노출 최소화"). 절차 단계 리스트도 동일 `get_workflow_guide`가 소유(확장이지 대체가 아님, CONTRACT C3). AGENTS.md 실제 수정 안 함(제안 블록만).
- **기존 넛지 정합(리뷰 inconsistentWithCodebase 반영)**: 현재 `get_application_context` 넛지(tools.ts:453)는 `get_writing_style_guide`만 가리킨다. C7 주입은 *기존 넛지를 바꾸지 않고* 응답 JSON에 `{recommended_route, verifier_sequence, next_tool}`을 **추가**하고, `get_workflow_guide`(확장) 출력에 **새 넛지를 추가**해 다음 검증기를 가리킨다(체인이 이미 작동하는 척하지 않음 — §4.6 제안 패치에 명시).

---

## 4. 구체 스펙

> 모두 **제안 스펙**이며 Phase B에서 적용하지 않는다.

### 4.1 (B-1) `ExpertPlaybook` / `CareerGoalRoute` 데이터 스키마

> `ExpertDomain` 16값은 [CONTRACT.md](CONTRACT.md) C3 `get_playbook` domain enum 정본과 1:1(표기 `linkedin-profile`로 통일, `linkedin` 단독 금지). `VerifierId`는 CONTRACT C3 6값 정본(`fit`은 검증기 아님) 참조.

`packages/knowledge/src/experts.ts`:

```ts
export type ExpertDomain =
  | 'resume' | 'ats' | 'cover-letter' | 'interview-behavioral' | 'interview-technical'
  | 'company-research' | 'human-writing' | 'fit-matching' | 'networking-referrals'
  | 'salary-negotiation' | 'linkedin-profile' | 'portfolio'
  | 'offer-evaluation-decision' | 'recruiter-screen' | 'onboarding-first-90-days'
  | 'rejection-triage-iteration';

export interface ExpertPlaybook {
  domain: ExpertDomain;
  title: string;               // 한국어 표시명
  description: string;
  trigger: string;             // WorkflowDefinition.trigger 관례 차용(definitions.ts:16)
  principles: string[];
  dos: string[];
  donts: string[];
  beforeAfter: { before: string; after: string }[];
  verifierIds: VerifierId[];   // VERIFIERS.md 소유 id 참조(참조-only, 결정 6)
  lexiconRefs: string[];       // SHARED_LEXICONS id 참조(참조-only)
  /** human-writing처럼 기존 도구가 정본이면 여기로 위임(결정 3). */
  servedBy?: 'get_writing_style_guide';
  sources?: { tier: '1차' | '2차' | '벤더'; ref: string }[];
}

export interface CareerGoalRoute {
  goal: string;                          // 'analyze_job' | 'write_cover_letter' | 'prepare_interview' | 'evaluate_offer' | 'rejection_iteration' | ...
  statusContext?: ApplicationStatus;     // shared/enums.ts ApplicationStatus
  expertSequence: ExpertDomain[];
  verifierSequence: VerifierId[];        // VERIFIERS.md 소유 id
  loop?: 'draft_verify_revise';
}

export const EXPERT_PLAYBOOKS: ExpertPlaybook[];
export const CAREER_ROUTES: CareerGoalRoute[];
export function getPlaybook(domain: ExpertDomain): ExpertPlaybook | undefined;
export function renderPlaybookMarkdown(domain: ExpertDomain): string | undefined;
export function getRoute(goal: string): CareerGoalRoute | undefined;
```

예시:

```ts
// resume 도메인
{ domain: 'resume', title: '이력서', trigger: '사용자가 이력서를 새로 쓰거나 고치려 할 때.',
  principles: ['성과는 행동+결과+수치로', '직무 키워드를 자연스럽게 반영', ...],
  dos: ['STAR 구조로 bullet 작성', ...], donts: ['책임 나열만 하지 말 것', ...],
  beforeAfter: [{ before: '여러 업무를 담당함', after: 'X를 도입해 Y를 32% 단축(3개월)' }],
  verifierIds: ['truthfulness', 'ats-compat', 'human-voice'],
  lexiconRefs: ['slop-ko', 'quant_pattern'] }

// human-writing 도메인 — 신규 본문 없이 기존 도구로 위임(결정 3)
{ domain: 'human-writing', title: '사람이 쓴 듯한 글', trigger: '자소서·자기PR·지원메일 작성 직전.',
  principles: [], dos: [], donts: [], beforeAfter: [],
  servedBy: 'get_writing_style_guide',
  verifierIds: ['human-voice'], lexiconRefs: ['slop-ko', 'slop-en', 'cliche-ko', 'hype', 'filler-ko'] }
```

### 4.2 (B-1) `get_playbook` (MCP 도구, 단일 serve)

`packages/mcp-tools/src/tools.ts`의 `TOOLS` 배열에 append.

| 필드 | 값 |
| --- | --- |
| `name` | `get_playbook` |
| `title` | `전문 도메인 플레이북` |
| `readOnly` | `true` |
| `inputSchema` | `{ domain: z.enum(['resume','ats','cover-letter','interview-behavioral','interview-technical','company-research','human-writing','fit-matching','networking-referrals','salary-negotiation','linkedin-profile','portfolio','offer-evaluation-decision','recruiter-screen','onboarding-first-90-days','rejection-triage-iteration']).optional() }` |
| `description` (트리거#1) | `'이력서·자소서·면접 답변 등 커리어 산출물을 작성하기 직전에 호출하세요. 해당 전문 도메인의 작성 원칙·Do·Don't·Before→After 예시와, 저장 전 적용할 검증기 목록을 돌려줍니다. 판단·작성은 당신이 하고, CareerMate는 지식을 제공할 뿐입니다. 작성 후 해당 검증기로 자가검증한 뒤 save_*로 저장하세요. domain을 생략하면 16개 도메인 목록을 돌려줍니다. (어떤 도메인을 어떤 순서로 적용할지는 get_workflow_guide가 알려줍니다.)'` |
| `handler` | `domain`이면 `ok(renderPlaybookMarkdown(domain), { playbook })`(단, `servedBy`면 "get_writing_style_guide 참조" 안내 + 넛지); 생략 시 `ok('전문 도메인 16개', { playbooks: EXPERT_PLAYBOOKS.map(p => ({domain, title, trigger})) })`. **코어 호출 없음**(get_writing_style_guide 패턴, tools.ts:622). |

> **structuredContent 주의(결정 7)**: 목록은 배열 최상위가 아니라 `{ playbooks: [...] }`로 감싼다(result.ts:42-43, 아래 라우터 동일).

### 4.3 (B-1) `get_workflow_guide` 확장 (MCP 도구, 마스터 라우터)

CONTRACT C3: **신규 라우터 도구를 만들지 않고** 기존 `get_workflow_guide`(tools.ts:591)를 확장해 `CAREER_ROUTES`(expertSequence/verifierSequence/loop)를 **additive**로 반환한다. 기존 `workflow_id` enum과 절차-단계 반환(`WorkflowDefinition`)은 **그대로 유지**하고, 신규 `goal?`을 추가 optional 입력으로 받아 route 정보만 같은 출력 객체에 덧붙인다(둘 중 하나; 충돌 없음).

| 필드 | 값 |
| --- | --- |
| `name` | `get_workflow_guide` (기존, **확장**) |
| `title` | `워크플로우 가이드` (기존) |
| `readOnly` | `true` |
| `inputSchema` | 기존 `{ workflow_id?: z.enum(...) }`에 `goal?: z.enum(['analyze_job','write_cover_letter','prepare_interview','recruiter_screen','evaluate_offer','rejection_iteration','networking','onboarding_90d'])` **추가**(둘 다 optional, additive) |
| `description` (트리거#1) | `'커리어 작업을 시작할 때 가장 먼저 호출하세요. 표준 워크플로우의 절차 단계와 함께, goal(공고 분석·자소서 작성·면접 준비·오퍼 결정·탈락 환류 등)을 주면 어떤 전문 도메인을 어떤 순서로 적용하고 저장 전 어떤 검증기로 자가검증할지, 작성→검증→수정 루프를 돌릴지를 돌려줍니다. 세부 지식은 get_playbook으로, 검증 루브릭은 get_verifier로 당겨쓰세요.'` |
| `handler` | `goal`이면 기존 반환에 `{ route: getRoute(goal) }` 추가(💡 `route.verifierSequence[0]` 넛지 포함); `goal` 생략 시 기존 워크플로우 목록 + `{ routes: CAREER_ROUTES.map(r => ({goal, expertSequence})) }`. **코어 호출 없음**. |

> 확장이지 대체가 아니다 — 절차 단계와 지식 순서를 **동일 도구**가 반환한다(CONTRACT C3, 별도 라우터 도구 미생성). 지식 본문은 `get_playbook({domain})`이 serve.

### 4.3b (B-1) `get_application_context` 응답 주입 (C7 소비 강화)

CONTRACT C7 1순위: 정본 소유=CONSUMPTION.md지만, 본 문서가 제공하는 플레이북/라우트가 그 입력이므로 계약을 명시한다. `get_application_context`(tools.ts:443) 응답 JSON에 **스키마 변경 없이** 다음을 additive로 주입한다.

| 필드 | 값 |
| --- | --- |
| `recommended_route` | 맥락(대상 공고·상태)에서 도출한 `CAREER_ROUTES` 항목(`goal`/`expertSequence`/`verifierSequence`/`loop`) |
| `verifier_sequence` | `route.verifierSequence`(저장 전 자가검증 순서) — VERIFIERS.md 소유 `VerifierId` 참조 |
| `next_tool` | 다음에 부를 도구 힌트(예: `get_playbook` 또는 `get_workflow_guide`) |

> 외부 AI가 분석·작성 전 거의 항상 부르는 도구라, 여기 라우트를 실으면 verifier 경로를 사실상 못 피한다(`tools.ts:443` 호출 강제 문구 + `:453` 기존 넛지 전례 유지). 객체 래핑 유지(결정 7, result.ts:42-43). **B-1 게이트 0** — 이 주입은 강제가 아니라 "가장 잘 보이는 신호등"이다.

### 4.4 (B-2) 단계 도구 (`save_rejection_review` / `get_rejection_patterns` / `evaluate_offer`)

> CONTRACT C0·C3: 이 세 도구는 데이터모델(§4.6 `rejection_reviews`/`hard_gate`) 의존이라 **B-2**이며 **B-1 레지스트리엔 없다**.

핸들러는 thin — core fn 호출 + ok/fail. 상태변경은 `updateApplicationStatus` 경유(결정 4).

```
save_rejection_review            (mutating; readOnly 없음)   // CONTRACT C3·C6
  inputSchema: { job_id: z.string(), stage: z.enum(REJECTION_STAGES),     // C6 8값 enum
                 external_factor: z.string().optional(), perceived_reason: z.string().optional(),
                 feedback_received: z.string().optional(),
                 lessons: z.array(z.string()).optional(),
                 improvement_actions: z.array(z.string()).optional(),
                 reapply_eligible_after: z.string().optional() }   // YYYY-MM; 새 zod → packages/shared/src/schemas.ts
  core: rejection_reviews 에 upsert(job_id UNIQUE FK ON DELETE CASCADE) + activityRepo.log('rejection_reviewed').
        rejected 상태 함의 시 updateApplicationStatus(job_id,'rejected') 경유(직접 status write 금지).
  description(트리거#1): '불합격 통보를 받았을 때 호출하세요. 어느 단계에서 왜 떨어졌는지·받은 피드백·배운 점·
                          개선 액션·재지원 가능 시점을 기록합니다. 다음 지원에서 같은 실수를 피하도록
                          get_rejection_patterns로 환류됩니다.'

get_rejection_patterns           (readOnly: true)
  inputSchema: {}
  core: 전 rejection_reviews cross-tab(KNOWLEDGE.md §4 — get_application_context의 10건 cap·동일회사 한계를 보완).
  output: { by_stage: Record<string, number>, recurring_reasons: [...], reviews: [...] }   // 객체 래핑(결정 7)

evaluate_offer                   (mutating)   // CONTRACT C3 (정본=offer-evaluation-decision)
  inputSchema: { job_id: z.string(), scorecard: <가중 스코어카드 zod> }
  게이트: offer 단계(예: final_passed) 검사 후 throw-before-persist(saveInterviewPrep 패턴, services.ts:178).
  core: offer-evaluation-decision 정본(KNOWLEDGE.md §3) 스코어카드 저장 + activityRepo.log('offer_evaluated').
```

> `REJECTION_STAGES` enum은 `packages/shared/src/enums.ts`에, 입력 스키마는 `packages/shared/src/schemas.ts`에 둔다(리뷰 inconsistentWithCodebase 반영 — enum과 schema 파일 분리). `DocumentInputSchema` 길이캡 상속 트릭(tools.ts:279-282)을 자유텍스트 필드에 재사용.

### 4.5 플레이북 → 검증기 / 사전 매핑 (1급 산출물)

KNOWLEDGE.md §1 표의 "어떤 도메인이 어떤 검증기를 가리키는가"를 못박는다. `ExpertPlaybook.verifierIds`/`lexiconRefs`의 정본 매핑(`VerifierId`/사전 id는 VERIFIERS.md 소유, 여기선 참조):

| 도메인 | `verifierIds` | `lexiconRefs` (대표) |
| --- | --- | --- |
| resume | truthfulness, ats-compat, human-voice | slop-ko, quant_pattern |
| ats | ats-compat, truthfulness | ats_keyword, quant_pattern |
| cover-letter | truthfulness, responsiveness-on-target, human-voice, consistency | slop-ko, cliche-ko, hype, filler-ko |
| interview-behavioral | truthfulness, consistency, human-voice | filler-ko |
| interview-technical | truthfulness, consistency | quant_pattern |
| company-research | recency-staleness, truthfulness | temporal_pattern |
| human-writing | human-voice | slop-ko, slop-en, cliche-ko, hype, filler-ko |
| fit-matching | truthfulness, responsiveness-on-target, ats-compat | ats_keyword, quant_pattern |
| networking-referrals | human-voice, truthfulness | cliche-ko, filler-ko |
| salary-negotiation | recency-staleness, truthfulness | quant_pattern, temporal_pattern |
| linkedin-profile | consistency, ats-compat, human-voice | slop-en, ats_keyword |
| portfolio | truthfulness, human-voice | quant_pattern |
| offer-evaluation-decision | recency-staleness, consistency | temporal_pattern |
| recruiter-screen | responsiveness-on-target, truthfulness, ats-compat | ats_keyword |
| onboarding-first-90-days | consistency | — |
| rejection-triage-iteration | consistency, recency-staleness | temporal_pattern |

> 이 표가 "플레이북이 verifier를 가리킨다"를 검증 가능한 1:1 매핑으로 고정한다(리뷰 missing 반영). 검증기 6종·사전 id·각 체크의 `grade`(`'det'|'ai'|'mixed'` 3값, CONTRACT C2)의 *정의*는 [VERIFIERS.md](VERIFIERS.md) §4.1/§4.2 소유 — 본 표는 참조다. `consistency`(고유명사 보존=NER)·`human-voice`(문장길이 burstiness) 같은 의미판단 체크는 C2상 `grade:'mixed'`/`'ai'`이며 **det로 사칭하지 않는다**(detLogic=셀 수 있는 부분, aiPrompt=의미 부분). 따라서 이들 verifier는 저장을 차단하지 않고 advise만 한다(CONTRACT C4).

### 4.6 (B-2) `rejection_reviews` 테이블 + `REJECTION_STAGES` enum (제안 마이그레이션)

`packages/db/src/schema.ts`의 `MIGRATIONS` 배열에 **append**(forward-only/idempotent — `migrate()`가 `_meta.schema_version` 게이트로 정확히 한 번만 실행, schema.ts:288-307):

```sql
-- 새 마이그레이션 문자열 1건 (BEGIN/COMMIT 으로 감쌈, schema.ts:283 패턴). 컬럼=CONTRACT C6.
CREATE TABLE IF NOT EXISTS rejection_reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE
    REFERENCES jobs(id) ON DELETE CASCADE,  -- 공고 1건당 1 리뷰 (UNIQUE FK ON DELETE CASCADE)
  stage TEXT NOT NULL,                   -- REJECTION_STAGES enum(8값) 값
  external_factor TEXT,
  perceived_reason TEXT,
  feedback_received TEXT,
  lessons TEXT NOT NULL DEFAULT '[]',           -- JSON 배열
  improvement_actions TEXT NOT NULL DEFAULT '[]', -- JSON 배열
  reapply_eligible_after TEXT,                  -- YYYY-MM
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- hardGate: profile(단수 테이블, schema.ts:14)에 단일 hard_gate JSON 컬럼 1개(4 ALTER 아님).
-- ALTER ADD COLUMN 은 재실행 비멱등이나, schema_version 게이트로 1회 보장됨(결정 5)
ALTER TABLE profile ADD COLUMN hard_gate TEXT NOT NULL DEFAULT '{}';
```

```ts
// packages/shared/src/enums.ts — CONTRACT C6 정본(Phase A rejection-triage와 일치)
export const REJECTION_STAGES = [
  'pre_screen', 'recruiter_screen', 'aptitude_test', 'assignment',
  'interview', 'final_fit', 'ghosted_pre', 'ghosted_post',
] as const;

// ACTIVITY_TYPES 추가 = 'rejection_reviewed', 'offer_evaluated', 'verification_run'
// ENTITY_TYPES   추가 = 'rejection_review', 'offer'
```

> **멱등성 정정(리뷰 missing 반영)**: `ALTER ADD COLUMN`은 재실행 시 duplicate column으로 멱등하지 않다. 안전한 이유는 `migrate()`(schema.ts:295)의 `schema_version` 게이트가 마이그레이션을 *정확히 한 번만* 실행하기 때문이다. 그래서 본 설계는 신규 정형 데이터를 가급적 `CREATE TABLE IF NOT EXISTS`로 두고(`rejection_reviews`), `hard_gate`만 부득이 ALTER 1건으로 추가한다. 문자열은 `BEGIN; … COMMIT;`로 감싼다.

### 4.7 (B-1) AGENTS.md 제안 패치 블록 (실제 수정 금지)

규칙 리스트(AGENTS.md:15 부근)에 **1불릿 추가**하고, 기존 `get_writing_style_guide` 불릿(AGENTS.md:18)을 이 안으로 접어 **총 개수 불변**:

CONSUMPTION.md(C7) 소유 — 본 문서는 플레이북 쪽 진입점만 제안한다. CONTRACT C7: 신규 원칙 **#9 1개만** 추가(별도 #10 안 만듦), 기존 get_writing_style_guide bullet 흡수.

```diff
+ - **#9 작업을 시작할 때 먼저 라우터를, 저장하기 전에 당신이 직접 자가검증하라.**
+   공고 분석·자소서·면접·오퍼 같은 커리어 작업은 get_workflow_guide({goal})으로
+   어떤 도메인 지식을 어떤 순서로, 저장 전 어떤 검증기로 점검할지 먼저 확인한다.
+   각 도메인 지식과 검증 루브릭은 그 안내대로 도구로 당겨쓰고, 산출물을 save_*로
+   보관하기 전에 당신이 직접 자가검증한다. 사실·시점·응답성 판단은 당신이 하고,
+   CareerMate는 셀 수 있는 항목(슬롭 밀도·키워드 커버리지·신선도·추적성)만 계산해
+   보조한다. 사람이 쓴 듯한 글이 필요할 때는 작성 직전 get_writing_style_guide를
+   함께 적용한다.
```

- master router(`get_workflow_guide`)만 명명, 16개 도메인/6개 검증기 세부는 도구 description(트리거#1)에 위임(AGENTS.md:22 "기술 용어 노출 최소화" 준수).
- 프라임 디렉티브 "두뇌는 당신, 저장은 CareerMate" 프레이밍 유지 — "당신이 자가검증"으로 표현.
- **게이트 표현 금지(CONTRACT C4·VERIFIERS.md 결정 3 정합)**: "검증 미통과 산출물은 저장 못 한다" 같은 hard 게이트 문장은 넣지 않는다 — verifier는 advise일 뿐 저장을 차단하지 않는다(false-pass 비대칭).

`CAREERMATE_SYSTEM_PROMPT`(prompts/system.ts)에 동일 **#9**를 본문(:48 종료 후)·요약(:50) 사이에 미러링해 두 정본 드리프트를 막는다(CONTRACT C7). advise 프레이밍 유지.

---

## 5. 기존 아키텍처·코드와의 정합

> 공통 보일러플레이트(structuredContent 객체 래핑·길이캡 상속·core 단일 진입점·zod 재사용·본문 미누수·정규식 안전·2-프로세스/WAL·openWorldHint)는 **→ [CONTRACT.md](CONTRACT.md) §C9 참조**. 아래는 본 문서 **고유의** 정합 포인트만 남긴다.

- **레이어(ARCHITECTURE.md §2/§8)**: `@careermate/knowledge`는 `shared`만 의존(`workflows`와 동일). 패키지 안에 `experts.ts`/`routes.ts`(본 문서 소유)와 `verifiers.ts`/`lexicons.ts`(VERIFIERS.md 소유)가 공존하되 소유권은 분리(결정 6).
- **라우터=`get_workflow_guide` 확장**: 신규 라우터 도구를 만들지 않고 기존 `get_workflow_guide`(tools.ts:591)에 `CAREER_ROUTES`를 additive로 얹는다(CONTRACT C3). `get_playbook`/확장 라우터는 순수 serve라 코어 호출 없음(get_writing_style_guide 패턴). 단계 도구(`save_rejection_review`/`evaluate_offer`)의 게이트·persist·log 로직만 core(services.ts)에 두고 handler는 thin → §C9.3.
- **상태 게이팅(결정 4 정합)**: 전이 합법성 정본은 `applicationRepo.setStatus`/`upsert`(repositories.ts:762/751)의 `assertStatusTransition`(services.ts 아님, CONTRACT C4) — 단계 도구는 새 throw를 더하지 않고 상태변경은 `updateApplicationStatus` 경유. 단계 해금 게이트가 필요하면 `saveInterviewPrep`(services.ts:178)의 throw-before-persist 패턴을 복제. verifier는 *저장*을 차단하지 않고 advise만(CONTRACT C4). 직접 `applications.status` write 금지가 writer 직렬화의 핵심(2-프로세스 §C9.7).
- **(B-2) 데이터모델(결정 5·CONTRACT C0·C6)**: `rejection_reviews` `CREATE TABLE IF NOT EXISTS`(컬럼=C6, `job_id` UNIQUE FK ON DELETE CASCADE) + 단수 `profile`에 `hard_gate` ALTER 1건을 `MIGRATIONS`에 append, `schema_version` 게이트로 1회 보장(schema.ts:283/288-307). `REJECTION_STAGES`(8값)는 `enums.ts`, 입력 스키마는 `schemas.ts`(파일 분리). `ACTIVITY_TYPES`/`ENTITY_TYPES` 추가도 C6. **마이그레이션 의존이라 B-2**(B-1엔 마이그레이션 0). Phase B 미적용(설계만). 마이그레이션·WAL 동시성 가드는 → §C9.7.
- **activityRepo.log**: 단계 도구 mutation 시 로그(`rejection_reviewed`/`offer_evaluated`) → `list_recent_activity`/대시보드 노출(services.ts:153/185 패턴).
- **도구 카운트(리뷰 missing 반영·CONTRACT C0/C3 Phase 분리)**: 본 문서 신규 도구는 **(B-1) `get_playbook` 1개** + `get_workflow_guide` **확장**(신규 아님) + `get_application_context` **확장**(주입, 신규 아님). **(B-2) `save_rejection_review`·`get_rejection_patterns`·`evaluate_offer` 3개**(데이터모델 의존이라 B-1 레지스트리엔 없음). 도메인 16개 도구가 아니고(결정 1), human-writing은 기존 `get_writing_style_guide` 재사용(0 신규). 단일 `TOOLS` 배열 description 비대화를 최소로 유지.

---

## 6. 미해결 질문 / 리스크

- **R1 (형제 문서 경계 동기화)**: 본 문서는 검증기·`DetSpec`·`SHARED_LEXICONS`·det compute·`verifications` 테이블을 [VERIFIERS.md](VERIFIERS.md)에 위임했다. 두 문서가 같은 `@careermate/knowledge` 패키지를 공유하므로, `VerifierId` enum·사전 id가 한쪽에서 바뀌면 §4.5 매핑 표가 깨진다. 단일 `verifiers.ts`의 `VerifierId` 타입을 import해 컴파일 타임에 매핑 오타를 잡도록 한다(런타임 문자열 매칭 금지).
- **R2 (human-writing 위임의 표현력 한계)**: human-writing 도메인을 `servedBy:'get_writing_style_guide'`로 위임(결정 3)하면 `principles`/`beforeAfter`가 비어, `get_playbook({domain:'human-writing'})`이 다른 도메인과 반환 모양이 다르다. 핸들러가 이 분기를 명시 처리(포인터 + 넛지)해야 하며, 장기적으로 human-writing 플레이북을 별도 본문으로 승격할지(이중 소유 위험 재발) 미정.
- **R3 (선행 데이터모델 슬라이싱)**: det 검증(traceability·staleness)이 의미를 가지려면 `rejection_reviews`/`hard_gate`/버전 신선도 정형 필드가 *선행*해야 한다(결정 5, KNOWLEDGE.md §4). 데이터모델 없이 det 도구만 serve하면 빈 입력이 거짓 `pass`를 낸다. Phase B 실행 순서를 "① 본 문서 마이그레이션 → ② VERIFIERS det 도구"로 박되, 두 문서의 PR 순서·의존을 [TODO.md](TODO.md)(작성 예정)가 추적해야 한다.
- **R4 (마스터 라우터 goal 분류 책임)**: `get_workflow_guide({goal})`(확장)의 `goal` z.enum 값을 외부 AI가 사용자 발화에서 *분류*해 넣어야 한다 — 이건 의미판단이라 CareerMate가 강제할 수 없다. goal 미상이면 `goal` 생략 호출로 전체 목록을 보고 AI가 고르게 한다. 오분류 시 잘못된 verifierSequence가 나오는 위험은 description 트리거 문구의 명료성에 의존.
- **R5 (`hard_gate` ALTER vs 신규 테이블)**: `profile`에 `hard_gate TEXT` ALTER를 추가했으나(결정 5), 향후 hardGate가 다값·이력이 필요해지면 별도 테이블이 나았을 수 있다. 현재는 단일 JSON 컬럼으로 충분하다는 가정 — recruiter-screen 정형화가 진행되면 재검토.

---

## 7. 관련 문서 (cross-links)

- Phase A 지식 — 도메인 16종 [knowledge/](../knowledge/) (resume·ats·cover-letter·interview-behavioral·interview-technical·company-research·human-writing·fit-matching·networking-referrals·salary-negotiation·linkedin-profile·portfolio·offer-evaluation-decision·recruiter-screen·onboarding-first-90-days·rejection-triage-iteration)
- 인덱스 — [KNOWLEDGE.md](KNOWLEDGE.md) (§0 소비 경로 3중 트리거 / §1 도메인×상태 레지스트리·마스터 라우터 / §3 정본 소유권 / §4 데이터모델 선행 의존성)
- Phase B 형제 — [VERIFIERS.md](VERIFIERS.md)(검증기·`DetSpec`·`SHARED_LEXICONS`·`verifications` 테이블 **정본 소유**, 본 문서가 `verifierIds`/`lexiconRefs`로 참조) · [ARCHITECTURE.md](ARCHITECTURE.md)(`@careermate/knowledge` 레이어·도구 계약) · [LOOP_ENGINE.md](LOOP_ENGINE.md)(draft→verify→revise 루프) · CONSENSUS_ENGINE.md · EVALUATION.md · [TODO.md](TODO.md) *(작성 예정)*
- 현행 코드 앵커 — `packages/workflows/src/definitions.ts:9-20`(데이터모듈·`trigger` 관례) · `packages/mcp-tools/src/tools.ts:591-623`(get_workflow_guide·get_writing_style_guide 템플릿)·:443/453(트리거#1·출력 넛지)·:279-282(길이캡 상속) · `packages/mcp-tools/src/result.ts:37-48`(toCallToolResult / structuredContent plain-object 제약 :42-43) · `packages/core/src/services.ts:145-187`(updateApplicationStatus·saveInterviewPrep throw-before-persist) · `packages/db/src/repositories.ts:751/762`(전이 합법성 *강제* 지점) · `packages/shared/src/enums.ts:48/67-91`(unlock·전이 정의) · `packages/db/src/schema.ts:109-110`(jobs.requirements/keywords 구조화 컬럼)·:288-307(migrate) · `packages/prompts/src/system.ts:11`(시스템 프롬프트 원칙)
