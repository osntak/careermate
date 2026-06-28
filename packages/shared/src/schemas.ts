/**
 * CareerMate — zod schemas + inferred TypeScript types.
 *
 * Two layers per entity:
 *  - `*Input`  : what the MCP tools / HTTP API accept from the AI or dashboard.
 *  - `*Record` : the persisted shape returned from the DB (adds id + timestamps).
 *
 * JSON-ish nested fields (achievements, tech, strengths…) are stored as JSON
 * text columns in SQLite and parsed back into arrays/objects by the repositories.
 */
import { z } from 'zod';
import {
  APPLICATION_STATUSES,
  APPLICATION_TIMELINE_TYPES,
  ACTIVITY_TYPES,
  CONTENT_SOURCES,
  DOCUMENT_KINDS,
  ENTITY_TYPES,
} from './enums.ts';

const isoDateTime = z.string();
const id = z.string();

/**
 * Reject script-capable URL schemes (javascript:, data:, vbscript:, file:, …)
 * while allowing http(s), mailto, and scheme-less/relative links. Links are
 * rendered as clickable anchors in the dashboard, so a `javascript:` URL stored
 * here would otherwise execute when clicked (DOM-XSS). The dashboard also
 * sanitizes href/src at render time (lib.js `safeUrl`); this is the write-time
 * half of that defense-in-depth.
 */
function isSafeUrl(u: string): boolean {
  const s = u.trim();
  // An explicit scheme (text before the first ':') must be http(s) or mailto.
  // Scheme-less values (relative paths, bare domains, #anchors) cannot execute.
  return !/^[a-z][a-z0-9+.-]*:/i.test(s) || /^(https?:|mailto:)/i.test(s);
}
const UNSAFE_URL_MSG = 'javascript: 같은 위험한 링크는 사용할 수 없습니다. http(s) 링크를 사용하세요.';
const MAX_URL = 2_000;
const SafeUrl = z.string().min(1).max(MAX_URL).refine(isSafeUrl, { message: UNSAFE_URL_MSG });
const SafeUrlOptional = z
  .string()
  .max(MAX_URL)
  .optional()
  .refine((u) => u == null || u === '' || isSafeUrl(u), { message: UNSAFE_URL_MSG });

/**
 * Length-bounded string helpers. MCP/HTTP inputs are otherwise unbounded, so a
 * malicious or buggy client could send multi-MB strings to exhaust memory/disk.
 * These caps are generous for real résumés/cover letters but reject abuse.
 *  - LINE : single-line fields (names, titles, locations)
 *  - NOTE : short multi-line fields (summaries, notes)
 *  - BODY : full document bodies (resume / cover letter / job description)
 *  - ITEM : one array element;  ITEMS : array length
 */
const MAX_LINE = 500;
const MAX_NOTE = 10_000;
const MAX_BODY = 200_000;
const MAX_ITEM = 2_000;
const MAX_ITEMS = 500;
const EMPTY_MSG = '내용이 비어 있습니다(공백만으로는 저장할 수 없습니다).';

/** Required single-line value: rejects whitespace-only, trims, bounds length. */
const reqLine = z.string().trim().min(1).max(MAX_LINE);
/** Optional single-line value (bounded). */
const optLine = z.string().max(MAX_LINE).optional();
/** Optional short multi-line note (bounded). */
const optNote = z.string().max(MAX_NOTE).optional();
/** Optional full document body (bounded). */
const optBody = z.string().max(MAX_BODY).optional();
/** Required full document body: bounded, rejects whitespace-only (no trim — preserve formatting). */
const reqBody = z
  .string()
  .max(MAX_BODY)
  .refine((s) => s.trim().length > 0, { message: EMPTY_MSG });
/**
 * Coerce a stray scalar into a string array. MCP/LLM clients routinely serialize
 * array arguments as a *string* — a JSON-encoded array (`'["Java","Spring"]'`) or
 * a comma/newline-separated list (`'Java, Spring'`) — instead of a real array. The
 * SDK then rejects the whole tool call with "Expected array, received string", so
 * a single mis-serialized field (keywords, requirements, strengths, tech, tags…)
 * fails the entire save. Absorb those shapes here; real arrays and non-strings
 * pass straight through. The emitted JSON schema still advertises `array`, so the
 * client is still told the correct shape — this only rescues the cases it ignores.
 */
