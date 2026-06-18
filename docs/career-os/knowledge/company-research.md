# 회사 리서치 / Company Research — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

CareerMate 사용자를 대신해 지원 대상 회사·산업·보상을 리서치하고, 그 리서치를 **맞춤 면접 답변·고가치 질문·적합도 판정(go/no-go)** 으로 변환한다. 사고(synthesis)는 연결된 AI(Claude/GPT/Gemini)가 하고, CareerMate는 공고·프로필·적합도 분석·면접 자료를 MCP로 저장·제공한다. 핵심 규율은 다섯 가지다 — (1) 7개 캐논 앵커(미션/전략, 제품, 최근뉴스, 문화·인재상, 직무·레벨, **경쟁사·시장 포지션**, 보상)를 덮는다, (2) 출처 우선순위(1차/공식 > 2차/언론 > 3차/리뷰)를 지키고 교차검증·날짜를 붙인다, (3) 모든 사실을 STAR 훅·질문·적합도 플래그 중 하나로 **변환**한다(원시 사실은 미완성), (4) 모든 주장을 **이름·날짜가 붙은 출처**에 귀속시킨다, (5) **출처를 실제로 가져올 수 없으면 지어내지 말고 미검증으로 선언**한다.

**중요(정직한 한계):** 아래 루브릭은 LLM 없이 셀 수 있는 **완성도·형식 게이트**다. 출처가 **진짜인지·주장을 실제로 뒷받침하는지·정말 변환됐는지** 같은 품질·진위는 패턴/카운트로 검증할 수 없다 — 그 최종 품질 판단은 연결된 AI 본인의 책임이다. 루브릭은 "얇거나 출처 없는 리서치"를 사전에 걸러낼 뿐, 진실성을 보증하지 않는다.

## 2. 플레이북

### 원칙

