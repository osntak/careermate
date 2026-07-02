/**
 * Home dashboard summary + recent activity. Read-only aggregation that answers
 * "what should I do right now?" at a glance.
 */
import {
  type ApplicationStatus,
  APPLICATION_STATUS_LABELS,
  INTERVIEW_UNLOCK_STATUSES,
  REJECTED_STAGES,
  type RejectedStage,
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
  skillRepo,
  experienceRepo,
  projectRepo,
  timelineRepo,
  documentRepo,
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
  /** Upcoming hiring-schedule stages (면접·인적성·발표) within SCHEDULE_SOON_DAYS, date/time asc. */
  upcoming_schedule: { job: JobRecord; label: string; date: string; time?: string; d_day: number }[];
  recent_activity: ActivityRecord[];
}

const ACTIVE: ApplicationStatus[] = ['draft', 'planned', 'applied', 'document_passed', 'interview'];

// Deadline nudge applies only while the posting still needs action (not yet applied).
const DEADLINE_ACTIONABLE: ApplicationStatus[] = ['draft', 'planned'];
// Surface a deadline once it's within this many days (overdue items are always shown).
const DEADLINE_SOON_DAYS = 14;
// Surface a hiring-schedule stage (면접·인적성·발표) once it's within this many days (today = 0).
const SCHEDULE_SOON_DAYS = 7;
const DAY_MS = 86400000;

/**
 * Collect every future (today or later) schedule stage across all jobs, newest date last,
 * so both the home lane and the AG digest derive their views from one deterministic list.
 * Each item carries its D-day (0 = today). Sort: date asc, then time asc (timeless entries last).
 */
interface FutureScheduleItem {
  job: JobRecord;
  label: string;
  date: string;
  time?: string;
  d_day: number;
}
function collectFutureSchedule(jobs: JobRecord[], now: Date): FutureScheduleItem[] {
  const items: FutureScheduleItem[] = [];
  for (const job of jobs) {
    for (const s of job.schedule ?? []) {
      const d_day = daysUntilDate(s.date, now);
      if (d_day == null || d_day < 0) continue; // past stages drop off
      items.push({ job, label: s.label, date: s.date, time: s.time, d_day });
    }
  }
  return items.sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || '99:99').localeCompare(b.time || '99:99'),
  );
}

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

/**
 * Business days (Mon–Fri) elapsed strictly after an ISO timestamp's local date up
 * to `now`'s local date, inclusive of the end date. Weekends excluded; public
 * holidays are ignored (deterministic, no calendar dependency). Null if unparseable.
 * e.g. applied Friday → next Friday counts 5 business days (Mon…Fri).
 */
export function businessDaysSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const start = new Date(iso);
  if (isNaN(start.getTime())) return null;
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(now);
  e.setHours(0, 0, 0, 0);
  if (e.getTime() <= s.getTime()) return 0;
  let count = 0;
  const cursor = new Date(s);
  while (cursor.getTime() < e.getTime()) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
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

  // Follow-up nudges: applications sitting in 'applied' with no response. Gate on
  // BUSINESS days with the same predicate as getActionDigest (FOLLOWUP_DUE_BIZ_DAYS)
  // so Home and the AI digest surface a follow-up at the same moment; the displayed
  // days_since stays in calendar days.
  const followups = applications
    .filter((a) => a.status === 'applied')
    .map((a) => {
      const biz = businessDaysSince(a.applied_at, now);
      if (biz == null || biz < FOLLOWUP_DUE_BIZ_DAYS) return null;
      const days_since = daysSinceTimestamp(a.applied_at, now) ?? 0;
      const job = jobRepo.get(a.job_id);
      return job ? { job, days_since } : null;
    })
    .filter((x): x is { job: JobRecord; days_since: number } => x !== null)
    .sort((a, b) => b.days_since - a.days_since)
    .slice(0, 5);

  // Upcoming hiring-schedule stages within a week — same "what's next" lane as
  // interview prep / deadlines. Past stages already dropped in collectFutureSchedule.
  const upcoming_schedule = collectFutureSchedule(jobs, now)
    .filter((x) => x.d_day <= SCHEDULE_SOON_DAYS)
    .map((x) => ({ job: x.job, label: x.label, date: x.date, ...(x.time ? { time: x.time } : {}), d_day: x.d_day }))
    .slice(0, 6);

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
    upcoming_schedule,
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

