# ATS — CareerMate 지식 (Phase A)

> 이 문서는 CareerMate가 **연결된 AI에게 제공(serve)** 하는 지식이다. CareerMate 안에는 LLM이 없다 — 분석·작성·검증은 연결된 AI가 수행하고, 이 플레이북·루브릭은 그 AI가 **세계 최고 수준**으로 일하도록 안내한다.

## 1. 무엇을 하는가

이 플레이북은 연결된 AI가 후보자의 이력서를 **기계가 안정적으로 읽고 검색해 낼 수 있게(parseable & findable)** 만들도록 돕는다. 두 가지 진실이 모든 것을 떠받친다. (1) **파싱은 실재하고 결과를 좌우한다** — 다수 ATS 파서는 텍스트를 선형(좌→우, 위→아래)으로 읽으며 표·다단·텍스트박스·헤더/푸터·그래픽을 "word salad"로 뭉개, 연락처·스킬·날짜가 검색 인덱스와 자동완성에서 조용히 사라진다. (2) **"ATS가 점수로 자동 탈락시킨다"는 서사는 상당 부분 신화**지만 **완전한 신화는 아니다** — 사람이 거르는 단계가 핵심이되, 지원서 양식의 **knockout/사전 스크리닝 문항**(취업 자격·학위·근무지·연봉 하한)은 진짜 자동 탈락 스위치이며, 대량 채용에서는 AI 어시스트 랭킹/자동 숏리스트가 사실상의 자동 필터로 작동하기도 한다. CareerMate에는 LLM이 없으므로, 아래 루브릭은 연결된 AI가 `save_fit_analysis`·`save_cover_letter_version` 저장 전에 자가검증할 수 있는 **셀 수 있는/체크 가능한 신호**로 설계했다. 단, "무엇이 JD 핵심 용어인가"·"이 약어가 모호한가"·"이 직함이 진실한가" 같은 **판단은 외부 AI의 몫**이고, CareerMate는 결정론적 **측정**만 한다.

**적용 범위(중요):** 이 플레이북은 **영어권 ATS**(Workday/Greenhouse/Lever/Taleo/iCIMS/Workable 등 자유양식 이력서 파싱) 기준이다. 한국 주력 플랫폼(사람인·잡코리아·원티드·그리팅·각사 자체 채용시스템)의 **문항 기반 지원서**는 자유양식 이력서 ATS와 완전히 다른 게임이며(§2 한국 트랙), 일부 루브릭(날짜 형식·표준 헤더·약어)은 로케일 분기 또는 면제가 필요하다.

## 2. 플레이북

### 원칙

