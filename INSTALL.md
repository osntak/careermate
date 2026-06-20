# CareerMate 설치 런북 (AI 에이전트용)

이 문서는 **AI 에이전트(Claude Code 또는 Codex)가** 사용자의 컴퓨터에 CareerMate를 설치·초기화할 때 한 단계씩 따라가는 런북입니다. 사람용 튜토리얼이 아니라, **당신(AI)이 실행하고 사용자에게 사용자의 언어로 설명하는** 절차서입니다.

각 단계는 순서대로 수행하되, 무엇을 할지 **먼저 사용자의 언어로 쉽게 설명하고 사용자의 동의를 받은 뒤** 실행하세요. 확실하지 않으면 추측하지 말고 사용자에게 확인합니다.

> Claude Desktop만 쓰는 사용자는 터미널이 필요 없습니다. 이 경우 `careermate.zip`을 압축 해제해 폴더로 추가하는 경로(아래 5단계)를 안내하세요. `.mcpb` 직접 추가는 일부 Claude Desktop 버전에서 실패하는 알려진 이슈가 있습니다.

> **빈 폴더에서 시작**한다면(소스를 미리 받지 않는 경우) 이 런북의 공개본을 에이전트에게 주세요: **https://careermate.life/llms-install.txt** — 에이전트가 그 URL을 직접 읽고 npm으로 자동 설치·연결합니다.

---

## 에이전트가 반드시 지켜야 할 규칙

1. **동의는 한 번에.** 설치가 하는 일(4단계 체크리스트)을 한 묶음으로 보여주고 **딱 한 번** 동의를 받습니다. 그 뒤 폴더 생성·MCP 등록·연결 검증 같은 로컬 동작은 **다시 묻지 않고** 이어서 진행합니다. 새로 멈춰 동의받아야 하는 건 **시스템 전역 변경(예: Node 설치)** 과 **사용자 개인 파일 읽기**뿐입니다.
2. **설명 먼저, 실행 나중.** 각 명령은 "지금 무엇을, 왜 하는지" 한 줄로 **알리되**(고지), 위 두 경우가 아니면 동의를 다시 묻지 않습니다.
3. **불필요한 파일을 읽지 않습니다.** 특히 사용자의 이력서·자기소개서 같은 개인 파일은 사용자가 그 단계를 요청했을 때만 읽습니다. 설치 단계에서는 읽을 필요가 없습니다.
4. **로컬 데이터를 외부로 올리지 않습니다.** CareerMate 데이터는 사용자 컴퓨터에만 저장됩니다. 어떤 단계에서도 외부 업로드를 하지 않습니다.
5. **실패하면 복구 절차를 제시합니다.** 명령이 실패하면 멈추지 말고 9단계 "문제 발생 시 복구 절차"의 해당 항목을 안내합니다.

---

## 먼저: 나는 어떤 에이전트인가

자신이 어떤 환경인지 먼저 확인하고, 그에 맞는 MCP 등록 방식을 사용하세요.

| 내가 누구인가 | MCP 등록 방식 |
|---|---|
| 사용자가 **Claude Desktop**을 쓰는 경우 | `careermate.zip` 압축 해제 후 폴더 추가 — **터미널 불필요** (`.mcpb` 직접 추가는 known issue) |
| **Claude Code** | 사용자가 여는 작업 폴더의 프로젝트 `.mcp.json`, 또는 `claude mcp add` (첫 실행 시 1회 승인) |
| **Codex** (OpenAI Codex CLI) | `~/.codex/config.toml`의 `[mcp_servers.careermate]` 테이블, 또는 `codex mcp add` |

대부분 `npm run init`(5단계)이 위 등록을 자동으로 처리합니다. 수동 등록 명령은 5단계 끝에 정리해 두었습니다.

---

## 1단계 — Node / npm 확인

```bash
node --version
```

- **`v22.5.0` 이상**이어야 합니다. CareerMate는 Node 내장 `node:sqlite`를 사용하므로 컴파일러나 네이티브 빌드가 필요 없습니다.
- 명령을 찾지 못하거나 버전이 낮으면 **사용자 동의를 받은 뒤** 설치하세요. (설치 후 터미널을 새로 열어 다시 확인)
  - Windows(PowerShell): `winget install OpenJS.NodeJS.LTS`
  - macOS: `brew install node`
  - 그 외 / 위가 안 되면: https://nodejs.org 에서 LTS 설치

---

## 2단계 — CareerMate 소개 (사용자에게 한 줄로)

