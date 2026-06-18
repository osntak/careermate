# 합의 엔진 (전문가 충돌 해소) — CareerMate Career-OS (Phase B 설계)

> **횡단 결정은 [CONTRACT.md](CONTRACT.md)가 정본(충돌 시 우선)이다.** 이 문서는 그 결정(특히 C0 Phase 분리(B-1 serve-only / B-2 det·gate·persist)·C8 co-violation 보류·C3 도구명/enum·C7 소비경로·C9 정합)을 재정의하지 않고 참조한다. 이 문서의 B-1 산출물(CANONICAL_OWNERSHIP·TIEBREAK_RULES serve)은 **C0의 B-1(serve-only, 마이그레이션 0·게이트 0)**에 속하고, co-violation 탐지·run_consensus_check는 **C0의 B-2**로 이월된다.
>
> 전문가 플레이북과 교차검증기가 같은 산출물에 상충하는 지시를 낼 때, CareerMate가 **LLM 없이** (1) 정본 소유권(canonical ownership)을 데이터로 못박아 충돌을 원천 차단하고, (2) 남은 충돌의 우선순위·공존대역·타이브레이크를 **선언적 규칙으로 serve**한다. **Phase B-1 범위는 여기까지다** — 2차 det 동시위반(co-violation) 탐지는 det가 '진짜 충돌(XOR)'을 구조적으로 변별하지 못하므로 후속 Phase로 보류한다(CONTRACT C8). 의미판단(어느 초안이 옳은가, 이 문장이 스터핑인가, 두 신호가 진짜 트레이드오프인가)은 전부 외부 AI 몫이다. **CareerMate 내부에 LLM은 없다.**
>
> 관련 Phase A 지식: [KNOWLEDGE.md §3 정본 소유권](KNOWLEDGE.md) · [salary-negotiation](../knowledge/salary-negotiation.md)(정본: 협상 전술) · [recruiter-screen](../knowledge/recruiter-screen.md)(참조: 상속) · [ats-compat](../knowledge/verifiers/ats-compat.md) · [human-voice](../knowledge/verifiers/human-voice.md) · [responsiveness-on-target](../knowledge/verifiers/responsiveness-on-target.md) · [human-writing](../knowledge/human-writing.md). 현행 아키텍처는 [docs/dev/ARCHITECTURE.md](../../dev/ARCHITECTURE.md).
>
> 이 문서는 **설계안**이다. 스키마·도구·마이그레이션은 **제안 스펙일 뿐 Phase B에서 적용하지 않는다(코드 미수정)** — 실제 구현은 승인 후 별도 단계다(CONTRACT 정본과 동일). AGENTS.md 등 사용자-대면 파일은 **제안 패치 블록**으로만 보여줄 뿐 실제로 수정하지 않는다.

---

## 1. 목적·범위

### 설계하는 것

- **정본 소유권 레지스트리(1차 방어선)**: KNOWLEDGE §3 표(협상 전술·가중 오퍼 스코어카드·30-60-90·탈락 진단·공유 사전)를 데이터 상수 `CANONICAL_OWNERSHIP`으로 1:1 못박아, 한 주제에 두 권위가 모순 조언을 내는 것을 **런타임 전에** 차단한다. **이것이 Phase B-1 합의 엔진의 핵심 산출물**이다(CONTRACT C8).
- **타이브레이크 규칙 테이블**: 두 검증기 신호가 상충할 때의 **공존대역(co-satisfaction band)**과, 대역이 공집합일 때만 적용하는 **우선순위(priorityOrder)**를 선언적 데이터(`TIEBREAK_RULES`)로 serve한다. 우선순위 적용·문장 재작성은 외부 AI 몫.

### 설계하지만 Phase B-1에서는 보류하는 것

- **동시 위반(co-violation) 탐지**: 두 검증기의 det 체크가 동시에 fail인 후보를 카운트해 신호로 주는 2차 방어선은 **Phase B-1 보류**다(CONTRACT C8). det는 "둘 다 빨간불"은 셀 수 있어도 그것이 '진짜 충돌(한쪽을 고치면 다른 쪽이 악화되는 XOR 트레이드오프)'인지 '그냥 둘 다 부실'인지를 **구조적으로 변별하지 못하므로**, det로 충돌을 사칭하지 않고 후속 Phase로 이월한다. Phase B-1은 CANONICAL_OWNERSHIP(1차 방어선) + 타이브레이크 규칙을 외부 AI에 **serve**하는 데까지만 한다. 동시 위반의 카운팅·표시 설계는 아래(§4.3 이하)에 후속 Phase 참조용으로 남겨둔다.
- **소비 경로**: 충돌 규칙을 도구 description·AGENTS.md 제안 패치·출력 넛지의 동일한 3중 트리거에 싣는다(CONTRACT C7, KNOWLEDGE §0과 일관).

### 설계하지 않는 것 (명시적 비범위)

- **충돌의 의미적 판정**: "이 키워드가 스터핑인가 자연스러운가"는 ai 체크로 외부 AI에 위임한다. CareerMate는 절대 의미를 판단하지 않는다(프라임 디렉티브).
- **다중 모델 자동 오케스트레이션**: CareerMate는 로컬 stdio MCP 서버이고 내부 LLM도 외부 네트워크도 없으므로 Claude/Codex/Gemini를 **호출할 수 없다**. 다중 초안 비교(과거 초안의 `draft_variants` 테이블·`submit/compare` 도구)는 효용 대비 비용이 커 이 문서에서 **분리·보류**한다(§6, [LOOP_ENGINE.md](LOOP_ENGINE.md)로 이관 검토). 사용자가 여러 초안을 비교하고 싶으면 기존 `cover_letter_versions.source`(schema.ts) 컬럼으로 버전을 구분하고 각 버전에 verifier를 돌리면 된다 — 신규 테이블·도구 불필요.
- **검증기 자체의 정의**: 각 verifier의 det/ai 체크 정의와 임계값은 [VERIFIERS.md](VERIFIERS.md)(Phase B)와 Phase A 지식 문서가 **단일 출처**로 소유한다. 합의 엔진은 임계 숫자를 **자체 보유하지 않고** check id로만 참조한다.
- **신규 상태 enum / 게이팅 메커니즘**: 충돌 해소는 산출물 품질 게이트이지 8단계 상태 전이가 아니다(§4.5).
- **`hardGate` 정형 필드**: recency/recruiter-screen verifier의 선행 의존성이며 KNOWLEDGE §4가 별도 트랙으로 소유한다. 이 문서의 산출물이 아니다(§6 참조).