function toStrList(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const s = v.trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* not valid JSON — fall through to delimiter split */
    }
  }
  return s.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
}
/** Bounded array of bounded strings; tolerant of stringified inputs (see toStrList). */
const strList = z.preprocess(toStrList, z.array(z.string().max(MAX_ITEM)).max(MAX_ITEMS));

const baseRecord = {
  id,
  created_at: isoDateTime,
  updated_at: isoDateTime,
};

/* ------------------------------------------------------------------ Profile */

export const LinkSchema = z.object({
  label: reqLine,
  url: SafeUrl,
});
export type Link = z.infer<typeof LinkSchema>;

/* Structured quantitative credentials (한국 이력서 스펙). Values are kept verbatim as
   strings so the AI cites them exactly (학점 3.8, TOEIC 920) without re-deriving. */
export const EducationSchema = z.object({
  school: reqLine.describe('학교명'),
  degree: z.string().max(MAX_LINE).optional().describe('학위/과정 (고졸·학사·석사·박사 등)'),
  major: z.string().max(MAX_LINE).optional().describe('전공'),
  gpa: z.string().max(MAX_LINE).optional().describe('학점 (예: 3.8)'),
  gpa_scale: z.string().max(MAX_LINE).optional().describe('학점 만점 (예: 4.5)'),
  start_date: z.string().max(MAX_LINE).optional().describe('YYYY-MM'),
  end_date: z.string().max(MAX_LINE).optional().describe('YYYY-MM (졸업/예정)'),
  status: z.string().max(MAX_LINE).optional().describe('졸업/재학/휴학/중퇴/수료'),
});
export type Education = z.infer<typeof EducationSchema>;

export const CertificationSchema = z.object({
  name: reqLine.describe('자격증/면허명'),
  issuer: z.string().max(MAX_LINE).optional().describe('발급기관'),
  date: z.string().max(MAX_LINE).optional().describe('취득일 YYYY-MM'),
  score: z.string().max(MAX_LINE).optional().describe('점수/등급(있으면)'),
});
export type Certification = z.infer<typeof CertificationSchema>;

export const LanguageScoreSchema = z.object({
  test: reqLine.describe('시험명 (TOEIC·OPIc·TOEIC Speaking·JLPT·HSK 등)'),
  score: reqLine.describe('점수/등급 (예: 920, IH, N1)'),
  date: z.string().max(MAX_LINE).optional().describe('응시/취득일 YYYY-MM'),
});
export type LanguageScore = z.infer<typeof LanguageScoreSchema>;

export const AwardSchema = z.object({
  title: reqLine.describe('수상/대외활동명'),
  issuer: z.string().max(MAX_LINE).optional().describe('주최/수여기관'),
  date: z.string().max(MAX_LINE).optional().describe('YYYY-MM'),
  description: z.string().max(MAX_NOTE).optional().describe('간단 설명'),
});
export type Award = z.infer<typeof AwardSchema>;

export const ProfileInputSchema = z.object({
  name: reqLine.optional(),
  email: optLine,
  phone: optLine,
  location: optLine,
  headline: z.string().max(MAX_LINE).optional().describe('한 줄 소개 / 직무 타이틀'),
  summary: z.string().max(MAX_NOTE).optional().describe('자기소개 요약'),
  desired_roles: strList.optional().describe('희망 직무'),
  desired_conditions: z.string().max(MAX_NOTE).optional().describe('희망 근무 조건 (연봉, 지역, 근무형태 등)'),
  preferred_tone: z.string().max(MAX_LINE).optional().describe('자기소개서 선호 문체 (예: 담백하고 구체적)'),
  emphasis_points: strList.optional().describe('강조하고 싶은 핵심 포인트'),
  links: z.array(LinkSchema).max(MAX_ITEMS).optional().describe('포트폴리오/깃허브/링크드인 등'),
  education: z.array(EducationSchema).max(MAX_ITEMS).optional().describe('학력 (학교·학위·전공·학점)'),
  certifications: z.array(CertificationSchema).max(MAX_ITEMS).optional().describe('자격증/면허'),
  language_scores: z.array(LanguageScoreSchema).max(MAX_ITEMS).optional().describe('어학 점수 (토익·오픽 등)'),
  awards: z.array(AwardSchema).max(MAX_ITEMS).optional().describe('수상/대외활동'),
});
export type ProfileInput = z.infer<typeof ProfileInputSchema>;

