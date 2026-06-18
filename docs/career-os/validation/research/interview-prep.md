# RESEARCH — 면접 준비 (Interview Prep)

> 검증된 출처 기반(2026-06-18). 시장=한국 우선, 글로벌 보조. 등급 [1차]/[2차]/[참고].

## 전문가 원칙
- **P1 — 구조화가 카리스마를 이긴다.** Google People Analytics: 구조화 면접(계획된 질문+행동 앵커 평정척도)이 단일 최고 예측 도구. 모든 질문이 *정의된 속성*과 *빈약/경계/양호/탁월 답변 기준*에 매핑됨. [1차] https://rework.withgoogle.com/intl/en/guides/a-guide-to-structured-interviewing-for-better-hiring-practices
- **P2 — 3가지를 평가(Google 분류):** 직무지식, 문제해결(복잡성 추론), 리더십/주도성. 예상질문을 셋 중 하나로 사전 분류. [1차] re:Work
- **P3 — 역량→스토리 매핑(Amazon 모델).** 면접관은 2~3개 역량을 배정받아 follow-up으로 추궁 후 평정. 준비는 질문-우선이 아니라 역량-우선: 스토리뱅크 구축 → 역량 매핑 → flex 스토리(한 스토리를 여러 역량용으로 변주). [2차] https://www.tryexponent.com/blog/how-to-nail-amazons-behavioral-interview-questions , https://www.designgurus.io/blog/amazon-leadership-principles-behavioral-interview
- **P4 — 외운 이론보다 체험·구체.** 면접관은 "블로그 답변" 경계 너머를 일부러 추궁(AI가 그럴듯한 이론 생성 가능하므로). 전문가 준비는 *구체적 체험 디테일+숫자*로 무장. [2차] https://interviewing.io/guides/system-design-interview
- **P5 — 한국: 이중축 적합.** 패널은 직무적합성+조직적합성(인재상)+인성을 함께 평가. 실무면접=직무경험, 임원면접=인성+회사이해+인재상 연결. 키트는 *인재상 연결* talking point 생성. [2차] https://community.linkareer.com/employment_data/5896586 , https://www.jobkorea.co.kr/goodjob/tip/view?News_No=15549

## 행동/인성 준비 방법 (실행 레시피)
- **STAR 전문가식(슬롭 STAR-lite 아님):** S/T 짧게(맥락+목표/내 역할), **A가 하중 구간** — 1인칭 "내가 했다", 팀 스토리에서도 *본인 기여* 명시; R은 정량+"무엇을 배웠나". 캘리브레이션: 소리내어 ~90초 미만이면 Action 누락 의심, 답변당 ~60~90초로 rambling 레드플래그 회피. [2차] biginterview https://resources.biginterview.com/behavioral-interviews/behavioral-interview-questions/
- **스토리뱅크 구축:** ① 갈등·실패·리더십/주도·모호함·무권한 영향·압박하 delivery를 아우르는 실제 스토리 6~10개 인벤토리 ② 각 스토리를 목표 역량/인재상 키워드에 태깅(스토리×역량 매트릭스) ③ flex 변주 생성. [2차] Exponent
- **꼬리질문(follow-up) 예측 — 전문가 차별점.** 각 예상질문에 likely probe 2~3개 사전 준비("왜 그 방법?","팀 vs 본인 기여?","다시 한다면?","측정 결과?"). [1차] re:Work; [2차] DesignGurus
- **실패/약점 질문(고위험):** "과거 X에 어려움 → 지금 쓰는 구체 전략"(취약성+성장). 실패는 인정·책임전가 금지·교훈/행동변화로 마무리. [2차] https://www.roberthalf.com/us/en/insights/landing-job/how-to-talk-about-your-weaknesses-in-a-job-interview , https://resources.biginterview.com/behavioral-interviews/biggest-failure-question/
- **레드플래그(답변이 밟지 말 것):** 전 직장/동료 비난, 실수 부인, 본인만 유능한 hero 스토리, rambling, 면접관 말 끊기. [2차] https://recruitee.com/blog/interview-red-flags ; [참고] Blind
- **한국 인성/조직적합:** 회사 미션/비전/핵심가치/인재상을 *본인 언어*로+"왜 공감/내 가치관과 연결" 한 문장 — 암기 금지. 일관된 태도·신뢰감 보상. [2차] Linkareer 5896586
- **압박면접:** 목적=약점·스펙갭·정서안정 탐침. 차분히 조목조목, 감정반응 금지, "Yes...But" 화법. 빈출: 좋아하는 일 vs 잘하는 일, 공백기, 상사의 부당지시, 입사 후 안 맞으면, 중복 업무. [2차] https://brunch.co.kr/@insateam/79 , https://news.incruit.com/news/newsview.asp?newsno=436654