---

## 2. 핵심 설계 결정 (+ 코드 근거)

### 결정 1 — 정본 소유권을 데이터로 못박아 충돌을 원천 차단 (1차 방어선)

모든 `ExpertPlaybook`은 자기 도메인의 **비-정본 주제**에 대해서는 조언을 직접 내지 않고 `ConflictTopic.ownerDomain`을 가리키는 reference 포인터만 갖는다. 충돌 해소의 1차 방어선은 런타임 타이브레이크가 아니라 **애초에 한 주제에 두 권위가 없게 만드는 것**이다.

- **rationale**: 같은 주제에 두 도메인이 각자 조언하면 외부 AI의 선택이 비결정적이 되고 게이밍·모순·중복 유지보수가 생긴다(KNOWLEDGE §3 명시 목적). [recruiter-screen.md](../knowledge/recruiter-screen.md)는 이미 R-루브릭과 본문에서 "디플렉션/레인지 분기는 salary-negotiation에 위임된 **단일 권위**를 따른다"(recruiter-screen.md:86, :99)고 선언했다. 이를 데이터 구조로 승격하면 충돌 대부분이 런타임 전에 사라진다.
- **코드 근거**: KNOWLEDGE.md §3 표(L61-67) → `CANONICAL_OWNERSHIP` 1:1 시드. recruiter-screen.md:56("salary-negotiation의 조건부 규칙을 상속"), :99("단일 권위 출처"). 데이터-모듈 패턴은 `packages/workflows/src/definitions.ts`의 `WorkflowDefinition` const 배열을 차용.

### 결정 2 — verifier 충돌은 "공존대역 우선, 공집합일 때만 우선순위"의 2단계

ATS 키워드 압박 vs human-voice 슬롭/스터핑의 충돌은 먼저 **둘 다 만족하는 교집합 대역**을 찾는다(진실한 사실에 JD 용어를 녹이되 스터핑 상한을 넘지 않음). 교집합이 공집합일 때만 명시적 우선순위로 타이브레이크한다.

- **rationale**: ats-compat와 human-voice·human-writing은 **"사실 보존·스터핑 금지"를 공유**하므로(ats-compat C10 = 단일 키워드 6회 초과·비율 6% 초과 금지, human-voice C8/C9 = 사실·고유명사 100% 보존 하드 실패) 대부분 교집합이 존재한다. 진짜 충돌은 드물고, 대역이 비었을 때만 우선순위가 필요하다. 우선순위 최상위를 **사실(truthfulness)**에 두는 것은 두 문서가 공통으로 "사실은 절대 손상 금지"라 못박은 것과 정합한다(human-voice §3 "C8·C9는 단 1건이라도 위반 시 즉시 하드 실패", human-voice.md:54).
- **코드 근거**: ats-compat.md C8(L26, JD 키워드 커버리지 **M/N ≥ 0.75**, Jobscan 75%/스위트스폿 80%), C10(L28, 스터핑 상한). human-voice.md C1(L22, 슬롭 **100단어당 1.5개 이하**), C8/C9(L29-30, `severity:"hard"`, L79). responsiveness-on-target.md C8(L37, JD 필수 요건 **≥ 0.80**), C3(L32, 질문 키워드 교집합 **≥ 0.60**). human-writing.md R10(L78, 키워드 커버리지 `soft`), R6(L74, 증거 밀도 `gate`).

> ⚠️ **리뷰 반영(임계값 단일 출처)**: 타이브레이크 규칙은 위 임계 숫자(0.75·1.5·0.80 등)를 **자체 보유하지 않는다**. 각 verifier 문서/데이터가 임계를 단일 출처로 갖고, `TIEBREAK_RULES.detTrigger`는 **"checkX가 fail AND checkY가 fail이면 이 규칙 적용"**으로만 선언한다. 그렇지 않으면 KNOWLEDGE §3가 막으려는 "중복 유지보수"를 합의 엔진이 스스로 재생산한다.

### 결정 3 — CareerMate는 "판정"하지 않고 "규칙 serve"만 한다 (동시 위반 카운팅은 B-1 보류)

Phase B-1에서 합의 엔진은 **정본 포인터 + 타이브레이크 규칙을 serve**만 한다 — 어느 초안이 옳은지 고르지 않는다. det 충돌 탐지("두 det 체크가 같은 산출물에서 동시에 fail"인 객관 사실 카운팅)는 **Phase B-1 보류**(CONTRACT C8)이며, 아래 서술은 후속 Phase로 이월된 설계 근거다.

- **rationale**: 프라임 디렉티브(두뇌=외부 AI, 저장·제공=CareerMate)와 "내부 LLM 없음" 비목표를 지키려면 충돌의 의미적 판정은 외부 AI 몫이어야 한다. det는 "두 체크가 동시에 빨간불"이라는 사실만 셀 수 있다. 이는 모든 verifier 문서가 지킨 det/ai 정직한 등급 구분(responsiveness-on-target.md "det/D · ai/H", human-voice.md `severity:'soft'|'hard'`, ats-compat.md L32 "CareerMate는 원문 추출과 본 루브릭만 제공")의 합의 엔진 버전이다.
- **코드 근거**: KNOWLEDGE.md L53("det(CareerMate가 LLM 없이 카운트) vs ai(외부 AI 의미판단)"). spine `validate_*` 패턴("NEW core fn이 det 체크만 결정론 실행…residual ai 체크는 외부 AI가 마무리"). `packages/mcp-tools/src/result.ts:18` `ToolDef` + ok/fail(판정 없이 신호+데이터 반환).