export const ProfileRecordSchema = z.object({
  ...baseRecord,
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  headline: z.string().nullable(),
  summary: z.string().nullable(),
  desired_roles: z.array(z.string()),
  desired_conditions: z.string().nullable(),
  preferred_tone: z.string().nullable(),
  emphasis_points: z.array(z.string()),
  links: z.array(LinkSchema),
  education: z.array(EducationSchema),
  certifications: z.array(CertificationSchema),
  language_scores: z.array(LanguageScoreSchema),
  awards: z.array(AwardSchema),
});
export type ProfileRecord = z.infer<typeof ProfileRecordSchema>;

/* --------------------------------------------------------------- Experience */

export const ExperienceInputSchema = z.object({
  company: reqLine,
  role: optLine,
  employment_type: z.string().max(MAX_LINE).optional().describe('정규직/계약직/인턴/프리랜서 등'),
  start_date: z.string().max(MAX_LINE).optional().describe('YYYY-MM 또는 YYYY-MM-DD'),
  end_date: z.string().max(MAX_LINE).optional().describe('재직 중이면 비워두기'),
  is_current: z.boolean().optional(),
  description: optBody,
  achievements: strList.optional().describe('성과/업적 (정량 지표 권장)'),
  tech: strList.optional().describe('사용 기술/도구'),
  order_index: z.number().optional(),
});
export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;

export const ExperienceRecordSchema = z.object({
  ...baseRecord,
  company: z.string(),
  role: z.string().nullable(),
  employment_type: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_current: z.boolean(),
  description: z.string().nullable(),
  achievements: z.array(z.string()),
  tech: z.array(z.string()),
  order_index: z.number(),
});
export type ExperienceRecord = z.infer<typeof ExperienceRecordSchema>;

/** Batch input: add several experiences in one MCP call (one item → array of one). */
export const ExperienceBatchInputSchema = z.object({
  experiences: z
    .array(ExperienceInputSchema)
    .min(1)
    .max(MAX_ITEMS)
    .describe('추가할 경력 목록(한 건이어도 배열로). 같은 회사·직무·입사일은 갱신되고 중복 생성되지 않습니다.'),
});
export type ExperienceBatchInput = z.infer<typeof ExperienceBatchInputSchema>;

/* ------------------------------------------------------------------ Project */

export const ProjectInputSchema = z.object({
  name: reqLine,
  role: optLine,
  description: optBody,
  highlights: strList.optional(),
  tech: strList.optional(),
  url: SafeUrlOptional,
  start_date: optLine,
  end_date: optLine,
  order_index: z.number().optional(),
});
export type ProjectInput = z.infer<typeof ProjectInputSchema>;

export const ProjectRecordSchema = z.object({
  ...baseRecord,
  name: z.string(),
  role: z.string().nullable(),
  description: z.string().nullable(),
  highlights: z.array(z.string()),
  tech: z.array(z.string()),
  url: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  order_index: z.number(),
});
export type ProjectRecord = z.infer<typeof ProjectRecordSchema>;

/** Batch input: add several projects in one MCP call (one item → array of one). */
export const ProjectBatchInputSchema = z.object({
  projects: z
    .array(ProjectInputSchema)
    .min(1)
    .max(MAX_ITEMS)
    .describe('추가할 프로젝트 목록(한 개여도 배열로). 같은 이름의 프로젝트는 갱신되고 중복 생성되지 않습니다.'),
});
export type ProjectBatchInput = z.infer<typeof ProjectBatchInputSchema>;

/* -------------------------------------------------------------------- Skill */

export const SkillInputSchema = z.object({
  name: reqLine,
  category: z.string().max(MAX_LINE).optional().describe('언어/프레임워크/툴/소프트스킬 등'),
  level: z.string().max(MAX_LINE).optional().describe('상/중/하 또는 자유 서술'),
  years: z.number().optional(),
  order_index: z.number().optional(),
});
export type SkillInput = z.infer<typeof SkillInputSchema>;

export const SkillRecordSchema = z.object({
  ...baseRecord,
  name: z.string(),
  category: z.string().nullable(),
  level: z.string().nullable(),
  years: z.number().nullable(),
  order_index: z.number(),
});
export type SkillRecord = z.infer<typeof SkillRecordSchema>;

