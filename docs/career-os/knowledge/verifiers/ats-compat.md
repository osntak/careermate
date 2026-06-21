# ATS 호환성 (ATS-compatibility) — CareerMate 교차검증 루브릭 (Phase A)

> 이 검증기는 연결된 AI가 커리어 산출물(이력서·자소서·면접 답변·LinkedIn 등)을 점검할 때 적용하는 **크리틱 루브릭**이다. CareerMate는 루브릭을 제공하고, 실제 검사는 연결된 AI가 수행한다(내부 LLM 없음).

## 1. 목적

이 검증기는 커리어 산출물이 **Applicant Tracking System(ATS)에 의해 정확히 파싱되고, 채용공고(JD)의 핵심 키워드를 충분히 담고 있는지**를 보장한다. 산업 조사에 따르면 채용 담당자의 대다수(Jobscan 조사 기준 ~99.7%)가 ATS로 지원서를 1차 필터링한다. ATS는 대부분 텍스트 레이어를 **선형(좌→우, 위→아래)**으로 읽기 때문에, 표·다단·헤더/푸터·이미지·아이콘처럼 읽기 순서를 깨는 요소가 있으면 사람이 보기엔 멀쩡한 문서도 "단어 샐러드(word salad)"가 되어 검색에서 누락된다.

따라서 이 루브릭은 두 축을 본다.
1. **파싱 안전성(parse-safety)** — ATS가 텍스트를 깨뜨리지 않고 구조를 인식할 수 있는가(표준 헤더·단일 컬럼·연락처 위치·날짜 형식·폰트/아이콘·파일형식).
2. **JD 키워드 커버리지(keyword coverage)** — JD에서 반복·강조된 하드스킬/직무명/필수요건 용어가 산출물 본문에 실제로 존재하는가, 과도한 키워드 스터핑 없이.

핵심 설계 원칙: 모든 항목은 **LLM 없이도 셀 수 있는 형태(개수·존재여부·비율·정규식 패턴)**로 환원해 두어, 연결된 AI가 결정론적으로 카운트해 판정하고 루프를 돌 수 있게 한다. 단 **코어 파스세이프티(C1~C7·C12)만 합격 게이트**이고 **키워드 커버리지 축(C8~C11)은 advisory**(미달=갭 보고, PASS 비차단)다. 이력서·LinkedIn·자소서(텍스트 본문 기준)에 공통 적용한다.

## 2. 검사 항목

> **게이트 구분:** C1~C7·C12 = 코어 파스세이프티(합격 게이트). C8~C11 = 키워드 커버리지 축(**advisory** — 미달 시 갭을 검출·보고하되 PASS를 막지 않으며, 최종 PASS 판정은 연결 AI가 JD·문맥·모델 능력에 따라 내린다).