> ⚠️ **리뷰 반영(동시 위반 ≠ 충돌)**: 두 det 신호 동시 fail은 대부분 "초안이 그냥 부실함"(ats 커버리지 낮음 + 슬롭 높음)이지 두 권위가 **상충(trade-off)**한다는 뜻이 아니다. 진짜 충돌은 "하나를 고치면 다른 하나가 악화"되는 인과적 트레이드오프인데 동시 위반 카운트는 그것을 직접 측정하지 못한다. 따라서 (a) `run_consensus_check`는 동시 위반을 **"충돌 후보(candidate)"**로만 표시하고 "이는 단순히 둘 다 미완성일 수도 있음 — 트레이드오프 여부는 당신이 판단"이라는 ai 면책 문구를 항상 동봉한다. (b) det는 **충돌 부재를 증명하지 못한다**(false-negative): 임계 미만이어도 실제 상충이 있을 수 있으므로, 충돌 0건일 때도 "det 동시 위반은 없으나 트레이드오프 여부는 ai로 최종 확인 권고" 문구를 출력해 잘못된 안심을 막는다.

### 결정 4 — (후속 Phase) co-violation 탐지는 별도 실행 경로가 아니라 verifier det 결과의 얇은 후처리

> ⚠️ **Phase B-1 보류(CONTRACT C8)**: 아래는 co-violation 탐지를 후속 Phase에서 구현할 때의 설계 원칙이다. B-1 산출물은 CANONICAL_OWNERSHIP·TIEBREAK_RULES serve까지다.

`co_violation`은 개별 verifier det 실행의 **부산물**이지 별도 계산이 아니다. 후속 Phase의 후처리는 LOOP_ENGINE 소관의 `validate_*`가 반환한 per-check det 결과 배열에서 "block/critical 등급 체크 둘 이상이 동시 fail"을 탐지하는 후처리로 흡수한다.

- **rationale**: verifier det를 두 번 돌리지 않아(성능) 2-프로세스 환경의 불필요한 SQLite read 부담을 줄이고, core 진입점도 하나로 유지한다.
- **코드 근거**: ARCHITECTURE.md §2(both surfaces call same core fn). spine `consumptionPathModel`의 draft→verify→revise 루프에서 `run_consensus_check`는 verify 단계에 위치.

### 결정 5 — 충돌 규칙은 3중 트리거로 노출 (강제 아님, "가장 잘 보이는 신호등")

(1) `get_workflow_guide`(마스터 라우터, CONTRACT C3 확장)가 도메인 시퀀스와 함께 그 조합에서 가능한 충돌의 타이브레이크 규칙을 inline 반환, (2) AGENTS.md 제안 패치에서 신규 원칙 **#9 본문에 흡수**해 "정본을 따르고 verifier가 충돌하면 우선순위 규칙을 따르라"를 자가검증 규칙과 한 불릿으로 운반(별도 #10 안 만듦, CONTRACT C7), (3) `validate_*` 출력의 💡 넛지가 정본 도메인 플레이북·우선순위 규칙을 가리킴.

- **rationale**: 합의 엔진도 pull+신뢰 모델 위에 있다(KNOWLEDGE §0). 외부 두뇌를 강제할 수단이 없으므로 견고함은 "올바른 경로를 가장 잘 보이게"에서 온다.
- **코드 근거**: KNOWLEDGE.md §0 L12-18 3중 트리거. `packages/mcp-tools/src/tools.ts:453`(get_application_context의 💡 넛지), :591-612(get_workflow_guide 마스터 라우터). `updateApplicationStatus`의 hint 어휘(services.ts) 확장.

---

## 3. 컴포넌트·책임·경계

> **선행 의존성 명시**: `packages/knowledge` 패키지·tsconfig alias(`@careermate/knowledge`)·빌드 배선은 **아직 존재하지 않으며** Phase B의 [EXPERTS.md](EXPERTS.md)/[VERIFIERS.md](VERIFIERS.md)에서 먼저 생성된다. 아래 컴포넌트는 그 위에 추가된다.

### CanonicalOwnershipRegistry (packages/knowledge)

- **무엇을**: KNOWLEDGE §3 정본 소유권 표를 데이터 상수 `CANONICAL_OWNERSHIP: ConflictTopic[]`로 보유. 각 항목은 `ownerDomain`(정본)·`referenceDomains`(참조 전용)·`deferralRule`(상속 문구).
- **어떻게**: `getCanonicalOwner(topicId)`·`getConflictsForDomains(domainIds[])`(owner∈domains AND any reference∈domains인 live overlap만 반환).
- **의존**: shared만. 순수 데이터 + getter. 어느 도메인이 정본인지 **선언**만 하고 런타임 판정 안 함. `ExpertPlaybook`의 reference 포인터 정합성은 빌드타임 픽스처 테스트로 검증(Phase B 과제).

### TiebreakRuleSet (packages/knowledge)

- **무엇을**: verifier 충돌의 공존대역+우선순위를 `TIEBREAK_RULES: TiebreakRule[]`로 보유. 각 규칙은 충돌하는 **check id 쌍**(임계 숫자는 미보유, 참조만), `coSatisfactionBand`(둘 다 만족 가능 조건 서술), `priorityOrder`(대역 공집합 시), `detTrigger`(어느 두 check가 동시 fail이면 이 충돌을 의심).
- **어떻게**: `getTiebreak(checkIdA, checkIdB)`.
- **의존**: shared만. 규칙은 데이터다. 실제 동시 위반 탐지는 core가 하고, 이 모듈은 "충돌이 생기면 어떻게 정렬하라"는 규칙 텍스트만 serve. 우선순위 적용·문장 재작성은 외부 AI.

