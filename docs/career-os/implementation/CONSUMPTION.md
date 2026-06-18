# 소비 경로 (런타임 배선) — CareerMate Career-OS (Phase B 설계)

> Phase A의 컴파일된 지식(플레이북·검증 루브릭·공유 사전·마스터 라우터)을 외부 AI가 **적시에 당겨쓰게(pull)** 만드는 런타임 배선의 단일 원천. **CareerMate 내부에는 LLM이 없다** — 두뇌는 외부 AI, 저장·제공·`det` 계산만 CareerMate가 한다. 지식층 인덱스는 [`KNOWLEDGE.md`](KNOWLEDGE.md), 현행 아키텍처는 [`docs/dev/ARCHITECTURE.md`](../../dev/ARCHITECTURE.md). 이 문서는 **설계안일 뿐 코드·사용자 대면 파일을 수정하지 않는다.**
>
> **횡단(cross-cutting) 결정은 [CONTRACT.md](CONTRACT.md)가 정본이다(충돌 시 우선).** 이 문서는 그 결정을 재정의하지 않고 소비 경로(C7) 관점으로만 적용한다.

---

## 1. 목적·범위

**설계하는 것 (모두 B-1: 소비 배선·라우팅, 마이그레이션 0·게이트 0 — CONTRACT C0).** 외부 AI(레포 접근 없음, 강제 불가능, MCP로만 당겨씀)를 올바른 호출 경로로 유도하는 트리거 배선. CONTRACT C7(v2)에 따라 **가장 강한 기존 진입점에 라우트를 박는 것**이 최상위이고, description·상시지침·넛지는 그 보강이다:

