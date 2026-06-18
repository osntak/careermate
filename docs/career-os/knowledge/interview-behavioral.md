# 면접 — 행동 / Behavioral Interview — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

행동 면접은 "과거 행동이 미래 성과를 예측한다"는 행동 일관성(behavioral consistency) 원리에 기반한 구조화 면접이다. 면접관은 지원자의 과거 사례를 STAR(Situation·Task·Action·Result) 형태로 듣고, 직무 관련 역량(competency)·회사 가치에 매핑해 채점한다. CareerMate는 LLM이 없으므로, 연결된 외부 AI가 사용자의 실제 경험을 STAR로 재구성하고, 역량에 매핑하며, 실측 정량 결과를 분리해내고, **후속 질문(probing)에 견디는 스토리 뱅크**를 만들도록 돕는 지식·루브릭을 제공한다. 핵심은 ① 개인 기여를 1인칭으로 분리, ② Result를 **검증 가능한** 실측 수치로, ③ 각 스토리를 controlled vocabulary 역량 태그에 매핑, ④ 사례마다 probing 답(왜·대안·되돌아보면)을 미리 준비하는 것이다. 아래 루브릭은 어느 체크가 **결정론적으로 셀 수 있고(D)**, 어느 체크가 **외부 AI의 의미 판단을 전제로 한 보조 휴리스틱(H)**인지를 등급으로 명시 구분한다 — 전부 동급의 기계 검증인 척하지 않는다.

## 2. 플레이북

### 원칙

- **(STAR 4요소를 빠짐없이 채우되, Action에 가장 많은 분량과 '결정의 밀도'를 둔다.)** — 면접관이 평가하는 것은 Situation의 장황함이 아니라 지원자가 내린 구체적 결정·행동이다. Result가 빠지면 임팩트 평가가 불가능하다. **단, 'Action 50% / Result 25% / Situation 15% / Task 10%'라는 비율은 1차 채점 연구가 아니라 대학 커리어센터의 코칭 휴리스틱일 뿐이므로, 합격 게이트가 아니라 soft 가이드로만 쓴다.** 길이가 아니라 '구체 결정 동사 개수'가 Action 품질의 진짜 신호다. _(출처: Northwestern Career Advancement STAR Approach — 휴리스틱, 4절 신뢰도 주석 참조)_
- **(Action·Result는 'we'가 아니라 'I/제가'로 개인 기여를 분리해 쓴다.)** — 면접관은 팀이 아니라 지원자 개인의 역량을 채점한다. 팀 맥락은 Situation에서 한 줄로 깔고, Action에서 '제가 ~을 결정/제안/구현했다'로 본인 행동을 드러낸다. **한국어는 주어 생략이 자연스러우므로('~을 제안했습니다') 'I' 토큰 카운트가 아니라 '제가/내가' 명시 빈도 + 집단대명사(저희/우리) 대비로 측정한다.** _(출처: UVA Career Center, Bauer College STAR guide)_
- **(Result는 실측 수치로 정량화하되, 검증 가능성과 짝지어 쓴다.)** — 가능하면 숫자+단위(%, 시간, 금액, 인원, 순위, 기간)로 표현한다. **단, "만족도 100%"·"효율 200% 개선" 같은 분모·기간·출처 없는 숫자는 probing에서 즉시 무너진다.** 각 수치에는 측정 범위(label)와 원자료 링크(sourceRef)를 붙여 진위를 보장한다. 정량화가 불가능하면 검증 가능한 정성 결과(채택됨/재현됨/재계약)와 학습을 명시한다. _(출처: Amazon STAR guidance, UVA Career Center)_
- **(답변 전, 질문이 겨냥하는 역량/회사가치를 controlled vocabulary로 먼저 식별하고 매핑한다.)** — 구조화 면접의 변별력은 표준화·동일 질문·앵커드 채점표(BARS)에서 나오며, 역량 매핑은 그 일부다(역량 매핑 단독이 우수성의 원인이라는 단정은 과도 단순화). 채용공고 요구 역량에서 역으로 스토리를 고른다. **태그 인플레이션을 막기 위해 역량은 고정 enum을 쓴다(아래 택소노미).** _(출처: U.S. OPM Structured Interviews; Northwestern)_
- **(스토리 뱅크를 미리 8~12개 구축하고, 각 사례에 probing 답 3종을 함께 준비한다.)** — 한 사례를 여러 질문에 변주해 즉석 누락을 막는다. **Amazon 루프 등에서 후보가 떨어지는 1순위는 첫 답변이 아니라 probing 붕괴이므로, 각 사례에 '왜 그 결정을 했나 / 대안은 무엇이었나 / 되돌아보면 무엇을 바꾸겠나' 답을 미리 채운다.** _(출처: Amazon Behavioral Interview 가이드, UVA·Wisconsin 등)_
- **(사례는 최신성·직무관련성을 갖춰야 한다.)** — 시니어/경력직에게 8년 전 인턴·학부 프로젝트만 가득한 뱅크는 반려 사유다. 각 사례에 연도·역할단계를 기록하고, 경력직은 최근 N년 내 사례 비율을 확보한다. _(출처: 채용 실무 — recency/relevance, hiring manager review)_
- **(사실·수치·고유명사는 절대 지어내지 않는다. 실패 사례는 조건부로만 쓴다.)** — 면접관은 probing으로 꾸민 이야기를 검증한다. 실패 사례는 회복·재발방지 행동이 Result보다 길고 구체적일 때만 강점이 되며, 일부 문화권 면접관은 부정 신호로 받을 수 있으므로 '학습·후속 개선'이 핵심이 아닐 거면 쓰지 않는다. _(출처: CareerMate AGENTS.md, Amazon probing follow-ups, UVA)_
- **(키워드 스터핑을 경계한다.)** — 회사 가치에 '단어 수준으로 맞추라'는 조언은 과하면 '준비된 앵무새'로 보인다. LP/가치 키워드는 실제 사례의 행동이 그 가치를 **입증**할 때만 쓰고, 키워드를 라벨처럼 나열하지 않는다. 구조화 면접은 adverse impact를 줄이고 법적 방어가능성을 높이는 공정성 도구라는 점도 기억한다. _(출처: U.S. OPM Structured Interviews)_

