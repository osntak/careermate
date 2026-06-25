# 자기소개서 / Cover Letter — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

자기소개서/커버레터는 이력서를 산문으로 다시 쓴 글이 아니라, **특정 회사·직무를 겨냥한 설득 문서**다. 검증된 뼈대는 hook → fit(왜 나, 증거) → why-this-company → close이며, 각 주장은 형용사가 아니라 행동+정량 결과(STAR-lite) 한 단락으로 증명한다. 가장 흔한 실패는 **회사명을 바꿔도 말이 되는 제너릭 편지**(빈 형용사, 회사 고유 근거 없음, 이력서 불릿 복붙)다. CareerMate는 LLM이 없으므로, 검증 루브릭을 **두 종류로 정직하게 분리**한다 — (A) 순수 정규식·카운트로 저장 전 자동 검사 가능한 항목, (B) 연결 AI의 의미 판단이 필요한 항목. 또한 한국 자소서(문항형·글자수·인재상)와 영문 커버레터(단일 레터·ATS)는 **로케일별로 다른 루브릭**을 적용한다.

## 2. 플레이북

### 원칙

- **구조를 hook → fit(증거) → why-this-company → close 4역할로 고정하되, locale='ko' 문항형 자소서는 문항당 별도 글로 다룬다.** 영문 단일 레터는 4역할이 각각 한 문단 이상 존재해야 한다. 한국 자소서는 보통 3~5개 문항('지원동기/성장과정/직무역량/입사후포부')이 각각 별개 글이고 글자수 제한도 다르므로, 4역할 단일 레터를 강제하지 말고 **문항별 두괄식(결론→증명→직무·인재상 연결)** 로 매핑한다. _(출처: Georgetown Cawley Career Center; Princeton Cover Letter Guide; 한국 대기업 공채 자소서 문항 관행)_
- **형용사로 자신을 묘사하지 말고, 그 형용사가 참임을 증명하는 구체적 사례로 대체하라.** '소통을 잘한다' 대신 '야간 피킹 라인을 3개월 주도해 오배송률 4.1%→1.2%'처럼 행동+전후 델타를 쓴다. 빈 형용사뿐 아니라 '~라고 생각합니다', '많은 것을 배웠습니다', '~을 통해 성장했습니다', '~에 기여하고 싶습니다' 같은 **증거 없는 자기서술 종결구문**도 슬롭이다. _(출처: LiveCareer/CareerAddict Cover Letter Mistakes; Linkareer 두괄식 작성법)_
- **각 핵심 주장은 STAR-lite로 증명하되, 한 통/한 문항에 1~2개의 대표 경험만 깊게 다뤄라.** 결과(R)는 **'규모'가 아니라 '본인 행동으로 인한 변화량'** 이다. '100억 규모 프로젝트 담당'은 임팩트가 아니다 — '전환율 60→210(+250%)'이 임팩트다. S/T 압축은 글자수 빠듯한 문항의 기본값이되, 경험 서술형 문항은 평가자가 맥락을 요구하므로 **문항 유형에 따라 S/T 분량을 조절**한다. _(출처: Harvard FAS Mignone Center; 매거진한경 KKK-STAR)_
- **이력서를 줄단위로 반복하지 마라.** 커버레터는 이력서가 못 담는 '왜·어떻게·맥락'을 더한다. 다만 한국어는 교착어라 표면형이 달라도 의미가 같을 수 있으니, 중복 판정은 단순 n-gram이 아니라 의미 기준으로 본다. _(출처: 4 Corner Resources; LiveCareer)_
- **'왜 이 회사인가'를 회사 고유 근거(미션·제품·최근 활동·인재상/핵심가치)로 1~3문장 명시하라.** 회사명을 placeholder로 바꿔도 말이 되는 문장은 실패다. _(출처: University of Maryland Cover Letter Resources; Catch 합격 자소서)_
- **본문의 모든 수치·고유명사는 저장된 사용자 데이터(get_resumes·경력·프로젝트)에 출처가 있어야 한다.** 정량화를 강조하되 **없는 수치를 발명하도록 압박하지 마라** — 면접에서 즉시 무너진다. 근거가 없으면 약한 주장을 빼되 숫자를 지어내지 않는다. _(출처: CareerMate AGENTS.md 사실 보존 원칙; get_writing_style_guide)_
- **공고 핵심 요구사항을 본인 증거와 1:1 매핑하되 키워드 스터핑을 피하라.** 단, `get_application_context`의 `job.requirements`/`job.keywords`는 **선택적 자유텍스트 배열**이라 '상위 N개 랭킹'이 보장되지 않는다. 비어 있으면 이 매핑 체크는 **skip(N/A)** 처리한다. _(출처: Yale HR/Career Development; Scale.jobs Keyword Mistakes)_
- **분량/글자수는 로케일별로 다르다.** 영문 학생 커버레터는 3/4~1페이지(≈250~400단어). 한국 자소서는 문항당 500~1000자가 흔하고 **상한뿐 아니라 하한**(예: 최소 500자)도 평가에 들어가며, 글자수 기준이 **공백 포함/제외/byte** 로 공고마다 갈린다(가장 흔한 실격 사유). _(출처: University of Cincinnati Guide; 한국 자소서 글자수 관행)_
- **수신자 실명·직무명 지정은 로케일 의존이다.** 영문/외국계 다이렉트 지원은 'To whom it may concern' 대신 채용담당자 실명을 쓴다. 한국 공채/플랫폼은 시스템 폼 입력이라 수신자 특정이 불가능하므로 실명 지정을 강제하지 않는다. _(출처: Harvard via CNBC; 한국 공채 지원 폼 현실)_
- **블라인드 채용 가드레일을 지켜라.** 한국 NCS/공정채용 기조상 나이·성별·사진·가족관계·출신지 등 직무무관 개인정보는 자소서에 넣지 않는다. _(출처: NCS 블라인드 채용 가이드 기조)_
- **직무 유형·지원자 경로별로 기준을 차등하라.** 경력직(임팩트·리더십·P&L), 신입/인턴(잠재력·학습속도·전이가능 스킬), 기술직(설계 디테일) vs 영업/마케팅(정량 KPI)은 평가축이 다르다. 신입·경력단절·직무전환자는 정량 실적이 빈약하므로 **'숫자 ≥2'를 강요하지 말고** 프로젝트·학습 사례로 fit을 증명하게 한다. _(출처: Harvard 직무 직결 경험 권고; 채용 실무 차등)_

