# 면접 — 행동 / Behavioral Interview — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

행동 면접은 "과거 행동이 미래 성과를 예측한다"는 행동 일관성(behavioral consistency) 원리에 기반한 구조화 면접이다. **이 원리의 방법론적 계보는 Flanagan(1954)의 Critical Incident Technique에서 파생해 McClelland가 Behavioral Event Interview(BEI)로 발전시킨 계열이다 — BEI의 핵심은 '당신은 어떤 사람인가(특성·가정형)'가 아니라 '그때 실제로 무엇을 말하고/행동하고/생각했는가'라는 구체적 과거 사건의 행동 코딩으로 우수자(outstanding)와 평균자(typical)를 변별하는 것이다. McClelland(1998)는 BEI로 코딩한 역량 점수가 (면접관·코더가 결과에 blind인 상태에서도) 경영 성과를 신뢰성 있게 예측했고 프로토콜 길이·전년도 성과에 의한 편향이 없었음을 보였다 — 이것이 본 문서가 '미래 가정형 답변 금지'·'특성·형용사 나열 금지'·'probing으로 진위 검증'을 강조하는 1차 학술 근거다(4절 출처).** 면접관은 지원자의 과거 사례를 STAR(Situation·Task·Action·Result) 형태로 듣고, 직무 관련 역량(competency)·회사 가치에 매핑해 채점한다. CareerMate는 LLM이 없으므로, 연결된 외부 AI가 사용자의 실제 경험을 STAR로 재구성하고, 역량에 매핑하며, 실측 정량 결과를 분리해내고, **후속 질문(probing)에 견디는 스토리 뱅크**를 만들도록 돕는 지식·루브릭을 제공한다. 핵심은 ① 개인 기여를 1인칭으로 분리, ② Result를 **검증 가능한** 실측 수치로, ③ 각 스토리를 controlled vocabulary 역량 태그에 매핑, ④ 사례마다 probing 답(왜·대안·되돌아보면)을 미리 준비하는 것이다. 아래 루브릭은 어느 체크가 **결정론적으로 셀 수 있고(D)**, 어느 체크가 **외부 AI의 의미 판단을 전제로 한 보조 휴리스틱(H)**인지를 등급으로 명시 구분한다 — 전부 동급의 기계 검증인 척하지 않는다.

## 2. 플레이북

### 원칙