| ID | 검사 | 합격 기준 | 측정 방법(셀 수 있게) |
|----|------|-----------|------------------------|
| C1 | 표준 섹션 헤더 존재 | 핵심 섹션이 표준 라벨로 존재 (이력서: Experience/Work Experience/Professional Experience, Education, Skills 중 최소 2개 일치; LinkedIn: About/Experience/Skills) | 산출물에서 헤더 라인을 추출해 표준 라벨 화이트리스트와 정확/근접 일치(대소문자 무시)한 **개수 ≥ 2**. "My Journey"·"내 이야기"·"The Toolkit" 같은 창의적 헤더는 0으로 카운트 |
| C2 | 비표준/창의적 헤더 부재 | 표준 화이트리스트에 없는 섹션 헤더 = 0개 | 헤더 라인 중 화이트리스트 밖 라벨 개수. **0이면 합격** |
| C3 | 단일 컬럼(다단 금지) | 다단 레이아웃 신호 없음 | **`.docx` 원본만 신뢰**(C4와 동일하게 `w:tbl`·`w:txbxContent` 카운트 == 0을 **코어 게이트로 유지** — 다단 `.docx`는 PASS 불가). **PDF·추출된 plain/markdown 텍스트만으로는 컬럼 검출 신뢰 불가** → 원본 좌표 분석이 없으면 '검출 불가, 사용자 경고'로 강등한다(추출이 다단을 단일 스트림으로 reflow). 공백-갭 휴리스틱(탭/2칸+ ≥3개)은 약한 보조 신호로만 쓰고 거짓양성(우측 정렬 날짜줄)을 고지한다 |
| C4 | 표·텍스트박스 부재 | 표 구조 0개 | 마크다운 표 구분자(`\|---\|`)·HTML `<table>`·텍스트박스 마커 출현 횟수 **= 0** |
| C5 | 이미지·아이콘·스킬바 부재 | 그래픽 요소 0개 | 이미지 마크업(`![]`, `<img`)·이모지/심볼로 표기된 연락처 아이콘·"skill bar" 채움문자(예: ●●●○○, █) 출현 횟수 **= 0** |
| C6 | 연락처가 본문 상단에 위치 | 이메일·전화가 헤더/푸터가 아닌 본문 첫 영역에 존재 | 본문 텍스트 첫 15% 구간(또는 첫 5줄) 안에서 이메일 정규식(`[\w.+-]+@[\w-]+\.[\w.]+`) 매치 **≥ 1** 그리고 전화 패턴 매치 **≥ 1** |
| C7 | 일관된 날짜 형식 | 경력/학력 기간이 ATS가 인식하는 형식으로 통일 | 날짜 토큰을 추출해 허용 패턴(`MMM YYYY`, `Month YYYY`, `MM/YYYY`, `YYYY.MM`, `YYYY-MM`) 중 **단일 패턴 비율 ≥ 90%**. 혼용·"현재/Present" 외 자유서술 날짜 비율 < 10% |
| C8 *(advisory)* | JD 하드스킬 키워드 커버리지 | JD 상위 키워드의 충분 비율을 본문이 포함 | 산출물 본문에 존재하는 키워드 개수 M / JD 추출 키워드 N → **M/N ≥ 0.70 = 권장 출발점(advisory·비차단; 0.70은 법칙이 아니라 출발점이며 AI가 JD 규모·역할 수에 맞게 조정)**. 바로 옆 75%+(Jobscan 권장)/80%(스위트스폿)는 **비구속 상류 참조치 — 제2 임계값 아님**(단일 합격선은 0.70 하나). 매칭은 raw substring이 아니라 **외부 AI가 원문 JD·이력서 텍스트를 정규화·동의어 묶음(JD 요구사항 자체는 불변)한 토큰 집합을 토큰 경계로** 센다(raw substring 금지; ats.md R4 동일 원본; `Java`⊂`JavaScript` 거짓양성 차단). JD 미제공 시 N/A 처리하고 사유 기록. **축 구분(메타):** 이 C8 = JD 키워드 *표면 존재(presence)* M/N≥0.70 **advisory**. `responsiveness-on-target` C8 = JD *필수요건 응답(response)* 커버리지 ≥80% **critical** — **다른 축**이라 한 자소서가 한쪽 통과·다른 쪽 미달이어도 **충돌이 아니다**(키워드가 표면에 있어도 요건에 *응답*하지 않을 수 있고, 요건에 응답해도 ATS 표면 키워드가 모자랄 수 있다) |
| C9 | 직무명(target job title) 일치 | JD의 핵심 직무명이 본문에 등장 | JD 헤드라인 직무명을 본문(이력서 요약/타이틀, LinkedIn 헤드라인)에서 정확/근접 일치로 탐색 → 매치 **≥ 1** |
| C10 | 키워드 스터핑 방지(과최적화) | 특정 키워드 반복이 과하지 않음 | C8 키워드 각각의 본문 등장 횟수 중 **어떤 단일 키워드도 6회 초과 금지**, 그리고 키워드 토큰이 전체 토큰에서 차지하는 비율 **< 6%**. 위반 키워드 개수 = 0 목표 |
| C11 | 약어·풀네임 병기 | 핵심 약어가 풀네임과 함께 1회 이상 병기 | JD/본문 공통 약어(예: ATS, SQL, PM) 중 본문에 약어만 단독 등장하고 풀네임 동반이 0인 항목 개수 → **0 목표**(파서/사람 양쪽 매칭 보장) |
| C12 | 파일 형식 안전 | 제출 형식이 `.docx` 또는 텍스트 레이어 있는 `.pdf` | 산출물 export 시 형식이 `.docx`/`.pdf`(텍스트 레이어 존재) 중 하나. 스캔 이미지 PDF·`.hwp`만 단독 제출 = 불합격 신호 |

> 측정 주체 안내: 위 패턴/카운트는 연결된 AI가 본문 텍스트(이미 추출된 플레인/마크다운)에 대해 직접 세면 된다. CareerMate는 원문 추출(`read_document`)과 본 루브릭만 제공한다.

## 3. 불합격 시 처리(루프 연결)

불합격 항목이 하나라도 있으면, 연결된 AI는 **저장(`save_*`)·내보내기(`export_cover_letter`) 전에** 아래 순서로 수정하고 재검증(C1–C12 재실행)한다. 통과까지 반복하되, 사실·수치·고유명사는 절대 변경하지 않는다.

- **C1/C2 (헤더):** 창의적 헤더를 표준 라벨로 치환한다(예: "내 이야기" → "Experience", "보유 역량" → "Skills"). 누락된 표준 섹션은 기존 내용을 재배치해 신설.
- **C3/C4/C5 (레이아웃·표·그래픽):** 다단/표/텍스트박스/이미지/스킬바를 제거하고 **단일 컬럼 + 불릿 텍스트**로 평탄화한다. 아이콘은 텍스트 라벨("Email:", "Phone:")로 대체.
- **C6 (연락처):** 헤더/푸터에 있던 연락처를 본문 최상단으로 이동.
- **C7 (날짜):** 가장 많이 쓰인 단일 날짜 형식으로 전부 통일하고, 자유서술 기간을 표준 패턴으로 재작성.
- **C8/C9 (키워드/직무명):** JD에서 누락된 상위 키워드와 직무명을, **실제 경험이 있는 항목에 한해** 자연스럽게 본문에 통합한다. 경험이 없는 키워드는 넣지 않고 갭으로 보고만 한다(허위 금지).
- **C10 (스터핑):** 6회 초과·비율 초과 키워드의 등장 횟수를 줄이고 동의어/맥락 문장으로 분산.
- **C11 (약어):** 첫 등장 시 풀네임 병기(예: "ATS(Applicant Tracking System)") 추가.
- **C12 (형식):** `export_cover_letter` 등으로 `.docx`/텍스트 PDF로 내보내도록 안내. 스캔 PDF는 텍스트 레이어 버전으로 재생성.

