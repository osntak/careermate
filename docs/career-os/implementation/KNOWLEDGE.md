# CareerMate Career-OS — 지식 레지스트리 (KNOWLEDGE.md)

> **이 디렉터리는 CareerMate "Career OS"의 지식층(Phase A) 단일 인덱스다.**
> CareerMate 안에는 LLM이 없다. 이 문서들은 연결된 외부 AI(Claude/GPT/Gemini)가 **세계 최고 수준의 커리어 작업**을 하도록 CareerMate가 MCP로 *제공(serve)* 하는 **지식 플레이북 + 검증 루브릭**이다. 두뇌는 외부 AI, 저장·제공은 CareerMate(프라임 디렉티브: [`AGENTS.md`](../../../AGENTS.md)).
>
> 현행 제품 아키텍처는 [`docs/dev/ARCHITECTURE.md`](../../dev/ARCHITECTURE.md)·[`docs/dev/ROADMAP.md`](../../dev/ROADMAP.md)를 보라. 이 지식층은 그 위에 **순수 추가(additive)** 되며 "내부 LLM 없음" 비목표를 깨지 않는다.
>
> 횡단(cross-cutting) 결정(도구명·grade 타입·게이트·enum·테이블·정합 규칙)은 [`CONTRACT.md`](CONTRACT.md)가 정본이며 충돌 시 우선한다. 이 문서는 C3 도구명·정본소유권 표의 동기화 대상이다.

---

## 0. 이 지식이 런타임에 소비되는 방식 (중요)

이 `.md` 문서들은 **사람이 읽는 설계 원본(source of truth)** 이다. 연결된 AI는 이 파일을 직접 읽지 않는다(대개 레포 접근이 없다). 대신 **Phase B**에서 이 내용이 `packages/knowledge` 구조화 데이터로 컴파일되고, 신규 MCP 도구가 그것을 serve하며, 다음 3중 트리거로 외부 AI가 **적시에 당겨쓴다(pull)**:

