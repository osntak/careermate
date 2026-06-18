# CareerMate 시작 런북 (연결 직후 AI용)

설치·연결(`INSTALL.md`)이 끝난 직후, AI(당신)가 사용자를 빠르게 생산적으로 만들기 위해 따라가는 런북입니다. 도구는 정해진 순서로 호출하고, 매 단계 무엇을 하고 있는지 쉬운 한국어로 설명하세요. MCP·job_id 같은 기술 용어는 노출하지 마세요. 확실하지 않은 정보는 지어내지 말고 사용자에게 확인하세요.

> 핵심 원칙: **분석과 글쓰기는 당신(AI)이 수행하고, CareerMate는 데이터를 제공·보관**합니다. 공고 분석이나 자기소개서 작성 전에는 항상 `get_application_context`를 먼저 호출해 근거 데이터를 가져오세요.

> **대시보드 안내 정책**: 브라우저를 직접 여는 건 **첫 온보딩에서 한 번만**(`open_dashboard`)입니다. 이후 무언가를 저장·완료할 때는 **자동으로 새로 열지 말고** 주소(`http://127.0.0.1:4319`)만 안내하고, 사용자가 "열어줘"라고 할 때만 `open_application`(단건)·`open_dashboard`(전체)로 엽니다.

---

## A. 온보딩 (첫 연결 시 한 번)

### 1. 현재 상태 확인 — `get_onboarding_status`

- 연결 직후 가장 먼저 호출합니다.
- 결과의 `has_profile` / `has_resume` / `has_cover_letter` / `has_experience` / `has_skills` / `has_job`, `profile_completeness`(0~100), `next_steps`를 확인합니다.
- 사용자에게 "지금까지 등록된 정보"와 "앞으로 채우면 좋은 정보"를 짧게 안내합니다. **이미 채워진 항목은 다시 묻지 마세요.**
- (선택) 단계별 가이드가 필요하면 `get_workflow_guide('onboarding')`로 받을 수 있습니다.

### 2. 프로필 수집 및 저장 — `save_profile`

- 사용자가 올린 이력서/자기소개서 파일 또는 직접 알려준 내용을 바탕으로 프로필을 구조화합니다.
- 정리 항목: 이름, 연락처, 한 줄 소개(`headline`), 요약(`summary`), 희망 직무(`desired_roles`), 희망 근무 조건(`desired_conditions`).
- **글쓰기 선호도**를 함께 물어보세요: 선호 문체(`preferred_tone`, 예: "담백하고 구체적")와 강조 포인트(`emphasis_points`). 이 두 값은 이후 자기소개서 품질에 직접 영향을 줍니다.
- `save_profile`로 저장합니다. 전달한 필드만 갱신되고 나머지는 유지됩니다(부분 저장 안전). 한두 개만 바꿀 때도 그대로 `save_profile`을 다시 호출하면 됩니다.
- 파일에서 읽은 정보는 `source`를 `upload`, 사용자가 말로 준 정보는 `manual`로 표시합니다.

### 3. 이력서 등록 — `add_resume`

- **사용자가 이력서를 주는 방법은 앱마다 다릅니다.** 상황에 맞게 안내하세요:
  - 가장 쉬운 공통 방법은 **내용을 대화창에 그대로 붙여넣기**(파일 위치 무관).
  - Claude 채팅 앱(.mcpb)이면 **파일 직접 첨부**, 폴더 기반(Claude Code 탭/Codex/Antigravity)이면 작업 폴더에 두고 **파일명·경로로 지시**.
  - 스캔본(이미지) PDF·보안 걸린 파일은 못 읽을 수 있으니, 그때는 **텍스트로 붙여넣어** 달라고 요청합니다.
- 업로드한 이력서/경력기술서/포트폴리오 본문을 `add_resume`로 저장합니다.
- `kind`(resume / career_description / portfolio / other)와 `title`을 적절히 지정하고, 대표 문서는 `is_primary=true`로 설정합니다. 대표 문서는 이후 `get_application_context`의 `primary_resume`로 노출됩니다.
- `source`는 `upload`를 사용합니다.

