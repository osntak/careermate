# 루프 엔진 — CareerMate Career-OS (Phase B 설계)

> draft → verify → revise → re-verify 반복의 프로토콜 설계. **CareerMate 내부에는 LLM이 없다.** 루프를 실제로 도는 두뇌는 외부 AI이고, CareerMate는 (1) 어느 단계에 어느 verifier를 걸지 **라우팅**하고, (2) `det` 체크를 LLM 없이 **계산**해 객관 신호를 주고(B-2), (3) `save_*` 시점에 *순수 det·hard*만 **게이팅**할 뿐 의미판단(`ai`/`mixed`의 ai 부분)은 외부 AI에 위임한다(B-2). 관련 Phase A 지식: [truthfulness](../knowledge/verifiers/truthfulness.md) · [cover-letter](../knowledge/cover-letter.md) · [resume](../knowledge/resume.md) · [KNOWLEDGE.md](KNOWLEDGE.md). 현행 아키텍처: [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).
>
> **횡단(cross-cutting) 결정은 [CONTRACT.md](CONTRACT.md)가 정본이다(충돌 시 우선).** grade 3값·도구 레지스트리 이름·게이트 강제력·`verifications` 테이블·enum은 CONTRACT C2~C6에서 확정되며, 이 문서는 재정의하지 않고 참조한다.
>
> **Phase 분리(CONTRACT [C0](CONTRACT.md#c0--phase-분리-b-1-serve-only--b-2-detgatepersist-v2-신설-최상위) 정본):** 이 문서가 설계하는 것의 **대부분은 Phase B-2**(det 엔진·`validate_*` compute·save-time 게이트·`verifications` 적재)다. **Phase B-1**은 *게이트 0*이며, LOOP_ENGINE 관점에서 B-1의 산출은 (a) `get_verifier({id})`가 serve하는 **루브릭 데이터**, (b) `get_workflow_guide`가 `CAREER_ROUTES.verifierSequence`로 반환하는 **검증 순서 안내**, (c) "저장 전 외부 AI가 스스로 자가검증" 넛지뿐이다. **B-1에는 `det` 재계산도, save 차단도, `verifications`/`verification_run` 기록도 없다.** 아래 각 결정·스펙에 **(B-1)**/**(B-2)** 단계를 표기한다.

---

## 1. 목적·범위

**이 문서가 설계하는 것**

- 외부 AI가 따르는 4-페이즈 반복 절차(draft→verify→revise→re-verify)와, 그 안에서 CareerMate가 제공하는 **정지 신호**의 정의. **B-1**은 이 절차를 `get_verifier` 루브릭 + `get_workflow_guide` 순서로 **안내**만 하고, 정지 신호의 *det 계산*은 **B-2**다.
- "조기 종료(looks good)" 방지: verifier가 객관 신호를 내기 전엔 통과로 보지 않는다. B-1은 이를 외부 AI **자가검증 안내**로, B-2는 `validate_*` det 신호 + `save_*` 게이트로 강제한다.
- "무한 생성" 방지: 같은 실패가 반복되면 생성을 멈추고 사용자에게 쉬운 한국어로 확인을 요청한다(절차 권고 — B-1 안내, B-2 신호).
- "단계별 게이팅": 어느 산출물·어느 status에 어느 verifier가 걸리는지를 `CAREER_ROUTES.verifierSequence`로 **데이터로** 선언한다(새 제어흐름 아님 — 데이터 serve는 **B-1**).

**이 문서가 설계하지 않는 것 (의도적 비목표)**

- **CareerMate가 루프를 실행하지 않는다.** 반복·종료 판단은 외부 AI가 자기 컨텍스트에서 한다. CareerMate는 매 호출마다 **stateless 계산기 + 체크리스트**일 뿐 상태머신을 들지 않는다(리뷰의 simplerAlternative 채택).
- **CareerMate는 `ai` 체크의 의미판단을 흉내내지 않는다.** critical의 절반 이상이 `[ai]`이므로(아래 §2), `det`로 강제할 수 있는 부분과 외부 AI 자기보고에 의존하는 부분을 **타입 레벨에서 솔직히 분리**한다.
- 코드·스키마·도구·`AGENTS.md`는 모두 **제안 스펙**이며 Phase B에서 적용하지 않는다.

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### D1. 정지 신호는 `det`(CareerMate 계산)와 `ai`(외부 AI 자기보고)로 **분리**하고, 절대 합치지 않는다

루프의 통과 판정은 단일 공식이 아니라 두 축이다:

- `detClear: boolean` — CareerMate가 LLM 없이 결정론으로 계산한 모든 `hard`+`det` 체크가 통과. **`mixed` 체크의 det 부분(detLogic)도 여기 포함**되지만, mixed의 ai 부분(aiPrompt)은 강제하지 않고 보고만 받는다.
- `aiReported: Record<checkId, count | 'pending'>` — 외부 AI가 보고한 `ai`/`mixed`-ai 체크 결과. CareerMate는 이 값을 **기록만** 하고 판정하지 않는다.

`verdict='pass'`는 **`detClear === true` AND 모든 `ai`/`mixed`-ai 체크가 0으로 *보고됨*** 일 때만 성립한다. "보고됨 ≠ 검증됨"임을 문서·도구 출력에 명시한다.

> **출처태깅 정직성(CONTRACT [C2](CONTRACT.md#c2--rubrickcheckgradedetspecdetai-경계-데이터b-1-계산b-2) v2):** `detClear`에 들어가는 모든 값은 `serverComputed`(외부 입력 0으로 완전 계산)여야 한다. 외부 AI가 의미추출해 주입한 값(`aiExtractedInput`)이 **한 방울이라도** 섞이면 그 체크는 `det`/`hard`/게이트로 표기 금지다. 구체적으로 `freshness_ratio`(recent-fact 매핑=ai)·`proper_nouns`/`titles`/`credentials`를 자유텍스트에서 추출(=한국어 NER=ai)·`keyword_coverage`의 키워드 집합(=ai 주입)은 모두 `mixed`이며, 날짜 산술·집합 비교 같은 det 부분만 `serverComputed`로 두고 hard 게이트(=`gateableCheckIds`) 승격은 금지한다. 따라서 `detClear`의 실제 멤버는 좁다(§D7 정직성 단서).

**근거 (리뷰 mustFix 반영, 가정 아님):** [truthfulness.md §2](../knowledge/verifiers/truthfulness.md) 표에서 critical 게이트 **C1·C2·C3·C5는 모두 `[ai]`**(truthfulness.md:25-29), `[det]`는 **C7(placeholder), C10(traceability) 둘뿐**이다. 게다가 C10 `traceability = (N_total − N_unanchored − N_unverified)/N_total`인데 `N_unanchored`는 C1의 `[ai]` 보고값이다(truthfulness.md:25,34). 따라서 **"CareerMate가 critical=0과 traceability=1.0을 LLM 없이 직접 계산한다"는 불가능**하다. 초안의 주장(det로 critical=0 확정)은 폐기하고, "det로 강제 가능한 것은 C7 placeholder 보존뿐, critical=0·traceability=1.0은 `ai-pending`"으로 정정한다. 이는 KNOWLEDGE.md §2/§0의 det 정직성 비목표를 지키는 결정이다.

### D2. 정지 조건은 verifier마다 다르며, 각 verifier의 `RubricCheck.severity`/`grade`에서 파생한다

단일 종료 공식을 강제하면 도메인의 정직한 분리가 깨진다. `StopCondition`을 verifier별로 둔다:

- **truthfulness** = `{ detGate: [C7], aiCriticalGate: [C1,C2,C3,C5], traceabilityCheckId: C10, traceabilityMin: 1.0 }` — det는 C7만 강제, 나머지는 ai-보고 0건이어야 pass.
- **표면 위생 verifier(human-voice, ats-compat의 det 부분)** = `advisory` — 점수+코칭만, hard-gate 아님.

**근거:** truthfulness.md:36 "critical 등급 C1·C2·C3·C5 … 단 1건이라도 발견 시 불합격"이되 그 항목은 `[ai]`(:25-29). cover-letter.md:85 "치명(반드시 통과)=R2·R3·R4·R5·R6 … 치명 하나라도 fail이면 overallPass=false"이지만 이는 **도메인 lint(`lint_cover_letter`)** 의 채점이다(cover-letter.md:116,135). resume.md:63 "모든 항목 통과(score 1.0)는 합격 보장이 아니다 … 점수+코칭으로 다룬다."

### D3. **도메인 lint와 cross-cutting verifier를 타입·루프 레벨에서 분리한다** (리뷰 mustFix — 구조 결함 수정)

초안은 cover-letter R2~R6과 resume R-rubric을 `StopCondition`의 carrier로 써서 `runVerifierPass(verifierId,...)`에 태웠다. 그러나 **verifier는 정확히 6개**(CONTRACT C3 고정 enum: `truthfulness`/`ats-compat`/`human-voice`/`consistency`/`recency-staleness`/`responsiveness-on-target`; KNOWLEDGE.md §2)이고 **cover-letter·resume는 verifier가 아니라 도메인**이다. `CAREER_ROUTES.write_cover_letter.verifierSequence`에 `cover-letter`는 없고 `expertSequence`에 playbook으로만 있다 → R2~R6 가중 게이트를 루프에 태울 verifier가 시퀀스에 없어 정지조건이 떠버린다.

**정정:** 두 평가축을 분리한다.

- **루프 안(verifierSequence)**: 6개 cross-cutting verifier만. 이들의 `severity:'hard'` 체크가 루프의 정지조건(C2 severity = soft/hard).
- **루프 밖(domain self-coaching)**: cover-letter `lint_cover_letter`, resume `validate_resume_draft`는 도메인 작성 도구로서 1패스 코칭만 반환하고 **루프 반복을 트리거하지 않는다**. 단, 자소서의 허위수치(R5)·resume 수치는 본질이 사실성이므로 그 검사는 **truthfulness verifier로 흡수**(C1 수치 앵커링)해 루프 게이트에 합류시킨다.

**근거:** KNOWLEDGE.md §2(verifier 6개) vs §5(도메인). cover-letter.md:116/135 "`lint_cover_letter`는 regex/count/ratio만 자동채점, ai-judge 위임" — 도메인 lint임을 명시. resume.md:63 surface-hygiene.

### D4. 무한 생성 방지의 종료조건은 **의미적 동일성이 아니라 단조 비증가 카운터**로 보장한다 (리뷰 mustFix — 종료 보장)

초안은 `unresolvedSameAsLast`(직전 critical 집합 동일)를 유일 종료조건으로 삼았으나, AI가 문장을 재배열하면 `span`/`hits`가 바뀌어 "새 실패"로 오인 → 영원히 defer에 도달 못 함. 따라서 동일성 키를 **불안정한 `hits.span`이 아닌 안정적 `checkId` 집합**으로 정의하되, 그것에만 의존하지 않고 **`criticalRemaining`의 *개수*가 `maxRevisions`회 동안 줄지 않으면 무조건 `defer_to_user`** 라는 의미-독립 종료조건을 1급으로 둔다. 카운트는 AI가 글자를 바꿔도 깨지지 않는다.

**근거:** truthfulness.md:47 "2회 반복 후에도 미앵커가 남으면, 해당 문장을 산출물에서 보류하고 사용자에게 확인을 요청한다(무한정 생성 금지)" — 단, 이는 *미앵커* 한정 규칙이지 글로벌 상수가 아니므로 `maxRevisions`를 `StopCondition`별 필드로 둔다(아래 D5).

### D5. `maxRevisions`는 글로벌 상수가 아니라 **실패 모드별** 값이다 (리뷰 mustFix — 과잉일반화 수정)

해결 가능성이 0인 실패 모드(`gap_concealment`, 저장 데이터에 없는 사실)는 더 돌려도 못 푼다 → `maxRevisions: 1`로 즉시 `defer`. 미앵커 수치는 `2`. 표면 위생(advisory)은 애초에 revise 루프 대상이 아니라 1패스 코칭. 단일 `DEFAULT_MAX_REVISIONS=2`는 truthfulness의 미앵커 규칙에서 온 것이라 그 맥락에만 기본값으로 쓰고, verifier 타입이 `maxRevisions`를 덮어쓴다.

**근거:** truthfulness.md:46 갭은폐는 "`[확인 필요]`로 되돌리고 사용자에게 질문"(루프 반복 무의미). resume.md:63 "이진 통과 아님"(revise 루프·maxRevisions 미적용).

### D6. 단계별 게이팅은 **새 게이팅 메커니즘 없이** 기존 두 단계에 배선한다

`get_workflow_guide({goal, status_context})`(C3 = 기존 tools.ts:591 **확장**, 신규 라우터 도구 안 만듦)가 `CAREER_ROUTES`에서 `expertSequence`·`verifierSequence`·`loop`을 조회해 권고만 한다(라우팅 ≠ 게이팅). 실제 status 해금은 기존 `INTERVIEW_UNLOCK_STATUSES` 서버 게이트를 그대로 재사용한다.

**근거:** [services.ts:172-186](../../../packages/core/src/services.ts) `saveInterviewPrep`가 `!INTERVIEW_UNLOCK_STATUSES.includes(app.status)`면 persist 전 throw(services.ts:178). [enums.ts:48](../../../packages/shared/src/enums.ts) `INTERVIEW_UNLOCK_STATUSES=[document_passed, interview, final_passed]`. [enums.ts:79-91](../../../packages/shared/src/enums.ts) `canTransitionStatus`/`assertStatusTransition`. [services.ts:160-165](../../../packages/core/src/services.ts) `updateApplicationStatus`가 `interview_unlocked`+`hint`로 출력 넛지 — 새 게이트는 이 hint 어휘를 확장하지 새 제어흐름을 만들지 않는다.

### D7. 조기 종료의 **마지막 안전망은 `validate_*` 메타가 아니라 `save_*` 핸들러의 순수-det·hard 재계산**이다 (리뷰 mustFix — 게이트 위조 차단; CONTRACT [C4](CONTRACT.md#c4--게이트-강제력-b-1게이트-0--b-2명시-게이트) v2 정합) **(B-2)**

초안의 "save_* 메타 게이트(`if meta.status!=='passed' throw`)"는 무력하다: `validate_*`는 `readOnly`(persists nothing)라 결과를 어디에도 남기지 않으므로, 메타는 (a) 외부 AI 입력이거나 (b) save 시점 재계산이다. (a)면 AI가 `status:'passed'`를 그냥 써넣어 위조, (b)면 critical 절반이 `[ai]`라 LLM 없이 재계산 불가. 어느 쪽도 안전망이 못 된다.

**정정 — C4 v2 강제력 정본(Codex CRITICAL 2 해소)에 맞춰 책임을 도구별로 가른다:**

1. **`validate_*` = readOnly·무저장 미리보기(B-2):** `validate_*`는 `det` 신호를 *계산해 돌려줄 뿐* **아무것도 적재하지 않는다** — `verifications` 행 기록도, `activityRepo.log('verification_run')`도 **하지 않는다**(readOnly 힌트의 진실 유지, C4 v2·C9-8). 영속·게이트는 `validate_*`가 아니라 **`save_*` 핸들러**의 몫이다. 한 도구가 "검증 미리보기"와 "강제·기록"을 겸하지 않는다.
2. **`save_*` = 순수-det·hard 재계산 + 영속(B-2):** save_* 핸들러는 **저장 직전 core에서 체크를 다시 돌리되**(LLM 없음), 거부(`fail()`)는 **CONTRACT C4의 명시 집합 `gateableCheckIds`** — 즉 "순수 `serverComputed`(외부 AI 주입 입력 없이 저장 산출물·저장 데이터만으로 완전 계산 가능)이고 `severity='hard'`인 체크"에 **한정**한다. 그런 체크가 위반이면 throw, **통과하면 그때 `verifications` 1행을 기록**한다(적재는 save 경로에서만). **`ai` 체크와 `mixed`-ai 부분, 그리고 외부 AI가 주입한 키워드 집합에 의존하는 det(예: `keyword_coverage`)는 절대 차단하지 않는다 — advise + 출력 넛지만 한다.** 핵심 사실성(truthfulness C1·C2·C3·C5)은 본질이 `ai`라 hard 게이트로 만들면 자가신고 위조가 가능한 명예 시스템이 되므로(false-pass), 차단 대신 **강한 넛지 + 기존 "이 수치 확인됨?" save 확인**으로 처리한다.

> **정직성 단서(C4 v2 / Codex MAJOR 2):** 현재 `gateableCheckIds` 후보는 1~2개(예: C7 placeholder 보존)뿐이다 — 순수 det+hard로 실제 save를 막을 수 있는 체크가 거의 없다. 따라서 이 게이트는 "검증 게이트"라기보다 **det lint + advisory**이며, B-1에는 이 재계산조차 없다(자가검증 안내만).

**근거:** [services.ts:185](../../../packages/core/src/services.ts) `activityRepo.log` 패턴(모든 *mutation*=save 후 기록 — 따라서 readOnly `validate_*`엔 로그가 붙지 않는다). truthfulness.md:66 메타에 검증 요약 저장 요구. **다만** truthfulness.md:66은 그 메타를 *상태 전환(`applied`+)* 게이트 용도로 정의하므로(리뷰 inconsistent 지적), "save 거부 게이트"는 truthfulness.md가 직접 뒷받침하지 않는 신규 메커니즘임을 명시하고, **저장 거부는 순수-det·hard(`gateableCheckIds`) 재계산에 한정**(C4)한다.

---

## 3. 컴포넌트·책임·경계

### 3.1 LoopProtocol (문서 절: draft→verify→revise→re-verify)

- **무엇:** 외부 AI가 따르는 4-페이즈 절차. (1) **draft** = 도메인 플레이북(`get_playbook`)+공유 사전(`get_shared_lexicons`)으로 작성 — serve는 **B-1**, (2) **verify** = route의 `verifierSequence` 순서대로 루브릭을 받아(`get_verifier` — **B-1**) 외부 AI가 자가검증; det 신호가 필요하면 `validate_*`/`check_*` 호출(**B-2**), (3) **revise** = 실패를 4분류(날조/과장/미검증정밀도/갭은폐)→삭제·하향정렬·표식, (4) **re-verify** = 동일 루브릭 전체 재실행. **B-1에서는 (2)가 `get_verifier` 루브릭만으로 도는 자가검증이고, `validate_*` det compute는 B-2에서 추가된다.**
- **어떻게:** verifier 순서 = `먼저 truthfulness(사실 게이트) → 그 다음 human-voice/ats(표면) → 마지막 responsiveness/consistency(동문서답·모순)`.
- **경계:** 절차의 "판단"(무엇이 날조인가)은 외부 AI 몫. "신호"(critical 몇 건, traceability 얼마, 카운트 줄었나)는 CareerMate 제공. **루프 런타임·종료 판정은 CareerMate 밖**(외부 AI 컨텍스트).

### 3.2 StopConditionResolver (verifier별 정지 조건 + 합성 규칙)

- **무엇:** 각 Verifier의 `checks`에서 `StopCondition`을 파생하고, `verifierSequence`에 hard-gate와 advisory가 섞였을 때의 **합성 규칙**을 명시한다.
- **합성 규칙(본문에 박음, 리뷰 missing 반영):** `verifierSequence` 중 **hard-gate verifier(truthfulness 등)의 critical 게이트가 전부 충족돼야 `pass`**, **표면 verifier(human-voice/ats det)는 점수만 누적하고 루프 반복을 트리거하지 않는다.** advisory verifier가 `score<1.0`이라는 이유로 루프를 계속 돌리는 모드붕괴를 금지한다. **단 "loop의 pass 판정"과 "save_* 차단"은 별개다(C4 v2):** save_*는 `gateableCheckIds`(순수 `serverComputed`·hard) 체크만 거부하고, truthfulness critical 같은 `ai`/`mixed`-ai 게이트는 차단하지 않고 강한 넛지로만 둔다(자가신고 위조 불가 영역). 루프의 정지조건 데이터·`StopCondition` 파생은 그 자체로 verifier 루브릭(**B-1** serve)에서 나오지만, 이를 *계산*해 신호로 돌려주는 `validate_*`/`runVerifierPass`는 **B-2**다.
- **경계:** advisory verifier의 `StopCondition.kind='advisory'`는 `hardGate:false`로 표기. `ai` 항목의 통과는 AI 자기보고에 의존(강제 불가).

### 3.3 LoopVerdict 규칙 (데이터로 serve, core 평가기 아님) **(B-2 동봉; 규칙 데이터 자체는 B-1 루브릭 유래)**

- **무엇:** 매 반복 후 적용되는 판정 규칙을 **데이터(JSON)로** `validate_*` 응답에 동봉한다(동봉 도구가 B-2). 외부 AI가 그 규칙을 읽어 `pass | revise | defer_to_user`를 스스로 적용한다. B-1에서는 같은 규칙 골격을 `get_verifier` 루브릭이 정적으로 serve하므로, 외부 AI가 `validate_*` 없이도 자가검증 판정을 적용할 수 있다.
- **어떻게(리뷰 simplerAlternative 채택):** CareerMate는 `LoopVerdict`를 산출하는 **신규 core 평가기를 두지 않는다.** validate_*는 `det` per-check 결과 + 정지조건 명세("이 값들이 0/1.0이어야 함")만 stateless로 돌려준다. `revision`/`unresolvedSameAsLast` 비교 같은 반복 간 상태는 외부 AI가 보유한다(어차피 AI가 루프를 돌므로 자연스럽다). CareerMate가 stateless하게 신뢰성 있는 revision 카운터를 들 수 없으므로 의도적 선택.
- **경계:** `pass` 판정이라도 `ai` 체크가 `'pending'`이면 진짜 pass 아님 — verdict는 `det-clear, ai-pending`을 구분 표기. CareerMate는 `ai` 의미판단을 절대 흉내내지 않는다.

### 3.4 VerifierRouter (마스터 라우터 배선) **(B-1)**

- **무엇:** `get_workflow_guide({goal, status_context})`(C3 마스터 라우터 = 기존 도구 확장, 신규 라우터 도구 안 만듦)가 `CAREER_ROUTES`에서 `expertSequence`·`verifierSequence`·`loop`을 **additive** 조회해 "이 단계에서 어느 플레이북으로 쓰고 어느 verifier로 검증하라"를 한 번에 반환. 순수 데이터 serve라 마이그레이션·게이트 0(B-1). 소비 강화는 **`get_application_context` 응답의 `{recommended_route, verifier_sequence, next_tool}` 주입**(CONTRACT [C7](CONTRACT.md#c7--소비-경로-정본-소유consumptionmd--강화codex-major-3))이 담당하며, 이는 CONSUMPTION.md 정본 소관이다.
- **경계:** 라우팅은 데이터 조회일 뿐 게이팅이 아님. 실제 status 해금은 `saveInterviewPrep`류 서버 게이트가 담당. 라우터는 권고만 한다.

### 3.5 SaveGate (save_* det-재계산 + verifications 적재) **(B-2)**

- **무엇:** `save_cover_letter_version`·`save_fit_analysis`·`save_interview_prep`·`save_rejection_review` 등이 저장 직전 core에서 체크를 재실행(LLM 없음)하되, **거부(throw)는 CONTRACT C4의 `gateableCheckIds`(순수 `serverComputed`이고 `severity='hard'`인 체크)에만** 한정한다. `ai`/`mixed`-ai 체크와 외부 AI 주입 키워드 의존 det는 차단하지 않고 출력 넛지로만 강하게 권고한다. **영속·게이트는 전적으로 이 save_* 경로의 책임**이다(C4 v2): 통과 시에만 `verifications` 1행을 기록하고, readOnly `validate_*`는 아무것도 적재하지 않는다(§D7). `verification_run` activity는 save 성공 시 부수 감사 로그일 뿐, "validate_*가 호출됐는가"의 교차확인 용도가 **아니다**(validate_*는 무저장이라 호출 흔적을 남기지 않음).
- **deferred 처리(리뷰 simplerAlternative 채택):** `deferred` 산출물은 **DB에 저장하지 않는다.** 저장 거부 + "사용자 확인 질문 텍스트"만 반환 → 대시보드 오염 0, `allow_deferred` 플래그·배지 UX 불필요. 사용자가 답을 주면 그때 `passed`로 재저장.
- **경계:** 순수-det 재계산은 critical의 `[ai]` 부분을 검증하지 못한다(한계 명시 — 그래서 ai는 차단이 아니라 넛지). 저장 거부 게이트는 transition legality(C4: `repositories.ts`의 `assertStatusTransition`, services.ts 아님)와 **독립** — status enum은 단계를, SaveGate는 산출물의 순수-det·hard 품질을 막는다.

---

## 4. 구체 스펙

> 모두 **제안 스펙**이며 Phase B에서 적용하지 않는다. 도구 계약은 [result.ts:18](../../../packages/mcp-tools/src/result.ts) `ToolDef`를 따른다(`name`·`title`·`description`·`inputSchema:ZodRawShape`·`readOnly?`·`handler`). 핸들러는 `ok(text,data)`/`fail(text)` 반환, `toCallToolResult`가 payload를 ```json 텍스트 블록 + `structuredContent`(plain object일 때, C9-1)로 노출. output schema 없음.
>
> **Phase 표기(C0):** §4.4 `get_workflow_guide` 확장만 **(B-1)**(serve-only·게이트 0)이고, §4.1 데이터 스키마는 **데이터=B-1 / det 계산 로직=B-2**, §4.2 `runVerifierPass`·§4.3 `validate_*`·§4.5 `verifications` 적재·SaveGate는 모두 **(B-2)**다. B-2 도구(`check_*`/`validate_*`/`save_rejection_review`/`evaluate_offer`)는 **B-1 도구 레지스트리에 없다**(C3).

### 4.1 데이터 스키마 (`packages/knowledge`, 일부 `packages/shared`) **(데이터=B-1 / 계산 로직=B-2)**

```ts
// 정지 조건 — verifier별로 다름 (D2/D3)
type StopCondition =
  | { kind: 'truthfulness';
      detGate: string[];            // ['C7'] — CareerMate가 LLM 없이 강제
      aiCriticalGate: string[];     // ['C1','C2','C3','C5'] — 외부 AI 0건 보고 필요
      traceabilityCheckId: 'C10';
      traceabilityMin: 1.0;
      maxRevisions: number }        // 미앵커=2, gap_concealment=1 (D5)
  | { kind: 'all_hard_pass';        // consistency/responsiveness 등 cross-cutting; 순수-det·hard만 게이트(C4)
      hardCheckIds: string[];
      maxRevisions: number }
  | { kind: 'advisory';             // human-voice/ats det, resume·cover-letter 도메인 (D3)
      hardGate: false;
      disclaimer: string };         // '통과=합격 아님, 코칭일 뿐'

// 루프 판정 규칙 (데이터로 serve, core 평가기 없음 — 3.3)
interface LoopVerdictRule {
  verdict: 'pass' | 'revise' | 'defer_to_user';
  // pass:  detClear === true AND 모든 aiReported[checkId] === 0
  // defer: criticalRemaining 개수가 maxRevisions회 동안 비감소 (D4, 카운터 기반)
  // revise: 그 외
}

type RevisionLabel =
  | 'fabrication' | 'inflation' | 'false_precision' | 'gap_concealment'; // truthfulness.md:42-46

const DEFAULT_MAX_REVISIONS = 2;  // 미앵커 기본값; StopCondition.maxRevisions가 덮어씀

// 단계별 게이팅 데이터 (D6) — 새 제어흐름 아님
interface CareerGoalRoute {
  goal: string;
  statusContext?: string;        // 예: 'document_passed+'
  expertSequence: string[];      // playbook ids (루프 밖 도메인 작성)
  verifierSequence: string[];    // verifier ids — 6개 cross-cutting만 (D3)
  loop?: 'draft_verify_revise';
}
```

`CAREER_ROUTES` 예시 (verifierSequence에 도메인 lint를 넣지 않음 — D3):

```ts
analyze_job:        { expertSequence: ['fit-matching','company-research'],
                      verifierSequence: ['truthfulness','recency-staleness','responsiveness-on-target'],
                      loop: 'draft_verify_revise' }
write_cover_letter: { expertSequence: ['cover-letter','human-writing'],
                      verifierSequence: ['truthfulness','human-voice','ats-compat','responsiveness-on-target','consistency'],
                      loop: 'draft_verify_revise' }
prepare_interview:  { statusContext: 'document_passed+',
                      expertSequence: ['interview-behavioral'],
                      verifierSequence: ['truthfulness','consistency'],
                      loop: 'draft_verify_revise' }
```

### 4.2 `runVerifierPass` (core 결정론 패스 — stateless) **(B-2)**

[services.ts](../../../packages/core/src/services.ts)에 추가하는 core fn. validate_* 도구들의 공통 엔진.

```ts
function runVerifierPass(
  verifierId: string,                          // 6개 cross-cutting verifier 중 하나
  artifact: { text: string; kind: 'cover_letter'|'fit'|'resume'|'interview' },
  ctx: { jobId?: string }                      // ← previousArtifactText는 받지 않음 (아래 주의)
): VerifierPassResult;

interface VerifierPassResult {
  checks: Array<{
    id: string; grade: 'det'|'ai'|'mixed'; severity: 'soft'|'hard';  // C2 grade 3값·C2 severity
    pass: boolean | 'delegated';               // det는 boolean; ai/mixed-ai는 'delegated'
    value?: number; hits?: Array<{ snippet: string }>;  // span 노출 안 함 (D4 안정성)
    aiPrompt?: string;                          // ai 또는 mixed의 의미판단 부분을 외부 AI에 위임
  }>;
  detSummary: { detHardFails: string[]; traceability?: number; placeholderDelta?: number };  // 순수-det·hard 위반만 게이트(C4)
  stopCondition: StopCondition;
  verdictRule: LoopVerdictRule;                 // 데이터; CareerMate는 verdict를 산출하지 않음
}
```

- `det` 체크만 JS로 실행(regex/count/threshold/keyword_coverage/staleness/traceability의 det 부분). `ai` 체크는 `pass:'delegated'`+`aiPrompt`로 반환. **NO LLM 호출.**
- **C7 placeholder_delta 데이터 경로(리뷰 mustFix):** `previousArtifactText`는 **외부 AI 입력으로 받지 않는다**(검증 대상이 직전 텍스트를 스스로 제출하면 안티-게이밍 무력화). cover_letter는 `ctx`의 `cover_letter_id`로 **core가 DB에서 `version_no-1` 본문을 직접 끌어와** delta를 계산한다. **단** [schema.ts:91-99](../../../packages/db/src/schema.ts) `cover_letter_versions`에는 직전버전 포인터가 없고 `version_no` 순서만 있으므로, 신뢰 가능한 delta는 **draft가 이미 저장된 경우에만** 가능하다. 아직 저장 안 한 draft에 대한 readOnly validate에서는 C7을 `pass:'delegated'`로 외부 AI에 넘기고 "초안 미저장 → delta 미검증" 플래그를 단다(시점 불일치 솔직 처리).

### 4.3 validate_* 도구들 (read-only compute) **(B-2)**

`check_traceability` / `check_staleness` / `validate_cover_letter` — 모두 `readOnly: true`, **진짜 무저장**(C3 정본 도구명; C4 v2·C9-8). consistency·responsiveness 검증기에는 **전용 도구를 신설하지 않고**, 루브릭은 `get_verifier({ id })`가 serve(외부 AI가 의미판단 — **B-1**)하고 det 부분은 위 `check_*` compute가 담당한다(C3: 검증기별 별도 check_* 안 만듦). 핸들러는 `runVerifierPass`를 호출해 `VerifierPassResult`를 `ok(text,data)`로 **돌려주기만 한다 — `verifications` 적재도, `activityRepo.log('verification_run')`도 하지 않는다**(Codex CRITICAL 2 해소: readOnly 힌트 진실 유지). 영속·게이트·`verification_run` 로깅은 전적으로 `save_*` 핸들러의 몫이다(C4 v2, §D7·§3.5).

`validate_cover_letter` 계약:

| 필드 | 값 |
|------|-----|
| `name` | `validate_cover_letter` |
| `title` | 자기소개서 자가검증(det) |
| `readOnly` | `true` |
| `inputSchema` | `{ text: z.string(), job_id: z.string().optional(), locale: z.enum(['ko','en']), count_mode: z.enum(['with_space','no_space','byte']).optional() }` (cover-letter.md:116 lint 입력 재사용) |
| `description` | "자기소개서를 `save_cover_letter_version`으로 저장하기 직전에 호출하세요. 슬롭·허위수치·키워드 커버리지를 CareerMate가 det로 세어 드립니다. 의미 판단(동문서답·격상)은 당신이 직접 해 critical 0을 확인한 뒤 저장하세요." |
| output 넛지 | `revise`면 "💡 `get_playbook({ domain: 'cover-letter' })`로 다시 다듬은 뒤 재검증하세요" / `defer_to_user`면 "💡 미앵커 수치 N건이 수정 후에도 남았습니다 — 사용자에게 쉬운 말로 확인하세요" |

> description은 [tools.ts:619](../../../packages/mcp-tools/src/tools.ts) `get_writing_style_guide`·[tools.ts:443](../../../packages/mcp-tools/src/tools.ts) `get_application_context`의 imperative 트리거 패턴을 답습. 출력 넛지는 [tools.ts:453](../../../packages/mcp-tools/src/tools.ts) `💡 …` 패턴.

### 4.4 `get_workflow_guide` (마스터 라우터 — 기존 도구 확장) **(B-1)**

[tools.ts:591](../../../packages/mcp-tools/src/tools.ts) `get_workflow_guide` **확장**(C3: 신규 라우터 도구 안 만듦, additive 반환, 스키마 변경 없음). `readOnly: true`. 기존 `workflow_id` enum은 유지하고 신규 `goal?`을 **추가 optional 입력**으로 둔다(둘 중 하나, 충돌 없음 — C3). 개별 플레이북은 `get_playbook({domain})` 단일 디스패처가 serve(C3, B-1).

- `inputSchema`: 기존 `workflow_id` enum **유지** + 신규 `goal?`을 **추가 optional**로(C3, 둘 중 하나·충돌 없음): `{ workflow_id?: <기존 enum>, goal?: z.enum(['analyze_job','write_cover_letter','prepare_interview','evaluate_offer','rejection_iteration']), status_context: z.string().optional() }`. 스키마 자체는 additive 확장이라 기존 호출자 불변.
- handler: `goal`이 오면 `CAREER_ROUTES[goal]` 조회 → `{ expertSequence, verifierSequence, loop }`를 기존 가이드 응답에 **additive** 부착(core 불필요, 순수 데이터 serve — [tools.ts:616](../../../packages/mcp-tools/src/tools.ts) `get_writing_style_guide`처럼).
- `description`: "사용자 목표를 정하면 가장 먼저 호출하세요. 어떤 플레이북으로 작성하고 어떤 verifier로 어떤 순서로 자가검증할지(draft→verify→revise 루프 포함)를 돌려줍니다."
- 출력: `verifierSequence` 첫 verifier의 `get_verifier({id})`(B-1 루브릭)를 넛지하고, B-2가 출시되면 해당 `validate_*`/`check_*` det compute도 함께 가리킨다.

### 4.5 enum·테이블 변경 (제안만, 적용 안 함) **(B-2 — 마이그레이션 필요)**

- **검증 메타 영속 = 단일 `verifications` 테이블(C5, 소유=VERIFIERS.md). (B-2)** 이전 초안의 "verification 테이블 0건" 입장은 **폐기**한다. det 산출·외부 AI 자기보고·게이트 상태는 `cover_letter_versions`/`fit_analyses`에 ALTER로 흩뿌리지 않고 정규화된 append-only `verifications` 테이블(C5 정본 컬럼: `{ id, artifact_type, artifact_id, artifact_content_hash, resume_content_hash, jd_hash, rubric_id, computed_json, ai_reported_json, metrics_json, gate_status, checked_at }`)에 적재한다. **이 테이블의 컬럼·소유는 VERIFIERS.md/CONTRACT C5가 확정**하며, 루프 엔진은 그 행을 *쓰는* **`save_*` 경로만** 정의한다(readOnly `validate_*`는 적재하지 않음 — C4 v2).
- **`verification_run` activity kind 추가**(C6) = **save 부수 감사 로그**. `activityRepo.log` 종류 enum에 한 줄 추가(컬럼 변경 없음). 이 로그는 `verifications` 테이블의 *대체가 아니라* save 성공 시 남기는 감사 보완이다. **"validate_* 호출이 실제로 있었는가"의 교차확인 용도가 아니다** — `validate_*`는 무저장이라 호출 흔적을 남기지 않으므로(C4 v2), 그 위에 안전망을 세울 수 없다(§D7·§6.1).
- 이 문서 범위의 신규 스키마 작업은 `verifications` 테이블 신설(VERIFIERS 소유) + `verification_run` activity kind 추가뿐이다. 마이그레이션 규칙(forward-only append·`_meta.schema_version` 1회 게이트·`BEGIN/COMMIT` 래핑)은 → **CONTRACT.md §C6/§C9 참조**(여기서 재서술하지 않음).
- **`save_rejection_review` 등 status를 함의하는 새 save_*** 는 절대 `applications.status`를 직접 쓰지 않고 `updateApplicationStatus`를 경유해 `canTransitionStatus` 불변식을 지킨다(enums.ts:79).

### 4.6 `AGENTS.md` 제안 패치 블록 (적용하지 않음) **(B-1 — 소비 배선, 소유=CONSUMPTION.md/C7)**

> 이 패치는 **소비 경로 정본인 CONSUMPTION.md(C7)** 소관이며, 여기서는 루프 엔진 관점의 *제안*만 적는다. C7 v2의 핵심 강화는 AGENTS bullet이 아니라 **가장 강한 기존 진입점에 박는 것**이다: (1) `get_application_context` 응답에 `{recommended_route, verifier_sequence, next_tool}` 주입(외부 AI가 분석·작성 전 거의 항상 부르는 도구라 verifier 경로를 사실상 못 피함), (2) MCP server instructions(`apps/mcp/src/index.ts:26`)에 "저장 전 verifier 경로" 추가(AGENTS를 안 읽는 클라이언트에도 전달). 아래 AGENTS bullet은 **보조** 신호다. **이 셋은 모두 B-1(게이트 0·자가검증 안내)** 이다.

기존 규칙 리스트(약 10 bullet)에 **신규 원칙 #9 1 bullet 추가**(C7: 별도 #10 안 만들고 #9 본문에 흡수, 기존 `get_writing_style_guide` bullet에 자가검증을 접어 노출 최소화). 실제 AGENTS.md는 미수정(제안 블록만). **B-1 정직성: CareerMate는 det를 *세어 강제*하지 않고**(그건 B-2), 외부 AI가 `get_verifier` 루브릭으로 **스스로** 검증하도록 안내만 한다:

```markdown
- **산출물을 저장하기 전에 당신이 자가검증하라.** 자소서·적합도·면접 자료를
  저장하기 직전, `get_workflow_guide`(또는 `get_application_context`가 실어 주는
  `verifier_sequence`)로 받은 verifier 순서대로 `get_verifier` 루브릭에 비추어
  스스로 점검한다 — 슬롭·허위수치·동문서답·모순·격상 같은 의미 판단은 당신이 한다.
  critical이 0이 될 때까지 고쳐 쓰고(작성→검증→수정), 2번 고쳐도 안 풀리는 사실은
  지어내지 말고 사용자에게 쉬운 한국어로 확인을 요청하라.
```

원칙 준수: bold imperative 리드, 마스터 라우터 `get_workflow_guide`/`get_application_context`만 노출(개별 `get_verifier`는 도구 description=트리거 #1에 위임), "당신이 자가검증" 프레이밍으로 프라임 디렉티브("두뇌는 당신, 저장은 CareerMate") 보존, 단계 리스트는 넣지 않음(그건 라우터 소관). 동일 취지를 [prompts/system.ts](../../../packages/prompts/src/system.ts) `CAREERMATE_SYSTEM_PROMPT` 원칙 리스트에 "#9 저장 전 자가검증"으로 동기화(#1 맥락 먼저·#2 저장·#8 AI 티와 같은 길이; 별도 #10 금지·:48~:50 미러 — C7).

### 4.7 DEFER 사용자 질문 템플릿 (조기종료/무한생성 방지 산출) **(데이터=B-1 / `defer_to_user` 산출 경로=B-2)**

`defer_to_user` 시 외부 AI가 채울 슬롯. `criticalRemaining`의 `RevisionLabel`별 쉬운 한국어 질문 골격을 데이터로 제공:

- `fabrication`/`false_precision` → "이 부분 수치/사실의 출처를 알려주시겠어요? (예: 'OO 지표가 X에서 Y로 바뀐 게 맞나요?')"
- `gap_concealment` → "이 항목은 저장된 정보로는 채울 수 없어요. 직접 알려주시면 반영할게요."

기술 용어(traceability, job_id 등) 노출 금지(AGENTS.md "기술 용어… 노출하지 말고"). 사용자가 값을 주면 save 도구로 보관 후 해당 문장만 재삽입·재검증.

---

## 5. 기존 아키텍처·코드와의 정합

> 공통 보일러플레이트(structuredContent 객체 래핑·`MAX_BODY` 길이캡 상속·`@careermate/core` 단일 진입점·zod 재사용·본문 미누수·정규식 1회 컴파일·2-프로세스/WAL 안전·`openWorldHint=false`)는 → **CONTRACT.md §C9 참조**. 아래는 루프 엔진 **고유**의 정합 포인트만 남긴다.

- **TOCTOU·SaveGate det-재계산(이 문서 고유) (B-2):** MCP 프로세스와 apps/web REST 두 writer가 같은 SQLite(WAL)를 공유하므로, `validate_*`(readOnly·무저장 compute)와 `save_*`가 별개 트랜잭션이라 그 사이 산출물이 바뀌는 **TOCTOU**가 가능하다. SaveGate가 **저장 직전 `gateableCheckIds`(순수 `serverComputed`·hard) 체크만 재계산**(D7·C4 v2)하므로 "검증 시점 텍스트 ≠ 저장 시점 텍스트"여도 *저장되는* 텍스트로 다시 det를 돌려 게이트가 성립한다 — `validate_*` 결과 메타를 그대로 믿지 않는(애초에 무저장이라 믿을 메타도 없는) 설계라 TOCTOU에 강건하다. (`ai`/`mixed`-ai 부분은 재계산 불가라 차단 대상이 아님 — §6.)
- **검증 메타 영속(이 문서 고유) (B-2):** det 산출·ai 자기보고·게이트 상태는 단일 `verifications` 테이블(C5, 소유=VERIFIERS.md)에 **`save_*` 경로에서만** 적재하고(readOnly `validate_*`는 무저장 — C4 v2), `verification_run` activity는 save 부수 감사 보완이다(§4.5). 컬럼/마이그레이션 규칙은 → CONTRACT.md §C5/§C6/§C9 참조.
- **게이팅(이 문서 고유):** 새 메커니즘 없이 능력 해금은 [services.ts:178](../../../packages/core/src/services.ts) `saveInterviewPrep` throw-before-persist + [enums.ts:48](../../../packages/shared/src/enums.ts) `INTERVIEW_UNLOCK_STATUSES`를, 전이 합법성은 **`repositories.ts`의 `assertStatusTransition`**(C4 정본, services.ts 아님)을 답습한다 — **이 둘은 B-1에서도 유지되는 기존 게이트**이며 새 검증 게이트가 아니다(C4 v2: B-1 검증 게이트 0). 신규 save_*는 raw UPDATE 없이 `updateApplicationStatus`→`setStatus` 한 경로만 재사용. SaveGate det 게이트(`gateableCheckIds` 재계산, **B-2**)는 이 전이 합법성과 **독립**(status enum=단계, SaveGate=순수-det·hard 품질).

---

## 6. 미해결 질문 / 리스크

1. **`ai` 자기보고 위조의 잔여 구멍.** D7의 save_* 순수-det·hard 재계산(B-2)은 `det` 부분만 강제한다. critical C1·C2·C3·C5는 `[ai]`라 CareerMate가 재검증할 수 없고, 외부 AI가 `ai` 체크를 건너뛰고 "0건"이라 보고하면 막을 객관 신호가 없다. 게다가 `validate_*`는 무저장(C4 v2)이라 "검증을 정말 돌렸는가"조차 호출 흔적으로 확인할 수 없다 — `verification_run` activity는 save 성공 시에만 남는 부수 로그라 *판단 정확성*은 물론 *호출 사실*의 안전망도 못 된다. 단일 AI 한계이며 [CONSENSUS_ENGINE.md](#) 다중 AI 교차검증의 동기.
2. **det 거짓양성 비용이 verdict에 미반영.** traceability·slop count·한국어 어절 n-gram(cover-letter.md:75 R7)·동의어 우회 가능 사전(R3)은 본문이 "거짓양성 가능"을 경고한다. 멀쩡한 산출물이 regex에 걸려 풀 수 없는 critical로 오인→maxRevisions 소진→불필요한 `defer` 폭주 위험. low-confidence det를 `block`이 아니라 `warn`/`ai-위임`으로 강등하는 신뢰도 등급 규칙이 미설계.
3. **루프 상태 소유권의 취약성.** revision 카운트·직전 critical-set을 외부 AI가 보유하므로(3.3), AI가 매번 `revision=0`을 거짓으로 넘기면 defer 분기가 영원히 안 걸린다. CareerMate가 stateless하게 막을 신호 없음(설계상 trade-off로 수용; 무한생성 방지를 "엔진 강제"가 아닌 "체크리스트 권고"로 둔 대가).
4. **advisory+hard-gate 합성의 운영 검증.** §3.2 합성 규칙을 데이터로 박았으나, 실제 6 verifier의 severity 분포가 의도대로 hard/advisory로 갈리는지는 [VERIFIERS.md](#)(작성 예정)의 `RubricCheck` 정본이 확정돼야 검증된다.
5. **C7 시점 불일치의 사용성.** 미저장 draft validate에서 C7을 ai-위임으로 넘기면(§4.2), 가장 흔한 "저장 전 자소서 검증" 경로에서 placeholder 안티-게이밍이 약해진다. save 시점 det-재계산이 이를 일부 보완하나 완전하진 않음.

---

## 7. 관련 문서 (cross-links)

- [CONTRACT.md](CONTRACT.md) — 횡단 결정 정본(C2 grade 3값·C3 도구 레지스트리·C4 게이트 강제력·C5 `verifications` 테이블·C6 enum·C9 공유 정합). 충돌 시 우선.
- [KNOWLEDGE.md](KNOWLEDGE.md) §0(3중 트리거 + draft→verify→revise 루프) · §1(마스터 라우터 `get_workflow_guide`) · §2(6개 verifier·det/ai 분리)
- [knowledge/verifiers/truthfulness.md](../knowledge/verifiers/truthfulness.md) §2-§3 — 정지 조건의 정본(C1·C2·C3·C5=`[ai]` critical, C7·C10=`[det]`; 2회 반복 후 사용자 확인 보류). 무한생성 방지 분기의 직접 출처.
- [knowledge/cover-letter.md](../knowledge/cover-letter.md) §3·§5 — R2~R6 가중 게이팅과 `lint_cover_letter`(도메인 lint, verifier 아님)의 입출력 계약·ai-judge 위임 표기.
- [knowledge/resume.md](../knowledge/resume.md) §3 — "통과=합격 아님" surface-hygiene → advisory `StopCondition`의 근거.
- VERIFIERS.md (Phase B, 작성 예정) — `RubricCheck`/`DetSpec`/`Verifier` 타입의 정본. 루프 엔진은 그 `grade`·`severity`를 정지조건으로 소비.
- EXPERTS.md (Phase B, 작성 예정) — `ExpertPlaybook`/`CAREER_ROUTES.expertSequence`의 정본.
- CONSENSUS_ENGINE.md (Phase B, 작성 예정) — `ai`-judge를 복수 외부 AI로 교차검증하는 상위 루프(§6.1의 단일 AI 한계 확장).
- [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md) §2/§3/§5/§8 — 계층·등록·결과 계약·패키지 의존.
