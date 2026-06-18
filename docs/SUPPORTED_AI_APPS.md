# 지원 AI 앱 & 설치 레퍼런스 (Supported AI Apps)

CareerMate는 LLM이 없는 **로컬 MCP 도구**입니다. *내 컴퓨터에서 로컬 프로그램을 직접 실행할 수 있는* AI 앱에서만 동작합니다.

> **가장 쉬운 사람용 설치 안내는 https://careermate.life (랜딩)** 입니다. 이 문서는 **지원 앱 매트릭스 + 클라이언트별 수동 MCP 설정 + 알려진 제약**을 모은 레퍼런스입니다. AI 에이전트가 따라가는 단계별 런북은 루트 [`/INSTALL.md`](../INSTALL.md), 설치 후 사용 흐름은 [docs/START_WORKFLOW.md](./START_WORKFLOW.md)를 보세요.

---

## 설치는 크게 3가지 — "누가 설치하느냐"

| | 무엇 | Node | 대상 |
|---|---|---|---|
| **1. 에이전트가 대신 설치** | 작업 폴더에서 **한 문장** → AI가 `careermate.life/llms-install.txt`를 읽고 npm 설치 + MCP 등록 | 필요(에이전트가 winget/brew 또는 nodejs.org로 도와줌) | Claude Code(데스크톱 **"Code" 탭** / CLI)·Codex CLI·Gemini CLI·Cursor 등 *명령 실행 가능한 에이전트* |
| **2. npm 명령 직접** | 터미널에 `npx -y careermate init` 한 줄(감지된 앱 자동 등록) | 필요 | Claude Desktop·Codex·Cursor 등(그 외는 `--print`로 수동) |
| **3. `careermate.zip`** | ZIP 압축 해제 후 폴더를 확장 설정에서 추가 (`.mcpb` 직접 추가는 known issue) | **불필요**(Claude Desktop 내장) | **Claude Desktop "채팅" 앱 전용** |

**1·2는 같은 메커니즘**(Node + npm/npx + MCP 등록) — 에이전트가 치느냐 / 내가 치느냐의 차이일 뿐입니다. 그래서 1·2의 "대상" 제품군이 서로 **겹칩니다**(같은 Claude Code·Codex·Cursor 등). 어느 앱이 어느 방식을 쓰는지는 아래 **앱 × 방식** 매트릭스로 보세요. **3(`careermate.zip`)만 Claude Desktop "채팅" 앱 전용**이라 성격이 다릅니다(내장 Node 사용, 단 버전<22.5면 불안정).

### 앱 × 방식

| 앱 | 1 에이전트 | 2 npm직접 | 3 zip | 영구 지침 | MCP 등록 위치 |
|---|---|---|---|---|---|
| **Claude Desktop "채팅"** | — | ✅(config 등록) | ✅ | — | 압축 해제 폴더 또는 `claude_desktop_config.json` |
| **Claude Code (Code 탭 / CLI)** | ✅ | ✅ | — | 루트 `CLAUDE.md` | 프로젝트 `.mcp.json` |
| **Codex CLI** (⚠️ 데스크톱 앱 ✗) | ✅ | ✅ | — | 루트 `AGENTS.md` | `~/.codex/config.toml` |
| **Gemini CLI / Antigravity** | ✅ | ✅ | — | — | Gemini CLI `~/.gemini/settings.json` · Antigravity `~/.gemini/.../mcp_config.json` |
| **Cursor · Cline · Windsurf** | ✅ | ✅ | — | — | `~/.cursor/mcp.json` 등 |

> **Gemini CLI → Antigravity 전환(2026-06):** Google이 소비자(무료/Pro/Ultra)용 Gemini CLI를 **2026-06-18부터 Antigravity CLI로 전환**합니다(Gemini CLI repo는 오픈소스로 유지·엔터프라이즈 계속). MCP 스키마는 동일(`mcpServers` + `command`/`args`/`env`)합니다. `careermate init`은 **Gemini CLI(`~/.gemini/settings.json`)를 자동 등록**하고, **Antigravity는 설정 파일 경로가 유동적이라 후보 파일이 이미 있을 때만** 등록합니다(없으면 위 mcpServers 블록을 해당 파일에 수동 추가).

