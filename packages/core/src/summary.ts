/**
 * Home dashboard summary + recent activity. Read-only aggregation that answers
 * "what should I do right now?" at a glance.
 */
import {
  type ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  INTERVIEW_UNLOCK_STATUSES,
  type JobRecord,
  type ApplicationRecord,
  type CoverLetterRecord,
  type ActivityRecord,
} from '@careermate/shared';
import {
  jobRepo,
  applicationRepo,
  coverLetterRepo,
  interviewRepo,
  fitRepo,
  activityRepo,
} from '@careermate/db';
import { getOnboardingStatus } from './onboarding.ts';

export interface JobWithMeta extends JobRecord {
  status: ApplicationStatus;
  status_label: string;
  fit_score: number | null;
}

export interface HomeSummary {
  onboarding: ReturnType<typeof getOnboardingStatus>;
  counts: {
    jobs: number;
    active_applications: number;
    cover_letters: number;
    interview_pending: number;
  };
  status_breakdown: { status: ApplicationStatus; label: string; count: number }[];
  recent_jobs: JobWithMeta[];
  in_progress: { application: ApplicationRecord; job: JobRecord | null; status_label: string }[];
  recent_cover_letters: CoverLetterRecord[];
  interview_todo: { job: JobRecord; status_label: string }[];
  deadlines: { job: JobRecord; status: ApplicationStatus; status_label: string; days_left: number }[];
  followups: { job: JobRecord; days_since: number }[];
  recent_activity: ActivityRecord[];
}

const ACTIVE: ApplicationStatus[] = ['draft', 'planned', 'applied', 'document_passed', 'interview'];

// Deadline nudge applies only while the posting still needs action (not yet applied).
const DEADLINE_ACTIONABLE: ApplicationStatus[] = ['draft', 'planned'];
// Surface a deadline once it's within this many days (overdue items are always shown).
const DEADLINE_SOON_DAYS = 14;
// Suggest a follow-up when an application has sat in 'applied' this many days with no response.
const FOLLOWUP_STALE_DAYS = 10;
const DAY_MS = 86400000;

/** Whole days from `now`'s local midnight to a `YYYY-MM-DD` date (future > 0, today = 0, past < 0); null if unparseable. */
function daysUntilDate(dateStr: string | null | undefined, now: Date): number | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / DAY_MS);
}

/** Whole days elapsed since an ISO timestamp up to `now`; null if unparseable. */
function daysSinceTimestamp(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.floor((now.getTime() - d.getTime()) / DAY_MS);
}

export function jobWithMeta(job: JobRecord): JobWithMeta {
  const app = applicationRepo.getByJob(job.id);
  const fit = fitRepo.getByJob(job.id);
  const status = app?.status ?? 'draft';
  return { ...job, status, status_label: APPLICATION_STATUS_LABELS[status], fit_score: fit?.score ?? null };
}

export function getHomeSummary(now: Date = new Date()): HomeSummary {
  const onboarding = getOnboardingStatus();
  const jobs = jobRepo.list();
  const applications = applicationRepo.list();
  const coverLetters = coverLetterRepo.list();
  const statusByJob = new Map(applications.map((a) => [a.job_id, a]));

  const status_breakdown = (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    count: applications.filter((a) => a.status === status).length,
  }));

  const active = applications.filter((a) => ACTIVE.includes(a.status));

  // Interview to-do: passed-to-interview stages without saved prep yet.
  const interview_todo = applications
    .filter((a) => INTERVIEW_UNLOCK_STATUSES.includes(a.status) && !interviewRepo.getByJob(a.job_id))
    .map((a) => {
      const job = jobRepo.get(a.job_id);
      return job ? { job, status_label: APPLICATION_STATUS_LABELS[a.status] } : null;
    })
    .filter((x): x is { job: JobRecord; status_label: string } => x !== null);

  // Deadline nudges: postings still awaiting action (draft/planned) whose deadline
  // is overdue or within DEADLINE_SOON_DAYS. Most urgent (overdue) first.
  const deadlines = jobs
    .map((job) => {
      const status = statusByJob.get(job.id)?.status ?? 'draft';
      if (!DEADLINE_ACTIONABLE.includes(status)) return null;
      const days_left = daysUntilDate(job.deadline, now);
      if (days_left == null || days_left > DEADLINE_SOON_DAYS) return null;
      return { job, status, status_label: APPLICATION_STATUS_LABELS[status], days_left };
    })
    .filter((x): x is { job: JobRecord; status: ApplicationStatus; status_label: string; days_left: number } => x !== null)
    .sort((a, b) => a.days_left - b.days_left)
    .slice(0, 5);

  // Follow-up nudges: applications sitting in 'applied' with no response for a while.
  const followups = applications
    .filter((a) => a.status === 'applied')
    .map((a) => {
      const days_since = daysSinceTimestamp(a.applied_at, now);
      if (days_since == null || days_since < FOLLOWUP_STALE_DAYS) return null;
      const job = jobRepo.get(a.job_id);
      return job ? { job, days_since } : null;
    })
    .filter((x): x is { job: JobRecord; days_since: number } => x !== null)
    .sort((a, b) => b.days_since - a.days_since)
    .slice(0, 5);

  return {
    onboarding,
    counts: {
      jobs: jobs.length,
      active_applications: active.length,
      cover_letters: coverLetters.length,
      interview_pending: interview_todo.length,
    },
    status_breakdown,
    recent_jobs: jobs.slice(0, 6).map(jobWithMeta),
    in_progress: active.slice(0, 6).map((application) => {
      const job = jobRepo.get(application.job_id);
      return {
        application,
        job,
        status_label: APPLICATION_STATUS_LABELS[application.status],
      };
    }),
    recent_cover_letters: coverLetters.slice(0, 5),
    interview_todo,
    deadlines,
    followups,
    recent_activity: activityRepo.recent(10),
  };
}

