# CareerMate 아키텍처

이 문서는 CareerMate의 전체 구조를 설명한다. CareerMate는 **MCP-우선 로컬 커리어 관리 도구**다. 사용자는 자신의 AI(ChatGPT/Claude/Gemini 등)와 대화하고, 그 AI가 CareerMate의 로컬 MCP 도구를 호출해 로컬 커리어 DB를 읽고 쓴다. CareerMate 내부에는 LLM이 없다 — 분석·작성 같은 추론은 전적으로 사용자의 AI가 수행하고, CareerMate는 데이터를 제공·보관하는 역할만 한다. 모든 데이터는 사용자의 로컬 머신에만 저장된다.

기술 선택의 배경(무빌드·무네이티브 등)과 보안 모델의 세부는 [DECISIONS.md](./DECISIONS.md)(특히 "로컬-우선 보안 모델" 절)를 참고하라. 데이터 모델은 [DATA_MODEL.md](./DATA_MODEL.md), MCP 도구 목록은 [MCP_TOOLS.md](../MCP_TOOLS.md)를 함께 보면 좋다.

---

## 1. 큰 그림: 두 프로세스, 하나의 SQLite

CareerMate는 독립적으로 동작하는 **두 개의 로컬 프로세스**로 구성된다.

- **대시보드 웹서버** (`apps/web`) — `npm start`로 사용자가 직접 기동. `http://127.0.0.1:4319`(사용 중이면 다음 포트로 폴백)에 바인딩하고 브라우저를 자동으로 연다. 사람이 보는 UI와 REST API를 제공한다.
- **MCP stdio 서버** (`apps/mcp`) — AI 클라이언트(Claude Desktop, ChatGPT, Cursor 등)가 `npm run mcp` 형태로 기동. stdio 위에서 MCP 프로토콜로 통신하며, 31개의 CareerMate 도구를 노출한다.

두 프로세스는 서로를 직접 호출하지 않는다. 대신 **같은 로컬 SQLite 파일**(`~/.careermate/careermate.sqlite`)을 공유한다. AI가 도구로 쓴 내용은 대시보드에 즉시 보이고, 사용자가 대시보드에서 편집한 내용은 AI가 다음 도구 호출에서 그대로 읽는다. SQLite는 WAL(Write-Ahead Logging) 모드로 열려 두 프로세스의 동시 읽기/쓰기를 안전하게 처리한다.

```
                              사용자의 머신 (모든 것이 로컬)
  ┌───────────────────────────────────────────────────────────────────────────┐
  │                                                                             │
  │   사람(브라우저)                              사용자의 AI 클라이언트         │
  │        │                                  (Claude / ChatGPT / Gemini / Cursor)│
  │        │ HTTP (127.0.0.1)                          │ MCP over stdio          │
  │        ▼                                           ▼                         │
  │  ┌──────────────────────────┐            ┌──────────────────────────┐       │
  │  │  apps/web                │            │  apps/mcp                │       │
  │  │  대시보드 웹서버          │            │  MCP stdio 서버           │       │
  │  │  (npm start)             │            │  (npm run mcp,           │       │
  │  │                          │            │   AI 클라이언트가 기동)   │       │
  │  │  보안 게이트 → API 라우터 │            │  31개 도구 등록           │       │
  │  │  → 정적 대시보드/설치페이지│            │  toCallToolResult        │       │
  │  └───────────┬──────────────┘            └───────────┬──────────────┘       │
  │              │                                       │                      │
  │              │ getDb()                               │ getDb()              │
  │              ▼                                       ▼                      │
  │        ┌─────────────────────────────────────────────────┐                 │
  │        │   packages/db  (단일 DatabaseSync 연결)          │                 │
  │        │   node:sqlite + WAL + foreign_keys + busy_timeout│                 │
  │        └───────────────────────┬─────────────────────────┘                 │
  │                                │                                            │
  │                                ▼                                            │
  │        ┌─────────────────────────────────────────────────┐                 │
  │        │   ~/.careermate/                                 │                 │
  │        │     careermate.sqlite   ← 공유 DB(12개 테이블)    │                 │
  │        │     server.json         ← 런타임 핸드셰이크       │                 │
  │        │     exports/ backups/ uploads/                   │                 │
  │        └─────────────────────────────────────────────────┘                 │
  │                                                                             │
  └───────────────────────────────────────────────────────────────────────────┘
       └────────────── 네트워크로 나가는 호출 없음 · LLM 내장 없음 ────────────┘
```

