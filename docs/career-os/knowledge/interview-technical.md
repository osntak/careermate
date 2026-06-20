# 면접 — 기술/시스템 디자인 / Technical & System Design Interview — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

기술/시스템 디자인 면접에서 평가자는 "정답 도달"이 아니라 **구조화된 사고 + 소통 + 트레이드오프 추론**을 본다. 이 플레이북은 연결된 AI가 (a) 후보의 직무·레벨·면접 포맷에 맞는 준비 자료를 만들고 (b) 그 자료를 자가검증하도록 트랙별 프레임·체크리스트·루브릭을 제공한다.

핵심 제약 — **CareerMate에는 LLM이 없으므로 이 문서의 루브릭은 "내용의 정확성"이 아니라 "준비 자료에 기대 구조가 존재하는가"라는 형식만 LLM 없이 측정한다.** 따라서 루브릭 통과는 **합격 신호가 아니라 최소 형식 충족(format floor)** 이며, 추론의 옳고 그름·복잡도의 정확성·소통의 실제 품질은 **연결된 AI가 별도로 판정**해야 한다. 이 한계를 사용자에게 숨기지 마라.

## 2. 플레이북

> **트랙 분리가 먼저다.** 기술/실무 면접은 단일 포맷이 아니다. 갈래가 여럿이고 평가 축이 서로 다르다.
>
> **개발 직군 트랙**: ① 온라인 코딩테스트(자동채점, 소통 0점) ② 라이브 코딩(소통 중심) ③ 백엔드 시스템 디자인 ④ FE/ML/데이터/모바일 시스템 디자인(축이 다름) ⑤ 디버깅/기존 코드 확장형.
>
> **비개발 직군 트랙(직군별 실무/기술 면접도 따로 존재)**: ⑥ 마케팅(캠페인·지표 케이스) ⑦ 영업(롤플레이/모의세일즈) ⑧ 기획·PM(케이스·과제전형) ⑨ 디자인(포트폴리오 리뷰) ⑩ 데이터 분석(SQL 실기 + 지표/통계 케이스). 각 트랙은 "코딩 정답 도달"이 아니라 직군 고유 평가축이 다르다 — 마케팅=목적별 지표 선택의 논리, 영업=니즈 파악·거절 대응의 실시간 수행, 기획=문제정의·우선순위 추론, 디자인=의사결정 근거, 데이터=지표 정의의 정합성. _(출처: HAIJOB — 마케팅 면접; Recatch — 세일즈 면접; brunch @jenjenny — 프로덕트 디자이너 실무면접[참고/일화])_
>
> 아래 원칙은 트랙·세션 길이·레벨에 따라 **강도를 조절**해 적용한다(획일 적용 금지).

### 원칙

- **(온라인 코딩테스트는 UMPIRE를 버린다)** — 백준/프로그래머스류 1차 자동채점은 정답률·시간초과·메모리만 본다. 소통·명확화·트레이드오프가 0점이므로, 여기서는 **문제 정확 이해 → 제약(N, 시간/메모리 한계)에서 목표 복잡도 역산 → 엣지(빈입력·오버플로·경계) 처리 → 제출 전 반례 자가생성**만 한다. _(출처: 한국 채용 현실 / 실무 관찰)_
- **(라이브 코딩은 세션 길이로 프레임 강도를 정한다)** — 30~45분 세션에서는 **라이트 UMPIRE**(명확화 1~2개 + 접근법 1문장 합의 + 구현 + 끝나고 dry-run 1회). 60~120분(한국 라이브 코딩·페어프로그래밍)에서는 **풀 UMPIRE**(명확화 다수 + 평균/엣지 케이스 손추적 + 의사코드). 형식에 시간을 과배분해 구현 미완으로 탈락하는 것이 명확화 누락보다 더 흔한 실패다. _(출처: Tech Interview Handbook; CodePath UMPIRE — 단, 세션별 조절은 본 플레이북의 보정)_
- **(코딩 전 명확화·접근법 합의)** — 잘못된 가정으로 바로 코딩하면 틀린 문제를 푼다. 명확화(입력 범위·형식, 중복/음수/빈입력 허용, 반환 형식)와 접근법 합의는 빅테크 라이브 코딩에서 일관된 hire 신호다. _(출처: Tech Interview Handbook — Coding Interview Rubrics)_
- **(코드 작성 후 Review + Evaluate를 입으로)** — 버그가 있다고 가정하고 변수 워치리스트로 한 줄씩 추적(해피패스 → 엣지), 그다음 시간·공간 복잡도를 Big-O로 명시하고 대안 트레이드오프를 한 문장 언급한다. Testing은 4대 평가 축 중 하나다. _(출처: CodePath UMPIRE — Review/Evaluate; Tech Interview Handbook — Testing 축)_
- **(시스템 디자인은 다이어그램이 아니라 요구사항부터)** — FR 3개 이상 + NFR(확장성/가용성/지연/일관성) + 규모 추정을 먼저 글머리표로 적고 합의한다. "명확화 없이 아키텍처부터"는 1순위 탈락 원인이다. _(출처: Exponent System Design Guide; GeeksforGeeks — Common Mistakes)_
- **(45분은 기본값이며 포맷별로 재배분한다)** — Google/Meta형 45분은 *기본 타임박스*일 뿐이다. Amazon은 60분+행동결합, 한국 라이브는 60~120분, 스타트업 페어는 2~3시간이다. **세션 길이를 먼저 확인**하고, 어떤 길이든 "상위 설계에 시간을 다 쓰고 심층을 못 들어가는 것"을 피한다(심층이 변별 구간). _(출처: Exponent — time allocation; 회사별 포맷은 본 플레이북 보정)_
- **(모든 기술 선택에 구조적 트레이드오프)** — "X를 쓰면 A를 얻고 B를 잃는다 + 대안 1개" 형식. "무조건 좋다"식 단정은 감점. 면접관이 "10x/100x로 늘리면?"이라 밀 때 **병목이 어디로 이동하는지**(DB → 캐시 → 큐 → 샤딩) 설명한다. 최근 면접은 비용(가능하면 달러)·장애복구·운영성숙도까지 본다. _(출처: Exponent; DesignGurus — Anti-Patterns; interviewing.io 계열 기준)_
- **(면접은 모놀로그가 아니라 대화)** — 막히면 침묵하지 말고 현재 가설·막힌 지점을 소리 내어 말하고 힌트를 활용한다. 침묵이 가장 큰 감점이다. _(출처: Tech Interview Handbook — Communication 축)_
- **(과설계 금지: 단순하게 시작해 점진 확장)** — 요구사항이 정당화하지 않는 MSA/Kafka/k8s를 넣지 않는다. 정당화 사슬이 끊기면 mid-level 신호. _(출처: DesignGurus — 7 Anti-Patterns)_
- **(레벨로 기대치가 다르다)** — 같은 문제라도 주니어(L3/L4)는 "동작하는 설계"·"명확화 1~2개", 시니어(L5)는 "트레이드오프·실패모드·비용", 스태프(L6+)는 "요구사항 자체를 협상/축소·조직/운영 경계 설계"가 변별점이다. 준비 자료는 후보 레벨에 맞춰 기대치를 적는다. _(출처: DesignGurus — Google SD Rubric 차원; 레벨 차등은 본 플레이북 보정)_
- **(추론을 입 밖으로 내지 않으면 0점)** — 면접관은 *관찰된 신호*만 채점한다(Interviewers score observed signals, not unspoken reasoning). 머릿속으로만 한 트레이드오프 검토·요구사항 분석은 평가에 잡히지 않으므로, 모든 트랙에서 사고 과정을 명시적으로 말·다이어그램·주석으로 드러낸다. _(출처: GreatFrontend — Evaluation Axes)_
- **(비개발 직군은 거의 항상 경험 서사를 STAR로 묻는다)** — 코드 대신 본인이 주도한 프로젝트의 목적→행동→수치 성과를 요구하므로, 산출물은 저장된 후보 경력/성과 데이터에 **앵커**하고 수치·고유명사를 지어내지 않는다. 직군별 예상 질문은 '답변 구조' 보강 신호일 뿐, 후보의 캠페인 수치·매출·실적·프로젝트 성과는 발명 금지(없으면 '면접 전 확인'으로 분리). _(출처: HAIJOB — 마케팅 면접; Recatch — 세일즈 면접)_

