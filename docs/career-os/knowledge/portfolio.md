# 포트폴리오 / Portfolio — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

포트폴리오는 "예쁘게 보여주기"가 아니라 **채용 의사결정자가 짧은 시간에 지원자의 문제 해결 능력을 신뢰하게 만드는 증거 모음**이다. 핵심은 다섯 축이다: (1) `problem → approach → impact` 3막 서사, (2) 직무에 맞는 3~6개 선별(큐레이션), (3) 팀 작업에서 "내가 실제로 한 것"을 1인칭으로 분리, (4) 정량 결과(숫자·전후 비교)로 임팩트 입증, (5) 직군별 규범(eng/design/PM/data) 준수. CareerMate는 LLM이 없으므로, 작성은 연결된 외부 AI가 한다. 결과를 **구조화 레코드(`PortfolioItem`)로 저장**하고 **LLM 없이 결정적으로 셀 수 있는 lint 루브릭**으로 검증하는 `save_portfolio_item`·`lint_portfolio`는 **Phase B 설계이며 현재 미구현** — 지금은 연결 AI가 아래 루브릭을 **수동(advisory)**으로 적용한다(§5 Phase B 힌트; 자유텍스트 입력 시 구조화 필드 전제인 R1·R3·R4 등은 측정이 degrade되므로 연결 AI가 해석 적용). 따라서 아래 루브릭은 자유 텍스트가 아니라 **구조화 필드를 입력 전제**로 설계되어 있다.

## 2. 플레이북

### 원칙

- **각 항목을 `problem(문제) → approach/역할(접근) → impact(결과)` 3막으로 쓰고, 결과물 스크린샷보다 "왜 그 결정을 했는가"에 분량을 더 쓴다.** — 채용 담당자는 결과물 자체가 아니라 트레이드오프를 다루는 방식으로 미래 협업을 상상한다. why가 빠진 케이스는 "예쁘지만 기억에 안 남는" 항목이 된다. _(출처: uxfol.io UX Case Study Structure)_
- **직무에 맞는 강한 항목으로 선별한다(가이드 기본값 3~6개, 단 경력 레벨·직군에 따라 조정).** 10개 이상의 얕은 항목보다 4개의 깊은 항목이 낫다. 다만 시니어/풀스택은 다직군 7~8개가 정상이고, 신입은 2개가 최선일 수 있다 — 개수는 **하드 실패가 아니라 soft-warning**이다. _(출처: icreatives Portfolio Review / Hakia Developer Portfolio Guide — SEO 콘텐츠, 4절 신뢰도 주석 참조)_
- **팀 프로젝트에서는 `my_role` 필드에 본인이 소유한 결정·구현·산출물을 동작 동사(설계/구현/주도/분석)로 명시한다.** `we/우리`로만 서술하면 개인 기여가 불명확해진다. 더 위험한 것은 **팀 작업을 `solo`로 태깅해 단독 기여로 포장하는 과대표현**이므로, 임팩트 수치마다 측정 범위(`method`)를 함께 적어 귀속을 분명히 한다. _(출처: thecrit.co Portfolio Project Examples)_
- **임팩트는 가능한 한 숫자 + 단위 + 전후(before→after) 비교로 표현한다(예: 전환율 3.2%→4.7%, +47%, 처리시간 -40%).** 숫자가 없으면 비교 기준·규모·범위(사용자 수·기간·트래픽)라도 제시한다. **이 수치는 반드시 사용자가 제공한 실측이어야 하며, AI가 그럴듯하게 지어내선 안 된다.** _(출처: The Muse STAR Method)_
- **직군별 규범을 따른다.** eng = 실행 가능한 README(목적·문제·실행법·라이브 데모/스크린샷) + 깔끔한 커밋 + 최소 1개 end-to-end 프로젝트; design = 리서치→결정→반복의 why; PM = 북극성/가드레일/진단 지표로 가치 정의; data = train/test 분리·복수 평가지표·온라인 A/B·가드레일·비즈니스 임팩트 정량화. _(출처: Flatiron README best practices / Meta Analytics DS framework)_
- **작업 당시의 제약(constraints)을 한 줄이라도 명시한다** — 마감, 기존 브랜드/legacy 시스템, 기술적 제약, 이해관계자/NDA. 제약 속 결정을 보여줘 맥락 인지를 입증한다. _(출처: icreatives Portfolio Review)_
- **한국 채용 맥락의 '경력기술서'는 포트폴리오 역할을 하되 형식이 다르다.** 경력기술서 **작성 규범·루브릭의 정본은 `eop/career-description.md`(+ `resume.md`)**이며, 이 포트폴리오 도메인은 그 규범을 재정의하지 않고 `case_study`가 아닌 `경력기술서` 항목을 그 정본으로 위임한다(**`case_study`의 3막 구성·증거 링크 규범은 이 portfolio.md 소유**). 회사·기간·역할·성과를 표/불릿로 쓰는 경우가 많아 산문 3막을 강제하면 정상 경력기술서를 오탐하므로, 3막 검증은 **`item_type`이 `case_study`인 항목에만** 적용하고, `경력기술서` 유형은 필드(역할·성과·기간) non-empty로만 검증한다. 사실·수치·고유명사는 **절대 과장·날조하지 않는다**(AGENTS.md 프라임 디렉티브). _(출처: AGENTS.md 사실 보존 규칙)_

