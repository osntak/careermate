# Career-OS 아키텍처 — CareerMate Career-OS (Phase B 설계)

> Career-OS 지식층(플레이북·검증기·공유 렉시콘·라우터)을 현행 2-프로세스·단일 SQLite·`shared→db→core→{web,mcp-tools}` 아키텍처에 **순수 추가(additive)** 로 끼우는 설계. **CareerMate 내부에는 LLM이 없다** — 지식은 `packages/knowledge`에 데이터로 저장되고 read-only MCP 도구로 serve되며, 검증 루브릭의 `det` 항목만 CareerMate가 LLM 없이 `core`에서 계산하고 의미판단(`ai`) 항목은 연결된 외부 AI가 수행한다(두뇌=외부 AI, 저장·제공·결정론 계산=CareerMate). Phase A 지식 원본: [KNOWLEDGE.md](./KNOWLEDGE.md), [knowledge/verifiers/](../knowledge/verifiers/), [knowledge/](../knowledge/). 현행 아키텍처는 [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).
>
> **횡단 결정(grade 타입·도구명·게이트·enum·테이블)은 [CONTRACT.md](CONTRACT.md)가 정본이다(충돌 시 우선). 이 문서는 그 결정을 재정의하지 않고 참조한다.**
>
> **Phase 분리(CONTRACT C0, 최상위 정본).** Phase B는 **B-1(serve-only + 라우팅: 마이그레이션 0·게이트 0)** 과 **B-2(det 엔진 + 검증 게이트 + 영속: 마이그레이션 필요)** 로 나뉜다. 이 문서의 컴포넌트 맵·결정·스펙은 각 항목을 **(B-1)** 또는 **(B-2)** 로 표기한다. B-1 = `packages/knowledge` 데이터 + serve 도구(`get_playbook`/`get_verifier`/`get_fact_anchors`/`get_shared_lexicons`) + `get_workflow_guide`·`get_application_context` 확장 + 소비 배선; **게이트 없음(외부 AI 자가검증)**. B-2 = det 계산 도구·save-time 게이트(`gateableCheckIds`)·`verifications` 테이블·데이터모델(`rejection_reviews`/`hard_gate`/hash)·`save_rejection_review`/`evaluate_offer`. B-2는 B-1 출시·검증 후 착수한다.

---

## 1. 목적·범위

### 설계하는 것 (Phase 표기 = CONTRACT C0)
- **(B-1)** 신규 데이터-모듈 패키지 `packages/knowledge`(`@careermate/knowledge`)의 타입·데이터·헬퍼 구조.
- **(B-1)** 외부 AI가 당겨쓰는 신규 serve 도구의 계약(name·description 트리거 문구·inputSchema·output·readOnly) — `get_playbook`/`get_verifier`/`get_fact_anchors`/`get_shared_lexicons`.
- **(B-1)** `det`/`ai`/`mixed` 구분을 1급 타입으로 박은 검증기(Verifier) **데이터** 모델(RubricCheck·DetSpec **명세**). det 평가 **로직**(계산)은 **(B-2)** `core`로 이월.
- **(B-1)** 목표→(전문가 시퀀스+검증기 시퀀스+루프)를 한 번에 돌려주는 마스터 라우터(`get_workflow_guide` 확장) + **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입**(C7 소비 강화 핵심).
- **(B-1)** 소비 경로(consumption path) 배선: 가장 강한 진입점(get_application_context 주입 + MCP server instructions) + 보조 3중 트리거(도구 description / AGENTS.md 제안 패치 / 출력 넛지).
- **(B-2)** det 계산 도구(`validate_*` compute), save-time 검증 게이트(`gateableCheckIds`), `verifications` 테이블, 데이터모델(`rejection_reviews` 테이블·`hard_gate` 컬럼·활동/엔티티 enum·hash 컬럼)에 대한 **제안** 마이그레이션. **B-1은 마이그레이션 0·게이트 0**이므로 이 항목 전체가 B-2 후속이다.

### 설계하지 **않는** 것 (Phase B는 문서 산출만)
- 코드 구현. 스키마·도구·마이그레이션은 **제안 스펙**이지 적용이 아니다.
- AGENTS.md / `CAREERMATE_SYSTEM_PROMPT` 수정. **제안 패치 블록**으로만 보여주고 실제 파일은 건드리지 않는다.
- **(B-2 전체) 마이그레이션·게이트·det 계산.** `getDb()→migrate()`가 부팅 시 자동 실행되므로(아래 §5) **B-1은 마이그레이션을 0개 포함**하고(C0), det 엔진·`gateableCheckIds` 게이트·`verifications`·데이터모델은 B-2로 분리한다. B-1은 게이트가 아니라 루브릭 serve + **외부 AI 자가검증 안내**까지만 한다(아래 §2 결정 6·8·§6).
- `EXPERT_PLAYBOOKS` 16개 도메인의 본문 데이터(상세는 [knowledge/](../knowledge/) 16편이 정본) 및 LOOP/CONSENSUS 엔진 상세(미작성, §6 리스크).

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### 결정 1 — 지식층 = 신규 `@careermate/knowledge` 단일 데이터-모듈 패키지
`packages/workflows`의 패턴(`interface` + 내보낸 `const` 배열 + getter/render 헬퍼, 한국어 우선, `shared`만 의존)을 그대로 복제한다.
- **rationale**: `workflows`·`prompts`가 이미 'LLM 없는 순수 데이터 + serve 헬퍼' 패턴을 검증했고, `shared`-only 의존이 계층 규칙을 깨지 않으며, `core`를 거치지 않고 `mcp-tools`가 직접 serve할 수 있어 `get_writing_style_guide`만큼 thin하다.
- **코드 근거**: `packages/workflows/src/definitions.ts:9` `WorkflowDefinition{id,title,description,trigger,steps}` + `:22` `export const WORKFLOWS`; `packages/mcp-tools/src/tools.ts:616-623` `get_writing_style_guide`(`readOnly:true`, `inputSchema:{}`, `core` 미경유, `HUMANIZE_WRITING_GUIDE`를 그대로 serve).
- **정정(리뷰 반영)**: `ExpertPlaybook`은 `WorkflowDefinition`을 **상속/확장하지 않는다**. 공유 필드는 `id/title/description/trigger` 4개뿐이고 `steps`를 버리고 `principles/dos/donts/...`를 새로 든다 → "동일 패키지 패턴 **차용**"이 정확한 표현이다(definitions.ts:9-20 대조).