### CanonicalOwnership serve (마스터 라우터 경유)

- **무엇을**: Phase B-1에서 `CANONICAL_OWNERSHIP`·`TIEBREAK_RULES`는 **신규 라우터 도구를 만들지 않고** `get_workflow_guide`(CONTRACT C3 확장 마스터 라우터)가 도메인 시퀀스를 돌려줄 때 `getConflictsForDomains(sequence)`와 관련 `TIEBREAK_RULES`를 inline 동봉해 serve한다. 정본/참조 포인터·공존대역·우선순위 규칙 텍스트만 serve하고 어떤 초안도 채택하지 않음.
- **의존·경계**: knowledge getter는 순수 데이터 read(영속화 0). 의미판단 절대 안 함. apps/web REST와 mcp-tools가 같은 라우터 fn 호출(core 단일 진입점).

> ⚠️ **Phase B-1 보류(CONTRACT C8)**: 아래 `ConsensusComputeService`(co-violation 카운팅)는 후속 Phase 산출물이다. B-1은 위 serve까지만 한다.

### ConsensusComputeService (packages/core/src/services.ts) — 후속 Phase

- **무엇을**: `runConsensusCheck(detResults, domainIds)` — LOOP_ENGINE의 `validate_*`가 이미 산출한 verifier det 결과 배열을 입력으로 받아 (a) block/critical 등급 둘 이상 동시 fail = co-violation 후보 카운트, (b) `CANONICAL_OWNERSHIP`에서 도메인 조합의 정본/참조 포인터 수집, (c) `TIEBREAK_RULES`에서 공존대역·우선순위 첨부, (d) ai 면책·false-negative 문구 동봉. 어떤 초안도 채택하지 않음.
- **의존·경계**: `updateApplicationStatus`/`saveInterviewPrep`와 같은 파일·같은 계층(core 단일 진입점). **영속화 없음**(read-only compute). 의미판단 절대 안 함. apps/web REST와 mcp-tools가 같은 fn 호출.
- **입력 파이프라인**: det 체크 입력(ats C8의 JD 키워드 집합 N, responsiveness C8의 JD 필수요건 분리)은 LOOP_ENGINE의 `validate_*`가 처리한다. **JD 키워드는 별도 추출-serve 도구 없이** `get_application_context`/`get_job_posting`이 돌려주는 job 레코드에서 **외부 AI가 추출**하고(추출=ai), CareerMate는 카운트만(=det) 한다(CONTRACT C3). 합의 엔진은 그 결과만 후처리한다. JD 미제공이면 해당 det는 N/A이고 그 쪽 co-violation 신호는 평가 보류(ats-compat.md C8 "JD 미제공 시 N/A").

---

## 4. 구체 스펙

### 4.1 packages/knowledge 데이터 스키마 (TS)

`packages/knowledge/src/consensus.ts`. 패키지 별칭 `@careermate/knowledge`, dep = shared only.

> 정본 근거: 패키지·데이터 모듈은 [CONTRACT.md](CONTRACT.md) C1(`@careermate/knowledge`, **B-1**), 도메인 enum(`linkedin-profile`·`fit-matching` 등 16종)은 C3, co-violation의 B-1 보류는 C8을 따른다. 아래는 **B-1 serve 데이터**(getter만, 마이그레이션·게이트 0)이며 충돌 *판정*은 외부 AI 몫이다.

```ts
// 정본 소유권: KNOWLEDGE §3 표 1:1
interface ConflictTopic {
  id: string;
  label: string;
  ownerKind: 'domain' | 'module';   // shared_lexicons는 도메인이 아닌 모듈 → 1급 구분
  ownerDomain: string;              // ownerKind='module'이면 '@shared-module'
  referenceDomains: string[];
  deferralRule: string;             // 상속 문구(외부 AI가 따를 지침)
  affectedChecks?: string[];        // 이 주제와 얽힌 verifier check id (참조만)
}

export const CANONICAL_OWNERSHIP: ConflictTopic[] = [
  {
    id: 'negotiation_tactics',
    label: '협상 전술(앵커·BATNA·디플렉션)',
    ownerKind: 'domain',
    ownerDomain: 'salary-negotiation',
    referenceDomains: ['recruiter-screen', 'offer-evaluation-decision'],
    deferralRule:
      '디플렉션/레인지 분기·walk-away 보호의 전술 권위는 salary-negotiation. ' +
      '다른 도메인은 게이트 통과 맥락에만 그 조건부 규칙을 상속 적용한다.',
    affectedChecks: ['salary-negotiation:R9', 'recruiter-screen:R1', 'recruiter-screen:R3'],
  },
  { id: 'weighted_offer_scorecard', label: '가중 오퍼 스코어카드', ownerKind: 'domain',
    ownerDomain: 'offer-evaluation-decision', referenceDomains: ['onboarding-first-90-days'], deferralRule: '오퍼 비교·가중치는 offer-evaluation-decision이 정본.' },
  { id: 'plan_30_60_90', label: '30-60-90 계획', ownerKind: 'domain',
    ownerDomain: 'onboarding-first-90-days', referenceDomains: ['offer-evaluation-decision'], deferralRule: '입사 후 90일 계획은 onboarding이 정본.' },
  { id: 'rejection_triage', label: '탈락 진단·피드백 루프', ownerKind: 'domain',
    ownerDomain: 'rejection-triage-iteration', referenceDomains: ['offer-evaluation-decision', 'onboarding-first-90-days'], deferralRule: '탈락 진단은 rejection-triage-iteration이 정본.' },
  { id: 'shared_lexicons', label: '정량·키워드·슬롭 공유 사전', ownerKind: 'module',
    ownerDomain: '@shared-module', referenceDomains: ['resume', 'ats', 'fit-matching', 'linkedin-profile', 'cover-letter', 'human-writing', 'human-voice'], deferralRule: '슬롭/키워드/정량 사전은 get_shared_lexicons 단일 모듈이 정본. 도메인은 참조만.' },
];

export function getCanonicalOwner(topicId: string): ConflictTopic | undefined;
export function getConflictsForDomains(domainIds: string[]): ConflictTopic[];
```