- **(STAR 4요소를 빠짐없이 채우되, Action에 가장 많은 분량과 '결정의 밀도'를 둔다.)** — 면접관이 평가하는 것은 Situation의 장황함이 아니라 지원자가 내린 구체적 결정·행동이다. Result가 빠지면 임팩트 평가가 불가능하다. **단, 'Action 50% / Result 25% / Situation 15% / Task 10%'라는 비율은 1차 채점 연구가 아니라 대학 커리어센터의 코칭 휴리스틱일 뿐이므로, 합격 게이트가 아니라 soft 가이드로만 쓴다.** 길이가 아니라 '구체 결정 동사 개수'가 Action 품질의 진짜 신호다. _(출처: Northwestern Career Advancement STAR Approach — 휴리스틱, 4절 신뢰도 주석 참조)_
- **(Action·Result는 'we'가 아니라 'I/제가'로 개인 기여를 분리해 쓴다.)** — 면접관은 팀이 아니라 지원자 개인의 역량을 채점한다. 팀 맥락은 Situation에서 한 줄로 깔고, Action에서 '제가 ~을 결정/제안/구현했다'로 본인 행동을 드러낸다. **한국어는 주어 생략이 자연스러우므로('~을 제안했습니다') 'I' 토큰 카운트가 아니라 '제가/내가' 명시 빈도 + 집단대명사(저희/우리) 대비로 측정한다.** _(출처: UVA Career Center, Bauer College STAR guide)_
- **(Result는 실측 수치로 정량화하되, 검증 가능성과 짝지어 쓴다.)** — 가능하면 숫자+단위(%, 시간, 금액, 인원, 순위, 기간)로 표현한다. **단, "만족도 100%"·"효율 200% 개선" 같은 분모·기간·출처 없는 숫자는 probing에서 즉시 무너진다.** 각 수치에는 측정 범위(label)와 원자료 링크(sourceRef)를 붙여 진위를 보장한다. 정량화가 불가능하면 검증 가능한 정성 결과(채택됨/재현됨/재계약)와 학습을 명시한다. _(출처: Amazon STAR guidance, UVA Career Center)_
- **(답변 전, 질문이 겨냥하는 역량/회사가치를 controlled vocabulary로 먼저 식별하고 매핑한다.)** — 구조화 면접의 변별력은 표준화·동일 질문·앵커드 채점표(BARS)에서 나오며, 역량 매핑은 그 일부다(역량 매핑 단독이 우수성의 원인이라는 단정은 과도 단순화). 채용공고 요구 역량에서 역으로 스토리를 고른다. **태그 인플레이션을 막기 위해 역량은 고정 enum을 쓴다(아래 택소노미).** _(출처: U.S. OPM Structured Interviews; Northwestern)_
- **(스토리 뱅크를 미리 8~12개 구축하고, 각 사례에 probing 답 3종을 함께 준비한다.)** — 한 사례를 여러 질문에 변주해 즉석 누락을 막는다. **Amazon 루프 등에서 후보가 떨어지는 1순위는 첫 답변이 아니라 probing 붕괴이므로, 각 사례에 '왜 그 결정을 했나 / 대안은 무엇이었나 / 되돌아보면 무엇을 바꾸겠나' 답을 미리 채운다.** _(출처: Amazon Behavioral Interview 가이드, UVA·Wisconsin 등)_
- **(사례는 최신성·직무관련성을 갖춰야 한다.)** — 시니어/경력직에게 8년 전 인턴·학부 프로젝트만 가득한 뱅크는 반려 사유다. 각 사례에 연도·역할단계를 기록하고, 경력직은 최근 N년 내 사례 비율을 확보한다. _(출처: 채용 실무 — recency/relevance, hiring manager review)_
- **(사실·수치·고유명사는 절대 지어내지 않는다. 실패 사례는 조건부로만 쓴다.)** — 면접관은 probing으로 꾸민 이야기를 검증한다. 실패 사례는 회복·재발방지 행동이 Result보다 길고 구체적일 때만 강점이 되며, 일부 문화권 면접관은 부정 신호로 받을 수 있으므로 '학습·후속 개선'이 핵심이 아닐 거면 쓰지 않는다. **커리어 공백·전직 경험을 묻는 질문은 '짧게 사실을 밝히고 현재 준비 상태로 전환'하는 간략한 안심 확인으로 처리하라 — 길게 해명하거나 사과조로 이어가면 오히려 레드플래그 신호로 읽힌다(한국 면접 맥락).** _(출처: CareerMate AGENTS.md, Amazon probing follow-ups, UVA)_
- **(키워드 스터핑을 경계한다.)** — 회사 가치에 '단어 수준으로 맞추라'는 조언은 과하면 '준비된 앵무새'로 보인다. LP/가치 키워드는 실제 사례의 행동이 그 가치를 **입증**할 때만 쓰고, 키워드를 라벨처럼 나열하지 않는다. 구조화 면접은 adverse impact를 줄이고 법적 방어가능성을 높이는 공정성 도구라는 점도 기억한다. _(출처: U.S. OPM Structured Interviews)_
- **(STAR를 기본형으로 두되, 직무·면접 형식에 따라 변형을 선택한다 — soft 가이드, 게이트 아님.)** — (a) **SOAR**(Situation·Obstacle·Action·Result): Task를 Obstacle/Objective로 치환해 '배정받은 과제'를 '극복한 장애·달성한 목표'로 바꾸는 변형 — 문제해결·전략성을 변별하는 시니어/리더십 직무에 적합. (b) **CAR**(Challenge·Action·Result): Situation+Task를 Challenge로 압축한 3요소 버전 — 폰스크린·시간 제약·빠른 기술 라운드처럼 30~90초 답변이 필요할 때 적합. (c) **PAR**(Problem·Action·Result): CAR와 거의 동형의 문제 중심 압축형. **어느 변형을 쓰든 채점 축은 불변이다 — Action을 1인칭 결정 동사로(R3·R4), Result를 label·sourceRef 붙은 실측 수치로(R5·R6), probing 3종을(R8) 그대로 유지한다. 변형은 '요소 라벨'만 바꿀 뿐이며, 변형을 핑계로 Result·probing을 빠뜨리지 않는다.** _(출처: The Interview Guys, Resumeble, UT Austin — 코칭 휴리스틱, 4절 참조)_
- **(한국 구두면접 실전 압축형: S→A→R(+배움).)** — 헤드헌터·플랫폼 실무 콘텐츠는 흔히 Task를 Situation에 흡수해 S→A→R로 운영하며, 특히 갈등·실패 질문에서는 '결과 및 배움(R)'에 무게를 둔다(전문성+성숙함을 동시에 보임). **한국 면접관이 보는 3축('감정적이 아니라 객관적으로 대응했는가 / 회피가 아니라 협업으로 풀었는가 / 개인 입장이 아니라 팀 목표를 우선했는가')에 Action이 닿도록 구성한다.** 단 이는 평가 휴리스틱이지 합격 공식이 아니므로 soft 가이드로만 적용하고, 후보의 실제 경험·수치는 저장 데이터에 앵커한다. _(출처: 커리어플랜 헤드헌팅, 인크루트 — 한국 면접, 2차)_
- **(한국 사기업은 1차 실무면접 / 2차 임원면접으로 단계마다 타깃이 다르다.)** — 일반적 흐름은 서류 → 1차 실무면접 → 2차 임원(최종)면접이다. **1차 실무면접**(면접관=현업 실무진): 이력서·포트폴리오 기반으로 직무역량·성과의 진위를 비교적 정량적으로 검증한다 — 담당 업무·가장 도전적이었던 프로젝트·기술 트레이드오프를 STAR로 묻고, 개발 직군은 본인 GitHub/블로그/포트폴리오를 면접관이 직접 짚어 질문하므로 모르면 신뢰를 잃는다. **2차 임원/대표 면접**(면접관=임원+인사): 1차에서 실무를 봤으므로 인성·조직적합성(컬처핏)을 소프트스킬 관점에서 종합 평가한다 — 평가 초점이 '말 잘하는 사람'이 아니라 '신뢰를 줄 수 있는 사람'으로 전환되며, 직업관·가치관·5년 후 모습·갈등 대처·회사 이해도를 본다. 임원 빈출 Best: 'OO기업에 관해 아는 것?'(경영전략·사업 이해), '우리 회사를 선택한 이유?'(비전·문화 이해), 자기평가, '입사 후 어떤 일을 하고 싶나'(구체 커리어 비전). **따라서 같은 경험이라도 1차는 '무엇을 어떻게 해냈나(역량·정량 임팩트)', 2차는 '왜 그렇게 판단했나·우리와 맞나(가치·핏)'를 강조하도록 스토리 뱅크에 단계 태그(round1=실무 / round2=임원)를 단다. 1차의 우수 평가가 2차에 긍정적으로 이월되는 경향이 있으므로 1차에서 정량 임팩트를 확실히 남긴다.** _(출처: 잡코리아 2026 면접 50선; 인크루트 임원 Best10; 리멤버·코멘토 현직자 일화 — 한국 면접, 2차/참고)_
- **(경력직·중고신입의 '이직 사유'는 표준 패턴으로 처리한다.)** — 한국 경력직 면접에서 이직 사유는 면접관이 '지원자가 일·회사를 보는 태도'를 즉시 읽는 1순위 질문이며, 인사담당자는 ① 사유의 **합리성**, ② 지원 동기·커리어 서사와의 **일관성**, ③ **전 직장에 대한 부정적 언급 여부**를 평가축으로 본다. 따라서 (a) 전 직장·상사·동료 비난/남 탓 금지('상사와 갈등 때문에' 식 답변은 '여기서도 같은 불만으로 나갈 사람' 우려를 부른다), (b) 현 직장에서 쌓은 경험을 먼저 인정한 뒤 '전문성 심화·새 영역으로 커리어 확장'이라는 성장 목표로 전환하고 지원 회사의 구체 프로젝트/방향과 연결, (c) 부정적 사유라도 '그래서 무엇을 배웠고 다음 직장에서 무엇을 하려는가'라는 미래지향으로 프레이밍한다 — 이는 워크드 예시 3·4번(실패 사례)의 '재발방지·학습이 핵심' 원리와 동일하다. 희망 연봉은 시장 데이터 기반으로 답하되 처우 외 가치(역량 발휘·성장)에 유연성을 함께 표한다. 모든 사유는 후보의 실제 이력에 앵커하고 미화·날조하지 않는다. _(출처: Robert Walters Korea, 하이잡 HAIJOB; 잡플래닛 일화 — 한국 면접, 2차/참고)_
- **(한국 공공·NCS 타깃이면 경험면접과 상황면접을 분리 준비한다.)** — 한국 공기업·공공기관 채용은 NCS(국가직무능력표준) 기반 구조화 면접으로, ① **경험면접**(직업기초능력 평가 — 실제 과거 경험을 STAR로 듣고 채점)과 ② **상황면접**(직무수행능력 평가 — 직무에서 벌어질 수 있는 가상 상황을 제시하고 대응 행동을 묻는 situational interview 계열)으로 나뉜다. 따라서 NCS 타깃이면 스토리 뱅크의 '과거 사례'뿐 아니라 '상황 제시형 대응'도 별도로 준비하며, 이는 Don't의 '미래 가정형으로만 답하기 금지'와 충돌하지 않는다 — **상황면접은 가정형 질문이 정식 포맷이므로 질문 유형으로 분기한다.** NCS 면접관의 꼬리질문은 '사실 검증'과 '역량 검증'의 이중 목적을 가지므로, probing 3종 준비(R8)는 NCS 맥락에서 더욱 필수다. _(출처: NCS 국가직무능력표준 공식 면접문항 라이브러리(1차), JobKorea NCS 가이드(2차) — 한국 공공 트랙)_
- **(probing 3종은 면접관이 실제 던지는 후속질문 유형에 양방향으로 앵커한다.)** — 스토리 뱅크 probing 3종('왜 그 결정을 했나 / 대안은 무엇이었나 / 되돌아보면 무엇을 바꾸겠나')이 R8 핵심 게이트인 이유는 지원자 코칭이 아니라 **면접관 측 표준 probe**에서 나온다: 'What specifically did you do?'(개인 기여 분리), 'What was the measurable result?'(정량 결과), 'Why did you...?'(원인·판단 검증), 'What would you do differently today?'(자기인식·캘리브레이션). 이 probe들이 '리허설된 답'과 '실제 경험'을 갈라낸다는 것이 면접 설계 측 합의다. 본 문서의 probing 3종은 정확히 이 분류(why=원인검증, alternatives=의사결정 검증, whatIdChange=자기인식)에 대응하므로 R8을 '존재 게이트'로 강제하는 것이 면접관 기법에 비추어 정당하다. _(출처: SocialTalent, Yardstick — 면접관 기법, 2차)_
- **(스타트업·IT 컬처핏 면접은 대기업식 인성면접과 구조가 다르다.)** — 토스·당근·우아한형제들 등은 대화형으로 가치관·일하는 방식·협업 성향이 조직과 맞는지를 본다(우아한형제들은 120문항 WSP 같은 도구를 면접 대화 보조로 활용). 빈출 행동질문: '가장 어려웠던 협업 경험은?', '의견 충돌 시 어떻게 대처했나?', '가장 큰 실패 경험과 거기서 배운 것?', '동료·상사에게 받은 피드백 중 기억에 남는 것과 개선 방법?'. 평가 포인트=회사에 대한 관심·애정, 소통/유연성(경청·조율·공동목표), 성장 의지, 건설적 갈등해결, 피드백 수용, 장기 기여 의지. **정량 채점이 어려운 만큼 '키워드 맞추기'보다 실제 행동으로 가치를 입증하고, 회사 가치/일하는 방식을 사전 조사해 본인 사례와 연결한다(기존 companyValueTags 가드·키워드 스터핑 경계와 결합).** 인재상 트랙(대기업식 인성·암기형)과 컬처핏 트랙(스타트업식 협업·행동 증거)을 구분해 준비하되, 협업/갈등 경험은 저장 데이터에 있는 것만 사용한다. _(출처: 조선비즈, 한국경제, Specter HR, 원티드 블로그, flex — 한국 면접, 2차)_
- **(압박면접은 정답보다 평정심·객관성·균형을 본다.)** — 약점 파고들기·개인 vs 조직·희망부서 미배치·나이/스펙 약점 등은 대응력 테스트다. 빈출 실제 문구·평가의도: ① '다른 회사에도 지원했나요? 합격하면?'(지원 우선순위·진정성 — 솔직하되 1순위 근거 제시) ② '지원자의 역량은 우리 회사에 필요 없을 것 같은데요?'(자신감·방어성 — 감정 없이 강점-직무 연결을 논리적으로) ③ '그건 틀린 생각 아닌가요?'(근거 없이 물러서는지·비판 수용 — 방어 회피, 근거+상대 존중 동시) ④ '상사가 부당한 지시를 내린다면?'(윤리·판단 — 맹종 아닌 상급자 확인, 사실확인→대응→조직절차 순). **공통 화법=평정심 유지, 'Yes...But'으로 조목조목, 감정반응·말 끊기 금지. 약점은 치명적이지 않은 것으로 인정+개선노력.** _(출처: 잡코리아 압박면접 5가지; 하이잡; Superookie 일화 — 한국 면접, 2차/참고)_
- **(역질문(마지막 질문)은 사실상 필수 기대값이다 — 처우가 아니라 직무·전략·조직을 묻는다.)** — **좋은 역질문**(관심·적극성·직무이해 신호): '이 직무를 통해 회사의 어떤 목표 달성에 기여할 수 있을까요?', '이 팀에서 필요로 하는 핵심 역량은?', '입사 후 첫 3~6개월 성공 기준/온보딩은?', 업무 관련 회사 최신 이슈의 방향성. **피해야 할 역질문**(레드플래그): 복리후생/연차/야근만 묻기(개인 이득만 추구 인상 — 처우는 합격 후 조율), 체계를 의심하는 질문('이 업무가 정말 필요한가요?'), 즉답 피드백/합격여부 요구('제가 적합한가요?'), 사전준비 부족 신호('뭐 하는 회사예요?'). 스토리 뱅크에 직무·전략·조직 관련 역질문 1~2개를 준비시킨다. _(출처: 인크루트 마지막 질문 좋은/나쁜 예; 링커리어 — 한국 면접, 2차)_

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
- **(한국 사기업)** 표준 인성·경험 질문 풀을 카테고리별로 스토리 뱅크에 사전 매핑하라 — [공통 빈출] 1분 자기소개 / 지원동기(회사·직무 분리) / 강점·약점 / 살면서 가장 힘들었던 경험과 극복 / 갈등 경험(동료·상사 의견 차이) / 실패 경험과 배운 점 / 협업·팀워크 / 스트레스 해소법 / 입사 후 5년 모습 / 회사 기여점·차별점 / 마지막 할 말(역질문). 이 질문들은 **'예상 질문 풀·매핑 신호'일 뿐** 후보의 사실·경험은 절대 지어내지 말고 저장 데이터에서 끌어와라.
- **(직군별 변형, 해당 직군 지원 시에만 우선 노출)** 개발자: 기술 면접(버그·코딩 습관·트레이드오프)과 별개로 HR 면접에서 '기획자·디자이너와의 협업·소통'을 행동질문으로. 마케팅/영업: '좋아하는 브랜드/요즘 쓰는 서비스+왜', 좋아하는 캠페인·광고, 소비자 행동 예측, 4P 중 중요한 것, 성공/실패 캠페인, 제한 예산 마케팅, 경쟁사 분석법. 디자이너/PM/UX: '개발·기획과 의견이 가장 크게 달랐던 지점과 설득/양보 방식', '제약이 있을 때 가장 먼저 포기할 것', '디자인할 때 가장 중요한 가치', '이 선택의 근거와 대안'(꼬리질문 중심). 경영기획·인사·회계/재무·홍보·구매·생산/품질·R&D 등 비-기술 일반직군도 직군별 빈출 질문이 있으나 모두 '예상 질문 풀'로만 쓰고 도메인 개념은 '개념 설명/입사 후 제안'으로 분리하라(사실·경험 발명 금지).
- **(컬처핏 트랙)** 협업·갈등·피드백 행동 스토리를 본인 언어의 가치관과 함께 매핑하고, 회사 가치/일하는 방식을 사전 조사해 본인 사례와 연결하라(저장 데이터 앵커).
- **(압박·역질문)** 각 압박 질문에 '평가 의도 + 차분 대응 골격'을 1쌍으로 준비하고, 직무·전략·조직 관련 역질문 1~2개를 함께 준비하라('피할 질문'은 출력에서 경고로 표시).

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
- **(한국 경력직)** 이직 사유를 전 직장·상사 비난이나 남 탓으로 답하지 마라 — '여기서도 같은 불만으로 나갈 사람' 신호다.
- **(역질문)** 복리후생·연차·야근만 묻거나('개인 이득' 인상), 체계를 의심하거나('이 업무가 정말 필요한가요?'), 즉답 피드백·합격여부를 요구하거나('제가 적합한가요?'), 사전준비 부족 신호('뭐 하는 회사예요?')를 내지 마라.
- **(압박면접)** 압박 질문에 감정적으로 방어하거나 말을 끊거나 극단으로 회피하지 마라 — 평정심·논리·균형이 평가 대상이다.
- **(변형)** SOAR/CAR/PAR로 압축한다는 핑계로 Result(실측 수치)·probing 3종을 빠뜨리지 마라 — 변형은 라벨만 바꿀 뿐 채점 축은 불변이다.

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