### 결정 2 — `det`/`ai`/`mixed`를 `RubricCheck.grade` 1급 필드로 박되, **표현 불가능한 검사는 정직하게 `mixed`/`ai`로 강등**
`grade:'det'|'ai'|'mixed'`(CONTRACT C2 정본 3값)를 타입에 두고, `det`(및 `mixed`의 det 부분=`detLogic`)만 `core`의 결정론 평가기가 LLM 없이 계산, `ai`(및 `mixed`의 의미 부분=`aiPrompt`)는 컨텍스트와 함께 외부 AI에 되돌린다. 2값(`det|ai`)은 `mixed`를 손실압축하므로 쓰지 않는다.
- **rationale**: '두뇌=외부 AI, 계산=CareerMate'를 타입 수준에서 강제해 내부-LLM-없음 비목표를 코드로 보증한다.
- **코드 근거 / 정본**: KNOWLEDGE.md §0·§2(det=CareerMate counts / ai=external judges); 신규 평가기는 `packages/core/src/services.ts`의 `updateApplicationStatus`(:145)·`saveInterviewPrep`(:172) 옆에 배치(단일 `core` 진입 규칙).
- **정정(리뷰 반영, 핵심)**: `DetSpec`은 **5종**(pattern/count_threshold/keyword_coverage/staleness/traceability, CONTRACT C2 정본)만 둔다. `human-voice.md:24`(C3 문장길이 표준편차≥5·최단≤8단어), `:29`(C8 숫자 토큰 **집합차=0**), C9(고유명사 집합 보존), `consistency.md`(C1~C9 pairwise fact-anchor 비교)의 **stddev·set-difference·앵커 보존**은 어느 순수 `det` kind에도 사상되지 않는다. NER/집합비교는 의미판단이므로 `stat`·`set_preserve` 같은 신규 det kind를 만들지 **않는다**(det 사칭 방지). 따라서:
  1. 문장길이 표준편차(human-voice burstiness)·고유명사 보존(consistency/proper-noun)은 `grade:'mixed'`(detLogic=trivially countable 부분, aiPrompt=NER·의미 부분) 또는 `'ai'`로 분류한다. C8 숫자 토큰 집합차처럼 카운트만으로 닫히는 부분은 `count_threshold`/`keyword_coverage`로 표현하고, 집합 보존 판정은 mixed의 ai 부분에 맡긴다.
  2. **앵커 추출이 필요한 의미축**(consistency C1~C9 모순 비교, responsiveness-on-target 동문서답)은 `det`로 표기하지 **않고** `ai`로 분류한다. 이들은 `validate_*`(계산)가 아니라 `get_verifier`(루브릭 serve) + 외부 AI 판단으로 소비된다(아래 결정 4·§4).

