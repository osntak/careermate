# 런타임·배포 조사: 완전 원클릭(Codex .exe / Claude `.mcpb`) 실현 가능성

- **작성일**: 2026-06-15
- **상태**: 조사 완료 / 큰 작업은 **보류(문서만)**
- **관련**: [ADR #1 `node:sqlite` 채택](./DECISIONS.md), [ADR #6 대시보드·MCP의 SQLite(WAL) 공유 + `server.json` 핸드셰이크](./DECISIONS.md), [ROADMAP](./ROADMAP.md)

> 이 문서는 "사용자가 Node/npx/git을 미리 깔지 않고도 한 번에 설치되는 경험"을 두 경로
> (① OpenAI **Codex Windows 앱** + 단일 `.exe`, ② Claude Desktop **`.mcpb`**)에서 만들 수
> 있는지 조사한 기록이다. 결론과 근거, 그리고 다음에 누가 이어받든 헛수고하지 않도록
> "무엇이 작은 수정이고 무엇이 큰 작업인지"를 남긴다.

---

## TL;DR

- **공통 근본 제약**: CareerMate는 **`node:sqlite`(Node ≥22.5의 최신 내장 기능)**에 의존한다.
  "무설치 번들 런타임" 전략의 성패는 전부 **"충분히 새로운 Node를 어떻게 확보하느냐"**로 수렴한다.
- **Codex Windows 앱 + 단일 `.exe`**: 패키징(Node SEA)은 **기술적으로 성립**하나, **자가등록 지속성**과
  **샌드박스** 두 개의 (2026-05~06 기준) 외부 버그/제약 때문에 **진정한 무인 원클릭은 현재 불가**. → **보류.**
- **Claude `.mcpb`**: 산출물(`dist/mcp.mjs`)은 **Node ≥22.5에서 정상 동작**함을 실증함. 사용자가 겪은
  "설치는 됐는데 도구가 안 뜸/빨간 에러"는 **Claude Desktop 내장 Node가 22.5 미만**일 때의 증상으로 추정되며,
  그 경우의 해결은 **저장 계층 rewrite(= 큰 작업)**다. → **로그로 근본 원인 확정 후 결정.**

---

## 1. 배경 / 질문

- CareerMate는 로컬 MCP stdio 서버 + 로컬 웹 대시보드. 저장은 `node:sqlite`.
- 목표: 비개발자가 **아무것도 미리 설치하지 않고** 한 번에 쓰기 시작하는 경험.
- 두 경로를 검토:
  1. **Codex Windows 데스크톱 앱**(2026-03 출시, MS Store, 로컬 샌드박스+PowerShell)에 **Node 런타임을
     동봉한 단일 `.exe`**(Node SEA)를 더블클릭 → 자가등록 → 동작.
  2. **Claude Desktop `.mcpb`**(런타임 동봉형 원클릭) — 이미 빌드 파이프라인 존재(`scripts/build-mcpb.mjs`).

---

## 2. Codex Windows 앱 + 단일 `.exe` (Node SEA)

### 2.1 패키징 자체 — 성립 (조건부 가능)

| 항목 | 판정 | 근거 |
|---|---|---|
| Windows에서 SEA `.exe` 생성 | 가능 | Node SEA의 **첫 번째 CI 테스트 플랫폼이 Windows**. `.exe` 출력 지원. 안정성 지수는 1.1(Active development). |
| 빌드 워크플로 | 간소화됨 | Node **25.5.0**의 `--build-sea` 단일 플래그로 통합(종전 postject 3단계 불필요). |
| 정적 자산(대시보드 HTML/CSS/JS) 임베드 | 가능 | `sea.getAsset()`/`getRawAsset()` 계열로 번들·런타임 서빙(v20.12.0~). 단 현재 `apps/web`는 디스크에서 자산을 읽으므로 **임베드용 코드 수정 필요**. |
| `node:sqlite` 플래그 | 사실상 비이슈 | **Node ≥22.13 / ≥23.4부터 `--experimental-sqlite` 없이 동작**. 최신 Node를 임베드하면 해결. 필요시 SEA `execArgv`로 플래그 주입도 가능. |

근거 출처(주요): nodejs.org `single-executable-applications`, `sqlite` 문서; Node v25.5.0 릴리스 블로그;
Joyee Cheung 블로그(Windows PE 주입 실테스트); commit `55239a48b6`("unflag sqlite module").

### 2.2 자가등록·동작을 막는 두 개의 블로커 — 현재 불가

1. **🚨 Codex 데스크톱이 시작 시 `~/.codex/config.toml`을 재작성하며 사용자 커스텀 `[mcp_servers]` 블록을 삭제**
   - openai/codex **issue #24718** (2026-05-27 OPEN, v26.519.11010.0, Win11 26200): "Codex Desktop overwrites
     `%USERPROFILE%\.codex\config.toml` during startup ... removes a manually configured custom MCP server",
     "blocking data-loss issue." (보강: #26530, #24387, JetBrains LLM-24906)
   - 의미: `.exe`가 `init`으로 스스로 등록해도 **앱이 지워버릴 수 있음** → 자가등록 전략의 핵심 전제가 깨짐.
2. **샌드박스가 MCP stdio 서브프로세스에도 상속됨**
   - 공식 문서: "The sandbox applies to spawned commands ... inherit the same sandbox boundaries", "Every file
     write, terminal command, network request, and process spawn goes through the sandbox."
   - 기본 `workspace-write`의 쓰기 가능 루트는 `cwd + $TMPDIR + /tmp`뿐 → **워크스페이스 바깥인
     `~/.careermate` 쓰기와 127.0.0.1 포트 바인딩이 기본 거부**. `danger-full-access` 또는
     `sandbox_workspace_write.writable_roots` 명시 필요. (실증: issue #18243, #24727 "windows sandbox failed: spawn setup")

> 두 블로커 모두 **CareerMate 코드 문제가 아니라 Codex 앱 측 미해결 버그/설계 제약**이라 우리가 코드로 못 고친다.
> #24718이 패치되고 샌드박스 정책이 정리되면 결론이 뒤집힐 수 있으므로 **추적 대상**.

### 2.3 결론(Codex)

- 패키징은 가능, **무인 원클릭은 현재 불가** → **보류.** 당분간 Codex는 CLI/IDE 확장 경로 또는
  "Node 1회 설치 → `npx -y careermate init`" 안내가 현실적.

---

## 3. Claude Desktop `.mcpb`

### 3.1 실증 결과 (이 저장소, 2026-06-15, Node v25)

- `manifest.json`은 정상: `server.type:"node"`, `args:["--experimental-sqlite","${__dirname}/dist/mcp.mjs"]`.
- **`dist/mcp.mjs` 단독 부팅 성공** — `initialize` 응답 정상, **도구 24개** 로드, 데이터 `~/.careermate` 연결.
- 이 PC의 **Node v25**에서: `--experimental-sqlite`는 **거부되지 않고 경고만**, 플래그 없이도 `node:sqlite` 동작.
  → "최신 Node가 플래그를 거부해 죽는다" 시나리오는 (최소 v25까지) **없음**.

### 3.2 그렇다면 사용자가 본 "도구 안 뜸/빨간 에러"의 원인

- 산출물·플래그가 Node ≥22.5에서 멀쩡하므로, **sqlite 경로의 유일한 실패 원인 = Claude Desktop 내장 Node < 22.5**.
  그 경우 `node:sqlite` 모듈이 **아예 없고** `--experimental-sqlite`도 **모르는 옵션**이라 서버가 즉시 죽는다.
- (대안 가설) sqlite 무관 환경 문제 — 단 Claude Desktop 미설치 환경에서는 재현 불가.
- **확정 방법(저비용, 먼저 할 것)**: `.mcpb`를 깐 PC에서 로그 확인
  - Windows: `%APPDATA%\Claude\logs\mcp-server-careermate.log` (또는 `mcp.log`)
  - `bad option: --experimental-sqlite` / `No such built-in module: node:sqlite` → **내장 Node < 22.5 확정**
  - 그 외(경로/ESM/`__dirname`) → 패키징 문제(별개 갈래)

### 3.3 내장 Node < 22.5가 확정될 경우 — 저장 계층 대안

코드 결합도는 낮다. `node:sqlite`를 만지는 곳은 **3개 파일**뿐:
`packages/db/src/{connection.ts, schema.ts, repositories.ts}`. 사용 API도 작은 부분집합
(`DatabaseSync`, `exec`, `prepare().get()/.all()/.run()`, `?`/`@name` 인자, `.changes`, `close`), **JOIN 없음**.
→ `getDb()` 뒤 어댑터 교체 자체는 소규모.

**그러나 두 개의 지뢰:**

1. **2-프로세스 동시성(ADR #6)** — 웹 대시보드와 MCP 서버가 **별도 프로세스로 같은 DB를 WAL 동시 접근**.
   - `sql.js`(WASM): 낡은 Node까지 호환되지만 **인메모리+수동 저장**이라 두 프로세스 공유 시 last-writer-wins로 **깨짐**.
   - JSON 스토어(lowdb 등): 동일하게 동시성 재설계 필요.
2. **네이티브 ABI** — `better-sqlite3`는 API가 거의 동일하지만 **네이티브 모듈**이라 내장 Node ABI와
   prebuilt 불일치(NODE_MODULE_VERSION) 위험. 버전 문제를 다른 형태로 되살림.

| 대안 | 낡은 내장 Node 호환 | 2-프로세스 동시성 | 비용 |
|---|---|---|---|
| sql.js (WASM) | ✅ | ❌ 재설계 필요 | 中~大 |
| better-sqlite3 | ❌ ABI 위험 | ✅ | 中(근본 미해결) |
| JSON 스토어 | ✅ | ❌ 재설계 필요 | 中~大 |

가장 깔끔한 방향: **MCP 서버가 DB를 직접 열지 않고 웹 서버의 127.0.0.1 HTTP로 데이터를 요청 → 웹 서버가
단일 DB 소유자**. 이러면 sql.js가 성립하지만 "대시보드가 안 떠 있어도 MCP 동작" UX를 잃는다(진짜 아키텍처 변경).

→ 어느 쪽이든 **"작은 수정"이 아니라 아키텍처 변경**이므로, 근본 원인(로그) 확정 전에는 착수하지 않는다.

---

## 4. 권고 / 다음 단계

1. **(먼저, 저비용)** `.mcpb` 깐 PC에서 로그 한 줄 확인 → 내장 Node < 22.5 여부 확정.
   - 플래그류 에러면: (가설과 달리) 단순 수정 가능성 → 재검토.
   - `node:sqlite` 부재면: 아래 3.3 rewrite를 정식 과제로.
2. **단기 우회**(무설치 포기 허용 시): "Node ≥22.5 1회 설치 → `npx -y careermate init`" — Claude/Codex 공통으로 가장 견고.
3. **추적**: Codex issue #24718(config 재작성) 상태. 닫히면 Codex SEA 원클릭을 재평가.

## 5. 검증 메모 / 한계

- Codex 데스크톱 관련 결론은 **2026-05~06 기준 OPEN 버그**에 의존(시간 민감).
- #24718의 구체 재현은 HTTP MCP였다는 점에서 stdio 삭제는 광범위 재작성 정황으로의 소폭 일반화.
- 미서명 `.exe`의 SmartScreen/Defender 경고가 원클릭 UX를 얼마나 저해하는지는 **이번 라운드에서 확정 근거 미확보**(미검증).
- `.mcpb` 실패의 "내장 Node < 22.5" 결론은 **로그로 직접 확정 전까지 강한 추정**이다.
