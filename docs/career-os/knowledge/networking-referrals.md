# 네트워킹 / 추천 / Networking & Referrals — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

연결된 AI를 **네트워킹 전략가**로 만들어, 사용자가 (1) 타깃 회사·직무로 향하는 **관계 경로**를 먼저 그리고, (2) **정보성 대화(informational interview)** 로 신뢰를 쌓고, (3) 그 위에서 **사내 추천(referral)** 으로 연결되도록 돕는 플레이북과, **LLM 없이(또는 최소한으로) 셀 수 있는 자가검증 루브릭**이다. 핵심 전략 방향은 "지원서 최적화보다 관계 라우팅을 먼저"다 — 추천 경로는 ATS 블랙홀을 우회하는 가장 큰 레버다.

**책임 경계(매우 중요):** CareerMate는 지식·연락처/상호작용 기록·루브릭을 **저장·제공**만 한다. 메시지 작성, 의도 판정("이게 조기 job-ask인가"), 톤 평가는 모두 **외부 AI의 몫**이다. 루브릭은 두 계층으로 나뉜다 — **(A) 지금 텍스트만으로 기계 측정 가능**(단어수·패턴매치·정규식)과 **(B) 미구현 데이터 레이어가 필요**(타임스탬프·tie_strength 태그에 의존하는 cadence/latency/coverage). 현재 코드베이스에는 `save_contact`/`log_interaction`/`get_networking_status`·`tie_strength` 필드가 **존재하지 않으므로**, (B) 항목은 Phase B 구현 전까지 **외부 AI의 자기보고에 의존(검증 불가, advisory)** 이다. 이 구분을 정직하게 표기한다.

**증거 신뢰도 경계(매우 중요):** 이 도메인의 수치는 **출처 신뢰도가 균일하지 않다.** NBER·Granovetter 같은 **1차 연구**와 Apollo/Salesforge/Expandi/Prospeo 같은 **마케팅 벤더 블로그**를 같은 가중치로 쓰지 않는다. 특히 LinkedIn 응답률 수치(개인화 9.4% vs 5.4% 등)는 대부분 **B2B 세일즈(SDR) 데이터**라 "동문에게 20분 청하기" 같은 구직 네트워킹에 그대로 외삽되지 않는다 — **세일즈 대용 지표(sales proxy)** 로 라벨링하고 신뢰도를 낮춘다. 또한 **한국 노동시장 단서**를 반드시 적용한다: 공채 비중이 크고, 사내추천 보상제가 없는 기업이 많으며, LinkedIn 침투율이 낮은 도메인(공기업·제조 대기업·국내 SI·신입 공채)이 광범위하다. 미국식 LinkedIn/이메일 warm-intro를 보편 규범으로 단정하지 않는다.

## 2. 플레이북

### 원칙