### 트랙별 평가축 (직무 차등)

> 트랙은 같은 골격(요구사항→아키텍처→데이터→인터페이스→심층)을 쓰더라도 **무엇을 1순위로 보는지**가 다르다. 아래는 개발 SD 하위 트랙과 비개발 직군 트랙의 차등이다. 어느 트랙도 "정답 도달"이 아니라 트랙 고유 신호를 입 밖으로 드러내는 것이 변별점이다.

#### 프런트엔드 시스템 디자인 — RADIO 프레임 + 6 평가축

RADIO 단계: **R**(Requirements Exploration: 기능/비기능 요구·지원 브라우저·디바이스·a11y·i18n 범위) → **A**(Architecture/High-level: 컴포넌트 분해·책임 경계·상태관리·데이터 흐름) → **D**(Data Model: 클라이언트 상태·정규화·서버상태 vs UI상태) → **I**(Interface Definition: 컴포넌트 props/API·이벤트·서버 API 계약) → **O**(Optimizations & Deep Dive: 렌더링 전략 CSR/SSR/SSG, 네트워크/캐시, 번들 크기, 성능예산, 접근성, 보안).

채점 6축: ① Problem Exploration ② Architecture ③ Technical Proficiency(Performance/Networking/Accessibility/Security/i18n) ④ Exploration & Tradeoffs ⑤ Product & UX Sense(로딩/에러/모바일/perceived performance) ⑥ Communication.

핵심 차등: **백엔드 SD가 서버·DB·LB·분산 확장성을 보는 반면, FE SD는 클라이언트 아키텍처·렌더링 전략·번들/네트워크·UX·a11y를 본다.** 45분 중 코드(의사코드)는 ~5분, 나머지는 아키텍처 다이어그램·데이터흐름·결정 방어에 쓴다. **FE SD는 미니 백엔드 면접이 아니다.** _(출처: GreatFrontend — Evaluation Axes; Tech Interview Handbook — Front End vs Back End SD; SystemDesignHandbook — Frontend SD Guide[참고])_

#### ML/데이터 시스템 디자인 — 7단계 프레임 + ML 고유 메트릭

단계: ① 문제 프레이밍·요구 명확화(비즈니스 목표→ML 태스크 정의: 분류/회귀/랭킹/추천) ② 데이터 파이프라인(수집·라벨링·품질·누수 방지) ③ 피처 엔지니어링 ④ 모델 선택(단순 베이스라인부터, SOTA 디폴트 금지) ⑤ 학습 ⑥ 평가(오프라인 메트릭 vs 온라인 A/B; precision/recall/F1·confusion matrix, calibration, group fairness/bias, robustness) ⑦ 배포·서빙·모니터링(프로덕션 드리프트·재학습). 시간 배분 예: 정의 8분 + 각 설계영역(데이터/피처/모델/학습·평가/배포) ~8분 + 마무리 5분.

핵심 차등: **백엔드 SD가 QPS·일관성·샤딩을 1순위로 보는 반면, ML SD는 문제 프레이밍과 데이터/평가가 1순위 변별 구간이다.** 모델 아키텍처로 직행하거나 데이터 파이프라인·모니터링을 빼면 "연구자처럼 생각하고 프로덕션 엔지니어처럼 생각하지 못한다"는 강한 감점 신호다. 2026년 추세는 평가 방법론·비용·지연·가드레일·모니터링이 아키텍처 다이어그램보다 더 중요하게 채점된다. _(출처: Exponent — ML System Design Interview 2026; Interview Kickstart — ML SD Guide[참고]; alirezadir/Machine-Learning-Interviews — ml-system-design.md[참고])_

#### 백엔드 규모 추정 — 표준 상수 도구상자

LLM이 임의 latency·가용성 수치를 쓰면 형식(R5)은 통과하나 값이 틀린다. 다음 **업계 표준 상수**에 앵커한다:

- **power-of-two 표**(저장량 자릿수 정렬): 2^10≈1K, 2^20≈1M, 2^30≈1GB, 2^40≈1TB, 2^50≈1PB.
- **Jeff Dean — Numbers Every Programmer Should Know**: L1 참조 ~0.5ns, 메모리 1MB 순차 읽기 ~0.25ms, SSD가 메모리보다 ~4배 느림, 디스크 seek ~10ms, 같은 DC 라운드트립 ~0.5ms, 대륙간 라운드트립 ~150ms(메모리는 빠르고 디스크/네트워크는 느리다·전송 전 압축·멀티리전은 비싸다).
- **가용성 9의 개수↔다운타임**: 99%≈연 3.65일, 99.99%≈연 52.6분, 99.999%≈연 5.26분.
- **추정 원칙**: 정확값이 아니라 **자릿수(order of magnitude)**가 목표, 라운딩(99,987→100,000, 9.1→10), 가정은 적어두고, **단위를 반드시 표기**('5'가 아니라 '5MB'), '병목 서비스의 읽기/쓰기 처리량'·'총 저장량'처럼 설계를 가르는 양만 추정하고 무관한 양은 건너뛴다. 차원분석 예: '300M MAU, 50% 일사용, 2건/일 → ~3,500 QPS(피크 ~7,000), 미디어 30TB/일, 5년 ~55PB'.

