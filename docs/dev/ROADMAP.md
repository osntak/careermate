# CareerMate 로드맵

CareerMate는 MCP-우선 로컬 커리어 관리 도구다. 사용자는 자신의 ChatGPT/Claude/Gemini와 대화하고, 그 AI가 CareerMate의 로컬 MCP 도구를 호출해 로컬 커리어 DB를 읽고 쓴다. CareerMate 내부에는 LLM이 없으며(분석·작성은 사용자의 AI가 수행), 모든 데이터는 로컬에만 저장된다.

이 문서는 현재 버전(`0.0.2`)의 MVP 완료 범위와, 지금은 제외하되 구조는 열어둔 향후 과제를 정리한다.

관련 문서: [README](../../README.md), [설치 런북](../../INSTALL.md), [지원 앱·설치 레퍼런스](../SUPPORTED_AI_APPS.md), [워크플로우](../WORKFLOWS.md), [시작하기 워크플로우](../START_WORKFLOW.md)

---

## 현재 버전

- 버전: `0.0.2` (`package.json`)
- 런타임 요구: Node `>=22.5.0` (`node:sqlite` 내장 사용, 네이티브 컴파일 없음)
- 실행 방식: 무빌드(tsx) — `node --no-warnings --import tsx ...`

---

## MVP 완료 항목 (Done)

현재 코드/설정과 일치하는, 동작 검증된 범위다.

### 코어 런타임 / 인프라
- [x] **모노레포 구조**: `packages/{shared,db,core,mcp-tools,exporters,parsers,prompts,workflows}`, `apps/{web,mcp}`, `site`, `docs`, `scripts`
- [x] **무빌드 실행**: TypeScript(ESM)를 `tsx`로 직접 실행 (`npm start`, `npm run dev --watch`, `npm run mcp`)
- [x] **내장 SQLite**: `node:sqlite` 사용 — 별도 네이티브 모듈/컴파일 불필요
- [x] **데이터 디렉터리**: 기본 `~/.careermate`, 환경변수 `CAREERMATE_DATA_DIR`로 변경 가능
- [x] **DB 파일 및 부속 디렉터리**: `careermate.sqlite`, `exports/`, `backups/`, `uploads/`, 런타임 핸드셰이크 `server.json`
- [x] **환경변수 지원**: `CAREERMATE_DATA_DIR`, `CAREERMATE_PORT`, `CAREERMATE_NO_OPEN`
- [x] **npm 스크립트**: `start`, `dev`, `mcp`, `migrate`, `seed`, `doctor`, `test`, `test:ui`, `typecheck`

### 로컬 대시보드 + API (`apps/web`)
- [x] **로컬 대시보드 서버**: 기본 `http://127.0.0.1:4319`, 포트 사용 중이면 다음 포트로 폴백, 브라우저 자동 오픈(`CAREERMATE_NO_OPEN`으로 비활성화)
- [x] **프레임워크/CDN 없는 프런트엔드**: 바닐라 JS + 자체 CSS 디자인시스템
- [x] **7개 페이지**: Home, Profile, Jobs(목록+상세), Applications(칸반), Documents(자소서 버전 타임라인 + 이력서), Interview, Settings
- [x] **다크모드** 지원

### 데이터베이스 (`packages/db`)
- [x] **12개 테이블**: `profile`, `experiences`, `projects`, `skills`, `documents`, `cover_letters`, `cover_letter_versions`, `jobs`, `fit_analyses`, `applications`, `interview_preps`, `activities` (+ 스키마 버전용 `_meta`)
- [x] **마이그레이션/시드**: `npm run migrate`, `npm run seed`
- [x] **지원 상태 8단계**: `draft`(작성 중), `planned`(지원 예정), `applied`(지원 완료), `document_passed`(서류 합격), `interview`(면접 진행), `final_passed`(최종 합격), `rejected`(불합격), `on_hold`(보류) — `document_passed` 이상에서 면접 준비 해금

### MCP 서버 (`apps/mcp`) + 도구 (`packages/mcp-tools`)
- [x] **MCP stdio 서버**: `@modelcontextprotocol/sdk` 기반, AI 클라이언트가 `npm run mcp`로 기동, 대시보드와 동일 DB 공유
- [x] **커리어 워크플로 MCP 도구 (37개)** — 전체 최신 목록은 [`MCP_TOOLS.md`](../MCP_TOOLS.md):
  - 온보딩/프로필: `get_onboarding_status`, `save_profile`, `get_profile`
  - 문서: `add_resume`, `get_resumes`, `get_cover_letters`, `delete_cover_letter`
  - 경력·프로젝트·스킬: `add_experience`, `get_experiences`, `add_project`, `get_projects`, `add_skill`, `get_skills`
  - 공고: `save_job_posting`, `get_job_posting`, `list_jobs`, `delete_job_posting`
  - 컨텍스트(핵심): `get_application_context`
  - 분석/작성: `save_fit_analysis`, `save_cover_letter_version`, `add_resume(kind=career_description)`
  - 지원/면접: `update_application_status`, `save_interview_prep`
  - 글쓰기: `get_writing_style_guide`
  - 출력/연동: `export_cover_letter`, `open_dashboard`, `open_application`, `list_recent_activity`, `get_workflow_guide`

### 워크플로우 (`packages/workflows`)
- [x] **6종 워크플로우**: `onboarding`, `analyze_job`, `write_cover_letter`, `write_career_description`, `manage_application_status`, `prepare_interview`