### Do

- 영문 도입 첫 문장에 (직무명 + 가장 관련 있는 경험 한 가지 + 회사에 대한 구체적 한 줄)을 넣어라. 한국 문항은 결론(직무 강점/지원동기)을 첫 문장에 두는 두괄식으로 시작하라.
- 각 강점 주장 뒤에 STAR-lite 한 단락(행동 → **전후 델타형 정량 결과**)을 붙여 증명하라.
- '왜 이 회사'를 회사 고유 사실(제품·미션·최근 뉴스·인재상)로 못박아라.
- 성과를 **전/후 비교(X→Y), 증감률(+N%), 금액·기간**으로 정량화하되, 그 수치가 저장된 이력서·경력 데이터에 근거가 있는지 확인하라.
- 약점·실패·갈등 문항은 정량 성과가 아니라 **성찰·개선 행동**으로 답하라(이 문항에 'quantified ≥2'를 강요하지 마라).
- 글자수 제한을 적용할 때 **count_mode(공백포함/공백제외/byte)** 를 먼저 확인하라.
- 클로징에 명확한 다음 단계(면접 요청/연락 가능 시점)를 한 문장으로 넣어라(로케일상 가능할 때).
- 저장 전 `validate_cover_letter`(현재 구현: 수치 출처·문체 신호 자동 검사 / 글자수 게이트·키워드 커버리지는 Phase B 미구현 — 연결 AI 수동)를 적용한 뒤 save_cover_letter_version으로 보관하라.
- 초안은 get_writing_style_guide의 문체를 적용해 사람이 쓴 듯 자연스럽게 다듬어라.

### Don't