### Do

- 각 항목을 `problem → approach → impact` 구조화 필드로 채우고, 맨 위에 한 줄 요약(무엇을 / 누구를 위해 / 결과)을 둔다.
- 팀 프로젝트는 `my_role` 필드에 본인 기여를 동작 동사로 1인칭 서술하고, 임팩트 수치마다 측정 범위·방법(`method`)을 적어 귀속을 분명히 한다.
- 임팩트를 숫자 + 단위 + 전후 비교로 표기한다(예: 전환율 3.2%→4.7%, +47%). 사내/NDA로 절대수치를 못 쓰면 **상대값·비율·범위·배수**로 대체한다(예: "전환율 약 1.5배", "두 자릿수 % 개선").
- 직군에 맞는 증거를 `evidence` 링크로 첨부한다: eng = 라이브 데모/repo/README, design = 리서치 근거·트레이드오프, PM = 지표 정의, data = 평가지표·A/B·노트북.
- 지원 직무(`target_job_ids`)의 핵심 스킬 키워드와 항목을 매핑해 "왜 이 항목이 이 직무에 적합한가"를 드러낸다(1차 ATS/스크리너 게이트).
- 최근 2~3년 내 항목을 우선 배치하고, `date`/기간 필드를 채워 신선도를 드러낸다.
- 케이스 스터디는 핵심 800~1,500단어 범위로 유지하되, **엔지니어 README·한국 경력기술서는 불릿 중심으로 훨씬 짧게** 쓴다(직군별 분량 규범이 다르다).

### Don't

- 최종 결과물 스크린샷만 나열하고 "왜 그렇게 결정했는지"를 생략하지 않는다.
- `우리/we`로만 서술해 개인 기여를 불명확하게 두지 않는다. **반대로 팀 성과를 `solo`로 태깅해 단독 기여인 양 포장하지도 않는다.**
- 직무와 무관한 얕은 항목을 분량 채우기로 끼워 가장 강한 항목을 희석하지 않는다.
- "성능을 크게 개선했다 / 안정적으로 운영했다 / 성공적으로 최적화했다" 같은 **모호 형용사로 끝내지 않는다**(수치·범위 없이). 숫자가 있어도 형용사 슬롭을 함께 쓰지 않는다.
- **입력 사실에 없는 숫자·성과·회사명·고유명사를 지어내거나 과장하지 않는다.** 환산·추정 손실액 같은 "그럴듯한 정량화"도 실측 근거 없이는 금지.
- README/실행법/라이브 데모 없이 코드 저장소 링크만 던지지 않는다(eng). **죽은 데모 링크·private 404는 최악 신호**다.
- 제약·트레이드오프 없는 "완벽한 이상적 결과"만 제시하지 않는다.
- 기술 스택 약어를 맥락 없이 나열하지 않는다. 5년 전 노후 스택(예: jQuery)만으로 채운 포트폴리오는 즉시 감점된다.

### 워크드 예시 (Before → After)

