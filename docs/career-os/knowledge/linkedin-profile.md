# LinkedIn 프로필 / LinkedIn Profile — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

LinkedIn 프로필을 **(1) 리크루터 검색에 노출되고(키워드·완성도), (2) 5~10초 스캔에서 클릭을 유발하며(헤드라인·About 첫 문장), (3) 신뢰를 증명하는(추천서·정량 성과·Featured)** 세 축으로 최적화하기 위한 플레이북과, **LLM 없이 셀 수 있는 자가검증 루브릭**이다. CareerMate에는 LLM이 없으므로, 연결된 외부 AI(Claude/GPT/Gemini)가 이 규칙으로 프로필 초안을 작성·진단하고, `validate_linkedin_profile`이 루브릭을 기계적으로(개수·존재·비율·정규식) 실행한다.

**책임 경계(매우 중요):** 키워드 기반 검사는 모두 **타깃 키워드 사전**을 전제한다. 이 사전(동의어·한영 매핑·약어 확장 포함)을 만드는 일은 **의미 판단이라 외부 AI의 몫**이다 — AI가 `get_application_context`(타깃 공고 JD)로 사전을 채워 넘기면, validate는 그 사전을 받아 **기계적 부분문자열 매칭**만 한다. 사전이 비었거나 부실하면 키워드 체크는 `INSUFFICIENT_INPUT`을 반환하고 통과/실패를 판정하지 않는다. 즉 "LLM 없이 측정"은 *사전이 주어진 뒤*의 매칭에 한정된다.

## 2. 플레이북

### 원칙