- **단일 컬럼(single-column)만 출력하라.** 이력서 본문을 표·다단 그리드·텍스트박스·좌우 병렬 블록에 넣지 말고, 스킬 묶음은 쉼표·세로바(|)·불릿(•)으로 한 줄에 표현하라. — 주류 파서는 선형으로 읽으며 표/다단을 "페이지 전체를 가로로 슬라이스"해 텍스트 레이어를 뒤섞어 스킬·연락처·섹션을 통째로 누락시킨다. 디자인 중심 이력서가 work-experience 블록만 파싱된 사례가 보고됐다. _(출처: Jobscan — Tables and Columns Break Resume Parsing)_
- **연락처(이름·전화·이메일·지역)와 핵심 키워드는 본문(BODY)에 둬라. 페이지 헤더/푸터나 이미지에 넣지 마라.** — **일부(주로 구형) 파서**는 헤더/푸터/텍스트박스 텍스트를 건너뛴다. 2026년 현재 다수 최신 엔진(Sovren/Textkernel/HireAbility/Affinda 계열)은 헤더/푸터를 읽지만, 실패가 여전히 존재하므로 본문에 두는 것이 무비용 안전책이다. _(출처: Jobscan — 5 ATS Formatting Mistakes; UMN Duluth Career Center)_
- **표준·직역 섹션 헤더를 그대로 써라**: 'Work Experience'(또는 'Experience'), 'Education', 'Skills', 'Certifications', 'Summary'. 'What I've Done', 'My Journey' 같은 창의적 라벨을 피하라. — 파서는 표준 헤딩 문자열을 인식해 내용을 분류한다. 비표준 헤딩은 엉뚱한 필드로 분류되거나 누락돼 구조화 검색에 안 잡힌다. _(출처: Indeed — How To Write an ATS Resume; 다수 대학 커리어센터)_
- **JD의 정확한 용어를 미러링하되, 시맨틱 등가물도 커버하라.** boolean exact-match가 여전히 흔하므로 JD 표현을 그대로 쓰되, Workday·Eightfold·HiredScore 계열은 **stemming·동의어·임베딩 시맨틱 매칭**을 돌리므로 의미적 등가물('Node.js'↔'NodeJS', 'CI/CD'↔'CICD', 'manage'↔'managed')도 함께 다뤄라. — 후보자가 가졌지만 JD와 다르게 표현한 스킬은 exact 검색에서 누락될 수 있으나, 시맨틱 레이어에서는 등가물이 잡히기도 한다. 두 모델을 모두 가정하라. _(출처: Teal — Resume Keywords; Scale.jobs — Match Keywords; Eightfold/HiredScore 시맨틱 매칭 동향)_
- **약어 확장(expansion)은 좁게 적용하라.** JD가 두 형태를 모두 쓰거나 **진짜로 모호한 약어**에만 'long form (ACRONYM)'을 한 번씩 넣는다. AWS/SQL/API/REST/SaaS/GCP/CPA 같은 **업계 표준·널리 알려진 약어는 면제** — 'Amazon Web Services (AWS)'나 'Certified Public Accountant (CPA)'를 매번 풀어쓰면 오히려 junior하게 읽히고 리크루터는 'AWS'·'CPA'로 검색한다. _(출처: Teal — Resume Keywords; 시니어 리크루터 리뷰)_
- **지원서 양식 knockout/사전 스크리닝 문항을 키워드보다 상위·우선 게이트로 다뤄라.** 취업 자격/비자 스폰서십, 필수 학위/자격증, 근무지/이주, 연봉 하한, 최소 경력연수 — 지원 전에 후보 프로필의 사실과 대조해 mismatch를 사용자에게 알려라. — Workday/Greenhouse/Taleo/iCIMS에서 필수 knockout 문항에 부적격 답을 하면 사람 검토 전에 자동 탈락한다. "어떤 키워드 최적화도 자동 부적격을 이기지 못한다." _(출처: The Interview Guys — ATS Resume Hack; Huntr — How ATS Work 2026)_
- **키워드 스터핑·숨김 텍스트 금지. 사실·수치·고유명사·날짜는 원문 그대로 보존하라.** — 파싱된 이력서는 결국 사람이 스캔한다(실제로 거르는 단계). 스터핑·허위 키워드는 스팸으로 읽혀 그 단계에서 탈락한다. _(출처: The Tech Resume — ATS Myths Busted; Teal)_
- **헤드라인/타깃 직함과 최근 직함을 JD 직함과 정렬하되, 진실한 범위에서만.** (예: PM 업무를 'Program Lead'로 했다면 'Product Manager'를 진실하게 추가) — 직함은 1차 boolean 필터이자 사람의 첫인상 신호다. 단 '진실성'은 본질적으로 AI/사람 판단이라 결정론 루브릭으로 강제 불가하며, 한국식 직급(사원/대리/과장/팀장)과 영문(Manager/Lead) 충돌도 사람 판단이 필요하다. _(출처: Jobscan — Top Resume Keywords; The Interview Guys)_
- **지원 URL로 ATS 플랫폼을 식별해 파일형식·전략을 조정하라.** apply URL이 `greenhouse.io`·`lever.co`·`*.myworkdayjobs.com`·`icims.com`을 포함하면 무료·결정론적 신호다. Greenhouse/Lever는 PDF 텍스트 레이어를 잘 파싱하고, 일부 구형 Taleo/iCIMS는 어려워한다. Workday는 후보가 대부분 필드를 **재입력(re-key)** 하므로 파싱 품질보다 **knockout 문항·프로필 필드**가 더 중요하다 — 우선순위는 **플랫폼 조건부**다. _(출처: Huntr — How ATS Work 2026; 시니어 리크루터 리뷰)_

### 한국 트랙 (영어권 ATS와 다른 게임)