### Do

- 질문을 받으면 먼저 '이 질문이 겨냥하는 역량/회사가치'를 controlled vocabulary 태그로 한 줄 명시하고 스토리를 매핑하라.
- STAR 4요소를 모두 채우고, Action에 '구체 결정 동사(결정/제안/설계/구현/협상/분석)' 3개 이상을 1인칭으로 담아라. Situation·Task는 각각 1~2문장으로 압축하라.
- Action·Result는 '제가/내가 ~했다'로 본인 기여를 분리하라(한국어는 '저희/우리' 습관을 의식적으로 '제가'로 전환).
- Result에 **사용자 실측** 숫자+단위를 최소 1개 넣고, 각 수치에 label(무엇을 잰 것인지)과 sourceRef(원자료)를 붙여라. 불가능하면 검증 가능한 정성 결과+학습을 명시하라.
- 8~12개 핵심 사례로 스토리 뱅크를 만들고, 각 사례를 여러 역량 enum에 다중 태깅하며, **사례마다 probing 답 3종을 채워라.**
- 각 사례에 연도·역할단계를 기록하고, 경력직은 최근 사례를 우선 배치하라.
- 채용공고 요구 역량에서 역으로 어떤 사례를 쓸지 고르고, 회사 고유 가치를 '키워드'가 아니라 '행동으로 입증'하는 방식으로 맞춰라.
- 실패/약한 결과 사례는 회복·재발방지 행동이 충분할 때만 쓰고, '내 판단의 오류'와 '배운 점·후속 개선'으로 프레이밍하라.
- 답변을 소리 내어 리허설해 30초~2분(영어 약 130~330단어 / 한국어 약 90~230어절)로 다듬어라.

### Don't