export function listRecentActivity(limit = 20): ActivityRecord[] {
  return activityRepo.recent(limit);
}

/* ----------------------------------------------------------- action digest */

// Follow-up is the #1 thing trackers drop (community research): applications go
// stale and the user forgets to nudge. The dashboard Home already surfaces this,
// but the AI agent — the primary interface — couldn't see it. getActionDigest
// exposes the same "what needs my attention now" intelligence to MCP, broadened
// past 'applied' to the other waiting states (post-pass scheduling, post-interview
// result). Read-only; thresholds are advisory nudges, not hard rules.
const POST_PASS_STALE_DAYS = 7; // document_passed → interview scheduling wait
const POST_INTERVIEW_STALE_DAYS = 7; // interview → result wait

export interface FollowupItem {
  job: JobRecord;
  status: ApplicationStatus;
  status_label: string;
  days_since: number;
  reason: string;
}

export interface ActionDigest {
  /** Server's today (YYYY-MM-DD) — the AI can't reliably know the current date. */
  today: string;
  followups: FollowupItem[];
  deadlines: { job: JobRecord; status: ApplicationStatus; status_label: string; days_left: number }[];
  interview_todo: { job: JobRecord; status_label: string }[];
}

/**
 * "What needs attention now" for the AI agent: stale applications awaiting a
 * response (so the user can decide whether to follow up), upcoming/overdue
 * deadlines, and passed stages still missing interview prep. All read-only.
 */
export function getActionDigest(now: Date = new Date()): ActionDigest {
  const applications = applicationRepo.list();
  const jobs = jobRepo.list();
  const statusByJob = new Map(applications.map((a) => [a.job_id, a]));

  const followups: FollowupItem[] = [];
  for (const a of applications) {
    const job = jobRepo.get(a.job_id);
    if (!job) continue;
    if (a.status === 'applied') {
      const days = daysSinceTimestamp(a.applied_at, now);
      if (days != null && days >= FOLLOWUP_STALE_DAYS)
        followups.push({ job, status: a.status, status_label: APPLICATION_STATUS_LABELS[a.status], days_since: days, reason: `지원 후 ${days}일째 응답 없음 — 정중한 후속 문의를 고려할 시점` });
    } else if (a.status === 'document_passed') {
      const days = daysSinceTimestamp(a.updated_at, now);
      if (days != null && days >= POST_PASS_STALE_DAYS)
        followups.push({ job, status: a.status, status_label: APPLICATION_STATUS_LABELS[a.status], days_since: days, reason: `서류 합격 후 ${days}일째 면접 일정 대기` });
    } else if (a.status === 'interview') {
      const days = daysSinceTimestamp(a.updated_at, now);
      if (days != null && days >= POST_INTERVIEW_STALE_DAYS)
        followups.push({ job, status: a.status, status_label: APPLICATION_STATUS_LABELS[a.status], days_since: days, reason: `면접 후 ${days}일째 결과 대기` });
    }
  }
  followups.sort((a, b) => b.days_since - a.days_since);

  const deadlines = jobs
    .map((job) => {
      const status = statusByJob.get(job.id)?.status ?? 'draft';
      if (!DEADLINE_ACTIONABLE.includes(status)) return null;
      const days_left = daysUntilDate(job.deadline, now);
      if (days_left == null || days_left > DEADLINE_SOON_DAYS) return null;
      return { job, status, status_label: APPLICATION_STATUS_LABELS[status], days_left };
    })
    .filter((x): x is { job: JobRecord; status: ApplicationStatus; status_label: string; days_left: number } => x !== null)
    .sort((a, b) => a.days_left - b.days_left);

  const interview_todo = applications
    .filter((a) => INTERVIEW_UNLOCK_STATUSES.includes(a.status) && !interviewRepo.getByJob(a.job_id))
    .map((a) => {
      const job = jobRepo.get(a.job_id);
      return job ? { job, status_label: APPLICATION_STATUS_LABELS[a.status] } : null;
    })
    .filter((x): x is { job: JobRecord; status_label: string } => x !== null);

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { today, followups, deadlines, interview_todo };
}