> 아래 after의 모든 수치는 **사용자가 제공한 실측 데이터**라는 전제다. AI가 임의로 만든 숫자가 아니다. 예시의 정합성(예: 이탈률 감소폭과 완료율 증가폭)도 사용자 입력에서 검증되어야 한다.

1. **Before:** 결제 페이지를 새로 디자인했습니다. 우리는 사용자 경험을 개선하기 위해 UI를 현대화하고 결제 흐름을 단순화했습니다. 깔끔하고 직관적인 디자인으로 만들었습니다. (스크린샷 4장)
   **After:** **문제:** 결제 단계 이탈률 68%(업계 평균 50% 상회). **제약:** 기존 PG 연동 변경 불가, 2주 스프린트. **내 역할(my_role):** 퍼널 분석으로 '주소 입력'을 이탈 핫스팟으로 특정, 3단계→1단계 통합 흐름을 설계·프로토타이핑하고 5명 사용성 테스트를 진행. **결과:** 결제 이탈률 68%→41%(-27%p, A/B 2주 p<0.05). 이 -27%p는 실측이며, 매출 환산은 사용자가 제공한 가정이 있을 때만 기재. [Figma 링크 / 테스트 노트]
   **왜 더 나은가:** before는 `we`·형용사 위주로 개인 기여·임팩트가 안 보인다. after는 문제를 숫자로 정의, 제약 명시, `my_role`로 본인 기여를 동작 동사로 분리, 결과를 전후 비교 + 통계로 정량화한다. (환산 매출은 사실 추적이 안 되면 빼는 것이 원칙.)

2. **Before:** 프로젝트: TaskFlow — 할 일 관리 앱. React, Node.js, MongoDB로 만들었습니다. GitHub: github.com/user/taskflow
   **After:** **TaskFlow** — 팀 할 일 관리 앱(풀스택, 1인 개발). **문제:** 소규모 팀이 Slack에 흩어진 할 일을 추적 못 함. **접근:** React+Node+MongoDB로 실시간 동기화(WebSocket), 낙관적 업데이트로 체감 지연 제거. **임팩트/규모:** 베타 사용자 120명, 일 평균 작업 1,400건, p95 응답 180ms. **트레이드오프:** 동시 편집 충돌을 CRDT 대신 last-write-wins + 버전 벡터로 해결(문서화). [라이브 데모(200 확인)] [README: 30초 실행법·아키텍처] [데모 영상 90초]
   **왜 더 나은가:** before는 스택 나열 + repo 링크뿐이라 목적·실행법·임팩트를 알 수 없다. after는 README/라이브 데모/실행법을 앞세우고(eng 규범), 문제→접근→임팩트를 정량화하며, 기술적 트레이드오프를 드러낸다. `WebSocket`·`CRDT`는 허용되는 기술 용어이지 날조 고유명사가 아니다.