- CareerMate는 **로컬 커리어 작업 공간**입니다. AI 서비스가 아니며, **내부에 LLM이 없습니다.**
- 분석·글쓰기 같은 "생각"은 **당신(사용자의 AI)** 이 하고, CareerMate는 커리어 데이터를 구조화해 저장·제공만 합니다.
- 한 줄 비유: **"당신의 AI가 두뇌, CareerMate는 커리어 서랍장."**
- 연결 방식은 **MCP 우선**입니다.

---

## 3단계 — 로컬 저장 원칙 (설치 전 반드시 고지)

- 모든 데이터는 사용자 컴퓨터의 **`~/.careermate`** (Windows: `%USERPROFILE%\.careermate`)에만 저장됩니다.
- 폴더 구성: `careermate.sqlite`(DB), `exports/`, `backups/`, `uploads/`, `server.json`(런타임 핸드셰이크).
- MCP 서버는 **외부 네트워크 호출을 하지 않습니다.** 대시보드는 **`127.0.0.1`(loopback)에만** 바인딩되어 외부에서 접근할 수 없습니다.
- 어떤 데이터도 외부로 업로드되지 않습니다.

---

## 4단계 — 사용자 동의 (여기서 멈추고 한 번 받으세요)

아래 네 가지를 **한 묶음으로 한 번에** 보여주고 "진행할까요?"라고 **딱 한 번** 동의를 받습니다(항목마다 따로 묻지 않습니다). 동의하면 폴더 생성·MCP 등록·연결 검증 등 나머지 로컬 동작은 다시 묻지 않고 이어서 진행합니다.

설치를 진행하면 CareerMate는 다음을 수행합니다. 진행할까요?

- 데이터 폴더 **`~/.careermate`** 생성 (그 안의 로컬 SQLite DB는 최초 사용 시 자동 생성)
- 사용 중인 AI 앱의 MCP 설정에 careermate 등록 (기존 설정은 자동 백업)
- 로컬 **대시보드 서버**(`http://127.0.0.1:4319`) 실행(요청 시) — 외부 접근 불가
- 모든 데이터를 **이 컴퓨터에만** 로컬 저장 (외부 업로드 없음)

사용자가 동의하지 않으면 진행하지 말고, 어떤 항목이 걸리는지 확인하세요.

---

## 5단계 — 초기화 (init)

### 권장 방식 — npx (클론 불필요)

`careermate`는 npm에 게시되어 있어 클론 없이 한 줄로 끝납니다.

```bash
npx -y careermate init
```

### 소스 기반 (개발 / .mcpb 빌드 시)

CareerMate 폴더를 직접 받은 경우:

```bash
npm install
npm run init
```

`npm run init`은 `node bin/careermate.mjs init`과 사실상 같은 일을 합니다(후자는 `--experimental-sqlite`와 고정 cwd가 더 붙지만, `init`은 DB를 열지 않으므로 결과는 동일합니다).

`init`이 하는 일:
- `~/.careermate` 폴더를 보장합니다.
- **감지된** AI 클라이언트를 자동 등록합니다(설정 파일 또는 그 상위 폴더가 있으면 감지된 것으로 간주).
- **Claude Code 프로젝트 `.mcp.json`은 항상** 이 명령을 실행한 작업 폴더에 기록합니다.
- **Claude Code면** 같은 폴더 `.claude/settings.local.json`에 careermate **데이터 도구를 사전 허용**해, 재시작 후 도구마다 뜨던 승인 프롬프트를 없앱니다(파일 읽기·업데이트·삭제 등 민감 도구는 제외해 그대로 확인을 받음; 끄려면 `--no-allow-tools`).
- 기존 설정은 변경 전에 타임스탬프 백업을 만들고, 사용자 env와 무관한 TOML 테이블은 보존합니다.

### 클라이언트별 결과

| 클라이언트 | 등록 결과 |
|---|---|
| **Claude Desktop** | `careermate.zip` 압축 해제 후 폴더 추가(아래) — `init`과 별개. `.mcpb` 직접 추가는 known issue |
| **Claude Code** | 현재 작업 폴더에 `.mcp.json` + `.claude/settings.local.json`(데이터 도구 사전 허용) 기록 → 첫 실행 시 폴더 **"신뢰" 1회**만 |
| **Codex** | `~/.codex/config.toml`의 `[mcp_servers.careermate]` 기록 → Codex 안에서 `/mcp`로 확인 |

`.mcp.json`은 최상위 `"mcpServers"` 아래에 서버별 `{"type":"stdio","command":...,"args":[...]}` 형태로 들어갑니다.

### 유용한 init 플래그

- `--client claude|claude-code|codex|cursor` — 특정 클라이언트만 등록
- `--all-clients` — 감지 여부와 무관하게 모두 등록
- `--npx` — MCP 실행을 npx 형태로 등록(npx로 설치하면 자동 적용)
- `--print` — 실제로 쓰지 않고 설정/명령만 출력