- **(지원서가 아니라 관계로 라우팅하라)** 타깃 회사/직무가 정해지면, 지원서를 다듬기 *전에* 먼저 연락처 매핑 단계(동문·약한 연결·2촌)를 생성하라. — 추천은 미국 데이터 기준 채용의 상당 부분을 차지하고 추천 지원자의 전환이 높다(단, 분모가 다른 수치를 단일 배수로 곱하지 말 것). 가장 전환이 높은 채널을 안 쓰는 것이 가장 큰 손실이다. _(출처: NBER w25920[1차], Apollo Technical[벤더/2차] — 수치는 §4 단서와 함께)_
- **(목적에 따라 연결 강도를 맞춰라)** 새 리드 탐색은 약한 연결/2촌으로 폭넓게, 실제 추천 *요청*은 타깃 내 가장 강한 연결로. — Granovetter는 약한 연결이 **새 정보**를 더 많이 가져온다 했고, 후속 연구(2016 MBA 연구)는 **단일 강한 연결**의 전환이 높다고 본다(부분적으로 Granovetter에 *도전*). 둘은 노동시장 구간·시니어리티에 따라 갈리는 **미해결 긴장**이며, 화해시킨 척하지 않는다. _(출처: Granovetter(1973) AJS[1차]; Sociological Science v3 2016[1차, 별개 논문])_
- **(직업이 아니라 정보성 대화를 청하라)** 그 사람의 경로/역할을 배우는 데 명시적으로 20-30분을 청하고, 그 첫 대화에서는 추천도 일자리도 요구하지 마라. — 대학 커리어센터들이 일관되게 정보성 인터뷰를 "일자리 제안이 기대가 아닌" 학습 대화로 규정한다. 먼저 일자리를 청하면 반발(reactance)을 부르고 연락처를 태운다. _(출처: USC·UCLA·Iowa Pomerantz Career Center[1차/대학])_
- **(모든 콜드 아웃리치를 검증 가능한 훅으로 개인화하라)** 같은 학교·공통 지인·특정 글/프로젝트 등 **확인 가능한** 구체 훅을 넣고, 가능하면 먼저 좋아요/댓글로 데워라. — 개인화가 응답률을 올린다는 신호가 있으나 그 수치는 **세일즈 대용 지표**다(§4). 검증 불가한 "big fan" 같은 거짓 개인화는 무(無)보다 나쁘다. _(출처: Salesforge/Expandi[벤더, sales proxy])_
- **(warm intro는 double opt-in을 지켜라)** 연결자에게 콜드 소개를 시키지 마라. 1문장 자기소개 + 왜 중요한지 + 구체 요청을 담은 **포워딩 가능한 blurb**(자족적, ≤100단어)와 양쪽을 위한 우아한 거절 여지를 제공하라. — double opt-in(연결자가 먼저 타깃에게 확인)은 연결자의 사회적 자본을 보호한다. *단, ≤100단어 forwardable blurb는 실리콘밸리 스타트업 관습에 가깝고, 한국 직장 문화의 비공식 소개(지인·카톡 단톡)와 형식이 다르다 — 보편 규범으로 단정하지 말고 채널에 맞춰 조정하라.* _(출처: Ben Lachman(Medium)[2차/블로그] — 형식은 advisory)_
- **(짧게, 단일 요청으로)** 약 50-90단어, 정확히 하나의 저마찰 CTA(질문 하나 또는 일정 요청 하나). — 간결성이 응답률을 올린다는 일화가 있으나 출처는 세일즈 벤더다. CareerMate 사용자는 기본적으로 과하게 길게 쓴다. _(출처: Prospeo/Nutshell[벤더, sales proxy])_
- **(상호성 루프를 닫고 감사를 개인화하라)** 대화 후 **24-72시간** 내(시니어/바쁜 상대는 48-72h가 더 나을 수 있음), 구체적으로 논의한 것을 짚고 무언가를 돌려주는 감사를 보내라. — 빠른 후속은 진지함을 신호하지만, **얕은 당일 "감사!"** 는 형식적으로 읽혀 오히려 해롭다. 속도보다 **구체성**이 본질이다. _(출처: Northwestern Career Advancement[대학]; 후속은 벤더 가이드)_
- **(팔로업은 2회로 제한하고 매번 새 가치를 더하라)** 침묵 4-5일 후 1차, 그 뒤 우아한 마무리("break-up") 1차 — 절대 맨 "그냥 확인차"는 금지. *4-5일은 벤더 합의치(세일즈 케이던스)이며 시니어 상대는 2주+ 걸릴 수 있으니 하드 룰이 아니라 기본값으로 본다.* — 두 통이 네트워킹 상한이고, 각 후속은 요청 반복이 아니라 새 가치를 실어야 한다. _(출처: Cruit/CareerVillage/Skylead[벤더, sales proxy])_
- **(좋은 대화 뒤에는 1-2개의 추가 소개를 청하라 — 단, 양보다 질)** 정보 제공자에게 "또 이야기할 만한 사람"을 청하는 것이 규범에 맞는 합법적 "요청"이다. **단, 추천의 신호 가치는 추천인의 신뢰도(함께 일한 적·역량 보증 가능성)에서 나온다.** 20분 통화 한 번에 기댄 약한 추천은 신호가 거의 없거나 면접에서 마이너스가 되며, 일부 ATS는 저신뢰 추천을 표시한다. 따라서 "기하급수적 확장"은 **질을 전제로** 추구한다. _(출처: USC·Iowa Pomerantz[대학]; 추천 품질 단서는 채용 현업 관점)_
- **(콜드 스타트를 1급 경로로 다뤄라)** 타깃에 동문·약한 연결·2촌이 **하나도 없는** 사용자(전직자·신입·외국인)가 가장 흔하고 가장 도움이 필요하다. 네트워크가 없으면 루브릭으로 벌하지 말고, **비(非)연결 대상 콜드 아웃리치 + 커뮤니티 라우팅**(아래 한국 채널)으로 분기하라. — 네트워크 보유를 전제하는 플레이북은 가장 절박한 사용자를 배제한다. _(출처: 채용 현업 관점 + graceful-degradation 원칙)_
- **(한국 채널로 분기하고, 추천 제도 자체가 없는 회사를 식별하라)** LinkedIn이 안 통하는 도메인에서는: 현직자 커피챗, **사내추천 보상제 있는 기업 식별**, 대학 학과 선배/교수 라인, 오픈채팅·디스콰이엇·직장인 커뮤니티·블라인드. 채널 우선순위는 차단 시 폴백 순서를 가진다(이메일 > 상호 소개 > LinkedIn > X > 커뮤니티). 공채/블라인드 채용 기업은 추천 레버가 약하므로 그때는 정보성 대화·역량 증명으로 목표를 바꾼다. — 미국식 단일 채널 전제는 한국 구직자 다수에 부적합. _(출처: 한국 노동시장 단서 + 채널 현실 점검)_
- **(타이밍·퍼널과 연동하라)** 네트워킹 효과는 시점에 의존한다: **공고 게시 전 pre-referral > 게시 후 > 이미 ATS에 지원한 뒤**(지원 후 추천은 효과 급감). CareerMate 8단계 지원 상태(draft~final)와 연동해, `applied` 이전에 추천을 확보하도록 안내한다. — 시점 의존성을 무시한 추천은 레버를 잃는다. _(출처: 채용 현업 관점 + AGENTS.md 상태 게이팅)_
- **(결과를 측정하라 — 메시지 위생만이 아니라)** 보낸 N건 대비 응답 M건, 정보성 대화 성사율, 추천 전환율, 소개 수락률을 연락처별로 추적하라(데이터 레이어 구현 후 순수 카운트로). — 가장 가치 있는 건 단어수가 아니라 퍼널 카운트다. _(출처: CareerMate 저장소 아키텍처 활용)_
- **(제3자 PII 최소수집·보존·파기)** 연락처(이름·회사·역할·tie·대화요약)는 **동의 없이 수집한 제3자 개인정보**다. 무엇을 기록할지 최소화하고, 외부로 내보내거나 공유하지 말며(연락처 dossier 금지), 보존기간·삭제 규칙을 둔다. — AGENTS.md의 "외부 업로드 금지"는 *사용자* 보호이고, *연락처* 보호는 별도로 명시해야 한다. _(출처: AGENTS.md 로컬 전용 원칙의 제3자 확장)_