_(출처: ByteByteGo — Back-of-the-Envelope Estimation; Hello Interview — Mastering Estimation)_

#### 라이브 코딩 절차 — 대학 1차 출처 앵커

(1) **Clarify first** — 곧장 코딩하지 말고 문제를 자기 말로 재진술하고 입력/출력 예시를 직접 제시. (2) **Brainstorm multiple approaches** — 코딩 전에 여러 접근을 검토하고 "어느 접근을 선호하시나요?"라고 면접관에게 물어 차선해 구현을 피한다. (3) **Outline as comments** — 알고리즘을 에디터에 주석/글머리표로 먼저 적는다. (4) **During coding** — 계획을 따라가고 있음을 보이며 진행상황을 계속 소통; 작은 부분에 막히면 'TODO' 노트를 남기고 넘어간다. 행동질문은 CAR(Circumstance–Action–Result) 또는 STAR로 정리. **안티패턴 경고**: 'LeetCode 암기에 시간 전부 쓰기·hard만 풀기·첫 해법으로 직행'은 잘못된 준비다. _(출처: Binghamton University — Mastering Technical Coding Interviews[1차]; Princeton University — Coding Interview Preparation[1차])_

#### 비개발 직군 트랙 부록 (예상 질문·평가 포인트)

> 아래는 여러 후기·가이드에 **공통으로 나타나는 패턴** 질문 세트와 평가 포인트다. 단일 일화 단정 금지 — '예상 질문·답변 구조 신호'로만 쓰고, 후보의 수치·실적은 저장 데이터에 앵커한다.

- **마케팅** — 공통 질문: '캠페인 성과를 어떻게 측정했나', 'KPI를 어떻게 설정했나', 'A/B 테스트 경험', 'GA/광고관리도구 사용 경험', '성공한 마케팅 사례를 분석하라'. 평가 포인트: ① 캠페인 목적별 지표 분기 능력(인지=도달·노출, 참여=CTR·공유, 전환=전환율·ROAS·CPA, 앱=CPI) ② 데이터 기반 의사결정 입증 ③ '목적→관리 지표→액션→수치 성과' 서사. 답변 구조: STAR + 구체 수치('약 30% 증가' > '크게 증가'). _(출처: HAIJOB — 마케팅 면접; 링커리어 — 마케팅 면접 50선[참고])_
- **영업** — 형식: 모의 세일즈/롤플레이('이거 팔아보세요' — 펜·휴대폰·영양제 등 즉석 물건). 평가 포인트: 이 질문은 '진짜 팔기'가 아니라 ① 당황하지 않고 세일즈 상황을 차분히 리드하는가 ② 니즈 파악 → 상품 기능/가치 전달 순서를 아는가 ③ 거절·꼬리질문·압박에 대응하는가. 추가: 텍스트 커뮤니케이션(콜드메일 등) 비중↑, 팀 성과 강조 여부, 셀프피드백→즉시 2차 시연으로 '빠른 학습' 측정, 스크립트 낭독이 아닌 '질문으로 문제 발굴' 능력. _(출처: Recatch — 세일즈 채용 5체크리스트; inthiswork — 제약영업 롤플레이[참고/일화])_
- **기획·PM** — 거의 항상 확인하는 3축: ① 직무 이해('서비스 기획자/PM 역할은?') ② 우리 서비스 분석·개선안('써봤나, 개선점은?') ③ 본인 주도 프로젝트(성과·실패 포함). 케이스/과제전형: 짧은 장표로 '문제 파악→논리적 해결' 제시, 상황형('신규 유입 급증 + 공급 총량 고정이면 어떻게?'), 우선순위 결정(RICE = Reach·Impact·Confidence/Effort 등 프레임 설명 가능해야), 일정 지연·리소스 제약·이해관계자 의견 충돌 대처. 답변: '기본 서사' 먼저 만들고 세부는 파생, STAR. _(출처: brunch @a33f93b357b349e — 7년차 PM 질문리스트[참고/일화]; Medium @2nd.planner — 서비스 기획자 면접[참고/일화]; brunch @ywkim36 — RICE 해설[참고])_
- **디자인** — 형식: 포트폴리오 발표 + 질의응답. 평가 4축: ① 문제 정의·가설 근거('이 가설을 세운 배경은?') ② 의사결정('왜 A로 풀었나, B는 왜 아니었나') ③ 개인 기여도('본인이 한 부분은?' — 과장 필터) ④ 협업·업무 속도·우선순위(PM/개발과 일정 협의, 품질↔양 균형). 핵심: '모르는 걸 아는 척하지 말 것'(신빙성). _(출처: brunch @jenjenny — 프로덕트 디자이너 실무면접[참고/일화]; pxd story — UX/UI 항상 묻는 질문[참고/일화]; wishket — UX디자이너 면접 팁)_
- **데이터 분석** — 형식: SQL 실기 + 지표/통계/케이스 구술. 공통 영역: JOIN(inner/left/outer)·GROUP BY·쿼리 실행순서·인덱스, 통계(A/B 테스트 설계·p-value·평균·표준편차), 데이터 전처리(결측·이상치·중복), 지표 정의의 정합성과 비즈니스 임팩트로의 연결. 평가: 기술 정확성 + '왜 이 지표인가'의 논리. _(데이터 분석가 실무 면접은 §2의 system_design_data 트랙과 평가 축이 다름.)_

### Do