- Situation/배경을 장황하게 늘어놓아 Action이 묻히게 하지 마라(Situation이 답변의 25%를 넘기면 경고 신호).
- 팀 성과를 'we/저희'로만 서술해 본인 기여를 흐리지 마라.
- Result를 생략하거나 '잘 끝났다' 같은 모호한 표현으로 뭉뚱그리지 마라.
- **검증 불가능한 가짜 숫자('만족도 100%', '효율 200%')를 채워 넣지 마라** — probing에서 분모·기간을 묻는 순간 무너진다.
- 수치·날짜·고유명사를 지어내거나 과장하지 마라.
- 하나의 만능 사례를 모든 질문에 우겨넣지 마라(같은 스토리를 3개 이상 다른 질문에 재탕 금지).
- '저는 열정적이고 성실합니다' 같은 형용사 나열로 답하지 마라 — 행동·증거로 보여라.
- 회사 가치/LP 키워드를 행동 입증 없이 라벨처럼 나열하지 마라('준비된 앵무새' 신호).
- 미래 가정형('저라면 ~할 것입니다')으로만 답하지 마라 — 실제 과거 사례를 들어라.
- 5년 전 학부 프로젝트만으로 시니어 직무에 답하지 마라(최신성·직무관련성 결여).

### 워크드 예시 (Before → After)

> 아래 after의 모든 수치는 **사용자가 제공한 실측 데이터**이며 각 수치에 label·sourceRef가 연결되어 있다는 전제다.

1. **Before:** 질문: '갈등을 해결한 경험을 말해보세요.' 답변: "저희 팀은 의견 차이가 있었지만 서로 소통하며 잘 협력해서 결국 프로젝트를 성공적으로 마쳤습니다. 저는 항상 팀워크를 중요하게 생각하고 갈등 상황에서도 긍정적으로 대처하는 편입니다."
   **After:** `[역량: conflict, ownership]` **S:** 작년 출시 2주 전, 디자이너와 개발자가 핵심 화면 구현 범위로 충돌해 일정이 멈췄습니다(1문장). **T:** PM이던 제가 양쪽 합의안을 도출해 일정을 지키는 것이 목표였습니다. **A:** 저는 두 사람을 따로 인터뷰해 진짜 우려(디자인 완성도 vs 공수)를 분리한 뒤, 화면을 'MVP 필수/후속' 두 단계로 쪼개는 안을 직접 와이어프레임으로 제안했고, 후속 항목의 사용 빈도가 낮음을 데이터로 보여 합의를 끌어냈습니다. **R:** 일정 지연 0일로 정시 출시했고, 분리한 후속 기능은 다음 스프린트에 반영, 해당 출시의 D+7 리텐션이 기존 대비 12%p 높았습니다(label: D+7 retention, source: 사내 대시보드). **Probing 준비:** (왜) 데이터로 설득한 이유 / (대안) 일정 연기 vs 범위 축소 비교 / (되돌아보면) 충돌 초기에 데이터를 먼저 꺼냈으면 더 빨랐을 것.
   **왜 더 나은가:** Before는 'we'·형용사 나열·결과 무수치·미래형 혼재로 채점 불가. After는 역량 매핑 명시, S/T 압축, Action을 1인칭 구체 결정 동사로 채움, Result를 label·source 붙은 실측 수치(0일·12%p)로 정량화하고 probing 3종을 갖춰 후속 질문에 견딘다.

2. **Before:** 질문: "Tell me about a time you took ownership." 답변: "We had a production bug and we worked together to fix it. It was stressful but we managed to resolve it and customers were happy in the end."
   **After:** `[역량: ownership, customer-focus]` **S:** 결제 API에서 0.8% 거래가 실패하는 버그가 새벽에 발생했습니다. **T:** 온콜이 아니었지만 제가 영향 범위를 끝까지 책임지기로 했습니다. **A:** I triaged logs, isolated a race condition in the retry handler, shipped a hotfix within 70 minutes, then wrote a postmortem and added a regression test + an alert so it couldn't silently recur. **R:** 영향 거래의 100%를 수동 재처리해 매출 손실 0원, 동일 클래스 장애 재발 0건(6개월 추적), 알람 덕에 평균 탐지시간을 ~40분에서 ~3분으로 단축(label: MTTD, source: 모니터링 로그). **Probing 준비:** (왜) 온콜이 아닌데 책임진 이유 / (대안) 롤백 vs 핫픽스 트레이드오프 / (되돌아보면) 알람을 사전에 뒀어야 함.
   **왜 더 나은가:** Before는 전부 'we'·정량 결과 없음·역량 무매핑. After는 ownership/customer-focus 매핑, 1인칭 결정 동사, label·source 붙은 실측 수치(0.8%·70분·0원·40→3분)로 임팩트를 증명하고 probing 3종으로 Amazon 루프식 깊이 질문에 대응한다.