두 프로세스가 동시에 기동되어 있을 필요는 없다. MCP 서버만 떠 있어도 AI가 DB를 읽고 쓸 수 있고, 대시보드만 떠 있어도 사람이 데이터를 편집할 수 있다. 둘 다 떠 있으면 한쪽의 변경이 다른 쪽에 곧바로 반영된다.

---

## 2. 계층 구조

코드는 의존성 방향이 한쪽으로만 흐르는 계층으로 정리되어 있다. 패키지 별칭(`@careermate/*`)은 루트 `tsconfig.json`의 `paths`에 정의되어 있으며, 각 별칭은 해당 패키지의 `src/index.ts`를 가리킨다.

```
  shared
    │   (타입 + zod 스키마 + 라벨/상수. 의존성 없음)
    ▼
  db
    │   (node:sqlite 연결, 스키마/마이그레이션, 리포지토리, 경로/런타임)
    ▼
  core
    │   (비즈니스 유스케이스: get_application_context, save_* 등)
    ▼
  ┌───────────────────────────┬───────────────────────────┐
  │                           │                           │
  apps/web (REST API)         packages/mcp-tools          │
  · routes.ts                 · 31개 도구 정의             │
  · security/http/exports     · 핸들러 → core 호출         │
                              └──────────┬────────────────┘
                                         ▼
                                    apps/mcp (stdio 서버)

  보조 패키지 (core / web / mcp-tools가 필요 시 사용):
    parsers   · 공고 텍스트 정제, 파일 텍스트 추출
    exporters · md/html/txt 포맷팅
    prompts   · AI용 프롬프트 텍스트
    workflows · 5종 워크플로우 가이드 데이터
```

핵심 규칙:

- `shared`는 아무것도 의존하지 않는 가장 아래 계층이다. 타입, zod 입력 스키마, 상태 라벨/순서 같은 상수만 담는다.
- `db`는 `shared`만 의존한다. SQLite 연결과 리포지토리(`profileRepo`, `jobRepo`, …)를 제공한다.
- `core`는 `db`와 `shared` 위에 비즈니스 유스케이스를 얹는다. 대시보드 API와 MCP 도구는 **같은 core 함수**를 호출하므로 두 진입점이 항상 동일하게 동작한다(예: `getApplicationContext`, `saveFitAnalysis`).
- `apps/web`와 `packages/mcp-tools`는 둘 다 core를 호출하는 **두 개의 진입점**이다. 하나는 HTTP로, 다른 하나는 MCP stdio로 같은 로직에 도달한다.

---

## 3. 요청 흐름

### 3.1 대시보드 요청 (HTTP GET/PUT/POST/DELETE)

브라우저가 `apps/web` 서버에 HTTP 요청을 보낸다. `apps/web/src/server.ts`의 핸들러가 다음 순서로 처리한다.

1. **보안 게이트** — 어떤 작업보다 먼저 `checkRequest(req)`가 실행된다(`apps/web/src/security.ts`). Host 허용목록(DNS 리바인딩 차단), Origin 허용목록(교차 출처 차단), 변경 요청(POST/PUT/PATCH/DELETE)에 대한 CSRF 세션 토큰을 검사한다. 거부되면 곧바로 403을 반환한다.
2. **API 라우팅** — 경로가 `/api/`로 시작하면 `Router`가 메서드+경로로 핸들러를 찾는다(`apps/web/src/routes.ts`). 없으면 404.
3. **본문 검증 + 처리** — 변경 요청 본문은 `readJsonBody`가 `@careermate/shared`의 zod 스키마로 검증한다. 검증을 통과한 입력만 core 함수나 리포지토리로 전달된다. 예: `PUT /api/profile`은 `ProfileInputSchema`로 검증 후 `saveProfile(input)`을 호출한다.
4. **응답 직렬화** — 핸들러는 평범한 객체를 반환하고 서버가 JSON으로 직렬화한다(`sendJson`). 내보내기 경로는 `__download` 마커가 붙은 객체를 반환해 파일 다운로드로 스트리밍된다(`sendDownload`).
5. **정적 서빙** — `/api/`가 아니면 정적 자산을 서빙한다. `/install`은 설치 페이지를, 그 외는 대시보드 SPA를 서빙하며 매칭 실패 시 `index.html`로 폴백한다. HTML을 서빙할 때 `injectToken`이 CSRF 토큰을 `<meta>` 태그로 주입한다.