/** Batch input: add several skills in one MCP call (one item → array of one). */
export const SkillBatchInputSchema = z.object({
  skills: z
    .array(SkillInputSchema)
    .min(1)
    .max(MAX_ITEMS)
    .describe('추가할 기술스택 목록(한 개여도 배열로). 같은 이름의 기술은 갱신되고 중복 생성되지 않습니다.'),
});
export type SkillBatchInput = z.infer<typeof SkillBatchInputSchema>;

/* ----------------------------------------------------------------- Document */

export const DocumentInputSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  title: reqLine,
  content: reqBody.describe('Markdown 또는 일반 텍스트 본문'),
  source: z.enum(CONTENT_SOURCES).optional(),
  is_primary: z.boolean().optional().describe('대표 문서 여부'),
  tags: strList.optional(),
});
export type DocumentInput = z.infer<typeof DocumentInputSchema>;

export const DocumentRecordSchema = z.object({
  ...baseRecord,
  kind: z.enum(DOCUMENT_KINDS),
  title: z.string(),
  content: z.string(),
  source: z.enum(CONTENT_SOURCES),
  is_primary: z.boolean(),
  tags: z.array(z.string()),
});
export type DocumentRecord = z.infer<typeof DocumentRecordSchema>;

/* -------------------------------------------------------------- CoverLetter */

export const CoverLetterInputSchema = z.object({
  title: reqLine,
  job_id: optLine.describe('특정 공고에 연결할 경우'),
  is_primary: z.boolean().optional(),
  content: optBody.describe('초기 버전 본문 (있으면 v1로 저장)'),
  source: z.enum(CONTENT_SOURCES).optional(),
  note: optNote.describe('초기 버전 메모'),
});
export type CoverLetterInput = z.infer<typeof CoverLetterInputSchema>;

export const CoverLetterVersionInputSchema = z.object({
  cover_letter_id: optLine.describe('기존 자기소개서에 새 버전 추가 시'),
  title: z.string().max(MAX_LINE).optional().describe('새 자기소개서를 만들 때 제목'),
  job_id: optLine,
  content: reqBody,
  note: optNote.describe('이 버전의 변경 요약 (예: 지원동기 보강)'),
  source: z.enum(CONTENT_SOURCES).optional(),
  set_current: z.boolean().optional().describe('이 버전을 현재 버전으로 지정 (기본 true)'),
  force: z
    .boolean()
    .optional()
    .describe('저장 전 자동 점검(근거 없는 수치)에서 막혔을 때, 의도한 값임을 확인하고 그대로 저장'),
  strict: z
    .boolean()
    .optional()
    .describe('이번 저장만 엄격하게 점검(이력서 본문에 근거 없는 수치도 차단). 생략하면 저장된 모드 설정을 따름'),
});
export type CoverLetterVersionInput = z.infer<typeof CoverLetterVersionInputSchema>;

export const CoverLetterVersionRecordSchema = z.object({
  id,
  cover_letter_id: z.string(),
  version_no: z.number(),
  content: z.string(),
  note: z.string().nullable(),
  source: z.enum(CONTENT_SOURCES),
  created_at: isoDateTime,
});
export type CoverLetterVersionRecord = z.infer<typeof CoverLetterVersionRecordSchema>;

export const CoverLetterRecordSchema = z.object({
  ...baseRecord,
  title: z.string(),
  job_id: z.string().nullable(),
  is_primary: z.boolean(),
  current_version_id: z.string().nullable(),
  version_count: z.number(),
  current_content: z.string().nullable(),
  versions: z.array(CoverLetterVersionRecordSchema).optional(),
});
export type CoverLetterRecord = z.infer<typeof CoverLetterRecordSchema>;

/* --------------------------------------------------------------------- Job */

export const JobInputSchema = z.object({
  company: reqLine,
  position: reqLine.describe('직무/포지션명'),
  url: SafeUrlOptional,
  location: optLine,
  employment_type: optLine,
  description: optBody.describe('공고 원문 또는 정리된 텍스트'),
  requirements: strList.optional().describe('자격요건/우대사항 핵심'),
  keywords: strList.optional().describe('핵심 키워드'),
  deadline: z.string().max(MAX_LINE).optional().describe('마감일 YYYY-MM-DD'),
  source: z.string().max(MAX_LINE).optional().describe('출처 (사람인/원티드/직접 입력 등)'),
  company_overview: optBody.describe('회사 사업개요·미션·주요 제품·최근 활동 (AI가 리서치해 채움)'),
  talent_profile: optBody.describe('회사가 강조하는 인재상 (한국 자소서·면접에서 정렬 기준)'),
  core_values: strList.optional().describe('회사 핵심가치 (키워드 배열)'),
});
export type JobInput = z.infer<typeof JobInputSchema>;

