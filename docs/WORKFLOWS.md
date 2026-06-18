# 워크플로우 (Workflows)

CareerMate는 내부에 LLM을 두지 않는다. 분석과 작성은 사용자의 AI(ChatGPT/Claude/Gemini)가 수행하고, 그 AI가 CareerMate의 로컬 MCP 도구를 호출해 로컬 커리어 DB를 읽고 쓴다. 이 문서는 **AI가 따라야 하는 표준 작업 절차(워크플로우)** 를 정리한다.

워크플로우 정의는 코드 안에 데이터로 인코딩되어 있으며(`packages/workflows/src/definitions.ts`), 각 단계는 호출할 구체적인 MCP 도구 이름을 직접 참조한다. AI는 `get_workflow_guide` MCP 도구로 이 정의를 그대로 읽어올 수 있다. 본 문서는 그 정의(`WORKFLOWS` 배열)와 일치한다.

관련 문서:

- 연결 직후 AI가 따라가는 시작 런북은 [시작 런북](./START_WORKFLOW.md)을 참고한다.
- 설치·연결 절차는 [설치 런북](../INSTALL.md)(또는 [지원 앱·설치 레퍼런스](./SUPPORTED_AI_APPS.md))을 참고한다.
- MCP 도구 31종의 입출력 명세는 코드(`packages/mcp-tools/src/tools.ts`)에 정의되어 있으며, AI는 각 도구의 `inputSchema`로 직접 확인할 수 있다.

## 워크플로우 5종 개요

| id | 제목 | 핵심 목적 |
| --- | --- | --- |
| `onboarding` | 온보딩 (첫 셋업) | 프로필·이력서·자기소개서를 등록하고 대시보드를 연다. |
| `analyze_job` | 공고 분석 (적합도 분석) | 공고를 읽어 프로필과 비교하고, 공고·적합도 분석을 저장한 뒤 자기소개서 작성을 제안한다. |
| `write_cover_letter` | 자기소개서 작성 | 특정 공고에 맞춘 자기소개서를 사용자 확인을 거쳐 작성·버전 저장한다. |
| `manage_application_status` | 지원 상태 관리 | 지원 진행 상황(8단계)을 업데이트하고 다음 행동을 제안한다. |
| `prepare_interview` | 면접 준비 | 서류 합격 이후 예상 질문·STAR 답변·1분 자기소개를 준비·저장한다. |

## 공통 원칙

- **추측 금지**: 저장된 실제 경험·성과만 사용한다. 없는 경험을 지어내지 않으며, 빈칸이나 확인이 필요한 부분은 표시해 사용자에게 묻는다.
- **사용자 확인 우선**: 큰 작업(자기소개서 작성 등)을 진행하기 전에 대상·강조점·톤·분량을 확인한다.
- **쉬운 한국어 전달**: 분석·결과를 사용자에게 설명할 때는 기술 용어를 빼고 쉬운 한국어로 전달한다.
- **로컬 전용**: 모든 데이터는 로컬에만 저장된다.

---

## 1. onboarding — 온보딩 (첫 셋업)

사용자가 처음 연결했을 때 프로필·이력서·자기소개서를 등록하고 대시보드를 여는 흐름.

**트리거:** 사용자가 처음 CareerMate에 연결했거나, "시작하자 / 셋업해줘 / 프로필 등록"이라고 요청할 때.

**단계:**