### Do

- 아웃리치 작성 전 `get_application_context`/`get_profile`을 호출해 사용자의 실제 배경·타깃 역할·공통 학교/직장을 메시지에 인용한다.
- 타깃 회사당 3-5명을 tie 유형(동문·전직장동료·2촌·약한연결)으로 매핑하고 경로를 고른다(새 리드=약한연결, 실제 추천요청=가장 강한 연결).
- 콜드 메시지 첫 문장에 하나의 **검증 가능한** 훅(그들의 글·공통 모교·실명 공통 지인)을 둔다.
- 작고 구체적인 commitment을 청한다: "20-30분 경로 듣기" 또는 "X 직무 적합도에 대한 짧은 반응" — 요청 하나만.
- warm intro는 ≤100단어 forwardable blurb를 fresh thread로 작성하고 "타이밍이 안 맞으면 괜찮다"는 거절 여지를 준다(한국 비공식 소개면 형식 조정).
- 감사는 24-72h 내(시니어는 48-72h 허용) 구체 포인트를 짚고 호혜 제스처(링크·소개·업데이트)를 담는다.
- 연락처별 상호작용 로그(마지막 접촉일·채널·논의·다음 단계·**거절/do-not-contact 플래그**)를 기록한다.
- 팔로업 간격: 1차 4-5일, 마지막 가치-부가 "break-up", 그 뒤 정지. 상대가 답하면 카운터 리셋, "거절"이면 케이던스 영구 정지.
- 정보성 대화 끝에 1-2개의 **질 좋은** 추가 소개와 진척 공유 허락을 청한다.
- 네트워크가 없으면 콜드/커뮤니티 경로로 분기하고, 한국 채널(커피챗·학과 선배·오픈채팅·블라인드)을 제시한다.
- 저장(연락처·노트·아웃리치 초안) 후 대시보드 링크(http://127.0.0.1:4319)를 보여주고 각 단계를 쉬운 한국어로 설명한다.

### Don't

- 첫 정보성 대화에서 일자리/추천 요구 — 규범 위반이자 반발 유발. (한국 소프트 표현 포함: "TO 있나요", "자리 나면", "좋게 봐주시면", "넣어주실 수 있나요")
- 같은 generic 템플릿을 여러 명에게 발송 — 비개인화는 응답률을 깎는다(수치는 sales proxy).
- double opt-in 없이 연결자에게 콜드 소개 요구; 부탁받지 않은 기존 스레드에 타깃을 CC.
- 길고 다중요청 메시지(약 120단어 초과 또는 CTA 2개+).
- 2회 초과 팔로업, 또는 새 가치 없는 맨 "그냥 확인차".
- 공통 지인·"big fan"·근거 없는 훅 날조 — 거짓 개인화는 무보다 나쁘다.
- 전날 메일하고 다음날 만나자 하기 — 충분한 리드타임(며칠+)을 준다.
- 아무것도 짚지 않는 당일 얕은 "감사!" — 형식적 신호.
- **양만 좇아 약한 추천을 남발하기** — 추천인 신뢰도 없는 추천은 면접에서 마이너스.
- **거절한 상대에게 케이던스 지속** — do-not-contact 플래그 없이 계속 찌르기.
- 하루에 대량(예: 50건) 개인화 발송으로 spammer처럼 행동 — 메시지 위생을 통과해도 계정이 플래그된다.
- 연락처/사용자 데이터 외부 전송·공유; 연락처 dossier 내보내기.
- 기술 용어(MCP, job_id) 노출·첫 온보딩 후 자동 브라우저 열기.

### 워크드 예시 (Before → After)

1. **Before:** "Hi, I came across your profile and I'm really impressed by your career. I'm looking for new opportunities and would love to connect. I think I'd be a great fit at your company. Could you refer me or let me know if there are any openings on your team? Thanks!"
   **After:** "Hi Jiyoung — fellow Yonsei grad here. I read your KakaoBank post on scaling onboarding flows; the part about cutting drop-off with progressive disclosure really resonated with my work on a fintech signup funnel. I'm exploring product roles in fintech and would value 20 minutes to hear how you moved from design into PM. No agenda beyond learning from your path — totally understand if you're heads-down right now."
   **왜 더 나은가:** 검증 가능한 훅(공통 학교 + 실제 글)으로 시작하고, 하나의 저마찰 요청(20분 학습)만 하며, 반발을 부르는 job/referral 요청을 명시적으로 제거했다. 일반 요청 대(對) 개인화+사전 engagement 밴드로 이동하면서, 나중의 추천 요청을 위해 관계를 보존한다(응답률 수치는 sales proxy라 단정하지 않음).

2. **Before:** "Hey Minsoo, can you introduce me to Sarah at Toss? I really want to work there. Thanks!"
   **After:** "Hi Minsoo — would you be open to introducing me to Sarah at Toss? Only if you think it's a fit and the timing's good for her. To make it effortless, here's a short blurb you can forward as-is: 'Daniel is a backend engineer (4 yrs, payments at Naver) exploring infra roles at Toss. He admired Sarah's talk on idempotent payment APIs and would love 20 min to learn how her team thinks about reliability. Easy no if now's not right.' Happy to tweak anything — and no worries at all if it's not a good moment."
   **왜 더 나은가:** double opt-in을 지키고(연결자에게 먼저 묻고, 양쪽에 우아한 거절 여지), 연결자가 아무것도 쓰지 않아도 되게 ≤100단어 blurb를 제공하며, 일자리 요구가 아닌 학습 요청으로 프레이밍한다 — 연결자의 사회적 자본을 보호하는 것이 곧 연결자가 돕게 만드는 핵심이다. (한국 카톡 소개라면 같은 내용을 더 짧고 구어체로 조정.)

3. **Before:** "Thanks for the call today, really helpful! Let me know if you hear of any openings."
   **After:** "Hi Eunji — thank you for the 30 minutes today. Your point about choosing teams by the quality of the eng manager over the company logo genuinely changed how I'm filtering roles. I followed your suggestion and read the SRE postmortem you mentioned — sending it here in case it's useful to your new hires too. I'll keep you posted as I narrow things down; and if anyone in your network is worth a similar conversation, I'd be grateful for an intro."
   **왜 더 나은가:** 48-72h 창 안에 보내고, 구체적 takeaway를 짚어(폼 노트가 아닌 진짜 engagement 증명) 호혜로 가치를 돌려주며, 조기 "any openings?" 대신 규범에 맞는 추가 소개 요청을 한다 — 일회성 대화를 지속적·복리적 관계로 전환한다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **계층 가드(매우 중요):**
> - **계층 A — 지금 텍스트만으로 기계 측정 가능:** NR-01(단어수), NR-03(단일 CTA, 단 아래 재정의), NR-04(패턴매치, 단 1차 필터로 격하), NR-05(정규식), NR-06(blurb 단어수/opt-out 패턴), NR-12(볼륨 카운트).
> - **계층 B — 미구현 데이터 레이어 필요(현재 advisory/검증 불가):** NR-08(감사 latency), NR-09(케이던스), NR-10(연락처 커버리지), NR-11(퍼널 결과), NR-13(거절/DNC). 이들은 `log_interaction`/`save_contact`/타임스탬프·`tie_strength` 태그를 전제하며, 코드베이스에 **아직 없다.** 구현 전까지는 외부 AI의 자기보고에 의존하고 `NOT_IMPLEMENTED`/advisory로 표기하며 절대 "결정론적 통과"로 주장하지 않는다.
> - **의도 판정 가드:** NR-03·NR-04의 "진짜 CTA 개수"·"조기 job-ask 의도"는 궁극적으로 **LLM 판단**이다. 패턴매치는 *명백한 위반만 차단하는 1차 필터*이지 최종 판정이 아니다.
> **날짜 산술 주의:** NR-08/09는 **영업일 vs 달력일·주말·상대 타임존**을 정규화해야 한다(금 17시 vs 월 9시는 다르다). 데이터는 ISO8601 저장, 측정은 영업일 보정.

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) | 계층 |
|----|-----------|-----------|--------------------------------|------|
| NR-01 | 아웃리치 길이 간결 | 본문 35-120단어 | 메시지 본문 단어수, 35 ≤ count ≤ 120 | A |
| NR-02 | 개인화 훅 존재 | 첫 2문장 내 구체·검증가능 참조(실명 학교/직장/공통지인, 또는 인용된 글/프로젝트) ≥1 | 오프닝에 수신자 결부된 고유명사/인용 존재 여부. generic 문구("impressed by your career","came across your profile","프로필을 보고")만 있으면 fail. *고유명사 매칭은 가능하나 "검증 가능성"(실재 여부)은 화이트리스트 대조 없으면 advisory* | A(부분)/advisory |
| NR-03 | 단일 CTA | 요청(request) 문장 정확히 1개 | **"?" 개수로 판정 금지**(정중한 요청은 평서문이라 ?=0; 다중요청은 ?=0 가능). 1차 필터로 요청 동사/명령·청유 절을 카운트하되, 최종 단일성 판정은 LLM에 이관 | A(1차)/LLM |
| NR-04 | 첫 대화에 조기 job/referral 요청 없음 | first-contact·informational 메시지에 job-ask 패턴 없음 | **확장 패턴매치(KR+EN, 단어경계+문맥창)** — hard ask: 'refer me','any openings','job opening','hire me','position available','추천해 주','채용','지원 가능'. soft ask(referral-fishing): 'keep me in mind','자리 있을까요','자리 나면','TO 있','좋게 봐주시','넣어주실','혹시 자리가','알려주시면 감사','지원해도 될'. **오탐 방지:** 'apply'/'position'/'apply'의 비요청 용법('applied your advice','your position on X','어떻게 적용')은 문맥창으로 제외. **명백 위반만 차단하는 1차 필터**, 최종 의도판정은 LLM | A(1차)/LLM |
| NR-05 | 정보성 미팅 요청이 짧고 시간 한정 | 15-30분 명시 | 정규식 `(1[5-9]|2[0-9]|30)\s*(min|minutes|분)` (하한 15로 통일 — 본문·원칙 모두 15-30으로 일치) | A |
| NR-06 | warm-intro가 double opt-in + forwardable blurb | (a) 거절-여지 문구 + (b) 자족 blurb ≤100단어 | opt-out 문구('if the timing','no worries','easy no','totally fine','괜찮','부담 없') AND 구분된 blurb 존재 → blurb 단어수 ≤100. 둘 중 하나 없으면 fail | A |
| NR-07 | 감사가 구체적 대화 포인트 참조 | 미팅의 구체 토픽/인용 ≥1(generic "thanks for your time" 아님) | 로그된 논의 토픽과 echo되는 명사구 존재 여부. **로그가 없으면(데이터 레이어 미구현)** generic 감사 토큰만인지 텍스트 검사만 가능 → 토픽 대조는 advisory | A(부분)/advisory |
| NR-08 | 감사 latency 창 | 미팅 후 24-72h(시니어 48-72h 허용; 당일 얕은 감사 경고) | 미팅 타임스탬프와 감사 타임스탬프 차(영업일 보정) ≤72h. **데이터 레이어 미구현 → NOT_IMPLEMENTED/자기보고** | B |
| NR-09 | 팔로업 케이던스 한정·간격 | 스레드당 ≤2 팔로업, 연속 접촉 ≥4일, **거절 시 0** | 로그에서 마지막 응답 이후 팔로업 ≤2 AND 연속 접촉일 차 ≥4(영업일). **응답=카운터 리셋, DNC 플래그=영구 정지.** 데이터 레이어 미구현 → NOT_IMPLEMENTED | B |
| NR-10 | 연락처 맵 tie 다양성 (네트워크 분기) | **네트워크 보유 시:** 타깃당 ≥3 연락처, ≥2 tie 유형. **콜드 스타트(연락처=0):** fail이 아니라 `COLD_START` → 콜드/커뮤니티 경로 안내 | 타깃별 연락처 그룹핑·고유 tie 태그 카운트. 0이면 COLD_START 분기(벌점 금지). 데이터 레이어 미구현 → NOT_IMPLEMENTED | B |
| NR-11 | 결과(outcome) 추적 | 연락처별 보낸/응답/미팅성사/추천획득 카운트 존재 | 로그에서 sent·replied·info_booked·referral_obtained 카운트와 비율 산출(순수 카운트). 데이터 레이어 미구현 → NOT_IMPLEMENTED | B |
| NR-12 | 아웃리치 볼륨 거버넌스(반-스팸) | 사용자당 1일 신규 콜드 ≤ 임계(예: 15) | 상호작용 로그에서 일자별 `type=cold` 카운트 ≤ 임계. (로그 있으면 결정론적; 미구현 시 자기보고) | A/B |
| NR-13 | do-not-contact 존중 | 거절 로그된 연락처는 후속 0 | 연락처 DNC 플래그 set 후 신규 outreach 카운트 = 0. 데이터 레이어 미구현 → NOT_IMPLEMENTED | B |