4. **Before:** 질문: '분석이나 판단이 틀렸던 경험을 말해보세요.' 답변: "저는 항상 데이터를 꼼꼼히 보려고 노력하기 때문에 크게 틀린 경우는 없었던 것 같습니다. 한 번 예상과 다른 결과가 나온 적이 있었는데, 팀원들과 의견을 맞춰 잘 해결했습니다."
   **After:** `[역량: failure-learning, data-driven]` **S:** 작년 분기 프로모션 캠페인 설계 시, 저는 특정 사용자 세그먼트의 구매 전환율을 15% 이상으로 예측하고 예산의 40%를 해당 채널에 배정했습니다. **T:** 캠페인 2주차 중간 데이터를 검토하면서 실제 전환율이 6%에 머물고 있음을 확인했고, 제 초기 가정이 틀렸음을 인정해야 했습니다. **A:** 저는 즉시 원인 분석에 들어가 — 초기 샘플이 실제 세그먼트를 대표하지 못했다는 것(표본 편향)을 파악했습니다. 관련 팀에 중간 결과를 솔직하게 공유하고, 잔여 예산의 70%를 전환율이 검증된 다른 채널로 즉시 재배분하도록 제가 제안해 실행했습니다. 이후 저는 캠페인 예측 프로세스에 '사전 샘플 대표성 검증' 단계를 추가하는 SOP를 작성했습니다. **R:** 재배분 후 2주 전환율이 11%로 회복됐고(label: 후반 2주 구매 전환율, source: 캠페인 대시보드), SOP 도입 이후 다음 분기 두 캠페인에서 초기 예측 오차가 기존 대비 절반 이하로 줄었습니다(label: 예측 오차율, source: 분기 리뷰 보고서). **Probing 준비:** (어떻게 알아챘나) 2주차 중간 점검 지표에서 이탈 감지 — 이 체크포인트가 없었으면 캠페인 전체를 날렸을 것 / (무엇을 바꿨나) SOP에 사전 샘플 대표성 검증 단계 명문화 / (재발 방지) 이후 모든 캠페인에 동일 체크포인트·승인 게이트 적용.
   **왜 더 나은가:** Before는 실수를 회피하고 팀 뒤에 숨어 지적 정직성을 전혀 증명하지 못한다(자기 정당화·남 탓 패턴). After는 ① 틀렸음을 1인칭으로 명시("제 초기 가정이 틀렸음을 인정"), ② 어떻게 발견했는지(중간 점검), ③ 즉각 행동, ④ 재발방지(SOP)를 순서대로 채워 intellectual honesty·error-recovery·calibration 세 축을 모두 커버하며, probing 3종으로 후속 깊이 질문에 견딘다. 실패를 정당화하거나 외부 탓으로 돌리는 순간 지적 성숙도 점수가 0에 수렴한다.