3. **Before:** 추천 모델을 개발해 추천 품질을 향상시켰습니다. 다양한 알고리즘을 실험하고 가장 좋은 것을 선택했습니다.
   **After:** **문제:** 신규 사용자 첫 주 이탈률 54%, 콜드스타트가 인기상품 위주라 관련성 낮음. **접근:** train/test 시계열 분리, 베이스라인(인기순) 대비 협업필터링·콘텐츠기반·하이브리드 3종 비교, 오프라인 NDCG@10·Recall@20 + 온라인 A/B 평가. **결과:** 하이브리드가 베이스라인 대비 CTR +15%, 첫 주 리텐션 54%→61%(+7%p). **가드레일:** 추천 다양성(카탈로그 커버리지) 비저하 확인. (연 매출 기여 추정치는 사용자 제공 가정이 있을 때만.) [노트북 / 지표 대시보드]
   **왜 더 나은가:** before는 평가지표·비즈니스 임팩트가 전무하다. after는 data 직군 규범(train/test 분리·복수 평가지표·온라인 A/B·가드레일)을 따르고 모델 성능을 비즈니스 지표로 번역한다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **전제(중요):** 모든 루브릭은 자유 텍스트가 아니라 **`PortfolioItem` 구조화 레코드 배열**을 입력으로 받는다. "항목(item) 경계"는 **레코드 1개 = 1 항목**으로 못박는다. 자유 텍스트는 루브릭 대상이 아니며, 먼저 `save_portfolio_item`으로 구조화해야 한다. 이로써 대부분 체크가 키워드 매칭 대신 **필드 non-empty / 패턴 카운트**로 결정적(deterministic)·LLM-프리가 된다. **단 `save_portfolio_item`·`lint_portfolio`는 Phase B 미구현 — Phase A 현재는 연결 AI가 이 구조를 적용해 루브릭을 수동(advisory)으로 점검한다(자유텍스트 입력 시 결정성 degrade).**

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 PF-STRUCT-3ACT | (case_study 유형) 3막 필드가 모두 채워졌는가 | `item_type=case_study`인 항목 100%가 `problem`·`approach`·`impact` 필드 non-empty | 각 레코드의 세 필드가 빈 문자열/공백이 아닌지 `len(trim)>0` 카운트. `경력기술서` 유형은 대상에서 제외(역할·성과·기간 필드 non-empty로 대체 검증). |
| R2 PF-QUANT-IMPACT | 임팩트에 **의미 있는** 정량 지표가 있는가 | 각 항목 `impact[]`의 80% 이상에 단위·전후·증감 신호가 동반된 숫자 1개 이상 | `impact` 필드/배열에서만 매칭. **맨정수(bare integer) 단독은 불통과.** 통과 패턴: `\d+%`, `\d+\s*→\s*\d+`, `[+\-]\d+`, `x\d+`/`\d+배`, 단위 부착(`ms`,`초`,`원`,`건`,`p95`). 연도/버전/인원수(예: `2026`, `React 18`, `5명`)는 impact 필드 밖이면 자동 배제. |
| R3 PF-ROLE-OWN | 본인 기여가 동작 동사로 명시되고 귀속이 분명한가 | 모든 항목에 `my_role` non-empty + 동작 동사(설계/구현/주도/분석/개발/리드/built/led/designed/analyzed) ≥1, 그리고 팀 성과 수치엔 `method`/범위 동반 | `my_role` 길이 + 동사 사전 매칭(한/영). 한국어는 대명사 없이 `~했다/담당/주도`도 1인칭으로 인정. **solo 과대표현 가드:** `role_tag=solo`인데 `impact[].method`에 팀/공동 신호가 있으면 확인 플래그. |
| R4 PF-CURATION-COUNT | 항목 수가 큐레이션 범위인가 (soft) | 권장 3~6개. 범위 밖이면 **경고**(하드 실패 아님) | 레코드 개수 `n` 카운트. `n<3` 또는 `n>6`이면 warning + 경력 레벨/직군 다양성 메타로 맥락 판단 권고. 신입 2개·시니어 다직군 7~8개는 정상으로 허용. |
| R5 PF-CONSTRAINT | 각 항목에 제약이 명시되는가 | 항목의 70% 이상에 `constraints[]` 길이 ≥1 | `constraints` 배열 비어있지 않은 항목 비율 카운트. NDA/사내 항목은 "수치 제한" 자체가 제약으로 인정. |
| R6 PF-ENG-RUNNABLE | (eng 항목) 실행 가능성 증거가 있는가 | `domain=eng` 항목 100%에 `evidence` 중 `type∈{readme,demo,repo}` ≥1 + 실행법/데모 신호 | `evidence[].type` 카운트 + `approach`/`evidence`에 `README`·`실행/run/install/setup`·`demo/데모` 패턴 존재. eng인데 미충족 0건이면 통과. |
| R7 PF-LINK-FORMAT | 증거 링크가 형식·도달성 기준을 통과하는가 | `evidence[].url` 100%가 유효 URL 형식 + private/placeholder 패턴 아님. (네트워크 허용 시 HEAD 200) | URL 정규식 검증 + `localhost`/`example.com`/`TODO`/`<...>` 같은 placeholder 차단. **외부 네트워크 금지 정책 안에서는 형식·private 패턴 검사만**, 사용자가 허용하면 HEAD 요청으로 200 확인. |
| R8 PF-NO-VAGUE | 모호 형용사 슬롭이 없는가 | 모호 형용사 단독(또는 형용사 동반) 결과 문장 0건 | 확장 사전 매칭 — 한국어: `크게/대폭/현저히/많이/훨씬/확연히/눈에 띄게/유의미하게/큰 폭으로/효율적으로/안정적으로/성공적으로/원활하게/최적화/개선되었다/향상시켰다`; 영어: `significantly/greatly/substantially/dramatically/notably/seamlessly/improved/enhanced/streamlined/optimized`. 문장 분할은 `[.!?。\n]` 기준. **숫자가 있어도 형용사가 동반되면 경고**(숫자만 깔끔히 두도록 유도). |
| R9 PF-JD-MATCH | 대상 직무 키워드를 항목이 커버하는가 | `target_job_ids`가 있는 항목에서 직무 핵심 스킬 토큰 중 항목 텍스트 등장 비율 ≥40% | `get_application_context`의 직무 스킬 토큰 집합 ∩ 항목(`problem`+`approach`+`my_role`+`impact`) 토큰 집합 / 직무 토큰 수. 1차 ATS 게이트 신호. |
| R10 PF-RECENCY | 최신성 신호가 있는가 (soft) | 항목의 50% 이상이 최근 3년 내(`date` 필드 기준) | `date`/기간 필드 파싱 후 `현재연도 - year <= 3` 비율. 미충족 시 "노후 스택 감점 위험" 경고(하드 실패 아님). |
| R11 PF-WORDCOUNT | 항목 분량이 직군 규범 내인가 (soft) | case_study 800~1,500단어; eng README/경력기술서는 별도 하한만 적용 | `word_count` 필드(또는 토큰 카운트)로 측정. case_study가 <400(깊이 부족) 또는 >2,500(편집력 부족)이면 경고. eng/경력기술서는 산문 상한 미적용. |
| R12 PF-FACT-PRESERVE | 입력에 없는 수치/고유명사가 새로 생성되지 않았는가 | **자동 합격 판정 없음 — human/AI 확인 플래그(검토 필요).** | **이 체크는 순수 set-diff로 자동 통과/실패를 내지 않는다**(환산·반올림·단위변환·기술용어로 거짓양성 폭발, NER은 LLM 작업). 좁힌 결정적 검사만 수행: 사용자가 명시 입력한 `impact[].before`/`impact[].after` 필드값이 산출 텍스트에 그대로 등장하는지 literal-match. 그 외 신규 수치·고유명사는 "검토 필요" 목록으로 모아 사람/AI에게 토스. |

