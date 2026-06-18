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
  recent_activity: ActivityRecord[];
}

const ACTIVE: ApplicationStatus[] = ['draft', 'planned', 'applied', 'document_passed', 'interview'];

export function jobWithMeta(job: JobRecord): JobWithMeta {
  const app = applicationRepo.getByJob(job.id);
  const fit = fitRepo.getByJob(job.id);
  const status = app?.status ?? 'draft';
  return { ...job, status, status_label: APPLICATION_STATUS_LABELS[status], fit_score: fit?.score ?? null };
}

export function getHomeSummary(): HomeSummary {
  const onboarding = getOnboardingStatus();
  const jobs = jobRepo.list();
  const applications = applicationRepo.list();
  const coverLetters = coverLetterRepo.list();

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
    recent_activity: activityRepo.recent(10),
  };
}

export function listRecentActivity(limit = 20): ActivityRecord[] {
  return activityRepo.recent(limit);
}