- 사람인/잡코리아/원티드/그리팅 등은 **문항 기반 자기소개서 지원서**가 핵심이다. 자유양식 이력서 파싱 루브릭(단일 컬럼·표준 헤더·MMM YYYY 날짜)은 부분적으로만 적용되며, 날짜('2023.01 ~ 현재', '재직중')·직급 체계는 로케일 분기가 필요하다.
- 한국 지원서에서는 **각 문항에 대한 답변 품질**과 **자격 요건 충족**이 ATS 포맷보다 우선한다. 이 경우 §3 루브릭 중 R1/R2/R7(포맷·헤더·텍스트레이어)만 적용하고 R6(날짜)·R5(약어)는 면제하라.

### Do

- 이력서를 한 컬럼·위→아래·역연대순(최근 우선)으로 배치한다.
- 직역 표준 헤더를 쓴다: Summary, Skills, Work Experience, Education, Certifications.
- 이름·전화·이메일·도시/지역을 맨 위 본문에 **plain text 줄**로 넣는다.
- `get_application_context`로 JD의 필수·반복 용어를 먼저 추출하되, **무엇이 must-have/nice-to-have인지의 선정은 외부 AI가** 하고(이 판단은 CareerMate가 못 한다), 증거가 있는 곳에만 정확한 문자열을 녹인다.
- 시맨틱 등가물도 함께 커버한다(예: 'Node.js' 본문에 두면 'NodeJS' 검색도 의식).
- 지원 URL로 ATS를 식별해 파일형식·우선순위를 조정한다(§원칙 마지막).
- 날짜를 'MMM YYYY – MMM YYYY'(예: 'Jan 2023 – Present')로 직함과 같은 줄에 일관 표기한다. **한국어 이력서는 '2023.01 ~ 현재' 로케일 형식을 허용한다.**
- **테뉴어 타임라인 무결성**을 확인한다: 날짜 존재뿐 아니라 순서 일관성, 파서가 재직기간을 계산 가능한지, 겹침/공백이 사람 스크리닝을 유발하지 않는지.
- 약어는 **모호한 경우에만** 확장형을 한 번 쓴다(업계 표준 약어는 그대로).
- plain 불릿(• 또는 -)과 표준 폰트(Arial, Calibri, Times New Roman, 10–12pt)를 쓴다.
- .docx 또는 진짜 텍스트레이어 PDF로 저장·전달하고, 텍스트가 선택/복사되는지 확인한다.
- knockout 문항(비자/스폰서십·학위/자격·근무지·연봉·경력연수)을 **후보 프로필의 사실과 대조한 3-state(매치/미스매치/불명) 프리플라이트**로 사용자에게 제시한다.
- **LinkedIn/프로필 패리티**를 맞춘다: 직함 정렬·키워드 미러링을 LinkedIn 헤드라인·스킬에도 적용한다(소싱 상당수가 ATS가 아니라 LinkedIn 검색에서 일어난다).
- 한 회사 다중 역할은 회사를 한 번 적고 역할을 들여쓰기로 묶는다(umbrella method).

### Don't

