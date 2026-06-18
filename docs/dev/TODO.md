# CareerMate TODO (향후 방향)

아래 항목은 **v1 범위에서 명시적으로 제외**한다. 다만 패키지 경계·데이터 모델·도구 인터페이스는 이후 추가를 수용하도록 **구조를 열어둔다**.

> 사이트별 크롤러, 클라우드 동기화, DOCX export, i18n 같은 **기능/패키지 단위 백로그**는 [ROADMAP.md](./ROADMAP.md)가 관리한다(구조 개방 근거 포함). 이 문서는 **제품 방향(v1.5 / v2)과 미해결 과제**만 다루며, 중복 기재하지 않는다.

---

## v1.5

설치형 데스크톱 앱으로의 전환.

- **Electron** 셸 — 대시보드를 데스크톱 앱으로 래핑(정적 자산이라 셸로 감싸기 적합).
- **Windows / macOS 설치형 앱** — 더블클릭 설치, Node 동봉.
- **자동 업데이트** — 백그라운드 갱신.
- **트레이 상주** — MCP·대시보드 프로세스를 트레이에서 관리(시작/중지/상태).
- **`CareerMate.exe`** — 단일 실행 진입점.

## v2

로컬 stdio의 한계를 넘어 원격·범용 AI 클라이언트까지 확장.

- **Gateway Mode** — 로컬 stdio를 원격에서 접근 가능한 형태로 중계.
- **ChatGPT 일반 채팅** — 웹/모바일 ChatGPT에서 사용(현재는 로컬 stdio라 불가).
- **Claude 일반 채팅** — Claude 웹 앱 연동.
- **Gemini** — Gemini 클라이언트 연동.
- **oneTimeToken** — Gateway 접근을 위한 일회용 토큰 핸드셰이크.
- **WebSocket Local Agent** — 로컬 에이전트와 원격 클라이언트 간 양방향 채널.
- **MCP Gateway** — 원격 URL 기반 MCP 엔드포인트 노출.

## 미래 방향

향후 `CareerMate.exe`가 중심에 설 수 있고(현재는 v1.5 과제, v1 비범위), 그 구도에서 **AI는 "연결 어댑터"** 역할을 한다. ChatGPT / Claude / Gemini / Codex / Claude Code 등은 두뇌를 제공하는 별개 인터페이스일 뿐, 커리어 데이터의 단일 출처(source of truth)는 항상 로컬의 CareerMate다. 사용자는 그날 손에 잡히는 AI를 골라 같은 서랍장에 연결한다. 즉 AI는 **갈아끼우는 부품**, CareerMate는 **고정된 본체**라는 구도다.

---

## v1에서 제외 (구조는 열어둠)

다음은 v1에서 구현하지 않지만 설계상 길을 막지 않는다.

- Electron
- exe
- Gateway
- WebSocket
- oneTimeToken
- Cloud 저장 / 클라우드 동기화
- 인증 서버

## 열린 TODO / 미해결

확정·보완이 필요한 알려진 공백. 잊지 않도록 기록한다.

- **npm 게시(예정)** — `careermate@0.0.1`로 게시 예정. `npx -y careermate init` 경로. (소스 기반 `npm install` → `npm run init`도 그대로 유효.)
- **.mcpb GitHub Release(예정)** — `v0.0.1` Release에 `careermate.mcpb` 첨부 예정. careermate.life·GitHub Release에서 다운로드.
- **공개 repo URL 확정** — git remote 기준 정본은 `osntak/careermate`. 공개 전환 시 GitHub repo 이름을 소문자 `careermate`로 변경(도메인 `careermate.life`와 일치).
- **THIRD_PARTY_NOTICES — `im-not-ai`(MIT)** 항목의 저작권자/연도가 비어 있다. 실제 저작권자·연도로 채우기.
- ~~**`install-page/` 폴더명 변경**~~ — **완료(2026-06-18): `install-page/` → `site/`.** 코드 참조(`apps/web/src/server.ts`·`scripts/{build-dist,build-mcpb,build-demo,gen-og,shots}`)·`.gitignore`·문서 모두 갱신. ⚠️ **남은 수동 작업: Vercel 대시보드 프로젝트 Settings → Root Directory를 `install-page` → `site`로 변경해야 다음 배포부터 반영된다(안 바꾸면 배포만 실패하고 기존 사이트는 그대로 유지).**
