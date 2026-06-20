# 적합도 매칭 / Fit & Matching — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI(Claude/GPT/Gemini)가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

채용공고(JD)와 후보자 증거(이력서·경력) 사이의 **적합도(fit)** 를 분석하는 지식·루브릭이다. 핵심 방법론은 (1) JD를 **must-have(필수)** vs **nice-to-have(우대)** 로 분해하고 복합 요건은 낱개로 쪼개며, (2) 각 요건을 후보자의 구체적 증거(불릿·수치·기간)에 1:1로 매핑하되 **인용은 원문 부분문자열(exact substring)** 로 강제하고, (3) 충족/부분충족/미충족(gap)을 정직하게 분류하며, (4) gap은 숨기지 말고 전이가능 증거·완화 전략으로 다룬다. CareerMate에는 LLM이 없으므로 루브릭은 **LLM 없이 셀 수 있는 형태**(요건 개수, evidence 배열의 비어있음 여부, quotedBullet이 입력의 substring인가, 분수/퍼센트 패턴 존재)로 설계했다. 적합도는 단일 점수가 아니라 **요건별 분해 + must-have 충족률(맥락 신호) + 결정적 갭(critical/hard-gate) 단독 게이트**로 제시한다.

## 2. 플레이북

### 원칙

- **(must/nice 명시 라벨링 + 복합 요건 분해)** JD의 모든 요건을 must-have('자격요건'·'minimum'·'required'·'X년 이상'·자격증)와 nice-to-have('우대'·'preferred'·'a plus'·'bonus')로 명시적으로 라벨링하고, 쉼표·'및'·'and'·'or'로 묶인 한 줄(예: 'Python·SQL·통계 지식')은 **개별 요건으로 분해**한 뒤 라벨링한다. nice-to-have 미충족은 탈락 사유가 아니다. _(출처: University Career Centers; NCS 직무수행능력/직업기초능력)_
- **(증거 1:1 매핑 + 원문 substring 인용 강제)** 각 요건에 후보자 이력서·경력의 **구체적 증거 1개 이상**을 출처 식별자(sourceType·sourceId)와 함께 매핑하고, `quotedBullet`/`quotedMetric`은 **입력 원문의 정확한 부분문자열**로 담는다(의역·요약 금지). 매핑 증거가 없으면 그 요건은 gap이며, 증거를 지어내지 마라. substring 강제는 CareerMate가 LLM 없이 환각·수치변형을 서버측에서 거를 수 있게 하는 핵심 장치다. _(출처: STAR 성과 불릿; AGENTS.md 프라임 디렉티브)_
- **(의미 매칭은 AI 추론, 표면 키워드는 별도 트랙)** JD 용어와 이력서 표현이 다르면('A/B 테스트'≈'실험 설계') 동의어·상위어로 연결하되, 이 **의미 매칭의 정합성 판단은 연결된 AI의 책임**이며 CareerMate가 검증하지 못한다(루브릭에서 자가검증 항목으로 분리). 동시에 JD 핵심 키워드(고유 기술명·자격증명)가 이력서에 그대로 들어가는지 **표면 존재 O/X**로 별도 보고한다. 키워드는 ATS에서 보통 자동탈락 게이트가 아니라 랭킹·가독성 신호다(방향성만 차용; 구체 % 수치는 출처가 약해 인용하지 않음). _(출처: ATS 실증 정리; O*NET 동의어 매핑은 AI 추론 영역)_
- **(gap 3단계 처리 + false-negative 방지)** gap을 발견하면: (a) 인접·전이가능 증거가 있으면 **partial로 재분류**하되 '왜 full이 아닌지' 사유 1문장을 필수로 적고, (b) 진짜 없으면 **미충족**으로 정직하게 표기, (c) 미충족 must-have에는 완화 전략(전이가능 경험 강조·학습계획·커버레터 해명) 1개를 붙인다. **gap으로 분류한 must-have마다 인접 증거 탐색을 최소 1회 시도한 흔적**을 남겨, 좋은 후보를 과소평가(false-negative)하지 않는다. _(출처: O*NET KSA 위계는 전이가능성의 참고 프로파일이지 직접 판정 근거 아님 — 전이 판단은 AI 추론)_
- **(충족률은 맥락 신호, 결정적 갭은 단독 게이트)** must-have 충족률(분자=met인 must 개수; **partial은 분자에서 제외**, 분모=전체 must 개수)을 계산하되, 이는 **합격 신호가 아니라 맥락 신호**다. '약 50~60% 구간부터 면접 콜백이 의미있게 오른다'는 관찰은 지원자 풀의 생존편향이 섞인 상관일 뿐 인과가 아니며, must-have만으로 재정의한 임계값은 별도 캘리브레이션이 없는 휴리스틱이다. **critical(직무 핵심)·hard-gate must-have가 하나라도 gap이면 충족률·60% 무관하게 '지원 권장'을 내지 않는다.** 집계 비율(키워드 커버리지%·must-have 충족률)은 그 자체로 권장(recommend) 게이트가 아니라 맥락·랭킹·응답성 신호이며, 권장 게이트는 개별 하드요건(knockout) 충족 여부다(판정은 본 문서 R6·fit-analysis). <!-- B1/P5: 집계비율≠게이트, knockout이 게이트 (consensus R1→R3) --> _(출처: TalentWorks 분석(CNBC 2018) — 단일·비피어리뷰, 방향성만 차용)_
- **(사실·수치·고유명사 보존)** 기간·규모·도구·회사명 등 사실·수치·고유명사는 변형 없이 보존하고, 매핑 시 원문 수치를 그대로(substring) 인용한다. 추정·반올림·과장 금지. _(출처: AGENTS.md 보존 규칙; STAR 정량화)_
- **(하드 게이트 별도 식별 + ATS knockout 인지)** '경력 N년 이상'·국가자격증·면허·비자·근무지 같은 **하드 게이트**는 별도 표시하고 소프트 스킬로 상쇄되지 않음을 분명히 한다. 이런 binary 요건은 ATS의 knockout/스크리닝 사전질문에서 **실제로 자동탈락되는 경우가 흔하다**(키워드 자동탈락은 드물어도 구조화 사전질문 탈락은 흔하다). 따라서 '자동탈락은 드뭄'을 하드 게이트에 일반화하지 마라. _(출처: O*NET 규제요건; NCS 자격요건; ATS knockout 실무)_
- **(범위 한계 명시 + 오버퀄/방향 불일치)** 이 분석은 '증거로 매핑 가능한 하드 요건' 중심이며, 협업·커뮤니케이션 같은 **soft/culture fit는 다루지 않음을 명시**한다(적합도 ≠ 합격가능성). 또한 미달뿐 아니라 **오버퀄(시니어가 주니어 JD 지원)·커리어 방향 불일치**도 리스크로 표기한다. _(출처: 채용 매니저 실무; O*NET은 soft 신호 판정 도구 아님)_