3. **Before:** 질문: '실패한 경험을 말해보세요.' 답변: "저는 큰 실패는 없었던 것 같습니다. 굳이 꼽자면 시간 관리가 조금 아쉬웠는데, 지금은 잘 관리하고 있습니다."
   **After:** `[역량: growth-learning]` **S:** 첫 사이드프로젝트에서 사용자 검증 없이 4개월간 기능부터 만들었습니다. **T:** 출시 후 사용자를 모으는 것이 목표였습니다. **A:** 저는 가설 검증을 건너뛴 채 개발에 몰입했고, 출시 후에야 핵심 가정이 틀렸음을 알았습니다. 이후 저는 즉시 10명 인터뷰를 돌려 문제를 재정의하고, 2주짜리 프로토타입으로 다시 검증하는 방식으로 프로세스를 바꿨습니다(재발방지 행동이 Result보다 김). **R:** 원래 제품은 가입 9명에 그쳤지만, 재검증 후 만든 버전은 4주 만에 활성 사용자 120명을 모았습니다(label: WAU, source: 가입 로그). '만들기 전에 검증한다'를 이후 모든 프로젝트의 기본 규칙으로 삼았습니다. **Probing 준비:** (왜) 검증을 건너뛴 이유 / (대안) MVP를 먼저 냈다면 / (되돌아보면) 4개월→2주로 단축한 학습.
   **왜 더 나은가:** Before는 실패를 회피해 자기인식·성장성을 증명하지 못한다. After는 진짜 실패를 정직하게 인정하고, **재발방지 행동을 Result보다 길게** 써 학습을 증명하며(조건부 실패 사례 원칙 충족), 정량 대비(9명→120명)로 회복을 보인다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **전제(중요):** 루브릭은 자유 텍스트가 아니라 **`StoryBankEntry` 구조화 레코드 배열**을 입력으로 받는다. S/T/A/R 경계는 자유 텍스트를 LLM이 의미로 갈라야 하므로, CareerMate는 먼저 `save_interview_prep`으로 STAR를 **필드 분리 저장**하게 한다. 그러면 다수 체크가 필드 non-empty / 패턴 카운트로 결정론적이 된다.
>
> **등급 표기:** `D` = LLM 없이 결정론적으로 셀 수 있음(필드 존재·정규식·카운트). `H` = 외부 AI(또는 사람)의 의미 판단을 전제로 한 보조 휴리스틱 — 자동 합격 판정 금지, `warn`/`needs_review`로만 반환. 이 구분을 흐려 전부 기계 검증인 척하지 않는다.