5. **Before:** 질문: '요구사항이 불명확하거나 데이터가 지저분한 상황에서 어떻게 시작하나요?' 답변: "저는 일단 분석을 시작해보고 문제가 생기면 그때 확인하는 편입니다. 데이터가 불완전해도 우선 해볼 수 있는 것부터 코딩해보면서 방향을 잡습니다."
   **After:** `[역량: ambiguity, data-driven, collaboration]` **S:** 신사업 팀으로부터 "이탈 위험 사용자를 예측하는 모델을 2주 안에 만들어달라"는 요청을 받았는데, 이탈의 정의·대상 기간·사용 목적이 모두 명시되지 않은 상태였습니다. **T:** 불명확한 요구사항 아래에서 실제로 쓸 수 있는 결과물을 기한 내에 내는 것이 목표였습니다. **A:** 저는 코드를 열기 전에 먼저 세 가지 가정을 서면으로 정리했습니다 — ① 이탈 = 30일 미접속, ② 대상 = 최근 90일 활성 사용자, ③ 출력 = 상위 500명 리스트(CRM 액션용). 이 가정을 담은 1페이지 PRD 초안을 요청 다음 날 이해관계자와 30분 리뷰했고, ②를 '60일 활성'으로, ③을 '확률 스코어 전체'로 수정했습니다. 가정을 확정한 뒤에야 데이터 파이프라인·피처 엔지니어링에 들어갔고, 데이터 품질 문제(중복 이벤트 로그 약 18%)는 필터 로직과 근거를 문서에 명시해 재현 가능하게 처리했습니다. **R:** 1차 모델 Precision@500 = 0.71(label: Precision@500, source: 오프라인 검증셋), 요청팀은 해당 리스트 기반 리인게이지먼트 캠페인을 다음 분기 정식 운영으로 채택했습니다(label: 캠페인 채택 여부, source: 분기 OKR 보고서). **Probing 준비:** (가정이 틀렸으면) 리뷰 단계에서 수정 — 실제로 ②③이 바뀐 선례가 있음 / (데이터 품질 판단 기준) 18% 중복은 제거·문서화했고, 더 큰 편향이 있으면 모델 전에 데이터 파이프라인부터 고쳤을 것 / (우선순위 방법) 가정 검증 → 데이터 탐색 → 피처 → 모델 순서로 고정, 앞 단계 불확실성이 크면 다음 단계를 시작하지 않는다.
   **왜 더 나은가:** Before는 불명확한 상황에서 바로 코드·분석부터 들어가고(가정 불명시), 이해관계자 확인을 후순위로 미루는 전형적 약한 답변이다(ambiguity handling 0점). After는 ① 코드 전에 가정을 명시·서면화, ② 이해관계자와 조기 검증, ③ 데이터 품질 처리를 재현 가능하게 문서화해 stakeholder clarification·prioritization·ambiguity handling 세 역량을 모두 입증하며, probing 3종으로 '가정이 틀렸으면 어떻게 했을 것인가'라는 전형적 후속 질문까지 대비한다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **전제(중요):** 루브릭은 자유 텍스트가 아니라 **`StoryBankEntry` 구조화 레코드 배열**을 입력으로 받는 것을 *목표 설계*로 한다. S/T/A/R 경계는 자유 텍스트를 LLM이 의미로 갈라야 하므로, 이상적으로는 `save_interview_prep`으로 STAR를 **필드 분리 저장**하게 하면 다수 체크가 필드 non-empty / 패턴 카운트로 결정론적이 된다.
