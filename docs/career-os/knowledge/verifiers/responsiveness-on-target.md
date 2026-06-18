# 질문-응답 적합성 / Responsiveness & On-target — CareerMate 교차검증 루브릭 (Phase A)

> 이 검증기는 연결된 AI가 커리어 산출물(이력서·자소서·면접 답변·LinkedIn·분석 등)을 점검할 때 적용하는 **크리틱 루브릭**이다. CareerMate는 루브릭을 제공하고, 실제 검사는 연결된 AI가 수행한다(내부 LLM 없음).

## 1. 목적

이 검증기는 산출물이 **던져진 질문·요건에 실제로 응답했는가**를 보장한다. 자소서 문항·면접 질문·JD(job description) 요건은 명시적인 "질문"이다. 글이 아무리 매끄럽고(human-voice) 사실에 충실하며(truthfulness) 산출물 간 모순이 없어도(consistency), **묻지 않은 것을 답하면(동문서답) 즉시 탈락**한다. `human-writing` 지침이 경고한 "슬롭 0이어도 동문서답이면 탈락"을 잡는 **마지막 방어선**이다.

구체적으로 다음 네 가지 실패 모드를 막는다.

- **동문서답(off-target):** 문항이 "지원동기"를 물었는데 성장과정을 쓰거나, 면접관이 "갈등 해결 경험"을 물었는데 일반론으로 답함.
- **부분 응답(partial coverage):** 한 문항에 여러 하위 질문(예: "경험과 그로부터 배운 점, 그리고 입사 후 계획")이 있는데 일부만 답함.
- **형식 미충족(format miss):** 문항이 요구한 응답 형식(경험 서술 / 이유 / 향후 계획 / 글자 수)을 충족하지 못함.
- **요건 미커버(JD gap):** JD가 명시한 필수 요건·키워드가 이력서·자소서에서 한 번도 다뤄지지 않음.

> **독립 축 선언:** 이 검증기는 truthfulness(사실이 데이터로 추적되는가)·consistency(산출물 간 모순이 없는가)·ats-compat(기계가 파싱하는가)·human-voice(사람 목소리인가)와 **겹치지 않는 별개의 축**이다. 그 넷은 모두 "답이 좋은가/참인가/일관되는가"를 보지만, 이 검증기만이 **"그게 던져진 질문에 대한 답이긴 한가"(응답성)** 를 본다. 좋은 글이 잘못된 질문에 답하는 경우를 다른 어떤 검증기도 잡지 못한다.

핵심: 검사 항목은 가능한 한 **LLM 없이 셀 수 있게**(키워드 교집합 개수·요구 행동 커버리지 비율·형식 토큰 존재 여부·글자 수 비교) 설계했고, 의미 판단이 필요한 항목은 `ai`로 정직하게 표시한다.

## 2. 검사 항목

> 적용 단위: **(질문, 응답) 쌍** 1개. 질문 = 자소서 문항 1개 / 면접 질문 1개 / JD 요건 블록 1개. 응답 = 그에 대응하는 답변 텍스트.
> 측정 보조 개념:
> - **질문 키워드(Q-keyword):** 질문에서 추출한 핵심어(불용어 제거 후 명사·동사·고유명사). 한국어는 조사 분리.
> - **요구 행동 동사(directive verb):** 질문이 요구하는 응답 행위. 예: "설명하라/서술하라"(경험), "이유는"(근거), "어떻게 하겠는가/계획은"(계획), "배운 점"(교훈).
> - **det** = LLM 없이 결정론으로 셀 수 있음 · **ai** = 연결된 AI의 의미 판정 필요. 등급 **D**(결정론 게이트) / **H**(휴먼/AI 판정).