### 결정 3 — 신규 도구는 기존 `TOOLS` 배열에 `ToolDef`로 추가, 4표준 형태만
serve(`get_*`)·compute(`validate_*`)는 `readOnly:true`, mutate(`save_*`)만 비-readOnly. 출력은 `ok/fail`→`toCallToolResult`(json 텍스트 블록 + `structuredContent`), 출력 스키마 없음.
- **코드 근거**: `packages/mcp-tools/src/result.ts:18` `ToolDef{name,title,description,inputSchema:ZodRawShape,readOnly?,handler}`, `:28/:32` `ok()/fail()`, `:37` `toCallToolResult`(payload를 ` ```json ` 텍스트 블록 + plain object면 `structuredContent`, `isError`); `apps/mcp` 등록이 `openWorldHint=false` 전역 + `readOnlyHint=readOnly`로 신규 도구를 무변경 흡수.

### 결정 4 — `validate_*` compute 도구는 **판정이 아니라 관측치(observed/threshold)만 반환**, 의미축 검증기는 compute로 만들지 않음 **(B-2 — det 계산; B-1엔 없음)**
- **Phase(C0)**: `validate_*` compute 도구는 det 계산 엔진을 전제하므로 **B-2**다. **B-1 레지스트리엔 `validate_*`가 없다**; B-1에서는 `get_verifier`가 루브릭을 serve하고 외부 AI가 스스로 자가검증한다. 또한 `validate_*`는 **readOnly·무저장 미리보기**이며(영속·게이트는 `save_*`가 담당 — CONTRACT C4), `verifications` 적재·`activityRepo.log`를 하지 않는다.
- **rationale(리뷰 반영)**: `human-voice.md:77`이 precount를 "두뇌는 외부 AI라는 원칙상 **측정 보조**로만 한정"한다고 자기제약했다. `validate_*`가 per-check `pass/fail`을 돌려주면 'CareerMate가 합격/불합격을 **판정**'으로 읽혀 그 선을 넘는다. 따라서 `validate_*`의 `det` 결과는 `{checkId, observed, threshold, op}`(예: `slop_density: observed 0.07, threshold ≤0.03`) 형태로 **관측치+기준만** 돌려주고, 합·불 해석과 모든 `ai` 체크는 외부 AI 몫으로 둔다. consistency·responsiveness처럼 `det` 콘텐츠가 0인 의미축은 별도 check_* 도구를 **신설하지 않고**(결정 2 참조) `get_verifier`로 루브릭만 serve한다(CONTRACT C3).
- **코드 근거**: `services.ts:160-165` `updateApplicationStatus`가 이미 `{interview_unlocked, hint}` 관측·넛지만 반환하고 판정/강제는 안 하는 선례.

### 결정 5 — 마스터 라우터는 **신규 도구 대신 기존 `get_workflow_guide`를 확장**(트리거 신호등 단일화) **(B-1 확장)**
- **Phase(C0)**: 둘 다 **B-1 확장**(기존 도구 코드 수정, 스키마 변경 없음 → 마이그레이션 0). (a) `get_workflow_guide`에 `goal?`을 **추가 optional 입력**으로 얹어(기존 `workflow_id` enum은 그대로; 둘 중 하나, 충돌 없음) `CAREER_ROUTES`로 expertSequence/verifierSequence/loop를 additive 반환. (b) **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입**(C7 소비 강화의 핵심 진입점 — 결정 9·§4.2-A 참조). 둘 다 반환 JSON만 확장하고 inputSchema 파괴 변경은 없다.
- **정정(리뷰 반영, 트리거 충돌 해소)**: 초안의 `get_career_playbook`는 `get_workflow_guide`와 동일한 '언제 호출하라' description + 겹치는 enum(`analyze_job`/`write_cover_letter`/`prepare_interview`는 `definitions.ts:43,63,95`와 문자열 동일)을 갖는다 → 신호등 2개가 정면 충돌한다. 새 도구를 만들지 않고 **`WORKFLOWS` 데이터에 `expertSequence`/`verifierSequence`/`loop` 필드를 additive로 얹고**(`WorkflowDefinition` 확장), `get_workflow_guide`(tools.ts:591-612)의 핸들러 렌더만 확장한다. 트리거가 하나로 유지되고 새 enum·새 trigger·새 도구가 통째로 사라진다. (폐기명 `get_career_playbook`/`get_expert_playbook`는 쓰지 않는다 — CONTRACT C3.)
- **코드 근거**: `tools.ts:591-612` `get_workflow_guide`가 `WORKFLOWS`를 `z.enum` `workflow_id`로 serve하는 템플릿; `definitions.ts:22` `WORKFLOWS`는 확장 가능한 `const` 데이터; `tools.ts:443` `get_application_context` 호출 강제 문구 + `:453` 출력 넛지 전례(여기 라우트를 실음).

### 결정 6 — 검증기 층 게이트 모델 **(B-1=게이트 0 / B-2=명시 `gateableCheckIds`)** (CONTRACT C4 v2 정본)
- **(B-1) 신규 검증 게이트 없음.** CareerMate는 산출물 저장을 막지 않는다. 외부 AI가 `get_verifier` 루브릭을 받아 **스스로** 자가검증한다. 기존 게이트만 유지: 전이 합법성 = `repositories.ts`의 `assertStatusTransition`(upsert/setStatus 경유, services.ts 아님), 능력 해금 = `saveInterviewPrep`의 throw-before-persist(`document_passed` 이상). B-1은 게이트가 아니라 **"det lint + advisory"**(C4) + 자가검증 안내다.
- **(B-2) save-time 게이트 = `gateableCheckIds`.** save 직전 재계산해 차단할 수 있는 체크는 **순수 `serverComputed`(외부 AI 주입 0)이고 `severity:'hard'`인 것만**이며, 그 명시 집합을 **`gateableCheckIds`**로 B-2에서 열거한다(현재 후보가 1~2개뿐임을 정직히 인정). `save_*` 핸들러가 persist 직전 재계산해 위반 시 `fail()`로 거부한다. 상태를 함의하는 신규 `save_*`는 반드시 `updateApplicationStatus`→`setStatus` 한 경로만 재사용(raw UPDATE 금지). **`ai`/`mixed`-ai 체크는 절대 차단하지 않고 advise+넛지**(`aiExtractedInput`이 섞인 자가신고는 위조 불가 영역이라 hard 게이트가 false-pass 명예 시스템이 됨 — 예: 자소서 허위수치=truthfulness 핵심=ai는 차단 불가, 강한 넛지 + 기존 "이 수치 확인됨?" save 확인으로만). 단계 전진은 여전히 `update_application_status` 결정으로 남긴다. `validate_*`(B-2, readOnly)는 강제력 없는 미리보기이며 게이트가 아니다(영속·게이트는 `save_*`).
- **코드 근거 / 정본**: CONTRACT C4(`gateableCheckIds`·readOnly preview vs save 강제 분리); `repositories.ts:751`(upsert)/`:762`(setStatus)의 `assertStatusTransition`(한국어 throw); `packages/shared/src/enums.ts:67` `ALLOWED_STATUS_TRANSITIONS`(:74 `rejected→draft` 허용), `:48` `INTERVIEW_UNLOCK_STATUSES=[document_passed,interview,final_passed]`; `services.ts:172-186` `saveInterviewPrep`의 throw-before-persist.

### 결정 7 — 공유 사전 단일 정본 = `SHARED_LEXICONS`, **도구명은 `get_shared_lexicons`로 통일**, 사전 원문은 비공개
- **정정(리뷰 반영, 정본 단일성·anti-gaming)**: `KNOWLEDGE.md:51`은 같은 모듈을 `get_verifier_dictionaries`로, `:67`은 `get_shared_lexicons`로 부른다 — 정본을 한 곳으로 정해 놓고 도구명이 둘이면 그 자체가 중복이다. **`get_shared_lexicons` 하나로 통일**하고 KNOWLEDGE.md:51 참조 동기화를 제안 패치에 포함한다. 또 게이밍을 막기 위해 `get_shared_lexicons`는 **사전 전체 패턴 리스트를 노출하지 않는다**: 외부 AI에는 human-voice 플레이북의 '회피 대상 **예시**' 수준만 보이고, `validate_*`의 `det` 결과는 '위반 개수/밀도' 관측치만 돌려준다(전체 정규식 비공개). 노출=게이밍이라는 트레이드오프를 openQuestion이 아니라 설계 결정으로 닫는다.
- **코드 근거 / 정본**: KNOWLEDGE.md §3(공유 사전의 신규 정본 모듈); `HUMANIZE_WRITING_GUIDE`(tools.ts:622에서 serve 중)를 human-voice 시드로 흡수해 `get_writing_style_guide` 기존 시그니처 유지.

### 결정 8 — 정형 필드 의존 마이그레이션·`det` 체크는 **B-2**, 충족 전 **schema_version 선행 게이트로 `ai` graceful-degrade**
- **Phase(C0)**: 마이그레이션이 필요한 모든 것은 **B-2**다. **B-1은 마이그레이션 0**이므로 `traceability`·`staleness`·`hard_gate` 참조 `det`도, `requiresSchemaVersion` 게이트도, `validate_*` 배선도 전부 B-2 맥락이다. 아래 graceful-degrade는 **B-2 내부**에서 미마이그레이션 DB를 만났을 때의 안전장치다.
- **정정(리뷰 반영, 시퀀싱 결함 해소 — B-2 맥락)**: `traceability`·`staleness`·`hard_gate` 참조 `det`는 §4가 '코드에 없음'으로 확인한 정형 필드(rejection_reviews 테이블, hard_gate 컬럼)에 의존한다. B-2 마이그레이션 적용 전에 `validate_*`를 배선하면 미마이그레이션 DB에서 (a) 조용히 무력화되거나 (b) 없는 컬럼 조회로 throw한다. 따라서 각 `det` 체크에 **전제 `requiresSchemaVersion`을 명시**하고, 충족되지 않으면 해당 체크를 **`ai`로 graceful-degrade**(아래 §4 `DetSpec` 메타)한다. **B-2 1차 배선 범위 = 정형 필드 불요 `det`만**(pattern/count_threshold/keyword_coverage — 모두 인라인 입력 기반); traceability/staleness/hard_gate 의존 `det`는 후속 마이그레이션 슬롯 이후로 분리한다.
- **det 사칭 금지(CONTRACT C2 — 정직성 강화)**: `keyword_coverage`의 키워드 집합·`staleness`의 recent-fact 매핑처럼 **외부 AI가 주입(`aiExtractedInput`)한 값**이 한 방울이라도 섞인 결과는 `det`/`hard`/게이트로 표기 금지다. 구체적으로 `freshness_ratio`(recent-fact 매핑=ai)·`proper_nouns`/`titles`/`credentials`를 자유텍스트에서 추출(=한국어 NER=ai)하는 값은 **`mixed`**로 두고, det 부분(날짜 산술·집합 비교)만 `serverComputed`, 추출은 `aiExtractedInput`으로 출처 태깅한다. `keyword_coverage` 커버리지 비율은 `serverComputed`라도 입력이 ai라 hard 게이트로 승격 금지. burstiness·고유명사 보존 등 `mixed`/`ai` 체크는 게이트가 아니라 넛지로만 소비된다(결정 6·CONTRACT C4·C2).
- **코드 근거 / 정본**: CONTRACT C2(serverComputed/aiExtractedInput 출처 태깅, det 사칭 차단); `packages/db/src/schema.ts:288-307` `migrate()`(forward-only/idempotent, `_meta.schema_version` 게이트, `for v=from..MIGRATIONS.length`), `getDb()→migrate()` 부팅 자동 실행; KNOWLEDGE.md §4(hard_gate/rejection_reviews/버전 신선도 코드 부재).

### 결정 9 — 소비 경로를 **가장 강한 진입점에 박는다** (CONTRACT C7 강화) **(B-1)**
- **정정(리뷰 반영, C7 MAJOR 3)**: pull+신뢰 모델은 description+AGENTS만으로는 약하다(AGENTS 안 읽는 클라이언트엔 무력). 따라서 보조 3중 트리거(description #1 / AGENTS.md bullet #2 / 출력 💡 넛지 #3)에 더해 **두 강한 진입점에 직접 박는다(모두 B-1):**
  1. **`get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입** — 외부 AI가 분석·작성 전 거의 항상 부르는 도구라 여기 라우트를 실으면 verifier 경로를 사실상 못 피한다(`tools.ts:443` 호출 강제 문구 + `:453` 넛지 전례). 스키마 변경 없이 반환 JSON만 확장.
  2. **MCP server instructions(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가** — 현재는 `get_application_context`+저장만 강조하고 verifier 언급이 없다. 서버 인스트럭션은 AGENTS를 안 읽는 클라이언트에도 전달된다.
- 실제 **강제**는 (B-2) `save_*` 게이트뿐. B-1은 "최대한 잘 보이는 신호등" + 자가검증 안내까지다(결정 6).
- **코드 근거 / 정본**: CONTRACT C7; KNOWLEDGE.md §0(pull+신뢰 3-트리거); `tools.ts:443` `get_application_context` description('…전에 반드시 먼저 호출하세요'), `:453` 출력 넛지('💡 …get_writing_style_guide…'), `:619` `get_writing_style_guide` 명령문 패턴; `apps/mcp/src/index.ts:26` server instructions.

---

## 3. 컴포넌트·책임·경계

| 컴포넌트 | Phase | 무엇을 하는가 | 어떻게 쓰는가 | 무엇에 의존하는가 / 경계 |
|---|---|---|---|---|
| `packages/knowledge` (`@careermate/knowledge`) | **B-1** | `EXPERT_PLAYBOOKS`·`VERIFIERS`·`SHARED_LEXICONS`·라우트 데이터 + `getPlaybook/getVerifier/getLexicon/renderPlaybookMarkdown` 헬퍼 보유 | `mcp-tools`가 serve 도구에서 직접 호출 | `shared`만 의존. **LLM·런타임 fetch·DB 접근 없음.** `DetSpec` '명세'만 데이터로 들고 평가 로직은 갖지 않음(평가는 B-2 `core`) |
| 마스터 라우터 (`WORKFLOWS` 확장 + `get_workflow_guide`) + **`get_application_context` 주입** | **B-1 확장** | `goal`→`expertSequence`·`verifierSequence`·`loop`를 한 번에 반환; `get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입(C7) | 외부 AI의 단일 진입점 | 순수 데이터 serve(`readOnly`). 추천만, 실행·저장 안 함. **신규 도구 아님**(결정 5). 스키마 변경 없음(반환 JSON만) |
| Expert Playbook 층 (`EXPERT_PLAYBOOKS` + `get_playbook({domain})`) | **B-1** | 16개 도메인 원칙·Do/Don't·Before→After·연결 `verifierIds`/`lexiconRefs` serve | AI가 작성 직전 당겨씀; description이 매칭 `save_*`/`get_verifier`를 가리켜 트리거 #1 형성 | 읽기 전용. 작성은 외부 AI. **단일 도구가 `z.enum([16])`으로 serve**(결정 5 단순화) |
| Verifier 데이터 층 (`VERIFIERS` + `get_verifier`) | **B-1** | `RubricCheck`(det/ai/mixed) **데이터** 보유. `get_verifier`=루브릭 serve(6 id enum 고정) | 저장 직전 AI가 **스스로** 자가검증; 의미축도 루브릭만 serve | 데이터=`knowledge`. **det 계산 로직 없음**(B-2). **`ai` 의미판단 내부 흉내 금지** |
| Verifier 계산 층 (`validate_*` compute) | **B-2** | `det` 관측치 계산 + 잔여 `ai` 되돌림 | readOnly·무저장 미리보기(영속·게이트는 `save_*`) | `det` 계산=`core`. `validate_*`는 `observed/threshold`만(판정 금지, 결정 4). **B-1 레지스트리엔 없음** |
| Shared Lexicon 모듈 (`SHARED_LEXICONS` + `get_shared_lexicons`) | **B-1** | slop/cliché/translationese/quant/ats_keyword 사전 단일 정본 | 검증기 `DetSpec`이 `id`로 참조 | 교차 도메인 사전 유일 소유자(중복 금지). 전체 패턴 비공개(결정 7) |
| Core det-평가/저장 서비스 (`packages/core/src/services.ts` 확장) | **B-2** | `DetSpec` 판별 유니온을 결정론 JS로 평가; `save_*`가 status/`gateableCheckIds` 게이트 후 persist + `activityRepo.log` + `verifications` 기록 | 두 진입점(web REST·mcp-tools)이 호출하는 단일 `core` 함수 | **LLM 없음.** throw-before-persist 게이팅. tool 핸들러는 thin(core 호출 + ok/fail). **마이그레이션 필요** |
| MCP 도구 표면 (`packages/mcp-tools/src/tools.ts` `TOOLS` 확장) | **B-1**(serve) / **B-2**(compute·save) | 신규 `ToolDef` 추가. serve=knowledge 직접(B-1), compute/save=core 호출(B-2) | description이 트리거 #1 | `openWorldHint=false`(전역), `readOnlyHint=readOnly`. `structuredContent`는 plain object만. 문서 본문 미노출 |
| 소비 경로 배선 (get_application_context 주입 + MCP server instructions + AGENTS.md 패치 + `CAREERMATE_SYSTEM_PROMPT` 동기 + 출력 넛지) | **B-1** | C7 강한 진입점 2개 + 보조 트리거 #2·#3 정의 | 라우터·저장전-검증 규칙을 가리키고 per-tool 세부는 description에 위임 | get_application_context·server-instructions는 실배선, AGENTS/system.ts는 **제안 패치 블록만**(실제 수정 안 함). 단계 리스트는 `workflows` 소유(중복 금지) |
| (Consensus / Loop 엔진) | **B-2+** | draft→verify→revise 루프·다중 검증기 합의 | `CareerGoalRoute.loop` 소비 | **상세 미정**([LOOP_ENGINE.md]·[CONSENSUS_ENGINE.md] 미작성, §6 리스크). 본 문서는 `loop` enum 1개·`verifierSequence` 데이터 경계만 정의(데이터=B-1, 엔진=후속) |

---

## 4. 구체 스펙

### 4.1 `@careermate/knowledge` 데이터 스키마 (TS 형태)
파일: `src/index.ts`(재노출), `playbooks.ts`(`EXPERT_PLAYBOOKS`), `verifiers.ts`(`VERIFIERS`), `lexicons.ts`(`SHARED_LEXICONS`), `routes.ts`(라우트), `helpers.ts`. 의존 = `@careermate/shared`만. `tsconfig` paths에 `@careermate/knowledge`→`packages/knowledge/src/index.ts` 추가(제안).

```ts
// SourceRef — 초안에서 미정의였던 타입을 명시(리뷰 반영). 출처 추적의 최소 형태.
export interface SourceRef { label: string; url?: string; note?: string }

export interface ExpertPlaybook {
  id: string; domain: string; title: string; description: string;
  trigger: string;                       // description으로 재사용되는 '언제 호출하라' 문구
  principles: string[]; dos: string[]; donts: string[];
  beforeAfter: { before: string; after: string }[];
  verifierIds: string[]; lexiconRefs: string[];
  sources?: SourceRef[];
}

// severity 축은 Phase A 정본(human-voice.md:79, consistency.md)의 'soft'|'hard'를 그대로 사용(리뷰 반영).
export interface RubricCheck {
  id: string; label: string;
  severity: 'soft' | 'hard';             // Phase A 정본 어휘 유지(매핑표 불요)
  grade: 'det' | 'ai' | 'mixed';         // CONTRACT C2 정본 3값(2값 금지: mixed 손실압축 방지)
  detLogic?: DetSpec;                     // grade==='det' 또는 'mixed'의 결정론 부분
  aiPrompt?: string;                      // grade==='ai' 또는 'mixed'의 의미판단 부분(또는 degrade된 det)
}

// DetSpec — 5종 판별 유니온(CONTRACT C2 정본). stat·set_preserve 도입 안 함(NER/집합비교=의미판단→mixed/ai).
// requiresSchemaVersion: 충족 안 되면 core가 이 체크를 ai로 graceful-degrade(결정 8).
type DetBase = { requiresSchemaVersion?: number };
export type DetSpec =
  | (DetBase & { kind: 'pattern'; lexiconRef?: string; patterns?: string[]; flags: 'g' | 'gi' })
  | (DetBase & { kind: 'count_threshold'; metric: string; op: '<=' | '>='; value: number })
  | (DetBase & { kind: 'keyword_coverage'; lexiconRef?: string; required?: string[]; minMatch: number })  // 키워드 집합은 외부 AI 주입
  | (DetBase & { kind: 'staleness'; maxAgeDays: number; anchorField: string })       // requiresSchemaVersion 필수
  | (DetBase & { kind: 'traceability'; requireSourceFor: string[] });                // requiresSchemaVersion 필수; N_total만 CareerMate 계산

export interface Verifier { id: string; name: string; risk: string; checks: RubricCheck[] }
export interface Lexicon { id: string; kind: 'slop' | 'cliché' | 'translationese' | 'quant_pattern' | 'ats_keyword'; entries: string[]; notes?: string }

// 라우터 — 신규 도구 대신 WorkflowDefinition에 additive로 얹는 필드(결정 5).
export interface CareerRouteExt {
  expertSequence: string[]; verifierSequence: string[]; loop?: 'draft_verify_revise';
}

export const EXPERT_PLAYBOOKS: ExpertPlaybook[];   // 16개 도메인 1:1 (knowledge/ 16편)
export const VERIFIERS: Verifier[];                // 6개 (knowledge/verifiers/ 6편)
export const SHARED_LEXICONS: Lexicon[];
export function getPlaybook(id: string): ExpertPlaybook | undefined;
export function getVerifier(id: string): Verifier | undefined;
export function getLexicon(id: string): Lexicon | undefined;
export function renderPlaybookMarkdown(id: string): string | undefined;
```

**6개 Verifier**: `truthfulness`, `consistency`, `recency-staleness`, `responsiveness-on-target`, `ats-compat`, `human-voice`(KNOWLEDGE.md §2 / `knowledge/verifiers/` 6편). 이 중 `consistency`·`responsiveness-on-target`은 앵커 추출/의미 비교가 핵심이라 **모든 핵심 체크가 `grade:'ai'`** 이며 `validate_*` 도구를 갖지 않는다(결정 2·4).

### 4.2 MCP 도구 계약 (`TOOLS`에 `ToolDef`로 추가)

**A. 마스터 라우터 — 신규 도구 없음 (B-1 확장).** `get_workflow_guide`(tools.ts:591) 핸들러가 `WorkflowDefinition.expertSequence/verifierSequence/loop`를 함께 렌더하도록 확장한다. 기존 `workflow_id` enum은 그대로 유지하고 신규 `goal?`을 **추가 optional 입력**으로 얹는다(둘 중 하나; 충돌 없음, 결정 5). 그리고 **`get_application_context`(tools.ts:443) 응답에 `{recommended_route, verifier_sequence, next_tool}`를 주입**한다(C7 핵심 — 스키마 변경 없이 반환 JSON만 확장; 외부 AI가 분석·작성 전 거의 항상 부르는 진입점이라 verifier 경로를 사실상 못 피한다). 둘 다 **B-1**(마이그레이션 0).

**B. serve — `get_playbook` (단일 도구, `z.enum([16])`) (B-1)**
- `name`: `get_playbook`, `title`: '전문가 플레이북', `readOnly: true`
- `description`(트리거 #1): "이력서·자소서·면접 등 커리어 산출물을 손보기 **직전에 호출하세요.** 해당 도메인의 작성 원칙·Do/Don't·Before→After와, 저장 전 어떤 verifier로 **당신이 자가검증**할지를 돌려줍니다."
- `inputSchema`: `{ domain: z.enum(['resume','ats','cover-letter','fit-matching','human-writing','interview-behavioral','interview-technical','linkedin-profile','networking-referrals','offer-evaluation-decision','onboarding-first-90-days','portfolio','recruiter-screen','rejection-triage-iteration','salary-negotiation','company-research']) }`
- `handler`: `getPlaybook(domain)`→`ok(renderPlaybookMarkdown, playbook)`. **core 미경유.** output: `{ playbook }`(plain object→`structuredContent`).

**C. serve — `get_verifier` / `get_shared_lexicons` / `get_fact_anchors` (B-1)**
- `get_verifier`: `readOnly:true`, `inputSchema: { verifier_id: z.enum(['truthfulness','consistency','recency-staleness','responsiveness-on-target','ats-compat','human-voice']) }`(**6 id 고정** — CONTRACT C3; `fit`은 검증기가 아니라 도메인 `fit-matching`이므로 enum에 없다, 폐기 `get_verifier_dictionaries` 미사용), handler `getVerifier`→루브릭(det/ai/mixed 체크) serve. core 미경유. **루브릭 데이터만 serve(consistency·responsiveness 포함); det 계산은 B-2.**
- `get_shared_lexicons`: `readOnly:true`, `inputSchema: { kind: z.enum(['slop','cliché','translationese','quant_pattern','ats_keyword']).optional() }`. **전체 패턴 비공개**(결정 7): notes·예시만 반환, 원문 entries는 B-2 `validate_*` 내부 계산에만 사용.
- `get_fact_anchors({ scope })`: `readOnly:true`. 저장 데이터의 **구조화 필드**만 serve(자유텍스트 NER 아님 — 추출은 외부 AI 몫). 폐기 `get_freshness_anchors` 미사용.

**D. compute — `validate_*` (관측치만, persist 없음) (B-2 — det 계산; B-1엔 없음)**
- **Phase(C0)**: det 엔진을 전제하므로 **B-2**. B-1 레지스트리엔 `validate_*`가 없고, B-1에선 `get_verifier` 루브릭 + 외부 AI 자가검증으로 대체한다.
- 예 `validate_cover_letter`: `readOnly:true`·**무저장 미리보기**(영속·게이트는 `save_*`; `verifications` 적재·`activityRepo.log` 금지 — CONTRACT C4). `inputSchema`는 **shared zod 재사용**(리뷰 반영): `{ text: optBody, job_id: z.string().optional() }` — `optBody = z.string().max(MAX_BODY)`(`schemas.ts:57,69`, `MAX_BODY=200_000`=**200KB**)로 인라인 입력 길이가 자동으로 200KB에 묶인다(8MB 아님).
- `handler`→`core.runDetChecks(verifierId, artifact)`→`ok({ detResults: [{checkId, observed, threshold, op}], pendingAiChecks: [{checkId, aiPrompt, context}] })`. **per-check pass/fail 금지, observed/threshold만**(결정 4). 각 결과는 `serverComputed`/`aiExtractedInput` 출처 태깅(C2); `freshness_ratio`·`proper_nouns` 등 ai 추출 혼입 값은 `mixed`로 두고 det/hard로 표기하지 않는다. 출력 넛지로 revise/`save_*` 가리킴.
- `keyword_coverage`/ats det의 **JD 키워드 출처 계약**(리뷰 반영): CareerMate는 JD에서 키워드를 **의미추출하지 않는다**. 외부 AI가 추출한 키워드 집합(`aiExtractedInput`)을 `required`로 넘기면 CareerMate는 텍스트 내 **매칭 카운트만**(`serverComputed`) 한다 — 입력이 ai라 hard 게이트 승격 금지(C2). 폐기 `get_jd_keywords` 같은 추출-serve 도구는 만들지 않음(추출 자체가 `ai`, ats.md:7).

**E. mutate — `save_rejection_review` / `evaluate_offer` (B-2 — 데이터모델 마이그레이션 의존)**
- **Phase(C0)**: 둘 다 신규 테이블/enum(`rejection_reviews`·`ACTIVITY_TYPES`·`ENTITY_TYPES`·`REJECTION_STAGES`)에 의존하므로 **B-2**. **B-1 레지스트리엔 없다.**
- `save_rejection_review`: 비-`readOnly`. `inputSchema`=신규 `RejectionReviewInputSchema.shape`(`@careermate/shared`). handler→`core.saveRejectionReview`: 상태 함의 시 `updateApplicationStatus` 경유(`applications.status` 직접 쓰기 금지), persist + `activityRepo.log`. save 직전 `gateableCheckIds` 재계산(C4).
- `evaluate_offer`: `final_passed` 상태집합 게이트(`saveInterviewPrep` services.ts:172-186 패턴 복제). 게이트 위반 시 한국어 throw→`fail()`.

### 4.3 enum / 테이블 변경 (제안, 미적용) **(B-2 전체 — 마이그레이션 필요; B-1은 마이그레이션 0)**

> **Phase(C0)**: 이 절의 모든 enum 추가·신규 테이블·컬럼 추가는 마이그레이션을 동반하므로 **전부 B-2**다. **B-1은 이 절을 0개 포함**한다. 추가로 B-2는 검증 메타 단일 테이블 **`verifications`**(append-only; 컬럼 정본 CONTRACT C5: `artifact_content_hash`/`resume_content_hash`/`jd_hash`/`computed_json`(serverComputed)/`ai_reported_json`(외부 AI 자기보고='미검증' 표식)/`metrics_json`/`gate_status` + `INDEX(artifact_type,artifact_id,checked_at DESC)`)를 신설한다(EVALUATION score·gateStatus도 여기 동거, 새 테이블 신설 금지). `verification_run` activity 로그는 감사 보완(대체 아님).

**활동/엔티티 enum 확장(리뷰 반영 — 누락 시 활동 피드/딥링크 깨짐):**
`packages/shared/src/enums.ts:116` `ACTIVITY_TYPES`에 `'rejection_reviewed'`, `'offer_evaluated'`, `'verification_run'` 추가(`verification_run`은 C5 `verifications` 감사 보완용 — LOOP_ENGINE 의존); `:130` `ENTITY_TYPES`에 `'rejection_review'`, `'offer'` 추가. (현재 enum에 해당 항목 부재 — 확인됨. 정본: [CONTRACT.md](CONTRACT.md) §C6.)

**`REJECTION_STAGES` enum(제안):**
```ts
export const REJECTION_STAGES = ['pre_screen','recruiter_screen','aptitude_test','assignment','interview','final_fit','ghosted_pre','ghosted_post'] as const;  // 정본: CONTRACT §C6 = Phase A rejection-triage 8값
export type RejectionStage = (typeof REJECTION_STAGES)[number];
```
`canTransitionStatus`/`INTERVIEW_UNLOCK_STATUSES`와 **별개 축**. `rejection_reviews.stage`가 참조.

**마이그레이션(제안, `MIGRATIONS` 배열에 문자열 append, schema.ts:286 뒤):**
```sql
CREATE TABLE IF NOT EXISTS rejection_reviews (        -- 컬럼 정본: CONTRACT §C6
  id TEXT PRIMARY KEY,
  job_id TEXT UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
  stage TEXT,                       -- REJECTION_STAGES(8값)
  external_factor TEXT,             -- mismatch|internal_candidate|position_closed|reference_check|none
  perceived_reason TEXT,
  feedback_received TEXT,
  lessons TEXT,                     -- JSON
  improvement_actions TEXT,         -- JSON
  reapply_eligible_after TEXT,      -- YYYY-MM
  created_at TEXT, updated_at TEXT
);
ALTER TABLE profile ADD COLUMN hard_gate TEXT;  -- 단일 JSON 컬럼(전역 조건): {minYears,visaStatus,location,salaryFloor}. 공고별 knockout=jobHardGate(별도 위치, 미정)
```
forward-only/idempotent, `_meta.schema_version` 게이트(schema.ts:288-307). 부팅 시 `getDb()→migrate()` 자동 적용이나 **Phase B는 제안만**. 이 마이그레이션이 적용되기 전에는 `staleness`/`traceability`/`hard_gate` 의존 `det`가 `requiresSchemaVersion` 미충족으로 `ai`로 degrade된다(결정 8).

### 4.4 소비 배선 (**B-1**: server-instructions·get_application_context는 실배선 / AGENTS·system.ts는 제안 패치 블록만)
가장 강한 진입점 2개(C7)는 B-1에서 실제 배선한다: (1) **`get_application_context` 응답 주입**(§4.2-A), (2) **MCP server instructions(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 한 문장 추가** — 현재 server instructions는 `get_application_context`+저장만 강조하고 verifier 언급이 없어, AGENTS를 안 읽는 클라이언트에도 전달되는 이 경로에 verifier 안내를 싣는다. 아래 AGENTS.md/`system.ts` 패치는 **제안 블록만**(실제 파일 미수정): 기존 bullet 스타일(굵은 명령문 lead + 평이한 한국어) 유지, 최대 +2 bullet, 기존 `get_writing_style_guide` bullet(AGENTS.md:18) 흡수해 총량 비증가. 20+ 구체 도구명은 description에 위임. 라우터는 진입점으로 한 번만 명명.

```diff
  ## 규칙

+ - **목표가 정해지면 먼저 경로를 받아라.** 커리어 작업(공고 분석·자소서·면접 등)을
+   시작하기 직전 `get_workflow_guide`로 어떤 플레이북과 verifier를 어떤 순서로 적용할지
+   받아온다. 세부 도구는 각 단계 안내가 가리킨다.
+ - **저장 전 당신이 자가검증하라.** 산출물을 저장하기 전, 해당 도메인 플레이북으로 작성하고
+   verifier 기준으로 **당신이** 자가검증한다(CareerMate의 det 체크는 슬롭 밀도·키워드 매칭 같은
+   카운트를 보조로 셀 뿐, 의미판단·합불 결정은 당신 몫이다). 사실·수치·고유명사는 그대로 보존한다.
- - **사람이 쓴 듯한 글**이 필요할 때(자소서·자기 PR·지원 메일)는 작성 직전
-   `get_writing_style_guide`를 적용한다. 사실·수치·고유명사는 그대로 보존한다.
```
동일 취지를 `prompts/system.ts` `CAREERMATE_SYSTEM_PROMPT`에 **`#9 저장 전 자가검증`**(기존 `#8 글은 AI 티 안 나게`와 유사 길이, `#8` 본문 종료 후 system.ts:48 뒤·요약 :50 앞)으로 동기화 제안. KNOWLEDGE.md:51의 `get_verifier_dictionaries` 표기도 `get_shared_lexicons`로 동기화(결정 7).

---

## 5. 기존 아키텍처·코드와의 정합

공통 정합 규칙(structuredContent 객체 래핑·길이캡 상속·core 단일 진입·zod 재사용·본문 미누수·정규식 안전·2-프로세스/WAL·`openWorldHint=false`)은 **→ [CONTRACT.md](CONTRACT.md) §C9 참조**(재서술하지 않음). 아래는 이 아키텍처 문서 **고유의 정합 포인트**만 남긴다.

- **계층(`shared→db→core→{web,mcp-tools}`)에서 `knowledge`의 위치**: `@careermate/knowledge`는 `shared`만 의존하므로 새 의존 화살표를 만들지 않는다(`workflows`/`prompts`와 동급). serve 도구는 `knowledge` 직접 호출, compute/save 도구는 `core`만 호출 → 화살표 방향 보존(이 문서가 확정하는 컴포넌트 맵).
- **(B-2) `det`-평가/저장 로직의 `core` 배치**: 신규 `det`(및 `mixed`의 det 부분) 평가는 `core/services.ts`의 단일 함수로 두 표면(web REST·mcp stdio)이 공유 → 대시보드↔MCP 동작 동일. tool 핸들러는 thin(core 호출 + `ok/fail`). `services.ts` 비대화 시 `core/verify/` 서브모듈 분리는 §6 리스크로 이월. **B-1은 det 계산 로직을 두지 않는다**(serve만).
- **(B-2) 서버사이드 게이팅 배치**: 신규 게이트(`gateableCheckIds`)는 throw-before-persist(`saveInterviewPrep`·`assertStatusTransition`) 복제이며 게이트 강제력 모델은 결정 6·CONTRACT C4가 정본. `activityRepo.log`는 모든 mutation 후 호출하되 enum 확장(§4.3)을 전제로 한다. **B-1은 신규 게이트 0**(기존 상태/해금 게이트만 유지).

---

## 6. 미해결 질문 / 리스크

1. **`det` 평가기 위치**: `core/services.ts` 단일 진입 vs 별도 `packages/verify`. 정규식/통계 계산이 커지고 web REST에서도 재사용하려면 `core` 단일이 맞으나, `services.ts` 비대화 시 `core` 내 서브모듈 분리(`core/verify/`)를 재검토.
2. **마이그레이션 적용 Phase·회귀 범위**: forward-only 자동 `migrate()`라 롤백 불가 → `hard_gate`/`rejection_reviews` 적용 Phase에서 기존 사용자 DB 자동 마이그레이션의 회귀 테스트(기존 12 테이블 무손상 + 신규 컬럼 NULL 허용) 범위를 별도 정의 필요. Phase B 1차는 정형 필드 불요 `det`만 배선(결정 8)으로 이 리스크를 격리.
3. **`hard_gate` 정형화 ROI**: 로컬 도구 특성상 사용자당 공고 수가 적다 → 정형 스키마를 신설하기 전에 `profile.desired_conditions` 자유텍스트로 `ai` 등급 게이트로 출발하고, 측정 가치가 입증된 뒤 정형화하는 단순·안전 경로를 우선 검토(리뷰 simplerAlternative).
4. **Consensus / Loop 엔진 공백**: [LOOP_ENGINE.md]·[CONSENSUS_ENGINE.md]가 **미작성**(KNOWLEDGE.md §0 '작성 예정')이라 다중 검증기 합의의 데이터/도구 계약이 전무하다. 본 문서는 `verifierSequence`(배열)·`loop`(enum 1개) 경계만 정의하며, 합의 규칙(검증기 가중·충돌 해소)은 후속 Phase로 분리.
5. **`consistency` 다중 산출물 입력**: C1~C9 pairwise 비교는 여러 산출물을 동시에 필요로 하나 `get_application_context`는 최근 10건 cap. `consistency`를 `ai`로 둔 결정(결정 2)이 이를 우회하지만, 외부 AI에 어떤 산출물 묶음을 컨텍스트로 줄지(=`get_verifier`가 무엇을 동봉할지)는 후속 확정 필요.
6. **사전 노출 vs anti-gaming**: 전체 패턴 비공개(결정 7)로 게이밍 표면을 줄였으나, 노출 최소화가 외부 AF의 자가검증 정확도를 떨어뜨릴 수 있다 — 예시 노출 수준의 적정선은 측정 후 조정.

---

## 7. 관련 문서 (cross-links)

작성 상태를 명시한다(리뷰 반영 — 미작성 문서를 현존처럼 인용하지 않음).

- [CONTRACT.md](CONTRACT.md) — **횡단 결정 단일 정본(v2).** Phase 분리(C0)·grade 타입·도구명·게이트(`gateableCheckIds`)·enum·`verifications` 테이블·소비 경로 정본. 충돌 시 우선. **작성됨.**
- [KNOWLEDGE.md](./KNOWLEDGE.md) — Phase A 지식 레지스트리(§0 소비모델 · §1 여정×상태×도메인 · §2 검증기 det/ai · §3 정본 소유권 · §4 데이터모델 의존). **작성됨.**
- [knowledge/](../knowledge/) — 16개 도메인 플레이북 원본(`playbooks.ts` 데이터 정의 소스). **작성됨(16편).**
- [knowledge/verifiers/](../knowledge/verifiers/) — 6개 검증기 원본(`verifiers.ts`/core det 평가기 소스; severity `soft|hard`·det 측정 정본). **작성됨(6편).**
- LOOP_ENGINE.md — draft→verify→revise 루프(`CareerGoalRoute.loop`). **미작성(작성 예정).**
- CONSENSUS_ENGINE.md — 다중 검증기 합의. **미작성(작성 예정).**
- EVALUATION.md — det 체크 측정·anti-gaming 평가. **미작성(작성 예정).**
- [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md) — 현행 §2 계층 · §3 요청흐름 · §8 패키지 표(신규 `packages/knowledge`가 확장하는 기준). **작성됨.**
- [docs/MCP_TOOLS.md](../../MCP_TOOLS.md) — 현행 도구 레퍼런스(신규 도구 추가 대상). **작성됨.**
- [docs/dev/DATA_MODEL.md](../../dev/DATA_MODEL.md) — 현행 테이블(`rejection_reviews`/`hard_gate` 추가 대상). **작성됨.**