예: 무엇이 기록될지 먼저 보여주기 →
```bash
npm run init -- --print
```

### 수동 등록 명령 (대안)

`init` 대신 직접 등록할 수도 있습니다. 아래 `<CareerMate>`는 CareerMate 폴더의 **절대경로**입니다. 진입점은 plain‑JS 셸인 **`bin/careermate.mjs`**를 쓰세요 — 이 셸이 `--experimental-sqlite`와 tsx/번들 분기를 알아서 처리하므로, `careermate init`이 자동 등록하는 명령과 기능적으로 동일합니다(`init`은 실제로는 현재 Node 실행 파일의 절대경로를 기록하지만, 아래 `node …` 형태도 PATH에서 똑같이 동작합니다).

- Claude Code:
  ```bash
  claude mcp add --scope project --transport stdio careermate -- node <CareerMate>/bin/careermate.mjs mcp
  ```
- Codex:
  ```bash
  codex mcp add careermate -- node <CareerMate>/bin/careermate.mjs mcp
  ```

> ⚠️ TS 소스(`apps/mcp/src/index.ts`)를 직접 가리킬 때는 `--import tsx`가 **반드시** 필요합니다(`node --no-warnings --experimental-sqlite --import tsx <CareerMate>/apps/mcp/src/index.ts mcp`). 위 `bin/careermate.mjs` 형태가 더 간단하고 빌드 유무와 무관하게 동작합니다.

### Claude Desktop — ZIP 폴더 설치 (터미널 불필요)

1. `npm run build:mcpb`로 만들어진 **`dist/careermate.zip`** 을 압축 해제합니다.
2. Claude Desktop의 **Settings → Extensions → Advanced settings → Install extension…** 에서 압축을 푼 폴더를 추가합니다.
3. Claude Desktop을 **완전히 재시작**합니다.

`.mcpb` 직접 추가는 일부 Claude Desktop 버전에서 설치 창이 뜨지 않거나 실패하는 알려진 이슈가 있습니다. `careermate.zip`은 같은 번들을 폴더 설치용으로 제공하는 파일이며, 폴더 안에는 같은 `manifest.json`과 서버 코드가 들어 있습니다.

> 참고: `careermate.mcpb`와 `careermate.zip`은 GitHub Release에서 내려받을 수 있습니다. 소스를 받은 경우 `npm run build:mcpb`로 둘 다 직접 빌드할 수 있습니다. 둘 다 잘 안 되면 **터미널에서 `npx -y careermate init`** 가 가장 간단한 대안입니다.

### init 직후 마무리

- AI 클라이언트를 **완전히 재시작**합니다.
- Claude Code라면 이 폴더를 처음 열 때 뜨는 **"신뢰(trust)" 1회**를 수락합니다(데이터 도구는 사전 허용돼 도구별 승인은 거의 없음).
- 연결 검증: AI에게 **`get_onboarding_status`** 도구를 호출하게 합니다. (Codex는 `/mcp`로도 확인)
- 폴더를 옮긴 경우 `init`을 다시 실행합니다.

---

## 6단계 — doctor (설치 점검)

```bash
npm run doctor
```

(전역 설치 시 `careermate doctor`, npx는 `npx -y careermate doctor`)

확인 항목: **Node 버전, 데이터 폴더, DB, 도구 개수, 대시보드 상태**. 문제가 보이면 9단계의 해당 복구 절차로 연결하세요.

---

## 7단계 — 대시보드 실행

```bash
npm start
```

(전역 설치 시 `careermate start`, npx는 `npx -y careermate start`)

- 기본 주소: **`http://127.0.0.1:4319`**. 포트가 사용 중이면 자동으로 다음 빈 포트로 폴백하므로, **터미널에 출력된 실제 주소**를 사용자에게 알려주세요.
- 항상 `127.0.0.1`에만 바인딩되어 외부 접근이 불가합니다.
- 종료: 터미널에서 `Ctrl+C`.
- AI에게 **"대시보드 열어줘"** 라고 하면 서버가 꺼져 있을 때 백그라운드로 자동 시작한 뒤 브라우저를 엽니다. 이 경우 AI 터미널 세션을 닫아도 대시보드는 계속 실행될 수 있습니다.

---

## 8단계 — 설치 완료 카드 (사용자에게 보여주기)

연결 검증까지 끝났으면, 사용자에게 아래 "완료 카드"를 사용자의 언어로 보여주고 마무리하세요(도구 이름은 노출하지 말 것). **지금 실행 중인 앱에 맞는 항목만 골라** 안내합니다(공통 '붙여넣기'는 항상 포함).