| ID | 검사 | 합격 기준 | 측정 방법(셀 수 있게; det/ai 구분) |
|----|------|-----------|------------------------|
| C1 | 질문↔응답 매핑 존재 | 모든 질문에 **대응 응답 블록이 1:1 존재**. 미응답 문항 0개 | det/D · 입력된 질문 개수 = 응답 블록 개수인지 비교. 매핑 안 된 질문 ID 개수 = 0 |
| C2 | 요구 행동 커버리지 | 질문이 요구한 directive 행동을 **모두** 충족(예: "경험+배운점+계획" 3요소면 3개 모두). 충족률 = 100% | det/D · 질문에서 directive 동사 목록 추출 → 응답에서 각 요소 대응 문장 존재 여부 태깅 → (충족 요소 수 ÷ 요구 요소 수). 1.0 미만이면 미충족 요소 나열 |
| C3 | 질문 키워드 교집합 | 응답이 Q-keyword 상위 N개(기본 5) 중 **≥ 60%** 를 본문에서 다룸(동의어 허용) | det/D(정확 일치) + ai/H(동의어·환언 판정) · 교집합 토큰 수 ÷ N. 미달 시 누락 키워드 목록 출력 |
| C4 | 첫 문장 온타깃 | 응답 **첫 1~2문장**이 질문 주제어를 직접 언급(두괄식·결론 우선). 서론만 길고 본론 없는 "워밍업" 금지 | det/D · 첫 1~2문장에 Q-keyword가 1개 이상 등장하는가(존재 여부) |
| C5 | 형식 토큰 충족 | 문항이 명시한 형식 요소가 모두 존재. 예: STAR 면접이면 Situation·Task·Action·Result 4요소, "구체적 사례" 요구면 사례 1건+ | det/D · 형식 체크리스트별 대응 토큰/구간 존재 카운트 → 누락 요소 수 = 0 |
| C6 | 글자 수/분량 준수 | 자소서 문항의 **글자 수 상·하한**을 지킴(한국 공채 자사양식의 핵심 탈락 사유). 범위 내 | det/D · 응답 길이(공백 포함/제외 둘 다) vs 문항 제한. 초과·미달 글자 수 출력 |
| C7 | 질문 직접 응답성 | 응답이 질문에 **직접** 답하고 우회·일반론으로 빠지지 않음(off-target/회피 0건) | ai/H · 연결 AI가 "이 응답이 이 질문에 답하는가"를 Y/N 판정. N이면 빗나간 지점 명시 |
| C8 | JD 필수 요건 커버리지 | JD의 **필수(required) 요건** 항목 중 산출물(이력서+자소서)에서 다뤄진 비율 **≥ 80%**, 필수 요건 미커버 **0개** | det/D · JD에서 필수/우대 요건 분리 추출 → 각 요건 키워드가 산출물에 존재하는지 매칭 → (커버 요건 ÷ 전체 필수). 미커버 필수 요건 나열 |
| C9 | JD 우대 요건 커버리지 | **우대(preferred)** 요건 커버 비율 보고(차단 아님, 경고). 권장 ≥ 50% | det/D · C8과 동일 로직을 우대 요건에 적용. 비율만 리포트, 미달은 warning |
| C10 | 과잉/딴소리 비율 | 응답 중 질문과 무관한 문장(Q-keyword·directive 어느 것과도 무관) 비율 **< 20%** | det/D + ai/H · 각 문장을 질문 관련/무관으로 태깅(키워드 매칭=det, 환언 무관 판정=ai) → 무관 문장 비율 |
| C11 | 질문 전제·제약 준수 | 질문이 건 제약(예: "**팀** 경험", "**실패** 사례", "최근 3년 내")을 응답이 위반하지 않음 | ai/H · 질문의 한정어(팀/개인, 성공/실패, 기간) 추출 → 응답 사례가 그 한정과 일치하는지 판정. 위반 사례 개수 = 0 |

### Locale 분기 (한국 vs 글로벌)

- **한국(공채·자사양식):** C5·C6이 1차 게이트. 자사양식 문항은 **글자 수 제한이 엄격**하고(C6), "성장과정/지원동기/직무역량/입사 후 포부" 같은 **정형 문항 유형**이 directive를 규정한다(C2). 자소서에 별도 문항이 없고 "자유 기술"이면 C1·C2는 **인재상·직무기술서 키워드**를 질문 대용으로 사용. 포괄임금·공채 특성상 JD가 느슨할 수 있어 C8은 **채용공고+직무기술서+인재상**을 합쳐 요건 풀로 만든다.
- **글로벌(JD 중심·LinkedIn):** C8·C9가 1차 게이트. JD의 required/preferred 분리와 키워드 커버리지(ATS 정합)가 핵심. 면접은 STAR(C5) 중심. cover letter는 보통 단일 자유 양식이라 C6 대신 **JD 요건 응답성(C8)** 이 주 축.