export const JobRecordSchema = z.object({
  ...baseRecord,
  company: z.string(),
  position: z.string(),
  url: z.string().nullable(),
  location: z.string().nullable(),
  employment_type: z.string().nullable(),
  description: z.string().nullable(),
  requirements: z.array(z.string()),
  keywords: z.array(z.string()),
  deadline: z.string().nullable(),
  source: z.string().nullable(),
  company_overview: z.string().nullable(),
  talent_profile: z.string().nullable(),
  core_values: z.array(z.string()),
});
export type JobRecord = z.infer<typeof JobRecordSchema>;

/* ------------------------------------------------------------- FitAnalysis */

export const FitAnalysisInputSchema = z.object({
  job_id: reqLine.describe('분석 대상 공고 ID'),
  score: z.number().min(0).max(100).optional().describe('종합 적합도 0~100'),
  summary: z.string().max(MAX_NOTE).optional().describe('한두 문단 요약'),
  strengths: strList.optional().describe('강점 / 잘 맞는 부분'),
  gaps: strList.optional().describe('부족한 부분 / 보완 필요'),
  matched_keywords: strList.optional(),
  missing_keywords: strList.optional(),
  recommendations: strList.optional().describe('자기소개서/지원 전략 제안'),
});
export type FitAnalysisInput = z.infer<typeof FitAnalysisInputSchema>;