```ts
// 타이브레이크: 임계 숫자 미보유. check id 쌍의 "동시 fail" 트리거만 선언.
interface DetCoViolation {
  kind: 'co_violation';
  // 임계 숫자가 아니라 verifier check id를 참조 — 각 check의 pass/fail 결과만 입력으로 받음.
  checkA: string;  // 예: 'ats-compat:C8'
  checkB: string;  // 예: 'human-voice:C1'
}

interface TiebreakRule {
  id: string;
  conflictLabel: string;
  // verifier:check 입도로 통일된 단일 네임스페이스(아래 §4.2 규칙)
  verifierChecksA: string[];
  verifierChecksB: string[];
  coSatisfactionBand: string;
  priorityOrder: string[];   // 대역 공집합일 때만 적용. verifier:check 또는 verifier 단위.
  detTrigger: DetCoViolation;
  note?: string;
}

export const TIEBREAK_RULES: TiebreakRule[] = [
  {
    id: 'ats_kw_vs_human_voice',
    conflictLabel: 'ATS 키워드 커버리지 vs human-voice 슬롭/스터핑',
    verifierChecksA: ['ats-compat:C8'],                       // JD 키워드 커버리지(≥0.75, 문서 소유)
    verifierChecksB: ['human-voice:C1', 'ats-compat:C10'],    // 슬롭 밀도 + 키워드 스터핑 상한
    coSatisfactionBand:
      'JD 정확 용어를 최근 역할의 진실한 사실에 녹이되, 단일 키워드 반복을 ats-compat C10 상한(6회·6%) 이내로 유지하면 ' +
      'C8과 C1을 동시 만족 가능. 두 체크 모두 스터핑을 금지하므로 교집합 대역이 통상 존재한다.',
    priorityOrder: ['truthfulness', 'responsiveness-on-target:C8', 'human-voice:C1', 'ats-compat:C8'],
    detTrigger: { kind: 'co_violation', checkA: 'ats-compat:C8', checkB: 'human-voice:C1' },
    note: '대역이 공집합(키워드를 진실하게 못 넣음)일 때만 priorityOrder 적용. ' +
          '사실 손상은 어떤 경우도 불가(human-voice C8/C9 하드). ' +
          '동시 fail은 "둘 다 부실"일 수도 있음 — 트레이드오프 여부는 ai 판단.',
  },
  {
    id: 'scale_vs_impact',
    conflictLabel: '정량 규모(scale) vs 개인 임팩트(impact) 강조',
    verifierChecksA: ['truthfulness'],                        // 규모 수치의 사실성
    verifierChecksB: ['responsiveness-on-target:C8'],         // JD 필수요건(리더십/운영규모) 응답성
    coSatisfactionBand:
      '규모 수치와 본인 기여 동사를 한 불릿에 함께(STAR의 A+R). ' +
      'JD 요구가 리더십이면 impact, 운영규모면 scale을 1차로. 두 신호는 보통 공존 가능.',
    priorityOrder: ['truthfulness', 'responsiveness-on-target:C8'],
    // 진짜 충돌은 "한쪽은 충분한데 다른 쪽이 비어 갈림"이라 단일 detTrigger로 근사하기 어렵다 →
    // human-writing R6(증거 밀도 gate) 통과 + responsiveness C8 미달이 동시일 때만 후보.
    detTrigger: { kind: 'co_violation', checkA: 'responsiveness-on-target:C8', checkB: 'human-writing:R6' },
    note: '동시-low(둘 다 약함)는 충돌이 아니라 부실 초안. 한쪽 강·한쪽 약(XOR)이 진짜 scale↔impact 충돌이며 이는 ai 판단으로 위임.',
  },
  {
    id: 'anchor_first_vs_deflect',
    conflictLabel: 'salary-negotiation 선제 앵커 vs recruiter-screen 디플렉션',
    verifierChecksA: ['salary-negotiation:R9'],               // first_number_strategy(앵커/디플렉션 분기, advisory)
    verifierChecksB: ['recruiter-screen:R1'],                 // 정보 부족 단계 맨숫자 금지(det)
    coSatisfactionBand:
      '정보 충분도가 분기 기준. 정보 비대칭 큼→디플렉션, 정보 충분→리서치 레인지 앵커. ' +
      '단일 권위=salary-negotiation. recruiter-screen은 게이트 맥락에 그 조건부 규칙을 상속.',
    priorityOrder: ['salary-negotiation'],
    detTrigger: { kind: 'co_violation', checkA: 'salary-negotiation:R9', checkB: 'recruiter-screen:R1' },
    note: '정본=salary-negotiation(CANONICAL_OWNERSHIP negotiation_tactics). ' +
          'salaryFloor 비교(recruiter-screen:R3)는 hardGate 정형 필드 신설 전까지 [ai]/H라 det 충돌 탐지 대상이 아님. ' +
          '디플렉션과 앵커의 동시 등장 자체는 충돌이 아닐 수 있음(역질문 후 앵커) → ai 위임.',
  },
];

export function getTiebreak(checkIdA: string, checkIdB: string): TiebreakRule | undefined;
```

### 4.2 check-ID 단일 네임스페이스 규칙

`verifierChecksA/B`·`detTrigger`·`priorityOrder`는 모두 **`<verifier-id>:<check-id>` 또는 verifier-id 단위**의 단일 네임스페이스만 쓴다. 실제 지식 문서의 ID 체계를 그대로 따른다(발명 금지):