1. `get_onboarding_status`를 호출해 현재 등록 상태(`has_profile`, `has_resume`, `has_cover_letter`, `has_experience`, `has_skills`, `profile_completeness`, `next_steps`)를 확인한다.
2. 비어 있는 항목을 사용자에게 쉬운 한국어로 안내하고, 이력서/자기소개서 파일 업로드 또는 정보 입력을 요청한다.
3. 수집한 정보를 구조화해 `save_profile`로 저장한다(이름·연락처·`headline`·`summary`·`desired_roles`·`desired_conditions`, 그리고 글쓰기 선호인 `preferred_tone`과 `emphasis_points` 포함). 파일 출처는 `source=upload`, 직접 입력은 `manual`.
4. 업로드한 이력서/경력기술서/포트폴리오 본문을 `add_resume`로 저장한다(`kind`·`title` 지정, 대표 문서는 `is_primary=true`).
5. 경력·프로젝트·스킬이 파악되면 `add_experience`·`add_project`·`add_skill`로 저장한다 — 각 도구는 배열을 받으므로 파악한 항목을 한 번에 모아 넘긴다(항목마다 반복 호출하지 않는다). 같은 항목을 다시 넣어도 중복 없이 갱신된다(완성도의 `has_experience`/`has_skills`에 반영).
6. 기존 자기소개서가 있으면 `save_cover_letter_version`으로 저장한다(`title`+`content`면 v1로 저장, 없으면 나중에 작성 가능함을 안내).
7. `open_dashboard`를 호출해 사용자가 자기 데이터를 확인하게 한다.
8. 다시 `get_onboarding_status`로 완성도를 확인하고, 다음 단계(공고 분석 등)를 제안한다.

**도구 호출 순서 요약:**

```
get_onboarding_status
  → save_profile
  → add_resume
  → add_experience / add_project / add_skill (있으면)
  → save_cover_letter_version (기존 자소서가 있으면)
  → open_dashboard
  → get_onboarding_status (재확인)
```

---

## 2. analyze_job — 공고 분석 (적합도 분석)

채용 공고를 읽어 사용자 프로필과 비교하고, 공고와 적합도 분석을 저장한 뒤 자기소개서 작성을 제안하는 **핵심 흐름**이다.

**트리거:** 사용자가 채용 공고 링크나 본문을 붙여넣거나 "이 공고 분석해줘 / 나랑 잘 맞아?"라고 물을 때.

**단계:**

1. **공고 읽기** — 공고 원문(붙여넣은 텍스트 또는 링크 내용)을 읽고 `company`, `position`, `requirements`, `keywords`, `deadline` 등 핵심 정보를 정리한다.
2. **컨텍스트 수집** — `get_application_context`를 호출해 한 번에 프로필·대표 이력서·경력·프로젝트·스킬·기존 자기소개서·최근 지원 현황·이전 적합도 분석·같은 회사/직무 관련 기록·글쓰기 선호(`preferred_tone`, `emphasis_points`)를 가져온다. (분석 대상 공고가 이미 저장돼 있으면 `job_id`도 함께 전달한다.)
3. **비교/분석** — 공고 요구사항과 사용자 경력/스킬/프로젝트를 비교한다. 일치하는 강점(`strengths`)과 부족한 부분(`gaps`), 매칭 키워드(`matched_keywords`)와 누락 키워드(`missing_keywords`)를 도출하고, 종합 적합도 점수(`score` 0~100)와 요약(`summary`), 지원 전략 제안(`recommendations`)을 정리한다. **없는 경험을 지어내지 않는다.**
4. **공고 저장** — 아직 저장되지 않은 공고라면 `save_job_posting`으로 공고를 저장하고 `job_id`를 확보한다.
5. **분석 저장** — 도출한 분석 결과를 `save_fit_analysis`로 저장한다(`job_id`, `score`, `summary`, `strengths`, `gaps`, `matched_keywords`, `missing_keywords`, `recommendations`).
6. **사용자 설명** — 분석 결과를 사용자에게 쉬운 한국어로 설명한다(잘 맞는 점, 보완할 점, 추천 전략). 기술 용어는 빼고 전달한다.
7. **자소서 제안** — "이 공고에 맞춘 자기소개서를 써드릴까요?"라고 자기소개서 작성을 제안한다.
8. **동의 시 자소서 저장** — 사용자가 동의하면 적합도 분석과 글쓰기 선호를 반영해 자기소개서를 작성하고 `save_cover_letter_version`으로 저장한다(`job_id` 연결, `note`에 작성 의도 요약).
9. **지원 건 열기** — `open_application`으로 해당 지원 건을 열어 사용자가 결과를 확인하게 하고, 지원 상태 변경(예: 지원 예정/지원 완료)을 제안한다.

