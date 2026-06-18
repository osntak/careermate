# docs/ — 문서 지도

CareerMate 문서는 두 부류로 나뉜다. 기준은 **"누가 왜 읽는가"** 다.

- **배포용** — 유저나 그 LLM이 CareerMate를 *쓰려고* 읽는 운영 문서.
- **개발용(dev)** — CareerMate를 *개발·설계하려고* 읽는 내부 문서.

> npm 패키지(`package.json`의 `files`)에는 **배포용만** 싣는다(개발용은 저장소에만). 단 데모 워크스루처럼 careermate.life가 대신 커버하는 일부 배포용 문서는 패키지에서 제외한다.

## 배포용 (유저·연결된 LLM 대면)
- [career-os/](career-os/README.md) — 외부 LLM 커리어 작업 지침. 진입점은 `career-os/README.md` → `eop/`(실행 절차) → `knowledge/`(정본 지식). **이 셋이 제품 콘텐츠다.** (같은 폴더의 `validation/`·`implementation/`은 개발용 — 아래 참조.)
- [START_WORKFLOW.md](START_WORKFLOW.md) — 연결 직후 AI 시작 런북
- [WORKFLOWS.md](WORKFLOWS.md) — 5대 표준 워크플로우
- [MCP_TOOLS.md](MCP_TOOLS.md) — MCP 도구 레퍼런스
- [FAQ.md](FAQ.md) — 설치·연결·사용 문제 해결
- [SUPPORTED_AI_APPS.md](SUPPORTED_AI_APPS.md) — 지원 AI 앱·설치 레퍼런스
- [DEMO.md](DEMO.md) — 데모 워크스루 _(npm 미포함 — 데모는 careermate.life가 호스팅)_

## 개발용 (dev — npm 미포함)
- [dev/ARCHITECTURE.md](dev/ARCHITECTURE.md) — 시스템 아키텍처(2-프로세스·단일 SQLite)
- [dev/DATA_MODEL.md](dev/DATA_MODEL.md) — DB 스키마·데이터 모델
- [dev/DECISIONS.md](dev/DECISIONS.md) — 설계 결정 기록(ADR)
- [dev/ROADMAP.md](dev/ROADMAP.md) — 로드맵(현재 범위·향후 과제)
- [dev/TODO.md](dev/TODO.md) — v1 범위 밖 향후 과제
- [dev/CHANGES_V1.md](dev/CHANGES_V1.md) — v1 재설계 배경·구조 변경 기록
- [dev/RUNTIME_DISTRIBUTION_RESEARCH.md](dev/RUNTIME_DISTRIBUTION_RESEARCH.md) — 원클릭 배포 실현성 조사
- [dev/UX_NOTES.md](dev/UX_NOTES.md) — 대시보드 UI/UX 설계 노트
- career-os 내부: [career-os/validation/](career-os/validation/README.md) (교차검증 방법론·증거) · [career-os/implementation/](career-os/implementation/) (Phase B 빌드 스펙)