- **7개 캐논 앵커를 덮어라: 미션/전략, 제품/비즈니스모델, 최근뉴스(≤6개월), 문화·인재상, 직무·레벨, 경쟁사·시장 포지션, 보상(협상 단계에 한함).** — 대학 커리어센터는 회사+산업+직무의 다축 커버리지로 수렴하며, 단일 축("About 페이지만 읽음")은 면접관이 즉시 할인한다. 경쟁사 축은 "왜 X가 아니라 우리냐"라는 최강 적합도 신호를 만든다. _(출처: UF Career Connections Center "Four Steps"; Ohio State ECS; Letscareer DART 경쟁사 비교)_
- **출처를 등급화하라: 회사 1차 자료(공식 사이트·블로그·채용공고·공시 DART 사업보고서)=Tier-1, 평판 있는 2차/언론=Tier-2, 자기선택 리뷰 플랫폼=Tier-3 신호.** — 리뷰 사이트 별점은 작고 비무작위인 자기선택 표본으로, 극단(매우 만족/매우 불만) 응답자에 치우친다. Tier-3 단독 근거로 결론을 내리지 마라. _(출처: BGSU ScholarWorks "Construct Validity of Glassdoor Ratings"; PubMed "Incentives can reduce bias")_
- **단, 잡플래닛의 면접 후기(질문 유형·전형 절차)는 별점과 구분해 취급하라.** — 한국 맥락에서 잡플래닛 **면접 후기**는 회사별 실제 질문·분위기를 담은, 별점보다 훨씬 actionable한 거의-1차에 가까운 제보다. 별점은 Tier-3로 두되, 면접 후기는 "회사별 제보(교차검증 권장)"로 가중치를 높여라. _(출처: 잡플래닛 면접후기)_
- **모든 비자명 주장은 ≥2개 독립 출처로 교차검증하라. 출처가 하나면 '미검증'으로 라벨링하라('단일 Glassdoor 리뷰에 따르면…').** — 어떤 단일 크라우드소스 데이터 1건은 사실이 아니라 가설이다. _(출처: UF "Four Steps" 링크드인 동문 교차확인; Ohio State ECS)_
- **최근성 타임스탬프: 모든 '최근 뉴스' 항목에 날짜를 붙이고 ~6개월 이내를 선호하라. 6개월 초과는 '최근'으로 부르지 말고, 12~18개월 초과는 스테일로 표시하라.** — 구체적·최근 동향 언급은 면접에서 가장 강한 신뢰 신호이며, 낡은 '최근'은 정반대로 준비 부족을 드러낸다. _(출처: UF "Four Steps"; Ohio State ECS)_
- **출처를 실제로 가져올 수 없으면(웹/도구 접근 없음, 학습 컷오프 이후) 날짜를 지어내지 말고 해당 앵커를 '미검증/라이브 출처 없음'으로 선언하라.** — 이것이 최대 날조 리스크다. YYYY-MM 정규식은 날짜가 **실재하는지** 검증하지 못한다 — 가짜 날짜로 게이트를 통과시키지 마라. _(출처: 본 플레이북 안티-날조 원칙; AGENTS.md 추측 금지)_
- **각 리서치 사실을 세 산출물 중 하나로 변환하라: (a) 사용자 강점↔회사 니즈를 잇는 STAR/답변 훅, (b) 면접관 질문, (c) 적합도 플래그(pro/con).** — 리서치의 목적은 답변 맞춤·적합도 판정·고가치 질문이다. 변환되지 않은 사실은 길이만 늘리는 미완성 출력이다. _(출처: Hays "How to research an employer"; Randstad RiseSmart STAR)_
- **면접관 질문 3~5개를 '공개 웹사이트만으로는 답할 수 없는' 특정 사실 기반 개방형(how/what)으로 만들고, 각 질문이 어느 앵커 사실에서 파생됐는지 기록하라(based_on_anchor).** — 홈페이지 너머를 읽었음을 증명하는 질문이 진정성·시니어리티를 신호한다. _(출처: Ohio State ECS; Indeed "27 Smart Questions"; UndercoverRecruiter)_
- **가능하면 면접관·팀 레이어까지 리서치하라: 패널의 역할/재직기간/최근 글, 직무가 속한 팀의 미션·제품영역·최근 팀 블로그.** — '웹사이트로 답 안 되는' 질문은 회사 전체가 아니라 **그 팀**에서 나온다. (라이브 출처 없으면 미검증으로 표시.) _(출처: UF "Four Steps" 링크드인 현직자; Ohio State ECS)_
- **적합도는 판정으로 끝내라: pro/con 플래그를 모두 만들고, 명시적 go/no-go 한 줄과 함께 ≥1개의 con(또는 disqualifier 검토)을 반드시 포함하라.** — con 없는 all-pro는 사용자가 듣고 싶은 말만 하는 확증편향이다. _(출처: 본 플레이북 적합도 판정 원칙)_
- **공고에 앵커링하라: 공고 상위 키워드/요건을 추출하고, '공고 키워드 → 사용자 강점 → 회사 니즈'를 잇는 매핑 레코드(triple)를 만들어라.** — 키워드를 단순 반복(echo)하는 게 아니라 강점·니즈와 묶는 것이 변환이다. _(출처: Letscareer DART 분석; Hays 강점-공고 정렬)_
- **보상은 협상 단계에 한해 다루고, 시장에 맞게 분해하라.** 글로벌 빅테크는 levels.fyi로 레벨 매핑 후 base/bonus/equity 분해. **한국·비테크·SME·공공은 equity가 거의 없고 포괄임금·상여(13th·성과급)·직급(사원/대리/과장)이 1급 구조다 — equity를 강요하지 마라.** DART 직원 평균 급여는 **전사 평균**이지 직급/직무 밴드가 아니다 — 밴드 앵커로 쓰지 마라. _(출처: levels.fyi 협상 가이드; MIT CAPD; DART 사업보고서 주의)_

### Do