### Do

- 분석 시작 전 `get_application_context`를 호출해 프로필·대표 이력서·경력·스킬·대상 공고를 한 번에 확보한다(맥락 없이 분석 금지).
- JD의 모든 요건을 한 줄씩 추출하고 **복합 줄은 낱개로 분해**한 뒤 표로 만든다. 각 줄에 [필수/우대], [critical 여부], [hardGate 여부], [매핑 증거 출처 ID 또는 GAP]을 단다.
- 각 매핑 증거는 실제 불릿·경력을 **원문 substring으로 인용**하고, 수치는 그대로 옮긴다.
- must-have 충족률(met must 수 / 전체 must 수, **partial 제외**)을 계산해 **맥락 신호**로 제시하되, critical·hardGate gap이 있으면 '권장 불가'를 병기한다.
- 미충족 must-have마다 완화 전략 1개를 적고, gap으로 분류한 must마다 인접 증거 탐색 시도 흔적을 남긴다.
- JD 핵심 키워드(기술명·자격증·도구)의 이력서 표면 존재 O/X를 의미 매칭과 분리해 별도 점검한다.
- 저장된 이력서/JD가 바뀌면 분석이 낡으므로, 분석에 **근거가 된 이력서 버전 ID·JD 식별자**를 기록해 재분석 트리거를 남긴다.
- 결과는 `save_fit_analysis`로 저장하고 대시보드 링크(http://127.0.0.1:4319)를 안내한다.
- 기술 용어(must-have, ATS, hard-gate 등)는 사용자의 언어로 풀어 설명한다.

### Don't

- JD에 없는 요건을 추가하거나, 없는 경력·수치를 지어내 gap을 메우지 마라(환각 금지).
- 우대(nice-to-have) 미충족을 탈락 사유처럼 다루거나 점수를 깎지 마라.
- 증거 인용 없이, 또는 의역·요약 인용으로 '충족' 판정하지 마라(인용은 원문 substring).
- 충족률 60%를 '합격 신호'나 '권장 게이트'로 격상하지 마라 — 맥락 신호다. 100%까지 채우라고 압박하지도 마라.
- critical·hard-gate(면허·연차·비자·근무지·필수자격증) 미충족을 소프트 스킬로 상쇄해 '지원 권장'을 내지 마라.
- partial을 '왜 full이 아닌지' 사유 없이 남발해 충족률을 인위적으로 부풀리지 마라.
- JD의 'required' 라벨을 무비판적으로 신뢰하지 마라 — 요건 인플레이션(특히 연차·학위)을 인지하고, 의심되면 사용자에게 알린다.
- 사실·수치·고유명사를 반올림·과장·변형하지 마라.
- 데이터를 외부로 보내거나 웹에서 후보자 정보를 검색하지 마라(모든 데이터는 `~/.careermate` 로컬).
- gap을 숨기거나 얼버무리지 마라 — 정직하게 미충족으로 표기하고 완화책을 제안하라.

### 워크드 예시 (Before → After)

1. **Before:** JD 요건 'SQL 기반 데이터 분석 경험' → "데이터 분석 잘하실 것 같아요. 적합합니다." (증거·출처 없음, 추정)
   **After:** 요건 'SQL 기반 데이터 분석' [필수·critical] → 충족. 근거 `{sourceType:resume, sourceId:1, quotedBullet:"주간 매출 대시보드를 SQL로 추출·집계해 12개 캠페인 ROI를 비교, 광고비 18% 재배분"}`(원문 substring). 정확 키워드 'SQL' 이력서 표면 존재(O).
   **왜 더 나은가:** 추정·칭찬 대신 실제 불릿을 출처 ID + **원문 substring**으로 인용했다. CareerMate가 LLM 없이 'quotedBullet이 입력 이력서의 부분문자열인가'를 검증할 수 있고, 키워드 표면 존재는 별도 점검해 환각 여지가 없다.

2. **Before:** JD 'PM 3년 이상' 미충족인데 마케팅 경력을 'PM 유사 경험'으로 뭉뚱그려 '충족'으로 표기, 충족률 5/8(62%)로 '60% 상회 → 지원 권장'.
   **After:** 요건 'PM 경력 3년 이상' [필수·hardGate] → 미충족. PM 직함 0년, 마케팅 4년. 완화: 마케팅 중 '신규 기능 베타 운영·우선순위 결정'을 인접 증거로 강조 가능하나 '3년'은 연수 게이트라 상쇄 불가. 커버레터에서 전환 의지 해명 권장. **종합 판정: hard-gate 미충족으로 권장 불가** — 충족률(5/8=62%)은 참고용 맥락 신호이며 권장 근거가 아니다.
   **왜 더 나은가:** hard-gate를 소프트 경험으로 덮지 않았고, 60% 충족률을 '권장 근거'로 쓰지 않았다. 충족률 옆에 '권장 불가'를 강제 병기해 FM-04(충족률)와 FM-05(하드게이트)의 산술 충돌을 제거했다.

3. **Before:** "전반적으로 잘 맞습니다(80점)." (요건별 분해·근거 없음, 단일 점수)
   **After:** 적합도 요약 — 필수 8개 중 met 6 / partial 0 / gap 2, 충족률 6/8(75%, partial 제외). 우대 4개 중 1개 충족. 충족 must: [Python(resume#2 불릿), API 설계(experience#4 불릿)]. 미충족 must: [AWS 운영경험 → GCP 경험으로 부분대체 가능(전이, partial 후보지만 'AWS 특화 운영툴 경험 없음'으로 gap 유지), 정보처리기사 → **hardGate 여부 확인 필요**: JD가 '필수'면 권장 불가/'우대'면 가점]. critical·hardGate gap 없음 가정 시에만 충족률을 권장 맥락으로 사용. 보강 1순위: AWS 키워드/경험 명시.
   **왜 더 나은가:** 단일 점수 대신 met/partial/gap을 분해하고 partial 계수 규칙을 명시했다. 자격증의 게이트/가점 판별을 '확인 필요'로 명시해 예시 내 모순(가점 vs 하드게이트)을 제거했다.

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 모든 요건에 [필수/우대] 라벨 + 복합 요건 분해 | 라벨 누락 0개; 쉼표·'및'·'and/or'로 묶인 줄이 개별 항목으로 분리됨 | 추출 항목 수를 세고 각 항목에 'must'/'nice' 토큰 존재 확인(누락==0). 원문에서 구분자 포함 줄 수 대비 분해 항목 수가 ≥ 구분자+1 인지 검사 |
| R2 | 충족·부분충족 판정에 출처 ID + evidence 존재 | status가 met·partial인데 evidence[] 배열이 빈 항목 0개 | (AI 셀프체크 기준으로 유효; **서버 강제는 Phase B** — 현재 save_fit_analysis 스키마에 requirements[]/evidence 필드 없음) met·partial 항목 수 대비 `evidence.length>0` 항목 수 비율 == 100% |
| R3 | quotedBullet/quotedMetric이 원문 substring (환각·수치변형 차단) | 인용 문자열이 해당 sourceId 입력 텍스트의 부분문자열이 아닌 항목 0개 | (AI 셀프체크 기준으로 유효; **서버 강제는 Phase B** — 입력 구조 부재, 현재 연결 AI가 substring 수동 대조) 각 evidence의 quotedBullet을 입력 이력서/경력 텍스트에 대해 indexOf/`includes` 문자열 검색 → 미발견 개수 == 0 |
| R4 | gap 표기 + must-have 미충족마다 완화 전략 | 미충족 must 중 mitigation 문장이 없는 항목 0개 | 미충족 must 개수 == mitigation 문장 개수 비교 |
| R5 | must-have 충족률 수치 제시 + partial 제외 규칙 | 'met must 수 / 전체 must 수' 분수·% 1개 이상; 분자에 partial 미포함 | 분수/% 정규식(예: `\d+/\d+`, `\d+%`)이 must 문맥과 함께 1회 이상; 분자 == status=='met' 개수와 일치 확인 |
| R6 | critical·hardGate gap 시 '권장 불가' 병기 (게이트 단독 우선) | hardGate 또는 critical이 gap인데 verdict가 'recommend'인 사례 0개 | (AI 셀프체크 기준으로 유효; **서버 강제는 Phase B** — verdict/requirements 필드 부재, 현재 연결 AI가 수동으로 '권장 불가' 강제) `requirements`에 `hardGate&&status==gap` 또는 `critical&&status==gap`이 1개라도 있으면 `verdict=='recommend'` 금지 |
| R7 | 키워드 표면 존재가 의미 매칭과 분리 보고 | JD 핵심 키워드별 'O/X' 표기 1개 이상, 의미 매칭 충족 판정과 별도 필드 | 출력에 `keywordSurfacePresent` 또는 'O/X·있음/없음' 항목 카운트 ≥ 1 |
| R8 | partial 남용 방지 (사유 강제) | partial 항목 중 '왜 full이 아닌지' 사유 문장이 없는 항목 0개 | partial 항목 수 == partialReason 문장 수 비교 |
| R9 | gap 과소평가(false-negative) 방지 | gap으로 분류한 must마다 인접 증거 탐색 시도 흔적 존재 | gap must 개수 대비 `transferAttempt` 표기(예: "인접 검토: …") 항목 수 == 100% |
| R10 | 신선도 추적 | 분석에 근거가 된 이력서 버전 ID·JD 식별자가 기록됨 | 출력/페이로드에 `resumeVersionId`·`jobId`(또는 JD 해시) 필드 존재 여부 == 있음 |

**의미 매칭·전이가능성은 LLM 없이 검증 불가** → R2·R3·R5·R6은 **Phase B에서** CareerMate 서버가 LLM 없이 강제하도록 *설계*된 항목이다(존재 여부·substring·산술·게이트). **Phase A 현재 save_fit_analysis는 구조화 requirements[]를 받지 않고 자유텍스트만 저장하므로 이 서버 강제는 미구현이며, 연결 AI가 셀프체크로 적용한다.** 반면 '의역 동의어 매칭이 타당한가', '전이가능성 판단이 옳은가', '요건 추출이 빠짐없는가'는 **외부 AI의 셀프체크 책임**이며 서버가 보증하지 않는다(R1·R4·R8·R9는 형식 카운트만 강제, 내용 타당성은 AI 책임).

**주요 실패 모드:**
- (과대평가) 의역 인용으로 충족 위장 → R3 substring 강제로 차단.
- (충족률 조작) 복합 요건 미분해로 분모 축소(R1), partial을 분자에 넣어 부풀림(R5), partial 남발(R8).
- (오권장) hard-gate·critical gap을 충족률로 덮어 'recommend' → R6 서버 거부.
- (과소평가, 가장 비싼 실패) 전이가능 강점을 못 알아보고 gap으로 깎아 좋은 후보 자기검열 → R9.
- (낡은 분석) 이력서/JD 갱신 후 옛 분석 재사용 → R10.

## 4. 출처 (Provenance)

- **O*NET Content Model — U.S. DOL / National Academies** — KSA(지식·스킬·능력) 택소노미와 자격·면허 같은 규제요건 분류의 참고 프로파일. 단, '스킬 A→B 전이가능성'을 직접 판정하지는 않음(전이 판단은 AI 추론). https://www.onetcenter.org/database.html
- **University Career Centers (Arizona, WVU, Duke, Michigan)** — JD를 자격요건(필수)·책임·개요로 분해, 필수 vs 우대 우선순위, 키워드 미러링·고용주 우선순위 정렬. https://career.arizona.edu/resources/tailoring-your-resume/
- **ATS 실증 정리 (ResumeAdapter; The Interview Guys)** — '키워드는 자동탈락 게이트가 아니라 랭킹·가독성 신호'라는 **방향성만** 차용(이력서 첨삭 상품 사이트로 1차 연구 아님; '+40% 검토율'·'자동탈락 8%' 같은 구체 % 수치는 출처가 약해 본문 정량 주장으로 쓰지 않음). 단 비자·자격·근무지 같은 knockout 사전질문은 실제 자동탈락이 흔하다는 점을 하드 게이트에 반영. https://www.resumeadapter.com/ats-statistics
- **TalentWorks 분석 (CNBC 2018, InHerSight)** — '요건 ~50-60% 충족부터 면접 콜백이 오른다'는 관찰. 단일·비피어리뷰·생존편향 가능이라 **인과가 아닌 맥락 신호**로만 사용(must-have 전용 60% 임계값은 별도 캘리브레이션 없는 자작 휴리스틱임을 명시). https://www.cnbc.com/2018/12/12/matching-half-of-a-jobs-requirements-might-still-get-you-an-interview.html
- **Behavioural Insights Team — 젠더 지원격차** — 이 출처의 실제 결론은 '여성은 100% 충족 시에만 지원' **신화를 반박**한다(실제 격차는 여성 56% vs 남성 52%로 미미). 따라서 '100% 충족 압박은 불필요'의 근거로 인용하되, '여성만 자기검열' 단정은 사용하지 않음(경향성 가설로 수위 조정). https://www.bi.team/blogs/women-only-apply-when-100-qualified-fact-or-fake-news/
- **STAR 기반 성과 불릿 (Columbia CCE, ResumeBuilder, TopResume)** — 증거→주장 매핑, 정량화 수치 보존, 행동-결과 구조 → 증거 인용·수치 보존 원칙. https://www.resumebuilder.com/career-center/star-method-resume/
- **NCS 국가직무능력표준 — HRD Korea** — 직무기술서 기반 능력중심채용, **직무수행능력(능력단위)·직업기초능력 구분**(한국 맥락의 필수/우대·하드요건 분류). 'on-spec'은 NCS 표준 용어가 아니라 사용하지 않음. https://www.ncs.go.kr/index.do

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:** `get_fit_analysis_guide` — 연결된 AI가 적합도 분석 직전 호출하면 (1) 요건 분해·복합 요건 분리 체크리스트, (2) 증거-매핑 템플릿(substring 인용 규칙 포함), (3) R1~R10 셀프-체크 루브릭, (4) 60% '맥락 신호' 규칙·critical/hardGate 단독 게이트 규칙을 구조화 JSON으로 반환. (Phase B) `save_fit_analysis`가 `requirements[]` 구조를 입력받으면 **LLM 없이** 충족률·갭 개수를 서버측에서 재계산·검증하도록 *설계*한다(현재 스키마는 자유텍스트만 — 미구현).
- **데이터 형태 힌트:**
  ```
  {
    jobId, resumeVersionId,                       // R10 신선도
    fitSummary: { mustHaveTotal, mustHaveMet,     // mustHaveMet = status=='met' 개수만 (partial 제외)
                  mustHaveMetRate, niceToHaveMet,
                  verdict: 'recommend'|'conditional'|'not_recommend',
                  overqualified: bool },          // 오버퀄/방향 불일치 플래그
    requirements: [ {
      id, text, type:'must'|'nice',
      critical: bool, hardGate: bool,             // 단독 게이트
      status: 'met'|'partial'|'gap',
      partialReason?,                             // partial이면 필수 (R8)
      transferAttempt?,                           // gap must면 필수 (R9)
      evidence: [ { sourceType:'resume'|'experience', sourceId,
                    quotedBullet,                 // 입력 원문의 exact substring (R3)
                    quotedMetric? } ],
      keywordSurfacePresent: bool,                // R7 표면 트랙
      mitigation?                                 // 미충족 must면 필수 (R4)
    } ],
    generatedBy: 'claude'|'gpt'|'gemini'
  }
  ```
  **서버측 검증(Phase B 설계 — 현재 미구현):** 아래는 `save_fit_analysis`가 구조화 `requirements[]`를 받게 될 Phase B의 강제 *설계안*이다. **Phase A 현재 스키마는 자유텍스트만 받으므로 이 검증은 동작하지 않으며, 연결 AI가 셀프체크로 적용한다.** ① `status∈{met,partial}`인데 `evidence[]` 빈 항목 → **거부**(R2). ② 각 `quotedBullet`이 해당 sourceId 입력 텍스트의 부분문자열이 아니면 → **거부**(R3). ③ `mustHaveMet`를 status=='met' 개수로 재계산(클라이언트 자기보고 불신, R5). ④ `hardGate&&status==gap` 또는 `critical&&status==gap`이 1개라도 있는데 `verdict=='recommend'` → **거부**(경고 아님, R6). ⑤ partial인데 `partialReason` 없음(R8)·gap must인데 `transferAttempt` 없음(R9)·미충족 must인데 `mitigation` 없음(R4) → 거부.