> ✅ **설치 끝! 이제 이렇게 시작하세요**
>
> 1. (아직이면) 이 앱을 **완전히 껐다 다시** 켜세요. 처음 한 번 뜨는 승인 창은 **'허용'**.
> 2. **이력서를 저에게 주세요** — 편한 방법 아무거나:
>    - **(공통·제일 쉬움)** 이력서 *내용*을 복사해 **대화창에 그대로 붙여넣기** — 파일이 어디 있든 상관없어요.
>    - **(Claude 채팅)** 채팅창에 파일을 **직접 첨부**.
>    - **(폴더 기반 — Claude Code 탭 / Codex / Antigravity)** 작업 폴더에 파일을 두고 *"이력서.pdf 읽어서 등록해줘"*처럼 **파일명·경로**로.
>    - ⚠️ 스캔본(이미지) PDF·보안 걸린 파일은 못 읽을 수 있어요 → 그땐 **내용을 텍스트로 붙여넣기**.
>    - → 그리고 **"내 이력서로 처음 세팅 해줘"** 한마디면 프로필·이력서로 정리해 저장합니다.
> 3. **대시보드에서 확인** → **http://127.0.0.1:4319** ("대시보드 열어줘"라고 해도 됩니다. 포트가 바뀌면 실제 주소를 알려드려요.)
>
> *데이터는 전부 이 컴퓨터(`~/.careermate`)에만 저장돼요. 어디로도 안 올라갑니다.*

> 💡 **헷갈릴 때**: "이력서 주기·세팅해줘" 같은 말은 전부 **AI와의 대화창**에 자연어로 하면 됩니다(명령어 아님). 설치 때 친 명령어(`npm`·`node`…)는 **터미널**에서 돈 것이고 보통 AI가 대신 실행합니다. · Claude Code 탭 / Codex = 터미널 안에서 대화(한 창) · Claude 채팅 앱 = 터미널 없이 채팅창만.

그 다음부터는 평소 흐름입니다: **공고 저장 → 적합도 분석 → 자소서 작성 → 지원 상태 관리 → 면접 준비.** 무언가를 **저장·완료할 때마다 대시보드 주소를 알려주세요.** 단 브라우저를 자동으로 새로 여는 건 **첫 온보딩 때 한 번만** — 이후엔 링크만 보여주고, 사용자가 "열어줘"라고 할 때만 엽니다. (글쓰기 전 항상 `get_application_context`를 먼저 호출)

자세한 사용 순서와 도구 호출 흐름은 **[docs/START_WORKFLOW.md](docs/START_WORKFLOW.md)** 를 따르세요.

---

## 9단계 — 문제 발생 시 복구 절차

| 증상 | 조치 |
|---|---|
| **포트 충돌** (4319 사용 중) | 자동 폴백되니 터미널의 실제 주소를 확인. 포트를 고정하려면 `CAREERMATE_PORT` 환경변수를 설정 후 재실행. AI가 백그라운드로 열었을 때의 실행 로그는 `~/.careermate/server.log`에 남습니다. |
| **MCP가 연결되지 않음** | ① 등록 경로가 맞는지 ② `node --version`이 22.5.0 이상인지 ③ `npm install`을 마쳤는지 확인 → 그다음 **AI 클라이언트를 완전히 재시작**. 폴더를 옮겼다면 `npm run init`을 다시 실행. |
| **Claude `.mcpb` 파일 설치가 무반응/실패** | 알려진 이슈입니다. `careermate.zip`을 내려받아 압축 해제 → Claude Desktop 확장 설정에서 압축을 푼 폴더를 추가. 그래도 안 되면 `npx -y careermate init` 경로로 등록. |
| **무엇이 잘못됐는지 모를 때** | `npm run doctor`로 Node·데이터 폴더·DB·도구 개수·대시보드 상태를 한 번에 점검. |
| **데이터 위치 확인** | `~/.careermate` (Windows: `%USERPROFILE%\.careermate`). 데이터 폴더를 옮기려면 `CAREERMATE_DATA_DIR` 환경변수 사용. |
| **DB 스키마 문제** | `npm run migrate` — 여러 번 실행해도 안전합니다(idempotent). |
| **완전 초기화** | `~/.careermate/backups/`로 **먼저 백업**한 뒤 `careermate.sqlite`를 삭제하고 다시 init/migrate. (되돌릴 수 없으니 반드시 백업 먼저) |

추가 환경변수: `CAREERMATE_NO_OPEN=1`(브라우저 자동 열기 비활성화 — 값이 정확히 `1`일 때만 적용됩니다).

---

설치·연결 후 사용 흐름 → **[docs/START_WORKFLOW.md](docs/START_WORKFLOW.md)**