// Deterministic follow-up timing for applied-but-silent postings (community
// research U-timing: "when should I follow up?" is the #1 job-seeker anxiety).
// Counted in business days from the apply date — the 5–7 day window is the widely
// advised sweet spot; earlier reads as pushy, later means the moment has passed.
const FOLLOWUP_DUE_BIZ_DAYS = 5; // 5–7 business days: prime window to follow up (once, politely)
const FOLLOWUP_OVERDUE_BIZ_DAYS = 8; // ≥8 business days: follow-up window has passed
const FOLLOWUP_ONHOLD_CAL_DAYS = 45; // ≥45 calendar days silent: suggest moving to on_hold

export interface FollowupItem {
  job: JobRecord;
  status: ApplicationStatus;
  status_label: string;
  days_since: number;
  reason: string;
  /** Business days since applying — present only for 'applied' items in the follow-up window. */
  business_days_since?: number;
  /** 'due' at 5–7 business days, 'overdue' at ≥8 — advisory nudge, not a hard rule. */
  followup_timing?: 'due' | 'overdue';
  /** ≥45 calendar days with no response: hint the AI to offer moving this to on_hold. */
  suggest_on_hold?: boolean;
}

/** One upcoming hiring-schedule stage the AI should flag (오늘~7일 내). */
export interface UpcomingScheduleItem {
  job_id: string;
  company: string;
  position: string;
  label: string;
  date: string;
  time?: string;
  /** Whole days until the stage (0 = today). */
  d_day: number;
}

/** Two or more DIFFERENT postings landing a stage on the same date — a scheduling collision. */
export interface ScheduleConflict {
  date: string;
  items: { job_id: string; company: string; position: string; label: string; time?: string }[];
}

export interface ActionDigest {
  /** Server's today (YYYY-MM-DD) — the AI can't reliably know the current date. */
  today: string;
  followups: FollowupItem[];
  deadlines: { job: JobRecord; status: ApplicationStatus; status_label: string; days_left: number }[];
  interview_todo: { job: JobRecord; status_label: string }[];
  /** Upcoming hiring-schedule stages within a week (면접·인적성·발표), date/time asc. */
  upcoming_schedule: UpcomingScheduleItem[];
  /** Same-date collisions among all future stages — surface so the user can resolve them. */
  schedule_conflicts: ScheduleConflict[];
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
      // Surface once the business-day follow-up window opens (≈5 business days),
      // regardless of the softer calendar-day home-lane threshold.
      const cal = daysSinceTimestamp(a.applied_at, now);
      const biz = businessDaysSince(a.applied_at, now);
      if (biz != null && biz >= FOLLOWUP_DUE_BIZ_DAYS) {
        const overdue = biz >= FOLLOWUP_OVERDUE_BIZ_DAYS;
        const item: FollowupItem = {
          job,
          status: a.status,
          status_label: APPLICATION_STATUS_LABELS[a.status],
          days_since: cal ?? 0,
          business_days_since: biz,
          followup_timing: overdue ? 'overdue' : 'due',
          reason: overdue
            ? `지원 후 ${biz}영업일 경과 — 후속 문의 적기가 지났습니다(무리한 독촉은 역효과이니 아직 안 했다면 정중히 1회만)`
            : `지원 후 ${biz}영업일 — 팔로업 적기(문의는 정중히 1회)`,
        };
        if (cal != null && cal >= FOLLOWUP_ONHOLD_CAL_DAYS) item.suggest_on_hold = true;
        followups.push(item);
      }
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

  // 전형 일정: 오늘~7일 내 다가오는 일정(D-day) + 같은 날짜 충돌(공고 무관). 충돌은 7일에 얽매이지
  // 않고 미래 전체에서 감지한다(다음 달 두 면접이 같은 날이면 미리 알려야 하므로).
  const futureSchedule = collectFutureSchedule(jobs, now);
  const upcoming_schedule: UpcomingScheduleItem[] = futureSchedule
    .filter((x) => x.d_day <= SCHEDULE_SOON_DAYS)
    .map((x) => ({
      job_id: x.job.id,
      company: x.job.company,
      position: x.job.position,
      label: x.label,
      ...(x.time ? { time: x.time } : {}),
      date: x.date,
      d_day: x.d_day,
    }));