- 연결 직후 `get_application_context`로 대상 공고·프로필·강조 포인트를 먼저 확보하고 그 위에 외부 리서치를 얹어라.
- 7개 앵커를 체크리스트로 돌며 각 항목에 최소 1개의 출처(이름+날짜)를 붙여라. 못 채운 앵커는 침묵하지 말고 '미확인/해당없음(사유)'으로 명시하라.
- 리뷰 사이트 항목은 '제보 기반 신호'로 라벨링하고, 같은 결론을 받치는 2차 출처를 1개 더 찾아 교차검증하라. (잡플래닛 면접후기는 별점보다 가중치를 높이되 여전히 교차확인.)
- 최근 6개월 내 뉴스(출시·투자·조직개편·리더십)를 ≥1개 찾아 면접 오프닝/질문에 구체적으로 인용하라. **라이브로 못 찾으면 '미검증'으로 표시**하라.
- 경쟁사 ≥2곳과 그 대비 '우리의 차별점' 1줄을 확보해 "왜 X가 아니라 여기냐"에 답할 수 있게 하라.
- 모든 사실을 STAR 훅·질문·적합도 플래그 중 하나로 변환하고, 변환 안 된 원시 사실은 `gaps`로 보류하라.
- 면접관 질문 3~5개를 특정 사실 기반 개방형으로 만들고 각 질문에 `based_on_anchor`를 기록하라.
- 적합도 판정에 명시적 go/no-go 한 줄과 ≥1개의 con을 포함하라.
- 공고 키워드를 '키워드→강점→니즈' triple로 매핑해 저장하라(단순 반복 금지).
- 보상은 **협상 단계에서만** 다루고, 한국이면 직급·상여·포괄임금 구조로, 글로벌 테크면 base/bonus/equity+levels.fyi로 분해하라.
- 공개 자료가 희박한 회사(SME·스텔스 스타트업)는 솔직히 '공개 발자국 희소'로 보고하고, 빈 앵커를 면접 질문으로 전환하는 계획을 제시하라.
- 최종 산출은 `save_fit_analysis`·`save_interview_prep`로 저장하고 대시보드 링크(`http://127.0.0.1:4319`)를 안내하라.

### Don't

- 리뷰 단일 별점·험담을 검증 없이 사실로 단정하지 마라(작고 비무작위인 자기선택 표본).
- '좋은 문화', '성장하는 회사' 같은 출처 없는 일반론으로 리서치를 채우지 마라.
- 회사 About 페이지만 읽고 리서치를 끝냈다고 하지 마라(단일 축·단일 출처 결론 금지).
- 라이브 출처를 못 가져오는데 날짜·뉴스를 **지어내지** 마라 — 미검증으로 선언하라.
- 12~18개월 지난 뉴스를 '최근'이라 부르지 마라. 6개월 초과면 '최근' 라벨을 떼라.
- 공개 웹사이트만으로 답 나오는 질문('주력 제품이 뭔가요?', '앞으로 어떻게 성장하나요?')을 면접 질문으로 내지 마라.
- 보상을 단일 숫자로 인용하지 마라. **DART 전사 평균을 직급 밴드처럼 쓰지 마라.** equity 없는 한국 직무에 equity를 억지로 끼워 fail-flag 하지 마라.
- 면접 전 단계에서 보상 협상을 무리하게 끌어올리지 마라(보상은 오퍼/협상 단계 게이팅).
- 공고·강점과 연결하지 않은 채 회사 사실만 나열하지 마라(에코 ≠ 변환).
- all-pro 플래그만 내고 '판정'이라 부르지 마라(확증편향).
- 사용자 데이터를 외부로 보내거나, 미검증 추정을 사실로 단정해 지어내지 마라(불확실하면 사용자에게 확인).

### 워크드 예시 (Before → After)

1. **Before:** "이 회사는 좋은 기업 문화로 유명하고 성장하고 있어서 지원했습니다. 제품도 훌륭하고 비전이 멋집니다."
   **After:** "공식 블로그(2026-03)에 따르면 귀사는 동남아 결제 인프라로 확장 중이고, 업계 보도 2곳에서 교차확인된 시리즈C(2026-02)를 마쳤습니다. 경쟁사 A·B 대비 차별점은 다국가 정산 정합성 자동화로 보입니다. 저는 핀테크 정산 시스템을 다국가로 확장한 경험(처리량 3배↑)이 있어, 공고의 '글로벌 결제 트래픽 처리' 요건(키워드)→제 강점→귀사의 확장 니즈로 직접 연결됩니다. — 면접 질문(based_on: 최근뉴스): '동남아 확장에서 reconciliation을 어느 단계까지 자동화하셨고, 다음 분기 병목은 어디라고 보시나요?'"
   **왜 더 나은가:** 출처+날짜, 교차검증된 최근뉴스, 경쟁사 차별점, 그리고 키워드→강점→니즈 triple과 앵커 기반 개방형 질문으로 변환됐다. Before는 출처 없는 일반론이라 어느 회사에나 붙는다.