**주요 실패 모드:**
- **루브릭 측정 사기(가장 위험):** R12를 set-diff로 "0건 통과" 처리하는 것 — 거짓양성 폭탄. 반드시 확인 플래그로만 둔다.
- **거짓양성 카운트:** R2에서 연도·버전·인원수를 임팩트로 오인 → impact 필드로 매칭 범위를 한정하고 맨정수를 배제.
- **항목 경계 붕괴:** 자유 텍스트를 입력하면 R1·R4·R3가 무의미 → 반드시 구조화 레코드 전제.
- **한국어/직군 누락:** R8 사전이 얕거나 R1을 경력기술서에 강제하면 정상 산출물 오탐 → 사전 확장 + `item_type` 분기.
- **과대표현 무력화:** 팀 성과를 `solo`로 포장 → R3의 method/범위 동반 + solo 가드로 플래그.

## 4. 출처 (Provenance)

> **신뢰도 주석:** 아래 다수(uxfol.io·uxpilot.ai·hakia·icreatives·interviewmaster.ai·thecrit.co)는 **SEO 콘텐츠/도구 마케팅 블로그**로 표본·연도·방법론이 명시된 1차 채용 설문이 아니다. "hiring manager surveys"라는 라벨은 근거를 과대표현하므로 **방향성 참고용**으로만 쓰고, "톱티어 담당자가 가장 선호" 같은 단정은 피한다. STAR(The Muse)·Meta 프레임워크가 상대적으로 단단하다. (원본의 PMC7924487 role-clarity 논문 인용은 주장과 논문 사이 간극이 커 **제거**했다.)