- 'I am writing to apply for…' / 'I have always been passionate about' / 'As a recent graduate' / '저는 ~에 지원합니다' / '어릴 적부터', '~을 보며 자랐습니다', '저는 ~한 사람입니다', '평소 ~에 관심이 많아' 같은 상투적·성장기 도입으로 시작하지 마라.
- '성실한·책임감·열정·소통을 잘하는 / 꼼꼼한·끈기있는·헌신적인·주도적인 / hard-working·team player·detail-oriented·motivated·proactive·dedicated·diligent·people person' 같은 **증거 없는 평가형 형용사**나 그 동의어로 자신을 묘사하지 마라.
- '~라고 생각합니다', '많은 것을 배웠습니다', '~을 통해 성장했습니다', '귀사' 같은 증거 없는 자기서술 종결구문을 남발하지 마라.
- 이력서 불릿을 문장으로 바꿔 그대로 반복하지 마라.
- **다른 공고에 낸 자소서를 회사명·일부 토큰만 바꿔 재사용하지 마라(자기복제).** 사실·수치·보이스는 공고 간 일관되게 두되(억지 변형 금지), 직무 적합 앵글·도입·산문은 공고마다 새로 짠다. 자기복제는 C1 위반이고, 한국은 표절검사(무하유·Copy Killer)·AI 탐지에서 자기표절로 걸린다.
- 회사명을 바꿔도 말이 되는 제너릭 지원동기를 쓰지 마라.
- 한 통/한 문항에 5~6개 경험을 얕게 나열하지 마라(1~2개 깊게).
- '규모'(담당 규모·팀 인원·연도)를 '성과'로 위장하지 마라 — 본인 행동의 변화량이 결과다.
- 없는 성과·수치·고유명사를 지어내거나 과장하지 마라.
- 공고 키워드를 맥락 없이 나열(keyword stuffing)하지 마라.
- 나이·성별·사진·가족관계 등 직무무관 개인정보를 넣지 마라.
- 한 페이지(또는 지정 글자수 상한/하한)를 벗어나거나 빽빽한 텍스트 벽을 만들지 마라.
- MCP·job_id 같은 기술 용어를 편지 본문/사용자 설명에 노출하지 마라.

### 워크드 예시 (Before → After)

1. **Before:** 저는 책임감이 강하고 성실하며 팀워크가 뛰어난 지원자입니다. 어떤 일이든 열정을 가지고 최선을 다합니다. 귀사에 입사하여 열심히 일하고 싶습니다.
   **After:** [직무 강점] 물류 인턴 시절, 출고 지연이 잦던 야간 피킹 라인을 맡아 동선 재배치와 체크리스트 도입을 주도했고(행동) 3개월간 오배송률을 4.1%→1.2%로 줄였습니다(결과). 같은 '병목을 데이터로 찾아 표준화하는' 방식이 OOO의 풀필먼트 자동화 로드맵에 바로 기여할 수 있다고 봅니다.
   **왜 더 나은가:** 빈 형용사 3개를 STAR-lite 한 단락(행동+전후 델타 4.1→1.2%)으로 교체했고, 두괄식으로 결론을 앞세웠다. 마지막 문장이 회사 고유 맥락(풀필먼트 자동화)과 본인 강점을 연결해 '왜 나·왜 이 회사'를 동시에 충족한다. 회사명을 바꾸면 어색해진다 = 제너릭이 아니다.

2. **Before:** I am writing to apply for the Marketing Coordinator position. I am a hard-working, detail-oriented team player with a passion for marketing and excellent communication skills.
   **After:** When our student org's event registrations stalled at 60 signups, I rebuilt the email funnel and A/B-tested subject lines, lifting registrations to 210 (+250%) in three weeks. That same test-measure-iterate habit is what drew me to Acme's growth team, whose public "experiment weekly" culture matches how I already work.
   **왜 더 나은가:** 상투적 도입과 4개 빈 형용사를 제거하고, **전후 델타(60→210, +250%, 3주)** 가 있는 단일 STAR 사례로 'detail-oriented/communication' 주장을 증명한다. 마지막 절이 회사 고유 근거('experiment weekly' 문화)로 why-this-company를 못박는다.

3. **Before:** 저는 5개 프로젝트를 주도했고 매출 100억 규모 사업을 담당했습니다. 신규 고객을 발굴하고 보고서를 작성했습니다.
   **After:** [직무 강점] 저는 '이탈 직전 고객을 데이터로 식별해 되살리는' 영업입니다. OO기업에서 해지 예고 고객을 결제주기·CS티켓으로 스코어링하는 시트를 만들어 상위 위험군에 선제 제안을 돌렸고(행동) 분기 이탈률을 9%→5%로 낮춰 유지매출 약 1.3억을 방어했습니다(결과). 데이터로 리텐션을 설계하는 이 방식이 OOO의 구독 비즈니스 핵심과 직결된다고 봅니다.
   **왜 더 나은가:** Before는 '5개·100억'이라는 **규모 수치**일 뿐 본인 기여 결과가 0이고 이력서 재진술이다. After는 두괄식 + 이력서가 못 담는 '어떻게(스코어링 시트)' + **본인 행동의 변화량(9→5%, 1.3억)** 을 더하며 회사의 구독 비즈니스와 연결한다. 규모(scale)와 임팩트(impact)의 차이를 보여준다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