>
> **⚠ 구현 상태(Phase A 정직화):** **현재 `save_interview_prep`이 실제로 저장하는 것은 `star_guides`(STAR 4필드 situation/task/action/result, 선택 사항)뿐이다.** 아래 루브릭이 참조하는 구조화 필드 — `metrics[]`(label·sourceRef), `competencies[]`(고정 enum), `probing{}`, `lang`, `year`/`careerStage`, `questionMappings[]`, `wordCounts{}`, `companyValueTags[]` — 와 `lint_interview_kit`/`get_behavioral_interview_kit` 도구는 **모두 Phase B 미구현**이다. 따라서 R1~R13의 "LLM 없이 결정론적으로 셀 수 있음(D)" 표기는 *데이터가 그 형태로 저장될 때 성립하는 설계상 등급*이며, **Phase A 현재는 이 검증을 런타임이 자동 실행하지 않는다 — 연결된 AI가 위 항목들을 수동으로 적용한다.** 미구현 검증을 이미 자동화된 것처럼 표기하지 않는다.
>
> **등급 표기:** `D` = (구조화 저장이 전제될 때) LLM 없이 결정론적으로 셀 수 있음(필드 존재·정규식·카운트). `H` = 외부 AI(또는 사람)의 의미 판단을 전제로 한 보조 휴리스틱 — 자동 합격 판정 금지, `warn`/`needs_review`로만 반환. 이 구분을 흐려 전부 기계 검증인 척하지 않는다. **Phase A에서는 D/H 모두 연결 AI의 수동 적용이며, 런타임 게이트가 아니다.**

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
| R14 BI-CULTUREFIT-VALUE | **warn (H)** | (컬처핏/임원 타깃) 회사 가치 연결이 행동으로 입증되는가 | `companyValueTags[]` ≥1 **존재** AND 각 태그가 실제 사례 행동에 연결 | 존재는 셀 수 있으나 '키워드 맞추기 vs 행동 입증' 판별은 의미 판단(H). 자동 합격 금지, `warn`만. 키워드 스터핑 경계·companyValueTags 가드와 결합. |
| R15 BI-REVERSE-QUESTION | **warn (H)** | (한국 사기업) 역질문이 준비됐고 직무·전략형인가 | `reverseQuestions[]` ≥1 AND 처우·로지스틱스 위주가 아닌 직무/전략/조직 질문 | 존재는 D지만 '좋은 역질문 vs 레드플래그(복리후생·즉답 피드백·사전준비 부족)' 판별은 H. 자동 합격 금지, `warn`만. |

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
- **Sackett, Zhang, Berry & Lievens (2022)** — range-restriction 보정 재분석. 구조화 면접 operational validity 평균 **~.42(80% credibility interval 약 .18~.66, 따라서 SD ≈ ±.24)**, GMA/인지능력 **~.31**로 하향, 신뢰구간 보고 관행. **본 문서의 헤드라인 수치는 이 보정치를 따른다.** 동급 예측도구도 함께 명기: **job knowledge tests ~.40, empirically keyed biodata ~.38, work sample tests ~.33**. 즉 '구조화 면접 단독이 최강'이 아니라 '구조화 면접·직무지식·바이오데이터·워크샘플이 .33~.42 밴드에서 함께 상위권'이며, 이것이 '절대값은 신뢰구간으로 보고하고 유지되는 건 순서뿐'이라는 본 주석의 입장을 수치로 뒷받침한다. 저널=Journal of Applied Psychology(2022), DOI=10.1037/apl0000994, 제목='Revisiting Meta-Analytic Estimates of Validity in Personnel Selection: Addressing Systematic Overcorrection for Restriction of Range' · 1차 서지(PubMed): https://pubmed.ncbi.nlm.nih.gov/34968080/
  - _보강 출처(2차, 수치 정리·교차확인):_ SIOP — Is Cognitive Ability the Best Predictor of Job Performance?(구조화 .42 / GMA .31 / job knowledge .40 / biodata .38 / work sample .33) · https://www.siop.org/tip-article/is-cognitive-ability-the-best-predictor-of-job-performance-new-research-says-its-time-to-think-again/ · Master-HR — Insights from Sackett et al.(구조화 .42, 80% CI .18~.66, SD ≈ ±.24) · https://www.master-hr.com/insights/insights-from-sackett-et-al-2023/