- 이력서 본문에 표·다단/좌우 병렬·텍스트박스를 쓰지 마라.
- 연락처·스킬·키워드를 헤더/푸터나 이미지/그래픽 안에 넣지 마라.
- 표준 헤더 대신 창의적 섹션명('What I've Done', 'My Story')을 쓰지 마라.
- 선택 가능한 텍스트 레이어가 없는 스캔/이미지 PDF를 제출하지 마라.
- 키워드 스터핑·부자연스러운 반복·흰색/투명/1pt 숨김 텍스트로 점수를 조작하지 마라.
- 후보가 뒷받침 못 하는 스킬/키워드를 발명·과장하지 마라(사람이 파싱 텍스트를 읽고 거른다).
- 그래픽·아이콘·평점 바·스킬 퍼센트 차트로 정보를 전달하지 마라.
- 높은 'match score'가 면접을 보장한다고, 또는 ATS가 점수로 자동 탈락시킨다고 가정하지 마라 — 진짜 게이트는 knockout 문항·사람 검토·(대량채용의) AI 랭킹이다.
- 고정된 'PDF=자동거부' 신화를 믿지 마라 — 플랫폼 조건부다.
- 모든 약어를 기계적으로 풀어쓰지 마라(AWS/SQL/CPA 등 표준 약어는 그대로).
- 날짜를 문단 안에 묻거나 생략하지 마라 — 파서가 타임라인을 만들 수 없다.

### 워크드 예시 (Before → After)

1. **Before:** SKILLS 섹션을 3열 표로 작성
   `| Languages | Frameworks | Tools |` / `| Python | Django | Docker |` / `| Go | React | AWS |`
   **After:**
   `Skills`
   `Languages: Python, Go`
   `Frameworks: Django, React`
   `Tools: Docker, AWS`
   **왜 더 나은가:** 파서가 표를 가로로 읽어 'Languages Frameworks Tools Python Django Docker...'처럼 뒤섞으면 그룹핑이 깨진다. 단일 컬럼 쉼표 목록은 각 용어를 깨끗한 줄에 둬 'Python'·'React'·'AWS'가 각각 인덱싱되고 검색에 노출된다.

2. **Before:** 페이지 헤더 영역(.docx page-header)에 'Jane Park — jane@email.com — 010-1234-5678', 본문은 'PROFILE'로 시작.
   **After:** 본문 1행 'Jane Park', 2행 'Seoul, South Korea | jane@email.com | 010-1234-5678', 3행 헤딩 'Summary'.
   **왜 더 나은가:** 헤더 영역 연락처는 **일부 파서**가 건너뛰어 리크루터가 연락 수단 없는 이력서를 받고 자동완성이 비는 실패가 실재한다. 본문 plain text로 옮기면 어느 파서에서도 추출이 보장된다. 'PROFILE'도 표준 'Summary'로 정규화했다.

3. **Before:** Experience 불릿 'Led cross-functional initiatives to improve discoverability of our content.' (JD는 'SEO'·'Google Analytics' 요구)
   **After:** 'Led Search Engine Optimization (SEO) initiatives using Google Analytics, lifting organic traffic 38% in 6 months.'
   **왜 더 나은가:** 원문엔 JD 정확 문자열 'SEO'·'Google Analytics'가 없어 boolean 검색에서 자격 있는 후보가 누락된다. 재작성은 정확 용어(모호한 SEO는 확장형 동반)와 구체 수치를 동시에 넣어 파서/검색과 사람 독자를 모두 만족시키되, 실제 한 일이라 날조가 아니다. **이 불릿이 최근 역할에 있을수록 가중치가 높다**(§R4 recency 신호 참조).

## 3. 검증 루브릭 (연결된 AI가 산출물을 이 기준으로 자가검증)

> **책임 경계:** CareerMate는 **결정론적 측정**(개수·존재여부·패턴·비율)만 한다. **무엇이 JD 핵심 용어인가, 약어가 모호한가, 직함이 진실한가, JD가 어떤 hard requirement를 명시하는가**의 **판단은 외부 AI**가 jd_terms·knockouts 등으로 미리 제공해야 한다. 아래 임계값(0.70, ≤4회 등)은 **발명된 magic number가 아니라 권장 출발점**이며, AI가 JD/문서 길이/역할 수에 맞게 조정한다. 일부 체크는 **자문(advisory)** 이지 하드 게이트가 아니다.

| ID | 검사 항목 | 합격 기준 | 측정 방법(LLM 없이 셀 수 있게) |
|----|-----------|-----------|--------------------------------|
| R1 | 단일 컬럼 | 표/텍스트박스 구조 0개 | **.docx 원본에서만 신뢰**: `w:tbl`·`w:txbxContent` XML 요소 카운트 == 0. **PDF는 컬럼 검출 불가** — x-좌표 위치 정보 없이는 신뢰 불가하므로 '검출 불가, 사용자 경고'로 정직히 강등. 텍스트 공백-갭 휴리스틱은 약한 보조 신호로만(거짓양성: 우측 정렬 날짜줄). |
| R2 | 표준 헤더 | {Summary/Profile, Skills, Experience, Education, Certifications} 중 ≥3 존재, 그 자리에 비표준 헤딩 0 | 추출 텍스트를 표준 헤딩 화이트리스트와 대소문자 무시 substring 매칭, 카운트(≥3)하고 화이트리스트 밖 헤딩 줄 플래그. 순수 문자열 매칭. |
| R3 | 본문 연락처 | 이메일·전화 정규식이 본문에서 각각 ≥1 | 본문 추출 텍스트에 이메일 `[\w.+-]+@[\w-]+\.[\w.-]+` ≥1, 전화 숫자 패턴 ≥1. **.docx는 헤더/푸터 XML에 *only* 존재하는 경우(중복 아님)를 직접 겨냥해 플래그**; PDF는 헤더/본문 구분 불가라 본문 매치만 확인. |
| R4 | JD 키워드 커버리지 + recency | must-have 용어 커버리지 비율 ≥ 0.70(권장 출발점, AI 조정). **+ 최근 역할 배치 가중** | jd_terms[]는 **외부 AI가 추출·정규화**(lowercase, 구두점 제거, '.js'/'js' fold, 단·복수 dedupe, 동의어 묶음)해 제공. CareerMate는 정규화된 용어를 substring이 아니라 **토큰 경계 매칭**으로 카운트(raw substring은 'Java'⊂'JavaScript', 'lead'⊂'leadership' 거짓양성 유발 → 금지). 추가로 **각 용어가 최근(상단) 역할에 있는지** 위치 플래그를 반환해 AI가 recency 가중. |
| R5 | 약어 확장 (**advisory**) | 모호한 약어만: 확장형 동반 권장. 업계 표준 약어 화이트리스트(AWS/SQL/API/REST/SaaS/GCP/CPA/PhD/CEO/USA 등) **면제**. 월 약어·고유명사 면제 | 대문자 토큰 정규식 추출 후 **표준 약어 화이트리스트·월 약어를 먼저 제외**, 남은 모호 후보만 'long form (ABC)' 페어링 존재 확인. **하드 게이트 아님 — 자문**. (AI가 모호성 판단) |
| R6 | 날짜·테뉴어 무결성 | 모든 역할 항목에 파싱 가능한 날짜 범위 + 순서 일관 + 겹침/공백 없음 | 영문 `(Jan|...|\d{4})\s*[–-]\s*(Present|\d{4})` **또는 한국어 `\d{4}\.\d{2}\s*[~–-]\s*(현재|재직중|\d{4})`** 로 로케일 분기. 역할 헤딩 수 대비 비율 1.0. 추가로 날짜를 정렬해 **겹침/공백 구간을 카운트**(>0이면 사람 스크리닝 유발 가능 플래그). |
| R7 | 파일 텍스트 레이어 | 추출 텍스트 길이 > 300자, 형식 .docx 또는 text-PDF(이미지-PDF 아님) | `read_document`로 추출 후 글자수 측정. PDF인데 near-zero면 이미지-only → fail. 카운트 체크. |
| R8 | 스터핑·숨김 텍스트 | 핵심 용어 반복이 **문서 길이/역할 수 정규화** 상한 이내, 숨김 텍스트 런 0 | 용어별 occurrence 카운트를 **역할 수·페이지 수로 정규화**(2페이지 시니어 이력서는 핵심 언어 6–8회가 정상 → 고정 4회 상한 금지). 숨김 검출은 `w:color val='FFFFFF'`뿐 아니라 **폰트색==배경색·≤1pt 폰트·텍스트=배경이미지** 케이스까지 스캔(FFFFFF만 보면 회피 쉬움). 커버리지 한계는 정직히 고지. |
| R9 | knockout 프리플라이트 (3-state) | JD 명시 hard requirement **각각 × 후보 프로필 사실 = 매치/미스매치/불명** 매트릭스 존재. 빈 헤더만으로는 불합격 | JD hard requirement 추출(visa/degree/location/years/salary)은 **외부 AI 판단**(자기기만 방지: 존재≠정확). knockout 답은 **CareerMate 프로필 데이터**의 사실(시민권/비자/학위)에서 와야 함. CareerMate는 각 항목이 (a) JD에 명시됐고 (b) 프로필 사실과 대조됐고 (c) 3-state 중 하나로 라벨됐는지 **구조 존재**를 카운트. **LLM 의존 단계임을 명시**. |
| R10 | 직함 정렬 (**advisory**) | JD 핵심 직함 구(또는 진실한 동의어)가 헤드라인/최근 역할줄에 등장 | JD 직함 토큰을 상단 헤드라인/첫 역할줄에 substring 매칭. **단 '진실성'은 검증 불가 — AI/사람 판단**. 한국식 직급↔영문 충돌도 AI 판단. 하드 게이트 아님. |

**주요 실패 모드:**
- **substring 거짓양성/거짓음성:** raw substring 매칭은 'Java'⊂'JavaScript', 'lead'⊂'leadership'를 오매칭한다. 토큰 경계 + 외부 AI 정규화·동의어 묶음으로만 막을 수 있다(R4).
- **PDF 컬럼 검출 환상:** 텍스트 추출이 컬럼을 단일 스트림으로 reflow하면 진짜 문제가 숨는다. PDF는 '검출 불가, 경고'로 정직히 강등한다(R1).
- **약어 오탐 폭탄:** 모든 대문자 토큰에 확장형을 요구하면 AWS/SQL/CEO/월약어가 전부 fail한다 → 화이트리스트 면제 + advisory(R5).
- **knockout 자기기만:** 빈 헤더만 써넣어도 '존재'로 통과 + JD 텍스트만으로는 mismatch 판정 불가 → 프로필 사실 대조 3-state 강제(R9).
- **로케일 미대응:** 영문 'MMM YYYY'·'Present'·'FFFFFF 흰배경' 가정은 한국어 이력서·색배경 디자인을 100% 오판한다 → 로케일 분기(R6)·다중 숨김 케이스(R8).
- **magic number 과신:** 0.70·≤4회는 출발점이지 법칙이 아니다. AI가 JD/문서 길이로 조정한다.
- **루브릭 자체의 정밀도 미검증:** 이 결정론 루브릭이 깨끗한 이력서를 오탈락시키지 않는지 보장하려면 **소규모 라벨드 픽스처 세트**(예: 손으로 채점한 known-good 이력서 10건)로 회귀 검증이 필요하다 — Phase B 과제로 명시.
- **결과 오인:** 루브릭 만점은 **파싱가능성·검색노출의 필요조건 점검**일 뿐 합격/면접 예측이 아니다. 추천·다이렉트소싱·소규모 기업은 ATS와 무관하게 진행되며, 만점이어도 knockout·사람·AI 랭킹에서 떨어질 수 있다.

## 4. 출처 (Provenance)

> **증거 한계 고지:** 핵심 파싱 주장은 Jobscan(ATS 최적화 도구를 파는 벤더 — 파싱 취약성 과장 인센티브)과 대학 커리어센터(상호 인용·수년 지연)에 기댄다. 일화 1건('디자인 이력서가 work-experience만 파싱')과 가이드 다수가 근거이며, '헤더/푸터를 실제로 무시하는 ATS 비율'·'단일 vs 멀티컬럼 파싱 실패율' 같은 **정량 효과(effect size)는 미검증**이다. 1차 파서 벤더(Sovren/Textkernel/HireAbility/Affinda) 또는 각 ATS 자체 help docs가 파싱 동작의 권위 있는 출처이나 본 플레이북에는 미반영 — **규칙 영향도는 ATS 벤더·버전별로 다르며 정량 효과는 미검증**임을 전제로 적용하라.

- **Jobscan — Why ATS Tables and Columns Break Your Resume Parsing (2026)** — 선형 파싱, 표/다단 word-salad 실패, 세로바/쉼표/불릿 대안, umbrella method · https://www.jobscan.co/blog/resume-tables-columns-ats/ _(벤더, 상업적 편향 가능)_
- **Jobscan — 5 Critical ATS Resume Formatting Mistakes (2026)** — 헤더/푸터·텍스트박스 누락(일부·구형 한정으로 해석), 본문 연락처, 단일컬럼/폰트/마진 기본값 · https://www.jobscan.co/blog/ats-formatting-mistakes/ _(벤더)_
- **UVA / Santa Clara / U. Maryland / U. Utah / UMN Duluth Career Center ATS guides** — 표준 헤딩, 역연대순, .docx/PDF 수용, plain 불릿, 10–12pt 폰트(다수 대학 교차 확인) · https://www.scu.edu/careercenter/toolkit/job-scan-common-ats-resume-formatting-mistakes/ _(상호 인용 가능, 지연 가능)_
- **Indeed Career Advice — How To Write an ATS Resume** — 보편 표준 섹션(Work Experience/Education/Skills/Certifications)과 템플릿 구조 · https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume-template
- **Teal — Resume Keywords / Scale.jobs — Match Keywords** — exact-match 우선, JD 미러링, 약어+확장(좁게), 자연스러운 배치, 스터핑 회피 · https://www.tealhq.com/post/keywords-for-resume
- **The Interview Guys — ATS Resume Hack & What ATS Looks For** — knockout/사전 스크리닝이 진짜 자동 부적격기, 직함 정렬 · https://blog.theinterviewguys.com/ats-resume-hack/
- **Huntr — How Applicant Tracking Systems Actually Work (2026)** — 플랫폼별 knockout 동작(Workday/Greenhouse/Taleo/iCIMS/Workable), URL로 ATS 식별, Workday 재입력 현실 · https://huntr.co/blog/how-applicant-tracking-systems-work
- **The Tech Resume — ATS Myths Busted** — 'PDF 거부'·'점수 자동탈락' 신화 반박(단, 대량채용 AI 랭킹은 별개), 파싱→boolean/자동완성·사람이 거름(Amazon/Google/Microsoft 리크루터 인용) · https://thetechresume.com/samples/ats-myths-busted.html _(단일 강주장 출처 — 과의존 주의)_
- **시맨틱/임베딩 매칭 동향 (Eightfold / HiredScore / Workday Skills Cloud, 2026)** — 일부 최신 ATS가 stemming·동의어·임베딩 시맨틱 매칭·AI 랭킹/숏리스트를 실제 운용 → exact-match 단독 가정 보정 _(2차 동향, 정량 미검증)_
- **Wikipedia — Applicant Tracking System** — ATS의 일반 정의·생태계 프레이밍(운영 디테일은 근거하지 않음) · https://en.wikipedia.org/wiki/Applicant_tracking_system

## 5. Phase B 힌트 (아키텍처로 연결)

- **MCP 도구 아이디어:**
  - `get_ats_checklist` — principles·do/don't·countable rubricChecks를 구조화 JSON으로 반환(AI가 작성 중 적용).
  - `analyze_ats_fit({ resume_id, job_id })` — **LLM 없이 계산 가능한 raw 결정론 신호**만 반환: 추출 텍스트, 탐지 헤더, .docx의 `w:tbl`/`w:txbxContent` 카운트, 텍스트레이어 길이, 본문 연락처 매치, 로케일 분기 날짜·겹침/공백, jd_terms 커버리지 맵, 숨김 텍스트 후보. **jd_terms 추출·정규화·동의어 묶음과 knockout hard-requirement 추출은 호출하는 AI가 입력으로 제공**(CareerMate는 카운팅만). 결과를 `save_fit_analysis`에 연결.
  - (Phase B 과제) **fixture 회귀 세트** — known-good 이력서 ~10건을 손 채점해 루브릭이 깨끗한 이력서를 오탈락시키지 않는지 정밀도/재현율 측정.
- **데이터 형태 힌트:**
  - `ats_checklist: { principles:[{rule,rationale,source}], rubricChecks:[{id,check,passBar,measure,advisory:bool,llm_dependent:bool}] }`
  - `ats_signals: { file_type:'docx'|'pdf_text'|'pdf_image', locale:'en'|'ko', text_len:int, table_count:int, textbox_count:int, columns_detectable:bool, headers_found:string[], contact:{email:bool,phone:bool,in_body:bool,header_only:bool}, dates_ok_ratio:float, tenure_overlaps:int, tenure_gaps:int, jd_terms:[{term,normalized,required:bool,found:bool,in_recent_role:bool}], coverage_ratio:float, acronyms:[{token,expansion_found:bool,whitelisted:bool}], hidden_text_runs:int, knockouts:[{type:'visa'|'degree'|'location'|'salary'|'years', jd_value:string|null, profile_value:string|null, state:'match'|'mismatch'|'unknown'}], ats_platform:'greenhouse'|'workday'|'lever'|'taleo'|'icims'|'unknown' }`
  - 각 rubric 체크가 ats_signals 필드와 1:1 매핑돼 AI가 결정론 pass/fail 표를 렌더(R5/R10은 advisory, R9는 llm_dependent 라벨). CareerMate=측정, AI=판단의 책임 분리를 구조로 강제.