- **헤드라인 하드 상한은 220자다. '핵심 키워드·가치제안을 앞 120자 안에 front-load'는 *권장*이지 상한이 아니다.** — LinkedIn은 2020년부터 헤드라인 220자를 허용한다. 모바일·검색 미리보기는 앞부분을 잘라 보여주므로 가장 중요한 직무 키워드와 1개 가치제안을 앞쪽에 둔다. 120을 한도처럼 강제하면 220자까지의 키워드 공간 절반을 버린다. _(출처: LinkedIn 헤드라인 사양(220자) — 권장 임계와 하드 상한을 분리)_
- **헤드라인은 '직무 타이틀 + 핵심 스택/전문성 + 정량 결과 또는 도메인'을 담고, 가장 중요한 키워드를 맨 앞에 둔다. 단, 검색용 키워드와 *사람이 읽는 가치제안*을 모두 만족시키되 구분자(`|`·`·`) 남발로 가독성을 죽이지 않는다.** — 헤드라인은 검색·연결요청·댓글 등 모든 노출 지점에 따라붙고 키워드 가중치가 가장 크다. 그러나 키워드 떡칠은 검색엔 잡혀도 클릭을 잃는다. 구분자 3~4개 이내로 묶고 사람이 읽는 1개 핵심 메시지를 보장한다. _(출처: LinkedIn 공식 키워드 가이드 · 리크루터 검색의 키워드 관련성 신호[업계 SEO 분석, 추정])_
- **About 첫 2~3문장에 타깃 직무 키워드 + 정량 성과 1개 이상을 넣고, 1인칭 내러티브로 쓴다.** — About은 '더 보기' 펼침 전 앞부분만 기본 노출되며 검색 키워드 스캔 대상이다. *About은 서사형(narrative)이 잘 먹히는 매체*이므로 이력서식 불릿 규칙(XYZ 70%)을 그대로 이식하지 않는다 — 톤 우선, 키워드·수치는 자연스럽게. _(출처: LinkedIn 공식 키워드 가이드 · LinkedIn 프로필 최적화 가이드[블로그, 2차])_
- **Experience 불릿은 Google XYZ('무엇을 X / 얼마만큼 Y / 어떻게 Z')로 쓴다 — 단, 정량이 본질적으로 어려운 직군(디자인·PM 초기·연구·법무·공공·신입)은 *규모/범위*(사용자 수·팀 규모·처리량)로 대체하고, 그래도 불가하면 결과 동사 + 범위 서술로 충족한다.** — XYZ는 '담당했다'식 책임 나열 대신 측정 가능한 임팩트를 강제한다. 그러나 단일 '수치 70%' 바는 절반의 직군에 비현실적이므로 fallback을 둔다. _(출처: Bill Murphy Jr.(Inc.com)가 정리한 Google 리크루터 XYZ 공식 — Laszlo Bock 'Work Rules!'에 영감을 둔 2차 해석본; UT Austin Law 배포 PDF는 그 Inc 기사 재배포)_
- **프로필 강도를 위해 핵심 섹션을 폭넓게 채운다: 사진·위치·산업·학력·현재 직책·스킬·About(요약), 그리고 Featured(포트폴리오·글·링크).** — LinkedIn Help는 이 섹션 완성이 발견성·검색 노출을 높인다고 본다. 다만 LinkedIn은 2022년경부터 'All-Star/profile strength meter'를 공개 UI에서 상당히 약화·제거했으므로 "공식 7개 배지"로 단정하지 않는다 — *대략 이 섹션들을 채우면 강함* 수준으로 본다. Featured는 클릭·신뢰에 크다. _(출처: LinkedIn 공식 Help: Your Profile level meter(a594698) — 현행 UI 변동 가능성 라벨링)_
- **스킬은 타깃 직무 핵심 하드스킬로 채우고(최소 5개), 핵심 스킬을 상단 고정(pin)하며, 가능하면 각 스킬을 Experience/Education 항목에 *연결(skill associations)* 한다. 무관 스킬로 상한(50)까지 채우지 않는다 — 관련성 신호가 희석된다.** — 2026년 LinkedIn은 단순 나열보다 스킬-경력 연결을 검색·신뢰에 반영한다. 헤드라인·About·Experience의 키워드와 스킬을 일치시켜 관련성 신호를 중복 강화한다. _(출처: LinkedIn 공식 키워드 가이드 · 스킬 연결 기능[2026 현행])_
- **사회적 증거는 추천서(Recommendations) 중심이다. 다른 관계(상사/동료/고객)에서 1~2개 이상 받는다. 엔도스먼트는 *보조 신호*로 격하한다 — 가중치가 크게 줄었고 품앗이가 가능해 리크루터 다수가 거의 무시한다.** — 추천서는 자기서술을 제3자가 검증하는 신뢰 레이어이고 별도 섹션으로 노출된다. skill assessment 배지도 엔도스먼트보다 강하다. _(출처: 리크루터 대상 LinkedIn 최적화 가이드[블로그, 2025–2026, 2차] — 엔도스먼트 가중치 재조정 반영)_
- **네트워크와 활동성도 노출을 좌우한다(통제 가능한 부분만): 연결 200+/500+ 확보, 타깃 업계 종사자와 연결, 주기적 활동(주 1회 글/댓글).** — LinkedIn Recruiter 검색에서 네트워크 거리(1/2/3촌)·활동성은 키워드 매칭만큼, 종종 그 이상으로 노출을 좌우한다. 키워드만 완벽해도 네트워크가 빈약하면 검색 하단이다. *네트워크 '거리' 자체는 후보가 통제 불가(검증 제외)*, 연결 수·활동 존재는 통제 가능(검증 포함). _(출처: 리크루터 검색 신호 분석[업계 SEO, 추정] — '추정된 알고리즘'이며 LinkedIn 공식 확정 사실 아님)_
- **신선도(freshness)를 유지한다: 직책·About·스킬을 주기적으로 갱신하고, 채용 시즌엔 'Open to Work'를 켠다.** — 검색 알고리즘은 최근 갱신 정도를 신호에 포함한다(추정). 정체된 프로필은 강도가 높아도 내부 랭킹을 잃는다. _(출처: 리크루터 검색 신호 분석[추정] · LinkedIn SEO 분석[블로그])_
- **한국 사용자는 핵심 필드를 국문/영문 병기하거나 다국어 프로필을 쓰되, 글로벌·외국계 타깃이면 영문을 1차로 둔다. 회사명·고유명사·수치는 원문 그대로 보존한다.** — 외국계·헤드헌팅·스타트업은 영문 LinkedIn 검색을 쓴다. 병기는 양쪽 검색에 잡히게 하고, 고유명사·수치 보존은 할루시네이션을 막는다. *병기 시 글자수·키워드가 두 배로 잡히므로 density 상한 적용은 단일 언어 기준으로 분리한다.* _(출처: AGENTS.md 사실·수치·고유명사 보존 원칙 · LinkedIn 다국어 프로필 기능)_

### Do

