/**
 * CareerMate — shared enums and human-facing labels.
 *
 * These value sets are the single source of truth for both the MCP server
 * (used by ChatGPT/Claude/Gemini) and the local web dashboard. Labels are in
 * Korean because the primary audience is Korean job seekers; codes are stable
 * machine values that must never change once persisted.
 */
import { conflict } from './errors.ts';

/** Application lifecycle. Drives the Applications board in the dashboard. */
export const APPLICATION_STATUSES = [
  'draft', // 작성 중
  'planned', // 지원 예정
  'applied', // 지원 완료
  'document_passed', // 서류 합격
  'interview', // 면접 진행
  'final_passed', // 최종 합격
  'rejected', // 불합격
  'on_hold', // 보류
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: '작성 중',
  planned: '지원 예정',
  applied: '지원 완료',
  document_passed: '서류 합격',
  interview: '면접 진행',
  final_passed: '최종 합격',
  rejected: '불합격',
  on_hold: '보류',
};

/** Ordered columns for the kanban-style Applications board. */
export const APPLICATION_BOARD_ORDER: ApplicationStatus[] = [
  'draft',
  'planned',
  'applied',
  'document_passed',
  'interview',
  'final_passed',
  'on_hold',
  'rejected',
];

/** Reaching this status unlocks interview-prep prompting in the workflow. */
export const INTERVIEW_UNLOCK_STATUSES: ApplicationStatus[] = [
  'document_passed',
  'interview',
  'final_passed',
];

/**
 * Allowed application-status transitions (server-enforced lifecycle).
 *
 * Design note: CareerMate lets the user's AI record where an application *really*
 * is, so `draft` (the initial, untracked state) may jump to ANY real-world stage.
 * Once an application is being tracked, it may move forward, be corrected
 * backward among active stages, be parked (`on_hold`) or closed (`rejected`) from
 * anywhere, and be reopened/resumed from those terminal states. The one move we
 * forbid is regressing an *active* application back to `draft` ("untracked"),
 * which would silently drop its lifecycle history. The hard spec invariant
 * (interview prep requires `document_passed`+) is enforced separately at the
 * service layer via {@link INTERVIEW_UNLOCK_STATUSES}.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  draft: ['planned', 'applied', 'document_passed', 'interview', 'final_passed', 'rejected', 'on_hold'],
  planned: ['applied', 'document_passed', 'interview', 'final_passed', 'rejected', 'on_hold'],
  applied: ['planned', 'document_passed', 'interview', 'final_passed', 'rejected', 'on_hold'],
  document_passed: ['planned', 'applied', 'interview', 'final_passed', 'rejected', 'on_hold'],
  interview: ['planned', 'applied', 'document_passed', 'final_passed', 'rejected', 'on_hold'],
  final_passed: ['document_passed', 'interview', 'rejected', 'on_hold'],
  rejected: ['draft', 'planned', 'applied', 'document_passed', 'interview', 'final_passed', 'on_hold'],
  on_hold: ['draft', 'planned', 'applied', 'document_passed', 'interview', 'final_passed', 'rejected'],
};

/** Whether moving from `from` to `to` is a permitted status transition (same→same is always allowed). */
export function canTransitionStatus(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Throw a clear, user-facing (Korean) error when a status transition is not allowed. */
export function assertStatusTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (!canTransitionStatus(from, to)) {
    const suffix =
      to === 'draft'
        ? ` ('${APPLICATION_STATUS_LABELS[from]}' 단계의 지원은 작성 중(미추적)으로 되돌릴 수 없습니다. 초기 단계로 옮기려면 '지원 예정'을 선택하세요.)`
        : '';
    throw conflict(
      `'${APPLICATION_STATUS_LABELS[from]}'에서 '${APPLICATION_STATUS_LABELS[to]}'(으)로는 상태를 바꿀 수 없습니다.${suffix}`,
    );
  }
}

/** Stored document kinds (resumes and career descriptions). Cover letters live in their own tables. */
export const DOCUMENT_KINDS = ['resume', 'career_description', 'portfolio', 'other'] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  resume: '이력서',
  career_description: '경력기술서',
  portfolio: '포트폴리오',
  other: '기타 문서',
};

/** Where a piece of content originated — used to show provenance and protect privacy. */
export const CONTENT_SOURCES = ['manual', 'upload', 'ai', 'edit'] as const;
export type ContentSource = (typeof CONTENT_SOURCES)[number];

export const CONTENT_SOURCE_LABELS: Record<ContentSource, string> = {
  manual: '직접 입력',
  upload: '파일 업로드',
  ai: 'AI 생성',
  edit: '직접 수정',
};

/** Activity feed entry types (list_recent_activity). */
export const ACTIVITY_TYPES = [
  'profile_updated',
  'resume_added',
  'cover_letter_added',
  'cover_letter_version_saved',
  'job_saved',
  'fit_analysis_saved',
  'application_status_changed',
  'interview_prep_saved',
  'document_exported',
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Entity kinds referenced by activities and deep links. */
export const ENTITY_TYPES = [
  'profile',
  'experience',
  'project',
  'skill',
  'document',
  'cover_letter',
  'job',
  'application',
  'fit_analysis',
  'interview_prep',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