### 3-1. 경력·프로젝트·스킬 등록 (있는 경우) — `add_experience` · `add_project` · `add_skill`

- 이력서에서 파악되는 경력·프로젝트·보유 기술은 본문 저장과 별개로 `add_experience` / `add_project` / `add_skill`로 항목 단위 저장하면 적합도 분석·자소서·면접 준비에서 정밀하게 활용됩니다.
- 경력 `achievements`에는 가능하면 정량 지표를 넣고, 기술은 항목당 1건이라 여러 개면 `add_skill`을 반복 호출합니다.
- 이 항목들은 `get_onboarding_status`의 `has_experience` / `has_skills`와 프로필 완성도(0~100)에 반영됩니다.

### 4. 자기소개서 등록 (있는 경우) — `save_cover_letter_version`

- 기존 자기소개서가 있으면 `save_cover_letter_version`으로 저장합니다(`title` + `content`). 특정 공고용이면 `job_id`를 연결합니다.
- `cover_letter_id` 없이 `title`+`content`만 주면 새 자소서의 첫 버전(v1)으로 저장됩니다. 학습/참고용 보관에 적합합니다.
- 없으면 "나중에 공고를 분석한 뒤 맞춤 자기소개서를 써드릴 수 있어요"라고 안내만 합니다.

### 5. 대시보드 열기 & 다음 단계 — `open_dashboard`

- `open_dashboard`를 호출해 사용자가 자기 데이터를 눈으로 확인하게 합니다. (서버가 꺼져 있으면 `npm start` 안내를 돌려줍니다.)
- 다시 `get_onboarding_status`로 완성도를 확인하고, 비어 있는 부분이 있으면 채우자고 제안합니다.
- 마무리 제안: "지원하고 싶은 공고가 있으면 링크나 내용을 붙여주세요. 적합도를 분석해드릴게요."

---

## B. 공고 분석하기 (핵심 흐름)

사용자가 공고 링크나 내용을 주면 아래 순서로 진행합니다.

### 1. 공고 저장 — `save_job_posting`

- `company`, `position`은 필수입니다. 공고 원문은 `description`에, 핵심 자격/우대는 `requirements` 배열에, 키워드는 `keywords`에 정리해 넣습니다.
- 붙여넣은 원문의 회사명/직무/마감일/기술 키워드 구조화는 AI가 직접 수행한 뒤 위 필드에 채워 저장하세요.
- 저장하면 지원(application) 항목이 자동 생성되고 `job_id`가 반환됩니다. 같은 `url`이면 중복 없이 갱신됩니다.

### 2. 지원 맥락 가져오기 — `get_application_context` ⭐ (반드시 먼저)

- **공고 분석/자소서 작성 전에 반드시 호출합니다.** `job_id`를 넘기면 한 번의 호출로 다음을 모두 돌려줍니다:
  프로필, 대표 이력서, 전체 경력·프로젝트·스킬, 기존 자기소개서, 최근 지원 이력, 대상 공고와 이전 적합도 분석, 같은 회사/직무 관련 기록, 사용자의 선호 문체·강조 포인트.
- 이 데이터를 **근거로** 분석/작성하고, 결과는 아래 저장 도구로 다시 저장합니다.

### 3. 적합도 분석 결과 저장 — `save_fit_analysis`

- AI가 공고와 사용자 정보를 비교해 도출한 분석을 저장합니다. `job_id` 필수(2단계의 공고가 먼저 저장돼 있어야 함).
- 채울 필드: `score`(0~100), `summary`, `strengths`(강점), `gaps`(보완 필요), `matched_keywords` / `missing_keywords`, `recommendations`(자소서·지원 전략 제안).
- 같은 공고에 다시 저장하면 갱신됩니다.

---

## C. 맞춤 자기소개서 쓰기

### 1. (아직 안 했다면) `get_application_context`로 근거 확보