- 코딩(라이브): 입력 형식·범위·중복/음수/빈입력·반환 형식 중 **세션 길이에 맞는 수**의 명확화 질문을 한다(짧으면 1~2개, 길면 더).
- 코딩(라이브): 평균 케이스 1개 + 엣지(빈입력/단일원소/최대 크기) 1개 이상을 **구체 값**으로 적고 손으로 추적한다.
- 코딩: 접근법을 의사코드/말로 설명하고 시간·공간 복잡도를 **미리** 말한 뒤 동의를 받고 코딩한다.
- 코딩(자동채점): 제출 전 N 제약에서 목표 복잡도를 역산하고, 오버플로·경계·빈입력 반례를 스스로 만들어 통과시킨다.
- 시스템: FR 3개+ / NFR(확장성·가용성·지연·일관성) / 규모(DAU·QPS·저장량)를 **설계 다이어그램보다 앞에** 글머리표로 합의한다.
- 시스템: API 시그니처와 데이터 모델(엔티티·주요 필드·인덱스/샤드 키)을 상위 설계 전에 정의한다.
- 시스템: **세션 길이를 먼저 확인**하고 단계별 분 배분을 명시하며, 합이 세션 길이에 맞고 심층 구간이 가장 크게 남도록 한다.
- 시스템: 각 컴포넌트 선택에 "얻는 것 vs 잃는 것 + 대안 1개" 트레이드오프 문장을 붙인다.
- 공통: 막히면 침묵하지 말고 현재 가설·막힌 지점을 소리 내어 말하고 힌트를 활용한다.
- 공통(가상 면접): CoderPad/공유에디터에서 화면공유 중 think-aloud를 유지하고, 시간이 부족하면 "여기까지 동작하고, 남은 부분은 이렇게 마무리할 계획"이라고 **우아하게 마무리**한다. AI 보조 도구가 허용되면 "왜 이 코드인지"를 직접 설명할 수 있어야 한다.
- 한국 맥락: CS 구술(자료구조·네트워크·OS·DB 인덱스/트랜잭션) 예상 질문과 답을 한국어로 준비한다. 경력직은 시스템 설계 대신 **트러블슈팅 경험 구술**이 나올 수 있으니 STAR로 정리한다.
- 한국 맥락(사기업 개발 채용 루프): 한국 사기업은 흔히 (1) **코테 1차**(자동채점, 프로그래머스/백준/SWEA) → (2) 실무 기술면접에서 **라이브코딩(45~60분, 빅오 설명 필수)과 CS 구술이 자소서·인성 질문과 한 세션에 결합**되어 진행된다. 신입일수록 자료구조·알고리즘·CS 비중이 높고, 본인이 작성한 코드의 시간복잡도를 빅오로 설명할 수 있어야 한다. 비개발 직군도 직무 실무 질문이 인성/동기/컬처핏 질문과 한 면접에 섞이므로(스타트업은 가치관·상황형 개방질문 비중↑), 트랙 자료는 **`interview-behavioral`과 함께** 쓰도록 안내한다. _(출처: 원티드 — 개발자 면접 정복(1) 코딩테스트 편; 잡코리아 — 네이버 면접 후기[참고/일화]; IMHR — 스타트업 면접 질문 리스트[참고])_
- 한국 맥락(공공·블라인드 트랙): NCS(한국산업인력공단)는 블라인드/공정채용 표준을 운영하며 면접 문항을 **4유형(경험면접·상황면접·발표면접·토론면접)**으로 표준화한다. 직무별(예: 정보보호) 예시 면접문항이 공개돼 있으니, 공공기관·NCS 기반 IT 직무 지원자에게는 (a) 4유형별로 준비, (b) 직업기초능력(의사소통·문제해결·자원관리 등) 기반으로 경험을 STAR/CAR로 매핑, (c) IT 직무는 '최신 기술 능동적 학습·다양한 이해관계자와의 소통·논리/분석적 사고'가 핵심 역량으로 평가됨을 명시한다. **민간 빅테크 라이브 코딩과 공공기관 NCS 면접은 평가 포맷이 다르므로 지원 대상에 맞춰 트랙을 분리**한다. _(출처: NCS 국가직무능력표준 — 공정채용 포털[1차]; NCS 공정채용 — 면접문항 예시 라이브러리[1차])_

### Don't

- 명확화 없이 곧바로 코딩하거나 다이어그램부터 그리지 않는다(가장 흔한 탈락 원인).
- 반대로, **짧은 세션에서 형식(명확화·손추적)에 시간을 과배분**해 구현 미완으로 끝내지 않는다.
- 접근법 설명 없이 정답 코드만 빠르게 타이핑하지 않는다.
- 복잡도 분석(Big-O)을 생략하거나 면접관이 물을 때까지 미루지 않는다.
- 테스트/dry-run 없이 "됐습니다"라고 선언하지 않는다.
- 시스템: 규모 추정 없이 SQL/NoSQL·캐시·큐를 선택하지 않는다.
- 시스템: 상위 설계에 시간을 다 써서 심층·트레이드오프 시간을 날리지 않는다.
- 시스템: 요구사항이 정당화하지 않는 MSA·Kafka·k8s로 과설계하지 않는다.
- 공통: 막혔을 때 오래 침묵하거나 혼자 머릿속으로만 풀지 않는다.
- 트레이드오프를 "무조건 좋다"식 단정으로 말하지 않는다(모든 선택에는 비용이 있다).

### 워크드 예시 (Before → After)

1. **Before:** 문제 "정렬된 배열에서 두 수의 합이 target이 되는 인덱스를 찾아라." 후보가 바로 "for 이중 루프로 모든 쌍 확인" O(n²) 코드를 타이핑.
   **After (45분 라이브, 라이트 UMPIRE):** "명확화 먼저요 — 오름차순 맞나요? 정답이 항상 존재하나요? 중복 값 있나요?" (답 듣고) "정렬돼 있으니 투 포인터로 양 끝에서 좁히면 시간 O(n), 공간 O(1)입니다. 예: [2,7,11,15], target=9 → left=0,right=3 합 18>9 → right--… 이 접근으로 코딩할게요." (동의 후 구현, 끝나면 빈 배열·단일 원소 엣지 dry-run + Big-O 재확인.)
   **왜 더 나은가:** Before는 명확화·접근설명·복잡도·테스트를 모두 놓치고 'sorted' 단서를 버려 차선 알고리즘을 택한다. After는 단서를 활용한 최적해와 강한 소통 신호를 짧은 세션 안에 동시에 보여준다.

2. **Before:** "URL 단축기를 설계하세요." 후보가 즉시 "LB → 웹서버 → MySQL → 캐시"를 그리고 "이렇게 하면 됩니다." 규모·읽기쓰기 비율·키 길이 언급 없음.
   **After:** "요구사항부터요. 기능: 긴 URL→짧은 코드, 코드→리다이렉트, (선택)만료/커스텀 별칭. 비기능: 리다이렉트 p99 <100ms(캐시 히트 가정), 고가용성, 읽기:쓰기 ≈ 100:1. 규모: 쓰기 100M/월 ≈ **39 writes/s**, 읽기 ≈ **3,860 reads/s**, 5년 누적 ≈ **6B개**. 키 공간: base62 **6자 = 56.8B** 로 6B를 충분히 덮으므로 6자로 시작(여유 보려면 7자=3.5조). API: POST /shorten, GET /{code}. 데이터모델: code(PK)→long_url, 샤드키=code 해시. 읽기가 압도적이라 앞단에 캐시를 두고, 캐시 미스 시 DB. 트레이드오프: 카운터 기반 ID는 순차적이라 예측 가능 **대신** 조정 필요 ↔ 해시는 충돌 처리 필요."
   **왜 더 나은가:** Before는 1순위 안티패턴(명확화 없이 다이어그램). After는 요구사항→추정→API→데이터모델→트레이드오프 순으로 진행하고 **숫자가 재검산되어 정확**하며(39/3,860/6B/56.8B), "읽기쓰기 비율"이 캐시 결정으로 이어지고 키 길이를 공간 계산으로 정당화한다. (이전 초안의 '4000 reads/s'·'7자가 빠듯한 듯'한 서술을 수정함.)