오류는 `HttpError`(상태코드 포함)와 그 외 예외로 나뉜다. 후자는 일반화된 500 메시지만 응답하고, 이력서/자소서 본문이 로그나 응답에 새지 않도록 한다.

### 3.2 MCP 도구 호출 (stdio)

AI 클라이언트가 `apps/mcp` 서버에 MCP 프로토콜로 도구 호출을 보낸다(`apps/mcp/src/index.ts`).

1. **기동 시 DB 보장** — `main()`이 `getDb()`를 먼저 호출해 DB 생성·마이그레이션을 마친 뒤 도구를 서빙한다.
2. **도구 등록** — `@careermate/mcp-tools`의 `TOOLS` 배열을 순회하며 각 도구를 `server.registerTool`로 등록한다. 입력 스키마(zod), 제목/설명, `readOnlyHint`/`openWorldHint` 어노테이션이 함께 전달된다. `openWorldHint`는 항상 `false` — 외부 세계로 나가지 않는다.
3. **핸들러 실행** — 도구 호출이 오면 해당 핸들러가 인자를 받아 core 로직을 수행하고, 결과를 `toCallToolResult`로 MCP 응답 형태로 변환한다. 예외는 안전한 메시지로만 변환되어 문서 본문이 새지 않는다.
4. **전송 계층** — `StdioServerTransport`로 통신한다. **stdout은 MCP 전송 채널이므로 절대 로그를 쓰지 않는다.** 모든 로그는 stderr로만 나간다.

대시보드 API와 MCP 도구는 결국 같은 core 함수에 도달하므로, 한쪽에서 일어난 변경은 같은 SQLite를 통해 다른 쪽에 즉시 보인다. 이것이 "대시보드↔MCP 동일 DB 양방향"의 실체다.

---

## 4. 프로세스 간 런타임 핸드셰이크 (server.json)

두 프로세스는 서로를 네트워크로 탐색하지 않는다. 대신 데이터 디렉터리의 작은 JSON 파일(`~/.careermate/server.json`)을 통해 서로를 찾는다(`packages/db/src/runtime.ts`).

- **웹서버가 부팅하면** 자신의 라이브 주소를 기록한다. `startServer`가 포트 바인딩에 성공한 직후 `writeRuntimeInfo({ url, port, pid, started_at })`를 호출한다.
- **MCP 서버는** `open_dashboard`, `open_application` 같은 도구를 실행할 때 `readRuntimeInfo()`로 그 파일을 읽어, 실제로 떠 있는 대시보드의 올바른 URL/포트로 브라우저를 가리킨다.
- **생존 확인** — `isProcessAlive(pid)`로 기록된 pid의 프로세스가 살아 있는지 확인할 수 있어, 죽은 서버의 낡은 주소를 잡지 않는다.
- **정리** — 웹서버는 `SIGINT`/`SIGTERM`에서 `clearRuntimeInfo()`로 파일을 지운 뒤 종료한다.

`RuntimeInfo`의 형태는 다음과 같다.

```ts
interface RuntimeInfo {
  url: string;        // 예: "http://127.0.0.1:4319"
  port: number;
  pid: number;
  started_at: string; // ISO 8601
}
```

쓰기/읽기 모두 실패를 비치명적으로 처리한다(핸드셰이크 파일이 없거나 깨져도 각 프로세스는 독립적으로 동작한다).

---

## 5. 보안 경계