각 항목의 `measure.type`을 정직하게 표기한다 — **`regex`/`count`/`ratio`** 는 LLM 없이 lint로 자동 검사 가능, **`ai-judge`** 는 연결 AI의 의미 판단이 필요(정규식 불가). 현재 실재하는 정적 검사기는 `validate_cover_letter`(→lintArtifact)이며 **수치 출처(fabricated 차단) + 문체 신호**만 자동 채점한다 — 글자수 상·하한 게이트·키워드 커버리지 카운트는 **Phase B 미구현**이라 연결 AI가 수동(advisory) 적용한다. `ai-judge` 항목은 연결 AI에게 위임한다. (문서의 `lint_cover_letter`는 Phase B 도구 아이디어 명칭이다.)

| ID | 검사 항목 | 합격 기준 | 측정 방법(type · LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 구조 역할 존재 | 영문: 4역할 present / 한국 문항형: 각 문항 두괄식 + 문항-역량 매핑 present | `ai-judge` — 문단 역할 분류는 의미 판단이라 정규식 불가. 연결 AI가 역할 태그를 달고 누락 0 확인. **lint 자동검사 불가(위임)** |
| R2 | 제너릭 도입 차단 | 금지 도입 패턴 매치 0건 | `regex` — 첫 문장에 `/(i am writing to apply\|i have always been passionate\|as a recent graduate\|지원하게 되었습니다\|지원합니다\|어릴 적부터\|보며 자랐습니다\|저는 .{0,8}한 사람입니다\|평소 .{0,12}관심이 많아\|to whom it may concern)/i` 히트 = 0 |
| R3 | 빈 형용사·자기서술 슬롭 | 평가형 형용사/종결구문 사전 매치 0건; 매치 시 동일 문단에 정량 증거 동반 | `regex+ratio` — 사전(성실\|책임감\|열정\|소통을 잘\|꼼꼼\|끈기\|헌신적\|주도적인\|커뮤니케이션이 원활\|라고 생각합니다\|많은 것을 배웠\|통해 성장\|기여하고 싶\|team player\|hard-?working\|detail-?oriented\|motivated\|proactive\|dedicated\|diligent\|people person) 매치=0 권장. **사전은 불완전 — 동의어 우회 가능하므로 R8(형용사+증거 비율)과 함께 본다** |
| R4 | 정량 **성과**(규모 아님) | 전후 비교/델타 패턴 ≥1 | `regex` — `/\d[\d,\.]*\s?%?\s?(→|->|~|에서)\s?\d[\d,\.]*\s?%?|[+\-]\s?\d+\s?%|(감소|증가|줄였|늘렸|개선|달성)[^.]{0,20}\d/` 매치 ≥1. **연도(20\d\d~20\d\d)·문항번호·전화·날짜는 negative lookahead로 제외** — 단순 숫자 카운트 금지 |
| R5 | 수치 출처 검증 | 본문 수치 토큰이 저장된 이력서/경력 데이터에 존재 | `count` — 본문 숫자 토큰을 추출해 get_resumes·experiences·projects 텍스트에서 동일/근접 토큰 매칭. 미발견 수치 수 = 0 권장(허위 수치 탐지) |
| R6 | 회사 고유성 | 회사명/제품/미션 고유명사 ≥2회 + 비종속 검사 | `count`(부분 자동) + `ai-judge`(완전 판정) — 토큰 등장 횟수 ≥2는 카운트 가능. '회사명 placeholder 치환 시 어색해지는 문장 ≥1'은 **연결 AI 판정(위임)** |
| R7 | 이력서 비반복 | locale별 임계 이하 | `ratio` — 영문: 단어 5-gram 중복 ≤20%. **한국어: 어절 n-gram은 교착어 특성상 부정확 → 임계 신뢰 낮음, 의미 중복은 `ai-judge` 보조 필요(한계 명시)** |
| R8 | STAR 행동+성과 동반 | 행동동사 단락 중 결과 절 동반 ≥1, 단 '규모≠성과' | `regex`(약) + `ai-judge` — 행동동사+결과신호 동시출현은 카운트되나 '우연 동시출현·규모 수치'를 구분하려면 연결 AI가 'R이 본인 행동의 변화량인가' 판정 |
| R9 | 분량/글자수 | locale·count_mode별 상·하한 이내 | `count` — 영문 word_count ≤400. 한국: char_count가 지정 limit 이내 **그리고 하한 이상**. **count_mode(with_space\|no_space\|byte) 입력 필수**(미지정 시 fail-safe로 가장 빡빡한 기준 사용). **⚠ 현재 validate_cover_letter는 charCount 계산만 하고 max/min 게이트는 Phase B 미구현 — 글자수 상·하한 판정은 연결 AI 수동(advisory).** |
| R10 | 공고 요구 매핑 | 공고 키워드 ≥3개가 증거와 함께 등장 | `ai-judge`(+count는 설계) — '증거 동반' 판정은 의미 판단이라 위임. **⚠ 키워드 토큰 매치 카운트는 현재 validate_cover_letter에 미구현(Phase B) — 키워드 커버리지·증거 동반 모두 연결 AI 수동.** **`job.requirements`/`keywords`가 비면 skip(N/A)** — 데이터 부재 시 통과/실패 강제 금지 |
| R11 | 블라인드 가드레일 | 직무무관 개인정보 패턴 0건 | `regex` — `/(\d{2,3}\s?세|남자|여자|아버지|어머니|출신|본적|사진 첨부)/` 등 NCS 금지정보 매치 = 0(locale='ko') |
| R12 | 1인칭 과다 | '저는/I'로 시작하는 문장 비율 ≤40% | `ratio` — 문장 분리 후 시작 토큰이 (저는\|제가\|^I\b)인 비율 계산 ≤0.40 |

**점수·게이팅:** overallPass는 단순 AND가 아니라 **가중 게이팅**이다. **치명(반드시 통과)** = R2·R3·R4·R5·R6(제너릭·증거 없음·허위 수치는 즉시 탈락 사유). **중요** = R1·R8·R10·R11. **경미** = R7·R9·R12(분량 5% 초과 등은 감점만). 치명 항목 중 하나라도 fail이면 overallPass=false. score는 치명 60% + 중요 30% + 경미 10% 가중합. lint는 `regex/count/ratio` 항목만 자동 채점하고 `ai-judge` 항목은 'AI 위임' 상태로 반환한다.

**주요 실패 모드:**
1. **제너릭·교체 가능**(회사명 바꿔도 말이 됨) — R2·R6로 1차 차단, 비종속 판정은 AI 위임.
2. **증거 없는 자기서술**(빈 형용사·종결구문 슬롭, 동의어 우회) — R3 사전 + R8 비율로 이중 방어, 사전 불완전성 명시.
3. **규모를 성과로 위장**('100억 담당') — R4·R8이 전후 델타를 요구해 단순 숫자·규모를 거른다.
4. **허위 수치 발명**(정량화 압박의 부작용) — R5가 저장 데이터 교차검증.
5. **로케일 오적용**(영문 4역할·400단어 규범을 한국 문항형에 강제) — R1·R9가 locale 분기.
6. **신입/약점 문항을 일괄 fail** — R4를 약점 문항·신입 경로에서 면제.

## 4. 출처 (Provenance)

신뢰도 등급: **[1차] 대학 커리어센터·공식 기관 / [2차] 커리어 매체·전문 블로그 / [참고] 커뮤니티·기업 블로그(일화적, 인과 주장 약함)**.

- **[1차] Harvard FAS — Mignone Center for Career Success** — 직무 직결 1~2개 경험 집중, 특정 수신자 지정, 공고 핵심 요구 연결 · https://careerservices.fas.harvard.edu/resources/harvard-college-guide-to-resumes-cover-letters/
- **[1차] Georgetown Cawley Career Education Center** — 4문단 구조(훅/자격/회사적합/클로징)와 적합성 1~3문장 · https://careercenter.georgetown.edu/major-career-guides/resumes-cover-letters/cover-letters/
- **[1차] Princeton Center for Career Development (2019 PDF)** — 문단별 역할 분리, 구체적 사례 vs 일반 진술 · https://careerdevelopment.princeton.edu/sites/g/files/toruqf1041/files/documents/cover_letter_guide_2019.pdf
- **[1차] University of Cincinnati — Standout Cover Letter Guide (2024)** — 제너릭 도입 금지, 훅 구성, 영문 분량 3/4~1페이지 · https://www.uc.edu/news/articles/2024/11/standout-cover-letter-guide.html
- **[1차] University of Maryland — Cover Letter Resources** — 회사 미션·가치 리서치 후 본인 경험과 정렬 · https://careers.umd.edu/find-jobs-internships/resumes-cover-letters/cover-letter-resources
- **[1차] Yale Office of Career Strategy — Cover Letter Guidance** — 공고 정독, 채용담당자 니즈 대응, 전이 가능 스킬(공식 OCS 자료로 인용 권장; studocu 비공식본 대체) · https://ocs.yale.edu/
- **[1차/기조] NCS 국가직무능력표준 — 블라인드/공정채용 가이드** — 직무무관 개인정보(나이·성별·사진·가족) 배제 기조 (R11 근거) · https://www.ncs.go.kr/
- **[2차] LiveCareer / CareerAddict / 4 Corner Resources — Cover Letter Mistakes** — 빈 형용사·클리셰 금지, 정량화, 이력서 반복 금지, 분량 · https://www.livecareer.com/resources/cover-letters/basics/cover-letter-mistakes
- **[2차] Harvard career experts via CNBC** — 'To whom it may concern' 금지·실명 지정(영문 한정) · https://www.cnbc.com/2019/07/23/example-of-the-perfect-cover-letter-according-to-harvard-career-experts.html
- **[2차] Scale.jobs — Keyword Mistakes in Cover Letters** — 키워드 스터핑 역효과, 키워드는 증거 문장 안에 · https://scale.jobs/blog/common-mistakes-when-using-keywords-in-cover-letters
- **[참고] Linkareer 두괄식 / 매거진한경 KKK-STAR / 대웅 STAR** — 한국 자소서 두괄식·STAR·정량 지표(일반론으로 유효하나 '합격 패턴' 인과 주장은 일화적) · https://community.linkareer.com/employment_data/4896233
- **[데이터 사실] CareerMate 코드** — `get_application_context`의 `job.requirements`/`job.keywords`는 optional 자유텍스트 배열(랭킹 없음) · packages/shared/src/schemas.ts:282-283, packages/core/src/context.ts:32-60 (R10 skip 규칙 근거)

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_cover_letter_playbook(locale?, mode='draft'|'review', question_type?)` — 연결 AI에게 (1) locale별 구조 템플릿(영문 4역할 / ko 문항형), (2) doList/dontList, (3) 금지 형용사·종결구문·도입 사전(ko/en), (4) 루브릭을 머신체크 가능한 형태로 serve. `question_type`(지원동기/성장과정/약점·실패/협업 등)에 따라 약점 문항은 R4 면제 등 **문항별 루브릭 변형**을 반환.
  - `lint_cover_letter(text, job_id?, locale, count_mode?)` — 저장 없이 루브릭을 실제 카운트하는 **LLM-free 정적 검사기**. `regex/count/ratio` 항목만 자동 채점하고 `ai-judge` 항목은 'AI 위임' 상태로 표시. resume/job 컨텍스트는 서버가 get_resumes·get_application_context에서 조회(R5 수치 교차검증, R10 키워드 부재 시 N/A). 통과 후 기존 `save_cover_letter_version`에 저장.
- **데이터 형태 힌트:**
  ```
  playbook: {
    locale: 'ko'|'en',
    structure: [{ role|questionType, purpose, openingPatternBan:[regex], lengthBudget:{min,max,countMode}, example }],
    bannedAdjectives: { ko:[], en:[] },
    bannedClosers: { ko:[] },              // 종결구문 슬롭
    genericOpenerPatterns: [regex],
    blindGuardrails: [regex],              // R11
    rubric: [{ id, check, passBar, severity:'critical'|'major'|'minor',
               measure:{ type:'regex'|'count'|'ratio'|'ai-judge', pattern?, threshold?, llmFree:boolean } }]
  }
  lint 입력: { text, jobId?, locale, countMode:'with_space'|'no_space'|'byte' }
  lint 출력: {
    checks:[{ id, type, llmFree, value, passBar, pass:boolean|'delegated', hits:[{span,snippet}] }],
    score, overallPass, criticalFailures:[id], delegatedToAI:[id]   // ai-judge 항목
  }
  ```
  핵심: 모든 `regex/count/ratio` 측정은 숫자/존재/비율이라 LLM 없이 계산 가능하고, `ai-judge` 항목(R1·R6 비종속판정·R8·R10 증거동반)은 **'LLM-free'라고 광고하지 않고** 연결 AI에 명시적으로 위임한다 — summary의 'even a regex-level check can verify' 과장을 제거한 정직한 분리.
