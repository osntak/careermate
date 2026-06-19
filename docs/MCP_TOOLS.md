# MCP 도구 레퍼런스

CareerMate는 **MCP-우선** 로컬 커리어 관리 도구입니다. 사용자는 자신의 ChatGPT/Claude/Gemini와 대화하고, 그 AI가 여기 정의된 MCP 도구를 호출해 로컬 커리어 DB(`~/.careermate/careermate.sqlite`)를 읽고 씁니다. **CareerMate 내부에는 LLM이 없습니다.** 적합도 분석·자기소개서 작성 같은 추론은 모두 사용자의 AI가 수행하고, CareerMate는 데이터를 저장하고 다시 돌려주는 역할만 합니다.

이 문서는 `packages/mcp-tools/src/tools.ts`에 정의된 커리어 워크플로 **37개 도구**의 레퍼런스입니다. 도구의 입력 파라미터는 `packages/shared/src/schemas.ts`의 zod 스키마와 일치합니다.

> 설계 원칙: 이 도구들은 단순 CRUD 래퍼가 아닙니다. 각 도구는 AI가 사용자를 대신해 수행하는 실제 작업에 대응하며, 설명에 *언제* 그리고 *어떻게* 호출해야 하는지가 담겨 있습니다. 가장 중요한 도구는 [`get_application_context`](#get_application_context-) 입니다.

관련 문서: 전체 워크플로우는 `get_workflow_guide` 도구 또는 `packages/workflows`를, 데이터 구조는 `packages/shared/src/schemas.ts`를 참고하세요.

---

## 읽기 전용(read-only) 표기 안내

각 도구 항목의 **읽기전용** 열은 `tools.ts`의 `readOnly: true` 플래그를 그대로 반영합니다. 읽기전용 도구는 DB를 변경하지 않고 조회만 하며, 그 외 도구는 데이터를 생성·갱신하거나(쓰기) 브라우저를 여는 등의 부수효과를 가집니다.

| 읽기전용(✅) 도구 | 쓰기/부수효과(✏️) 도구 |
| --- | --- |
| `read_document`, `read_inbox`, `get_onboarding_status`, `get_profile`, `get_resumes`, `get_experiences`, `get_projects`, `get_skills`, `get_cover_letters`, `get_job_posting`, `list_jobs`, `get_application_context`, `list_recent_activity`, `get_workflow_guide`, `get_playbook`, `get_verifier`, `validate_cover_letter`, `get_writing_style_guide`, `check_for_update` | `open_inbox`, `save_profile`, `add_resume`, `add_experience`, `add_project`, `add_skill`, `save_cover_letter_version`, `delete_cover_letter`, `set_verify_mode`, `save_job_posting`, `delete_job_posting`, `save_fit_analysis`, `update_application_status`, `save_interview_prep`, `export_cover_letter`, `open_dashboard`, `open_application`, `update_careermate` |

---

## 0. 문서 읽기 (Read Document)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `read_document` | 컴퓨터의 문서 파일에서 본문 텍스트 추출(PDF·Word·한컴·텍스트) | `path`(절대 경로 권장), `max_chars?` | `{ path, format, characters, truncated, warnings[], text }` | 사용자가 파일 경로를 주며 "이 파일 읽어줘/참고해줘"라고 할 때 | ✅ |

- 지원 형식: `.pdf`, `.docx`, `.hwp`(HWP 5.x), `.hwpx`, `.txt`/`.md` 등 텍스트. 전부 **순수 JS로 추출**하며 외부 변환기(poppler 등) 설치가 필요 없습니다.
- 추출한 텍스트는 그대로 새 파일로 다시 쓰지 말고, 분석/작성에 활용한 뒤 결과를 `add_resume`·`save_job_posting`·`save_cover_letter_version` 등으로 CareerMate에 저장하세요.
- **이미지·스캔 PDF**는 텍스트 레이어가 없어 추출되지 않습니다(`unsupported`로 반환되며 `warnings`에 안내). 이때는 이미지를 직접 볼 수 있는 클라이언트(예: Claude)로 읽거나, 사용자에게 내용을 텍스트로 붙여넣어 달라고 안내하세요. 구형 `.doc`/`.ppt`/`.xls`·`.odt`·iWork는 미지원이니 PDF/`.docx`로 다시 저장하도록 안내합니다.
- 파일은 **로컬에서만** 처리되며 외부로 전송되지 않습니다. 25MB를 넘는 파일은 거부합니다.

---

## 0-1. 인입 폴더 (Inbox)

CLI 클라이언트(Claude Code·Codex 등)는 파일 첨부가 안 되므로, 사용자가 기존 이력서·경력기술서·포트폴리오·자기소개서 파일을 끌어다 넣을 수 있는 로컬 인입 폴더(`~/.careermate/inbox`)를 두고 그 안의 파일을 읽습니다. 사용자가 파일 **경로**를 직접 알려주는 경우에는 인입 폴더 대신 `read_document`를 쓰세요.

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `open_inbox` | 인입 폴더(`~/.careermate/inbox`)를 보장하고 파일 탐색기로 열기 + 현재 들어 있는 파일 목록 반환 | 없음 | `{ dir, files[] }` | 온보딩에서 사용자가 "기존에 작성해 둔 문서 파일이 있다"고 답했을 때만(묻지 않고 자동으로 열지 마세요) | ✏️ |
| `read_inbox` | 인입 폴더에 넣어 둔 문서들의 본문을 한 번에 추출해 반환 | `filename?`(대소문자 무시, 생략 시 전체), `max_chars?`(파일별 기본 20000자) | `{ dir, files[] }`(각 `{ filename, path, format, unsupported, truncated, warnings[], text }`) | `open_inbox`로 안내한 뒤 사용자가 "다 넣었어"라고 할 때 | ✅ |

- `open_inbox`는 폴더를 열기만 합니다. 사용자가 파일을 다 넣었다고 하면 `read_inbox`로 본문을 읽으세요.
- `docx`/`hwp`/`hwpx`/텍스트는 텍스트를 추출하고, **`pdf`·이미지는 추출하지 않고 파일 경로만** 돌려주니(`unsupported`) AI 클라이언트의 파일 읽기 기능으로 그 경로를 직접 열어 읽으세요.
- 읽은 내용은 그대로 새 파일로 다시 쓰지 말고, 구조화해 프로필은 `save_profile`, 이력서·경력기술서·포트폴리오는 `add_resume`, 기존 자기소개서는 `save_cover_letter_version`으로 저장하세요.
- 응답 폭발을 막기 위해 파일별 본문은 `max_chars`(기본 20000자)로 잘라서 돌려주며, 잘린 경우 `truncated: true`로 표시합니다.

---

## 1. 온보딩 (Onboarding)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `get_onboarding_status` | CareerMate에 어떤 정보(프로필·이력서·경력·스킬·자소서·공고)가 준비되어 있는지 확인하고 다음 단계를 제시 | 없음 | `completed`, `has_profile`/`has_resume`/`has_cover_letter`/`has_experience`/`has_skills`/`has_job`, `profile_completeness`(0~100), `next_steps[]` | AI 클라이언트 연결 직후 가장 먼저 | ✅ |

AI 클라이언트가 연결되면 이 도구를 가장 먼저 호출해 상태를 파악한 뒤, 단계별 가이드가 필요하면 `get_workflow_guide('onboarding')`로 받으세요. 안내 흐름: 프로필 입력 → 이력서/경력·스킬 추가 → 대시보드 열기.

---

## 2. 프로필 (Profile)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `get_profile` | 기본 프로필 조회(이름, 한 줄 소개, 요약, 희망 직무/조건, 선호 문체, 강조 포인트, 링크) | 없음 | `ProfileRecord` 또는 `null` | 프로필 확인이 필요할 때 | ✅ |
| `save_profile` | 프로필 저장(부분 저장 안전 — 전달한 필드만 갱신, 나머지는 유지) | 아래 프로필 필드 | 저장된 `ProfileRecord` | 이력서 구조화 후 이름/소개/희망 직무/선호 문체/강조 포인트를 채워 저장할 때 | ✏️ |

프로필 입력 필드(`ProfileInputSchema`):

- `name`(이름), `email`, `phone`, `location`
- `headline`(한 줄 소개 / 직무 타이틀), `summary`(자기소개 요약)
- `desired_roles[]`(희망 직무), `desired_conditions`(희망 근무 조건: 연봉·지역·근무형태)
- `preferred_tone`(자기소개서 선호 문체, 예: "담백하고 구체적")
- `emphasis_points[]`(강조하고 싶은 핵심 포인트)
- `links[]`(`{ label, url }` — 포트폴리오/깃허브/링크드인)

> `preferred_tone`과 `emphasis_points`는 이후 자기소개서 작성 품질에 직접 영향을 줍니다.

---

## 3. 이력서 (Resumes / Documents)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `add_resume` | 이력서·경력기술서·포트폴리오 등 문서 저장 | `title`, `content`(필수), `kind?`, `source?`, `is_primary?`, `tags?` | 저장된 `DocumentRecord` | 사용자가 업로드/붙여넣은 텍스트(또는 정리한 Markdown)를 보관할 때 | ✏️ |
| `get_resumes` | 저장된 문서 조회(종류 필터 가능) | `kind?` | `DocumentRecord[]` | 저장된 이력서/문서를 확인할 때 | ✅ |

- `kind` 값: `resume`(이력서, 기본값) / `career_description`(경력기술서) / `portfolio` / `other`
- `is_primary: true`로 대표 문서를 지정하면 `get_application_context`의 `primary_resume`로 노출됩니다.

---

## 3-1. 경력·프로젝트·기술스택 (Experiences / Projects / Skills)

이력서 본문(`add_resume`)과 별개로, **구조화된** 경력·프로젝트·기술을 각각의 테이블에 항목 단위로 저장합니다. `get_application_context`의 `experiences`/`projects`/`skills`로 노출되며, `get_onboarding_status`의 `has_experience`/`has_skills`와 프로필 완성도(0~100) 계산에 직접 반영됩니다. (대시보드의 Profile 페이지에서도 같은 데이터를 편집합니다.)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `add_experience` | 경력(직장 단위) 항목 저장 | `experiences[]` — 각 항목: `company`(필수), `role?`, `employment_type?`, `start_date?`, `end_date?`, `is_current?`, `description?`, `achievements?`, `tech?`, `order_index?` | `ExperienceRecord[]` + 신규/갱신 건수 | 이력서에서 경력을 구조화해 보관할 때(여러 건 한 번에) | ✏️ |
| `get_experiences` | 저장된 경력을 시간 역순으로 조회 | 없음 | `ExperienceRecord[]` | 경력 목록만 빠르게 확인할 때 | ✅ |
| `add_project` | 대표 프로젝트 항목 저장 | `projects[]` — 각 항목: `name`(필수), `role?`, `description?`, `highlights?`, `tech?`, `url?`, `start_date?`, `end_date?`, `order_index?` | `ProjectRecord[]` + 신규/갱신 건수 | 프로젝트 이력을 구조화해 보관할 때(여러 건 한 번에) | ✏️ |
| `get_projects` | 저장된 프로젝트 조회 | 없음 | `ProjectRecord[]` | 프로젝트 목록만 확인할 때 | ✅ |
| `add_skill` | 기술스택 항목 저장 | `skills[]` — 각 항목: `name`(필수), `category?`, `level?`, `years?`, `order_index?` | `SkillRecord[]` + 신규/갱신 건수 | 보유 기술을 정리해 둘 때(여러 개 한 번에) | ✏️ |
| `get_skills` | 저장된 기술스택 조회 | 없음 | `SkillRecord[]` | 기술 목록만 확인할 때 | ✅ |

- 세 도구 모두 **배열을 받아 여러 건을 한 번에 저장**합니다(한 건이어도 배열로). 항목마다 도구를 반복 호출하지 마세요.
- **멱등 저장**: 같은 항목(스킬=`name`, 경력=`company`+`role`+`start_date`, 프로젝트=`name`, 대소문자 무시)을 다시 넣어도 중복 행을 만들지 않고 갱신합니다. 누락한 필드는 기존 값을 보존합니다. 한 번의 호출은 한 트랜잭션으로 원자 처리됩니다.
- `achievements`/`highlights`에는 정량 지표가 담긴 성과를, `tech`에는 사용 기술을 배열로 넣으면 적합도 분석·자소서·면접 준비에서 근거로 활용됩니다.
- 입력 스키마: `ExperienceBatchInputSchema` / `ProjectBatchInputSchema` / `SkillBatchInputSchema`(각각 `experiences`/`projects`/`skills` 배열, 요소는 `ExperienceInputSchema` / `ProjectInputSchema` / `SkillInputSchema`; `packages/shared/src/schemas.ts`).

---

## 4. 자기소개서 (Cover Letters)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `get_cover_letters` | 저장된 자기소개서 조회(공고별 필터 가능). 각 항목은 현재 버전 내용·버전 수 포함 | `job_id?` | `CoverLetterRecord[]` | 자소서 목록/내용을 확인할 때 | ✅ |
| `save_cover_letter_version` | 자기소개서의 새 버전 저장 — 자소서 작성 워크플로우의 핵심 저장 단계 | `content`(필수), `cover_letter_id?`, `title?`, `job_id?`, `note?`, `source?`, `set_current?` | `{ coverLetter, version }` | 새 공고용 자소서를 생성·갱신해 버전으로 남길 때 | ✏️ |
| `delete_cover_letter` | 자기소개서 삭제(모든 버전 포함) | `cover_letter_id`, `confirm:"DELETE"` | 삭제 결과 | 사용자가 목록에서 삭제 대상을 확인한 뒤 | ✏️ |

`save_cover_letter_version` 동작(`CoverLetterVersionInputSchema`):

- `cover_letter_id`를 주면 기존 자소서에 **새 버전을 추가**하고, 없으면 새 자소서를 만들어 **v1**로 저장합니다(이때 `title` 권장).
- `note`에 변경 요약(예: "지원동기 보강")을 남기면 대시보드 버전 히스토리에서 이해하기 쉽습니다.
- `job_id`로 공고에 연결하면 지원(application) 항목과 자동 연결됩니다.
- `set_current`(기본 `true`): 이 버전을 현재 버전으로 지정.

> 기존 자소서를 학습용으로 보관하든 새 공고용 자소서를 새로 쓰든, 저장은 모두 `save_cover_letter_version`으로 합니다. `title`+`content`만 주면 새 자소서의 v1로 저장됩니다.

`delete_cover_letter`는 되돌릴 수 없는 작업이므로, 먼저 `get_cover_letters`로 목록을 확인하고 사용자가 삭제할 항목을 명확히 고른 뒤 호출합니다. 삭제된 자기소개서의 버전은 함께 사라지며, 연결된 지원 기록은 자기소개서 연결만 비워집니다.

---

## 5. 채용공고 (Jobs)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `save_job_posting` | 채용공고 저장(있으면 갱신). 저장 시 지원(application) 항목 자동 생성 | `company`, `position`(필수), `url?`, `location?`, `employment_type?`, `description?`, `requirements?`, `keywords?`, `deadline?`, `source?` | 저장된 `JobRecord`(`job_id` 포함) | 공고를 DB에 등록/갱신할 때 | ✏️ |
| `get_job_posting` | 공고 1건 상세 조회 | `job_id` | `{ job, fit, application, cover_letters, interview }` | 한 공고의 분석·상태·자소서·면접 자료를 한 번에 볼 때 | ✅ |
| `list_jobs` | 저장된 모든 공고를 지원 상태·적합도 점수와 함께 목록화 | 없음 | 공고 메타 포함 배열 | 전체 공고를 훑어볼 때 | ✅ |
| `delete_job_posting` | 채용공고 삭제 | `job_id`, `confirm:"DELETE"` | 삭제 결과 | 사용자가 목록에서 삭제 대상을 확인한 뒤 | ✏️ |

- `url`이 같으면 중복 생성 없이 갱신됩니다.
- `requirements`에는 자격요건/우대사항 핵심, `keywords`에는 핵심 키워드를 정리해 넣으면 이후 적합도 분석·자소서 작성에 활용됩니다.
- 붙여넣은 공고 원문의 구조화(회사명/직무/마감일/키워드 추출)는 AI가 직접 수행한 뒤 `save_job_posting`으로 저장합니다.
- `delete_job_posting`은 연결된 지원 상태·적합도 분석·면접 준비를 함께 삭제합니다. 연결된 자기소개서는 삭제하지 않고 공고 연결만 해제합니다.

---

## 6. 적합도 (Fit Analysis)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `save_fit_analysis` | AI가 도출한 적합도 분석 결과 저장(같은 공고에 다시 저장하면 갱신) | `job_id`(필수), `score?`(0~100), `summary?`, `strengths?`, `gaps?`, `matched_keywords?`, `missing_keywords?`, `recommendations?` | 저장된 `FitAnalysisRecord` + `suggested_next_action` | 공고와 사용자 정보를 비교 분석한 결과를 저장할 때 | ✏️ |

- `job_id`는 필수이며, 먼저 `save_job_posting`으로 공고가 저장되어 있어야 합니다.
- 분석 자체는 AI가 수행하고, 이 도구는 결과만 저장합니다. 분석 전에는 반드시 [`get_application_context`](#get_application_context-)로 맥락을 가져오세요.
- 저장 후 응답에는 "이 공고에 맞춘 자기소개서를 써드릴까요?" 선택지가 함께 제공됩니다. AI는 곧장 작성하지 말고 사용자가 "네"를 고른 경우에만 자기소개서 작성 흐름으로 이어갑니다.

---

## 7. 지원 상태 (Application Status)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `update_application_status` | 지원 상태 변경. `document_passed` 이상이면 면접 준비를 제안하는 힌트 동봉 | `job_id`, `status`, `note?` | 변경 결과(`hint` 포함 가능) | 지원 진행 단계가 바뀔 때 | ✏️ |

지원 상태 8단계(`APPLICATION_STATUSES`):

| 상태 | 라벨 |
| --- | --- |
| `draft` | 작성 중 |
| `planned` | 지원 예정 |
| `applied` | 지원 완료 |
| `document_passed` | 서류 합격 |
| `interview` | 면접 진행 |
| `final_passed` | 최종 합격 |
| `rejected` | 불합격 |
| `on_hold` | 보류 |

> `document_passed`(서류 합격) 이상에서는 상태 변경 응답에 면접 준비 제안 힌트가 함께 돌아옵니다. 사용자가 요청하면 그 전에도 공고 기준 면접 준비 자료를 저장할 수 있습니다.

---

## 8. 면접 준비 (Interview Prep)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `save_interview_prep` | 예상 질문·꼬리 질문·STAR 답변 가이드·1분 자기소개 초안 등 면접 준비 자료 저장(같은 공고면 갱신) | `job_id`(필수), `questions?`, `star_guides?`, `self_introduction?`, `notes?` | 저장된 `InterviewPrepRecord`(질문 수 포함) | 사용자가 공고 기준 면접 준비를 요청했을 때 | ✏️ |

입력 구조(`InterviewPrepInputSchema`):

- `questions[]`: `{ question, intent?(질문 의도), followups?(예상 꼬리 질문), answer_outline?(답변 가이드/핵심 포인트) }`
- `star_guides[]`: `{ question, situation?, task?, action?, result? }`
- `self_introduction`: 1분 자기소개 초안
- `notes`: 면접 후기/메모

---

## 9. 내보내기 (Exports)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `export_cover_letter` | 자기소개서를 Markdown 또는 인쇄용 HTML 파일로 데이터 폴더 `exports/`에 저장 | `cover_letter_id`, `format?`(`md`(기본)/`html`) | `{ path, filename, content }` | 사용자가 "자소서 파일로 받고 싶어"라고 할 때 | ✏️ |

- HTML은 인쇄용으로, 브라우저에서 PDF로 저장할 수 있습니다.
- 대시보드의 Documents 페이지에서 직접 다운로드할 수도 있습니다.

---

## 10. 대시보드 (Dashboard UI)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `open_dashboard` | 로컬 대시보드를 사용자 브라우저에서 열기(서버 미실행 시 자동 시작) | 없음 | `{ url, running }` | 저장 결과를 사용자가 눈으로 확인하게 할 때(예: 분석/자소서 저장 후) | ✏️ |
| `open_application` | 특정 공고의 지원 상세 페이지(`/#/jobs/{job_id}`)를 브라우저에서 열기 | `job_id` | `{ url, running }` | 적합도·자소서·면접 준비를 바로 확인하도록 안내할 때 | ✏️ |

- 대시보드 기본 주소: `http://127.0.0.1:4319` (포트 사용 중이면 다음 포트로 폴백).
- 서버가 실행 중이 아니면 안내 메시지에 `npm start` 실행을 권고합니다.

---

## 11. 활동 (Activity)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `list_recent_activity` | 최근 활동 내역(공고 저장, 적합도 분석, 자소서 버전, 상태 변경, 면접 준비 등) 조회 | `limit?`(기본 20) | `ActivityRecord[]` | "최근에 뭐 했지?" 또는 이어서 작업할 맥락이 필요할 때 | ✅ |

---

## 12. 워크플로우 가이드 (Workflow Guide)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `get_workflow_guide` | 표준 워크플로우의 단계별 안내 + 그 작업의 **전문가 실행 절차(EOP)**·적용할 플레이북·저장 전 검증기 순서 반환 | `workflow_id?` | 단일 워크플로우 Markdown(EOP·플레이북/검증기 순서 포함) 또는 전체 목록(`{ id, title, trigger }[]`) | 커리어 작업을 시작하기 직전 | ✅ |

`workflow_id` 값: `onboarding`, `analyze_job`, `write_cover_letter`, `write_career_description`, `manage_application_status`, `prepare_interview`. 생략하면 전체 목록을 돌려줍니다. `analyze_job`/`write_cover_letter`/`write_career_description`/`prepare_interview`/`onboarding`은 해당 작업의 EOP 본문과 `get_playbook`·`get_verifier` 호출 순서(`career_route`)를 함께 돌려줍니다.

---

## 12-1. 전문가 플레이북·검증 루브릭 (Career-OS)

`get_workflow_guide`가 안내한 "전문가 실행 절차(EOP)"를 실제로 받아 적용하는 serve 도구입니다. CareerMate는 `docs/career-os/{eop,knowledge}`의 전문가 지식(16개 도메인 플레이북 + 6개 검증 루브릭)을 그대로 돌려주고, 작성·점검·판단은 연결된 AI가 합니다(내부 LLM 없음). 지침 원문은 사용자에게 노출하지 말고 결과물에만 반영하세요.

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `get_playbook` | 도메인별 작성·판단 원칙·Do/Don't·Before→After·자가검증 포인트(시니어 전문가 기준) | `domain`(16개 enum) | `{ domain, content }` | 산출물을 손보기 직전, `get_workflow_guide`가 안내한 도메인을 받아 적용할 때 | ✅ |
| `get_verifier` | 검증기 루브릭(점검 항목·합격 기준·세는 방법). 실제 점검·판정은 AI가 직접 수행 | `id`(6개 enum) | `{ id, content }` | 산출물을 `save_*`로 저장하기 직전 자가검증할 때 | ✅ |

- `get_playbook` 도메인(16): `resume`, `ats`, `cover-letter`, `fit-matching`, `human-writing`, `company-research`, `recruiter-screen`, `interview-behavioral`, `interview-technical`, `salary-negotiation`, `offer-evaluation-decision`, `rejection-triage-iteration`, `linkedin-profile`, `portfolio`, `networking-referrals`, `onboarding-first-90-days`.
- `get_verifier` id(6): `truthfulness`, `consistency`, `recency-staleness`, `responsiveness-on-target`, `ats-compat`, `human-voice`.
- 권장 흐름: `get_application_context`(맥락 + 추천 경로) → `get_workflow_guide(workflow_id)`(EOP + 적용할 플레이북/검증기 순서) → `get_playbook(domain)`(작성) → `get_verifier(id)`(저장 전 자가검증) → `save_*`(저장).
- 지식 정본은 `docs/career-os/`이며, 이 지식층의 설계·아직 구현하지 않은 범위(B-2: det 게이트·점수 계산)는 [`docs/career-os/implementation/README.md`](career-os/implementation/README.md)를 참고하세요.

---

## 12-2. 자동 점검 / 점검 모드 (Deterministic Lint)

자기소개서를 저장하기 직전, CareerMate가 **LLM 없이 결정론으로** 셀 수 있는 항목만 점검합니다(정량 수치의 근거 유무, 공고 수치 차용, 번역투·클리셰 같은 문체 신호). 사실성·동문서답 같은 의미 판단은 연결된 AI가 직접 합니다.

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `validate_cover_letter` | 저장하지 않고 미리 점검만 — 저장 시 차단될 항목·문체 신호를 보여줌 | `text`(필수), `job_id?`, `strict?` | 점검 리포트(`blocking[]`·신호·수치 출처 분석) | `save_cover_letter_version`으로 저장하기 직전 미리 확인할 때 | ✅ |
| `set_verify_mode` | 저장 전 자동 점검의 엄격도 변경(기본/엄격). 엄격 모드는 이력서 본문에 근거 없는 수치까지 차단 | `strict`(true=엄격, false=끄기) | `{ strict }` | 사용자가 "엄격하게 봐줘"에 동의해 모드를 바꿀 때(이번 한 건만이면 모드 대신 `strict:true`를 인자로) | ✏️ |

- `validate_cover_letter`의 `blocking`이 비어 있지 않으면, 같은 본문을 `save_cover_letter_version`으로 저장할 때도 막힙니다(의도한 값이면 `force:true`로 저장).
- `set_verify_mode`로 끄기(`strict:false`)는 안전장치를 약화하므로 사용자가 명확히 끄겠다고 할 때만 호출하세요.

---

## 13. 글쓰기 스타일 가이드 (Writing Style Guide)

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `get_writing_style_guide` | "AI 티 안 나는" 한국어 글쓰기 규칙 반환 | 없음 | `{ guide }` (작성 규칙 + 저장 전 자가 점검) | 자기소개서·자기 PR·지원 메일 등 사람이 쓴 듯한 글을 작성하기 직전 | ✅ |

번역투·클리셰·기계적 병렬·상투적 연결어·균일한 문장 리듬 같은 AI-tell을 제거하면서, 사실·수치·고유명사는 그대로 보존하도록 안내합니다. `write_cover_letter` / `analyze_job` 워크플로우의 작성 단계에서 함께 적용합니다. (규칙 출처: `epoko77-ai/im-not-ai`, MIT.)

---

## 14. 업데이트 (Update)

CareerMate를 최신 버전으로 유지하기 위한 유지보수 도구입니다. 확인은 `check_for_update`로, 실제 적용은 `update_careermate`로 합니다.

| 도구 | 목적 | 주요 입력 | 반환 | 언제 호출 | 읽기전용 |
| --- | --- | --- | --- | --- | --- |
| `check_for_update` | npm 레지스트리에서 새 버전이 있는지 지금 확인(공개 버전 정보만 GET, 사용자 데이터 미전송) | 없음 | `{ current, latest, update_available }` | 사용자가 "최신이야?/업데이트 있어?"라고 묻거나 `get_onboarding_status`가 새 버전을 알릴 때 | ✅ |
| `update_careermate` | 설치 폴더에 `careermate@latest`를 npm으로 설치해 최신 버전으로 업데이트 | 없음 | 업데이트 결과(`{ ok, message, manual? }`) | 사용자가 명시적으로 "업데이트해줘"라고 할 때만 | ✏️ |

- `check_for_update`는 확인만 하며 데이터를 변경하지 않습니다. 새 버전이 있으면 `update_careermate`로 적용하세요.
- 사용자가 "업데이트해줘", "CareerMate 업데이트해줘", "최신으로 올려줘"처럼 적용을 명시하면 `update_careermate`를 바로 호출합니다. 이 도구가 최신 버전 확인도 함께 하므로 별도 확인 질문은 필요 없습니다.
- `update_careermate` 성공 후에는 적용을 위해 AI 앱(또는 MCP 연결) **재시작**이 필요합니다. 재시작 시 데이터베이스는 자동 마이그레이션되어 기존 데이터가 보존됩니다.
- 자동 설치가 막히면(개발 모드·비표준 설치) 직접 칠 명령(`manual`)을 안내합니다.

---

## ⭐ get_application_context — 분석/작성 전 필수 호출

> `get_application_context`는 **가장 중요한 도구**입니다. 공고를 분석하거나 자기소개서를 작성하기 **전에 반드시 먼저** 호출하세요. 한 번의 호출로 사용자에 대한 모든 맥락을 돌려줍니다. 읽기전용(✅)입니다.

**입력**

- `job_id?`(선택) — 특정 공고 기준으로 맥락을 모을 때.

**한 번에 반환하는 데이터 전체**(`ApplicationContextSchema`):

| 필드 | 내용 |
| --- | --- |
| `profile` | 사용자 프로필(`ProfileRecord` 또는 `null`) |
| `primary_resume` | 대표 이력서(`is_primary` 문서, 없으면 `null`) |
| `resumes` | 전체 이력서/문서 배열 |
| `experiences` | 전체 경력 배열 |
| `projects` | 프로젝트 배열 |
| `skills` | 기술스택 배열 |
| `cover_letters` | 기존 자기소개서 배열(버전 정보 포함) |
| `recent_applications` | 최근 지원 이력 배열 |
| `job` | (`job_id` 제공 시) 대상 공고(`JobRecord` 또는 `null`) |
| `fit_analysis` | (`job_id` 제공 시) 대상 공고의 이전 적합도 분석(`FitAnalysisRecord` 또는 `null`) |
| `related_history` | 같은 회사/직무 관련 이전 기록 배열 — 각 항목 `{ job, application, fit_analysis }` |
| `writing_preferences` | 자소서 작성 선호 — `{ preferred_tone, emphasis_points[] }` |
| `recommended_route` | 맥락 기반 추천 워크플로우 id(`analyze_job`/`write_cover_letter`/`prepare_interview`/`onboarding`) 또는 `null`. 공고 중심 맥락이 아닌 `write_career_description`은 사용자 요청에 따라 직접 선택한다. `get_workflow_guide`의 `workflow_id`로 그대로 사용 |
| `verifier_sequence` | 추천 경로에서 저장 직전 적용할 검증기 id 배열(Career-OS) |
| `next_tool` | 다음에 부를 도구(보통 `get_workflow_guide`) 또는 `null` |

**사용 흐름**

1. (자소서/분석 대상이 있으면) `save_job_posting`으로 공고를 먼저 저장해 `job_id`를 확보.
2. `get_application_context({ job_id })`로 위 데이터를 한 번에 가져옴.
3. 이 데이터를 근거로 **AI가** 적합도 분석 또는 자기소개서를 작성.
4. 결과를 `save_fit_analysis` / `save_cover_letter_version`으로 다시 저장.

> CareerMate는 데이터를 제공할 뿐이고, 분석·작성은 사용자의 AI가 수행합니다. 맥락 없이 작성하지 말고 항상 이 도구로 먼저 사용자 데이터를 확보하세요.