CareerMate는 로컬에만 머무는 도구이지만, **로컬 서버는 사용자가 방문하는 임의의 웹페이지에서도 도달 가능**하다는 점을 전제로 방어한다(브라우저는 `127.0.0.1`로의 요청도 보낸다). 의사결정 배경은 [DECISIONS.md](./DECISIONS.md)의 "로컬-우선 보안 모델" 절에 있으며, 핵심 경계는 다음과 같다.

- **로프백 전용 바인딩** — 서버는 항상 `127.0.0.1`에 바인딩하며 `0.0.0.0`에는 절대 바인딩하지 않는다. 네트워크에서 도달 불가.
- **Host 허용목록** — `Host` 헤더가 로프백 이름(`localhost`/`127.0.0.1`/`[::1]`/`::1`)이 아니면 거부. DNS 리바인딩 차단.
- **Origin 허용목록** — `Origin`이 있으면 로프백이어야 한다. 교차 출처 페이지의 요청을 거부.
- **CSRF 세션 토큰** — 서버 기동 시 1회 발급한 랜덤 토큰을 서빙되는 HTML의 `<meta name="careermate-token">`에 주입한다. 변경 요청(POST/PUT/PATCH/DELETE)은 이 토큰을 `x-careermate-token` 헤더로 제시해야 한다. 동일 출처 스크립트만 토큰을 읽을 수 있고, 비교는 타이밍 안전 비교를 쓴다.
- **허용적 CORS 미발급** — 어떤 응답에도 허용적 CORS 헤더를 붙이지 않으므로, 설령 요청이 통과해도 교차 출처 페이지는 응답을 읽지 못한다.
- **정적 경로 traversal 차단**, **본문 크기 제한(8MB)**, **민감 본문 미노출** — 이력서/자소서 본문은 로그·에러 응답에 절대 노출하지 않는다.
- **MCP 측 경계** — MCP 서버는 stdout에 절대 쓰지 않고(전송 채널 보호), 도구 어노테이션의 `openWorldHint=false`로 외부 세계 접근이 없음을 명시한다. 예외도 안전한 메시지로만 변환한다.

---

## 6. 무빌드(tsx)·무네이티브(node:sqlite) 선택 요약

근거의 상세는 [DECISIONS.md](./DECISIONS.md)에 있다. 요지는 다음과 같다.

- **무빌드 실행 (tsx)** — 컴파일 산출물을 만들지 않고 TypeScript를 그대로 실행한다. `tsconfig.json`은 `noEmit: true`, `allowImportingTsExtensions: true`, `moduleResolution: "Bundler"`로 설정되어 `.ts` 확장자를 직접 import한다. 빌드 단계가 없어 설치·기여·디버깅이 단순하다.
- **무네이티브 SQLite (node:sqlite)** — Node 내장 `node:sqlite`의 `DatabaseSync`를 사용한다. `better-sqlite3` 같은 네이티브 모듈을 컴파일할 필요가 없으므로 설치 시 C/C++ 툴체인이 필요 없고, 플랫폼별 빌드 실패 위험이 없다. 연결은 WAL + `foreign_keys = ON` + `busy_timeout = 5000`으로 열려 두 프로세스 동시성을 안전하게 다룬다(`packages/db/src/connection.ts`).
- **그 외** — zod로 입력 검증, MCP SDK(`@modelcontextprotocol/sdk`)로 도구 노출, 대시보드는 프레임워크/CDN 없는 바닐라 JS + 자체 CSS 디자인 시스템.

---

## 7. 확장 포인트

CareerMate의 두 표면(MCP 도구, REST API)은 각각 다른 클라이언트로 확장된다.

- **AI 클라이언트(MCP)** — MCP stdio 서버는 표준 MCP 프로토콜만 따르므로, MCP를 지원하는 어떤 클라이언트와도 연결된다.
  - **Claude (Desktop Extension)** — MCP 서버를 `npm run mcp`로 기동하도록 등록.
  - **ChatGPT App / Gemini / Cursor** — 동일한 MCP 서버를 각 클라이언트의 도구/커넥터로 등록. 새 클라이언트를 지원하려면 도구 코드 변경 없이 클라이언트 측 등록 설정만 추가하면 된다.
  - 새 능력이 필요하면 `packages/mcp-tools`에 도구를 추가하고 핸들러를 core에 연결한다. 같은 core 함수를 대시보드 API에서도 노출하면 두 표면이 자동으로 동기화된다.