| ID | 등급 | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게 / H는 전제 명시) |
|----|------|-----------|-----------|--------------------------------|
| R1 BI-STAR-FIELDS | **D** | STAR 4필드가 모두 채워졌는가 | 각 entry의 `star.situation/task/action/result` 4필드 모두 non-empty (특히 result 누락 0) | 4필드 `len(trim)>0` 카운트 ==4. **필드 분리 저장 전제이므로 의미 라벨링 불필요.** result 필드 boolean 별도 체크. |
| R2 BI-SITUATION-CAP | **D** | Situation이 과도하게 길지 않은가 (anti-pattern) | `wordCounts.s / wordCounts.total <= 0.25` | 필드별 단어/어절 수 비율 계산. **Action 비율을 합격 게이트로 강제하지 않음**(50/25/15/10은 휴리스틱) — 대신 Situation 비대만 경고. |
| R3 BI-ACTION-DECISIONS | **H** | Action에 구체 결정 행동이 충분한가 | Action에 결정 동사 ≥3 (길이가 아닌 밀도) | 결정 동사 사전 매칭(한: 결정/제안/설계/구현/협상/분석/주도; 영: decided/proposed/designed/built/negotiated/analyzed/led) 카운트 ≥3. 사전 밖 동의어는 외부 AI 판정(H). |
| R4 BI-FIRST-PERSON | **D**(언어 분기) | Action에서 개인 기여가 1인칭으로 우세한가 | 1인칭 ≥ 집단대명사 AND 1인칭 ≥1 | **영어:** `I/my/me` 토큰 수 vs `we/our/us`. **한국어:** 주어 생략이 자연스러우므로 `제가/내가` 명시 빈도 vs `저희/우리` 빈도 비교(주어 토큰 부재≠fail). `lang` 필드로 분기. |
| R5 BI-QUANT-RESULT | **D** | Result에 정량 수치가 있는가 | `star.result`에 단위 부착 숫자 ≥1 또는 검증 가능 정성결과 플래그 | result 텍스트에서 `\d+%`, `\d+\s*→\s*\d+`, `[+\-]\d+`, `\d+(ms|초|분|시간|원|명|건|일|위|배)` 매칭 ≥1. 연도/버전 단독은 배제. 수치 없으면 `qualitative_verified` 플래그 확인. |
| R6 BI-METRIC-CREDIBLE | **D** | 각 수치가 검증 가능 메타를 갖췄는가 | `metrics[]`의 각 항목에 `label` AND `sourceRef` 모두 non-empty | over-coaching/가짜수치 가드. `metrics[]` 순회하며 둘 다 채워졌는지 카운트. 비면 "검증 불가 수치" 경고 — R5와 결합해야 '숫자만 있으면 통과'를 막는다. |
| R7 BI-COMPETENCY-TAG | **D**(존재) / **H**(적합) | 역량 태그가 controlled vocab에서 부여됐는가 | `competencies[]` ≥1 AND 모두 고정 enum에 속함 | 태그 존재·enum 소속은 D(set 검사). **태그가 '질문 의도와 실제로 일치'하는지는 H**(의미 판단) — needs_review로 분리. |
| R8 BI-PROBING-READY | **D** | 사례에 probing 답 3종이 준비됐는가 | `probing.why` / `probing.alternatives` / `probing.whatIdChange` 모두 non-empty | 3필드 존재 카운트 ==3. **probing 붕괴가 탈락 1순위이므로 핵심 게이트.** 셀 수 있는 존재 검사. |
| R9 BI-ANSWER-LENGTH | **D**(언어 분기) | 구두 전달에 적합한 길이인가 (soft) | 영어 130~330단어 / 한국어 90~230어절 | `lang`별 분기 카운트. 한국어 어절은 영어 word보다 정보밀도가 높아 동일 발화시간에 어절 수가 적다 — **'유사 범위' 금지, 언어별 임계 분리.** 범위 밖은 warn. |
| R10 BI-RECENCY | **D**(soft) | 사례가 충분히 최신인가 | 경력직: 최근 5년 내 사례 비율 ≥50% | 각 entry `year`/`careerStage` 파싱 후 `현재연도(2026) - year <= 5` 비율. 학부/인턴만 가득하면 경고(하드 실패 아님, 신입은 면제). |
| R11 BI-BANK-COVERAGE | **D** | 뱅크가 역량 카테고리를 충분히 커버하는가 | 서로 다른 entry ≥8 AND distinct 역량(enum) ≥6 | entry 개수 + `competencies[]` 합집합 distinct 카운트. **고정 enum 전제라 태그 인플레이션 없이 distinct가 유의미.** |
| R12 BI-REUSE-GUARD | **D** | 한 사례를 과도하게 재탕하지 않는가 | 같은 entry를 서로 다른 질문 유형에 매핑한 횟수 ≤2 | `questionMappings[entryId]` 카운트가 entry당 ≤2인지. 만능 사례 우겨넣기 가드. |
| R13 BI-NO-FABRICATION | **needs_review (H)** | 수치·고유명사가 지어내지 않았는가 | **자동 합격 판정 없음 — 확인 플래그만.** | **순수 set-diff 금지**(70분≈'약 1시간', 40→3분 같은 파생값, 단위변환, NER로 거짓양성/음성 폭발). 좁힌 D 검사: 답변의 숫자 리터럴이 `metrics[].value`(사용자 입력)에 매칭되는지 literal-match. 그 외 신규 수치·고유명사는 "검토 필요" 목록으로 모아 외부 AI/사람에게 토스. |