**주요 실패 모드:**
- **"결정론적" 거짓 주장** — NR-08/09/10/11/13은 데이터 레이어가 없어 *지금은 셀 수 없다.* → 계층 B로 격리하고 `NOT_IMPLEMENTED`/advisory로 정직하게 표기(임의 pass 금지).
- **NR-04 우회·오탐** — 영문 'apply/position'은 비요청 용법을 오탐하고, 한국어 소프트 표현('TO 있나요','자리 나면','좋게 봐주시면')은 못 잡는다. → KR+EN 다단어 구절 + 단어경계/문맥창 + hard/soft 분리, 그리고 **1차 필터일 뿐 최종 의도판정은 LLM**임을 명시.
- **NR-03 "? 개수" 깨짐** — 정중한 요청은 ?=0(평서문), 다중요청도 ?=0 가능 → ? 카운트는 문장부호를 잴 뿐 요청 수가 아니다. 워크드 예시 after도 ? 없이 요청한다(자기 모범답안이 자기 루브릭 통과 못 하던 버그). → ? 카운트 폐기, 요청 절 카운트 1차 필터 + LLM 판정.
- **콜드 스타트 처벌** — NR-10이 네트워크 0인 전직자·신입·외국인을 일괄 fail시켜 가장 도움이 필요한 이를 벌함. → `COLD_START` 분기로 콜드/커뮤니티 경로 제공.
- **세일즈 수치 오인** — LinkedIn 응답률(9.4/5.4, 8→14%, 141→56단어)은 SDR 데이터라 구직 네트워킹에 직접 외삽 불가. → sales proxy 라벨·신뢰도 강등(§4).
- **날짜 산술 단순화** — 달력일/영업일·주말·타임존 무시. → ISO8601 저장 + 영업일 보정.
- **추천 품질 무시** — 약한 추천을 양으로 셈. → 추천인 신뢰도(함께 일한 적·역량 보증)를 질로 가중, NR-11은 획득 카운트만 보고 품질은 LLM 판단.
- **제3자 PII 무단 축적** — 비동의 연락처 dossier. → 최소 수집·보존·파기·비공유(NR 외 정책 가드).