1. **`get_application_context` 응답 라우트 주입 (B-1, C7 소비 강화 핵심)** — 외부 AI가 분석·작성 전 거의 항상 부르는 도구라, 그 응답에 `{recommended_route, verifier_sequence, next_tool}`을 실으면 verifier 경로를 사실상 못 피한다(가장 강한 기존 진입점, `tools.ts:443` 호출 강제 문구 + `:453` 넛지 전례). 스키마 변경 없이 반환 JSON만 확장한다.
2. **MCP server instructions (B-1)** — `apps/mcp/src/index.ts:26`의 서버 인스트럭션에 "저장 전 verifier 경로" 1줄을 추가한다(CONTRACT C7 v2). 서버 인스트럭션은 `AGENTS.md`를 안 읽는 클라이언트에도 전달되므로 description+AGENTS만으로 약한 pull 신뢰 모델을 보강한다.
3. **MCP 도구 description (B-1)** — "언제 호출하라"를 도구 설명에 명시(기존 `get_writing_style_guide` 패턴, `packages/mcp-tools/src/tools.ts:619`).
4. **`AGENTS.md` 상시 지침 (B-1)** — "이력서 손보기 전 플레이북 호출, 저장 전 루브릭으로 자가검증" 같은 지침(`system.ts` #9 미러).
5. **도구 출력 인라인 넛지 (B-1)** — 한 도구 응답이 다음 도구를 가리킴(기존 `get_application_context`가 `get_writing_style_guide`를 권하는 패턴, `tools.ts:453`).

이건 **pull + 신뢰 모델**이지 강제가 아니다(외부 두뇌를 물리적으로 강제할 수단은 없다). 견고함은 "올바른 경로를 가장 잘 보이게 만드는 신호등"에서 나온다. → **Phase B-1의 1급 산출물 = 소비 경로(consumption path)**: `get_application_context` 라우트 주입 + server instructions + 도구 description 트리거 문구 + AGENTS.md 패치 + 출력 넛지 + draft→verify→revise 자가검증 안내([`LOOP_ENGINE.md`](LOOP_ENGINE.md)/[`CONSENSUS_ENGINE.md`](CONSENSUS_ENGINE.md), Phase B 작성 예정).

> **Phase 분리(CONTRACT C0 v2):** Phase B는 **B-1(serve-only — 마이그레이션 0·게이트 0)** 과 **B-2(det 엔진·save-time 게이트·`verifications`·데이터모델)** 로 분리되었다. 이 문서의 serve 도구·라우팅·자가검증 안내는 모두 **B-1**이고, det compute(`check_traceability`/`check_staleness`)·`save_rejection_review`/`evaluate_offer`·신규 테이블은 **B-2**다. 실제 차단(게이트)은 B-2 `save_*`에서만 일어나며 B-1은 차단하지 않는다. 충돌 시 [`CONTRACT.md`](CONTRACT.md) v2가 이긴다.

---

## 1. 지원자 여정 × 8단계 상태 × 도메인 레지스트리

8단계 상태(`packages/shared/src/enums.ts`): `draft → planned → applied → document_passed → interview → final_passed` / `rejected`(비종착, 재진입 가능) / `on_hold`(보류). 면접 준비는 `document_passed` 이상에서 해금.

| 여정 단계 | 상태(status) | 전문 도메인(Expert) | 계획 MCP 도구(Phase B) |
|---|---|---|---|
| **탐색·준비** | (pre) `draft` | [résumé](../knowledge/resume.md), [ats](../knowledge/ats.md), [linkedin-profile](../knowledge/linkedin-profile.md), [portfolio](../knowledge/portfolio.md), [human-writing](../knowledge/human-writing.md), [networking-referrals](../knowledge/networking-referrals.md) | `get_playbook({domain:resume\|ats\|linkedin-profile\|portfolio\|networking-referrals})` (B-1), `get_writing_style_guide`(human-writing은 기존 도구 재사용, B-1) |
| **타겟팅·지원** | `planned → applied` | [fit-matching](../knowledge/fit-matching.md), [company-research](../knowledge/company-research.md), [cover-letter](../knowledge/cover-letter.md) | `get_playbook({domain:fit-matching\|company-research\|cover-letter})` (B-1) |
| **스크린·서류** | `applied → document_passed` | [recruiter-screen](../knowledge/recruiter-screen.md) (+ats, +fit-matching) | `get_playbook({domain:recruiter-screen})` (B-1) |
| **면접** | `document_passed → interview` | [interview-behavioral](../knowledge/interview-behavioral.md), [interview-technical](../knowledge/interview-technical.md) (+company-research) | `get_playbook({domain:interview-behavioral\|interview-technical})` (B-1) |
| **오퍼** | `final_passed` | [salary-negotiation](../knowledge/salary-negotiation.md), [offer-evaluation-decision](../knowledge/offer-evaluation-decision.md) | `get_playbook({domain:salary-negotiation\|offer-evaluation-decision})` (B-1), `evaluate_offer` (B-2) |
| **온보딩** | `final_passed`(이후) | [onboarding-first-90-days](../knowledge/onboarding-first-90-days.md) | `get_playbook({domain:onboarding-first-90-days})` (B-1) |
| **환류·반복** | `rejected`(재진입) | [rejection-triage-iteration](../knowledge/rejection-triage-iteration.md) | `save_rejection_review` (B-2), `get_rejection_patterns` (B-2) |

> 도메인별 16개 도구가 아니라 `get_playbook({ domain })` 단일 디스패처(`z.enum` 16 도메인)가 정본이다(CONTRACT C3). human-writing 산문 가이드는 신규 도구 없이 기존 `get_writing_style_guide`를 재사용한다.

마스터 라우터(Phase B-1): `get_workflow_guide`(기존 도구 확장, tools.ts:591) — 사용자 목표(공고분석/자소서/면접준비/오퍼결정 등)를 받아 `CAREER_ROUTES`로 **어떤 전문 도메인 + 검증기 + 루프**를 어떤 순서로 적용할지 additive 반환한다. 기존 `workflow_id` enum은 유지하고 신규 `goal?`을 추가 optional 입력으로 받는다(둘 중 하나, 충돌 없음). 신규 라우터 도구를 따로 만들지 않는다([`CONTRACT.md`](CONTRACT.md) C3).

---

## 2. 교차검증기 (모든 산출물·모든 단계에 횡단 적용)

도메인=작성 가이드, 검증기=크리틱. 연결된 AI가 산출물을 저장하기 전 이 루브릭으로 자가검증한다.

| 검증기 | 막는 위험(독립 축) | 계획 MCP 도구 |
|---|---|---|
| [truthfulness](../knowledge/verifiers/truthfulness.md) | 날조·과장·미검증 정밀도·갭 은폐 (값이 **참인가**) | `get_verifier({id:truthfulness})` (B-1), `get_fact_anchors({scope})` (B-1), `check_traceability({artifact_id})` (B-2 det) |
| [consistency](../knowledge/verifiers/consistency.md) | 이력서↔자소서↔면접↔LinkedIn **모순** | `get_verifier({id:consistency})` (B-1, 별도 check_* 없음) |
| [recency-staleness](../knowledge/verifiers/recency-staleness.md) | 낡은 데이터로 한 분석/협상/리서치 (**언제** 것인가) | `get_verifier({id:recency-staleness})` (B-1), `get_fact_anchors({scope})` (B-1), `check_staleness` (B-2 det) |
| [responsiveness-on-target](../knowledge/verifiers/responsiveness-on-target.md) | 슬롭 0이어도 **동문서답** | `get_verifier({id:responsiveness-on-target})` (B-1, 별도 check_* 없음) |
| [ats-compat](../knowledge/verifiers/ats-compat.md) | 파싱 실패·키워드 미달·과최적화 | `get_verifier({id:ats-compat})` (B-1; JD 키워드는 job 레코드에서 외부 AI 추출) |
| [human-voice](../knowledge/verifiers/human-voice.md) | AI 티(슬롭 밀도·목소리·사실 보존) | `get_verifier({id:human-voice})` (B-1), `get_shared_lexicons` (B-1) |

검증기는 **det(CareerMate가 LLM 없이 카운트)** 와 **ai(외부 AI 의미판단)** 와 **mixed**를 정직하게 등급 구분하고, 모든 결과 필드를 `serverComputed`(외부 입력 0) 또는 `aiExtractedInput`(외부 AI가 추출해 주입한 값)으로 **출처 태깅**한다([`CONTRACT.md`](CONTRACT.md) C2). `aiExtractedInput`이 한 방울이라도 섞인 값은 **절대 det/hard/게이트로 표기하지 않는다.** 예: `freshness_ratio`(recent-fact 매핑=ai)·`proper_nouns`/`titles`/`credentials`를 자유텍스트에서 추출하는 것(=한국어 NER=ai)은 `mixed`로 두고, 날짜 산술·집합 비교 같은 det 부분만 `serverComputed`다. `keyword_coverage` 비율은 `serverComputed`지만 그 키워드 입력이 ai라 hard 게이트로 승격하지 않는다. consistency·responsiveness-on-target은 별도 `check_*` 도구를 만들지 않고 `get_verifier` 루브릭 serve(B-1)로 흡수한다. JD 키워드는 별도 추출-serve 도구 없이 `get_application_context`/`get_job_posting`가 반환하는 job 레코드에서 외부 AI가 추출하고, CareerMate는 카운트(det)만 한다(det compute 도구 `check_traceability`/`check_staleness`는 **B-2**; CONTRACT C3·C4).

---

## 3. Phase B 선행 결정 — 정본 소유권(canonical ownership)

완전성 비평이 식별한 도메인 경계 중복. Phase B에서 정본을 **한 곳**으로 못박고 나머지는 참조로 전환한다(게이밍·모순·중복 유지보수 방지). 전문가 충돌·`CANONICAL_OWNERSHIP` 정본은 CONSENSUS_ENGINE.md(CONTRACT C8), 공유 사전 단일 정본은 VERIFIERS.md `SHARED_LEXICONS`(CONTRACT C1·C5)다.

| 표면 | 정본(canonical owner) | 참조(reference only) |
|---|---|---|
| 협상 전술(앵커·BATNA·디플렉션) | `salary-negotiation` | recruiter-screen, offer-evaluation-decision |
| 가중 오퍼 스코어카드 | `offer-evaluation-decision` | onboarding |
| 30-60-90 계획 | `onboarding-first-90-days` | offer-evaluation-decision |
| 탈락 진단·피드백 루프 | `rejection-triage-iteration` | offer-evaluation-decision, onboarding |
| 정량·키워드·슬롭 **공유 사전** | **신규 공유 모듈** `get_shared_lexicons`(Phase B-1, 원문 비공개 serve) | resume, ats, fit-matching, linkedin-profile, cover-letter, human-writing, human-voice |

---

## 4. Phase B-2 데이터모델 선행 의존성 (코드 확인됨)

신규 det 루브릭이 "진짜 결정론"이 되려면 정형 필드가 필요하다. 아래는 모두 마이그레이션이 필요한 **B-2** 항목이다([`CONTRACT.md`](CONTRACT.md) C0·C6). 현재 코드에 **없음**(에이전트가 `enums.ts`·`schemas.ts`·`context.ts`·`repositories.ts`에서 확인):

- **`recruiter-screen` hardGate** — 연봉/지역/근무형태가 `profile.desired_conditions` 단일 자유텍스트뿐. 정형 `hardGate{ minYears, visaStatus, location, salaryFloor }` 신설 필요(현재는 fit-matching처럼 "라벨" 취급).
- **`rejection-triage` 단계/사유** — `applications`에 `rejection_stage`/`feedback` 전용 필드 없음. 신규 `rejection_reviews` 테이블(job_id UNIQUE) + `REJECTION_STAGES` enum 제안.
- **전역 rejected 집계** — `get_application_context`는 최근 10건 cap + 동일 회사/직무 history만. 전 탈락 cross-tab은 신규 `get_rejection_patterns` 필요.
- **버전 신선도** — `recency-staleness`의 버전 드리프트 det는 `resumeVersionId`/`jobId`/`captured_at` 추적 전제.

---

## 5. 전체 문서 목록

**전문 도메인 (12 + 4 = 16):**
résumé · ats · cover-letter · interview-behavioral · interview-technical · company-research · human-writing · fit-matching · networking-referrals · salary-negotiation · linkedin-profile · portfolio · offer-evaluation-decision · recruiter-screen · onboarding-first-90-days · rejection-triage-iteration

**교차검증기 (4 + 2 = 6):**
verifiers/truthfulness · verifiers/ats-compat · verifiers/human-voice · verifiers/consistency · verifiers/recency-staleness · verifiers/responsiveness-on-target

각 문서 구조: §1 무엇을 하는가 · §2 플레이북(원칙·Do·Don't·Before→After) · §3 검증 루브릭(det/ai 등급) · §4 출처(1차/2차/벤더 등급) · §5 Phase B 힌트(MCP 도구 + 데이터 형태).

---

## 6. 다음(Phase B)

아키텍처 + 구체 스펙: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`EXPERTS.md`](EXPERTS.md) · [`VERIFIERS.md`](VERIFIERS.md) · [`LOOP_ENGINE.md`](LOOP_ENGINE.md) · [`CONSENSUS_ENGINE.md`](CONSENSUS_ENGINE.md) · [`EVALUATION.md`](EVALUATION.md) · [`TODO.md`](TODO.md) (작성 예정). `packages/knowledge` 데이터 스키마 + MCP 도구 계약 + 소비 경로 배선이 핵심.