- 헤드라인: 타깃 직무 + 핵심 스택/전문성 + 정량 결과/도메인을 앞 120자에 front-load(하드 상한 220자), 구분자 3~4개 이내.
- About 첫 2~3문장에 타깃 직무 키워드 + 정량 성과 1개 이상, 1인칭 서사로.
- About 전체에 직무 관련 키워드를 자연스럽게 분산(과밀·반복 금지).
- Experience 불릿을 XYZ로; 정량이 어려우면 규모/범위로 대체.
- 핵심 섹션(사진·위치·산업·학력·직책·스킬·About) + Featured 채우기.
- 스킬 ≥5개, 핵심 스킬 상단 고정 + Experience/Education에 연결, 키워드 일치.
- 추천서 1~2개를 *다른 관계*에서 확보(엔도스먼트는 보조).
- 연결 200+ 확보 + 주기적 활동(주 1회), 채용 시즌 Open to Work 활성화.
- 직책·About·스킬 주기적 갱신(신선도).
- 국문/영문 병기 또는 다국어 프로필; 회사명·날짜·수치·고유명사 원문 보존.

### Don't

- 'Experienced Professional', '열정적인 OO', '문제 해결사', 'results-driven' 같은 추상어만으로 헤드라인 채우기.
- 헤드라인을 '직책 @ 회사명'만으로 채워 키워드/결과 누락.
- 키워드 떡칠(같은 키워드 반복 나열, 구분자 범벅)로 검색·가독성 모두 손해.
- Experience를 '담당/책임/수행/진행/관리/지원/대응/처리/운영'(영문: Responsible for/Worked on/Helped/Assisted/Involved in)식 책임 나열로만 쓰고 수치/규모 누락.
- About을 3인칭 보도자료체·버즈워드(synergy, results-driven)·인사말/잡담으로 낭비.
- 무관 스킬을 상한까지 채워 관련성 희석; 스킬을 5개 미만 방치.
- 엔도스먼트를 추천서와 동급으로 과대평가.
- 검증되지 않은 수치·직함·성과 지어내기(사실 왜곡).
- 프로필을 한 번 만들고 수개월 방치(신선도 하락).
- Featured·다국어 병기를 빼서 클릭·국제 노출 기회를 버리기.

### 워크드 예시 (Before → After)

1. **Before:** 헤드라인 — `개발자 @ ABC테크 | 열정적인 문제 해결사`
   **After:** 헤드라인 — `Backend Engineer · Java/Spring·MSA | 주문 트래픽 5배 처리 결제 시스템 구축 @ ABC테크`
   **왜 더 나은가:** 타깃 직무(Backend Engineer)와 검색되는 하드스킬(Java/Spring·MSA)을 맨 앞에 front-load해 키워드 검색에 잡히고, '주문 트래픽 5배 처리'라는 정량 결과로 클릭을 유발한다. '열정적인 문제 해결사' 같은 검색 불가 추상어를 제거했고, 구분자는 3개로 가독성을 지켰다.

2. **Before:** Experience 불릿 — `백엔드 API 개발 및 운영 담당, 성능 개선 작업 수행`
   **After:** Experience 불릿 — `p99 응답시간을 1,200ms→180ms로 85% 단축(X·Y) — N+1 쿼리 제거와 Redis 캐시 레이어 도입으로(Z), 동시접속 3만 트래픽 안정화`
   **왜 더 나은가:** XYZ(무엇을/얼마만큼/어떻게)로 '담당·수행'식 책임 나열을 측정 가능한 임팩트로 바꿨다. 구체 수치(85%, 3만)와 방법(N+1, Redis)이 신뢰와 검색 키워드(Redis)를 동시에 준다.

3. **Before:** About 첫 문장 — `안녕하세요, 저는 다양한 경험을 가진 마케터입니다. 항상 새로운 것을 배우는 것을 좋아합니다.`
   **After:** About 첫 문장 — `B2B SaaS 퍼포먼스 마케터 · 6년. 유료 전환율을 2.1%→4.8%로 끌어올린 풀퍼널 그로스 실험가입니다. 핵심: 퍼포먼스 광고(Google/Meta Ads), SEO, 마케팅 자동화(HubSpot).`
   **왜 더 나은가:** 노출 앞영역에 타깃 키워드(B2B SaaS, 퍼포먼스 마케터, SEO, HubSpot)와 정량 성과(전환율 2.1%→4.8%)를 모두 넣고, 인사말·잡담을 제거해 핵심을 상단으로 끌어올렸다. About은 서사형이라 불릿이 아닌 1인칭 문장으로 유지했다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **공통 가드:** 키워드 의존 체크(R2, R4, R5, R6, R10, R15)는 외부 AI가 `get_application_context`로 채운 `target_keywords[]`를 입력으로 받는다. 사전이 비었거나 N개(예: 5) 미만이면 해당 체크는 pass/fail 대신 **`INSUFFICIENT_INPUT`** 을 반환한다. 길이·존재·정규식 체크(R1, R7, R8, R11, R12, R13, R14)는 사전 없이 진짜로 기계 측정 가능하다.
