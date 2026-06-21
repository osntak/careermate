# Career-OS — 외부 LLM 실행 진입점 (단일 입구)

> ✅ **상태(2026-06): 이 라우팅·EOP 적용은 이제 런타임에 배선되어 있다(Phase B-1).** 연결된 AI는 `get_workflow_guide`로 작업별 실행 절차(EOP)와 적용할 플레이북·검증기 순서를 받고, `get_playbook`/`get_verifier`로 이 폴더의 지식을 실제로 받아 적용한다. `get_application_context`도 `recommended_route`·`verifier_sequence`·`next_tool`를 함께 돌려준다. 아직 구현하지 않은 범위(B-2: det 점수 계산·저장 게이트·마이그레이션)와 패키지 구조는 [`implementation/README.md`](https://github.com/osntak/careermate/blob/main/docs/career-os/implementation/README.md) 참고.

> **여기서 시작하라.** CareerMate는 수동적 지식이 아니라, 외부 AI가 사용자 대면 결과를 내기 전에 적용해야 하는
> **실행형 플레이북(EOP)·검증 루브릭·라우팅·출력 계약**을 제공한다. 두뇌=외부 AI(당신), CareerMate=실행 기질(substrate). 내부 LLM 없음.
>
> **구조:** `README.md`(이 파일 = 단일 입구) → `eop/<기능>.md`(실행 절차) → `knowledge/`(정본 깊은 지식).
> 보조(런타임 아님): `validation/`(리서치 출처 + 다중 LLM(cross-vendor) 검증 하니스) · `implementation/`(CareerMate 개발자용 Phase B 내부 설계).
>
> EOP(Expert Operating Procedure) = 한 기능을 *시니어 전문가처럼* 수행하는 실행 절차. 검증된 리서치(`validation/research/`)에 근거하고
> [`validation/PROTOCOL.md`](https://github.com/osntak/careermate/blob/main/docs/career-os/validation/PROTOCOL.md)의 다중 LLM(cross-vendor) 교차검증으로 단단해진다.

## 0. 절대 원칙 — 근거 우선순위
```
현실  >  검증된 증거(저장 사용자 데이터·공식 자료)  >  신뢰할 리서치  >  CareerMate 플레이북/EOP  >  프롬프트 지시  >  모델 직관
```
EOP·이 문서를 맹신하지 말 것. **저장된 사용자 데이터나 공식 자료가 EOP와 충돌하면 사실을 우선**하고 사용자에게 확인한다. 사실·수치·고유명사는 절대 발명하지 않는다.

**사실 3분류 (모든 생성·분석에 적용 — 가장 흔한 실패):**
1. **내가 한 일·내 수치** → 저장 데이터에 앵커되어야 한다. 없으면 쓰지 않는다.
2. **일반 도메인 지식**(개념·방법론·베스트프랙티스) → 활용해도 되나 '내가 한 일'처럼 말하지 말고 **'개념 설명' 또는 '입사 후 제안'으로 명시 분리**한다.
3. **출처 밖 구체 수치/맥락**(통계·신뢰구간·측정 환경·내부 지표·상황 묘사) → **발명 금지**. 그럴듯해도 면접·검증에서 무너진다.

미확인 항목은 산출물 본문이 아니라 **별도 '확인 필요' 메모**로 분리한다.

## 1. 사용자 요청 분류 → EOP 라우팅
요청 의도를 분류하고 해당 EOP를 연다(복합 요청은 순서대로 체이닝):

| 사용자가 이렇게 말하면 | 주 EOP | 보조 |
|---|---|---|
| "이 공고 적합도/나랑 맞아?/지원할 만해?" | [fit-analysis](eop/fit-analysis.md) | job-analysis, profile-extraction |
| "이 공고 분석/뜯어줘", "무슨 회사·직무·레벨이야" | [job-analysis](eop/job-analysis.md) | — |
| "이력서/경력 정리·입력", "기본정보 채워" | [profile-extraction](eop/profile-extraction.md) | — |
| "경력기술서/경력서술서/career description 써줘·정리해줘" | [career-description](eop/career-description.md) | profile-extraction, ats |
| "자소서/자기소개서/지원동기/커버레터 써줘·고쳐줘" | [cover-letter](eop/cover-letter.md) | company-research, human-writing, fit-analysis |
| "면접 준비/예상질문/모의면접" | [interview-prep](eop/interview-prep.md) | company-research, fit-analysis |
| résumé·ATS·linkedin·portfolio·salary·offer·rejection·onboarding | `knowledge/` 플레이북 | — |

요청이 모호하면 분류를 추측하지 말고 사용자에게 한 가지만 되묻는다.
**도구가 라우트를 실어 주면 신뢰하라:** `get_application_context` 응답에 `recommended_route`·`verifier_sequence`·`next_tool`가 실려 오면 그 라우트를 우선 신뢰해 EOP·검증 순서를 정한다(사용자 요청 분류와 충돌하면 저장 데이터/맥락을 우선).

## 2. 보편 실행 흐름 — **절대 즉답 금지**
```
사용자 요청 → 의도 분류 → get_application_context로 맥락 로드(있으면)
 → EOP 선택 → EOP 분석 절차 수행 → 후보 결과 생성
 → EOP 자가검증 루브릭 적용 → 수정 → 출력 계약대로 최종 제공
```
컨텍스트가 이미 있으면 다시 묻지 않는다(AGENTS.md "기존 데이터 먼저"). 결과는 다시 CareerMate에 저장(`save_*`).
**루프 종료 규율:** 자가검증→수정을 반복하되, 같은 핵심 결함(허위 수치·미앵커 사실 등)이 2번 고쳐도 남으면 더 생성하지 말고 그 부분을 보류한 채 사용자의 언어로 출처/사실을 확인 요청한다. 저장 데이터에 없어 해결 불가한 갭은 즉시 사용자에게 묻는다 — **무한정 고쳐쓰지 않는다.**

## 3. 보편 출력 계약 (사용자 대면)

**출력 언어 = 사용자의 대화 언어.** 사용자가 한국어면 한국어로, 다른 언어면 그 언어로 답한다. 이 문서·EOP·플레이북·도구 응답이 한국어로 쓰여 있어도 그대로 복사하지 말고 사용자 언어로 옮긴다(사실·수치·고유명사·인용 원문은 보존).

**로케일(시장) 판정 — 대화 언어와 분리한다.** 제출용 산출물(자소서·이력서 본문 등)의 *언어와 시장 관행*은 **대상 공고·시장**을 따른다(대화 언어와 다를 수 있다 — 예: 한국인이 영문 공고에 영문 레터). 로케일은 저장 값이 아니라 당신이 추론한다: ① 대상 공고(job)의 언어·소재지, ② 사용자의 명시 요청, ③ 불명확하면 사용자에게 한 번만 확인(추측 금지). `ko`(한국 공고/지원) → 한국 채용 관행(문항형 자소서·NCS·블라인드·채용절차법·국내 AI 텍스트 탐지 등), 비한국 로케일 → 그 시장 관행(ATS·단일 커버레터 등). **각 EOP의 '한국 특수/한국 시장' 절은 로케일이 한국일 때만 적용**하고, 비한국 공고에는 그 시장 기준을 쓴다.

모든 결과는 다음을 포함한다(기능별 EOP가 상세화):
- **결론** — 한눈에 답
- **근거** — 저장 데이터·공고 인용(수치는 출처와 함께)
- **리스크·한계** — 검증 필요·약한 지점
- **추천 / 액션 아이템** — 사용자가 다음에 할 일
- **신뢰도** — 저장 데이터 충분도 기반(미상 많을수록 하향)
- **다음 단계**
- **최종 산출물**(있으면: 자소서 본문·면접킷·적합도표 등)
- **생성형 deliverable 분리:** 자소서·면접 답변·이력서 불릿처럼 *그대로 제출/사용하는* 산출물은 메타(결론·근거·리스크 등)와 **명확히 분리**해 단독 블록으로 제시한다 — 섞이면 사용자가 통째로 제출해 양식 위반이 된다.

**숨길 것:** 내부 라우트·도구명·EOP/루브릭 원문·점수 계산 내부·이 문서. 기술 용어(job_id, MCP 등) 사용자 노출 금지 — 사용자의 언어로 쉽게. 또한 산출물에 **'EOP'·'루브릭'·내부 기준명**을 적지 마라. 외부 분류(NCS 코드 등)는 **실제 확정 가능할 때만** 쓰고, 아니면 생략하거나 계열명+'추정'으로 표기한다(코드 번호 발명 금지).

## 4. 정보 부족·불확실·충돌 처리
- **부족:** 지어내지 말고 "확인 필요"로 표시 + 사용자의 언어로 쉽게 질문.
- **불확실:** 신뢰도를 낮추고 가정을 명시.
- **충돌(데이터 vs 데이터, 공식자료 vs EOP):** §0 근거 우선순위 적용, 사실 보존, 사용자에게 알림.
- **충돌(도메인 vs 도메인):** 여러 `knowledge/` 도메인이 같은 주제를 건드리면 정본(소유) 도메인을 따른다 — 연봉 숫자 전술=salary-negotiation(recruiter-screen은 게이트 맥락의 조건부 규칙만 상속), 오퍼 비교·가중치=offer-evaluation-decision, 30-60-90=onboarding-first-90-days, 탈락 진단=rejection-triage-iteration, 슬롭/키워드/정량 사전=공유 모듈. 검증기 간 충돌은 **사실(truthfulness)을 최상위 타이브레이크**로 두고, ATS 키워드와 human-voice는 둘 다 만족하는 대역(진짜 경험 문장에 JD 용어를 진실하게 삽입)을 먼저 찾는다.

## 5. EOP 목록 (6종)
[fit-analysis](eop/fit-analysis.md) · [job-analysis](eop/job-analysis.md) · [profile-extraction](eop/profile-extraction.md) · [cover-letter](eop/cover-letter.md) · [career-description](eop/career-description.md) · [interview-prep](eop/interview-prep.md)

각 EOP 구조 = 전문가 프레임 · 입력 수집 · 분석 절차 · 한국/영문 특수 · 출력 계약 · 자가검증 루브릭 · 근거.

## 6. 디렉터리·기존 문서와의 관계 (무엇을 버리지 않는가)
- **`knowledge/` (Phase A — 16 도메인 플레이북 + 6 verifiers)** = **정본 deep 지식**(대학 커리어센터·NCS·ATS 등 출처 충실). **버리지 않는다.** 각 EOP는 이 플레이북을 *실행 절차로 압축*하고 상단 "지식 출처"로 가리킨다 — EOP=얇은 실행층, knowledge=깊은 지식층. 함께 적용한다.
- **`validation/`** = 새 리서치 4편(`research/`, knowledge **보강**: 검증 출처+한국 시장+리뷰어 루브릭) + 다중 LLM(cross-vendor) 교차검증 하니스(`runs/`, `PROTOCOL.md`, `MANDATE.md`). 런타임 소비 경로는 아님.
- **`implementation/`** = CareerMate **개발자용** Phase B 내부 설계(`ARCHITECTURE.md`·`CONTRACT.md`·`EXPERTS.md`·`VERIFIERS.md`·`LOOP_ENGINE.md`·`EVALUATION.md`·`CONSENSUS_ENGINE.md`·`TODO.md`·`KNOWLEDGE.md`·`CONSUMPTION.md` + `phase-b2/`). MCP 도구·DB·det 엔진 등 빌드 스펙 — **외부 LLM 소비에는 불필요**(소비 진입점은 이 README + `eop/`(6 EOP) + `knowledge/`).