| verifier / 도메인 | ID 체계 | 키 커버리지·스터핑 등 근거 |
|---|---|---|
| `ats-compat` | **C1–C12** | C8 = JD 키워드 커버리지(M/N ≥ 0.75), C10 = 스터핑(6회·6% 상한) |
| `human-voice` | **C1–C11** | C1 = 슬롭 밀도(≤1.5/100단어), C8·C9 = 사실·고유명사 보존(`hard`) |
| `responsiveness-on-target` | **C1–C11** | C3 = 질문키워드 교집합(≥0.60), C8 = JD 필수요건(≥0.80) |
| `truthfulness`·`consistency`·`recency-staleness` | verifier 단위 참조 | (체크 ID는 VERIFIERS.md가 확정) |
| `salary-negotiation`(도메인) | **R1–R13** | R1 = market_anchor(critical), R9 = first_number_strategy(advisory) |
| `recruiter-screen`(도메인) | **R1–R11** | R1 = 맨숫자 금지(det), R3 = salaryFloor(ai, hardGate 전까지) |
| `human-writing`(도메인, **검증기 아님**) | **R1–R12** | R6 = 증거 밀도(gate), R8 = 목소리 보존, R10 = 키워드 커버리지(soft) |

> ⚠️ **리뷰 반영(ID 정정)**: 직전 설계안의 `ats-compat:R4`/`human-writing:R8(스터핑)` 등은 **틀렸다**. ats-compat은 R이 아니라 **C**체계이고 키워드 커버리지는 **C8**(임계 0.75, 0.70 아님), 스터핑은 **C10**이다. human-writing은 검증기가 아니라 **도메인 문서**이며 R8은 "목소리 보존"이지 스터핑이 아니다(스터핑 상한 소관은 ats-compat C10). 위 표가 정정본이다.

### 4.3 MCP 도구 계약

> **Phase B-1 도구 표면 = `get_workflow_guide` 확장 1개**(CONTRACT C3). 정본 소유권·타이브레이크 규칙은 마스터 라우터가 도메인 시퀀스와 함께 inline serve한다. 신규 라우터/serve/compute 도구(`get_career_playbook`·`get_canonical_owner`·`get_tiebreak_rules`·`run_consensus_check`)는 **만들지 않는다**. 아래 `run_consensus_check` 계약은 **co-violation 탐지를 끌어올 후속 Phase 산출물**(CONTRACT C8 보류)이며, 그때도 결정 4(verifier det 재실행 금지)를 따른다.

