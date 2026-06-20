/**
 * @careermate/workflows — definitions.ts
 *
 * Step-by-step workflows the AI should follow, encoded as DATA + helper text.
 * Each step references concrete MCP tool names so the AI knows exactly which
 * tool to call. Authored in Korean, but language-adaptive: the AI surfaces
 * these to users in the user's own language (see AGENTS.md output-language rule).
 */

export interface WorkflowDefinition {
  /** Stable machine id. */
  id: string;
  /** Human-facing title (Korean). */
  title: string;
  /** One-line description of what this workflow accomplishes. */
  description: string;
  /** When the AI should start this workflow (natural-language trigger). */
  trigger: string;
  /** Ordered steps; each references the concrete MCP tool(s) to call. */
  steps: string[];
}

export const WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'onboarding',
    title: '온보딩 (첫 셋업)',
    description:
      '사용자가 처음 연결했을 때 프로필·이력서·자기소개서를 등록하고 대시보드를 여는 흐름.',
    trigger:
      '사용자가 처음 CareerMate에 연결했거나, "시작하자 / 셋업해줘 / 프로필 등록"이라고 요청할 때.',
    steps: [
      '`get_onboarding_status`를 호출해 현재 등록 상태(has_profile, has_resume, has_cover_letter, has_experience, has_skills, profile_completeness, next_steps)를 확인한다.',
      '비어 있는 항목을 사용자의 언어로 쉽게 안내하고, 먼저 "기존에 작성해 둔 이력서·경력기술서·자기소개서 파일이 있는지" 묻는다(hwp/docx/pdf 모두 가능).',
      '파일 입력 분기: ① 사용자가 "파일이 있다"고 하면 `open_inbox`로 인입 폴더를 열어 파일을 넣게 하고, "다 넣었다"고 하면 `read_inbox`로 본문을 읽는다(pdf·이미지는 read_inbox가 경로만 주므로 클라이언트의 파일 읽기로 직접 읽는다). ② 사용자가 파일 경로를 직접 알려주면 `read_document`로 읽는다. ③ "없다/직접 입력/텍스트로 붙여넣기"면 폴더를 열지 말고 받은 텍스트를 그대로 쓴다. (묻지도 않고 open_inbox로 폴더를 자동으로 열지 않는다.)',
      '수집한 정보를 구조화해 `save_profile`로 저장한다(이름·연락처·headline·summary·desired_roles·desired_conditions, 그리고 글쓰기 선호인 preferred_tone과 emphasis_points 포함). 파일 출처는 source=upload, 직접 입력은 manual.',
      '업로드한 이력서/경력기술서/포트폴리오 본문을 `add_resume`로 저장한다(kind·title 지정, 대표 문서는 is_primary=true).',
      '경력·프로젝트·스킬이 파악되면 `add_experience`·`add_project`·`add_skill`로 저장한다 — 각 도구는 배열을 받으므로 파악한 항목을 한 번에 모아 넘긴다(항목마다 반복 호출하지 않는다). 같은 항목을 다시 넣어도 중복 없이 갱신된다(완성도의 has_experience/has_skills에 반영).',
      '기존 자기소개서가 있으면 `save_cover_letter_version`으로 저장한다(title+content면 v1로 저장, 없으면 나중에 작성 가능함을 안내).',
      '`open_dashboard`를 호출해 사용자가 자기 데이터를 확인하게 한다.',
      '다시 `get_onboarding_status`로 완성도를 확인하고, 다음 단계(공고 분석 등)를 제안한다.',
    ],
  },
  {
    id: 'analyze_job',
    title: '공고 분석 (적합도 분석)',
    description:
      '채용 공고를 읽어 사용자 프로필과 비교하고, 공고와 적합도 분석을 저장한 뒤 자기소개서 작성을 제안하는 핵심 흐름.',
    trigger:
      '사용자가 채용 공고 링크나 본문을 붙여넣거나 "이 공고 분석해줘 / 나랑 잘 맞아?"라고 물을 때.',
    steps: [
      '공고 원문(붙여넣은 텍스트 또는 링크 내용)을 읽고 company, position, requirements, keywords, deadline 등 핵심 정보를 정리한다.',
      '`get_application_context`를 호출해 한 번에 프로필·대표 이력서·경력·프로젝트·스킬·기존 자기소개서·최근 지원 현황·이전 적합도 분석·같은 회사/직무 관련 기록·글쓰기 선호(preferred_tone, emphasis_points)를 가져온다. (분석 대상 공고가 이미 저장돼 있으면 job_id도 함께 전달한다.)',
      '공고 요구사항과 사용자 경력/스킬/프로젝트를 비교한다: 일치하는 강점(strengths)과 부족한 부분(gaps), 매칭 키워드(matched_keywords)와 누락 키워드(missing_keywords)를 도출하고, 종합 적합도 점수(score 0~100)와 요약(summary), 지원 전략 제안(recommendations)을 정리한다. 없는 경험을 지어내지 않는다.',
      '아직 저장되지 않은 공고라면 `save_job_posting`으로 공고를 저장하고 job_id를 확보한다.',
      '도출한 분석 결과를 `save_fit_analysis`로 저장한다(job_id, score, summary, strengths, gaps, matched_keywords, missing_keywords, recommendations).',
      '분석 결과를 사용자의 언어로 쉽게 설명한다(잘 맞는 점, 보완할 점, 추천 전략). 기술 용어는 빼고 전달한다.',
      '분석 뒤 곧장 자기소개서를 쓰지 말고, "이 공고에 맞춘 자기소개서를 써드릴까요?"라고 묻고 선택지를 제시한다: ① "네, 이 공고에 맞춘 자기소개서를 써줘" ② "아니요, 분석만 저장해줘".',
      '사용자가 ①을 선택하면 자기소개서를 작성하기 직전에 `get_writing_style_guide`를 호출해 "AI 티 안 나는 글쓰기 규칙"을 가져온다. ②를 선택하면 자소서 작성 없이 멈추고 저장 결과와 대시보드 확인만 안내한다.',
      '적합도 분석·글쓰기 선호와 글쓰기 규칙을 함께 반영해 자기소개서를 작성하고(번역투·클리셰·기계적 병렬 제거, 사실·수치는 그대로), `save_cover_letter_version`으로 저장한다(job_id 연결, note에 작성 의도 요약).',
      '`open_application`으로 해당 지원 건을 열어 사용자가 결과를 확인하게 하고, 지원 상태 변경(예: 지원 예정/지원 완료)을 제안한다.',
    ],
  },
  {
    id: 'write_cover_letter',
    title: '자기소개서 작성',
    description:
      '특정 공고에 맞춘 자기소개서를 사용자 확인을 거쳐 작성하고 버전으로 저장하는 흐름.',
    trigger:
      '사용자가 "자기소개서 써줘 / 이 공고용 자소서 만들어줘"라고 요청하거나, 공고 분석 후 작성 제안에 동의했을 때.',
    steps: [
      '`get_application_context`(가능하면 job_id 포함)를 호출해 프로필·경력·프로젝트·스킬·기존 자기소개서·이전 적합도 분석·글쓰기 선호(preferred_tone, emphasis_points)를 가져온다.',
      '작성 전에 대상 공고, 강조할 포인트, 톤, 분량을 사용자에게 확인한다(확인 없이 큰 작업을 진행하지 않는다).',
      '`get_writing_style_guide`를 호출해 "AI 티 안 나는 글쓰기 규칙"(번역투·클리셰·기계적 병렬·상투적 연결어·균일한 문장 리듬 제거)을 가져온다.',
      '저장된 실제 경험·성과만으로 자기소개서를 작성하되, 위 글쓰기 규칙을 적용해 사람이 쓴 듯 자연스럽게 쓴다(사실·수치·고유명사는 그대로). 빈칸이나 확인이 필요한 부분은 추측하지 말고 표시해 사용자에게 묻는다.',
      '완성본을 `save_cover_letter_version`으로 저장한다(기존 자기소개서면 cover_letter_id, 새로 만들면 title, 공고용이면 job_id, 변경 요약은 note, source=ai).',
      '사용자가 원하면 `export_cover_letter`로 파일로 내보내고, 추가 수정 요청이 있으면 새 버전으로 다시 저장한다.',
      '저장 결과를 사용자의 언어로 알리고, 지원 상태 업데이트(`update_application_status`)나 면접 준비 등 다음 단계를 제안한다.',
    ],
  },
  {
    id: 'write_career_description',
    title: '경력기술서 작성',
    description:
      '프로필·이력서·경력·프로젝트·스킬을 근거로 실제 제출 가능한 경력기술서를 작성하고 문서함에 저장하는 흐름.',
    trigger:
      '사용자가 "경력기술서 써줘 / 경력기술서 만들어줘 / 내 경력 정리해줘"라고 요청할 때.',
    steps: [
      '`get_onboarding_status`로 준비 상태를 확인하고, `get_profile`·`get_resumes`·`get_experiences`·`get_projects`·`get_skills`를 호출해 기존 프로필, 이력서, 경력기술서(kind=career_description), 경력, 프로젝트, 기술스택을 모두 확인한다.',
      '사용자가 파일 경로를 주면 `read_document`로 읽고, 인입 폴더를 사용했다면 `read_inbox`로 본문을 읽는다. 이미 저장된 자료와 새 파일을 비교해 중복·상충되는 사실은 표시하고 추측하지 않는다.',
      '`get_workflow_guide({ workflow_id: "write_career_description" })`가 안내하는 전문가 절차를 따른다. 작성 직전 `get_playbook({ domain: "resume" })`와 `get_playbook({ domain: "ats" })`를 받아 실제 경력기술서 형식과 ATS 친화성을 적용한다.',
      '작성 전에 목적을 확인한다: 범용 마스터본인지, 특정 직무/공고용인지, 신입/무경력이라 프로젝트·교육·활동 중심 역량기술서로 쓸지, 분량과 톤은 어떻게 할지 묻는다.',
      '경력기술서는 자기소개서처럼 서사로 쓰지 않는다. 제목, 핵심 요약, 핵심 역량, 경력/프로젝트별 역할·기간·도구·문제·행동·성과를 표나 불릿 중심으로 정리한다. 수치·회사명·기간·직책은 저장된 사실만 쓰고, 없는 성과 수치는 만들지 않는다.',
      '무경력/비개발자라면 경력을 날조하지 말고 교육·프로젝트·운영 경험·업무 도구·협업 경험·성과 증거 중심의 "역량기술서"로 구성한다.',
      '저장 직전 `get_verifier({ id: "truthfulness" })`, `get_verifier({ id: "consistency" })`, `get_verifier({ id: "ats-compat" })`를 받아 당신이 직접 점검하고, 허위·상충·키워드 누락을 고친다. 확인이 필요한 사실은 본문에 표시하고 사용자에게 묻는다.',
      '완성본을 `add_resume`으로 저장한다(kind=career_description, source=ai, title은 사용 목적이 드러나게 작성, tags에 직무/용도 키워드 포함). 대표 문서로 삼아도 되는지 확인된 경우에만 is_primary=true를 쓴다.',
      '저장 결과를 사용자의 언어로 알리고, 문서 탭에서 확인할 수 있음을 안내한다. 특정 공고용으로 작성했다면 이어서 자기소개서나 면접 준비를 제안한다.',
    ],
  },
  {
    id: 'manage_application_status',
    title: '지원 상태 관리',
    description:
      '지원 진행 상황(8단계)을 업데이트하고 상태에 맞는 다음 행동을 제안하는 흐름.',
    trigger:
      '사용자가 "지원했어 / 서류 합격했어 / 면접 잡혔어 / 떨어졌어"처럼 진행 상황을 알리거나 상태 변경을 요청할 때.',
    steps: [
      '필요하면 `get_application_context` 또는 `get_job_posting`으로 대상 지원 건과 공고를 확인한다.',
      '적절한 상태로 `update_application_status`를 호출한다. 8단계: draft(작성 중), planned(지원 예정), applied(지원 완료), document_passed(서류 합격), interview(면접 진행), final_passed(최종 합격), rejected(불합격), on_hold(보류). 변경 사유는 note에 남긴다.',
      '변경 결과를 사용자의 언어로 쉽게 알린다.',
      '상태에 맞는 다음 단계를 제안한다: applied → 결과 기다리기 안내, document_passed/interview → 면접 준비(prepare_interview) 제안, final_passed → 축하 및 마무리, rejected/on_hold → 회고 또는 다른 공고 탐색 제안.',
      '필요하면 `open_application`으로 해당 지원 건을 열어 보여준다.',
    ],
  },
  {
    id: 'prepare_interview',
    title: '면접 준비',
    description:
      '공고 기준 예상 질문·STAR 답변·1분 자기소개를 준비해 저장하는 흐름.',
    trigger:
      '사용자가 "면접 준비 도와줘"라고 요청하거나, 지원 상태가 서류 합격(document_passed) 또는 면접 진행(interview)으로 바뀌었을 때.',
    steps: [
      '`get_application_context`(job_id 포함)를 호출해 공고, 프로필, 경력/프로젝트, 적합도 분석(강점·갭), 자기소개서를 가져온다.',
      '공고와 사용자 경험을 바탕으로 예상 면접 질문(question, intent, followups, answer_outline)을 도출한다.',
      '핵심 경험에 대한 STAR 가이드(question, situation, task, action, result)와 1분 자기소개(self_introduction) 초안을 작성한다. 실제 경험만 사용한다.',
      '준비 내용을 `save_interview_prep`로 저장한다(job_id, questions, star_guides, self_introduction, notes).',
      '준비 내용을 사용자의 언어로 쉽게 요약해 전달하고, 모의 면접/추가 질문 연습이나 상태 업데이트(`update_application_status`로 interview/final_passed)를 제안한다.',
    ],
  },
  {
    id: 'build_personal_brand',
    title: '퍼스널 브랜드 (LinkedIn·포트폴리오)',
    description:
      'LinkedIn 프로필과 포트폴리오 같은 자기표현 자산을 직무에 맞춰 작성·최적화하는 흐름. 이력서 임포트(온보딩)와 분리된 별도 작업.',
    trigger:
      '사용자가 "링크드인 프로필 봐줘 / 포트폴리오 정리해줘 / 퍼스널 브랜딩 도와줘"라고 요청할 때.',
    steps: [
      '`get_application_context`(가능하면 대상 job_id 포함)를 호출해 프로필·경력·프로젝트·스킬·대표 이력서·글쓰기 선호를 가져온다. 타깃 공고가 있으면 그 키워드를 사전 입력으로 쓴다.',
      '`get_workflow_guide({ workflow_id: "build_personal_brand" })`가 안내하는 전문가 절차를 따른다. 작성 직전 `get_playbook({ domain: "linkedin-profile" })`·`get_playbook({ domain: "portfolio" })`를 받아 헤드라인·About·Featured·3막(problem→approach→impact) 규범을 적용한다.',
      '무엇을 만들지 확인한다(LinkedIn 프로필만/포트폴리오만/둘 다, 타깃 직무, 강조 포인트). 저장된 실제 경험·성과만 쓰고, 없는 수치·고유명사는 추측하지 말고 `[확인 필요]`로 표시해 사용자에게 묻는다.',
      'LinkedIn: 헤드라인(핵심 키워드를 앞 120자에 front-load, 하드 상한 220자)·About 첫 문장 훅·정량 성과·직무 키워드를 작성. 포트폴리오: 직무에 맞는 3~6개 항목을 problem→approach→impact 3막으로 구성하고 본인 기여(my_role)와 정량 임팩트를 명시한다.',
      '저장 직전 `get_verifier({ id: "human-voice" })`·`get_verifier({ id: "truthfulness" })`·`get_verifier({ id: "consistency" })`를 받아 당신이 직접 점검한다(AI 티·환각·사실 보존). 키워드 사전이 비면 키워드 체크는 보류한다.',
      '포트폴리오 본문은 `add_resume`(kind=portfolio)로 저장한다. LinkedIn 프로필 초안은 사용자가 복사해 쓰도록 제시하고(전용 저장·검증 도구 validate_linkedin_profile은 Phase B 미구현), 원하면 파일로 내보낸다.',
      '저장 결과를 사용자의 언어로 알리고 대시보드 링크를 안내하며, 네트워킹(추천 경로)이나 공고 지원으로 이어갈지 제안한다.',
    ],
  },
];