## 4. 출처 (Provenance)

> **신뢰등급 라벨:** [1차]=동료심사/working paper/대학 1차 · [2차]=대학 재배포/기자 · [벤더/sales proxy]=마케팅 블로그·세일즈(SDR) 데이터(구직 외삽 주의, 방법론·표본·연도 미공개 많음).
> **수치 메타데이터 원칙:** 모든 % 옆에 표본·연도·지역·분모를 명시하고, 분모가 다른 수치를 단일 배수로 곱하지 않는다(예: 추천 ~34%[firm funnel 내] vs 잡보드 ~2-5%[전체 지원→채용]는 분모가 달라 7-15배 같은 단일 배수는 과장).

- **[1차] Granovetter, "The Strength of Weak Ties" (1973)** — 약한 연결이 **새 직업 정보**를 더 surface한다는 기초 메커니즘; tie-strength 라우팅의 근거. *원논문은 American Journal of Sociology(1973)이며 sociologicalscience.com이 아님(원 플레이북의 출처 매핑 오류 정정).* · (AJS 78:6, 1973)
- **[1차/별개] "Strength of Weak Ties in MBA Job Search," Sociological Science v3 (2016)** — 단일 강한 연결의 전환을 다룬 **별개의 2016 복제·확장 연구**로, Granovetter를 부분적으로 **도전**한다(보강 아님). · https://sociologicalscience.com/download/vol-3/may/SocSci_v3_296to316.pdf
- **[1차] NBER Working Paper w25920 — "What Do Employee Referral Programs Do?"** — 추천 효과·매치 품질의 1차 근거; 단 수치는 firm funnel 내 분모임에 유의. · https://www.nber.org/system/files/working_papers/w25920/w25920.pdf
- **[벤더/2차] Apollo Technical — Employee Referral Statistics** — "추천 ~30-50% 채용", "~34% vs ~2-5%" 헤드라인 수치. *콘텐츠 마케팅 집계(2차 출처 재인용)이며 NBER과 동급 신뢰도로 쓰지 않음. 미국·특정 프로그램·시점 의존, 한국(공채·블라인드 중심)엔 외삽 불가.* · https://www.apollotechnical.com/employee-referral-statistics/
- **[1차/대학] USC Career Center — "Conduct Informational Interviews"** — "일자리 제안이 기대가 아님" 규범, 감사·추가소개 요청, 초기 접촉 프레이밍. · https://careers.usc.edu/resources/conduct-informational-interviews/
- **[1차/대학] UCLA · University of Iowa Pomerantz · ASU informational-interview guides** — 20-30분 요청 길이, 리드타임 예절, 추가 연락처 요청, 노트 작성. · https://career.ucla.edu/resources/informational-interviewing-guide/
- **[벤더/sales proxy] Salesforge(2025) · Expandi "State of LinkedIn Outreach H1 2026"** — 개인화 vs 비개인화 응답률(~9.4% vs ~5.4%), prior-engagement 리프트(~8%→~14%). *B2B 세일즈/SDR 데이터, 방법론 미공개, 소수점(9.36%)은 정밀도 과장. 구직 네트워킹 base rate와 다른 모집단 — sales proxy로만.* · https://expandi.io/blog/state-of-li-outreach-h1-2026/
- **[2차/블로그] Ben Lachman — "An intro to double opt-in intros and forwardable emails" (Medium)** — double opt-in 규범과 forwardable-blurb 형식. *실리콘밸리 스타트업/VC 관습이며 한국 비공식 소개 관행과 형식이 다름 — "보편 기대 규범"으로 과일반화하지 않음.* · https://medium.com/@blach/an-intro-to-double-opt-ins-and-forwardable-emails-cad0d0d6b1ca
- **[2차/대학+벤더] Northwestern Career Advancement(감사) · Cruit/CareerVillage/Skylead(후속)** — 감사 창과 구체성 요구; 2-통 후속 상한. *후속 케이던스(4-5일)는 세일즈 벤더 합의치이지 구직 네트워킹 측정값이 아님 — 기본값으로만.* · https://www.northwestern.edu/careers/jobs-internships/thank-you-notes.html
- **[벤더/sales proxy] Prospeo / Nutshell — warm-introduction & LinkedIn cold-outreach 템플릿** — 간결성 효과(141→56단어로 응답 배증), 단일 CTA·≤100단어 blurb 규범. *세일즈 템플릿 출처, 일화 수준.* · https://prospeo.io/s/warm-introduction-email-template
- **[1차/내부] AGENTS.md** — 로컬 전용·외부 업로드 금지 원칙. 본 도메인은 이를 **제3자 연락처 PII**로 확장(최소수집·보존·파기·비공유).
- **[현업 관점/미측정] 채용 현업(리크루터·hiring manager) 단서** — 추천 품질(추천인 신뢰도)>양, 약한 추천의 마이너스 신호, 타이밍 의존(applied 이후 효과 급감), ATS 저신뢰 추천 표시, 한국 채널/공채 현실. *동료심사 출처가 아닌 현업 휴리스틱으로 advisory.*

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_networking_playbook(stage?: 'cold_outreach'|'informational_interview'|'warm_intro'|'referral_ask'|'follow_up'|'cold_start'|'all')` — 해당 단계의 원칙·do/dont·플레이스홀더 템플릿·루브릭 부분집합·한국 채널 분기·금지/소프트-ask 패턴 사전을 반환.
  - `save_contact(name, company, role, tie_strength, source, target_job_id, consent_note?, retention_until?)` — 연락처 저장. **PII 최소화·보존기간** 필드 포함.
  - `log_interaction(contact_id, channel, type, sent_at, summary, next_step_due, replied?, outcome?, do_not_contact?)` — 상호작용 로그. `replied`로 케이던스 리셋, `do_not_contact`로 영구 정지, `outcome`으로 퍼널 결과.
  - `get_networking_status(target_job_id)` — 타깃별: 연락처 수·tie 유형 커버리지(COLD_START 여부)·overdue 팔로업·감사 미발송·**퍼널 카운트(sent/replied/info_booked/referral_obtained)**·1일 콜드 볼륨·DNC 위반 — 모두 순수 날짜 산술/카운트(영업일 보정), LLM 불필요.
  - 데이터 소스 결합: 사용자 배경/타깃 = `get_application_context`/`get_profile`; 상태 게이팅 = 8단계 지원 상태(`applied` 이전 추천 권장).

- **데이터 형태 힌트:**
```
playbook: {
  stage,
  principles: [{ rule, rationale, source, trust: 'primary'|'secondary'|'vendor_sales_proxy'|'practitioner' }],
  templates: [{ name, body_with_placeholders, max_words }],
  channelFallback: ['email','mutual_intro','linkedin','x','community'],   // 차단 시 순서
  koChannels: ['coffee_chat','dept_senior','professor','openchat','disquiet','blind'],
  jobAskPatterns: { hardKo:[], hardEn:[], softKo:[], softEn:[], benignExclusions:[] },  // NR-04
  rubricChecks: [{ id, check, passBar, tier: 'A'|'B', severity:'hard'|'soft',
                   measure:{ type:'count'|'ratio'|'wordcount'|'regex'|'pattern'|'date', threshold, regex?, lang? },
                   requiresDataLayer?: bool }]   // true면 미구현 시 NOT_IMPLEMENTED
}
contact: { contact_id, name, company, role,
           tie_strength: 'strong'|'weak'|'2nd_degree'|'alumni'|'former_colleague',
           source, target_job_id, consent_note?, retention_until? }   // PII 최소·보존
interaction: { contact_id, channel:'linkedin'|'email'|'call'|'in_person'|'community',
               type:'cold'|'info_interview'|'thank_you'|'follow_up',
               sent_at: ISO8601, summary, next_step_due: ISO8601,
               replied?: bool, replied_at?: ISO8601,
               outcome?: 'info_booked'|'referral_obtained'|'declined'|'no_response',
               do_not_contact?: bool }
status: per target_job_id -> {
  contact_count, distinct_tie_types, cold_start: bool,
  thank_yous_owed:[contact_id], overdue_followups:[{contact_id, business_days_since_last}],
  funnel: { sent, replied, info_booked, referral_obtained, reply_rate, conversion_rate },
  daily_cold_volume:{ date: count }, dnc_violations:[contact_id]
}
// 모든 cadence/latency/funnel = ISO8601 + 영업일 보정 산술 → LLM 불필요(계층 B는 이 레이어 구현 후 결정론적)
```