  const byDate = new Map<string, FutureScheduleItem[]>();
  for (const x of futureSchedule) {
    const arr = byDate.get(x.date) ?? [];
    arr.push(x);
    byDate.set(x.date, arr);
  }
  const schedule_conflicts: ScheduleConflict[] = [];
  for (const [date, items] of byDate) {
    // A conflict means two DIFFERENT postings collide on one date. Multiple stages
    // of the SAME posting on a day (e.g. back-to-back rounds) is a normal itinerary,
    // not a clash — gate on distinct job_id ≥ 2.
    const distinctJobs = new Set(items.map((x) => x.job.id));
    if (distinctJobs.size < 2) continue;
    schedule_conflicts.push({
      date,
      items: items.map((x) => ({
        job_id: x.job.id,
        company: x.job.company,
        position: x.job.position,
        label: x.label,
        ...(x.time ? { time: x.time } : {}),
      })),
    });
  }
  schedule_conflicts.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { today, followups, deadlines, interview_todo, upcoming_schedule, schedule_conflicts };
}

/* ---------------------------------------------------------- job pre-screen */

// "Should I even bother reading this JD?" — community research U3: ~70% of postings
// prove unsuitable after reading. This is a CHEAP, DETERMINISTIC keyword-overlap
// signal (same philosophy as charcount: count, don't judge). The real fit analysis
// is still the AI's job via save_fit_analysis — this only pre-filters by which job
// keywords the user's stored skills/tech already cover.

const normToken = (s: string): string =>
  s.toLowerCase().trim().replace(/^[.,/()\s]+|[.,/()\s]+$/g, '');

