# 동반 MCP 도구 (Companion MCP Servers)

CareerMate는 구직 공고를 직접 수집하지 않는다. 설계 원칙이 **로컬·무네트워크**이기 때문이다 — 사용자 데이터는 `~/.careermate` 밖으로 나가지 않고, CareerMate는 (선택적 버전 확인 외) 외부 API를 직접 호출하지 않는다. 공고 발굴은 "두뇌"인 사용자의 AI가 맡는다.

이 문서는 **공고 수집 역할을 담당하는 동반 MCP 서버**를 정리하고, 그 결과를 CareerMate에 넘기는 핸드오프 패턴을 설명한다.

---

## 왜 페어링인가

| 역할 | 담당 |
|------|------|
| 공고 검색·수집 | 동반 MCP 서버 또는 AI 브라우징 도구 |
| 적합도 분석·자소서 작성 | 사용자의 AI (Claude/Gemini 등) |
| 데이터 저장·추적 | CareerMate (`save_job_posting`, `save_fit_analysis` 등) |

CareerMate가 네트워크 호출을 하지 않으므로, 외부 잡보드와 연결하려면 별도 MCP 서버를 AI 클라이언트에 함께 등록해야 한다. 두 서버는 **같은 AI 세션 안에서 함께 동작**하며, AI가 중간 조율자 역할을 한다.

---

## 동반 MCP 서버 일람

| 서버 | 무엇을 함 | 언제 쓰나 | CareerMate 핸드오프 |
|------|-----------|-----------|---------------------|
| **borgius/jobspy-mcp-server** ★77 | JobSpy 래퍼. LinkedIn·Indeed·Glassdoor·Google·ZipRecruiter를 동시 검색 | 영어권 주요 플랫폼 일괄 탐색 | 결과 공고를 `save_job_posting`으로 저장 |
| **stickerdaniel/linkedin-mcp-server** ★2537 | LinkedIn 오픈소스 MCP: 프로필·기업·채용 공고 | 온보딩 시 LinkedIn 프로필 가져오기 + 공고 발굴 | 프로필 → `save_profile`, 공고 → `save_job_posting` |
| **eliasbiondo/linkedin-mcp-server** ★152 | LinkedIn 비공식 API 래퍼 | stickerdaniel 서버 대안 | 공고 → `save_job_posting` |
| **colophon-group/jobseek** ★62 | Greenhouse·Lever·Ashby·Workday 외 ~54개 ATS 기업 채용 페이지 모니터링 | 특정 기업 커리어 페이지 신규 공고 추적 | 신규 공고 → `save_job_posting` |
| **folathecoder/adzuna-job-search-mcp** ★13 | Adzuna API: 12개국 공고 검색 + 급여 분석 | 연봉 데이터 포함한 다국가 탐색 | 결과 공고 → `save_job_posting` |

> 별점(★)은 이 문서 작성 시점의 GitHub star 수다. 수치는 변할 수 있으며, 인기도가 품질을 보증하지는 않는다.

---

## 핸드오프 패턴

```
1. [동반 MCP] 공고 검색
       ↓ (공고 텍스트·URL·직무명·회사명 등 반환)
2. AI가 save_job_posting 호출 → CareerMate에 저장
       ↓
3. AI가 get_application_context 호출 → 프로필·경력·기존 자소서 맥락 수신
       ↓
4. AI가 적합도 분석 → save_fit_analysis
       ↓
5. (선택) 사용자 동의 후 자소서 작성 → save_cover_letter_version
```

**예시 흐름 (한 세션에서):**
> "LinkedIn에서 백엔드 엔지니어 공고 3개 찾아줘 → 가장 맞는 거 CareerMate에 저장하고 적합도 분석해줘"

AI가 stickerdaniel/linkedin-mcp-server로 공고를 가져온 뒤 `save_job_posting` → `get_application_context` → `save_fit_analysis` 순으로 호출하면 된다. 각 MCP 서버는 독립적으로 등록되며, AI가 둘을 함께 사용한다.

---

## 한국 잡보드 (사람인·잡코리아·원티드)

**원티드·점핏은 이제 CareerMate에 내장**돼 있다 — `search_jobs({ keyword })`가 두 사이트의 무인증 공개 API에서 공고를 가져온다(키·봇우회 불필요, 가져오기만). 그 외 사이트는 아래 경로를 쓴다:

1. **AI 브라우징**: AI 클라이언트에 웹/브라우저 도구가 있으면 공고 URL을 AI에게 넘기고, AI가 직접 본문을 읽어 `save_job_posting`에 텍스트로 저장한다.
2. **복사-붙여넣기**: 브라우징 도구가 없는 환경에서는 사용자가 공고 본문을 복사해 AI에게 붙여넣고, AI가 `save_job_posting`을 호출한다.
3. **공식·공개 API(AI가 직접 호출)**: 키워드 일괄 수집이 필요하면 AI가 다음을 호출해 결과를 `save_job_posting`으로 저장할 수 있다. 단 **CareerMate가 아니라 AI 에이전트가 호출**한다(무네트워크 원칙·법적 안전).
   - **사람인 공식 API** `oapi.saramin.co.kr/job-search`(승인 필요, 500건/일, "Powered by 사람인" 표기 의무) — 가장 깨끗한 합법 경로.
   - **고용24/워크넷 Open API**(work24.go.kr) — 공공·민간 공고, 완전 공개·문서화로 법적 무논란.
   - 원티드/점핏 비공식 공개 엔드포인트는 동작하지만 약관 비보장이라 권장도가 낮고, **잡코리아 검색경로는 robots.txt가 명시 금지**하므로 피한다.

> AGENTS.md의 URL 처리 규칙과 동일: CareerMate는 외부 페이지를 가져오지 않으므로, 공고 수집·호출은 AI가 하고 CareerMate는 결과 텍스트만 저장한다. 자동 대량수집의 법적 경계는 사람인 판례(2017다224395, 대량 기계수집 = 저작권·부정경쟁 위반)를 따른다 — 수집 주체를 사용자 AI로 두는 이 구조가 안전선이다.

---

## 주의 사항

- 동반 도구는 **별개 오픈소스 프로젝트**다. CareerMate가 보증·유지보수하지 않는다.
- 설치 방법·신뢰성·API 키 요건은 각 저장소에서 확인한다.
- LinkedIn 비공식 API 서버는 LinkedIn 이용약관에 따라 제한될 수 있다.
- 동반 서버 없이도 CareerMate는 정상 동작한다 — 공고 본문을 텍스트로 붙여넣어 저장하는 것만으로 모든 워크플로우를 쓸 수 있다.