2. **Before:** "Glassdoor 별점이 2.9이고 '워라밸이 나쁘다'는 리뷰가 있어 이 회사는 워라밸이 안 좋습니다."
   **After:** "Glassdoor·잡플래닛(제보 기반 신호, 자기선택 표본이라 편향 가능) 일부 리뷰에 '성수기 야근' 언급이 있습니다 — 단정하지 않습니다. 교차확인: 채용공고에 '온콜 로테이션' 문구, 링크드인 현직자 1명이 '분기 마감 주간만 집중'이라 확인 → 결론은 '상시 야근'이 아니라 '특정 주기 피크'. 적합도 con 플래그로 기록하고, 면접에서 '온콜/마감 주기의 빈도와 보상 방식'을 직접 물어 확인할 것."
   **왜 더 나은가:** Tier-3를 신호로만 라벨링하고 2차 출처로 교차검증해 과장된 결론을 보정했으며, 미확인 항목을 con 플래그+면접 질문으로 전환했다. Before는 단일 출처를 사실로 단정한 안티패턴이다.

3. **Before:** "이 직무 연봉은 약 6천만 원 정도로 알고 있습니다."
   **After:** "(협상 단계에서) **한국 법인**이라면: 잡플래닛 연봉 제보(N건, 직급=대리 기준)와 DART 사업보고서의 **전사** 평균 급여를 *참고치로만* 교차확인하고, 포괄임금 여부·상여/성과급 구조·직급(사원/대리/과장)을 분해해 묻습니다 — DART 평균은 직급 밴드가 아니므로 밴드로 쓰지 않습니다. **글로벌 테크**라면: levels.fyi에서 해당 회사 레벨(공고의 'Senior'에 *근사* 매핑, 회사별로 다를 수 있음)의 base/bonus/equity 중앙값(데이터 N건, 갱신 2026-Q2)으로 분해합니다. 어느 쪽이든 단일 숫자가 아니라 밴드+구조로 협상 앵커를 잡습니다."
   **왜 더 나은가:** 시장별로 구조를 분리(한국=직급·상여·포괄임금, 글로벌=base/bonus/equity)하고, DART 평균을 밴드로 오용하지 않으며, 레벨 매핑이 근사임을 명시했다. 보상을 협상 단계로 게이팅했다. Before는 출처·구조·레벨이 없는 단일 숫자라 협상에 쓸 수 없다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **설계 원칙:** 루브릭은 **연결된 AI가 EMIT하는 구조화 필드**(아래 §5 data shape의 `anchors[]`, `questions[]`, `fit_flags[]`, `mappings[]` 등) 위에서 **존재여부·non-null·개수**를 센다 — 산문에 정규식을 돌리지 않는다. 이는 측정을 게임하기 어렵게 만들고 LLM 없이 결정적으로 통과/실패를 낸다. 단, 이 게이트들은 **완성도·형식**만 본다 — 진위·출처 유효성·진짜 변환 여부는 검증하지 못한다(연결된 AI 책임).

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 7개 캐논 앵커 커버리지 | `anchors[].key`가 7종 중 ≥6종 존재 AND 각 앵커의 `facts[]`가 비어있지 않거나 `status`가 `unverified`/`n/a(사유)`로 명시 | `anchors` 배열에서 distinct `key` 수와, 빈 `facts[]`의 `status` non-null 여부를 카운트 |
| R2 | 사실당 출처 귀속 | `anchors[].facts[]`의 각 fact가 `source_name` non-null AND `source_tier∈{1,2,3}` 보유 비율 ≥90% | fact 객체에서 `source_name!=null && source_tier!=null` 개수 ÷ 전체 fact 수 (구조 필드 카운트) |
| R3 | 최근뉴스 날짜 + 스테일 FAIL | `recent_news` 앵커에 `dated`(YYYY-MM) 있는 fact ≥1 AND **'최근'으로 라벨된 fact의 `dated`가 6개월 이내**; 6개월 초과를 '최근'으로 표기하면 FAIL | `dated` 필드 파싱 후 기준일과의 개월차 계산; `label=='recent' && months_diff>6`이면 실패 카운트>0 |
| R4 | 라이브 출처 없음 정직 선언 | 라이브 검색 불가 시 해당 fact는 `retrieved=false` AND `status='unverified'`; `retrieved=false`인데 `dated`만 채워진 fact 0건 | `retrieved==false && dated!=null && status!='unverified'` 위반 건수=0 |
| R5 | Tier-3 단독 결론 없음 | `source_tier==3`만으로 도출된 결론 fact는 `cross_verified==true`(독립 2차 출처 `source_name` 동반) 또는 `signal_only==true` 라벨 | tier3 fact 중 `cross_verified==false && signal_only==false` 건수=0 (구조 플래그 카운트) |
| R6 | 질문 사양 + 앵커 출처 | `questions[]` 개수 3~5 AND 각 question이 `based_on_anchor` non-null AND `open_ended==true` (AI가 EMIT한 플래그) | `questions` 길이 ∈[3,5]; `based_on_anchor!=null && open_ended==true` 비율=100% |
| R7 | 공고 매핑 triple | `mappings[]`에 `{keyword, user_strength, company_need}` 3필드 모두 non-null인 완전 triple ≥3개 | triple 객체에서 세 필드 동시 non-null 개수 카운트 ≥3 (에코가 아니라 매핑) |
| R8 | 적합도 판정(con 강제) | `fit_flags[]`에 `type=='con'` ≥1 AND `verdict` 필드(go/no-go) non-null | `fit_flags` 중 `type=='con'` 개수≥1 그리고 `verdict!=null` |
| R9 | 보상 시장별 분해(조건부) | `comp`가 존재하고 `phase=='negotiation'`일 때만 평가: `market=='kr'`이면 `{직급, 상여/성과급, 포괄임금여부}` 중 ≥2 + DART는 `band==false`; `market=='global'`이면 `{base, bonus, equity?}` 중 ≥2 + `level_map_approximate==true` | `comp.phase`로 게이팅; 시장별 요구 필드 non-null 개수 카운트, equity는 kr에서 optional |