### 기능 흐름 (저장/관리)
- [x] **온보딩**: 프로필·경력·프로젝트·스킬 입력 흐름
- [x] **공고 저장**: 공고 본문 저장(회사명/직무/키워드 구조화는 AI가 수행)
- [x] **적합도(fit) 분석 저장**: `save_fit_analysis`
- [x] **자소서 버전 관리**: `cover_letter_versions` 테이블 + 타임라인 (Documents 페이지)
- [x] **지원 상태 관리**: 8단계 칸반 (Applications 페이지) + `update_application_status`
- [x] **면접 준비 저장**: `save_interview_prep` (공고 기준 저장, 서류 합격 이상에서는 우선 제안)

### Export
- [x] **자소서 export**: `export_cover_letter` → `exports/` 디렉터리에 저장 (`format`: `md`(Markdown) 또는 `html`(인쇄용 HTML, 브라우저에서 PDF로 저장), 기본값 `md`)

### 보안
- [x] `127.0.0.1` 전용 바인딩
- [x] **Host 허용목록**(DNS 리바인딩 차단)
- [x] **CSRF 세션 토큰**: 변경 요청 보호, HTML `<meta>` 주입 방식
- [x] **외부 Origin 차단**
- [x] **정적 파일 경로 traversal 차단**
- [x] **8MB 본문 제한**
- [x] **민감 본문 보호**: 이력서/자소서 본문은 로그·에러 응답에 미노출

### 설치 안내 / 문서 / 테스트
- [x] **설치**: `npm install` → `npm start` (대시보드 자동 오픈), MCP 서버는 AI 클라이언트가 `npm run mcp`로 기동
- [x] **설치 페이지**: `site`
- [x] **문서**: `docs`
- [x] **진단**: `npm run doctor`
- [x] **타입 검사**: `npm run typecheck` (`tsc --noEmit`)
- [x] **E2E 테스트** (`scripts/test.ts`, `npm test`): 17개 — 보안 / 업무 흐름 / MCP stdio / 대시보드↔MCP 동일 DB 양방향
- [x] **UI 스모크 테스트** (`scripts/ui-smoke.ts`, `npm run test:ui`): Playwright로 8개 페이지 렌더 검증
- [x] 두 테스트 스위트 모두 통과

---

## 후순위 / 향후 과제 (Backlog)

아래 항목은 **지금은 제외하되, 구조는 열어둔다**. 즉 현재 MVP 범위에서 구현하지 않지만, 패키지 경계·데이터 모델·도구 인터페이스가 이후 추가를 수용할 수 있도록 설계되어 있다.

### 공고 크롤링 (사람인 / 잡코리아 / 원티드)
- 현재는 사용자가 공고 본문을 붙여넣으면 AI가 직접 구조화해 `save_job_posting`으로 저장한다. URL 입력 시 자동 크롤링은 미구현.
- 구조 개방: 텍스트 정제 로직이 `packages/parsers`로 분리되어 있어(대시보드 `/api/parse/job`에서 사용), 사이트별 크롤러/어댑터를 추가하는 형태로 확장 가능.
- **지금은 제외, 구조는 열어둠.**

### 클라우드 동기화
- 현재 모든 데이터는 로컬(`~/.careermate`)에만 저장되며 외부 전송이 없다.
- 구조 개방: 데이터 접근이 `packages/db`로 일원화되어 있어, 동기화 계층을 별도 어댑터로 얹을 여지가 있다.
- **지금은 제외, 구조는 열어둠.** (로컬 전용·프라이버시가 현재 설계 원칙)

### ChatGPT App / Claude Extension 마켓 등록
- 현재는 사용자가 로컬에서 `npm run mcp`로 직접 MCP 서버를 연결한다.
- 구조 개방: MCP stdio 서버(`apps/mcp`)가 표준 `@modelcontextprotocol/sdk`를 사용하므로, 패키징/배포 형태로 마켓 등록을 추진할 수 있다.
- **지금은 제외, 구조는 열어둠.**

### 브라우저 확장
- 채용 사이트에서 공고를 바로 CareerMate로 보내는 확장.
- 구조 개방: 로컬 API(`apps/web`)와 파서가 이미 분리되어 있어 확장에서 호출할 엔드포인트를 노출하는 형태로 연결 가능.
- **지금은 제외, 구조는 열어둠.**

### Tauri / Electron 데스크톱 래퍼
- 현재는 Node + 브라우저 기반 로컬 앱으로 동작한다.
- 구조 개방: 대시보드가 프레임워크/CDN 의존이 없는 정적 자산이라 데스크톱 셸로 감싸기에 적합하다.
- **지금은 제외, 구조는 열어둠.**

### DOCX export
- 현재 export는 Markdown과 인쇄용 HTML(브라우저에서 PDF로 저장) 두 포맷만 지원한다(`packages/exporters`). 바이너리 DOCX 출력은 미구현.
- 구조 개방: 출력 로직이 `packages/exporters`로 분리되어 있어, DOCX 등 포맷별 익스포터를 추가하는 형태로 확장 가능.
- **지금은 제외, 구조는 열어둠.**

### 다국어 (i18n)
- 현재 UI/프롬프트는 단일 언어 중심이다.
- 구조 개방: 프롬프트가 `packages/prompts`로, UI 문자열이 대시보드 자산으로 분리되어 있어 다국어 리소스 도입 여지가 있다.
- **지금은 제외, 구조는 열어둠.**

---

## 비목표 (Non-Goals)

- **CareerMate 내부에 LLM을 두지 않는다.** 분석·작성은 사용자의 AI(ChatGPT/Claude/Gemini)가 MCP를 통해 수행한다.
- **로컬 우선 원칙을 깨지 않는다.** 위 향후 과제(특히 클라우드 동기화)는 사용자 선택형·옵트인 전제하에서만 검토한다.
