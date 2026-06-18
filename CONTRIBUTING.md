# 기여 가이드 (Contributing)

CareerMate에 관심 가져 주셔서 감사합니다. 이 문서는 **코드/문서를 기여하려는 개발자**를
위한 것입니다. (CareerMate를 *사용*하는 방법은 [`README.md`](README.md)와
[`INSTALL.md`](INSTALL.md)를 보세요.)

## CareerMate가 무엇인지 먼저

CareerMate는 "AI 서비스"가 아니라 **로컬 커리어 워크스페이스**입니다. 분석·작성 같은 지능
작업은 사용자의 로컬 AI 에이전트가 하고, CareerMate는 구조화된 커리어 데이터를 로컬에
저장·제공하는 MCP-우선 도구입니다. 기여할 때도 이 정체성(두뇌는 에이전트, 저장은
CareerMate)을 지켜 주세요. 배경은 [`docs/dev/DECISIONS.md`](docs/dev/DECISIONS.md)와
[`docs/dev/ARCHITECTURE.md`](docs/dev/ARCHITECTURE.md)에 있습니다.

## 개발 환경

- **Node.js ≥ 22.5.0** (`node:sqlite`와 `--experimental-sqlite` 플래그 사용)
- 의존성 설치: `npm install`

자주 쓰는 스크립트:

| 명령 | 설명 |
|------|------|
| `npm run dev` | 대시보드를 watch 모드로 실행 (`127.0.0.1:4319`) |
| `npm start` | 대시보드 실행 |
| `npm run mcp` | MCP stdio 서버 실행 |
| `npm test` | 코어 + HTTP API + 보안 + MCP + DB 통합 스모크 |
| `npm run test:ui` | Playwright 대시보드 렌더 + 반응형 오버플로 스모크 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | npm 배포용 `dist/` 빌드 |

`npm run test:ui`는 Playwright가 필요합니다: `npm i -D playwright && npx playwright install chromium`
(미설치 시 자동으로 건너뜁니다).

## 저장소 구조

```
packages/   shared·db·core·mcp-tools·exporters·parsers·prompts·workflows·knowledge (코어 로직)
apps/web    127.0.0.1 로컬 대시보드 (바닐라 Node http + 자체 라우터, public/)
apps/mcp    MCP stdio 서버 (AI 에이전트가 호출)
install-page careermate.life 랜딩 + 무설치 데모
scripts/    init·migrate·doctor·test·ui-smoke 등
docs/       영구 문서 (아키텍처·데이터 모델·결정·워크플로우·MCP 도구 레퍼런스)
.claude/work 진행 중 작업 노트(working memory) — /work-log 스킬로 관리
```

## 변경을 보내기 전에

1. **테스트와 타입체크가 통과해야 합니다**: `npm run typecheck && npm test && npm run test:ui`.
   깨진 상태로 푸시하지 마세요.
2. **사용자 데이터를 외부로 보내는 코드를 추가하지 마세요.** 로컬-우선 원칙은 협상 대상이
   아닙니다.
3. **입력은 zod 스키마로 검증**하고 자유 텍스트에는 길이 상한을 두세요
   (`packages/shared/src/schemas.ts` 패턴 참고).
4. **대시보드에서 사용자 데이터를 렌더링할 때는** `lib.js`의 `el()`(textContent)와 `safeUrl()`
   을 쓰세요. `innerHTML`에 사용자 데이터를 직접 넣지 마세요.
5. 상시 지침(에이전트 규칙)은 **[`AGENTS.md`](AGENTS.md) 한 곳**에서 관리합니다
   (`CLAUDE.md`/`GEMINI.md`는 이를 가져다 씁니다). 규칙을 바꾸면 `AGENTS.md`만 고치세요.

## 커밋 / PR 규칙

- **[Conventional Commits](https://www.conventionalcommits.org/)** 를 따릅니다:
  `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`. 범위는 선택
  (예: `fix(dashboard): …`, `fix(security): …`).
- **하나의 커밋은 하나의 목적**만 갖습니다. 작은 커밋을 선호합니다.
- 사용자 대상 변경은 [`CHANGELOG.md`](CHANGELOG.md)의 `[Unreleased]`에 한 줄 추가하세요.
- PR에는 무엇을·왜 바꿨는지와 검증 방법(어떤 테스트를 돌렸는지)을 적어 주세요.

## 버그 신고 / 기능 제안

GitHub 이슈를 사용하세요. **보안 취약점은 이슈가 아니라** [`SECURITY.md`](SECURITY.md)의
절차로 비공개 신고해 주세요.

## 행동 강령

이 프로젝트는 [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md)를 따릅니다.