**Controlled vocabulary (역량 enum, 태그 인플레이션 방지 — distinct 카운트의 전제):**
`leadership`, `ownership`, `conflict`, `failure-learning`(=growth-learning), `initiative`, `data-driven`, `customer-focus`, `collaboration`, `deadline-pressure`, `ambiguity`, `influence`, `mentoring`. 회사 고유 가치는 `companyValueTags`(예: `Amazon:Ownership`)로 별도 부여하되, 반드시 위 enum 중 하나에 연결한다.

**주요 실패 모드:**
- **probing 붕괴(탈락 1순위):** 첫 답변만 다듬고 '왜·대안·되돌아보면'을 준비 안 함 → R8 존재 게이트로 강제.
- **가짜 수치 보상:** R5가 '숫자 존재'만 보면 조작 수치도 통과 → 반드시 R6(label+sourceRef)·R13(검토)과 결합.
- **등급 사칭(루브릭 과대광고):** S/T/A/R 라벨링·역량 적합·고유명사 진위를 'D'인 척 자동 판정 → R13은 needs_review, R3·R7(적합)은 H로 고정.
- **한국어 깨짐:** 영어 'I' 카운트를 한국어에 적용해 정상 답을 fail → R4·R9는 `lang` 분기 필수.
- **휴리스틱의 게이트화:** 50/25/15/10 비율을 합격 기준으로 강제 → R2(Situation 상한)만 게이트, Action 비율은 비게이트.
- **태그 인플레이션:** enum 없이 distinct 카운트 → R11이 무의미. 고정 vocabulary 전제.
- **노후/만능 사례:** 8년 전 사례·재탕 → R10·R12로 카운트.

## 4. 출처 (Provenance)

> **신뢰도 주석(중요):** **예측타당도 '.51'은 Schmidt & Hunter(1998)의 수치이며, Sackett, Zhang, Berry & Lievens(2022)가 range-restriction 과대보정 오류를 지적해 사실상 하향됐다.** 보정 관행이 타당도를 과대추정했음이 드러나, 구조화 면접의 현재 최선 추정치는 **약 .42(80% credibility interval 약 .18~.66, 즉 ±.24 수준의 넓은 폭)**이고, 인지능력검사(GMA) 등 다른 도구와의 순위도 재배열됐다. **따라서 '.51로 채용 도구 중 최상위권'이라 단정하지 않는다** — 절대값은 신뢰구간으로 보고하고, 유지되는 것은 '구조화 > 비구조화'라는 **순서**뿐이다. 두 출처는 '상호 보강'이 아니라 **충돌**(후자가 전자를 보정)임을 명시한다. 또한 STAR 50/25/15/10 비율은 어느 1차 연구에도 없는 **코칭 휴리스틱**이며, 대학 커리어센터 자료는 학부생 코칭 콘텐츠이지 채용 타당도의 1차 근거가 아니다(방향성 참고용).

