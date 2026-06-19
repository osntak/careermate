# CareerMate

[![npm](https://img.shields.io/npm/v/careermate?logo=npm&color=cb3837)](https://www.npmjs.com/package/careermate) [![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![node](https://img.shields.io/node/v/careermate)](https://nodejs.org)

**한국어** · [English](#careermate-english)

**MCP 우선(MCP-first) 로컬 커리어 관리 도구.** 내 컴퓨터에서 동작하는 AI 에이전트(Claude Desktop·Claude Code·Codex 등)를 인터페이스로 쓰고, CareerMate는 당신의 커리어 데이터를 **이 컴퓨터에만** 저장한 뒤 MCP로 노출합니다.

---

## 핵심 철학

- **MCP 우선** — 새 앱 사용법을 익힐 필요가 없습니다. 내 컴퓨터에서 동작하는 AI 에이전트(Claude Desktop·Claude Code·Codex 등 로컬 MCP 클라이언트)와 대화하면, 그 AI가 CareerMate의 로컬 MCP 도구를 호출해 당신의 커리어 DB를 읽고 씁니다.
- **로컬 우선** — 모든 데이터는 당신의 컴퓨터에만 저장됩니다(`~/.careermate`). 외부 서버로 전송하지 않습니다. 대시보드 웹 서버는 `127.0.0.1`(이 컴퓨터)에만 연결됩니다.
- **LLM 비내장** — CareerMate 안에는 AI가 들어 있지 않습니다. 분석·글쓰기 같은 “생각하는 일”은 **당신의 AI**가 하고, CareerMate는 데이터를 **안전하게 보관·조회**하는 역할만 합니다.

> 쉽게 말해: 당신의 AI가 “두뇌”, CareerMate는 그 두뇌가 꺼내 쓰는 “커리어 서랍장”입니다.

---

## 무엇을 하나요?

프로필·이력서·자기소개서·채용공고·지원 현황·면접 준비를 로컬 SQLite에 구조화해 저장하고, AI 어시스턴트가 MCP 도구로 그 데이터를 읽고 씁니다. 전형적인 흐름은 이렇습니다.

1. 프로필·이력서 등록 → 2. 채용공고 저장·파싱 → 3. 적합도(핏) 분석 → 4. 맞춤 자기소개서 작성·버전 관리 → 5. 지원 상태 관리 → 6. 면접 준비

언제든 대시보드를 열어 저장된 데이터를 눈으로 확인할 수 있습니다. 자세한 단계별 런북은 [`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md)를 참고하세요.

---

## 주요 기능

- **AI와 대화로 모든 작업** — MCP 도구 37개로 온보딩·프로필·이력서·자소서·공고·핏 분석·지원 상태·면접 준비·전문가 플레이북·AI 티 안 나는 글쓰기까지 처리.
- **지원 상태 8단계 관리** — `draft`(작성 중) · `planned`(지원 예정) · `applied`(지원 완료) · `document_passed`(서류 합격) · `interview`(면접 진행) · `final_passed`(최종 합격) · `rejected`(불합격) · `on_hold`(보류). `document_passed` 이상에서는 면접 준비를 다음 행동으로 제안합니다.
- **자기소개서 버전 관리** — 공고별로 자소서 버전을 쌓고 타임라인으로 비교, 파일로 내보내기.
- **채용공고 파싱** — 붙여넣은 공고 텍스트를 구조화해 저장.
- **로컬 대시보드** — 프레임워크·CDN 없는 바닐라 JS로 만든 7페이지 웹 화면(다크모드 지원).
- **데이터 내보내기/삭제** — Settings 페이지에서 직접.

---

## 구성

두 개의 로컬 프로세스가 같은 데이터베이스를 공유합니다.

| 프로세스 | 실행 | 역할 |
| --- | --- | --- |
| **대시보드 웹 서버** | `npm start` | `http://127.0.0.1:4319` — 내 데이터를 눈으로 확인·관리. `127.0.0.1`에만 바인딩. |
| **MCP 서버** | `npm run mcp` | stdio 기반. 보통 AI 클라이언트가 자동 실행. 도구 37개 제공. |

---

## 빠른 시작

### 요구사항

- **Node.js >= 22.5.0** — 내장 `node:sqlite`를 사용하므로 컴파일러나 네이티브 빌드가 **필요 없습니다**.
- 버전 확인:
  ```bash
  node --version
  ```
  `v22.5.0` 미만이거나 명령을 찾지 못하면 설치하세요 — Windows: `winget install OpenJS.NodeJS.LTS`, macOS: `brew install node`, 그 외: https://nodejs.org 에서 최신 LTS.

### 1) 설치

빌드 단계가 없습니다. TypeScript는 `tsx`로 바로 실행됩니다. (소스를 직접 받으려면 `git clone https://github.com/osntak/careermate.git`, 클론 없이 바로 쓰려면 `npx -y careermate init`을 쓰세요.)

```bash
npm install
```

### 2) 대시보드 실행

```bash
npm start
```

- 기본 주소는 `http://127.0.0.1:4319` 이며 브라우저가 자동으로 열립니다.
- 포트가 사용 중이면 자동으로 다음 빈 포트로 폴백하니, 터미널에 출력된 실제 주소를 확인하세요.
- 종료는 터미널에서 `Ctrl+C`.

### 3) 데모 데이터로 둘러보기(선택)

빈 화면이 낯설다면 예시 데이터를 넣어 기능을 미리 체험할 수 있습니다.

```bash
npm run seed
```

### 4) AI(MCP)에 연결

CareerMate는 **내 컴퓨터에서 로컬 stdio MCP 서버를 띄울 수 있는 AI**에서 동작합니다. (ChatGPT·Gemini의 웹/앱은 클라우드에서 동작해 로컬 stdio MCP 서버에 직접 연결할 수 없습니다.)

설치는 크게 **3가지 — "누가 설치하느냐"** 의 차이입니다. 아래 순서대로 골라 쓰세요.

#### ① 에이전트가 대신 설치 (권장)

작업 폴더에서 **명령을 실행할 수 있는 AI**(Claude Code 데스크톱 **"Code" 탭** / CLI · Codex CLI · Gemini CLI · Cursor 등)에게 한 문장으로 시키면, AI가 `careermate.life/llms-install.txt`를 읽어 **npm 설치 + MCP 등록**까지 해줍니다.

```
CareerMate를 설치하고 설정해줘. INSTALL.md를 따라 진행해줘.
```

AI가 [`INSTALL.md`](INSTALL.md) 런북을 따라 진행하고, 첫 실행 시 프로젝트 서버에 대한 **일회성 승인**만 눌러 주면 됩니다. (소스 폴더에서 직접 작업 중이면 `npm install` 후 `npm run init`.)

> Claude "Code" 탭은 비개발자에게 가장 매끄럽습니다 — 작업 폴더 하나를 잡고 데이터까지 그 안에 두는 방식입니다. (Pro 이상 구독 필요, Windows는 Git 사전 설치.) Codex는 `~/.codex/config.toml`에, Gemini/Cursor 등은 각 클라이언트 설정에 등록됩니다.

#### ② npm 명령 직접

터미널에 한 줄이면 감지된 AI 앱에 자동 등록됩니다.

```bash
npx -y careermate init
```

그 외 클라이언트(Cursor·Cline·Windsurf 등)는 `npx -y careermate init -- --print`로 등록용 설정 블록을 출력해 수동으로 붙일 수 있습니다.

#### ③ `careermate.zip` (Claude Desktop "채팅" 앱 전용 · Node 불필요 폴백)

터미널·Node 없이 붙이는 **유일한 길**입니다. `dist/careermate.zip`(`npm run build:mcpb`로 생성)을 압축 해제한 뒤, Claude Desktop의 **Settings → Extensions → Advanced settings → Install extension…** 에서 압축을 푼 폴더를 추가하고 재시작합니다. 단 Claude Desktop **내장 Node 버전에 의존해 불안정할 수 있습니다**(Node<22.5면 동작 불가).

`.mcpb` 직접 추가는 일부 Claude Desktop 버전에서 실패하는 알려진 이슈가 있어, 현재는 ZIP 압축 해제 후 폴더 추가를 권장합니다. `.mcpb`와 `.zip`은 같은 번들입니다.

연결 후 AI 클라이언트를 **완전히 재시작**하고, `get_onboarding_status`를 호출해 달라고 시켜 연결을 검증하세요. 자세한 절차는 AI용 런북 **[`INSTALL.md`](INSTALL.md)**, 사람용 설치 안내 **https://careermate.life**, 설치 후 사용법 **[`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md)**, 지원 앱 매트릭스 **[`docs/SUPPORTED_AI_APPS.md`](docs/SUPPORTED_AI_APPS.md)**를 참고하세요.

---

## 대시보드 7페이지

| 페이지 | 설명 |
| --- | --- |
| **Home** | 현재 상태·다음 할 일 한눈에. |
| **Profile** | 프로필, 경력(experiences), 프로젝트, 스킬 관리. |
| **Jobs** | 저장한 채용공고 목록과 상세(공고 내용·핏 분석). |
| **Applications** | 지원 현황을 8단계 상태로 보는 칸반 보드. |
| **Documents** | 자기소개서 버전 타임라인과 이력서. |
| **Interview** | 면접 준비 자료(`document_passed` 이상에서 해금). |
| **Settings** | 데이터 내보내기·삭제, 환경 정보. |

다크모드를 지원합니다.

---

## MCP 도구 한눈에 (37개)

| 분류 | 도구 |
| --- | --- |
| 온보딩 | `get_onboarding_status` |
| 프로필 | `save_profile` · `get_profile` |
| 이력서 | `read_document` · `add_resume` · `get_resumes` · `open_inbox` · `read_inbox` |
| 경력·프로젝트·스킬 | `add_experience` · `get_experiences` · `add_project` · `get_projects` · `add_skill` · `get_skills` |
| 자기소개서 | `get_cover_letters` · `save_cover_letter_version` · `delete_cover_letter` · `export_cover_letter` |
| 채용공고 | `save_job_posting` · `get_job_posting` · `list_jobs` · `delete_job_posting` |
| 핵심 컨텍스트 | **`get_application_context`** (지원에 필요한 맥락을 한 번에 모아줌) |
| 핏 분석 | `save_fit_analysis` |
| 지원 상태 | `update_application_status` |
| 면접 준비 | `save_interview_prep` |
| 글쓰기 | `get_writing_style_guide` (AI 티 안 나는 한국어 글쓰기 규칙) |
| 전문가 지식 (Career-OS) | `get_playbook` (도메인 플레이북 16종) · `get_verifier` (저장 전 검증 루브릭 6종) |
| 저장 전 점검 | `validate_cover_letter` (자소서 저장 전 미리보기) · `set_verify_mode` (점검 엄격도 기본/엄격) |
| 대시보드/활동 | `open_dashboard` · `open_application` · `list_recent_activity` · `get_workflow_guide` |
| 업데이트 | `check_for_update` · `update_careermate` |

이 도구들 위에 6종의 워크플로우(`onboarding`, `analyze_job`, `write_cover_letter`, `write_career_description`, `manage_application_status`, `prepare_interview`)가 정의되어 있어, AI가 단계별로 자연스럽게 안내합니다.

---

## 프로젝트 구조

```
CareerMate/
├─ apps/
│  ├─ web/            # 대시보드 + 로컬 API 서버 (npm start)
│  └─ mcp/            # MCP stdio 서버 (npm run mcp)
├─ packages/
│  ├─ shared/         # 공용 타입·zod 스키마·유틸
│  ├─ db/             # node:sqlite DB 접근·스키마·마이그레이션
│  ├─ core/           # 도메인 유스케이스
│  ├─ mcp-tools/      # MCP 도구 37개 정의
│  ├─ knowledge/      # Career-OS 전문가 플레이북·검증 루브릭 serve
│  ├─ exporters/      # 내보내기(자소서 등)
│  ├─ parsers/        # 채용공고 파싱
│  ├─ prompts/        # 프롬프트·안내 문구
│  └─ workflows/      # 워크플로우 6종
├─ site/      # 설치 안내 페이지
├─ docs/              # 문서
├─ scripts/           # migrate / seed / doctor / test 등
└─ package.json
```

- **스택**: TypeScript(ESM), 무빌드 실행(`tsx`), 내장 `node:sqlite`(네이티브 컴파일 없음), `zod`, `@modelcontextprotocol/sdk`. 대시보드는 프레임워크·CDN 없는 바닐라 JS + 자체 CSS 디자인 시스템.
- **데이터 저장소**: 12개 테이블(profile, experiences, projects, skills, documents, cover_letters, cover_letter_versions, jobs, fit_analyses, applications, interview_preps, activities). 두 프로세스(대시보드·MCP)가 **같은 SQLite DB**를 공유합니다.

---

## npm 스크립트

| 스크립트 | 설명 |
| --- | --- |
| `npm install` | 의존성 설치 (빌드 없음) |
| `npm start` | 대시보드 웹 서버 실행 |
| `npm run dev` | 대시보드 실행 (파일 변경 시 자동 재시작) |
| `npm run mcp` | MCP 서버 실행 (stdio) |
| `npm run migrate` | DB 생성/업그레이드 |
| `npm run doctor` | 설치/환경 점검 |
| `npm run seed` | 예시 데이터 삽입 |
| `npm run build` | 배포용 플레인 JS 번들(`dist/`) 생성 (esbuild) |
| `npm run build:mcpb` | Claude Desktop용 번들 빌드 → `dist/careermate.mcpb`와 폴더 설치용 `dist/careermate.zip` 생성(+ `site/`로 복사). manifest+서버코드를 한 파일로 묶어 배포. |
| `npm test` | E2E 테스트 실행 |
| `npm run test:ui` | Playwright UI 스모크 테스트 |
| `npm run typecheck` | 타입 검사 (`tsc --noEmit`) |

---

## 데이터 위치 & 환경변수

- 기본 폴더: `~/.careermate` (Windows: `%USERPROFILE%\.careermate`).
  - `careermate.sqlite` — 데이터베이스 파일
  - `exports/` — 내보낸 파일
  - `backups/` — 백업
  - `uploads/` — 업로드 파일
  - `server.json` — 실행 중 핸드셰이크 정보
- 환경변수로 동작을 바꿀 수 있습니다.
  - `CAREERMATE_DATA_DIR` — 데이터 폴더 위치 변경
  - `CAREERMATE_PORT` — 대시보드 포트 고정
  - `CAREERMATE_NO_OPEN` — 시작 시 브라우저 자동 열기 끄기

---

## 보안 / 프라이버시

- **로컬 전용 바인딩** — 대시보드 서버는 `127.0.0.1`(loopback)에만 바인딩되어 외부에서 접근할 수 없습니다.
- **DNS 리바인딩 차단** — Host 허용목록으로 검증.
- **변경 요청 보호** — CSRF 세션 토큰(HTML `meta`로 주입), 외부 Origin 차단.
- **정적 파일 보호** — 경로 traversal(상위 폴더 탈출) 차단.
- **본문 크기 제한** — 요청 본문 8MB 제한.
- **민감 정보 비노출** — 이력서·자기소개서 본문은 로그나 에러 응답에 노출되지 않습니다.
- **외부 전송 없음** — MCP 서버는 네트워크 호출을 하지 않으며, 모든 데이터는 당신의 컴퓨터에만 남습니다. 내보내기·삭제는 대시보드 **Settings**에서 직접 할 수 있습니다.

---

## 문서

- [`INSTALL.md`](INSTALL.md) — AI 어시스턴트가 따라가는 설치·연결 런북(소스 직접 실행 기준).
- [`AGENTS.md`](AGENTS.md) — Codex용 영속 지침. / [`CLAUDE.md`](CLAUDE.md) — Claude Code용 영속 지침.
- [`docs/SUPPORTED_AI_APPS.md`](docs/SUPPORTED_AI_APPS.md) — **설치 레퍼런스 허브**: 지원 앱 매트릭스 + 설치 3방식(에이전트/npx/zip) + 클라이언트별 수동 MCP 설정 + 알려진 제약. (사람용 안내는 https://careermate.life)
- [`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md) — 등록부터 면접 준비까지 단계별 작업 런북.
- [`docs/FAQ.md`](docs/FAQ.md) — **자주 묻는 질문 / 문제 해결**: "PDF가 안 읽혀요", "분석이 안 돼요", "공고 URL은 어떻게 넣어요" 등.
- [`docs/dev/TODO.md`](docs/dev/TODO.md) — 남은 작업과 v1 범위 밖 항목.
- [`CHANGELOG.md`](CHANGELOG.md) — 버전별 변경 이력. / [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`SECURITY.md`](SECURITY.md) · [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — 기여·보안·행동 강령.

---

## 테스트

```bash
npm test        # E2E 테스트 (보안·업무흐름·MCP stdio·대시보드↔MCP 동일 DB 양방향)
npm run test:ui # 대시보드 페이지 렌더 스모크 (Playwright)
npm run typecheck
```

기타 유용한 스크립트: `npm run migrate`(DB 생성/업그레이드), `npm run seed`(예시 데이터), `npm run doctor`(설치·환경 점검).

---

## 라이선스

MIT 라이선스 — 전문은 [`LICENSE`](LICENSE) 파일을 참고하세요.

<br>

---
---

# CareerMate (English)

[한국어](#careermate) · **English**

**An MCP-first, local-only career workspace.** You drive it through an AI agent that runs on your own computer (Claude Desktop, Claude Code, Codex, …); CareerMate stores your career data **only on this machine** and exposes it over MCP.

---

## Core philosophy

- **MCP-first** — No new app to learn. You talk to an AI agent running on your machine (Claude Desktop, Claude Code, Codex, and other local MCP clients), and that AI calls CareerMate's local MCP tools to read and write your career database.
- **Local-first** — All data lives only on your computer (`~/.careermate`). Nothing is sent to external servers. The dashboard web server binds only to `127.0.0.1` (this machine).
- **No built-in LLM** — There is no AI inside CareerMate. The "thinking" — analysis, writing — is done by **your AI**; CareerMate only stores and serves the data safely.

> In short: your AI is the "brain," and CareerMate is the "career drawer" it reaches into.

---

## What it does

It stores your profile, resumes, cover letters, job postings, application pipeline, and interview prep as structured data in a local SQLite database, and your AI assistant reads and writes that data through MCP tools. The typical flow:

1. Register profile & resume → 2. Save & parse job posting → 3. Fit analysis → 4. Write & version cover letters → 5. Manage application status → 6. Interview prep

You can open the dashboard at any time to see your stored data. For a step-by-step runbook, see [`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md).

---

## Key features

- **Everything through conversation with AI** — 35 MCP tools cover onboarding, profile, resumes, cover letters, job postings, fit analysis, application status, interview prep, expert playbooks, and human-sounding writing.
- **8-stage application status** — `draft` · `planned` · `applied` · `document_passed` · `interview` · `final_passed` · `rejected` · `on_hold`. Interview prep is suggested at `document_passed` or later.
- **Cover-letter versioning** — Stack versions per posting, compare on a timeline, export to a file.
- **Job-posting parsing** — Turn pasted posting text into structured records.
- **Local dashboard** — A 7-page web UI built with framework-free, CDN-free vanilla JS (dark mode supported).
- **Export / delete your data** — Directly from the Settings page.

---

## Architecture

Two local processes share the same database.

| Process | Run | Role |
| --- | --- | --- |
| **Dashboard web server** | `npm start` | `http://127.0.0.1:4319` — view and manage your data. Binds to `127.0.0.1` only. |
| **MCP server** | `npm run mcp` | stdio-based. Usually launched automatically by the AI client. Provides 35 tools. |

---

## Quick start

### Requirements

- **Node.js >= 22.5.0** — uses the built-in `node:sqlite`, so **no compiler or native build** is required.
- Check your version:
  ```bash
  node --version
  ```
  If it's below `v22.5.0` or the command isn't found, install it — Windows: `winget install OpenJS.NodeJS.LTS`, macOS: `brew install node`, otherwise the latest LTS from https://nodejs.org.

### 1) Install

There is no build step. TypeScript runs directly via `tsx`. (To get the source directly, `git clone https://github.com/osntak/careermate.git`, or skip the clone and use `npx -y careermate init`.)

```bash
npm install
```

### 2) Run the dashboard

```bash
npm start
```

- The default address is `http://127.0.0.1:4319` and the browser opens automatically.
- If the port is busy, it falls back to the next free port — check the actual address printed in the terminal.
- Stop it with `Ctrl+C` in the terminal.
- When connected to an AI client, saying "open the dashboard" starts the server in the background if needed, so it is not tied to the AI terminal session.

### 3) Explore with demo data (optional)

If a blank screen feels unfamiliar, seed example data to try the features first.

```bash
npm run seed
```

### 4) Connect to your AI (MCP)

CareerMate works with **any AI that can launch a local stdio MCP server on your machine**. (The web/mobile apps of ChatGPT and Gemini run in the cloud and cannot connect directly to a local stdio MCP server.)

Installation comes down to **three options — "who does the installing."** Pick one, in this order.

#### ① Let the agent install it for you (recommended)

In your working folder, give a one-line instruction to **an AI that can run commands** (Claude Code's desktop **"Code" tab** / CLI, Codex CLI, Gemini CLI, Cursor, …). The AI reads `careermate.life/llms-install.txt` and handles **npm install + MCP registration** for you.

```
Install and set up CareerMate. Follow INSTALL.md.
```

The AI follows the [`INSTALL.md`](INSTALL.md) runbook; on first run you just approve the **one-time** project-server prompt. (If you're working from a source folder directly, run `npm install` then `npm run init`.)

> Claude's "Code" tab is the smoothest for non-developers — you pick one working folder and keep the data inside it. (Requires a Pro-or-higher subscription; on Windows, Git must be pre-installed.) Codex registers in `~/.codex/config.toml`; Gemini/Cursor and others register in their respective client configs.

#### ② Run the npm command yourself

A single line in the terminal auto-registers with the detected AI apps.

```bash
npx -y careermate init
```

For other clients (Cursor, Cline, Windsurf, …), `npx -y careermate init -- --print` prints the registration config block so you can paste it in manually.

#### ③ `careermate.zip` (Claude Desktop "chat" app only · no-Node fallback)

This is the **only path with no terminal and no Node**. Unzip `dist/careermate.zip` (created via `npm run build:mcpb`), add the extracted folder through Claude Desktop's **Settings → Extensions → Advanced settings → Install extension…**, then restart. Note that it **depends on Claude Desktop's bundled Node version** (won't work if that Node is < 22.5).

Direct `.mcpb` install is a known issue in some Claude Desktop builds, so the ZIP folder path is the recommended no-terminal route. The `.mcpb` and `.zip` assets contain the same bundle.

After connecting, **fully restart** the AI client and verify the connection by asking it to call `get_onboarding_status`. For details, see the AI runbook **[`INSTALL.md`](INSTALL.md)**, the human-facing install guide **https://careermate.life**, the post-install usage flow **[`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md)**, and the supported-apps matrix **[`docs/SUPPORTED_AI_APPS.md`](docs/SUPPORTED_AI_APPS.md)**.

---

## The 7 dashboard pages

| Page | Description |
| --- | --- |
| **Home** | Current status and next steps at a glance. |
| **Profile** | Manage profile, experiences, projects, and skills. |
| **Jobs** | List and detail of saved postings (posting content + fit analysis). |
| **Applications** | A kanban board showing your pipeline across the 8 statuses. |
| **Documents** | Cover-letter version timeline and resumes. |
| **Interview** | Interview prep materials and interview-stage next steps. |
| **Settings** | Export/delete data, environment info. |

Dark mode is supported.

---

## MCP tools at a glance (35)

| Category | Tools |
| --- | --- |
| Onboarding | `get_onboarding_status` |
| Profile | `save_profile` · `get_profile` |
| Resume | `read_document` · `add_resume` · `get_resumes` · `open_inbox` · `read_inbox` |
| Experience / projects / skills | `add_experience` · `get_experiences` · `add_project` · `get_projects` · `add_skill` · `get_skills` |
| Cover letter | `get_cover_letters` · `save_cover_letter_version` · `export_cover_letter` |
| Job posting | `save_job_posting` · `get_job_posting` · `list_jobs` |
| Core context | **`get_application_context`** (gathers all context needed for an application in one call) |
| Fit analysis | `save_fit_analysis` |
| Application status | `update_application_status` |
| Interview prep | `save_interview_prep` |
| Writing | `get_writing_style_guide` (rules for human-sounding Korean writing) |
| Expert knowledge (Career-OS) | `get_playbook` (16 domain playbooks) · `get_verifier` (6 pre-save rubrics) |
| Pre-save check | `validate_cover_letter` (dry-run preview before saving) · `set_verify_mode` (check strictness: default/strict) |
| Dashboard / activity | `open_dashboard` · `open_application` · `list_recent_activity` · `get_workflow_guide` |
| Update | `check_for_update` · `update_careermate` |

On top of these tools, six workflows (`onboarding`, `analyze_job`, `write_cover_letter`, `write_career_description`, `manage_application_status`, `prepare_interview`) are defined so the AI can guide you naturally, step by step.

---

## Project structure

```
CareerMate/
├─ apps/
│  ├─ web/            # Dashboard + local API server (npm start)
│  └─ mcp/            # MCP stdio server (npm run mcp)
├─ packages/
│  ├─ shared/         # Shared types, zod schemas, utils
│  ├─ db/             # node:sqlite DB access, schema, migrations
│  ├─ core/           # Domain use cases
│  ├─ mcp-tools/      # The 35 MCP tool definitions
│  ├─ knowledge/      # Career-OS expert playbooks & verifier rubrics (serve)
│  ├─ exporters/      # Exporters (cover letters, etc.)
│  ├─ parsers/        # Job-posting parsing
│  ├─ prompts/        # Prompts and guidance copy
│  └─ workflows/      # The 6 workflows
├─ site/      # Install guide page
├─ docs/              # Documentation
├─ scripts/           # migrate / seed / doctor / test, etc.
└─ package.json
```

- **Stack**: TypeScript (ESM), build-free execution (`tsx`), built-in `node:sqlite` (no native compilation), `zod`, `@modelcontextprotocol/sdk`. The dashboard is framework-free, CDN-free vanilla JS with its own CSS design system.
- **Data store**: 12 tables (profile, experiences, projects, skills, documents, cover_letters, cover_letter_versions, jobs, fit_analyses, applications, interview_preps, activities). The two processes (dashboard and MCP) share the **same SQLite DB**.

---

## npm scripts

| Script | Description |
| --- | --- |
| `npm install` | Install dependencies (no build) |
| `npm start` | Run the dashboard web server |
| `npm run dev` | Run the dashboard (auto-restart on file changes) |
| `npm run mcp` | Run the MCP server (stdio) |
| `npm run migrate` | Create/upgrade the DB |
| `npm run doctor` | Check installation/environment |
| `npm run seed` | Insert example data |
| `npm run build` | Build the plain-JS distribution bundle (`dist/`) via esbuild |
| `npm run build:mcpb` | Build the Claude Desktop bundle → `dist/careermate.mcpb` plus unpacked-folder fallback `dist/careermate.zip` (also copied to `site/`). Packs manifest + server code for distribution. |
| `npm test` | Run E2E tests |
| `npm run test:ui` | Playwright UI smoke tests |
| `npm run typecheck` | Type check (`tsc --noEmit`) |

---

## Data location & environment variables

- Default folder: `~/.careermate` (Windows: `%USERPROFILE%\.careermate`).
  - `careermate.sqlite` — the database file
  - `exports/` — exported files
  - `backups/` — backups
  - `uploads/` — uploaded files
  - `server.json` — runtime handshake info
  - `server.log` — background dashboard launch log
- You can change behavior with environment variables.
  - `CAREERMATE_DATA_DIR` — change the data folder location
  - `CAREERMATE_PORT` — pin the dashboard port
  - `CAREERMATE_NO_OPEN` — disable auto-opening the browser on start

---

## Security / privacy

- **Local-only binding** — The dashboard server binds only to `127.0.0.1` (loopback) and is not reachable from outside.
- **DNS-rebinding protection** — Validated against a Host allowlist.
- **Mutation-request protection** — CSRF session token (injected via an HTML `meta` tag); external Origins are blocked.
- **Static-file protection** — Path traversal (escaping the parent folder) is blocked.
- **Body size limit** — Request bodies are capped at 8MB.
- **No sensitive-data leakage** — Resume and cover-letter content is never exposed in logs or error responses.
- **No external transmission** — The MCP server makes no network calls, and all data stays only on your computer. Export and delete are available directly in the dashboard **Settings**.

---

## Documentation

- [`INSTALL.md`](INSTALL.md) — The install/connect runbook the AI assistant follows (based on running from source).
- [`AGENTS.md`](AGENTS.md) — Persistent instructions for Codex. / [`CLAUDE.md`](CLAUDE.md) — Persistent instructions for Claude Code.
- [`docs/SUPPORTED_AI_APPS.md`](docs/SUPPORTED_AI_APPS.md) — **Install reference hub**: supported-apps matrix + the 3 install methods (agent / npx / zip) + per-client manual MCP setup + known constraints. (Human-facing guide at https://careermate.life)
- [`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md) — Step-by-step runbook from registration to interview prep.
- [`docs/FAQ.md`](docs/FAQ.md) — **FAQ / troubleshooting**: "PDF won't read," "analysis isn't working," "how do I add a posting URL," etc.
- [`docs/dev/TODO.md`](docs/dev/TODO.md) — Remaining work and out-of-scope-for-v1 items.
- [`CHANGELOG.md`](CHANGELOG.md) — Per-version change history. / [`CONTRIBUTING.md`](CONTRIBUTING.md) · [`SECURITY.md`](SECURITY.md) · [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) — Contributing, security, and code of conduct.

---

## Tests

```bash
npm test        # E2E tests (security, workflows, MCP stdio, dashboard↔MCP same-DB round-trip)
npm run test:ui # Dashboard page-render smoke tests (Playwright)
npm run typecheck
```

Other useful scripts: `npm run migrate` (create/upgrade DB), `npm run seed` (example data), `npm run doctor` (install/environment check).

---

## License

MIT License — see the [`LICENSE`](LICENSE) file for the full text.