## 직무/기술 준비 (역할별)
- **SW 시스템 디자인(3단계):** ① 요구(기능+비기능: 규모/지연/가용성) ② 데이터·API·규모 추정 ③ 설계(SQL vs NoSQL, DB/cache/LB/queue) **트레이드오프 명시 정당화**. 시니어 시그널=45분 대화 주도+HLD↔LLD 연결. 강함: 결정한다("트레이드오프 A/B 때문에 X"), 먼저 명확화, 불확실성 정직. 약함: 트레이드오프 없이 컴포넌트 나열, 기술 name-drop, 결정 회피, 긴 침묵. [2차] interviewing.io , https://www.geeksforgeeks.org/system-design/guide-to-system-design-interview-for-senior-engineers/
- **코딩:** 명확화 → 접근+복잡도 명시 → 코딩하며 내레이션 → 테스트/엣지. 협업으로 취급.
- **PM:** Product Sense/Estimation/Behavioral/Execution. 프레임 CIRCLES·CAPTIVATE·JTBD. *추론* 채점(정답 아님), "침묵은 비싸다", 대상+왜 중요한지 명시, 실행은 성공지표(채택·리텐션·CSAT) 거명. [2차] https://www.tryexponent.com/blog/the-ultimate-pm-interview-study-plan , https://online.stanford.edu/how-prepare-product-management-interview
- **데이터:** SQL(조인·GROUP BY·서브쿼리·윈도우)+제품 케이스(지표 정의→실험/AB→데이터→의사결정). 구조+영리한 명확화 질문+결정 연결로 채점. [2차] https://datalemur.com/blog/sql-interview-guide , https://www.interviewquery.com/p/data-science-case-study-interview-questions
- **영업/AE:** 세일즈 파이프라인 자신감, 협상·이의처리, SPIN/Solution/Challenger 숙지, quota/숫자로 입증. [2차] https://www.salesforce.com/blog/account-executive-interview-questions/
- **한국 형식:** **PT면접**(5~10분 발표+Q&A; 논리·문제해결·실행가능성 평가; 기업분석/SWOT 준비; 사전형/즉석형) [2차] https://community.linkareer.com/employment_data/4985276 · **토론면접**(명확한 입장+근거 2~3, 차분·간결, 협업 톤) [2차] Superookie

## 한국 시장 특수(통합)
- 단계 가중: 실무→직무경험, 임원→인성+회사이해+인재상. 단계별 키트 조정.
- **인재상 연결 필수**, 본인 목소리로 패러프레이즈+개인가치 연결.
- **역질문(reverse) 기대** — 쌍방향 소통. 구체·역할 현실적(온보딩/교육, 담당 범위, 성공 기준). [2차] https://publy.co/content/7144 ; [1차] UPenn https://ulife.vpul.upenn.edu/careerservices/blog/2018/12/06/acing-the-reverse-interview/
- **압박면접**은 별도 형식(빈출 사전 스크립트).
- **커뮤니티 기출 [참고, anecdotal — 검증]:** 잡플래닛 면접후기·Blind=실제 최근 질문 패턴·난이도, 방향성만.

**충돌:** "약점" 질문 — 일부는 폴리시된 "성장형" 약점, 레드플래그 출처는 *가짜/안전한* 약점 경고. 해소: *진짜* 약점+이미 진행 중인 구체 완화책.

## 리뷰어 채점 루브릭 (AI 면접준비 키트 PASS/FAIL) — R1·R2·R5 중 FAIL이면 전체 FAIL
| # | 기준 | PASS | FAIL |
|---|---|---|---|
| R1 | 증거기반·비제너릭 | 후보의 실제 스토리/숫자, 이 역할·회사 특정 | 템플릿 답변, 날조, 체험 없는 "블로그 이론" |
| R2 | 역량/인재상 매핑 | 각 예상질문이 역량/인재상에 태깅, 스토리×역량 매트릭스 | 매핑 없는 무작위 질문 리스트, 회사/인재상 미연결 |
| R3 | STAR 품질 | A 우세, 1인칭+본인기여, R 정량+교훈 | S/T 과다, 모호한 "우리", 측정 결과 없음 |
| R4 | 꼬리질문 깊이 | 핵심질문당 probe 2~3+준비답변 | 단층 Q&A, 추궁 없음 |
| R5 | 난질문 처리 | 실패/약점=실수 인정+성장, 압박 사전스크립트, 레드플래그 없음 | 책임전가, 가짜 약점, 실수 부인, 압박/실패 무시 |
| R6 | 역할별 기술 준비 | 역할 맞는 프레임(시스템디자인 3단계+트레이드오프/PM CIRCLES+지표/데이터 SQL+케이스/영업 파이프라인/KR PT·토론)+결정 강조 | 틀린/없는 프레임, 트레이드오프 없는 나열, 결정 없음 |
| R7 | 역질문 | 구체·역할현실적 3~5개 | 없음 또는 "문화 어때요" 필러 |
| R8 | 슬롭 없음 | 간결·실행가능·불확실성 정직 | 패딩·반복·거짓 확신·회사사실 환각 |

## 인코딩 핵심
1. 역량-우선(질문-우선 아님) — 스토리×역량(×인재상) 매트릭스 먼저, 그 다음 질문 생성.
2. **모든 예상질문에 follow-up 2~3+루브릭 라인(빈약/경계/양호/탁월)** — 전문가 vs 얕음의 최대 차별점.
3. 저장 데이터의 실제 증거 강제, 사실 날조 거부.
4. 역할·한국형식(인성/실무/임원/PT/토론/압박)별 분기, 각자 맞는 프레임.
5. 실패/약점 처리+역질문 항상 포함(얕은 키트는 둘 다 누락).

## 출처
[1차] Google re:Work · UPenn reverse interview. [2차] Exponent(Amazon/PM) · DesignGurus · interviewing.io · GeeksforGeeks · Stanford Online · DataLemur · InterviewQuery · Salesforce/HubSpot · biginterview · Robert Half · Recruitee · viraptor/reverse-interview · (KR) Linkareer 5896586/4985276 · JobKorea 15549/15566 · Superookie · Incruit 압박 · Brunch insateam · PUBLY 7144. [참고] Jobplanet 면접후기 · Teamblind(KR).