- **Schmidt & Hunter (1998) "The Validity and Utility of Selection Methods"** — 구조화 면접 .51 / 비구조화 .38의 **원출처(현재는 과대추정으로 간주)**. 1998년 메타분석을 2026년 정설로 인용하지 않는다.
- **Sackett, Zhang, Berry & Lievens (2022)** — range-restriction 보정 재분석. 구조화 면접 ~.42(80% CI 약 .18~.66), GMA ~.31로 하향, 신뢰구간 보고 관행. **본 문서의 헤드라인 수치는 이 보정치를 따른다.**
- **U.S. OPM — Structured Interviews** — 행동 일관성 원리, 구조화의 핵심 동인(표준화·동일 질문·앵커드 채점표 BARS), 직무관련 역량 차원 채점, adverse impact 감소·법적 방어가능성 · https://www.opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/structured-interviews/
- **Amazon Leadership Principles / STAR 면접 가이드** — Situation 압축·Result 정량화·Action 시간 집중, 인터뷰어가 가치 2~3개씩 배정 채점, probing follow-up(깊이 질문). **단, 한국 지원자 다수의 실제 타깃(국내 대기업 인성면접·스타트업 컬처핏)과는 거리가 있어 '대표 예시'가 아닌 '한 사례'로만 사용** · https://www.amazon.jobs/en/landing_pages/in-person-interview
- **Northwestern Career Advancement — STAR Approach** — STAR 4요소 정의, 직무기술서 기반 사례 선택 · STAR 분량 비율은 **휴리스틱**으로만 인용 · https://www.northwestern.edu/careers/jobs-internships/interviewing/the-star-approach.html _(학부 코칭 콘텐츠)_
- **UVA Career Center — STAR Method** — 'we 대신 I', Result 강조(학생 자주 누락), 부정적 결과를 회복탄력성으로 전환 · https://career.virginia.edu/Students/Launch/Interviews/STAR _(학부 코칭 콘텐츠)_
- **Bauer College (University of Houston) — STAR Behavioral Interview Technique** — 1인칭 개인 기여 강조, STAR 실무 적용 · https://careercenter.bauer.uh.edu/resources/star-behavioral-interview-technique/ _(학부 코칭 콘텐츠)_
- **AGENTS.md (CareerMate 프라임 디렉티브)** — 사실·수치·고유명사 보존, 과장·날조 금지 · 저장소 내부

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_behavioral_interview_kit({ job_id?, competency?, count? })` — `get_application_context`의 프로필·경력·스킬·대상 공고를 받아 (1) 저장된 스토리 뱅크에서 요청 역량/회사가치에 매핑되는 STAR 사례를 서빙, (2) 비어 있는 역량 카테고리·probing 누락·노후 사례를 `gap`으로 알려주고, (3) 본 루브릭(R1~R13, 등급 D/H 표기)을 함께 반환해 외부 AI가 자가검증하게 한다. read-only 지식 도구.
  - `save_interview_prep({ job_id, stories[] })` — STAR를 **필드 분리(situation/task/action/result)** 로 강제 저장(자유 텍스트 금지 → S/T/A/R 경계 문제 해소, 루브릭 결정성 확보). `metrics[]`에 label·sourceRef를 강제해 R6/R13 가드를 데이터 구조 차원에서 건다.
  - `lint_interview_kit(job_id?)` — R1~R13을 등급별로 실행. **D 항목은 pass/fail, H 항목(R3 적합·R7 적합·R13)은 `warn`/`needs_review`만 반환**(자동 합격 금지). `lang` 필드로 R4·R9 분기. 8단계 게이팅상 **면접 준비는 `document_passed` 이상에서만 해금.**
- **데이터 형태 힌트:**
  ```
  StoryBankEntry {
    id, title,
    lang: 'ko' | 'en',                         // R4·R9 언어 분기
    competencies: string[],                     // 고정 enum만 (R7·R11)
    companyValueTags?: string[],                // 예: ['Amazon:Ownership'] — enum에 연결
    star: { situation, task, action, result },  // 필드 분리 저장 (R1·R2)
    metrics: [{ value:number, unit, label, sourceRef }],  // label+sourceRef 필수 (R6·R13)
    probing: { why, alternatives, whatIdChange },         // 3종 필수 (R8)
    year: number, careerStage: 'student'|'intern'|'junior'|'senior',  // R10
    questionMappings: string[],                 // 이 사례가 매핑된 질문 유형 (R12 재탕 가드)
    wordCounts: { s, t, a, r, total },          // R2·R9
    sourceRefs: string[]                        // 프로필/경력 항목 id — fabrication 방지 원자료 링크
  }
  ```
  도구 응답에는 `entries[]`, `coverage: { distinctCompetencies, count, missingCategories, recentRatio }`, `rubric: RubricCheck[]`(각 항목에 `grade: 'D'|'H'`, `status: 'pass'|'fail'|'warn'|'needs_review'`)를 함께 포함해 외부 AI가 등급을 구분해 자가검증하도록 한다.