재검증 후에도 C8이 JD 미제공으로 N/A면, 사용자에게 대상 공고를 `save_job_posting`으로 저장하도록 안내하고 커버리지 측정을 보류한다. **코어 파스세이프티(C1~C7·C12)가 모두 통과하면 "ATS 호환 확인됨"으로 표시**한다. **advisory 항목(C8~C11 키워드 커버리지 축)은 미달 시 전체 PASS를 막지 않고 갭으로 검출·보고**하며 최종 PASS 판정은 연결 AI가 JD·문맥에 따라 내린다(ats.md가 R5/R10을 advisory로 분리한 것과 동일선). 안내 시 대시보드 링크(`http://127.0.0.1:4319`)를 덧붙인다.

## 4. 출처 (Provenance)

> **증거 한계 고지(ats.md §4와 동일선):** Jobscan은 ATS 최적화 도구를 파는 벤더(파싱 취약성·매치율 중요도 과장 인센티브)이고, '~99.7% ATS 사용'·헤더/푸터 무시 비율·단일 vs 멀티컬럼 실패율 같은 **정량 효과(effect size)는 미검증**이다. **단일 합격선 0.70은 Jobscan(75/80%)을 운영화한 권장 출발점(ats.md R4 동일 원본)이며 비구속 advisory**다. (별개로 `fit-matching.md`가 소유한 InHerSight/CNBC의 비선형 바닥선 관찰은 *지원 결정* 도메인 리서치로, ATS 키워드 임계값 직접 보정 근거가 아니라 방향성 참고일 뿐이다.) 임계값은 advisory로만 쓰고 하드 게이트로 격상하지 마라.

- **Jobscan — ATS Formatting Mistakes / Match Rate Guidance** — 표·다단·헤더/푸터·아이콘 금지, 연락처 본문 배치, 표준 헤더, 매치율 권장 75%+(스위트스폿 80%), 채용담당자 ~99.7% ATS 사용 통계 근거 · https://www.jobscan.co/blog/ats-formatting-mistakes/ , https://support.jobscan.co/hc/en-us/articles/41334833854099-What-match-rate-should-I-aim-for
- **Jobscan — Tables & Columns Break Parsing** — 선형 파싱·다단/표가 텍스트 순서를 깨 "word salad"가 되는 메커니즘 근거 · https://www.jobscan.co/blog/resume-tables-columns-ats/
- **Indeed Career Advice — How To Write an ATS Resume** — 표준 섹션 헤더(Work Experience/Education/Skills), 역연대기 형식, JD 키워드 자연 통합, 표준 폰트 권장 근거 · https://www.indeed.com/career-advice/resumes-cover-letters/ats-resume-template
- **Ohio Northern University Career Center — ATS Resume Guide (PDF)** — 대학 커리어센터 1차 자료: 표준 헤더·다단/헤더푸터/텍스트박스 회피·연락처 본문 배치 근거 · https://my.onu.edu/sites/default/files/applicant_tracking_system_resume_guide.pdf
- **프레임워크 근거:** 위 항목들의 공통 합의(single-column, standard headings, body-placed contact, JD keyword coverage)를 셀 수 있는 카운트/비율 체크로 환원함. 날짜 형식·약어 병기·스터핑 임계치는 Jobscan/Indeed 권고를 정규식·카운트 규칙으로 운영화한 것.

## 5. Phase B 힌트

- **MCP 도구 아이디어:** `get_verifier({ id: "ats-compat" })` — 본 루브릭(JSON 형태의 C1–C12 + 패턴/임계치)을 연결된 AI에게 그대로 serve. 보조로 `get_jd_keywords({ job_id })`가 저장된 공고에서 상위 하드스킬/직무명 키워드 집합(N)을 추출해 C8/C9/C10 카운트의 입력으로 제공.
- **데이터 형태 힌트:**
  - 루브릭 항목: `{ id, check, pass_rule, measure: { type: "count"|"ratio"|"presence"|"regex", target, threshold, pattern } }` 배열.
  - JD 키워드 페이로드: `{ job_id, hard_skills: string[], job_titles: string[], abbreviations: [{ short, long }] }` — C8(분모 N), C9, C11 입력.
  - 검증 결과 로그: `{ artifact_id, results: [{ id, passed, observed, threshold }], overall_pass, revised: boolean }` — 루프 재검증 추적용. `save_fit_analysis`/버전 메타에 첨부 가능.
  - 표준 헤더 화이트리스트와 허용 날짜 패턴은 도구가 상수로 보유해 클라이언트별 일관성 확보.