**주요 실패 모드:**
- **형식 통과 = 품질 통과로 착각.** R1~R9는 모두 표면 형식(필드 존재·개수)만 본다. 가짜 출처명·boilerplate `cross_verified=true`·진짜 매핑이 아닌 triple은 잡지 못한다 — 진위·변환 품질은 연결된 AI가 책임진다.
- **날짜 날조.** 라이브 출처 없이 그럴듯한 YYYY-MM을 채워 R3을 통과시키는 것. R4가 `retrieved` 플래그로 1차 방어하지만, AI가 정직하게 EMIT해야만 작동한다.
- **에코 ≠ 변환.** 공고 명사를 답변에 복붙해 키워드만 늘리는 것(구 bag-of-words 함정). R7은 완전 triple만 세서 단순 반복을 거른다.
- **확증편향(all-pro).** con 없는 판정. R8이 `type=='con'` ≥1을 강제한다.
- **US-테크 편향.** equity·levels.fyi·L\d 레벨을 한국·비테크 직무에 강요해 정상 리서치를 fail-flag. R9가 시장별로 분기하고 equity를 kr에서 optional로 둔다.
- **얇은 데이터 회사를 날조로 메움.** SME·스텔스의 빈 앵커를 지어내 채우는 것. R1이 `status='unverified'`/`n/a(사유)`를 허용해 정직한 공백을 합격으로 인정한다.

## 4. 출처 (Provenance)