// Résumé-body keyword match. A pure-ASCII tech token (java, ai, c#, node.js) must
// match only as a whole token — bounded by non-[a-z0-9] — so 'ai' does NOT hit
// 'email' nor 'java' 'javascript'. Non-ASCII tokens (Korean 결제) keep a substring
// test so '결제' still matches '결제시스템' (Korean has no ASCII word boundaries).
// Both `token` and `text` arrive lowercased; caller guards length ≥ 2.
const ASCII_TOKEN_RE = /^[a-z0-9+#.]+$/;
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function resumeBodyHasToken(text: string, token: string): boolean {
  if (!ASCII_TOKEN_RE.test(token)) return text.includes(token);
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(token)}(?![a-z0-9])`, 'i').test(text);
}

export interface JobPrescreen {
  job_id: string;
  job_keywords: string[];
  matched: string[];
  missing: string[];
  /** matched / total keywords (0..1); null when the job has no keywords to screen. */
  coverage: number | null;
  user_skill_count: number;
  /** Keywords found (case-insensitive) in the primary résumé body text. */
  resume_matched: string[];
  /** Union of structured-skill matches and résumé-body matches. */
  combined_matched: string[];
  /** combined_matched / total keywords (0..1); null when the job has no keywords. */
  combined_coverage: number | null;
  /** False when no résumé exists to check the body against (combined == skills only). */
  resume_checked: boolean;
}

export function prescreenJob(jobId: string): JobPrescreen | null {
  const job = jobRepo.get(jobId);
  if (!job) return null;
  const userTokens = new Set<string>();
  for (const s of skillRepo.list()) if (s.name) userTokens.add(normToken(s.name));
  for (const e of experienceRepo.list()) for (const t of e.tech ?? []) userTokens.add(normToken(t));
  for (const p of projectRepo.list()) for (const t of p.tech ?? []) userTokens.add(normToken(t));
  userTokens.delete('');

  // Primary résumé (is_primary first, else most recent) body text for keyword matching.
  const resume = documentRepo.primary('resume');
  const resume_checked = resume != null;
  const resumeText = (resume?.content ?? '').toLowerCase();

  const keywords = (job.keywords ?? []).filter((k) => k && k.trim());
  const matched: string[] = [];
  const missing: string[] = [];
  const resume_matched: string[] = [];
  for (const kw of keywords) {
    const n = normToken(kw);
    const skillHit =
      userTokens.has(n) ||
      // substring match only for tokens ≥3 chars (avoid "c"/"r" matching everything).
      (n.length >= 3 && [...userTokens].some((u) => u.length >= 3 && (u.includes(n) || n.includes(u))));
    (skillHit ? matched : missing).push(kw);
    // Résumé-body match: keyword appears as a whole token in the résumé text (see
    // resumeBodyHasToken). Guard tokens ≥2 chars to avoid trivial short matches.
    if (resume_checked && n.length >= 2 && resumeBodyHasToken(resumeText, n)) resume_matched.push(kw);
  }
  const coverage = keywords.length ? matched.length / keywords.length : null;
  const combinedSet = new Set([...matched, ...resume_matched]);
  const combined_matched = keywords.filter((k) => combinedSet.has(k));
  const combined_coverage = keywords.length ? combined_matched.length / keywords.length : null;
  return {
    job_id: jobId,
    job_keywords: keywords,
    matched,
    missing,
    coverage,
    user_skill_count: userTokens.size,
    resume_matched,
    combined_matched,
    combined_coverage,
    resume_checked,
  };
}

/* ----------------------------------------------------------- pipeline stats */

// Application analytics (community U1: "what's my response rate?"). A TRUE
// ever-reached funnel, not a current-status snapshot: status transitions are
// logged to the timeline (application_status_changed events), so a job currently
// 'rejected' still counts toward the furthest stage it reached. Descriptive only
// — with small N these rates are not predictive; the tool surfaces that caveat.
const PROGRESSION: ApplicationStatus[] = ['applied', 'document_passed', 'interview', 'final_passed'];

export interface PipelineStats {
  total: number;
  /** Current-status snapshot (where each application sits right now). */
  by_status: { status: ApplicationStatus; label: string; count: number }[];
  /** Ever-reached counts (reconstructed from the status-change timeline). */
  funnel: { applied: number; document_passed: number; interview: number; final_passed: number };
  /** Pass-through rates relative to "ever applied" (percent, 1 d.p.); null when denominator is 0. */
  rates: { document_pass: number | null; interview: number | null; offer: number | null };
  outcomes: { final_passed: number; rejected: number; in_progress: number; on_hold: number };
  /** 탈락 회고: 현재 rejected인 지원 중 단계가 기록된 것의 단계별 건수(0인 단계는 생략). */
  rejected_by_stage: { stage: RejectedStage; count: number }[];
  /** rejected인데 단계 미기록 수 — 기록하면 어디서 떨어지는지 패턴이 드러난다. */
  rejected_unrecorded: number;
  note: string;
}

export function getPipelineStats(): PipelineStats {
  const applications = applicationRepo.list();
  const by_status = (Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((status) => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    count: applications.filter((a) => a.status === status).length,
  }));

  let appliedN = 0, docN = 0, intN = 0, offerN = 0;
  for (const a of applications) {
    const reached = new Set<string>([a.status]);
    if (a.applied_at) reached.add('applied');
    for (const e of timelineRepo.listByJob(a.job_id)) {
      if (e.type !== 'application_status_changed') continue;
      const p = (e.payload ?? {}) as { status?: string; from_status?: string };
      if (p.status) reached.add(p.status);
      if (p.from_status) reached.add(p.from_status);
    }
    let maxStage = -1;
    for (const s of reached) maxStage = Math.max(maxStage, PROGRESSION.indexOf(s as ApplicationStatus));
    if (maxStage >= 0) appliedN++;
    if (maxStage >= 1) docN++;
    if (maxStage >= 2) intN++;
    if (maxStage >= 3) offerN++;
  }

  const pct = (n: number, d: number): number | null => (d > 0 ? Math.round((n / d) * 1000) / 10 : null);
  const cur = (s: ApplicationStatus) => applications.filter((a) => a.status === s).length;

  // 탈락 회고: 현재 rejected인 지원만 대상으로 단계 분포를 센다. 단계 미기록(rejected_stage=null)은
  // 별도 카운트해, "미기록이 많으면 기록을 유도" 하는 신호로 쓴다.
  const rejectedApps = applications.filter((a) => a.status === 'rejected');
  const rejected_by_stage = REJECTED_STAGES.map((stage) => ({
    stage,
    count: rejectedApps.filter((a) => a.rejected_stage === stage).length,
  })).filter((s) => s.count > 0);
  const rejected_unrecorded = rejectedApps.filter((a) => !a.rejected_stage).length;

  return {
    total: applications.length,
    by_status,
    funnel: { applied: appliedN, document_passed: docN, interview: intN, final_passed: offerN },
    rates: { document_pass: pct(docN, appliedN), interview: pct(intN, appliedN), offer: pct(offerN, appliedN) },
    outcomes: {
      final_passed: cur('final_passed'),
      rejected: cur('rejected'),
      in_progress: cur('applied') + cur('document_passed') + cur('interview'),
      on_hold: cur('on_hold'),
    },
    rejected_by_stage,
    rejected_unrecorded,
    note:
      '단계별 도달 깔때기는 상태 변경 이력(타임라인)으로 복원한 실측치입니다(현재 rejected여도 거쳐간 최고 단계까지 집계). ' +
      '비율은 설명용이며 표본이 작으면 예측력이 낮습니다 — 추세 참고로만 쓰세요.',
  };
}
