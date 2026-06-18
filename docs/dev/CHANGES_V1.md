# v1 변경 기록 (CHANGES_V1)

이 문서는 CareerMate **v1 재설계**의 배경·목표와 구체적인 구조 변경을 기록한다. 무엇을
왜 바꿨는지, 무엇을 그대로 유지하고 무엇을 범위에서 뺐는지, 그리고 아직 남은 TODO를
한곳에서 추적하기 위한 문서다. 기준일: **2026-06-14**.

관련 문서: [설계 결정(ADR)](./DECISIONS.md), [로드맵](./ROADMAP.md), [TODO](./TODO.md),
[AI 런북(/INSTALL.md)](../../INSTALL.md)

---

## 1. 배경 / 목표

CareerMate는 "AI 서비스"가 아니다. **로컬 커리어 워크스페이스**다. 분석·작성 같은
지능 작업은 사용자의 로컬 AI 에이전트가 수행하고, CareerMate는 구조화된 커리어 데이터를
로컬에 저장·제공하는 역할만 한다(LLM 비내장, MCP-우선 — [DECISIONS.md #4](./DECISIONS.md) 참조).

v1의 목표는 이 정체성을 제품 표면과 문서 전반에 일관되게 반영하고, **로컬 stdio MCP를
지원하는 세 가지 사용 방식**을 1급으로 끌어올리는 것이다.

| 순위 | 사용 방식 | 영구 지시 파일 | MCP 등록 위치 |
|---|---|---|---|
| 1 | Claude Desktop | (번들 Node) | `.mcpb` 원클릭 설치 → "Claude Desktop 연결" |
| 2 | Claude Code | 루트 `CLAUDE.md` | 프로젝트 `.mcp.json` (CareerMate 폴더 내) |
| 3 | Codex (OpenAI Codex CLI) | 루트 `AGENTS.md` | `~/.codex/config.toml` `[mcp_servers.careermate]` |

> ChatGPT·Gemini **웹/모바일은 동작하지 않는다.** 이들은 클라우드에서 돌며 원격 URL
> MCP만 쓸 수 있어, 로컬 stdio 서버에 닿지 못한다. 로컬에서 실행되는 Claude Desktop /
> Claude Code / Codex만 연결된다. (보조: Cursor / Cline / Windsurf 등 다른 로컬 stdio
> MCP 클라이언트도 `npm run init`으로 동작하나, 1급으로 내세우지 않는다.)

---

## 2. 변경 사항

### 2.1 Claude Desktop 재배치
- 기존: `.mcpb` 원클릭이 사실상 **메인 설치 경로**처럼 제시됨.
- 변경: 여러 연결 방법 중 **하나**인 "Claude Desktop 연결"로 재배치. `.mcpb` 경로는
  그대로 유지하되 단일 정답이 아님을 명확히 함.

### 2.2 Claude Code 지원 추가
- 루트 `CLAUDE.md`를 영구 지시 파일로 사용.
- MCP 등록은 CareerMate 폴더 안의 **프로젝트 스코프 `.mcp.json`**
  (top-level `mcpServers`, 서버별 `{"type":"stdio","command":...,"args":[...]}`).
- 대안 CLI: `claude mcp add --scope project --transport stdio careermate -- node --experimental-sqlite <path>`.
- Claude Code는 첫 실행 시 프로젝트 서버에 대해 **1회 승인**을 요구한다.

### 2.3 Codex 지원 추가
- 루트 `AGENTS.md`를 영구 지시 파일로 사용.
- MCP 등록은 `~/.codex/config.toml`의 `[mcp_servers.careermate]` 테이블
  (`command=...`, `args=[...]`).
- 대안 CLI: `codex mcp add careermate -- node --experimental-sqlite <path>`.
- Codex 안에서 `/mcp` 명령으로 검증.

### 2.4 `scripts/init.ts` 확장 (구현 완료, 고정)
- 타깃에 `claude-code` / `codex` 추가(기존 `claude`, `cursor`와 함께).
- **감지 기반 기본 동작**: 설정 파일 또는 그 상위 폴더가 존재하면 해당 클라이언트를
  "감지"로 보고 자동 등록. Claude Code 프로젝트 `.mcp.json`은 **항상** CareerMate
  폴더에 기록.
- 플래그 추가: `--print`(쓰지 않고 출력), `--npx`(npx 실행 형태로 등록),
  `--all-clients`(감지 무관 전부 기록), `--client <name>`(하나만 타깃).
- **Codex TOML 머지**: 기존 설정을 타임스탬프 백업한 뒤, 사용자 env와 무관한 TOML
  테이블을 보존하면서 병합.

### 2.5 설치 문서 이원화
- 루트 **`/INSTALL.md` 신설** — AI 에이전트가 따라가는 런북.
- `docs/INSTALL.md`는 **수동 설정 레퍼런스**로 전환.
- `docs/SUPPORTED_AI_APPS.md` 신설 — 지원/미지원 AI 앱 정리(웹이 왜 안 되는지 포함).
- `docs/dev/TODO.md` 신설 — 미해결 과제 추적.

### 2.6 기타
- `package.json` publish 메타데이터 보강: `author`, `keywords`, `publishConfig`.
- `.gitignore`에 `.mcp.json` 추가(로컬 등록 산출물 커밋 방지).
- README / site 재배치 — 세 가지 1급 사용 방식 구조에 맞춰 재구성.

---

## 3. 유지 / 비범위

### 유지 (삭제하지 않음)
- 패키지: `packages/{shared,db,core,mcp-tools,exporters,parsers,prompts,workflows}`
- 앱: `apps/{web,mcp}`, 그리고 `site/`, `docs/`, `scripts/`
- 기존 5종 워크플로우(onboarding, analyze_job, write_cover_letter,
  manage_application_status, prepare_interview) 전부.
- `.mcpb` 빌드 경로(`npm run build:mcpb` → `dist/careermate.mcpb`).

### v1 비범위 (제외하되 구조는 열어둠)
Electron · exe · Gateway · WebSocket · oneTimeToken · 클라우드 저장/동기화 · 인증 서버.
구조는 이후 추가를 수용할 수 있게 열어두며, 상세는 [docs/dev/TODO.md](./TODO.md)와
[ROADMAP.md](./ROADMAP.md)를 참조한다.

---

## 4. 알려진 미해결 TODO

| 항목 | 현재 상태 | 비고 |
|---|---|---|
| npm 게시 | 예정 | `careermate@0.0.1`로 게시 예정. `npx -y careermate init` 경로. 소스 기반도 유효. |
| `.mcpb` Release | 예정 | `v0.0.1` Release에 `careermate.mcpb` 첨부 예정. careermate.life·GitHub Release에서 다운로드. |
| 공개 repo URL | **확정** | 정본 `osntak/careermate`(git remote 기준, 소문자 — 도메인과 일치). |
| THIRD_PARTY_NOTICES | **보완 필요** | 서드파티 고지 정리 미완. |

> 갱신(2026-06-15): npm 게시 · Release 생성 · repo URL 확정 완료. 남은 결정은 저장소 공개 전환 여부(공개 시 `.mcpb` 공개 다운로드 활성화)와 THIRD_PARTY_NOTICES 보완.