- **UF Career Connections Center — Four Steps for Researching an Employer** — 캐논 앵커(미션/문화/제품/뉴스), 다출처 교차검증, 링크드인 현직자 확인, 최근 게시물 언급 전략 · https://career.ufl.edu/four-steps-for-researching-an-employer/
- **Ohio State Engineering Career Services — How to Research a Company for an Interview** — 여러 소스 결합(Handshake/Glassdoor/LinkedIn/Google), 리서치 기반 3~5개 질문 준비 · https://www.ecs.osu.edu/news/2025/02/how-research-company-interview
- **BGSU ScholarWorks — Examining the Construct Validity of Glassdoor.com Ratings** — 리뷰 사이트 자기선택·비무작위 표본 편향을 Tier-3 신호로만 다루는 근거(정성적 방향성; 단일 보편 상수로 인용 금지) · https://scholarworks.bgsu.edu/cgi/viewcontent.cgi?article=1099&context=pad
- **PubMed — Incentives can reduce bias in online employer reviews** — 자원/자기선택 리뷰가 더 극단적이라는 실증 → 단일 리뷰 단정 금지 · https://pubmed.ncbi.nlm.nih.gov/33764122/
- **levels.fyi — Ultimate Negotiation Guide & leveling methodology** — (글로벌 테크 한정) 레벨 *근사* 매핑, total comp의 base+bonus+equity 분해, 협상 앵커링. 한국·비테크·SME 커버리지는 희소함에 유의 · https://www.levels.fyi/blog/ultimate-negotiation-guide.html
- **MIT CAPD — How to negotiate your tech salary ft. levels.fyi** — 보상 데이터를 레벨에 매핑해 협상 앵커로 쓰는 교육 자료 · https://capd.mit.edu/resources/how-to-negotiate-your-tech-salary-ft-levels-fyi-video/
- **Hays — How to research an employer before an interview** — 리서치를 STAR 답변·맞춤 질문으로 변환, 강점을 공고/회사 목표에 정렬 · https://www.hays.co.uk/career-advice/article/interview-prep-employer-research
- **Indeed — 27 Smart Questions to Ask in an Interview** — 리서치 기반 개방형 질문 설계 기준 · https://www.indeed.com/career-advice/interviewing/smart-questions-to-ask-in-an-interview
- **Letscareer — DART 사업보고서 분석 방법** — 한국 맥락: '사업의 내용'·'경영진 의견' 분석을 지원 동기/면접 차별화로 연결, **경쟁사 비교**. 단 직원 평균 급여는 전사 평균이지 직급 밴드가 아님에 유의 · https://www.letscareer.co.kr/blog/65/
- **잡플래닛 (JobPlanet)** — 한국 맥락 소스. 별점=Tier-3 신호이나 **면접 후기(질문 유형·전형)는 거의-1차에 가까운 actionable 제보**로 가중치 상향(교차검증 전제) · https://www.jobplanet.co.kr/

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_company_research_brief(job_id)` — 대상 공고에 묶인 7개 캐논 앵커 슬롯(미션/전략, 제품, 최근뉴스, 문화·인재상, 직무·레벨, **경쟁사·시장**, 보상) 작업판을 반환. 각 앵커에 '사실+출처명+날짜+신뢰등급(Tier1/2/3)+retrieved/cross_verified 플래그' 배열, 공고 상위 키워드, 사용자 강점 목록, 빈/미검증/스테일 앵커를 표시하는 `gaps`.
  - `save_company_research(job_id, anchors[], mappings[], questions[], fit_flags[], comp?)` — 결과를 구조화 필드로 저장.
  - `validate_company_research(payload)` — §3 R1~R9를 **LLM 없이 구조 필드 카운트/존재여부**로 돌려 `{check_id, passed, measured_value}` 배열 반환. 정규식-온-프로즈가 아니라 EMIT된 struct 위에서만 측정.
- **데이터 형태 힌트:**
  ```
  {
    job_id,
    posting_keywords: string[],
    user_strengths: string[],
    anchors: { key: 'mission'|'product'|'recent_news'|'culture'|'level'|'competitor'|'comp',
               status: 'filled'|'unverified'|'n/a',
               facts: [{ text, source_name, source_tier: 1|2|3, dated: 'YYYY-MM'|null,
                         retrieved: boolean, cross_verified: boolean, signal_only: boolean,
                         label?: 'recent' }] }[],
    mappings: [{ keyword, user_strength, company_need }],            // 완전 triple만 카운트
    comp?: { phase: 'research'|'negotiation', market: 'kr'|'global',
             // kr: { 직급?, 상여?, 성과급?, 포괄임금여부?, dart_band: false }
             // global: { base?, bonus?, equity?, level_map_approximate: true } },
    generated: {
      questions: [{ text, based_on_anchor, open_ended: boolean }],   // 3~5개
      fit_flags: [{ type: 'pro'|'con', text, source_name }],         // con ≥1
      verdict: 'go'|'no-go'|'conditional'                            // non-null 강제
    },
    gaps: string[],
    validation: [{ check_id, passed: boolean, measured_value }]
  }
  ```