> **정량 정규식(quantRegex):** `\d+([.,]\d+)?\s*(%|배|원|명|ms|x|k|만|억|점|개|위|명|시간|일|주|개월|년)`

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 헤드라인 하드 상한 + front-load 권장 | 길이 ≤ 220자(hard fail) **및** 앞 120자 내 타깃 키워드 ≥1(soft warn) | 헤드라인 길이 ≤220 → fail/pass; `헤드라인[0:120]`에 사전 키워드 매칭 = 0이면 warn(fail 아님) |
| R2 | 헤드라인 키워드 front-load | 사전 키워드가 앞 120자 내 ≥1 | `헤드라인[0:120]` ∩ target_keywords 매칭 ≥1 (사전 없으면 INSUFFICIENT_INPUT) |
| R3 | 헤드라인이 추상어만이 아님 | 금지어 제거 후 잔여 토큰 ≥3 | 금지어 사전(Experienced Professional/열정적인/문제 해결사/results-driven/synergy…) 제거 후 토큰 수 ≥3 |
| R3b | 헤드라인 구분자 남발 방지 | 구분자(`|`·`·`/`,`) 합 ≤4(soft) | 구분자 문자 카운트 ≤4 |
| R4 | About 앞부분 키워드 | 첫 2~3문장(언어별 분기) 내 사전 키워드 ≥1 | 문장 경계로 분할 후 앞 2~3문장 ∩ target_keywords ≥1. *char 절대 임계 대신 문장 단위*(한/영 글자수 차 보정) |
| R5 | About 키워드 커버리지 | 고유 사전 키워드 ≥ N(권장 하한, soft) | About ∩ target_keywords의 *고유* 매칭 수 ≥ 하한. 상한(8~12)은 **soft warn**으로만(근거가 블로그라 hard fail 금지; 병기 시 단일 언어 기준으로 카운트) |
| R6 | JD 커버리지(핵심 신규 항목) | (공고 JD 키워드 ∩ 프로필 키워드) / JD 키워드 ≥ 0.4 | get_application_context의 JD 키워드 집합과 프로필 전체 텍스트 매칭 비율 ≥0.4 (사전 없으면 INSUFFICIENT_INPUT) |
| R7 | 키워드 스터핑 방지 | 동일 키워드 반복 ≤3회 | 각 사전 키워드 등장 횟수 카운트, 최대 반복 ≤3 |
| R8 | About 앞부분 정량 성과 | 앞 2~3문장에 quantRegex ≥1 | 앞 2~3문장에 정량 정규식 매칭 ≥1 |
| R9 | Experience 정량/범위 비율 | 수치 또는 규모 표현 포함 불릿 ≥ 60%(직군 fallback 허용) | 각 불릿에 quantRegex **또는** 규모 토큰(사용자/팀/처리량/명/개) 매칭 여부 → 매칭 불릿/전체 ≥0.6. *About 제외, Experience만 적용* |
| R10 | Experience 책임-나열 회피(언어 분기) | 금지 서술어 불릿 ≤ 20% | **한국어**: 문말 서술어 패턴(담당/책임/수행/진행/관리/지원/대응/처리/운영 + 했/함/음) 스캔. **영문**: 불릿 첫 동사(Responsible for/Worked on/Helped/Assisted/Involved in) 스캔 → 비율 ≤0.2 |
| R11 | 핵심 섹션 충족 | 사진·위치·산업·학력·직책·스킬·About 7/7 non-empty + Featured ≥1(soft) | 각 필드 non-empty 카운트 = 7; Featured 0이면 warn |
| R12 | 스킬 최소 개수 | 5 ≤ 스킬 수 ≤ 50 | 스킬 배열 length ≥5 이고 ≤50(상한 초과 시 관련성 희석 warn) |
| R13 | 추천서 존재 + 관계 다양성 | Recommendations ≥1, 서로 다른 관계 ≥2(soft) | 추천서 카운트 ≥1; relationship 필드 고유값 ≥2이면 가산(없으면 warn, 엔도스먼트는 미집계) |
| R14 | 신선도 | last_updated ≤ 180일 **또는** open_to_work=true | 날짜 차 ≤180 또는 플래그 존재(둘 중 하나 충족) |
| R15 | 스킬-키워드 정렬 | 스킬 ≥3개가 헤드라인+About에도 등장 | 각 스킬을 (헤드라인+About) 텍스트와 부분문자열 매칭 → 일치 ≥3 |
| R16 | 길이 하드 상한 안전 체크 | 헤드라인 ≤220 **및** About ≤2,600자 | 두 필드 글자수 측정 → 초과 시 fail(키워드 손실/잘림 방지) |
| R17 | 국제화(병기) | 영문 1차 타깃이면 영문 필드 ASCII 비율 ≥ 0.6; 병기 타깃이면 한/영 둘 다 non-empty | 헤드라인/About의 ASCII 문자 비율 계산; 병기 모드면 두 언어 필드 존재 여부 |
| R18 | 사실 보존(보수적) | 산출물의 **숫자 토큰**이 입력 수치 집합 ∪ 파생수치(증감률) 화이트리스트에 포함; 고유명사는 화이트리스트 대조만 | 숫자만 정규화(3만↔30,000↔30k, 1,200ms 등) 후 차집합 검사. 85% 같은 파생 증감률은 입력 두 수에서 계산 가능하면 허용. **고유명사는 입력 화이트리스트(회사/제품 배열) 대조로 한정** — NER 불가하므로 미일치는 'AI 작성 시 보존'에 위임하고 validate는 *미검증(advisory)* 표시 |

