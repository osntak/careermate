# GEMINI.md — CareerMate

이 파일은 Gemini CLI가 프로젝트 루트에서 자동으로 읽는 영구 지침입니다.
대상은 **CareerMate로 사용자의 커리어를 돕는 AI 에이전트**입니다. (코드 기여·개발 작업이라면 이 파일이 아니라 [`docs/`](docs/)를 보세요.)

CareerMate의 상시 지침은 **[`AGENTS.md`](AGENTS.md) 한 곳에서 관리**합니다(중복 방지). 아래 내용을 그대로 따르세요.

@AGENTS.md

---

## Gemini에서 연결이 안 될 때

CareerMate MCP 도구가 보이지 않으면 [`./INSTALL.md`](INSTALL.md)의 안내를 따르세요. 요지:

- `~/.gemini/settings.json`의 `mcpServers`에 stdio 서버로 등록합니다(`command`, `args` 지정):

  ```json
  {
    "mcpServers": {
      "careermate": {
        "command": "node",
        "args": ["--experimental-sqlite", "<CareerMate>/bin/careermate.mjs", "mcp"]
      }
    }
  }
  ```

- 등록 후 **Gemini CLI를 완전히 재시작**하고, `/mcp` 명령으로 `careermate`가 보이는지 확인합니다.
- 검증: `get_onboarding_status`를 한 번 호출해 응답이 오는지 확인하세요.