- **REST API** — `apps/web`의 REST 표면은 대시보드 외의 클라이언트(스크립트, 자동화)도 사용할 수 있다. 단, 변경 요청은 CSRF 토큰과 로프백 제약을 따라야 한다.
- **데스크톱 패키징(Tauri/Electron)** — 두 프로세스 모델과 로컬 SQLite 구조는 데스크톱 셸로 감싸기에 적합하다. 웹서버를 내장 웹뷰로 띄우고 MCP 서버를 함께 번들링하면 단일 앱으로 배포할 수 있다. 데이터 위치는 `CAREERMATE_DATA_DIR`로 제어되므로 패키징 환경에 맞게 재배치 가능하다.
- **데이터 위치/포트 제어** — 환경변수 `CAREERMATE_DATA_DIR`(데이터 디렉터리), `CAREERMATE_PORT`(선호 포트), `CAREERMATE_NO_OPEN`(브라우저 자동 열기 비활성)으로 실행 환경을 조정한다.

---

## 8. 패키지별 책임 표

| 패키지 / 앱 | 별칭 | 책임 | 주 의존 |
| --- | --- | --- | --- |
| `packages/shared` | `@careermate/shared` | 타입, zod 입력 스키마, 상태/문서 라벨·순서 등 상수. 모든 계층이 공유. | (없음) |
| `packages/db` | `@careermate/db` | 단일 `DatabaseSync` 연결(WAL), 12개 테이블 스키마/마이그레이션, 리포지토리, 데이터 경로(`paths.ts`), 런타임 핸드셰이크(`runtime.ts`). | shared |
| `packages/core` | `@careermate/core` | 비즈니스 유스케이스. `getApplicationContext`(핵심), `saveProfile`, `saveJobPosting`, `saveFitAnalysis`, `saveCoverLetterVersion`, `updateApplicationStatus`, `saveInterviewPrep`, 온보딩/요약/활동 조회 등. 두 진입점이 공유. | db, shared |
| `packages/mcp-tools` | `@careermate/mcp-tools` | 31개 MCP 도구 정의(`TOOLS`)와 핸들러, `toCallToolResult`. 도구 핸들러는 core를 호출. | core, shared, parsers/prompts/workflows |
| `packages/parsers` | `@careermate/parsers` | 공고 텍스트 정제(`cleanJobPosting`), 업로드 파일 텍스트 추출(`extractText`). | shared |
| `packages/exporters` | `@careermate/exporters` | md/html/txt 내보내기 포맷팅(`ExportResult`). | shared |
| `packages/prompts` | `@careermate/prompts` | 사용자 AI에 전달할 프롬프트 텍스트(`PROMPTS`). | shared |
| `packages/workflows` | `@careermate/workflows` | 5종 워크플로우 가이드 데이터(`WORKFLOWS`: onboarding, analyze_job, write_cover_letter, manage_application_status, prepare_interview). | shared |
| `apps/web` | (앱) | HTTP 서버: 보안 게이트 → REST API 라우터 → 정적 대시보드/설치 페이지. 로프백 바인딩, 포트 폴백, `server.json` 발행. | core, db, shared, parsers, exporters, prompts, workflows |
| `apps/mcp` | (앱) | MCP stdio 서버. 도구 등록, stdio 전송, 같은 SQLite 공유. | mcp-tools, db |

---

## 관련 문서

- 기술 의사결정 근거 및 보안 모델: [DECISIONS.md](./DECISIONS.md)
- 데이터 모델(테이블 12개): [DATA_MODEL.md](./DATA_MODEL.md)
- MCP 도구 목록(31개): [MCP_TOOLS.md](../MCP_TOOLS.md)
- 워크플로우: [WORKFLOWS.md](../WORKFLOWS.md)