**주요 실패 모드:**
- **사전 없는 키워드 체크의 거짓 통과/실패** — `target_keywords[]`가 비면 R2/R4/R5/R6/R10/R15가 무의미. → `INSUFFICIENT_INPUT` 가드로 차단(절대 임의 pass 금지).
- **fact-preservation 오탐** — 단위 표기 변형(3만/30,000/30k), 한영 회사명 차(ABC테크/ABC Tech), 파생 증감률(85%)을 '입력에 없는 토큰=할루시네이션'으로 오탐. → R18처럼 숫자만 정규화 검사 + 파생수치 화이트리스트 + 고유명사는 명시 화이트리스트로 한정(나머지는 advisory).
- **한국어 어순 무시** — '...를 담당' 식 문말 동사를 '첫 토큰' 검사로 놓침. → R10 언어 분기(한국어=문말 서술어, 영문=첫 동사).
- **정량 강제의 직군 차별** — 단일 70% 바가 디자인·PM·연구·신입을 일괄 탈락. → R9를 60% + 규모/범위 fallback으로 완화하고 Experience에만 적용(About 제외).
- **120자 한도 오인** — 220자 키워드 공간 절반 손실. → R1에서 상한(220, hard)과 front-load(120, soft)를 분리.
- **density 상한의 사전 종속** — 사전 크기가 곧 상한을 결정해 측정이 무의미. → R5 상한은 soft warn, 하한도 근거 약하므로 권장값으로만.
- **엔도스먼트 과신** — 약한 신호를 추천서와 동급 집계. → R13은 추천서만 집계, 엔도스먼트 미반영.

## 4. 출처 (Provenance)

> **신뢰등급 라벨:** [공식]=LinkedIn/1차 · [2차]=기자/대학 재배포 · [추정/블로그]=마케팅·SEO 분석(확정 사실 아님).