- **U.S. OPM — Structured Interviews** — 행동 일관성 원리, 구조화의 핵심 동인(표준화·동일 질문·앵커드 채점표 BARS), 직무관련 역량 차원 채점, adverse impact 감소·법적 방어가능성 · https://www.opm.gov/policy-data-oversight/assessment-and-selection/other-assessment-methods/structured-interviews/
- **Amazon Leadership Principles / STAR 면접 가이드** — Situation 압축·Result 정량화·Action 시간 집중, 인터뷰어가 가치 2~3개씩 배정 채점, probing follow-up(깊이 질문). **단, 한국 지원자 다수의 실제 타깃(국내 대기업 인성면접·스타트업 컬처핏)과는 거리가 있어 '대표 예시'가 아닌 '한 사례'로만 사용** · https://www.amazon.jobs/en/landing_pages/in-person-interview
- **Northwestern Career Advancement — STAR Approach** — STAR 4요소 정의, 직무기술서 기반 사례 선택 · STAR 분량 비율은 **휴리스틱**으로만 인용 · https://www.northwestern.edu/careers/jobs-internships/interviewing/the-star-approach.html _(학부 코칭 콘텐츠)_
- **UVA Career Center — STAR Method** — 'we 대신 I', Result 강조(학생 자주 누락), 부정적 결과를 회복탄력성으로 전환 · https://career.virginia.edu/Students/Launch/Interviews/STAR _(학부 코칭 콘텐츠)_
- **Bauer College (University of Houston) — STAR Behavioral Interview Technique** — 1인칭 개인 기여 강조, STAR 실무 적용 · https://careercenter.bauer.uh.edu/resources/star-behavioral-interview-technique/ _(학부 코칭 콘텐츠)_
- **AGENTS.md (CareerMate 프라임 디렉티브)** — 사실·수치·고유명사 보존, 과장·날조 금지 · 저장소 내부