**도구 호출 순서 요약(정식 흐름):**

```
(공고 원문 읽기)
  → get_application_context           # job_id 있으면 함께 전달
  → (비교/분석: strengths·gaps·키워드·score·summary·recommendations)
  → save_job_posting                  # 미저장 공고일 때만, job_id 확보
  → save_fit_analysis                 # job_id 연결
  → (사용자에게 쉬운 한국어로 설명)
  → (자기소개서 작성 제안)
  → save_cover_letter_version         # 사용자 동의 시에만, job_id·note
  → open_application                  # 결과 확인 + 상태 변경 제안
```

> 핵심 도구는 `get_application_context`이다. 프로필·이력서·경력·프로젝트·스킬·기존 자소서·지원 현황·이전 분석·관련 기록·글쓰기 선호를 한 번에 가져오므로, 분석/작성에 필요한 데이터를 여러 번 나눠 조회할 필요가 없다.

---

## 3. write_cover_letter — 자기소개서 작성

특정 공고에 맞춘 자기소개서를 사용자 확인을 거쳐 작성하고 버전으로 저장하는 흐름.

**트리거:** 사용자가 "자기소개서 써줘 / 이 공고용 자소서 만들어줘"라고 요청하거나, 공고 분석 후 작성 제안에 동의했을 때.

**단계:**

1. `get_application_context`(가능하면 `job_id` 포함)를 호출해 프로필·경력·프로젝트·스킬·기존 자기소개서·이전 적합도 분석·글쓰기 선호(`preferred_tone`, `emphasis_points`)를 가져온다.
2. 작성 전에 대상 공고, 강조할 포인트, 톤, 분량을 사용자에게 확인한다(확인 없이 큰 작업을 진행하지 않는다).
3. 저장된 실제 경험·성과만으로 자기소개서를 작성한다. 빈칸이나 확인이 필요한 부분은 추측하지 말고 표시해 사용자에게 묻는다.
4. 완성본을 `save_cover_letter_version`으로 저장한다(기존 자기소개서면 `cover_letter_id`, 새로 만들면 `title`, 공고용이면 `job_id`, 변경 요약은 `note`, `source=ai`).
5. 사용자가 원하면 `export_cover_letter`로 파일로 내보내고, 추가 수정 요청이 있으면 새 버전으로 다시 저장한다.
6. 저장 결과를 쉬운 한국어로 알리고, 지원 상태 업데이트(`update_application_status`)나 면접 준비 등 다음 단계를 제안한다.

**도구 호출 순서 요약:**

```
get_application_context               # job_id 있으면 함께 전달
  → (대상·강조점·톤·분량 확인)
  → save_cover_letter_version         # cover_letter_id 또는 title, job_id, note, source=ai
  → export_cover_letter (선택)
  → (다음 단계 제안: update_application_status 등)
```

---

## 4. manage_application_status — 지원 상태 관리

지원 진행 상황(8단계)을 업데이트하고 상태에 맞는 다음 행동을 제안하는 흐름.

**트리거:** 사용자가 "지원했어 / 서류 합격했어 / 면접 잡혔어 / 떨어졌어"처럼 진행 상황을 알리거나 상태 변경을 요청할 때.

**단계:**