- **[공식] LinkedIn Help — Your Profile level meter** — 프로필 강도에 반영되는 핵심 섹션(사진·위치·산업·학력·직책·스킬·요약)과 발견성·검색 노출 효과. *단, 현행 UI는 'All-Star 배지'를 약화/제거했을 수 있어 '배지' 프레이밍은 advisory.* · https://www.linkedin.com/help/linkedin/answer/a594698
- **[공식] LinkedIn — How to Use Keywords on LinkedIn** — 키워드 배치 핵심 섹션(헤드라인·About·직무 타이틀·스킬)과 검색 관련성. · https://www.linkedin.com/top-content/recruitment-hr/maximizing-your-linkedin-presence/how-to-use-keywords-on-linkedin/
- **[2차] Bill Murphy Jr.(Inc.com) — Google XYZ 공식** — 'Accomplished X as measured by Y by doing Z' 정량 성과 공식. *Laszlo Bock 'Work Rules!'에 영감을 둔 기자의 재해석이며 Bock의 원문 문구가 아님.* · https://www.linkedin.com/pulse/google-recruiters-say-using-x-y-z-formula-your-resume-bill-murphy-jr-
- **[2차] UT Austin School of Law 배포 PDF** — 위 Inc 기사의 대학 커리어 재배포본(1차 아님). · https://law.utexas.edu/wp-content/uploads/sites/44/2020/09/Google-Recruiters-Say-Using-the-X-Y-Z-Formula-on-Your-Resume-Will-Improve-Your-Odds-of-Getting-Hired-at-Google-_-Inc.com_.pdf
- **[추정/블로그] LinkedIn 프로필 최적화 가이드 2026 (JobSprout/CareerBldr)** — 헤드라인 공식, About 앞부분·키워드 분산, 모바일 truncation front-load. *키워드 8~12 같은 구체 수치의 1차 근거 아님 → soft만.* · https://careerbldr.com/blog/linkedin-profile-optimization-guide/
- **[추정/블로그] 리크루터 대상 LinkedIn 최적화 (GDH/Bridgeview/mimusa)** — 추천 중심 사회적 증거, 완성도, 엔도스먼트 약화. · https://gdhinc.com/optimize-your-linkedin/
- **[추정/블로그] LinkedIn 검색 신호 분석 (W3era/powerin)** — 키워드 관련성·완성도·네트워크 근접성·신선도. *공식 문서가 아니라 추정된 알고리즘이므로 '4대 신호'를 확정 사실로 제시하지 않음.* · https://www.powerin.io/blog/how-linkedin-search-works-and-how-to-hack-it
- **[공식 내부] AGENTS.md** — 사실·수치·고유명사 보존 원칙(할루시네이션 방지).

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_linkedin_playbook(section?: 'headline'|'about'|'experience'|'skills'|'completeness'|'network'|'social_proof'|'i18n'|'all')` — 해당 섹션의 원칙·do/dont·워크드 예시·금지어 사전·타깃 키워드 슬롯을 반환.
  - `validate_linkedin_profile(profile_draft, target_keywords[], jd_keywords[]?, fact_whitelist?: {numbers[], proper_nouns[]}, lang: 'ko'|'en'|'bilingual')` — 위 루브릭을 LLM 없이 실행해 항목별 pass/fail/warn/INSUFFICIENT_INPUT + 측정값(개수·비율) + score를 반환. `target_keywords`가 임계 미만이면 키워드 체크를 INSUFFICIENT_INPUT으로 격리. 고유명사 검증은 `fact_whitelist.proper_nouns`가 있을 때만, 없으면 advisory.
  - 데이터 소스 결합: 타깃 키워드/JD = `get_application_context`, 보존할 사실·수치 화이트리스트 = `get_profile`/`get_resumes`.

- **데이터 형태 힌트:**
```
{
  principles: [{ id, rule, rationale, source, trust: 'official'|'secondary'|'estimated' }],
  doList: string[], dontList: string[],
  bannedTerms: {
    headline: string[],
    about: string[],
    experienceLeadVerbsEn: string[],          // Responsible for, Worked on, Helped...
    experienceTailPredicatesKo: string[]       // 담당/책임/수행/진행/관리/지원/대응/처리/운영 (+했/함/음)
  },
  allStarSections: ['photo','location','industry','education','position','skills','summary'],
  optionalSections: ['featured'],
  quantRegex: '\\d+([.,]\\d+)?\\s*(%|배|원|명|ms|x|k|만|억|점|개|위|시간|일|주|개월|년)',
  limits: { headlineHard: 220, headlineFrontload: 120, aboutHard: 2600, skillsMin: 5, skillsMax: 50 },
  rubricChecks: [{
    id, check, passBar,
    measure: { type: 'count'|'ratio'|'exists'|'regex'|'length'|'date', target, threshold,
               regex?, lang?: 'ko'|'en'|'bilingual',
               severity: 'hard'|'soft', requiresDictionary?: bool }
  }],
  workedExamples: [{ section, before, after, why }]
}

// validate 반환:
{
  checks: [{ id, status: 'pass'|'fail'|'warn'|'insufficient_input'|'advisory',
             measured: number|bool, threshold }],
  score: 0..1   // hard fail만 score에 강하게 반영, soft/advisory는 가중 약하게
}
```