**행동면접의 학술 근원 (1차):**
- **McClelland, D.C. (1998) "Identifying Competencies with Behavioral-Event Interviews", Psychological Science 9(5)** — BEI의 핵심: 특성·가정형이 아니라 구체적 과거 사건의 행동 코딩으로 우수자/평균자 변별, blind 상태에서도 경영성과 예측·길이/전년성과 무편향. 본 문서 Don't(미래 가정형·형용사 나열 금지)·probing 진위검증의 1차 학술 근거. DOI 10.1111/1467-9280.00065 · https://journals.sagepub.com/doi/10.1111/1467-9280.00065
- **[참고] Wikipedia — Critical Incident Technique (Flanagan 1954, BEI의 모태)** — 행동면접 계보의 출발점(일반 참고 자료) · https://en.wikipedia.org/wiki/Critical_incident_technique

**STAR 변형 프레임워크 (2차, 코칭 휴리스틱):**
- **The Interview Guys — STAR Method vs SOAR Method** — SOAR=Obstacle 치환, 시니어 문제해결에 적합 · https://blog.theinterviewguys.com/star-method-vs-soar-method/
- **Resumeble — Behavioral Interview Techniques: SHARE, CAR, SOAR & PAR vs STAR** — 변형 정의 비교 · https://www.resumeble.com/career-advice/behavioral-interview-techniques
- **University of Texas at Austin 'It's Your Career' — CAR Storytelling Method** — CAR=시간제약용 압축(8~12개 사례, 45~90초) · https://itsyourcareer.blog/ace-your-next-job-interview-with-the-car-storytelling-method/

**면접관 측 probing 기법 (2차):**
- **SocialTalent — How to Ask Better Behavioral Interview Questions** — probe로 리허설 답 vs 실제 경험 변별 · https://www.socialtalent.com/blog/interviewing/the-worst-behavioral-interview-questions-and-how-to-fix-them
- **Yardstick — Behavioral Interview Questions for Follow-Through** — why / what would you do differently 후속질문 · https://www.yardstick.team/interview-questions/follow-through

**한국 공공·NCS 트랙 (1차/2차):**
- **NCS 국가직무능력표준 — 공정채용 면접문항 예시 라이브러리 (1차)** — 경험면접(직업기초능력) vs 상황면접(직무수행능력) 공식 문항 · https://www.ncs.go.kr/blind/blp/bbs_lib_list.do?libDstinCd=56
- **JobKorea — NCS 면접, STAR 구조를 기억하라 (2차)** — 경험/상황면접 구분, 꼬리질문=사실+역량 이중 검증 · https://www.jobkorea.co.kr/goodjob/tip/view?News_No=13224

**한국 사기업 실전 트랙 (2차 — 평판 매체/플랫폼 공식 콘텐츠; 한국 면접에만 적용):**
- **잡코리아 — 2026 면접 50가지 질문 총정리** — 공통 빈출 + 1차 실무/2차 임원 구분 · https://www.jobkorea.co.kr/goodjob/tip/view?News_No=11119
- **인크루트 — 임원면접 질문 Best 10** — 임원 빈출 실제 문구·평가의도(회사이해·전략·역질문 기대) · https://news.incruit.com/news/newsview.asp?newsno=435266
- **커리어플랜(헤드헌팅) — 상사 갈등 면접질문, S→A→R(결과 및 배움) 프레임·평가 3축** · https://www.careerplan.be/28/?bmode=view&idx=168262204
- **인크루트 — 갈등 해결 경험 합격률 올리는 답변(STAR 적용)** · https://news.incruit.com/news/newsview.asp?newsno=436510
- **인크루트 — 면접 마지막 질문 좋은 예 vs 나쁜 예** — 좋은/나쁜 역질문 문구·사유 · https://news.incruit.com/news/newsview.asp?newsno=436499
- **링커리어 커뮤니티 — 면접 마지막 질문으로 임팩트 주는 법** — 추천 역질문 교차확인 · https://community.linkareer.com/employment_data/4858253
- **Robert Walters Korea — 이직 면접 예상 질문·이직 사유 답변 전략** — 비난 금지→성장 프레이밍(글로벌 헤드헌터) · https://www.robertwalters.co.kr/insights/career-advice/blog/tips-job-change-interview.html
- **HAIJOB — 경력직 면접 질문 TOP 10 & 모범답변** — 이직사유=불만 아닌 성장 · https://www.haijob.co.kr/blog/interview-questions-for-experienced-workers-top-10-best-answer-example-summary/
- **잡코리아 — 압박면접 현명하게 대처하는 방법 5가지** · https://www.jobkorea.co.kr/goodjob/tip/view?News_No=13378
- **하이잡 — 압박면접 질문 예시 5가지와 답변 전략·대처법** — 5개 압박 질문 문구·평가의도 · https://www.haijob.co.kr/blog/stress-interview-questions-answers-tips/
- **원티드 블로그 — 그럼에도 컬처핏 면접이 꼭 필요한 이유** — 4개 행동질문·평가 3축 · https://blog.wantedlab.com/hr/trend/culture-fit-interview
- **flex 공식 블로그 — 컬처핏 면접: 어떻게 평가해야 적합한 인재를 만날까** · https://flex.team/blog/2025/04/02/culture-fit-interview-prapare/
- **Specter(HR) — 컬처핏 면접 필수 질문 4가지** — 평가 의도: 성향·일하는 방식·팀워크·성장 · https://www.specter.co.kr/blog/%EC%9D%B8%EC%84%B1%EB%A9%B4%EC%A0%91-%EC%BB%AC%EC%B2%98%ED%95%8F%EB%A9%B4%EC%A0%91-%EC%A7%80%EC%9B%90%EC%9E%90%EC%97%90%EA%B2%8C-%EB%AC%BC%EC%96%B4%EB%B4%90%EC%95%BC-%ED%95%A0-%ED%95%84%EC%88%98-%EC%A7%88%EB%AC%B8-4%EA%B0%80%EC%A7%80
- **조선비즈(via Daum) — 토스·당근도 하는 컬처핏 면접, 우아한형제들 WSP 120문항** · https://v.daum.net/v/20250219060115271
- **한국경제 — 대기업 채용 컬처핏 평가(인적성 64%·실무 56.8%·임원 41.5%)** · https://www.hankyung.com/article/202503166308i
- **사람인 HR — 인성면접 빈출 질문(갈등·실패·협업) 콘텐츠 허브** · https://www.saramin.co.kr/zf_user/interview-review
- **CIO Korea — 개발자 면접 단골 질문 13개(기술 면접 vs HR 협업 면접 구분)** · https://www.cio.com/article/3503434/%EA%B0%9C%EB%B0%9C%EC%9E%90-%EB%A9%B4%EC%A0%91-%EC%8B%9C-%EB%8B%A8%EA%B3%A8-%EC%A7%88%EB%AC%B8-13%EA%B0%9C-%EA%B7%B8%EB%A6%AC%EA%B3%A0-%EB%AA%A8%EB%B2%94%EB%8B%B5%EC%95%88.html