3. **Before:** 심층 "쓰기가 10배로 늘면요?" 후보: "서버를 늘리면 됩니다."
   **After:** "쓰기 ≈ 390/s가 되면 병목은 단일 DB의 쓰기 처리량입니다. 순서대로 (1) code 해시 기준 수평 샤딩으로 쓰기 분산, (2) ID 충돌 회피를 위해 사전할당된 키 범위를 각 앱서버에 배분, (3) 강한 순서 보장이 필요 없는 분석 로그는 비동기 큐로 분리. 트레이드오프: 샤딩하면 쓰기는 확장되지만 범위 쿼리·재샤딩 운영 비용이 늘고, 큐는 처리량을 늘리되 최종 일관성·운영 복잡도를 더합니다."
   **왜 더 나은가:** Before는 병목이 'DB 쓰기'임을 못 짚는다. After는 "10x 밀기"에서 평가자가 보려는 병목 식별 → 구체 전략 → 각 전략의 트레이드오프·운영 비용을 정확히 제공한다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **이 루브릭은 "형식 floor 검사(format lint)"다 — 합격 점수가 아니다.** 모든 검사는 키워드·개수·정규식·위치 비교로 LLM 없이 측정하므로 **구조의 존재만** 본다(예: 'O(n)'이 *맞는지*는 못 본다, 'vs'가 든 문장이 *공허한지*는 못 본다). 따라서 self_check 결과는 `passedCount/totalCount`가 아니라 **"형식 최소 요건 충족/미충족"** 으로 라벨링하고, "정확성·추론 품질은 연결된 AI가 별도 판정"이라는 경고를 반드시 함께 반환한다. 아래 임계값(≥2, ≥3 등)은 **휴리스틱 컷이며 회사/레벨/문제 난이도에 따라 조정 대상**이다(절대선 아님). R10~R11은 안티패턴을 **역검출**하는 negative-check다.
>
> **트랙별 적용 범위(중요):** 이 형식 floor 검사는 **코딩·시스템디자인 트랙 기준으로 설계**되었다. 마케팅/영업/기획/디자인/데이터 등 **비개발 트랙에는 R3(복잡도)·R5(규모 추정)·R7(타임박싱) 같은 코딩/SD 전용 검사가 적용되지 않는다(트랙별 skip)** — 예컨대 마케터 자료에 'O(n)'·'QPS'가 없는 게 정상이다. 비개발 트랙의 형식 floor는 **'직군 평가축 커버리지'**로 대체한다: 마케팅=목적별 지표 분기 언급 + 수치 성과 서사; 영업=니즈파악→기능전달 순서 + 거절 대응 스크립트; 기획=문제정의 + 우선순위 근거; 디자인=의사결정 근거('why not B') + 개인 기여도; 데이터=지표 정의 정합성 + 비즈니스 연결. 단 이들도 '구조 존재'만 LLM 없이 측정하며 내용 정확성·답변 품질은 연결된 AI가 별도 판정한다(위 경고 동일 적용). _(출처: HAIJOB — 마케팅 면접 평가 5축; brunch @jenjenny — 디자이너 평가축[참고/일화])_
>
> **개발 SD 하위 트랙 분기(R4/R5/ML):** R4(요구사항 우선)·R5(규모 추정)는 백엔드 SD(QPS·DAU·저장량) 가정에 고정돼 있어 FE/ML 산출물에 그대로 돌리면 위음성이 난다. track이 `system_design_frontend`면 R5의 NFR 키워드 집합을 **'성능예산/번들 크기/렌더링(CSR·SSR·SSG)/접근성·a11y/i18n/네트워크 캐시'**로 치환하고, DAU·QPS·저장량 대신 **'동시 사용자·페이로드 크기·렌더 예산(ms)·번들 KB'**를 단위 추정 대상으로 인정한다. track이 `system_design_ml`이면 신규 형식 floor를 추가한다: **평가 메트릭 명시(precision/recall/F1/AUC 중 ≥1) + 데이터 파이프라인 섹션 존재 + 모니터링/드리프트 키워드 ≥1**, 누락 시 negative 플래그. 단 트랙 분기는 '무엇을 세는가'만 바꾸지 '정확성을 측정한다'는 주장으로 격상하지 않는다(위 경고 그대로 유지). _(출처: GreatFrontend — Evaluation Axes; Exponent — ML System Design Interview)_

