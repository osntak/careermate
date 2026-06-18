/**
 * get_application_context — the single most important read path.
 *
 * In ONE call the AI gets everything it needs to analyze a posting or write a
 * cover letter: the user's profile, primary resume, experiences, projects,
 * skills, existing cover letters, recent applications, and — when a job_id is
 * given — the target job, its prior fit analysis, related history for the same
 * company/role, and the user's writing preferences.
 *
 * Designed so the AI never has to make five round-trips before doing real work.
 */
import { type ApplicationContext } from '@careermate/shared';
import {
  profileRepo,
  documentRepo,
  experienceRepo,
  projectRepo,
  skillRepo,
  coverLetterRepo,
  applicationRepo,
  jobRepo,
  fitRepo,
} from '@careermate/db';

export interface ApplicationContextOptions {
  /** Target job to focus the bundle around. */
  job_id?: string;
  /** Cap on recent applications returned (default 10). */
  recent_limit?: number;
}

export function getApplicationContext(opts: ApplicationContextOptions = {}): ApplicationContext {
  const profile = profileRepo.get();
  const resumes = documentRepo.list('resume');
  const primary_resume = documentRepo.primary('resume');
  const experiences = experienceRepo.list();
  const projects = projectRepo.list();
  const skills = skillRepo.list();
  const cover_letters = coverLetterRepo.list();
  const recent_applications = applicationRepo.recent(opts.recent_limit ?? 10);

  const job = opts.job_id ? jobRepo.get(opts.job_id) : null;
  const fit_analysis = opts.job_id ? fitRepo.getByJob(opts.job_id) : null;

  // Related history: prior postings at the same company or with a similar role,
  // with their application + fit so the AI can reuse angles and avoid repeats.
  let related_history: ApplicationContext['related_history'] = [];
  if (job) {
    const related = jobRepo.relatedTo(job.company, job.position, job.id);
    related_history = related.map((rj) => ({
      job: rj,
      application: applicationRepo.getByJob(rj.id),
      fit_analysis: fitRepo.getByJob(rj.id),
    }));
  }

  return {
    profile,
    primary_resume,
    resumes,
    experiences,
    projects,
    skills,
    cover_letters,
    recent_applications,
    job,
    fit_analysis,
    related_history,
    writing_preferences: {
      preferred_tone: profile?.preferred_tone ?? null,
      emphasis_points: profile?.emphasis_points ?? [],
    },
  };
}
