# CLAUDE.md — CareerMate

이 파일은 Claude Code/Desktop이 프로젝트 루트에서 자동으로 읽는 영구 지침입니다.
대상은 **CareerMate로 사용자의 커리어를 돕는 AI 에이전트**입니다. (코드 기여·개발 작업이라면 이 파일이 아니라 [`docs/`](docs/)를 보세요.)

CareerMate의 상시 지침은 **[`AGENTS.md`](AGENTS.md) 한 곳에서 관리**합니다(중복 방지). 아래 내용을 그대로 따르세요.

@AGENTS.md

---

## Claude에서 연결이 안 될 때

도구 호출이 실패하거나 CareerMate MCP 서버가 보이지 않으면 [`./INSTALL.md`](INSTALL.md)의 Claude 섹션을 따르세요. 요지:

- 프로젝트 범위 `.mcp.json`(CareerMate 폴더 안, top-level `mcpServers`)에 stdio 서버를 등록하거나, CLI로:

  ```
  claude mcp add --scope project --transport stdio careermate -- node --experimental-sqlite <경로>
  ```

- 등록 후 **Claude Code를 완전히 재시작**합니다. 첫 실행 시 프로젝트 서버에 대한 **일회성 승인**을 한 번 묻습니다 — 승인하세요.
- `/mcp` 명령으로 연결을 확인하거나, `get_onboarding_status`를 호출해 응답이 오는지 검증하세요.
