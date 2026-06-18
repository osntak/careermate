/**
 * Application services — the write-side use-cases shared by the HTTP API and the
 * MCP server. Centralizing them here guarantees both interfaces behave
 * identically and that every meaningful change is recorded in the activity feed.
 *
 * PRIVACY RULE: activity summaries and logs may reference titles, companies and
 * positions, but MUST NEVER contain résumé or cover-letter body text.
 */
import {
  type JobInput,
  type JobRecord,
  type FitAnalysisInput,
  type FitAnalysisRecord,
  type CoverLetterVersionInput,
  type ApplicationStatus,
  type ApplicationRecord,
  type InterviewPrepInput,
  type InterviewPrepRecord,
  type DocumentInput,
  type DocumentRecord,
  type ProfileInput,
  type ProfileRecord,
  type ExperienceInput,
  type ExperienceRecord,
  type ProjectInput,
  type ProjectRecord,
  type SkillInput,
  type SkillRecord,
  APPLICATION_STATUS_LABELS,
  INTERVIEW_UNLOCK_STATUSES,
} from '@careermate/shared';
import {
  jobRepo,
  fitRepo,
  coverLetterRepo,
  applicationRepo,
  interviewRepo,
  documentRepo,
  profileRepo,
  experienceRepo,
  projectRepo,
  skillRepo,
  activityRepo,
  getVerifyStrict,
} from '@careermate/db';
import { lintArtifact, type VerifyCorpus, type LintReport } from './verify/index.ts';

/**
 * Collect the user's stored facts (zero-ai) in THREE separate scopes so the
 * verify engine can tier a claim's provenance:
 *  - documents:  the user's actual résumé/document TEXT (excl. AI-generated docs)
 *                — the strongest "user provided this" anchor → full support.
 *  - structured: experiences/projects/skills. CareerMate is MCP-first and the AI
 *                is the sole writer of these, so a number that lives ONLY here
 *                (and not in the document text) can't be verified → advisory.
 *                This de-silences the "fabricate a record then cite it" bypass.
 *  - job:        the posting (can't license an applicant's performance claim).
 */
export function collectVerifyCorpus(jobId?: string | null): VerifyCorpus {
  const documents: string[] = [];
  for (const d of documentRepo.list()) {
    if (d.source !== 'ai') documents.push(d.content); // exclude AI-written docs
  }
  const structured: string[] = [];
  for (const e of experienceRepo.list()) {
    structured.push([e.company, e.role, e.description, ...(e.achievements ?? []), ...(e.tech ?? [])].filter(Boolean).join('\n'));
  }
  for (const p of projectRepo.list()) {
    structured.push([p.name, p.description, ...(p.highlights ?? []), ...(p.tech ?? [])].filter(Boolean).join('\n'));
  }
  for (const s of skillRepo.list()) {
    structured.push([s.name, s.level, s.years != null ? `${s.years}년` : ''].filter(Boolean).join(' '));
  }
  const job = jobId ? jobRepo.get(jobId) : null;
  const jobText = job ? [job.description, ...(job.requirements ?? []), ...(job.keywords ?? [])].filter(Boolean).join('\n') : '';
  return { documents: documents.join('\n'), structured: structured.join('\n'), job: jobText };
}

/**
 * Read-only preview of the deterministic cover-letter checks (no save).
 * `strict` overrides the persisted mode for this one call (one-shot strict).
 */
export function previewCoverLetter(text: string, jobId?: string | null, strict?: boolean): LintReport {
  return lintArtifact('cover_letter', text, collectVerifyCorpus(jobId), {
    strict: strict ?? getVerifyStrict(),
  });
}

/* ----------------------------------------------------------------- Profile */

export function saveProfile(input: ProfileInput): ProfileRecord {
  const p = profileRepo.save(input);
  activityRepo.log('profile_updated', `프로필을 ${p.name ? `(${p.name}) ` : ''}저장했습니다.`, 'profile', p.id);
  return p;
}

/* ---------------------------------------------------------------- Resumes */

export function addResume(input: Omit<DocumentInput, 'kind'> & { kind?: DocumentInput['kind'] }): DocumentRecord {
  const doc = documentRepo.add({ ...input, kind: input.kind ?? 'resume' });
  activityRepo.log('resume_added', `${doc.title} 문서를 추가했습니다.`, 'document', doc.id);
  return doc;
}

/* ----------------------------------------------- Experiences / Projects / Skills */

// These structured-profile entities have no dedicated activity type; the dashboard
// logs them under 'profile_updated' (see apps/web routes), so the MCP path matches.
// Summaries carry only company/project/skill names — never résumé body text.

export function addExperience(input: ExperienceInput): ExperienceRecord {
  const exp = experienceRepo.add(input);
  activityRepo.log('profile_updated', `경력(${exp.company})을 추가했습니다.`, 'experience', exp.id);
  return exp;
}

export function addProject(input: ProjectInput): ProjectRecord {
  const prj = projectRepo.add(input);
  activityRepo.log('profile_updated', `프로젝트(${prj.name})를 추가했습니다.`, 'project', prj.id);
  return prj;
}

export function addSkill(input: SkillInput): SkillRecord {
  const skill = skillRepo.add(input);
  activityRepo.log('profile_updated', `기술(${skill.name})을 추가했습니다.`, 'skill', skill.id);
  return skill;
}

/* -------------------------------------------------------------------- Jobs */

/** Save (or update) a posting and make sure an application row tracks it. */
export function saveJobPosting(input: JobInput, id?: string): { job: JobRecord; application: ApplicationRecord } {
  const job = jobRepo.upsert(input, id);
  const application = applicationRepo.ensure(job.id, 'draft');
  activityRepo.log('job_saved', `${job.company} · ${job.position} 공고를 저장했습니다.`, 'job', job.id);
  return { job, application };
}

