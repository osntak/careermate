# 진실성 / 날조 방지 (Anti-fabrication) — CareerMate 교차검증 루브릭 (Phase A)

> 이 검증기는 연결된 AI가 커리어 산출물(이력서·자소서·면접 답변·LinkedIn 등)을 점검할 때 적용하는 **크리틱 루브릭**이다. CareerMate는 루브릭을 제공하고, 실제 검사는 연결된 AI가 수행한다(내부 LLM 없음).

## 1. 목적

이 검증기는 **모든 커리어 산출물의 모든 사실 주장이 사용자의 저장된 데이터로 추적 가능함**을 보장한다. 즉, 산출물 안의 숫자·직함·회사·기간·학력·자격증·기술 숙련도·고유명사가 (a) 저장된 프로필/경력/이력서/자소서 데이터에 직접 존재하거나, (b) 그 저장 데이터에서 **명시적 산술 파생**(차·합·비율 환산)으로 나온 것이어야 한다는 뜻이다. 그 밖의 모든 사실 주장은 날조(fabrication) 또는 미검증(unverified)으로 분류해 차단하거나 `[확인 필요]`로 표시한다.

이 검증기가 막으려는 4가지 실패 모드:
- **날조(fabrication):** 없는 사실을 만들어냄(존재하지 않은 회사·직함·자격증, 지어낸 수치).
- **과장(inflation):** 있는 사실을 부풀림(직함 격상, 팀 성과를 개인 성과로 귀속, "참여"를 "주도"로).
- **미검증 정밀도(false precision):** 저장 데이터에 근거 없는 구체 수치("매출 37% 증가")를 생성.
- **갭 은폐(gap concealment):** 모르는 것을 모른다고 하지 않고 빈칸을 그럴듯하게 메움.

> 경계 원칙: **표현을 강하게 다듬는 것(action verb·두괄식·정량화)은 허용, 사실을 바꾸는 것은 금지.** 강한 동사로 쓰되 동사가 가리키는 행위·결과는 저장 데이터와 일치해야 한다. 이 검증기는 사람처럼 쓰기(`human-writing.md`)의 "Fact lock(R7)" 신호를 **전 산출물·전 사실유형으로 확장한 전용 게이트**다.

핵심 제약상 한국어 NER·실세계 사실확인은 결정론으로 100% 셀 수 없다. 따라서 항목을 **(가) LLM 없이 셀 수 있는 결정론 게이트**와 **(나) 연결된 AI가 수행하는 대조 판정**으로 나눠 설계하고, 각 항목에 어느 쪽인지 표시한다.

## 2. 검사 항목

표기: **[det]** = CareerMate가 LLM 없이 셀 수 있는 결정론 체크(개수·존재·정규식·비율). **[ai]** = 연결된 AI가 저장 데이터와 대조해 판정(개수로 환원해 보고).