**한국 사기업 실전 트랙 (참고 — 일화·자기보고·미검증; 단일 일화 단정 금지, 복수 후기 공통 패턴만):**
- **[참고] 리멤버 커뮤니티 — 2차(임원)면접과 1차면접의 차이** — 현직자 자기보고 일화 · https://community.rememberapp.co.kr/post/64578
- **[참고] 코멘토 — 2차 임원면접에 1차 실무평가가 영향 미치나요** — 현직자 Q&A 일화 · https://comento.kr/job-questions/%EB%AA%A8%EB%93%A0%ED%9A%8C%EC%82%AC/%EB%AA%A8%EB%93%A0%EC%A7%81%EB%AC%B4/2%EC%B0%A8_%EC%9E%84%EC%9B%90%EB%A9%B4%EC%A0%91%EC%97%90%EC%84%9C_1%EC%B0%A8_%EC%8B%A4%EB%AC%B4_%ED%8F%89%EA%B0%80%EA%B0%80_%EC%98%81%ED%96%A5_%EB%AF%B8%EC%B9%98%EB%82%98%EC%9A%94-443275
- **[참고] 잡플래닛(컴퍼니타임스) — 경력직 이직 사유 답변 예시** — 평가축(합리성·일관성·전 직장 비난 회피); 본문 403, 검색 스니펫만 확인(일화) · https://www.jobplanet.co.kr/contents/news-7126
- **[참고] Brunch(@cliche-cliche) — UX 면접 35개 꼬리질문** — 디자이너 자기보고 일화 · https://brunch.co.kr/@cliche-cliche/309
- **[참고] Brunch(@jenjenny) — 프로덕트 디자이너 컬처핏 면접 실제 질문** — 자기보고 일화 · https://brunch.co.kr/@jenjenny/7
- **[참고] Superookie — 탈압박 면접 비법과 주요 질문 대응법** — 자기보고 일화(압박 질문 패턴 교차) · https://www.superookie.com/contents/5e1beae88b129f585b497cb9

## 5. Phase B 힌트 (아키텍처로 연결)

> **현재(Phase A) 구현 경계:** 지금 런타임에 존재하는 면접 저장은 `save_interview_prep`이며, 실제 영속화 필드는 **`star_guides`(STAR 4필드, 선택)뿐**이다. 아래 도구·필드(`metrics[]`·`competencies[]`·`probing{}`·`lang`·`year`·`questionMappings`·`get_behavioral_interview_kit`·`lint_interview_kit`)는 **모두 Phase B 설계안**으로, 현재는 연결된 AI가 본 루브릭을 수동으로 적용한다(런타임 자동 검증 아님).

- **MCP 도구 아이디어(Phase B):**
  - `get_behavioral_interview_kit({ job_id?, competency?, count? })` *(미구현)* — `get_application_context`의 프로필·경력·스킬·대상 공고를 받아 (1) 저장된 스토리 뱅크에서 요청 역량/회사가치에 매핑되는 STAR 사례를 서빙, (2) 비어 있는 역량 카테고리·probing 누락·노후 사례를 `gap`으로 알려주고, (3) 본 루브릭(R1~R13, 등급 D/H 표기)을 함께 반환해 외부 AI가 자가검증하게 한다. read-only 지식 도구.
  - `save_interview_prep({ job_id, stories[] })` — **(Phase A 현재)** STAR 4필드를 `star_guides`로 선택 저장한다. **(Phase B 목표)** STAR를 **필드 분리(situation/task/action/result)** 로 강제 저장(자유 텍스트 금지 → S/T/A/R 경계 문제 해소, 루브릭 결정성 확보)하고, `metrics[]`에 label·sourceRef를 강제해 R6/R13 가드를 데이터 구조 차원에서 건다 — 이 강제·확장 필드는 아직 미구현이다.
  - `lint_interview_kit(job_id?)` *(미구현)* — R1~R13을 등급별로 실행. **D 항목은 pass/fail, H 항목(R3 적합·R7 적합·R13)은 `warn`/`needs_review`만 반환**(자동 합격 금지). `lang` 필드로 R4·R9 분기. 8단계 게이팅상 **면접 준비는 `document_passed` 이상에서만 해금.**
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