- 선호 문체·강조 포인트·경력·대상 공고를 가져와 작성의 근거로 삼습니다.

### 2. 새 버전 저장 — `save_cover_letter_version`

- AI가 작성한 자기소개서를 새 버전으로 저장합니다(자소서 작성 워크플로우의 핵심 저장 단계).
- `cover_letter_id`를 주면 기존 자소서에 새 버전을 추가하고, 없으면 새 자소서를 만들어 v1로 저장합니다(이때 `title` 권장).
- `note`에 이 버전의 변경 요약(예: "지원동기 보강")을 남기면 사용자가 대시보드 버전 히스토리를 이해하기 쉽습니다.
- `job_id`로 공고에 연결하면 지원 항목과 자동 연결됩니다.

### 3. (요청 시) 파일로 내보내기 — `export_cover_letter`

- 사용자가 "파일로 받고 싶어"라고 하면 `cover_letter_id`와 `format`(`md` 기본 / 인쇄용 `html`)으로 내보냅니다. 파일은 `~/.careermate/exports`에 저장되고 경로를 알려줍니다.

---

## D. 지원 상태 관리

### `update_application_status`

- 지원 상태를 변경합니다. 가능한 상태는 8단계뿐입니다(AGENTS.md 기준): draft(작성 중), planned(지원 예정), applied(지원 완료), document_passed(서류 합격), interview(면접 진행), final_passed(최종 합격), rejected(불합격), on_hold(보류). 이 외의 값(saved·offer·closed 등)은 대시보드가 모르므로 쓰지 마세요.
- `note`에 변경 사유를 남길 수 있습니다.
- 상태가 **서류 합격(document_passed) 이상**으로 바뀌면 면접 준비를 제안하는 힌트를 함께 돌려줍니다 → 다음 단계(E)로 이어집니다.

---

## E. 면접 준비

### `save_interview_prep`

- 보통 상태가 서류 합격으로 바뀐 뒤 진행합니다. 먼저 `get_application_context`(또는 `get_job_posting`)로 공고·직무·자소서를 가져와 근거로 삼으세요.
- AI가 생성한 자료를 저장합니다: 예상 면접 질문, 꼬리 질문, STAR 답변 가이드, 1분 자기소개 초안 등. `job_id` 필수. 같은 공고에 다시 저장하면 갱신됩니다.
- 저장 후 `open_application`(또는 `open_dashboard`)으로 사용자가 면접 페이지에서 바로 확인하게 안내합니다.

---

## 보조 도구

- `get_workflow_guide` — 표준 워크플로우(온보딩, 공고 분석, 자소서 작성, 상태 관리, 면접 준비)의 단계별 안내. 어떤 순서로 어떤 도구를 호출할지 확인할 때 사용. `workflow_id` 생략 시 전체 목록.
- `list_recent_activity` — 최근 활동(공고 저장, 적합도 분석, 자소서 버전, 상태 변경, 면접 준비 등). "최근에 뭐 했지?" 또는 작업을 이어갈 맥락이 필요할 때.
- `list_jobs` / `get_job_posting` — 저장된 공고 목록 / 단건 상세(적합도·상태·연결 자소서·면접 준비 포함).
- `get_profile` / `get_resumes` / `get_cover_letters` — 저장된 데이터 조회.
- `open_dashboard` / `open_application` — 사용자가 결과를 눈으로 확인하도록 브라우저에서 페이지 열기.

## 빠른 요약 — 공고 1건을 끝까지 처리하는 표준 경로

1. `save_job_posting` — 공고 저장 (`job_id` 획득)
2. `get_application_context` (`job_id`) — 근거 데이터 확보 ⭐
3. `save_fit_analysis` — 적합도 분석 저장
4. `save_cover_letter_version` — 맞춤 자소서 버전 저장
5. `update_application_status` — 지원 상태 갱신
6. `save_interview_prep` — (서류 합격 후) 면접 준비 저장
7. `open_application` / `open_dashboard` — 사용자에게 결과 보여주기