- **uxfol.io — UX Case Study Structure & Template** — case-study 3막 구조, why 중심 서술, 분량 가이드 · https://blog.uxfol.io/ux-case-study-structure/ _(SEO 콘텐츠)_
- **uxpilot.ai — Product Design Portfolios Analyzed** — 깊은 케이스 우선, 결과물보다 why·정량 임팩트 · https://uxpilot.ai/blogs/product-design-portfolio-case-studies _(도구 블로그)_
- **icreatives — 7-Step Portfolio Review Process** — 큐레이션=편집 판단력, 제약 명시=맥락 인지 · https://www.icreatives.com/iblog/the-7-step-portfolio-review-process-every-creative-hiring-manager-needs/ _(SEO 콘텐츠)_
- **Hakia — Developer Portfolio Guide** — polished 소수 항목 우위, 선별의 신호 가치 · https://hakia.com/skills/building-portfolio/ _(SEO 콘텐츠)_
- **Flatiron School — GitHub & README best practices** — eng 규범: README·라이브 데모·실행법·깔끔한 커밋 · https://flatironschool.com/blog/github-profile-and-git-practices-for-job-seekers/
- **The Muse — STAR Interview Method** — Result 정량화('Numbers are always impactful'), 전후 비교 · https://www.themuse.com/advice/star-interview-method _(상대적 단단)_
- **Meta Analytics — DS Framework for Product Strategy** — PM/data 규범: 북극성·가드레일·진단 지표, 비즈니스 임팩트 정량화 · https://medium.com/@AnalyticsAtMeta/data-scientists-framework-for-navigating-product-strategy-as-data-leaders-2eb62b20f505 _(상대적 단단)_
- **interviewmaster.ai — Build a Data Science Portfolio** — data 규범: train/test 분리·복수 평가지표·A/B · https://www.interviewmaster.ai/content/how-to-build-a-data-science-portfolio-the-complete-2025-guide _(도구 블로그)_
- **thecrit.co — Portfolio Project Examples** — 'we'만 쓰면 개인 기여 불명확 → 역할 명확화 필요 · https://www.thecrit.co/resources/portfolio-project-examples _(SEO 콘텐츠)_
- **AGENTS.md (CareerMate 프라임 디렉티브)** — 사실·수치·고유명사 보존, 과장·날조 금지 · 저장소 내부

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_portfolio_guide(role?, item_type?)` — 직군(eng/design/PM/data)·유형(case_study/repo/경력기술서)에 맞춘 3막 템플릿 + 직군별 증거 체크리스트 + 정량화 예시 + 루브릭을 반환하는 read-only 지식 도구.
  - `save_portfolio_item(...)` — 아래 `PortfolioItem`을 **구조화 필드로 강제** 저장(자유 텍스트 금지 → 항목 경계 문제 해소, 루브릭 결정성 확보).
  - `lint_portfolio(target_job_id?)` — R1~R12를 LLM 없이 패턴/카운트/필드-non-empty로 실행. **R12·R4·R10·R11은 pass/fail 대신 `warn` 또는 `needs_review`** 상태를 반환(자동 합격 판정 금지). `get_application_context`와 연동해 R9(직무 적합도)를 산출.
- **데이터 형태 힌트:**
  ```
  PortfolioItem {
    id, title,
    item_type: 'case_study' | 'repo' | '경력기술서',
    role_tag: 'solo' | 'team' | 'lead',
    domain: 'eng' | 'design' | 'pm' | 'data' | 'other',
    problem: string, approach: string, my_role: string,
    impact: [{ metric, before?, after, unit, method? }],   // before/after는 사용자 실측만
    constraints: string[],
    evidence: [{ type:'demo'|'repo'|'readme'|'figma'|'notebook'|'video', url }],
    target_job_ids: string[],
    date: string,            // 신선도(R10)
    word_count: int          // 분량(R11)
  }
  ```
  루브릭 결과는 `RubricResult { checkId, status:'pass'|'fail'|'warn'|'needs_review', measured:number|string, failingItemIds:string[] }[]` 형태로, **R12와 soft 체크는 절대 `pass`를 자동 부여하지 않는다.** 모든 산출은 구조화 필드의 정규식/카운트/필드-존재 검사로 결정적으로 계산된다.