### 동작하지 않는 것
**ChatGPT · Gemini · Claude의 웹·모바일 앱은 안 됩니다.** 클라우드에서 실행되어 **원격 URL 기반 MCP만** 지원하므로, 내 컴퓨터의 로컬 stdio 서버에 직접 닿을 수 없습니다.

---

## 구독·준비물 (2026)

- **Claude Code**(Code 탭/CLI): **Pro 이상**(무료 플랜 불가) 또는 `ANTHROPIC_API_KEY` 종량제.
- **Codex**: **ChatGPT Plus 이상** 로그인으로 충분(API 키 불필요).
- **`careermate.zip`**(Claude Desktop 채팅 확장): **무료 플랜에서도 설치** 가능(안정성이 변수). `.mcpb` 직접 추가는 일부 Claude Desktop 버전에서 실패하는 known issue라 ZIP 폴더 추가를 권장합니다.
- **터미널/npx**: 무료(Node만). 연결할 앱의 구독 정책은 별개.

> **런타임.** CareerMate 서버는 Node 프로그램이라 **Node.js 22.5+ 가 필요**합니다 — 위 1·2 경로 공통(없으면 에이전트가 winget/brew, 안 되면 [nodejs.org](https://nodejs.org) LTS 설치 파일). **Node가 아예 필요 없는 길은 `careermate.zip`뿐**인데 그건 Claude Desktop 내장 Node에 의존해 불안정할 수 있습니다 — **"완전 무설치 + 안정"을 동시에 주는 길은 아직 없습니다.**
>
> **Windows + Claude Code(Code 탭)**: [Git for Windows](https://git-scm.com/download/win) 사전 설치가 필요합니다(앱이 없으면 "Git is required" 안내). Claude Code가 **세션 격리(git worktree)와 내부 POSIX 셸 도구**에 Git을 쓰기 때문이며 CareerMate와는 무관합니다. macOS는 Git 기본 포함이라 불필요.

---

## 작업 폴더 안에 설치 (권장 — GUI 앱·샌드박스 친화)

Claude "Code" 탭이나 Codex처럼 **작업 폴더(cwd)를 잡고** 쓰는 경우, 설치물과 데이터를 그 폴더 **안에** 두면 (1) 폴더만 백업·이동하면 데이터가 따라오고 (2) 샌드박스가 cwd 하위 쓰기를 허용해 마찰이 줄어듭니다. `<WS>`를 작업 폴더 절대경로라 할 때:

```bash
npm install --prefix "<WS>/.cm/app" careermate
```
데이터는 `CAREERMATE_DATA_DIR` 환경변수로 작업 폴더 안에 고정합니다(기본값 `~/.careermate` 대신). 아래 MCP 등록의 `env`에 넣으면 됩니다:
```
CAREERMATE_DATA_DIR = <WS>/.cm/data
```
- `<BIN>` = `<WS>/.cm/app/node_modules/careermate/bin/careermate.mjs` (이 셸이 `--experimental-sqlite`를 알아서 붙임).
- 데이터 폴더 이름을 `.git`·`.codex`·`.agents`로 두지 마세요(VCS 메타데이터·AI 도구 설정 폴더와 이름이 충돌합니다 — 앱이 따로 막아 주는 건 아니니 이름을 직접 피하세요).
- **포터블 Node(고급):** 시스템에 Node 22.5+가 없으면, 작업 폴더 안에 포터블 Node를 두고 `command`를 그 `node` 절대경로로 가리켜도 동작합니다. 단 다운로드 용량·OS 보안 경고·폴더 이동 시 경로 갱신 부담이 있어, 지금은 "시스템 Node 1회 설치"가 더 단순합니다.

---

## 클라이언트별 수동 MCP 설정 (방식 2의 수동판)

대부분 `npx -y careermate init`(또는 소스에서 `npm run init`)이 자동 등록하므로 **수동 설정은 보통 불필요**합니다. 직접 붙여넣어야 할 때만 참고하세요. `npm run init -- --print`로 아래 스니펫을 출력할 수도 있습니다.

**경로 규칙** — 아래 `<BIN>`은 **실제 절대경로**로 바꾸세요(`~`·`$HOME`은 설정 파일 안에서 확장 안 됨).
- **Windows**: JSON에서 역슬래시는 `\\`로 두 번(`C:\\...\\careermate.mjs`). TOML은 **작은따옴표 리터럴**(`'C:\...\careermate.mjs'`)을 쓰면 한 번만.
- **macOS/Linux**: `/` 그대로.

### Claude Desktop (채팅앱 수동)
설정 파일: Windows `%APPDATA%\Claude\claude_desktop_config.json` · macOS `~/Library/Application Support/Claude/claude_desktop_config.json` (Settings → Developer → Edit Config로도 열림)
```json
{ "mcpServers": { "careermate": { "command": "node", "args": ["<BIN>", "mcp"] } } }
```

### Claude Code (프로젝트 `.mcp.json`, 작업 폴더 최상단)
```json
{ "mcpServers": { "careermate": { "type": "stdio", "command": "node", "args": ["<BIN>", "mcp"], "env": { "CAREERMATE_DATA_DIR": "<WS>/.cm/data" } } } }
```
또는 CLI: `claude mcp add --scope project --transport stdio careermate -- node <BIN> mcp` · 첫 실행 시 **1회 승인**.

### Codex CLI (`~/.codex/config.toml`)
```toml
[mcp_servers.careermate]
command = "node"
args = ["<BIN>", "mcp"]
# 작업 폴더 안에 데이터: env = { CAREERMATE_DATA_DIR = "<WS>/.cm/data" }
```
또는 CLI: `codex mcp add careermate -- node <BIN> mcp` · 등록 후 `/mcp`로 확인.

### Cursor / Cline / Windsurf
`~/.cursor/mcp.json`(전역) 또는 `.cursor/mcp.json`(프로젝트) 등에 위 Claude Code와 같은 `mcpServers` 블록. 추가 후 클라이언트 재시작.

> **소스를 클론한 개발자**는 `<BIN>` 대신 TS 소스를 직접 가리킬 수 있습니다(빌드 불필요):
> `node --no-warnings --experimental-sqlite --import tsx <careermate>/apps/mcp/src/index.ts mcp`

---

## 알려진 제약 · 트러블슈팅

- **Codex 데스크톱 앱(⚠️ CLI 권장):** [#24718](https://github.com/openai/codex/issues/24718)(OPEN) 시작 시 전역 `config.toml`을 재작성해 등록이 사라질 수 있음 + [#13025](https://github.com/openai/codex/issues/13025)(OPEN) 프로젝트 `.codex/config.toml` 무시. 그래서 **데스크톱 앱은 비권장, CLI를 쓰세요.** 설치 단계 `npm install`은 기본 샌드박스에서 네트워크가 꺼져 있어 **1회 허용**(또는 `[sandbox_workspace_write] network_access = true`)이 필요. (단 **MCP 서버 자체는 샌드박스 밖에서 돌아** 연결 후 데이터 읽기/쓰기는 막히지 않습니다.)
- **Claude Desktop에서 등록이 사라짐:** 팀/클라우드 동기화가 로컬 MCP를 덮어쓴 이슈([#59368](https://github.com/anthropics/claude-code/issues/59368), 수정됨). 동기화를 끄거나 **CLI + 프로젝트 `.mcp.json`** 사용.
- **연결 검증:** `get_onboarding_status` 호출(Codex는 `/mcp`). 빠른 점검: `npx -y careermate doctor`(Node·데이터 폴더·DB 상태).
- **자세한 복구**(포트 충돌·DB 마이그레이션·완전 초기화): 루트 [`/INSTALL.md`](../INSTALL.md) 9단계.

---

각 모드의 **영구 지침 파일**: Claude Code → [/CLAUDE.md](../CLAUDE.md), Codex → [/AGENTS.md](../AGENTS.md). 사람용 설치 → https://careermate.life · 사용 흐름 → [docs/START_WORKFLOW.md](./START_WORKFLOW.md).