| ID | 검사 | 합격 기준 | 측정 방법(셀 수 있게) |
|----|------|-----------|------------------------|
| C1 **[ai]** | **수치 앵커링** — 산출물의 모든 정량 주장(숫자+단위/%, 금액, 인원, 기간)이 저장 데이터에 존재하거나 거기서 산술 파생되는가 | 미앵커 수치 = **0** | 정규식 `\d[\d,.]*\s*(%|억|만|원|명|건|배|개월|년|시간|ms|x|배)` 등으로 산출물의 수치 토큰 수 `N_total`를 센다 → AI가 각 토큰을 저장값 또는 파생식에 매핑 → 매핑 실패 수 `N_unanchored` 보고. 합격 = `N_unanchored == 0` |
| C2 **[ai]** | **고유명사 화이트리스트** — 회사명·기관·제품·기술스택·인명이 저장 데이터(프로필/경력/이력서/스킬)에 존재하는가 | 화이트리스트 밖 고유명사 = **0** | 저장 데이터에서 고유명사 집합 `W`를 추출(set) → 산출물의 고유명사 후보를 `W`와 대조 → `W`에 없는 항목 수 보고. 일반어·직무 일반명사는 제외 |
| C3 **[ai]** | **직함·고용형태 일치** — 진술된 직함/고용형태(정규직·인턴·계약·프리랜서·동아리)가 저장 직함과 동일하거나 더 낮은 책임 수준인가 | 격상된 직함 = **0** | 저장 직함 문자열과 산출물 직함을 1:1 대조 → 불일치 건수, 그중 "격상"(예: 인턴→주니어, 팀원→팀장, 계약→정규) 건수 보고. 합격 = 격상 0 |
| C4 **[ai]** | **귀속(attribution) 정확성** — 팀 성과를 1인칭 단독 성과로 바꾸지 않았는가 | 부당 단독귀속 = **0** | "주도/총괄/혼자/단독/led/owned" 류 1인칭 단독 동사 출현 수를 센 뒤, 각각에 대해 저장 데이터가 단독 역할을 뒷받침하는지 AI가 판정 → 미뒷받침 건수 보고 |
| C5 **[ai]** | **학력·자격·점수 정확성** — 학위/전공/졸업여부/자격증/어학·시험 점수가 저장값과 정확히 일치하는가 | 불일치 = **0** | 저장된 학력·자격·점수 필드와 산출물 토큰을 정확 일치(점수는 값까지) 대조 → 불일치 건수 보고. "더 유명한 학교/상위 학위/미취득을 취득"으로의 변경은 critical |
| C6 **[ai]** | **숙련도 정직성** — 기술 숙련 표현(전문가/마스터/능숙/숙련/expert)이 저장 근거(연차·프로젝트·산출물)와 모순되지 않는가 | 근거 없는 최상급 = **0** | "전문가/마스터/완벽/모든/항상/expert/mastery" 류 최상급·절대표현 출현 수를 센 뒤, 저장 근거 유무를 AI가 판정 → 근거 없는 건수 보고 |
| C7 **[det]** | **갭 표식 보존** — AI가 만든 `[확인 필요]`/플레이스홀더가 최종본에 임의의 그럴듯한 값으로 치환되지 않았는가 | 빈칸을 지어낸 값으로 채운 흔적 = **0** | 직전 초안의 `[확인 필요]`·`{{ }}`·`___` 개수 `P_before`와 최종본 개수 `P_after` 비교. `P_after < P_before`이면 그 차이만큼 AI가 "저장 근거로 채움 vs 지어냄"을 보고. 미설명 감소 = 불합격 |
| C8 **[ai]** | **파생연산 검증** — 산출물의 비율/증감 환산(예: "월12건→월2건 = 83% 감소")이 저장 입력값으로 실제 계산되는가 | 계산 오류·근거 없는 파생 = **0** | 파생 표현마다 `(입력값, 식, 결과)` 3요소를 추출 → 산술 재계산이 일치하는 건수/불일치 건수 보고 |
| C9 **[ai]** | **시간선 정합성** — 날짜·기간·근속이 저장 경력 타임라인과 모순되지 않는가(미래일자·중복재직·음수기간 없음) | 시간선 모순 = **0** | 산출물의 날짜·기간 토큰을 저장 타임라인과 대조 → 중복재직/미래시작/기간>실재직 같은 모순 건수 보고 |
| C10 **[det]** | **추적성 비율(traceability)** — 검증 대상이 된 전체 사실 주장 중 저장 데이터로 매핑된 비율 | 추적성 = **100%** (= 미앵커 0) | `traceability = (N_total_claims − N_unanchored − N_unverified) / N_total_claims`. C1·C2·C5의 합산 분모로 계산해 단일 수치로 보고. 1.0 미만이면 불합격 |

> critical 등급: C1·C2·C3·C5(없는 사실/격상/학력 위조)는 **단 1건이라도** 발견 시 전체 산출물을 불합격 처리한다. C4·C6·C8·C9는 건수 누적으로 판단하되 0을 목표로 한다. C7·C10은 게이트(전부 통과해야 합격).

## 3. 불합격 시 처리(루프 연결)

연결된 AI는 아래 순서로 **수정 → 재검증**한다. 재검증은 동일 루브릭 전 항목을 다시 돌려 **C1·C2·C3·C5 = 0 이고 C10 = 1.0** 일 때만 통과로 본다.

1. **분류 먼저, 삭제·치환은 다음.** 각 불합격 토큰을 (a) 날조 (b) 과장 (c) 미검증 정밀도 (d) 갭은폐 중 하나로 라벨링한다.
2. **(a) 날조 → 삭제.** 저장 근거가 0인 회사·직함·수치·자격증은 문장째 삭제하거나, 저장된 실제 사실로 교체한다. 지어내서 채우지 않는다.
3. **(b) 과장 → 하향 정렬.** 직함·귀속·숙련도를 저장 데이터 수준으로 되돌린다(팀장→팀원, 주도→참여, 전문가→"3년 사용"). 표현은 강하게 두되 **사실 레벨만** 내린다.
4. **(c) 미검증 정밀도 → 일반화 또는 표식.** 근거 없는 "37%"는 (저장값이 있으면) 정확값으로 바꾸고, 없으면 정성 표현("크게 단축")으로 일반화하거나 `[확인 필요: 수치 출처]`로 표시한다. 추측 수치를 남기지 않는다.
5. **(d) 갭 은폐 → 정직한 표식 복원.** 지어낸 빈칸 채움을 `[확인 필요]`로 되돌리고, 사용자에게 해당 사실을 **쉬운 한국어로** 질문한다(직함·기술 용어 노출 금지). 사용자가 값을 주면 저장 도구로 보관 후 반영한다.
6. **재검증 게이트.** 수정본을 다시 C1~C10에 통과시킨다. critical 4종 중 하나라도 남으면 루프를 반복한다. 2회 반복 후에도 미앵커가 남으면, 해당 문장을 산출물에서 보류하고 사용자에게 확인을 요청한다(무한정 생성 금지).
7. **저장.** 통과한 산출물만 저장 도구(`save_cover_letter_version`·`save_fit_analysis`·`save_interview_prep` 등)로 보관한다. 검증 결과 요약(미앵커 0, traceability=1.0)을 산출물 메타에 함께 남긴다.

