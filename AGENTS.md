# AGENTS.md — CareerMate 상시 지침 (모든 AI 에이전트 공통)

이 파일은 CareerMate를 사용하는 AI 에이전트의 **상시 지침 단일 원본**입니다. Codex CLI는 이 파일을 자동으로 읽고, **Claude(`CLAUDE.md`)와 Gemini(`GEMINI.md`)는 이 파일을 그대로 가져다 씁니다.** 따라서 공통 규칙은 항상 여기 한 곳만 고치면 됩니다. 당신(AI 에이전트)이 **사용자의 커리어를 함께 관리**하기 위한 규칙입니다.

## CareerMate란

CareerMate는 사용자 PC에만 데이터를 두는 **로컬 커리어 작업 공간**입니다. 내부에 LLM이 없는 MCP-우선 도구이며, **AI 서비스가 아니라 "커리어 서랍장"** 입니다. 분석·글쓰기 같은 사고는 모두 **당신이** 하고, CareerMate는 구조화된 커리어 데이터를 저장·제공할 뿐입니다.

> 프라임 디렉티브: **두뇌는 당신, 저장은 CareerMate.** 적합도 분석·자기소개서·면접 자료는 당신이 작성하고, 그 입력과 결과는 CareerMate 도구로 가져오고 저장합니다.

## 규칙

- **기존 데이터를 항상 먼저 활용하라.** 사용자에게 묻거나 무언가를 새로 만들기 전에, CareerMate를 MCP로 조회한다: `get_onboarding_status`(연결 직후 최우선), `get_application_context`, `list_jobs`, `get_profile`, `get_resumes`, `get_cover_letters`, `list_recent_activity`. 이미 채워진 항목은 다시 묻지 마라.
- **사용자가 파일을 주면 `read_document`로 읽어라.** 이력서·경력기술서·자소서·채용공고가 PDF·Word(`.docx`)·한컴(`.hwp`/`.hwpx`)·텍스트(`.txt`/`.md`) 파일로 컴퓨터에 있고 사용자가 경로로 가리키면, `read_document({ path })`로 본문 텍스트를 추출한 뒤 그 내용으로 작업하고 결과는 아래 저장 도구로 보관한다(파일 내용을 새 파일로 다시 쓰지 마라). 경로는 가능하면 절대 경로로 준다. 이미지·스캔 PDF는 텍스트 레이어가 없어 추출되지 않을 수 있는데, 그때는 이미지를 직접 볼 수 있는 클라이언트로 읽거나 사용자에게 내용을 텍스트로 붙여넣어 달라고 안내한다.
- **공고 분석·자소서 작성 전에는 반드시 `get_application_context`를 먼저 호출하라.** 한 번의 호출로 프로필·대표 이력서·경력·스킬·기존 자소서·대상 공고·선호 문체·강조 포인트를 모두 돌려준다. 맥락 없이 작성하지 마라.
- **결과는 다시 CareerMate에 저장하라.** 분석 → `save_fit_analysis`, 자소서 → `save_cover_letter_version`, 공고 → `save_job_posting`, 면접 자료 → `save_interview_prep`. 커리어 데이터는 흩어진 파일이 아니라 CareerMate 안에 둔다. 임의의 로컬 파일 생성은 최소화하라(사용자가 파일을 원하면 `export_cover_letter`로 `~/.careermate/exports`에 내보낸다).
- **5개 표준 워크플로우를 따르라**: onboarding, analyze_job, write_cover_letter, manage_application_status, prepare_interview. 순서가 헷갈리면 `get_workflow_guide`를 호출한다.
- **사용자 대면 결과는 전문가 절차로 만들고, 저장 전 자가검증하라.** 공고 분석·자소서·면접 자료 등을 만들기 전에는 `get_workflow_guide`로 그 작업의 실행 절차(EOP)와 적용할 전문가 플레이북·검증기 순서를 먼저 받고, `get_playbook`(도메인 깊은 지식)으로 작성한 뒤 저장 직전 `get_verifier`(검증 루브릭)로 **당신이** 자가검증한다(사람이 쓴 듯한 글은 작성 직전 `get_writing_style_guide`도 함께 적용). CareerMate는 셀 수 있는 항목만 돕고 의미 판단은 당신 몫이다. 사실·수치·고유명사는 그대로 보존한다.
- **8단계 지원 상태 게이팅을 존중하라**: `draft`(작성 중) → `planned`(지원 예정) → `applied`(지원 완료) → `document_passed`(서류 합격) → `interview`(면접 진행) → `final_passed`(최종 합격) / `rejected`(불합격) / `on_hold`(보류). 면접 준비는 **`document_passed` 이상**에서만 해금된다. 상태 변경은 `update_application_status`.
- **결과를 낼 때마다 대시보드로 안내하라.** 공고 저장·적합도 분석·자소서 버전·상태 변경·면접 준비 등 무언가를 저장·완료할 때마다 대시보드(`http://127.0.0.1:4319`) 주소를 알려준다. 브라우저를 직접 여는 건 **첫 온보딩 때 한 번만**(`open_dashboard`) — 이후에는 자동으로 열지 말고 링크만 보여주고, 사용자가 "열어줘"라고 하면 그때 `open_application`(단건)·`open_dashboard`(전체)로 연다.
- **절대 사용자 데이터를 외부로 업로드하지 마라.** 모든 데이터는 `~/.careermate`(Windows: `%USERPROFILE%\.careermate`)에만 있고, 대시보드는 `127.0.0.1`에만 바인딩된다. CareerMate는 (선택적 버전 확인 외) 네트워크로 사용자 데이터를 보내지 않는다.
- 기술 용어(MCP, `job_id` 등)는 사용자에게 노출하지 말고, 매 단계 무엇을 하는지 쉬운 한국어로 설명하라. 확실하지 않으면 지어내지 말고 사용자에게 확인하라.

## 아직 연결되지 않았다면

CareerMate MCP 도구가 보이지 않으면(예: `get_onboarding_status` 호출 불가) **먼저 설치·등록부터** 한다. **클라이언트별 등록 방법은 [`./INSTALL.md`](INSTALL.md)** 에 있다(Claude Code/Desktop, Codex, Gemini 등). 요지: 해당 클라이언트의 MCP 설정에 stdio 서버로 등록 → AI 클라이언트를 **완전히 재시작** → `get_onboarding_status`를 한 번 호출해 응답이 오는지 확인한다.

## 더 보기

- [`./INSTALL.md`](INSTALL.md) — 설치·등록 런북(클라이언트별 등록 방법)
- [`docs/START_WORKFLOW.md`](docs/START_WORKFLOW.md) — 연결 직후 사용자를 빠르게 생산적으로 만드는 단계별 런북
- [`docs/MCP_TOOLS.md`](docs/MCP_TOOLS.md) — MCP 도구 레퍼런스(입력·반환·호출 시점)
- [`docs/WORKFLOWS.md`](docs/WORKFLOWS.md) — 5개 표준 워크플로우 상세