## 3. 불합격 시 처리(루프 연결)

연결된 AI는 위 항목을 채점해 **불합격 항목 ID + 근거(미응답 문항 ID·미충족 directive·누락 키워드·초과 글자 수·미커버 요건 목록)** 를 모은다. 그다음 항목별로 아래 수정 지시를 적용해 **보강 재작성 → 동일 루브릭 재검증**한다. 통과까지 반복.

- **C1 미응답 문항(critical):** 빠진 문항에 대응하는 답변 블록을 **새로 작성**한다. 데이터가 없으면 지어내지 말고 `get_application_context`/사용자 확인으로 재료를 모은 뒤 작성. 재검증.
- **C2 directive 미충족(critical):** 누락된 요구 요소(예: "배운 점", "입사 후 계획")를 응답에 **명시적으로 추가**한다. 한국 정형 문항은 해당 문항 유형의 필수 요소표를 적용. 재측정.
- **C3·C4 온타깃 부족(critical):** 두괄식으로 **첫 문장을 질문 핵심어로 다시 쓰고**, 누락 Q-keyword를 본문에 자연스럽게 반영(키워드 스터핑 금지, 실제 경험 맥락으로). human-voice·truthfulness와 충돌하지 않게 사실 보존. 재측정.
- **C5 형식 미충족(critical):** 누락 형식 요소를 채운다. STAR면 빠진 S/T/A/R 단계를 보강, "구체적 사례" 요구면 실제 사례 1건을 데이터에서 끌어와 삽입. 없으면 사용자에게 사례를 묻는다. 재검증.
- **C6 글자 수 위반(critical, 한국):** 초과면 빈말·중복부터 **삭제 우선**(human-voice의 filler 제거와 연계), 미달이면 구체 수치·사례로 **증거 보강**. truthfulness를 깨지 않는 선에서. 범위 안에 들 때까지 루프.
- **C7·C10·C11 위반(critical):** 질문과 무관한 구간을 **삭제하거나 질문에 맞게 재초점화**한다. C11 전제 위반(예: 성공 사례를 물었는데 실패담)은 **올바른 전제의 사례로 교체**. 재판정.
- **C8 필수 요건 미커버(critical):** 미커버 필수 요건 각각에 대해 (a) 사용자에게 해당 경험이 있는지 확인 → 있으면 산출물에 반영, (b) 없으면 인접 역량으로 보완하고 갭을 사용자에게 정직히 고지(없는 경험 날조 금지 — truthfulness 게이트 준수). 재검증.
- **C9 우대 요건(warning):** 차단하지 않고 커버율을 사용자에게 안내. 보유 우대 요건이 있는데 누락됐으면 추가 권유.
- **종료 조건:** **C1·C2·C5·C7·C8·C11 = 합격(critical 0건)** + C3·C4·C6 합격 + C9·C10은 사용자 확인 완료. 한 critical이라도 불합격이면 루프를 멈추지 않는다. 통과 시 `save_cover_letter_version`/`save_fit_analysis`/`save_interview_prep` 등 다음 단계로 진행하고 대시보드(`http://127.0.0.1:4319`) 링크를 안내한다.

## 4. 출처 (Provenance)