## 4. 출처 (Provenance)

- **STAR (Situation-Task-Action-Result)** — 행동을 검증 가능한 결과로 환원하는 표준 프레임워크. "성과를 과장하면 STAR로 풀어 쓰기 어려워 거짓이 드러난다"는 점에서 진실성 게이트와 직결. · Monster Career Advice, "How to Create a STAR Method Resume" https://www.monster.com/career-advice/resume/star-method-resume · Resume Genius, "STAR Method Resume" https://resumegenius.com/blog/resume-help/star-method-resume
- **정량화·임팩트 중심·"YOUR contribution(팀 아닌 본인)"** — 귀속 정확성(C4)과 정량 앵커링(C1)의 1차 근거. · Yale Office of Career Strategy, "Writing Impactful Resume Bullets" https://ocs.yale.edu/resources/writing-impactful-resume-bullets/ · Harvard FAS Mignone Center, "Create a Strong Resume" https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/ · UC Berkeley Career Engagement, "Resumes" https://career.berkeley.edu/prepare-for-success/resumes/
- **윤리적 강화 vs 비윤리적 날조의 경계** — 직함 격상·경력 날조·성과 인플레·자격 위조를 비윤리로 명시. C2·C3·C5·C6의 근거. · MyResumee, "The Ethics of Resume Enhancements and Where to Draw the Line" https://www.myresumee.com/blog/ree-the-ethics-of-resume-enhancements-and-where-to-draw-the-line
- **이력서 거짓의 실태·적발·결과(통계)** — 검증 게이트의 필요성 근거. 2024 StandOutCV 설문 64.2%가 이력서에 거짓 기재 / 적발 시 41% 채용 취소·18% 해고. 거짓 유형: 미보유 스킬 숙련 주장(60%), 직함 변경(41%), 더 유명한 대학 주장(39%) → C5·C6 설계의 직접 근거. Gartner: 2028년까지 글로벌 지원자 프로필 4건 중 1건이 완전 가짜 전망. · Shortlister, "40+ Background Check Statistics in 2025" https://www.myshortlister.com/insights/background-check-statistics · Avvanz, "Resume Fraud in 2026" https://www.avvanz.com/blog/resume-fraud-2026-employer-prevention
- **CareerMate 프라임 디렉티브 / Fact-lock** — "두뇌는 연결된 AI, 저장은 CareerMate. 숫자·고유명사·직함은 입력 그대로 보존, 명시적 산술 파생만 허용, 모르면 `[확인 필요]`." C1·C7·C8의 내부 근거. · CareerMate `AGENTS.md`; `docs/career-os/knowledge/human-writing.md`(R7 Fact lock)

## 5. Phase B 힌트

- **MCP 도구 아이디어:**
  - `get_verifier({ id: "truthfulness" })` — 이 루브릭(JSON: 항목·합격기준·det/ai 플래그·정규식 패턴·critical 등급)을 연결된 AI에게 그대로 serve.
  - `get_fact_anchors({ scope })` — 저장 데이터에서 **앵커 집합**을 미리 추출해 제공: `{ numbers[], proper_nouns[](회사·기관·기술·인명), titles[], credentials[], timeline[] }`. C1·C2·C3·C5·C9의 화이트리스트로 직접 사용.
  - `check_traceability({ artifact_id })` — det 항목(C7 갭표식 카운트, C10 추적성 비율, 정규식 수치/날짜 토큰 카운트)을 CareerMate가 LLM 없이 계산해 `{ N_total, N_unanchored, traceability, placeholder_delta }` 반환.
- **데이터 형태 힌트:**
  - 앵커 집합은 `set`(정확매칭용)과 정규화 함수(콤마/단위/한글수사: `1,200ms==1200ms`, `12만==120000`)를 함께 제공해 거짓양성 감소.
  - 산출물 메타에 `verification: { rubric: "truthfulness", critical_failures: 0, traceability: 1.0, checked_at }`를 저장해 상태 게이팅(`applied` 이상 전환 전 통과 필수) 및 대시보드 표시에 활용.
  - 초안 버전 간 `placeholder_delta`(C7)를 추적하려면 `save_cover_letter_version`이 직전 버전 참조를 보관해야 한다(빈칸 치환 감지용).