/* ------------------------------------------------------------ Fit analysis */

export function saveFitAnalysis(input: FitAnalysisInput): FitAnalysisRecord {
  const job = jobRepo.get(input.job_id);
  if (!job) throw new Error(`공고를 찾을 수 없습니다: ${input.job_id}. 먼저 save_job_posting으로 공고를 저장하세요.`);
  applicationRepo.ensure(job.id, 'draft');
  const fit = fitRepo.save(input);
  const scoreText = fit.score != null ? ` (적합도 ${fit.score}점)` : '';
  activityRepo.log('fit_analysis_saved', `${job.company} · ${job.position} 적합도 분석을 저장했습니다${scoreText}.`, 'fit_analysis', fit.id);
  return fit;
}

/* ----------------------------------------------------------- Cover letters */

export function saveCoverLetterVersion(input: CoverLetterVersionInput & { force?: boolean; strict?: boolean }) {
  // Deterministic save-gate: block suspected fabricated quantified claims (numbers
  // that don't trace to the user's stored facts) unless the caller forces it.
  // Style slop / job-sourced numbers are advisory only — they never block.
  // Strict mode (persisted, or one-shot via input.strict) also blocks numbers
  // backed only by structured records, not the user's résumé document.
  const strict = input.strict ?? getVerifyStrict();
  const verification = lintArtifact('cover_letter', input.content, collectVerifyCorpus(input.job_id), { strict });
  const forced = verification.blocking.length > 0 && input.force === true;
  if (verification.blocking.length > 0 && !forced) {
    const detail = verification.blocking.map((b) => `${b.label}: ${b.detail}`).join('; ');
    const strictHit = verification.blocking.some((b) => b.id === 'unverified_numbers_strict');
    const tail = strictHit
      ? `엄격 모드가 켜져 있어, 올린 이력서 본문에 없는 수치는 막힙니다. 이력서를 올리거나 엄격 모드를 끄거나, 의도한 값이면 force: true로 저장하세요.`
      : `이 수치는 저장된 경력·이력서·프로젝트에 없습니다. 원본 데이터의 실제 수치로 고치거나, 의도한 값이 맞다면 먼저 경력/프로젝트에 그 수치를 추가한 뒤 다시 저장하세요(그대로 저장하려면 force: true).`;
    throw new Error(`저장 전 자동 점검에서 막혔습니다 — ${detail}. ${tail}`);
  }
  const { coverLetter, version } = coverLetterRepo.addVersion({
    cover_letter_id: input.cover_letter_id,
    title: input.title,
    job_id: input.job_id ?? null,
    content: input.content,
    note: input.note,
    source: input.source ?? 'ai',
    set_current: input.set_current,
  });
  // Link the application to this cover letter when tied to a job.
  if (coverLetter.job_id) {
    const app = applicationRepo.getByJob(coverLetter.job_id);
    if (app && !app.cover_letter_id) {
      applicationRepo.upsert({ job_id: coverLetter.job_id, cover_letter_id: coverLetter.id });
    }
  }
  activityRepo.log(
    'cover_letter_version_saved',
    `${coverLetter.title} 자기소개서 v${version.version_no}를 저장했습니다.`,
    'cover_letter',
    coverLetter.id,
  );
  return { coverLetter, version, verification, forced };
}

/* ------------------------------------------------- Application status flow */

export interface StatusChangeResult {
  application: ApplicationRecord;
  job: JobRecord | null;
  interview_unlocked: boolean;
  hint: string | null;
}

export function updateApplicationStatus(
  jobId: string,
  status: ApplicationStatus,
  note?: string,
): StatusChangeResult {
  const job = jobRepo.get(jobId);
  if (!job) throw new Error(`공고를 찾을 수 없습니다: ${jobId}`);
  const application = applicationRepo.setStatus(jobId, status, note);
  activityRepo.log(
    'application_status_changed',
    `${job.company} · ${job.position} 상태를 '${APPLICATION_STATUS_LABELS[status]}'(으)로 변경했습니다.`,
    'application',
    application.id,
  );

  const interview_unlocked = INTERVIEW_UNLOCK_STATUSES.includes(status);
  const hasPrep = !!interviewRepo.getByJob(jobId);
  const hint =
    interview_unlocked && !hasPrep
      ? '서류 단계를 통과했어요. 이 공고 기준으로 예상 면접 질문과 1분 자기소개를 준비할까요? (save_interview_prep)'
      : null;

  return { application, job, interview_unlocked, hint };
}

/* --------------------------------------------------------- Interview prep */

export function saveInterviewPrep(input: InterviewPrepInput): InterviewPrepRecord {
  const job = jobRepo.get(input.job_id);
  if (!job) throw new Error(`공고를 찾을 수 없습니다: ${input.job_id}`);
  // Spec gate: interview prep is only allowed once the application has reached
  // 서류 합격(document_passed) or beyond. Enforce it server-side, not just in prompts.
  const app = applicationRepo.getByJob(job.id);
  if (!app || !INTERVIEW_UNLOCK_STATUSES.includes(app.status)) {
    const current = app ? APPLICATION_STATUS_LABELS[app.status] : '미지원';
    throw new Error(
      `면접 준비는 '서류 합격' 이상 상태에서만 저장할 수 있습니다. 현재 상태: '${current}'. 먼저 update_application_status로 상태를 올린 뒤 다시 시도하세요.`,
    );
  }
  const prep = interviewRepo.save(input);
  activityRepo.log('interview_prep_saved', `${job.company} · ${job.position} 면접 준비 자료를 저장했습니다.`, 'interview_prep', prep.id);
  return prep;
}