- **STAR 프레임워크(Situation·Task·Action·Result) — 면접 응답 형식 요건(C5)** — (1차/대학 커리어센터) UVA Career Center · https://career.virginia.edu/Students/Launch/Interviews/STAR ; Northwestern Career Advancement · https://www.northwestern.edu/careers/jobs-internships/interviewing/the-star-approach.html
- **면접 비응답(off-target)·우회·횡설수설이 부정적 인상과 탈락으로 직결 — 직접 응답성(C7·C10)** — (1차/정부·표준) U.S. DOL/ILAB Enumerator Training: Interviewing Techniques(질문에 직접·간결 응답, 드리프트 시 probing으로 복귀) · https://www.dol.gov/sites/dolgov/files/ILAB/Section%202%20-%20ILAB%20Enumerator%20Training%20Manual%20-%20Interviewing%20Techniques.pdf
- **응답이 질문과 불일치하는 현상의 측정 가능성(2~4% 반복 비응답) — 응답성을 독립 축으로 계량 가능 근거** — (1차/연구기관) Pew Research Center, "Answers that did not match the question" · https://www.pewresearch.org/methods/2020/02/18/answers-that-did-not-match-the-question-were-concentrated-in-opt-in-polls/
- **JD 키워드 커버리지·매치율(필수/우대 분리, 섹션 가중, 60~85% 타깃) — JD 요건 응답성(C8·C9)** — (2차/벤더) Jobscan Resume Scanner · https://www.jobscan.co/resume-scanner ; Scale.jobs, "Match Resume Keywords to Job Descriptions" · https://scale.jobs/blog/how-to-match-resume-keywords-to-job-descriptions
- **한국 자소서 정형 문항 유형(지원동기·성장과정·직무역량·입사 후 포부)과 문항별 요구 요소·평가표 — directive 커버리지(C2)·locale 분기** — (2차/공공·취업지원) 광주광역시 서구 일자리센터, "자기소개서의 이해 및 문항유형" · https://www.seogu.gwangju.kr/menu.es?mid=b70502010200 ; HAIJOB, "자소서 항목별 작성법" · https://www.haijob.co.kr/blog/how-to-prepare-for-each-item-of-cover-letter-motivation-for-application-growth-process-job-competency-aspiration-after-joining-the-company-etc/
- **한국 자사양식 자소서 글자 수 제한 준수 — 분량 게이트(C6)** — (2차/취업지원) 인크루트, "자소서 직무역량 전략적 작성 TIP" · https://news.incruit.com/news/newsview.asp?newsno=436828

## 5. Phase B 힌트

- **MCP 도구 아이디어:**
  - `get_verifier({ id: "responsiveness-on-target" })` — 이 루브릭(검사 항목·directive 맵·locale 분기)을 구조화 JSON으로 연결 AI에 제공.
  - `extract_questions({ source })` — 자소서 문항/면접 질문/JD 텍스트에서 질문 단위와 directive·형식·글자 수 제약·전제를 구조화해 추출(추출은 연결 AI, 스키마는 CareerMate가 제공).
  - `precount_responsiveness({ qa_pairs, jd })` — LLM 없이 결정론으로 셀 수 있는 항목(C1 매핑, C2 directive 토큰, C3 키워드 교집합, C4 첫 문장, C5 형식 토큰, C6 글자 수, C8/C9 요건 커버리지)을 로컬에서 미리 카운트해 후보 위반 표시. 의미 판정(C7·C10·C11)은 연결 AI 몫. 두뇌는 외부 AI라는 원칙상 "측정 보조"로만 한정.
  - `get_kr_question_schema({ question_type })` — "지원동기/성장과정/직무역량/입사 후 포부" 등 한국 정형 문항별 필수 요소표(directive 체크리스트)를 데이터로 제공·버전 관리.
- **데이터 형태 힌트:**
  - 질문: `{ id, source: "cover_letter"|"interview"|"jd", text, directives: ["experience"|"reason"|"plan"|"lesson"], format: ["star"|"example"|...], char_limit: { min, max } | null, constraints: ["team"|"failure"|"recent_3y"], keywords: string[] }`.
  - JD 요건: `{ requirements: [{ text, level: "required"|"preferred", keywords: string[] }] }`.
  - 응답: `{ question_id, text }` (질문과 1:1 매핑).
  - 결과 리포트: `{ outcome: "pass"|"fail", failed_checks: [{ id, observed, threshold, evidence: { unanswered_qids?, missing_directives?, missing_keywords?, char_overflow?, uncovered_requirements? } }], loop: "rewrite"|"gather_data"|"done" }` — 루프 오케스트레이션이 `failed_checks`만 보고 보강 지시를 생성.
  - 임계값(키워드 60%, JD 필수 80%·우대 50%, 딴소리 <20%, 글자 수 등)은 코드 상수가 아니라 설정값으로 두어 산출물 유형·locale(KR/global)별 프로파일을 허용.