새 도구는 모두 `ToolDef`(result.ts:18) 객체로 기존 `TOOLS` 배열(tools.ts)에 append. 핸들러는 `ok(text, data)`/`fail(text)` 반환 → `toCallToolResult`. output schema 없음(payload는 ```json 텍스트 블록 + structuredContent). 모든 description은 한국어 "언제 호출하라" 트리거 문장으로 시작.

#### `run_consensus_check` (read-only compute) — 후속 Phase

- **name**: `run_consensus_check` · **readOnly**: `true`
- **description**: "한 산출물에 둘 이상의 도메인 플레이북·검증기를 함께 적용해 작성한 뒤, 저장하기 직전에 호출하세요. 두 검증기의 결정론 신호가 동시에 빨간불인 충돌 **후보**를 표시하고, 그 충돌의 정본 도메인 포인터와 우선순위·공존대역 규칙을 함께 돌려줍니다. CareerMate는 어느 초안이 옳은지 판정하지 않습니다 — 동시 위반이 '둘 다 부실'인지 '진짜 트레이드오프'인지는 당신이 판단해 자가검증하세요. 충돌이 없어도 트레이드오프 여부는 ai로 최종 확인하고, 문제없으면 그대로 save_*로 저장하세요."
- **inputSchema** (zod 형태):
  ```ts
  {
    det_results: z.array(z.object({
      check_id: z.string(),           // '<verifier>:<check>'
      severity: z.enum(['block', 'critical', 'warn', 'advisory', 'info', 'soft', 'hard']),
      passed: z.boolean(),
      observed: z.union([z.number(), z.string()]).optional(),
    })),                              // LOOP_ENGINE validate_*가 산출한 det 결과
    domain_ids: z.array(z.string()),
    job_id: z.string().optional(),
  }
  ```
- **output(data)**: `{ coViolationCandidates: [{checkA, checkB, observedA, observedB, tiebreakId}], canonicalPointers: ConflictTopic[], tiebreaks: TiebreakRule[], aiCaveat: string, falseNegativeNote: string }`
- **output(text) 넛지**: 충돌 후보가 있으면 "💡 충돌 주제 \"협상 전술\"의 정본은 salary-negotiation입니다. `get_playbook({ domain: 'salary-negotiation' })`을 따르고 우선순위 규칙대로 정렬하세요. (동시 위반이 단순히 둘 다 미완성일 수도 있으니 트레이드오프 여부를 먼저 판단하세요.)"
- **handler**: 얇음 — core `runConsensusCheck(det_results, domain_ids)` 호출 후 ok/fail. **verifier det를 재실행하지 않음**(결정 4).

#### 정본 소유권·타이브레이크 serve = `get_workflow_guide` inline (신규 serve 도구 없음)

CONTRACT C3은 신규 라우터/serve 도구를 추가하지 않는다. 직전 설계안의 `get_canonical_owner`·`get_tiebreak_rules` 별도 도구는 **폐기**하고, 그 데이터는 마스터 라우터가 inline으로 serve한다:

- **마스터 라우터 연계(트리거 #1)**: `get_workflow_guide`(tools.ts:591, CONTRACT C3 확장)는 `CAREER_ROUTES`로 도메인 시퀀스(expertSequence/verifierSequence/loop)를 돌려줄 때 `getConflictsForDomains(sequence)`(정본/참조 포인터)와 관련 `TIEBREAK_RULES`(공존대역·우선순위 규칙 텍스트)를 additive로 inline 동봉한다.
- knowledge getter(`getCanonicalOwner`·`getConflictsForDomains`·`getTiebreak`)는 라우터 내부에서만 호출되는 순수 데이터 read이며 별도 MCP 표면을 갖지 않는다. readOnly·openWorldHint=false는 라우터에서 상속.

### 4.4 severity 어휘 매핑 (제안, 통일은 VERIFIERS.md 소관)

> ⚠️ **리뷰 반영(어휘 불일치)**: 현재 지식 문서는 검증기마다 다른 severity 어휘를 쓴다 — human-voice `soft|hard`, responsiveness `det/D·ai/H`, salary-negotiation·recruiter-screen `critical|advisory`, human-writing `soft|gate|LLM-flag`. spine의 `RubricCheck.severity:'block'|'warn'|'info'`는 **아직 코드에 없는 제안 어휘**다. 합의 엔진은 이 통일을 **강제하지 않고** VERIFIERS.md에 위임하되, co-violation 탐지를 위해 "차단성 등급"만 다음과 같이 매핑해 받아들인다:

| 차단성(co-violation 트리거) | 흡수하는 원문 어휘 |
|---|---|
| **block** (동시 fail 시 충돌 후보) | `hard`(human-voice) · `critical`(salary/recruiter) · `gate`(human-writing) · `block` |
| **warn** (점수 차감, 후보 아님) | `advisory` · `soft` · `warn` |
| **info** (리포트만) | `LLM-flag` · `info` · ai-only |

co-violation 후보는 **block 등급 둘 이상 동시 fail**일 때만 표시한다.

### 4.5 enum / 테이블 변경

- **신규 상태 enum 불요**: 충돌 해소는 산출물 품질 게이트이지 8단계 상태 전이가 아니다. 기존 `ALLOWED_STATUS_TRANSITIONS`·`INTERVIEW_UNLOCK_STATUSES`(enums.ts:48,67)를 그대로 재사용하고 새 게이팅 메커니즘을 추가하지 않는다(spine statusGatingModel 준수). 충돌 탐지 결과는 §4.4 차단성 등급으로만 표현.
- **신규 테이블 불요**: `draft_variants` 테이블·`submit/compare` 도구는 이 문서에서 **보류**한다(§1, §6). 다중 초안 보관이 필요하면 기존 `cover_letter_versions.source`(schema.ts) 컬럼으로 모델 라벨을 구분하고 각 버전에 verifier를 돌린다 — 신규 마이그레이션·대시보드 노이즈 0.

### 4.6 AGENTS.md 제안 패치 블록 (수정 안 함)

CONTRACT C7: 충돌 규칙은 **별도 #10을 만들지 않고** 신규 원칙 **#9 "저장 전 관련 루브릭으로 자가검증"의 본문에 흡수**한다(CONSUMPTION.md가 #9 본문 소유). 합의 엔진은 그 #9 본문에 들어갈 충돌-규칙 문장만 제안한다. `get_workflow_guide`(마스터 라우터) 1회만 명명, 세부 도구명은 description(트리거 #1)에 위임.

```md
(원칙 #9 "저장 전 관련 루브릭으로 자가검증" 본문에 흡수)
… 여러 도메인 지식을 함께 쓸 때는 정본 도메인의 안내를 따르고(예: 연봉 숫자 전술은 연봉 협상 도메인이 정본), 두 검증기 지시가 상충하면(예: 검색 노출용 키워드 vs 자연스러운 문장) `get_workflow_guide`가 돌려주는 우선순위·공존대역 규칙대로 정렬하되, 사실·수치·고유명사는 어떤 경우에도 손상하지 않는다.
```

`CAREERMATE_SYSTEM_PROMPT`(packages/prompts/src/system.ts)에도 동일 #9를 본문·요약에 미러링해 두 정본 드리프트를 막는다(별도 #10 신설 안 함, CONTRACT C7). 두 파일 모두 **제안 블록만**이고 실제 미수정.

---

## 5. 기존 아키텍처·코드와의 정합

공통 정합 규칙(structuredContent 객체 래핑·길이캡 상속·core 단일 진입점·zod 재사용·본문 미누수·정규식 안전·2-프로세스/WAL·openWorldHint) → **[CONTRACT.md §C9](CONTRACT.md) 참조**(재서술하지 않음). 아래는 이 문서 고유의 정합 포인트만 남긴다:

- **knowledge 패키지 차용**: `@careermate/knowledge`는 shared에만 의존하며 `packages/workflows`의 데이터-모듈 패턴(interface + exported const + getter)을 **차용**(상속 아님). `CANONICAL_OWNERSHIP`·`TIEBREAK_RULES`는 순수 데이터 + getter(C1).
- **쓰기 경합 0 / 마이그레이션 0**: Phase B-1 산출물(정본 소유권·타이브레이크 serve)은 전부 **read-only**이고 신규 테이블을 두지 않으므로(§4.5) MIGRATIONS 변경·SQLITE_BUSY 경합·대시보드 노이즈가 모두 0이다(C9-7, C6 위반 없음). 다중 초안 보관은 기존 `cover_letter_versions`로 흡수.
- **det/ai 정직성(이 문서의 핵심)**: CareerMate는 정본 포인터·규칙 텍스트를 serve만 하고, "이 동시 위반이 진짜 트레이드오프인가"·"앵커가 적절한가" 같은 의미판단은 외부 AI에 위임한다. 2차 det 동시위반 탐지를 B-1에서 보류한 것(C8)도 같은 정직성 원칙 — det로 충돌을 사칭하지 않는다(내부 LLM 없음).

---

## 6. 미해결 질문 / 리스크

1. **동시 위반 ≠ 충돌의 잔여 위양성**: §2 결정 3의 ai 면책 문구로 완화했으나, det가 "트레이드오프"와 "둘 다 부실"을 구조적으로 구별하지는 못한다. `scale_vs_impact`처럼 진짜 충돌이 "한쪽 강·한쪽 약(XOR)"인 경우 단일 `detTrigger`(AND-fail)로는 못 잡는다. XOR-형 detTrigger를 도입할지, 아니면 이 충돌류는 전적으로 ai에 위임하고 detTrigger를 빼는 게 정직한지.
2. **detTrigger 캘리브레이션 의존성**: co-violation은 check별 pass/fail에 의존하는데, 그 임계(ats C8 0.75, human-voice C1 1.5 등)는 VERIFIERS.md/Phase A 문서가 한국어 코퍼스 회귀로 보정해야 한다. 합의 엔진은 임계를 참조만 하므로 이 보정이 선행되지 않으면 충돌 탐지의 신뢰도가 낮다.
3. **priorityOrder의 상황 가변성**: 최상위를 truthfulness로 고정했으나, JD가 명백히 ATS knockout 게이트일 때는 일시적으로 ats-compat 우선이 합리적일 수 있다. priorityOrder를 goal/status에 따라 가변으로 둘지, 아니면 고정 + 외부 AI 예외 판단으로 둘지.
4. **deferralRule 무시 리스크**: 외부 AI가 `get_playbook({ domain: 'recruiter-screen' })`만 호출하고 salary-negotiation 정본을 건너뛰면 정본 소유권이 무력화된다. 3중 트리거 외에 **recruiter-screen 플레이북 description이 "연봉 숫자 전술은 `get_playbook({ domain: 'salary-negotiation' })`을 함께 호출"을 강제 명시**하고, 플레이북 출력에 salary 정본 포인터를 항상 동봉해야 충분한지(이 문서는 그렇게 권고).
5. **다중 모델 diff의 위치**: `draft_variants` 보류 결정(§1)이 옳은지. det 점수표만으로는 핵심 품질차(responsiveness 진정성=ai)를 변별 못 해 "동점"이 흔하다. 이 기능이 정당화되려면 det로도 명확히 갈리는 케이스가 필요하며, 그렇다면 LOOP_ENGINE의 변형으로 별도 설계함이 낫다.
6. **선행 의존성 트랙(이 문서 밖)**: `hardGate` 정형 필드(`anchor_first_vs_deflect`의 R3 det 승격 전제)는 KNOWLEDGE §4가 소유하는 별도 트랙이다. 신설 전까지 `recruiter-screen:R3`·`salary-negotiation:R3`·`R5`/`R9`의 저장값 비교는 [ai]/H로 남으며 det 충돌 탐지 대상이 아니다(recruiter-screen.md:85).
7. **`@shared-module` 이질성**: `shared_lexicons`의 owner는 도메인이 아닌 모듈이라 `ownerKind:'domain'|'module'`로 1급화했다(§4.1). 이 구분이 충분한지, getter가 module owner를 특수 처리해야 하는지.

---

## 7. 관련 문서 (cross-links)

- [KNOWLEDGE.md](KNOWLEDGE.md) — §3 정본 소유권 표(`CANONICAL_OWNERSHIP` 1:1 시드) · §0 3중 트리거 소비 모델 · §2 교차검증기 6종 · §4 데이터모델 선행 의존성(hardGate)
- [VERIFIERS.md](VERIFIERS.md) (Phase B, 작성 예정) — 6 verifier의 det/ai 체크 정의·임계·severity 어휘 통일의 **단일 출처**. `TIEBREAK_RULES`의 check id·임계는 이 문서를 참조만 한다.
- [EXPERTS.md](EXPERTS.md) (Phase B, 작성 예정) — `ExpertPlaybook.referenceDomains` 포인터가 `CANONICAL_OWNERSHIP`과 정합해야. 정본 도메인 플레이북이 충돌 해소의 1차 방어선.
- [LOOP_ENGINE.md](LOOP_ENGINE.md) (Phase B, 작성 예정) — draft→verify→revise 루프가 `validate_*` det 결과를 산출한다. 그 결과를 후처리하는 `run_consensus_check`(co-violation 탐지)는 **Phase B-1 보류**(CONTRACT C8)이며 후속 Phase에서 결정 4대로 흡수. 다중 초안 비교도 여기로 이관 검토.
- [ARCHITECTURE.md](ARCHITECTURE.md) (Phase B, 작성 예정) — `get_workflow_guide`(마스터 라우터, CONTRACT C3 확장)가 도메인 시퀀스 + 충돌 타이브레이크를 함께 inline serve하는 배선.
- [CONTRACT.md](CONTRACT.md) — 횡단 결정 정본(C8 co-violation 보류·C3 도구 레지스트리·C7 소비경로/#9 흡수·C9 공유 정합).
- [salary-negotiation.md](../knowledge/salary-negotiation.md)(정본: 협상 전술 R1–R13) ↔ [recruiter-screen.md](../knowledge/recruiter-screen.md)(참조: 상속 R1–R11) — `anchor_first_vs_deflect`의 권위 근거(recruiter-screen.md:86,:99).
- [ats-compat.md](../knowledge/verifiers/ats-compat.md)(C8/C10) ↔ [human-writing.md](../knowledge/human-writing.md)(R6/R8/R10) ↔ [human-voice.md](../knowledge/verifiers/human-voice.md)(C1/C8/C9) — `ats_kw_vs_human_voice` 공존대역의 루브릭 근거.
- `packages/workflows/src/definitions.ts`(`WorkflowDefinition` 데이터 패턴) + `packages/prompts/src/humanize.ts`(`HUMANIZE_WRITING_GUIDE`, 공유 사전 시드) — `@careermate/knowledge`가 미러할 컨벤션.