0. **최상위 진입점 — `get_application_context` 응답 주입 (B-1, C7 강화 핵심)**: 외부 AI가 분석·작성 전 거의 항상 부르는 도구라, 응답에 `{recommended_route, verifier_sequence, next_tool}`를 실으면 verifier 경로를 사실상 못 피한다(`tools.ts:443` 호출 강제 문구 + `:453` 넛지 전례). 스키마 변경 없이 반환 JSON만 확장.
1. **Trigger 1 — MCP 도구 description**: 신규 지식 도구마다 "언제 호출하라" 명령형 첫 문장 (`get_writing_style_guide` 패턴, `tools.ts:619`).
2. **Trigger 2 — server instructions + `AGENTS.md` + `system.ts` 상시 지침 (B-1)**: **MCP server instructions**(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가(현재 verifier 언급 0; AGENTS를 안 읽는 클라이언트에도 전달됨) + `AGENTS.md`/`system.ts`에 "저장 전 자가검증" 1급 규칙 신규 원칙 **#9 1개만**(CONTRACT C7), 제안 패치 블록만.
3. **Trigger 3 — 도구 출력 인라인 넛지**: 한 도구 응답이 다음 도구를 가리킴 (`get_application_context`의 💡 패턴, `tools.ts:453`).

> **강제 vs 배선 경계(C0).** 위 0~3은 전부 **B-1 소비 배선**으로 *아무것도 차단하지 않는다*(외부 AI가 루브릭으로 스스로 자가검증). 실제 save 게이트(저장 차단)는 **B-2뿐**이다(C4). B-1은 "최대한 잘 보이는 신호등 + 자가검증 안내"까지다.

여기에 목표별 **draft→verify→revise 루프** end-to-end 시퀀스, `det`/`ai` 검증 분기점, pull 모델의 한계와 견고화 전략을 명세한다.

**설계하지 않는 것 (다른 Phase B 문서 소유).**
- `packages/knowledge`의 **데이터 스키마**(`ExpertPlaybook`/`Verifier`/`Lexicon`/`CareerGoalRoute` const 내용) → SCHEMA 문서.
- 각 검증기의 **`RubricCheck`/`DetSpec` det 로직 내용** → VERIFIERS 문서.
- `CAREER_ROUTES` **데이터 내용** → ROUTER 문서.
- `hardGate`·`rejection_reviews` **테이블 DDL 본체** → SCHEMA 문서.

이 문서는 그 위의 **배선(어느 도구가 어떤 트리거 문구로 무엇을 가리키는가)** 만 소유한다.

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### D1. 소비는 pull+신뢰 모델이며, 견고함 = 신호 가시성의 함수
외부 AI는 레포를 읽지 않고 MCP로만 당겨쓰며, 잘못된 경로를 막을 제어흐름이 없다. 한 트리거를 건너뛰어도 나머지 둘이 같은 경로로 재유도하도록 **의도적으로 중복** 배치한다. 강제할 수 있는 것은 오직 **서버측 throw**(D6)뿐이고, 나머지는 전부 "설득"이다.
- 근거: `KNOWLEDGE.md` §0(라인 10-18); 라이브 패턴 `tools.ts:443`(description 트리거), `tools.ts:453`(출력 넛지), `tools.ts:619`(트리거+체이닝).

### D2. 도구 description이 1차 신호 (Trigger 1)
신규 지식 도구의 description은 "…직전에 호출하세요" 명령형 한 문장으로 시작하고, 플레이북류는 끝에서 매칭 `save_*`와 검증기를 명시한다. `get_writing_style_guide`(`tools.ts:616-623`: `readOnly:true`, `inputSchema:{}`, core 호출 없이 `@careermate/prompts` 데이터 serve)와 동형.
- 근거: `tools.ts:619`(트리거 문장 + "반드시 함께 적용하세요" 체이닝), 스파인 `toolContractConvention`.

### D3. `AGENTS.md` 패치는 신규 원칙 #9 1개만, 기존 bullet 흡수, 라우터만 노출 (Trigger 2)
`AGENTS.md`는 단일 정본이라 비대해지면 전 클라이언트 부담이고, "기술 용어 사용자 노출 최소" 규칙(AGENTS.md:22)과 충돌한다. CONTRACT C7에 따라 **신규 원칙 #9 "저장 전 관련 루브릭으로 자가검증" 1개만** 추가하고(CONSENSUS 충돌 규칙도 #9 본문에 흡수, 별도 #10 안 만듦), 기존 `get_writing_style_guide` bullet(AGENTS.md:18)을 흡수해 **총 bullet 수를 늘리지 않는다**. 진입점은 마스터 라우터 `get_workflow_guide` **1개만** 노출하고 나머지 20여 개 `get_*` 이름은 description(Trigger 1)에 위임한다.
- 근거: `AGENTS.md` 라인 15(bold 명령형 + 평문 스타일), 18(흡수 대상), 22(도구명 노출 최소); CONTRACT C7.

### D4. `system.ts`에도 #9 미러링 (드리프트 방지)
`CAREERMATE_SYSTEM_PROMPT`는 같은 행동 규칙을 담는 둘째 정본이라 한쪽만 고치면 드리프트한다. 원칙 #8(AI 티, `system.ts:46-48`) **본문 종료 후, 50행 "작업 방식 요약" 블록 앞**에 #9를 삽입하고 `AGENTS.md` 패치와 길이·framing을 동기화한다.
- 근거: `system.ts:11`(원칙 리스트 시작), `:17-48`(원칙 1-8), `:50-53`(요약 블록) — #9는 8번 본문(46-48) 뒤·요약(50) 앞.

### D5. `det`/`ai` 분기는 도구 경계로 강제 — **`validate_*`=readOnly 무저장 미리보기, 게이트·기록=`save_*`** (CONTRACT C4 v2, B-2)
**Codex CRITICAL 2 + CONTRACT C4 v2 반영.** `validate_*`의 readOnly 힌트와 영속/로그는 모순이므로, **한 도구가 검증과 강제·기록을 겸하지 않는다.** 역할을 도구 경계로 갈라 박는다(이 메커니즘 전체는 **B-2** — det 엔진·게이트가 도착해야 동작하며, B-1엔 `validate_*` 자체가 없다):
- **(B-2) `validate_*`는 readOnly·무저장 미리보기**(AI가 저장 전 스스로 점검) — `readOnly:true`, **`verifications` 적재·`activityRepo.log` 금지**(readOnly 힌트 진실 유지). 게이트가 아니다.
- **(B-2) 영속과 게이트는 `save_*` 핸들러**가 담당한다. 저장 직전 `gateableCheckIds`(= **순수 `serverComputed`·외부 AI 주입 0·`severity:'hard'`인 검사**만, B-2에서 열거)를 재계산 → 위반 시 `fail()`로 거부 → 통과 시 `verifications`에 기록한다 — `saveInterviewPrep`의 throw-before-persist(`services.ts:178`)와 동형. 즉 "검증=readOnly preview / 강제·기록=save".
- **(B-1)에는 게이트가 없다.** B-1은 description·server instructions·넛지로 외부 AI가 `get_verifier` 루브릭을 받아 **스스로** 자가검증하도록 안내할 뿐, 저장을 막지 않는다(기존 `saveInterviewPrep` 상태게이트만 유지). 따라서 B-1은 "게이트"가 아니라 **det lint + advisory**라 부른다(C4).
- **`ai`/`mixed-ai` 검사는 B-2에서도 절대 차단하지 않고 advise(넛지)로만** 처리한다. 자가신고 위조가 불가능한 영역(예: 자소서 허위수치=truthfulness 핵심은 `ai`)에서 hard 게이트는 false-pass 명예 시스템이 되므로, 강한 출력 넛지 + 기존 "이 수치 확인됨?" 저장 확인으로 대신한다. 현재 `gateableCheckIds` 후보는 1~2개뿐임을 정직히 인정한다(C4).

이로써 (a) `validate_*`의 readOnly가 영속/로그와 모순되지 않고, (b) "검증기가 산출물 저장을 게이트한다"는 주장이 (강제 가능한 순수 det·hard 범위 안에서) `save_*` 소유로 모순 없이 성립. CareerMate는 의미판단을 흉내내지 않고 `det`(regex/count/threshold/coverage/staleness)만 계산하며 `ai`/`mixed`의 `aiPrompt`는 외부 AI에 그대로 넘긴다.
- 근거: CONTRACT C4 v2(B-1 게이트 0 / B-2 명시 게이트·validate_* 무저장)·C5(`verifications` 테이블); `KNOWLEDGE.md` §0/§2(det/ai 정직 구분); `services.ts:172-186`(throw-before-persist 정본); `result.ts:32`(`fail()` → `isError`).

### D6. 상태 게이팅은 신규 메커니즘 없이 기존 2-tier에 배선 — **검증 정본은 repo, service는 통과 지점** (정정됨)
**적대적 리뷰 반영(mustFix).** 스파인은 "`updateApplicationStatus` 경유가 불변식의 근거"라 했으나 **부정확**하다. 전이 합법성 `assertStatusTransition`은 실제로 **`repositories.ts:762`(`setStatus`)와 `:751`(`upsert`)**에서 호출된다. `updateApplicationStatus`(`services.ts:152`)는 검증하지 않고 `applicationRepo.setStatus`에 **위임만** 한다.
- **(1) 전이 합법성** 정본 = `repositories.ts:751/762`의 `assertStatusTransition`(over `ALLOWED_STATUS_TRANSITIONS`, `enums.ts:67`). 유일 금지 이동은 active→draft.
- **(2) 능력 해금** 정본 = core의 `saveInterviewPrep`(`services.ts:178`)이 `!INTERVIEW_UNLOCK_STATUSES.includes(app.status)`(`enums.ts:48`)면 persist 전 throw.
- **컨벤션**: 새 `save_*`(예: `save_rejection_review`)가 상태를 바꿔야 하면 **자체 로직을 두지 말고** `updateApplicationStatus`(→`setStatus`→`assertStatusTransition`) **한 경로만** 재사용한다. core는 절대 `applications.status`를 raw `UPDATE`하지 않는다. 넛지는 advise만, 게이트는 서버측 throw가 유지.
- 근거: `services.ts:145-168`(위임만), `repositories.ts:751/762`(검증 정본), `services.ts:172-186`/`enums.ts:48`(해금 정본).

### D7. 도구 비대화 해소 — 마스터 라우터는 `get_workflow_guide` 확장, 플레이북은 단일 디스패처 (정정됨, CONTRACT C3)
**적대적 리뷰(simplerAlternative) + CONTRACT C3 반영.** 16개 `get_*_playbook`을 개별 도구로 등록하면 `TOOLS` 배열이 비대해져 Trigger 1(description salience)의 전제가 무너진다. `get_workflow_guide`(`tools.ts:591`)가 이미 `workflow_id` `z.enum` 단일 도구로 N개 워크플로우를 serve하는 **정확한 전례이자, C3가 지정한 마스터 라우터 자체**다. 따라서:
- **마스터 라우터** = 신규 도구를 만들지 않고 **`get_workflow_guide`(`tools.ts:591`)를 확장**한다 — `CAREER_ROUTES`에서 `expertSequence`/`verifierSequence`/`loop`를 **additive로 추가 반환**(기존 워크플로우 가이드 반환에 얹음). 신규 라우터 도구(`get_career_playbook`) 안 만듦 +
- **단일 디스패처** `get_playbook({ domain })` (`z.enum`, 16 도메인) — 개별 플레이북을 본문으로 serve +
- **소수 `validate_*`/`get_verifier`** 만 노출.

KNOWLEDGE.md §1 표의 `get_resume_playbook` 등 개별 이름은 **`get_playbook`의 `domain` enum 값**으로 흡수된다(도구 목록에 16개가 뜨지 않음). 면접 kit처럼 status-gate가 붙는 것은 별도 유지 가능.
- 근거: `tools.ts:591-612`(`get_workflow_guide` 단일 enum 디스패처 = C3 마스터 라우터); CONTRACT C3 레지스트리; `KNOWLEDGE.md` §1(라인 28-34 도메인 표).

### D8. 견고화 4전략 (강제 불가를 인정한 뒤의 레버)
신호 수·문맥성·우회비용만이 남는 레버다. ① **트리거 중복**(각 다음 단계는 3 표면 중 ≥2에서 가리킴), ② **anti-gaming 공유 사전** `get_shared_lexicons` 단일 정본(resume/ats/cover-letter/human-voice가 한 사전 참조 → 동의어 치환 회피·중복 유지보수 제거), ③ **자기교정 넛지**(`save_*`가 순수 det hard 실패 시 재유입), ④ **단일 진입 라우터**(`get_workflow_guide` 확장 하나로 진입 단순화). 각 전략이 서로 다른 누락 시나리오를 커버.
- 근거: `KNOWLEDGE.md` §0(라인 18 중복), §3(라인 67 공유 사전 단일 정본), §1(라인 36 라우터).

### D9. KNOWLEDGE.md ↔ Phase B 도구명 정합 (정정됨, CONTRACT C3 레지스트리)
**적대적 리뷰(이름 드리프트) + CONTRACT C3 반영.** KNOWLEDGE.md §2/§3은 일부 도구를 다른 이름으로 적는다. **도구명 단일 정본은 CONTRACT C3 레지스트리**이며, 아래 매핑으로 KNOWLEDGE.md 표기를 그 레지스트리 이름으로 못박는다(Trigger 1 description이 존재하지 않는 도구를 가리키지 않도록):

| KNOWLEDGE.md 표기 | C3 레지스트리 정식 도구명 | 비고 |
|---|---|---|
| `get_verifier_dictionaries` | **`get_shared_lexicons`** | C1 `lexicons.ts` 단일 정본으로 통일 |
| `check_responsiveness`, `run_consistency_check` | **`get_verifier({ id })`** | consistency·responsiveness 포함, 별도 `check_*` 안 만듦 |
| `check_traceability` | **`check_traceability({ artifact_id })`** | det 부분(N_total·placeholder_delta)만 계산하는 compute 도구로 유지 |
| `check_staleness` | **`check_staleness(...)`** | det 날짜비교만, 유지 |
| `get_freshness_anchors`, `get_fact_anchors` | **`get_fact_anchors({ scope })`** | 저장 데이터에서 앵커 serve(추출 아님)로 통일 |
| `get_jd_keywords` | **(도구 없음)** | JD 키워드는 `get_application_context`/`get_job_posting`의 job 레코드에서 **외부 AI가 추출**(추출=ai, CareerMate는 카운트=det). 별도 추출-serve 도구 폐기 |

SCHEMA/VERIFIERS/KNOWLEDGE 문서는 C3 레지스트리를 정본으로 삼는다.

---

## 3. 컴포넌트·책임·경계

| 컴포넌트 | 무엇을 하는가 | 어떻게 쓰는가 | 무엇에 의존 / 경계 |
|---|---|---|---|
| **Trigger 1 — description 트리거 문구** | 마스터 라우터(`get_workflow_guide` 확장) + 신규 지식 도구(`get_playbook`, `get_*_interview_kit`, `get_verifier`, `validate_*`, 일부 `save_*`)의 description 초안: 명령형 첫 문장 + 반환물 + 매칭 `save_*`/`validate_*` 명시 | AI가 도구 목록 스캔 시 항상 보는 1차 신호 | inputSchema/handler/data 스키마는 SCHEMA 문서 소유. `tools.ts` 미수정 |
| **Trigger 2 — server instructions + `AGENTS.md`+`system.ts` 패치 (B-1)** | **MCP server instructions(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가**(C7 ②, §4.7) + 규칙 리스트에 신규 원칙 **#9 1개만** 추가 제안(충돌 규칙 흡수, #10 안 만듦) + `system.ts` #9 미러. 마스터 라우터 `get_workflow_guide` 1회 노출 | 제안 패치 블록만 제시 | 단계별 호출 순서는 여기 두지 않음(그건 `@careermate/workflows`/`get_workflow_guide`). 실제 파일 미수정 |
| **Trigger 3 — 출력 넛지 삽입 지점** | 어느 기존 도구 응답이 어느 신규 도구를 한 줄로 가리킬지 매핑(`get_application_context` 응답의 `next_tool`도 동일 표면) | 응답 text 줄 추가뿐 | 핸들러 제어흐름 추가 없음. 〔B-2〕 `save_*`의 `gateableCheckIds` 재검증(순수 serverComputed)은 core 소유(D5); B-1엔 이 재검증 없음 |
| **End-to-end 목표 시퀀스** | 목표별 read→draft→validate→revise→save 순서; `get_workflow_guide`(확장) 반환 `expertSequence`/`verifierSequence`/`loop` 정의 | 라우터가 시퀀스로 serve | `CAREER_ROUTES` 데이터·검증기 det 로직은 ROUTER/VERIFIERS 문서 소유 |
| **상태 게이팅 배선** | 넛지가 advise하는 범위 vs 서버 throw가 막는 범위 경계 | 기존 2-tier에 연결 | 전이 정본=`repositories.ts`, 해금 정본=core. 신규 메커니즘 없음(D6) |
| **견고화 전략** | pull 모델 한계 명시 후 4전략 논거 | 설계 논거 | 게이밍 사전 내용은 SCHEMA/VERIFIERS 소유 |

---

## 4. 구체 스펙

### 4.1 MCP 도구 계약 (제안 — `TOOLS` 배열 append 대상, 미적용)

모든 신규 도구는 `ToolDef`(`result.ts:18`)이며 핸들러는 `ok(text,data)`/`fail(text)` 반환, `toCallToolResult`(`result.ts:37`)로 ```json text block + `structuredContent`(plain object일 때) 노출, output schema 없음. `openWorldHint=false`는 `apps/mcp` 등록에서 전역 설정(ARCHITECTURE.md §3.2).

> **Phase 표기(CONTRACT C0 — 충돌 시 [CONTRACT.md](CONTRACT.md)가 정본).** (A0)·(A)·(B)·(E)와 §4.4~4.7 패치는 **B-1**(serve·라우팅·소비 배선; 마이그레이션 0·게이트 0). (C) `validate_*`·(D) `save_rejection_review`의 det 재검증·`verifications` 기록은 **B-2**(det 엔진·게이트·마이그레이션 의존, B-1 레지스트리엔 없음).

**(A0) `get_application_context` — 응답 주입 (기존 도구 확장, **최상위 진입점**; CONTRACT C7 ①, B-1)**
- **신규 도구·스키마 변경 없음 — 반환 JSON만 확장.** 외부 AI가 분석·작성 전 거의 항상 부르는 도구라(`tools.ts:443` "가장 중요한 도구" 강제 문구), 응답에 라우트를 실으면 verifier 경로를 사실상 못 피한다 — C7이 지정한 **가장 강한 소비 진입점**.
- 반환에 `{ recommended_route, verifier_sequence, next_tool }` 추가: `recommended_route`=대상 job 상태/맥락으로 고른 `CAREER_ROUTES` 키, `verifier_sequence`=그 루트의 6 검증기 부분집합(id 배열; `fit`은 검증기 아님 — 도메인 `fit-matching`), `next_tool`=다음에 부를 도구명(보통 `get_workflow_guide` 또는 첫 `get_playbook`).
- `readOnly:true` 유지; handler는 기존 컨텍스트 조립에 `CAREER_ROUTES` 매칭 결과만 얹는다(core 단일 진입점 C9.3, 배열 아닌 객체 래핑 C9.1). 출력 끝 💡 넛지(`tools.ts:453`)를 `next_tool`로 가리키게 갱신.

**(A) `get_workflow_guide` — 마스터 라우터 (기존 도구 확장, 진입점; CONTRACT C3)**
- **신규 도구를 만들지 않는다.** 기존 `get_workflow_guide`(`tools.ts:591`)를 확장해 `CAREER_ROUTES`의 `expertSequence`/`verifierSequence`/`loop`를 기존 워크플로우 가이드 반환에 **additive로 얹는다**.
- `description`(트리거 갱신): **"커리어 작업(공고 분석·자소서·면접 준비·오퍼 결정 등)을 시작하기 전에 호출하세요.** 워크플로우 가이드에 더해, 목표에 맞는 전문 플레이북·검증기 순서와 draft→verify→revise 루프를 한 번에 돌려줍니다. 이어서 안내된 첫 플레이북을 `get_playbook`으로 받으세요."
- `inputSchema`(기존 `workflow_id` 확장): 기존 `z.enum` 워크플로우 키에 `analyze_job`/`write_cover_letter`/`prepare_interview`/`offer_decision`/`rejection_iteration` 등 목표 라우트를 흡수, `status_context: z.string().optional()` 추가.
- `readOnly: true`; handler: 기존 워크플로우 serve + `CAREER_ROUTES`에서 매칭 → 시퀀스 additive 반환, core 호출 없음. 출력 끝에 첫 expert + 다음 verifier 넛지.

**(B) `get_playbook` — 단일 디스패처 (D7)**
- `description`(트리거): **"이력서·자소서·면접 답변 등 특정 산출물을 손보기 직전에 호출하세요.** 해당 도메인의 원칙·Do·Don't·Before/After·저장 전 자가검증 항목을 돌려줍니다. 작성 후 저장 전 `get_verifier`(또는 `validate_*`)로 자가검증하고 `save_*`로 저장하세요."
- `inputSchema`: `{ domain: z.enum(['resume','ats','cover-letter','fit-matching','interview-behavioral','interview-technical','salary-negotiation','offer-evaluation-decision','rejection-triage-iteration','linkedin-profile','portfolio','human-writing','company-research','recruiter-screen','networking-referrals','onboarding-first-90-days']) }` (16 enum 고정 — CONTRACT C3. 표기 `linkedin-profile`로 통일, `linkedin` 단독 금지.)
- `readOnly: true`; handler: `@careermate/knowledge`의 `getPlaybook(domain)` + `renderPlaybookMarkdown(domain)` 반환, **core 호출 없음** — `get_writing_style_guide`(`tools.ts:616`) 동형 순수 데이터 serve.

**(C) `validate_cover_letter` — readOnly 무저장 미리보기 (D5; B-2 도구 — det 엔진 의존, B-1 레지스트리엔 없음; C0/C4 v2)**
- `description`(트리거): **"자기소개서 초안을 `save_cover_letter_version`으로 저장하기 직전에 호출하세요.** 슬롭/클리셰 카운트·JD 키워드 커버리지·출처 추적성 같은 `det` 검사 결과(항목별 통과/실패)와, 외부 AI(당신)가 마저 판단할 `ai`/`mixed` 검사 프롬프트를 돌려줍니다. **이 도구는 저장하지 않습니다(미리보기일 뿐 게이트 아님)** — 점검 후 직접 수정하고 `save_cover_letter_version`으로 저장하세요(저장 시 `save_*`가 **순수 serverComputed·`severity:'hard'`(`gateableCheckIds`)** 검사를 서버에서 강제·기록합니다)." 〔주의: `freshness_ratio`·`proper_nouns` 같은 `aiExtractedInput` 혼입 값은 det/hard로 표기 금지 — C2.〕
- `inputSchema`: `{ body: z.string(), job_id: z.string() }` — 단, `det`(traceability/JD 커버리지)는 저장된 `fit_analysis`·`resume`·job posting을 cross-read하므로 handler는 **여러 repo를 조회하는 신규 core fn**이다(thin 아님). `body`는 `MAX_BODY` 길이캡 상속(→ CONTRACT §C9.2). `SHARED_LEXICONS` 참조.
- `readOnly: true` (persists nothing, `activityRepo.log` 없음); handler → `{ detResults, residualAiChecks }`. 실패 시 출력 넛지로 `get_playbook({domain:'cover-letter'})` 재호출 권유.
- 형제: `check_traceability`, `check_staleness` 동일 형태(consistency/responsiveness는 `get_verifier({id})`가 루브릭으로 serve, 별도 `check_*` 안 만듦; C3).

**(D) `save_rejection_review` — mutating + 상태 배선 (D6)**
- `description`(트리거): **"불합격 통보를 받은 직후 호출하세요.** 탈락 사유·피드백·다음 액션을 기록합니다. 상태를 함께 바꾸려면 내부적으로 `update_application_status`(→`setStatus`)를 거쳐 전이 합법성을 보장합니다."
- **(B-2 도구 — `rejection_reviews` 테이블·마이그레이션 의존, B-1 레지스트리엔 없음; C0/C6.)** NO `readOnly`; handler → core service: 저장 직전 `gateableCheckIds`(순수 serverComputed·`severity:'hard'`) 재검증(해당 검사 없으면 생략) → `rejectionRepo.save` → `verifications` 기록 + `activityRepo.log`. 상태 변경 필요 시 `updateApplicationStatus`만 호출(raw UPDATE 금지). `save_fit_analysis`/`save_interview_prep`(`tools.ts:459/499`) 패턴.

**(E) `get_shared_lexicons` (D9 정본명)**
- `description`(트리거): **"자소서·이력서·자기 PR 등 사람이 쓴 듯한 글을 쓰기 직전, 슬롭/클리셰/번역투 사전을 함께 받으려면 호출하세요.** resume/ats/cover-letter/human-voice 검증기가 공유하는 단일 사전입니다."
- `readOnly: true`, `inputSchema:{}`; handler → `SHARED_LEXICONS` 데이터 serve, core 호출 없음.

### 4.2 트리거 중복 불변식 (배선 규칙)

각 "다음 단계"는 **3 표면 중 ≥2에서** 가리켜야 한다. 단일 트리거 의존 금지.

| 다음 단계 | (a) description 끝 | (b) AGENTS.md/system.ts | (c) 출력 넛지 |
|---|---|---|---|
| `get_writing_style_guide`/`get_shared_lexicons` | `get_playbook(cover-letter)` 끝 | 흡수 bullet | `get_application_context`(`tools.ts:453`) |
| 면접 kit 읽기 | kit description | (선택) | `update_application_status` hint(`services.ts:162`) |
| 다음 verifier | `get_workflow_guide`(확장) 끝 | — | `get_workflow_guide` 출력 |

**강제 불가 명시**: 어떤 넛지도 무시 가능하므로, 저장 자체를 막아야 하는 불변(면접 해금)은 넛지가 아니라 `saveInterviewPrep` throw(`services.ts:178`)로만 보장한다.

### 4.3 per-goal end-to-end 시퀀스 (loop = `draft_verify_revise`)

> 표기: `(B-1)`=소비 배선/serve(지금 설계), `(B-2)`=det 미리보기·save 게이트(후속). B-1 시퀀스는 `validate_*`/`check_*` 단계를 외부 AI 자가검증(루브릭 적용)으로 대체해 그대로 성립한다.
- **자소서**: `get_application_context(job_id)`〔B-1: 응답에 `{recommended_route, verifier_sequence, next_tool}` 동봉〕 → `get_workflow_guide({workflow_id:'write_cover_letter'})` → `get_playbook(cover-letter)` + `get_writing_style_guide` + `get_shared_lexicons` → (AI draft) → `get_verifier({id:'human-voice'})` 루브릭 자가검증 〔B-2: `validate_cover_letter`(readOnly det 미리보기)〕 → revise → `save_cover_letter_version`〔B-2: 저장 시 `gateableCheckIds`(순수 serverComputed·hard) 재검증·`verifications` 기록〕.
- **공고 분석**: `get_application_context` → `get_workflow_guide({workflow_id:'analyze_job'})` → `get_playbook(fit-matching)`〔fit은 **도메인**이며 검증기가 아님 — `get_verifier({id:'fit'})` 금지(C3)〕 + (JD 키워드는 `get_application_context`/`get_job_posting` job 레코드에서 외부 AI가 추출=ai) → (draft) → 〔B-2: `check_traceability`(readOnly det)〕 → `save_fit_analysis`〔B-2: 순수 det·hard 게이트〕.
- **면접**: `update_application_status(document_passed+)` → `get_*_interview_kit`(읽기 가능) → (draft) → `save_interview_prep`(core가 `INTERVIEW_UNLOCK_STATUSES`로 게이트, `services.ts:178`).
- **오퍼**: `get_workflow_guide({workflow_id:'offer_decision'})` → `get_playbook(offer-evaluation-decision)`/`get_playbook(salary-negotiation)` 〔B-2: `evaluate_offer`〕.
- **탈락 환류**: 〔B-2: `save_rejection_review`〕 → `get_rejection_patterns`(cross-tab) → 다음 `analyze_job`에 환류.

### 4.4 `AGENTS.md` 제안 패치 블록 (B-1, 미적용 — 리뷰용)

기존 18행 `get_writing_style_guide` bullet을 아래 **신규 원칙 #9 1개로 대체·흡수**(총 bullet 수 불변; CONSENSUS 충돌 규칙도 #9 본문에 흡수, 별도 #10 안 만듦 — CONTRACT C7):

```diff
- - **사람이 쓴 듯한 글**이 필요할 때(자소서·자기 PR·지원 메일)는 작성 직전 `get_writing_style_guide`를 적용한다. 사실·수치·고유명사는 그대로 보존한다.
+ - **저장 전, 관련 루브릭으로 당신이 자가검증하라.** 이력서·자소서·적합도·면접 자료를 만들 때는 목표에 맞는 진입점 `get_workflow_guide`를 먼저 부르고, 안내된 플레이북으로 작성한다(사람이 쓴 듯한 글은 작성 직전 글쓰기 가이드를 함께 적용). 저장 직전에는 verifier의 `det` 검사로 슬롭·키워드 커버리지·사실 추적성을 점검하고, 의미 판단은 당신이 한다 — CareerMate는 카운트만 돌려준다. 전문가 의견이 충돌하면 정본 소유 규칙(CANONICAL_OWNERSHIP)을 우선 적용한다. 사실·수치·고유명사는 그대로 보존한다.
```
- 스타일: bold 명령형 + 평문(AGENTS.md:15). 도구명은 마스터 라우터 `get_workflow_guide` 1개만 노출(AGENTS.md:22). 프라임 디렉티브("두뇌는 당신") 보존: "당신이 자가검증". 자소서 트리거를 잃지 않도록 글쓰기 가이드 적용 문구를 괄호로 보존. 충돌 규칙 흡수로 별도 원칙 신설을 피함(C7).

### 4.5 `system.ts` #9 미러 패치 (B-1, 미적용 — `system.ts:48` 뒤, `:50` 앞)

```diff
   8. 글은 AI 티 안 나게 씁니다.
      - ... 사실·수치·고유명사는 절대 바꾸거나 지어내지 않습니다.
+
+  9. 저장 전 당신이 자가검증합니다.
+     - 자소서·적합도·면접 자료를 save로 저장하기 직전에, 목표에 맞는 `get_workflow_guide`가 안내한 verifier로 점검하세요. CareerMate는 슬롭·클리셰 카운트, JD 키워드 커버리지, 출처 추적 같은 det 검사만 계산해 돌려주고, 의미 판단(이 글이 질문에 답하는가, 톤이 맞는가)은 당신이 합니다. 전문가 의견이 충돌하면 정본 소유 규칙을 우선합니다.

   # 작업 방식 요약
```
- `AGENTS.md` 패치와 길이·framing 동기화(D4).

### 4.6 출력 넛지 삽입 매핑 (미적용 — 응답 text 줄 추가뿐, 제어흐름 변경 없음)

1. `get_application_context`(`tools.ts:453` 기존 💡 다음 줄): "작성을 시작하려면 `get_workflow_guide`로 플레이북과 검증기를 먼저 받으세요."
2. `update_application_status` hint(`services.ts:162`): `document_passed` 이상 시 "면접 준비 자료(kit)를 먼저 읽고 작성하세요" 추가 — `save_interview_prep` 게이트는 서버측 유지.
3. `get_workflow_guide`(확장) 출력 끝: 첫 expert + 다음 verifier 지목.
4. 〔B-2〕 `save_cover_letter_version`/`save_fit_analysis` 핸들러: 순수 serverComputed·hard(`gateableCheckIds`) 실패 시 "저장 전 `validate_*`/`get_playbook`으로 점검하라" 자기교정 넛지(저장은 D5에 따라 거부). `ai`/`mixed` 실패는 차단 없이 넛지만(D5). 〔B-1〕 같은 자기교정 넛지는 게이트 없이 출력 텍스트로만 제공.

### 4.7 MCP server instructions 패치 (B-1, 미적용 — `apps/mcp/src/index.ts:26-27`; CONTRACT C7 ②)

**현재 instructions 문자열(`:27`)은 `get_application_context`+저장만 강조하고 verifier를 한 번도 언급하지 않는다.** server instructions는 `AGENTS.md`를 안 읽는 클라이언트에도 SDK가 전달하므로(C7 ②), 여기에 "저장 전 verifier 경로" 한 문장을 더한다. 도구명 1개(`get_workflow_guide`)만 노출해 비대화를 피하고, 강제가 아니라 안내임을 분명히 한다(B-1=게이트 0).

```diff
       instructions:
-        'CareerMate는 사용자의 로컬 커리어 데이터베이스입니다. 공고 분석이나 자기소개서 작성 전에는 항상 get_application_context를 먼저 호출해 사용자 정보를 가져오고, 결과는 save_fit_analysis / save_cover_letter_version 등으로 다시 저장하세요. 분석과 작성은 당신(AI)이 수행하고, CareerMate는 데이터를 제공·보관합니다. 모든 데이터는 사용자 로컬에만 저장됩니다.',
+        'CareerMate는 사용자의 로컬 커리어 데이터베이스입니다. 공고 분석이나 자기소개서 작성 전에는 항상 get_application_context를 먼저 호출해 사용자 정보를 가져오고(응답의 recommended_route·verifier_sequence·next_tool가 다음 호출을 안내합니다), 결과는 save_fit_analysis / save_cover_letter_version 등으로 다시 저장하세요. 저장하기 직전에는 안내된 verifier 루브릭(get_workflow_guide가 가리키는)으로 당신이 스스로 슬롭·키워드 커버리지·사실 추적성을 점검하세요 — CareerMate는 카운트(det)만 돌려주고 의미 판단은 당신이 합니다. 분석과 작성은 당신(AI)이 수행하고, CareerMate는 데이터를 제공·보관합니다. 모든 데이터는 사용자 로컬에만 저장됩니다.',
```
- 강제 아님(B-1): server instructions는 신호일 뿐 저장을 막지 않는다. 실제 차단은 B-2 `save_*` 게이트(C4). `get_application_context` 응답 주입(§1.0)과 동기화해 "응답이 다음 호출을 안내"라는 같은 framing을 쓴다.

---

## 5. 기존 아키텍처·코드와의 정합

> 공통 정합 보일러플레이트(structuredContent 객체 래핑·`MAX_BODY` 길이캡 상속·core 단일 진입점·zod 재사용·본문 미누수·정규식 안전·2-프로세스/WAL·`openWorldHint=false`)는 **재서술하지 않고 → [CONTRACT.md](CONTRACT.md) §C9 참조**. 아래는 이 문서(소비 경로) 고유의 정합 포인트만 남긴다.

- **소비 경로의 thin/non-thin 경계**: 〔B-1〕 `get_application_context`(주입 확장)·`get_workflow_guide`(확장)·`get_playbook`·`get_shared_lexicons`는 (기존 context 조립 외) core det 호출 없는 데이터 serve(`get_writing_style_guide` 동형). 〔B-2〕 반면 `validate_*`의 det(traceability/JD 커버리지)는 저장된 `fit_analysis`·`resume`·job posting을 cross-read하므로 **여러 repo를 조회하는 신규 core fn**이다(thin 아님) → core 단일 진입점은 C9.3을 따르되 이 cross-read 경계가 소비 경로 고유 결정.
- **(B-2) det 결과를 `validate_*`가 영속하지 않는 비용**: `validate_*`는 readOnly·무저장(C4 v2 — `verifications`·`activityRepo.log` 금지)이라 det 결과를 어디에도 남기지 않으므로, `save_*` 시점의 **`gateableCheckIds`(순수 serverComputed·`severity:'hard'`) 재계산이 게이트·기록의 단일 지점**(D5). 즉 검증=`validate_*` readOnly preview, 강제·`verifications` 기록=`save_*` — 한 도구가 둘을 겸하지 않는다. 본문 미누수(C9.5)·길이캡(C9.2)·정규식 안전(C9.6)이 `save_*` 핸들러에도 그대로 적용된다.
- **상태 게이팅 배선**: 전이 정본 `repositories.ts:751/762`, 해금 정본 `services.ts:178`(D6). 새 `save_*`는 `updateApplicationStatus` 한 경로만 재사용(raw UPDATE 금지). 이 문서는 넛지(advise)와 서버 throw(enforce)의 **경계 배선**만 소유하며, 마이그레이션·테이블 DDL은 TODO/SCHEMA 문서가 소유(C6).

---

## 6. 미해결 질문 / 리스크

- **R1. 넛지 예산 vs 중복 충돌.** 한 응답당 넛지 1개 상한이 필요한가? 트리거 중복 불변식(§4.2)과 충돌하므로, **표면 간 중복은 두되 한 표면 내에서는 ≤1개**로 분산하는 절충안 채택(잠정). 검증 필요.
- **R2. `det` 게이밍 + det 사칭 금지(C2).** regex slop 카운트는 동의어 치환으로 우회 가능 — **det 0 ≠ human-voiced**. det는 명백한 슬롭만 걸러내고, "사람 목소리인가"의 최종 판단은 `ai` 검사(외부 AI)가 한다는 점을 모든 verifier description에 명시할 것. **또한 `aiExtractedInput`이 섞인 값은 절대 det/hard/게이트로 표기 금지(C2)**: `freshness_ratio`(recent-fact 매핑=ai), `proper_nouns`/`titles`/`credentials`를 자유텍스트에서 추출(=한국어 NER=ai)은 `mixed`이며, 날짜 산술·집합 비교 같은 det 부분만 `serverComputed`로, 추출은 `aiExtractedInput`으로 출처 태깅한다. 따라서 §4.3·server instructions의 "사실 추적성·키워드 커버리지" 카운트는 det지만, 그 **입력 키워드/앵커가 ai 추출이므로 hard 게이트로 승격 금지**.
- **R3. `validate_*` 우회 (B-2).** C4 v2로 `validate_*`=readOnly 무저장 미리보기, 게이트·`verifications` 기록=`save_*` 소유로 분리해(한 도구가 둘 겸 안 함) 모순을 해소했으나, soft det·모든 `ai`/`mixed` 검사는 여전히 advise뿐이고 `gateableCheckIds` 후보는 1~2개뿐(설계 의도, CONTRACT C4). 어디까지 `severity:'hard'`(=순수 serverComputed)로 승격할지는 VERIFIERS 문서가 검사별로 결정. **B-1에는 이 게이트 자체가 없다.**
- **R4. `status_context` 없는 라우터.** `get_workflow_guide`(확장)가 status 없이 호출되면 면접 kit를 시퀀스에 넣되, 저장은 `save_interview_prep` 게이트가 막는다(advise/enforce 분리). 라우터가 status 기반으로 시퀀스를 잘라 돌려줄지는 ROUTER 문서 결정.
- **R5. description-only 클라이언트에서 Trigger 2 무력화.** `AGENTS.md`를 안 읽는 클라이언트에서 `get_workflow_guide`(확장)의 "작업 시작 전 호출"과 `get_application_context`의 "가장 중요한 도구" 카피가 경쟁하지 않게 조율 필요 — 라우터는 "목표가 정해지면", context는 "작업 시작 시 맥락"으로 역할 분리.
- **R6. 도구 비대화.** D7(마스터 라우터 = `get_workflow_guide` 확장 + `get_playbook` 디스패처 1)로 16개 개별 등록과 신규 라우터 도구를 피해 salience를 보존. kit/verifier/validate 노출 수는 최종 등록 시 재점검.

---

## 7. 관련 문서 (cross-links)

- [`KNOWLEDGE.md`](KNOWLEDGE.md) §0(소비=pull 3트리거+루프, 직접 상위), §1(마스터 라우터·16 도메인·8 상태), §2(6 검증기 det/ai), §3(`get_shared_lexicons` 단일 정본·anti-gaming), §4(`hardGate`·`rejection_reviews` 선행 의존).
- Phase B **SCHEMA** 문서 — `packages/knowledge` 데이터 스키마, 배포 번들 포함 확인, 테이블 DDL.
- Phase B **VERIFIERS** 문서 — `RubricCheck`/`DetSpec` det 로직, `validate_*` 내용, det 성능(컴파일 캐싱).
- Phase B **ROUTER** 문서 — `CAREER_ROUTES`·`get_workflow_guide`(확장) per-goal 시퀀스 데이터.
- [`docs/dev/ARCHITECTURE.md`](../../dev/ARCHITECTURE.md) §2/§3.2/§5/§8 — single core entry, `openWorldHint=false`, 본문 누수 금지, knowledge layer 규칙.
- [`AGENTS.md`](../../../AGENTS.md) 라인 15/18/22 — 패치 톤·흡수 대상·도구명 노출 최소.
- `packages/prompts/src/system.ts` `:11`/`:46-48`/`:50` — 원칙 리스트, #8 인접, #9 미러 위치.
- `apps/mcp/src/index.ts` `:26-27` — MCP server instructions 문자열(현재 verifier 언급 0; C7 ② "저장 전 verifier 경로" 추가 대상, §4.7).
- `packages/mcp-tools/src/tools.ts` `:443`(`get_application_context` 호출 강제)/`:453`(💡 넛지)/`:591`(`get_workflow_guide`)/`:619` — 트리거 라이브 템플릿; `result.ts:18/28/32/37` — `ToolDef`/`ok`/`fail`/`toCallToolResult`.
- `packages/core/src/services.ts` `:145-168`(`updateApplicationStatus` 위임)/`:172-186`(`saveInterviewPrep` 게이트); `packages/db/src/repositories.ts` `:751`/`:762`(전이 검증 정본); `packages/shared/src/enums.ts` `:48`/`:67-91`(`INTERVIEW_UNLOCK_STATUSES`·`canTransitionStatus`).