export const FitAnalysisRecordSchema = z.object({
  ...baseRecord,
  job_id: z.string(),
  score: z.number().nullable(),
  summary: z.string().nullable(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  matched_keywords: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type FitAnalysisRecord = z.infer<typeof FitAnalysisRecordSchema>;

/* ------------------------------------------------------------- Application */

export const ApplicationInputSchema = z.object({
  job_id: reqLine,
  status: z.enum(APPLICATION_STATUSES).optional(),
  resume_id: optLine,
  cover_letter_id: optLine,
  applied_at: optLine,
  notes: optNote,
});
export type ApplicationInput = z.infer<typeof ApplicationInputSchema>;

export const ApplicationSubmissionSchema = z.object({
  submitted_at: optLine.describe('실제 제출일 YYYY-MM-DD'),
  channel: optLine.describe('제출 채널(원티드/사람인/회사 채용페이지 등)'),
  cover_letter_id: optLine,
  cover_letter_version_id: optLine,
  document_ids: strList.optional().describe('제출한 이력서·경력기술서·포트폴리오 문서 ID 목록'),
});
export type ApplicationSubmission = z.infer<typeof ApplicationSubmissionSchema>;

export const ApplicationStatusUpdateSchema = z.object({
  job_id: optLine,
  application_id: optLine,
  status: z.enum(APPLICATION_STATUSES),
  note: optNote.describe('상태 변경 사유/메모'),
  submission: ApplicationSubmissionSchema.optional().describe('지원 완료 기록에 남길 제출 자료 스냅샷'),
});
export type ApplicationStatusUpdate = z.infer<typeof ApplicationStatusUpdateSchema>;

export const ApplicationRecordSchema = z.object({
  ...baseRecord,
  job_id: z.string(),
  status: z.enum(APPLICATION_STATUSES),
  resume_id: z.string().nullable(),
  cover_letter_id: z.string().nullable(),
  applied_at: z.string().nullable(),
  notes: z.string().nullable(),
});
export type ApplicationRecord = z.infer<typeof ApplicationRecordSchema>;

/* ----------------------------------------------------------- InterviewPrep */

export const StarGuideSchema = z.object({
  question: z.string().max(MAX_NOTE),
  situation: optNote,
  task: optNote,
  action: optNote,
  result: optNote,
});
export type StarGuide = z.infer<typeof StarGuideSchema>;

/** Interview round/track a question belongs to (drives the 기술/인성·컬처핏 tabs). */
export const INTERVIEW_CATEGORIES = ['technical', 'behavioral'] as const;
export type InterviewCategory = (typeof INTERVIEW_CATEGORIES)[number];

export const InterviewQuestionSchema = z.object({
  question: z.string().max(MAX_NOTE),
  category: z
    .enum(INTERVIEW_CATEGORIES)
    .optional()
    .describe("질문 갈래: 'technical'(기술·직무 1차) | 'behavioral'(인성·컬처핏·임원 2차, 자기소개서 기반). 생략 시 기술로 간주."),
  intent: z.string().max(MAX_NOTE).optional().describe('질문 의도'),
  followups: strList.optional().describe('예상 꼬리 질문'),
  answer_outline: optBody.describe('답변 가이드/핵심 포인트'),
});
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;

export const InterviewPrepInputSchema = z.object({
  job_id: reqLine,
  questions: z.array(InterviewQuestionSchema).max(MAX_ITEMS).optional(),
  star_guides: z.array(StarGuideSchema).max(MAX_ITEMS).optional(),
  self_introduction: optBody.describe('1분 자기소개 초안'),
  notes: optNote.describe('면접 후기/메모'),
});
export type InterviewPrepInput = z.infer<typeof InterviewPrepInputSchema>;

export const InterviewPrepRecordSchema = z.object({
  ...baseRecord,
  job_id: z.string(),
  questions: z.array(InterviewQuestionSchema),
  star_guides: z.array(StarGuideSchema),
  self_introduction: z.string().nullable(),
  notes: z.string().nullable(),
});
export type InterviewPrepRecord = z.infer<typeof InterviewPrepRecordSchema>;

/* ----------------------------------------------------------------- Activity */

export const ActivityRecordSchema = z.object({
  id,
  type: z.enum(ACTIVITY_TYPES),
  entity_type: z.enum(ENTITY_TYPES).nullable(),
  entity_id: z.string().nullable(),
  summary: z.string(),
  created_at: isoDateTime,
});
export type ActivityRecord = z.infer<typeof ActivityRecordSchema>;

export const ApplicationTimelineInputSchema = z.object({
  job_id: reqLine,
  type: z.enum(APPLICATION_TIMELINE_TYPES),
  title: reqLine,
  summary: optNote,
  payload: z.record(z.string(), z.unknown()).optional(),
  occurred_at: optLine,
});
export type ApplicationTimelineInput = z.infer<typeof ApplicationTimelineInputSchema>;

export const ApplicationTimelineRecordSchema = z.object({
  id,
  job_id: z.string(),
  type: z.enum(APPLICATION_TIMELINE_TYPES),
  title: z.string(),
  summary: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  occurred_at: isoDateTime,
  created_at: isoDateTime,
});
export type ApplicationTimelineRecord = z.infer<typeof ApplicationTimelineRecordSchema>;

/* ----------------------------------------------------- Aggregates / context */

export const OnboardingStatusSchema = z.object({
  completed: z.boolean(),
  has_profile: z.boolean(),
  has_resume: z.boolean(),
  has_cover_letter: z.boolean(),
  has_experience: z.boolean(),
  has_skills: z.boolean(),
  has_job: z.boolean(),
  profile_completeness: z.number().describe('0~100 프로필 완성도'),
  next_steps: z.array(z.string()).describe('지금 해야 할 다음 단계 안내'),
});
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

/** The one-shot context bundle the AI pulls before analyzing a job or writing. */
export const ApplicationContextSchema = z.object({
  profile: ProfileRecordSchema.nullable(),
  primary_resume: DocumentRecordSchema.nullable(),
  resumes: z.array(DocumentRecordSchema),
  experiences: z.array(ExperienceRecordSchema),
  projects: z.array(ProjectRecordSchema),
  skills: z.array(SkillRecordSchema),
  cover_letters: z.array(CoverLetterRecordSchema),
  recent_applications: z.array(ApplicationRecordSchema),
  job: JobRecordSchema.nullable(),
  fit_analysis: FitAnalysisRecordSchema.nullable(),
  related_history: z
    .array(
      z.object({
        job: JobRecordSchema,
        application: ApplicationRecordSchema.nullable(),
        fit_analysis: FitAnalysisRecordSchema.nullable(),
      }),
    )
    .describe('같은 회사/직무 관련 이전 기록'),
  writing_preferences: z.object({
    preferred_tone: z.string().nullable(),
    emphasis_points: z.array(z.string()),
  }),
});
export type ApplicationContext = z.infer<typeof ApplicationContextSchema>;