1. 필요하면 `get_application_context` 또는 `get_job_posting`으로 대상 지원 건과 공고를 확인한다.
2. 적절한 상태로 `update_application_status`를 호출한다. 8단계: `draft`(작성 중), `planned`(지원 예정), `applied`(지원 완료), `document_passed`(서류 합격), `interview`(면접 진행), `final_passed`(최종 합격), `rejected`(불합격), `on_hold`(보류). 변경 사유는 `note`에 남긴다.
3. 변경 결과를 사용자에게 쉬운 한국어로 알린다.
4. 상태에 맞는 다음 단계를 제안한다:
   - `applied` → 결과 기다리기 안내
   - `document_passed` / `interview` → 면접 준비(`prepare_interview`) 제안
   - `final_passed` → 축하 및 마무리
   - `rejected` / `on_hold` → 회고 또는 다른 공고 탐색 제안
5. 필요하면 `open_application`으로 해당 지원 건을 열어 보여준다.

**상태 전이 참고:** `document_passed` 이상에서 면접 준비가 해금된다. 8단계 상태값은 코드(`update_application_status`의 `inputSchema`)에 정의되어 있다.

**도구 호출 순서 요약:**

```
get_application_context | get_job_posting (필요 시)
  → update_application_status         # 8단계 중 하나, note에 사유
  → (상태별 다음 단계 제안)
  → open_application (선택)
```

---

## 5. prepare_interview — 면접 준비

서류 합격 이후 예상 질문·STAR 답변·1분 자기소개를 준비해 저장하는 흐름.

**트리거:** 지원 상태가 서류 합격(`document_passed`) 또는 면접 진행(`interview`)으로 바뀌었을 때, 또는 사용자가 "면접 준비 도와줘"라고 요청할 때.

**단계:**

1. `get_application_context`(`job_id` 포함)를 호출해 공고, 프로필, 경력/프로젝트, 적합도 분석(강점·갭), 자기소개서를 가져온다.
2. 공고와 사용자 경험을 바탕으로 예상 면접 질문(`question`, `intent`, `followups`, `answer_outline`)을 도출한다.
3. 핵심 경험에 대한 STAR 가이드(`question`, `situation`, `task`, `action`, `result`)와 1분 자기소개(`self_introduction`) 초안을 작성한다. **실제 경험만 사용한다.**
4. 준비 내용을 `save_interview_prep`로 저장한다(`job_id`, `questions`, `star_guides`, `self_introduction`, `notes`).
5. 준비 내용을 사용자에게 쉬운 한국어로 요약해 전달하고, 모의 면접/추가 질문 연습이나 상태 업데이트(`update_application_status`로 `interview`/`final_passed`)를 제안한다.

**도구 호출 순서 요약:**

```
get_application_context               # job_id 포함
  → (예상 질문 도출: question·intent·followups·answer_outline)
  → (STAR 가이드 + 1분 자기소개 초안)
  → save_interview_prep               # job_id, questions, star_guides, self_introduction, notes
  → (요약 전달 + 모의 면접/상태 업데이트 제안)
```

---

## 워크플로우 간 연결

워크플로우는 독립적이지 않고 자연스럽게 이어진다.

```
onboarding
  → analyze_job ──(자소서 제안 동의)──→ write_cover_letter
       │
       └─→ manage_application_status ──(document_passed 이상)──→ prepare_interview
```

- `analyze_job`의 마지막 단계는 자기소개서 작성 제안으로 이어지며, 동의 시 `write_cover_letter`의 작업(=`save_cover_letter_version`)을 수행한다.
- `manage_application_status`에서 상태가 `document_passed`/`interview`가 되면 `prepare_interview`를 제안한다.
- 모든 흐름에서 데이터 조회의 중심은 `get_application_context`이며, 작성/분석에 필요한 컨텍스트를 한 번에 제공한다.

## 코드와의 대응

- 워크플로우 정의: `packages/workflows/src/definitions.ts` (`WORKFLOWS: WorkflowDefinition[]`)
- 조회/렌더 헬퍼: `packages/workflows/src/index.ts` (`getWorkflow(id)`, `renderWorkflowMarkdown(id)`)
- AI는 `get_workflow_guide` MCP 도구로 위 정의를 마크다운으로 렌더링해 인라인으로 읽을 수 있다.