| ID | 검사 항목 | 합격 기준 (형식 floor) | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 명확화 질문 존재 | 명확화 질문 ≥ 2개 (라이브 트랙 한정; 자동채점 트랙은 면제). 휴리스틱 컷 — junior 문제는 1개로 충분할 수 있음 | '?'로 끝나는 질문 문장 수 ≥ 2 **그리고** '명확화/Clarify' 섹션 헤더 존재. 트랙이 `online_coding_test`면 본 검사 skip |
| R2 | 테스트 케이스 구체성 | 구체 입력값 케이스 ≥ 2개, 그중 엣지 ≥ 1개 | '입력→출력' 형태 예시 수 ≥ 2 **그리고** 엣지 키워드('빈'/'empty'/'단일'/'[]'/'null'/'경계'/'오버플로') ≥ 1개 케이스에 매칭 |
| R3 | 복잡도 명시 (정확성 아님) | 시간·공간 각각 O(...) 표기 ≥ 1개 | 정규식 `O\([^)]+\)` 매칭 ≥ 2 **그리고** '시간/time'·'공간/space' 두 키워드 모두 등장. ※ **표기의 정확성은 미측정** — 경고 플래그 함께 반환 |
| R4 | 요구사항 우선 배치 | FR ≥ 3 글머리표 + NFR 키워드 ≥ 2, 그리고 요구사항 섹션이 아키텍처 섹션보다 **앞에** 위치 | '요구사항/requirements' 섹션 글머리표 수 ≥ 3; NFR 키워드(확장성·가용성·지연·일관성/scalability·availability·latency·consistency) ≥ 2; 문서 내 요구사항 섹션 시작 오프셋 < 아키텍처/설계 섹션 시작 오프셋 |
| R5 | 규모 추정(숫자+단위) | DAU/QPS/저장량 중 ≥ 2종에 구체 숫자+단위 | **단위가 붙은** 숫자만 카운트: 정규식 `\d+\s*(M\|K\|B\|GB\|TB\|/s\|QPS\|DAU)` **또는** 한글 수사 `(천만\|백만\|억\|만)\s*(명\|건\|개)?` / `초당\s*\d+` 매칭 ≥ 2. **단위 없는 숫자·`base62 7자`·`O(1)`·`HTTP 2` 류는 제외**(앞뒤 토큰으로 단위 검증). '추정/estimation' 섹션 헤더 동시 존재 요구 |
| R6 | 구조적 트레이드오프 | "얻고/잃는" 구조 트레이드오프 문장 ≥ 3개 + 대안 ≥ 1 | **좁힌 패턴만**: 한 문장에 (트레이드오프 신호 '대신'/'트레이드오프'/'↔'/'tradeoff' **또는** '얻'+'잃'/'gain'+'lose') **그리고** 기술명/명사 2개 이상 동시 출현 ≥ 3. ※ 일반 '하지만/반면'만으로는 카운트 안 함(위양성 차단) |
| R7 | 타임박싱이 심층을 보호 + 합이 세션 길이에 맞음 | 분 배분 단계 ≥ 4개; 분 합이 (세션 길이 ±10%) 범위; 심층 단계 분 ≥ 상위설계 단계 분 | '분/min' 숫자 붙은 단계 수 ≥ 4; **모든 단계 분의 합이 [세션×0.9, 세션×1.0] 범위에 드는지 합산 검증**(기본 세션=45, 입력으로 60/90/120 등 지정 가능); '심층/deep dive' 분 ≥ '상위/high-level' 분 |
| R8 | 소통/막힘 대응 가이드 존재 (자료 완비성, 후보 역량 아님) | 막힘 대응 항목 ≥ 1 | '막히면/소리 내어/think aloud/힌트/대화' 키워드 ≥ 1. ※ 이는 **준비 자료에 문장이 들어갔는지**일 뿐 실제 소통 능력이 아님 — 경고 플래그 함께 반환 |
| R9 | 과설계 경고 존재 | '단순하게 시작'/'요구사항 정당화' 취지 ≥ 1 | '과설계/over-engineer/단순하게 시작/점진/정당화' 키워드 ≥ 1 |
| R10 | **(negative)** 트레이드오프 단정 안티패턴 미검출 | "무조건/항상 좋다/best/언제나 우월" 식 단정 문장 = 0 | '무조건'/'항상 좋'/'언제나'/'always better'/'best choice' 패턴 매칭 = 0 이면 통과(존재하면 **실패 플래그**) |
| R11 | **(negative)** "명확화 없이 코드/다이어그램" 흔적 미검출 | 문서 첫 섹션이 코드블록/다이어그램이 아니라 요구사항·명확화 | 첫 비공백 콘텐츠 블록이 코드펜스(```)/아키텍처 키워드가 아니라 '요구사항'/'명확화' 섹션인지 위치 검사. 아니면 **실패 플래그** |

**주요 실패 모드 (게이밍·위양성 정직 고지):**
- **게이밍**: 의미 없는 명확화 질문 2개, 틀린 'O(n)' 2개, '대신'이 든 공허한 문장 3개만 붙여도 R1·R3·R6은 PASS한다. 루브릭은 **구조의 존재**만 보장하지 **질·정확성을 0% 보장하지 않는다.** self_check가 '전부 PASS'여도 연결된 AI는 (a) 복잡도가 실제로 맞는지 (b) 트레이드오프가 공허하지 않은지 (c) 추정 숫자가 재검산되는지를 **반드시 별도 검토**해야 한다.
- **proxy 한계**: 이 형식 충족도는 실제 면접 통과율과 상관관계가 **입증되지 않은 대리지표**다. "self_check 통과 = 합격"으로 사용자에게 제시하면 가짜 자신감을 준다.
- **위양성 예시(자료에 박제 금지)**: "캐시는 빠르지만 좋다 vs 나쁘다"(R6 통과하나 공허), "O(n)으로 정렬"(R3 통과하나 정렬은 O(n log n)) — 이런 건 연결된 AI가 잡아야 한다.

## 4. 출처 (Provenance)

- **Tech Interview Handbook — Coding Interview Rubrics** — 코딩 라이브 면접 4대 평가 축(Communication/Problem-solving/Technical competency/Testing)과 '코딩 전 명확화·접근법 설명'이 hire 신호라는 근거 · https://www.techinterviewhandbook.org/coding-interview-rubrics/
- **Tech Interview Handbook — Coding Interview Cheatsheet** — before/during/after 체크리스트(green light 후 코딩, 코딩하며 설명, 의미있는 변수명·함수 추출) · https://www.techinterviewhandbook.org/coding-interview-cheatsheet/
- **CodePath — UMPIRE Interview Strategy** — UMPIRE 6단계 구체 행동(Understand/Plan/Review/Evaluate). **단, UMPIRE는 CodePath의 교육용 니모닉이지 Google/Meta 공식 채점 루브릭이 아니다 — 빅테크는 'UMPIRE 준수'가 아니라 코드 정확성·테스트 통과·복잡도를 hidden rubric으로 채점한다.** · https://guides.codepath.org/compsci/UMPIRE-Interview-Strategy
- **DesignGurus — System Design Rubric 차원 / 7 Anti-Patterns** — 평가 차원(요구사항·아키텍처·기술깊이·트레이드오프), 과설계 등 안티패턴. **2차(블로그) 출처이며 실제 회사 1차 루브릭이 아님에 주의.** · https://www.designgurus.io/blog/
- **Exponent — System Design Interview Guide** — 45분 단계별 시간 배분의 *기본값*, 10x/100x 밀어붙이기, 심층에서 차별화. **회사별 세션 길이(Amazon 60분·한국 60~120분·스타트업 2~3h)와 레벨 차등은 본 플레이북의 보정이며 이 단일 소스에 과의존하지 말 것.** · https://www.tryexponent.com/blog/system-design-interview-guide
- **GeeksforGeeks / SystemDesignHandbook — Common Mistakes** — 핵심 안티패턴(명확화 없이 다이어그램, 모놀로그, 한꺼번에 다루기). 2차 출처 · https://www.geeksforgeeks.org/system-design/common-mistakes-to-avoid-in-a-system-design-interview/

### 트랙별 평가축 (FE/ML SD, 코딩 절차)

- **[2차] GreatFrontend — Front End System Design Playbook: Evaluation Axes** — FE SD의 RADIO 프레임 + 6 평가축(Problem Exploration/Architecture/Technical Proficiency/Tradeoffs/Product-UX/Communication), FE NFR(Performance/Networking/Accessibility/Security/i18n), '추론을 입 밖으로 내지 않으면 0점' 원칙 · https://www.greatfrontend.com/front-end-system-design-playbook/evaluation-axes
- **[2차] Tech Interview Handbook — Front End vs Back End System Design Interviews** — FE SD가 백엔드와 골격은 같되 NFR 축이 다름·'45분 중 코드 5분' 교차확인(직접 fetch 403, 검색 스니펫 교차) · https://www.techinterviewhandbook.org/blog/front-end-vs-back-end-system-design-interviews/
- **[참고] SystemDesignHandbook — Frontend System Design: The Complete Guide 2026** — 클라이언트 아키텍처·렌더링·번들 축 교차확인 · https://www.systemdesignhandbook.com/guides/frontend-system-design/
- **[2차] Exponent — Machine Learning System Design Interview (2026)** — ML SD 6단계 프레임 + ML 고유 메트릭(F1/precision/recall·calibration·drift/monitoring), '문제 프레이밍·데이터·평가가 1순위 변별 구간' · https://www.tryexponent.com/blog/machine-learning-system-design-interview-guide
- **[참고] Interview Kickstart — ML System Design Interview Guide** — 7단계 프레임(요구·프레이밍·데이터·모델·평가·배포·모니터링)·시간배분 교차확인 · https://interviewkickstart.com/blogs/articles/machine-learning-system-design-interview-guide
- **[참고] alirezadir/Machine-Learning-Interviews — ml-system-design.md** — 오픈소스 ML SD 템플릿 교차확인 · https://github.com/alirezadir/machine-learning-interviews/blob/main/src/MLSD/ml-system-design.md

### 규모 추정 표준 상수

- **[2차] ByteByteGo — Back-of-the-Envelope Estimation** — power-of-two 표·Jeff Dean latency numbers·가용성 9의 개수↔다운타임·Twitter 워크드 예시·라운딩/단위/가정 팁 · https://bytebytego.com/courses/system-design-interview/back-of-the-envelope-estimation
- **[2차] Hello Interview — System Design Fundamentals: Mastering Estimation** — crux/병목만 추정·order-of-magnitude·차원분석·라운딩 · https://www.hellointerview.com/blog/mastering-estimation

### 코딩 면접 절차 — 대학 1차 출처

- **[1차] Binghamton University — Fleishman Center: Mastering Technical Coding Interviews** — Clarify/Brainstorm/Outline 단계·CAR Method·안티패턴 경고(LeetCode 암기·hard만·첫 해법 직행) · https://careertools.binghamton.edu/resources/mastering-technical-coding-interviews/
- **[1차] Princeton University — Center for Career Development: Coding Interview Preparation** — timed test vs live·평가 대상·think-aloud(직접 fetch 403, 검색 스니펫 교차) · https://careerdevelopment.princeton.edu/guides/interviews/coding-interview-preparation

### 한국 공공·블라인드 트랙 — 정부 1차 출처

- **[1차] NCS 국가직무능력표준 — 공정채용(블라인드) 공식 포털 (한국산업인력공단)** — 블라인드/공정채용 표준 운영 · https://www.ncs.go.kr/
- **[1차] NCS 공정채용 — 면접문항 예시문항 라이브러리** — 면접 4유형(경험/상황/발표/토론)·정보보호 등 직무별 예시·직업기초능력 태깅 · https://www.ncs.go.kr/blind/blp/bbs_lib_list.do?libDstinCd=56

### 한국 사기업 실전 — 개발 채용 루프 & 비개발 직군 트랙

- **[2차] 원티드 — 개발자 면접 완전 정복 (1) 코딩 테스트 편** — 온라인 코테 vs 라이브코딩(45~60분) 구분·시간·평가4축·빅오 설명 필수·코드 작성 전 접근 상의 · https://www.wanted.co.kr/events/22_11_s01_b15
- **[참고] 잡코리아 — 네이버 면접 후기(일화)** — 자소서 기반 질문 중간에 라이브코딩이 한 세션에 결합 · https://www.jobkorea.co.kr/starter/review/view?C_Idx=215&Half_Year_Type_Code=0&Ctgr_Code=3&FavorCo_Stat=0&G_ID=0&Page=30
- **[참고] IMHR — 스타트업 면접 질문 리스트 20** — 가치관·상황형 개방질문 중심(2차 HR 콘텐츠, 본문 미렌더로 참고 강등) · https://www.imhr.work/brand/startup-interview-questions/
- **[2차] HAIJOB — 마케팅 면접 질문 리스트** — 목적별 지표 분기(ROAS/CPA/CTR/CPI/도달)·평가 5축(논리·데이터·창의·실무적용·커뮤니케이션)·STAR·구체 수치 · https://www.haijob.co.kr/blog/marketing-interview-question-list-real-time-questions-how-to-answer-and-summary-of-acceptance-points/
- **[참고] 링커리어 커뮤니티 — 마케팅 직무 면접 질문 리스트 50(일화)** — ROI·KPI·A/B·GA·타겟팅 반복 교차확인 · https://community.linkareer.com/jayuu/2722774
- **[2차] Recatch — 세일즈맨 면접 질문 5가지 체크리스트** — 모의세일즈로 실무 역량 검증·텍스트커뮤·셀프피드백→재시연 빠른학습·질문능력 · https://www.recatch.cc/ko/blog/5-checklists-for-hiring-salesman/
- **[참고] inthiswork — 제약영업 '이거 팔아보세요' 롤플레이(일화)** — 니즈파악→기능전달·거절·꼬리질문 · https://inthiswork.com/?kboard_content_redirect=309
- **[참고] brunch @a33f93b357b349e — 7년차 PM 면접 질문리스트(일화/현직자)** — 직무이해·실패·우선순위·이해관계자 · https://brunch.co.kr/@a33f93b357b349e/42
- **[참고] Medium @2nd.planner — 면접 보는 서비스 기획자에게(일화/현직자)** — 직무이해·서비스 개선안·주도 프로젝트 3축 · https://medium.com/@2nd.planner/%EB%A9%B4%EC%A0%91%EC%9D%84-%EB%B3%B4%EB%8A%94-%EC%84%9C%EB%B9%84%EC%8A%A4-%EA%B8%B0%ED%9A%8D%EC%9E%90%EB%93%A4%EC%97%90%EA%B2%8C-1-816318317f88
- **[참고] brunch @ywkim36 — RICE 프레임워크 해설** — 우선순위 정의(Reach·Impact·Confidence/Effort) 교차확인 · https://brunch.co.kr/@ywkim36/124
- **[참고] brunch @jenjenny — 프로덕트 디자이너 실무면접(일화)** — 포트폴리오 평가 축(문제정의 근거·why a not b·개인 기여도) · https://brunch.co.kr/@jenjenny/6
- **[참고] pxd story — UX/UI 직군 항상 묻는 질문 3가지(일화)** — 대표 프로젝트·협업·우선순위 · https://story.pxd.co.kr/1574
- **[2차] wishket 블로그 — UX디자이너 면접 질문 팁** — 디자이너 면접 평가 포인트 · https://blog.wishket.com/ux%EB%94%94%EC%9E%90%EC%9D%B4%EB%84%88-%EB%98%91%EC%86%8C%EB%A6%AC%EB%82%98%EA%B2%8C-%EA%B5%AC%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95-%EA%B5%AC%EC%9D%B8%EA%B8%80-%EC%9E%91%EC%84%B1-%EB%A9%B4%EC%A0%91/
- **[참고] off-dngw.github.io — SQL/DB 면접 질문 정리(일화)** — JOIN·실행순서·DDL/DML · https://off-dngw.github.io/posts/DB%EB%A9%B4%EC%A0%91%EC%A7%88%EB%AC%B8%EC%A0%95%EB%A6%AC/
- **[참고] velog @sainteye01 — 데이터 분석 직군 공통 면접 질문(일화)** — 역량·도구 중심 · https://velog.io/@sainteye01/%EB%8D%B0%EC%9D%B4%ED%84%B0-%EB%B6%84%EC%84%9D-%EC%A7%81%EA%B5%B0-%EA%B3%B5%ED%86%B5-%ED%95%AD%EB%AA%A9-%EB%A9%B4%EC%A0%91-%EC%A7%88%EB%AC%B8-%EB%A6%AC%EC%8A%A4%ED%8A%B8

> **출처 등급 주의(정직 고지):** 위 '한국 사기업 실전·비개발 직군 트랙' 항목 중 [참고]로 표시된 것은 **현직자·취준생 블로그/커뮤니티 후기(일화·자기보고·미검증)**다. 본문 enrichment는 '여러 후기·가이드에 공통으로 나타나는 패턴만 채택, 단일 일화 단정 금지, 예상 질문·답변 구조 신호로만'을 지켰다. 각 직군 질문 세트는 최소 2개 출처(2차 가이드 + 참고 후기)에서 교차확인된 패턴만 반영했다. NCS/공공기관 1차 자료(블라인드)는 민간 사기업 트랙과 섞지 않고 별도 트랙으로 유지한다.

- **본 플레이북 보정(1차 자료 없음, 실무 관찰 기반)** — 온라인 코딩테스트 vs 라이브 코딩 분리, 세션 길이별 프레임 강도(라이트/풀 UMPIRE), 레벨(L3~L6+) 차등 기대치, 모바일 SD 트랙 존재, AI 보조도구 정책. 이 항목들은 위 출처가 직접 뒷받침하지 않으므로 회사/연도별로 재확인 대상이다. _(FE/ML/데이터 SD 트랙·한국 채용 루프·비개발 직군 트랙은 위 신규 출처로 앵커되어 더 이상 무출처 보정이 아니다.)_

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_interview_prep_playbook({ track, role?, company?, level?, session_minutes?, locale? })` — `track`은 `online_coding_test | live_coding | system_design_backend | system_design_frontend | system_design_ml | debugging | behavioral` 에 **비개발 직군 트랙** `marketing | sales | pm_planning | design_portfolio | data_analyst` 추가. 트랙별 (a) 프레임(자동채점 체크 / 라이트·풀 UMPIRE / SD 타임박스 / 직군 평가축), (b) do/dont, (c) 막힘·시간초과 마무리 스크립트, (d) 형식 루브릭을 반환. **신규 비개발 트랙은 각각** (a) 직군 평가축, (b) 공통 예상 질문 세트, (c) 답변 구조 템플릿(마케팅/영업/기획/데이터=STAR+수치, 디자인=문제정의→과정→의사결정 근거→결과→기여도), (d) 롤플레이/케이스/과제전형 대응 스크립트, (e) 트랙별 형식 floor 검사를 반환. `level`로 passBar 분기, `session_minutes`로 R7 합산 기준 설정, `locale:'ko'`면 CS 구술 세트 + 한국어 스크립트 + 경력직 트러블슈팅 STAR 템플릿 + 한국 사기업 개발 루프(코테1차→라이브코딩+CS 결합)·NCS 4유형 세트 포함.
  - `self_format_lint_interview_prep({ artifact_text, track, session_minutes?, level? })` — **이름을 `self_check`에서 `self_format_lint`로 변경**(정직성). LLM 없이 R1~R11 패턴/개수/위치/negative만 측정. 반환에 **경고 플래그 강제 포함**: 형식 충족 여부일 뿐 합격·정확성 보장 아님.
  - `generate_mock_questions({ track, topic })` — `get_application_context`에 **기술 스택 필드가 실제 있는지 먼저 검증**하고, 없으면 role/company로 폴백. 컨텍스트의 직군(role)·기술스택·저장된 프로젝트/성과 데이터를 읽어 직군 예상 질문 세트를 serve하되, **답변 예시에는 저장 데이터에 없는 수치·실적을 절대 채우지 않는다(no-fabrication 가드 — 저장 데이터 앵커 원칙을 코드 수준까지 내림)**.
  - `save_interview_prep` — 기존 8단계 게이팅(**document_passed 이상에서만 해금**)을 그대로 존중. 단 **track/framework/rubric_result 필드 추가가 필요하면 스키마 확장 + 기존 데이터 마이그레이션 영향(현 스키마는 questions/star_guides/self_introduction/notes만 받음)을 Phase B에서 명시 설계**할 것.
- **데이터 형태 힌트:**
  ```
  playbook = {
    track, level, session_minutes,
    framework: { steps: [{ name, minutes, actions: [...] }], total_minutes, frame_intensity: 'light'|'full'|'autograder' },
    doList: [...], dontList: [...],
    communication_scripts: [{ situation: '막힘'|'시간초과', say: '...' }],
    rubric: [{ id, check, passBar, measure: { type: 'count'|'exists'|'ratio'|'regex'|'order'|'sum_in_range'|'negative', pattern, threshold, session_aware? } }],
    disclaimer: '루브릭은 형식 floor — 정확성·추론 품질은 연결된 AI가 판정'
  }
  self_format_lint 반환 = {
    track,
    checks: [{ id, passed: bool, observed: number, required: number, kind: 'positive'|'negative', accuracy_unverified: bool }],
    format_floor_met: bool,        // passedCount/totalCount 대신 — '점수' 오독 방지
    warning: 'PASS는 형식 충족일 뿐 정답·합격 보장 아님'
  }
  ```
  rubric의 measure는 정규식/키워드/개수/위치/합산/역검출 기반이라 외부 AI 없이 CareerMate가 산출물 텍스트에 직접 적용 가능. `session_aware`·`level` 분기로 R7 합산 기준과 R1 임계값을 조정한다.
