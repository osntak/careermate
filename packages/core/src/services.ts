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
  type ApplicationSubmission,
  type ApplicationRecord,
  type InterviewPrepInput,
  type InterviewPrepRecord,
  type DocumentInput,
  type DocumentRecord,
  type CoverLetterRecord,
  type CoverLetterVersionRecord,
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
  CareerMateError,
  notFound,
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
  timelineRepo,
  getVerifyStrict,
  tx,
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
  // Profile credentials (학점·어학·자격·수상) — so a cited GPA/score (3.8, TOEIC 920)
  // traces to stored data and isn't hard-blocked as fabricated. Structured-only ⇒ advisory.
  // Provenance matching is unit-keyed, and a purely numeric score is cited both bare
  // ("920") and with the 점 counter ("920점"); emit both forms so neither false-fires.
  const scoreForms = (s?: string): string =>
    s && /^\d+(\.\d+)?$/.test(s.trim()) ? `${s.trim()} ${s.trim()}점` : (s ?? '');
  const prof = profileRepo.get();
  if (prof) {
    for (const ed of prof.education) {
      const gpa = ed.gpa ? `학점 ${ed.gpa}${ed.gpa_scale ? `/${ed.gpa_scale}` : ''}` : '';
      structured.push([ed.school, ed.degree, ed.major, gpa, ed.status].filter(Boolean).join(' '));
    }
    for (const c of prof.certifications) structured.push([c.name, c.issuer, scoreForms(c.score)].filter(Boolean).join(' '));
    for (const l of prof.language_scores) structured.push(`${l.test} ${scoreForms(l.score)}`);
    for (const a of prof.awards) structured.push([a.title, a.issuer, a.description].filter(Boolean).join(' '));
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

/* ---------- Batch variants: add many in one call (idempotent upsert) ---------- */
// The MCP tools (add_experience/add_project/add_skill) accept an array so the AI
// can save everything extracted from a résumé in a single call instead of looping
// once per item. The repos dedupe by natural key (company+role+start / name) and
// merge non-destructively, so re-extracting the same data doesn't create dupes.
// One activity entry summarizes the whole batch (names only — never body text).

/** Truncated, name-only summary suffix for batch activity logs (privacy-safe). */
function batchNames(names: string[]): string {
  const shown = names.filter(Boolean).slice(0, 8).join(', ');
  if (!shown) return '';
  return `: ${shown}${names.length > 8 ? ' 외' : ''}`;
}

function coverLetterTimelineRef(
  coverLetter: CoverLetterRecord,
  version?: CoverLetterVersionRecord | null,
  requestedVersionId?: string | null,
) {
  const resolvedVersion =
    version ??
    coverLetter.versions?.find((v) => v.id === requestedVersionId || v.id === coverLetter.current_version_id) ??
    null;
  return {
    kind: 'cover_letter',
    id: coverLetter.id,
    title: coverLetter.title,
    version_id: resolvedVersion?.id ?? requestedVersionId ?? coverLetter.current_version_id,
    version_no: resolvedVersion?.version_no ?? coverLetter.version_count,
  };
}

function documentTimelineRef(doc: DocumentRecord) {
  return {
    kind: 'document',
    id: doc.id,
    title: doc.title,
    document_kind: doc.kind,
  };
}

function submittedAtToOccurrence(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return undefined;
}

export function addExperiences(inputs: ExperienceInput[]): {
  records: ExperienceRecord[];
  created: number;
  updated: number;
} {
  const res = experienceRepo.addMany(inputs);
  activityRepo.log(
    'profile_updated',
    `경력 ${res.records.length}건을 저장했습니다(신규 ${res.created} · 갱신 ${res.updated})${batchNames(res.records.map((e) => e.company))}.`,
    'experience',
    res.records[0]?.id,
  );
  return res;
}

export function addProjects(inputs: ProjectInput[]): {
  records: ProjectRecord[];
  created: number;
  updated: number;
} {
  const res = projectRepo.addMany(inputs);
  activityRepo.log(
    'profile_updated',
    `프로젝트 ${res.records.length}건을 저장했습니다(신규 ${res.created} · 갱신 ${res.updated})${batchNames(res.records.map((p) => p.name))}.`,
    'project',
    res.records[0]?.id,
  );
  return res;
}

export function addSkills(inputs: SkillInput[]): {
  records: SkillRecord[];
  created: number;
  updated: number;
} {
  const res = skillRepo.addMany(inputs);
  activityRepo.log(
    'profile_updated',
    `기술 ${res.records.length}개를 저장했습니다(신규 ${res.created} · 갱신 ${res.updated})${batchNames(res.records.map((s) => s.name))}.`,
    'skill',
    res.records[0]?.id,
  );
  return res;
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
  if (!job) throw notFound('공고를 찾을 수 없습니다. 먼저 공고를 저장한 뒤 다시 시도하세요.');
  applicationRepo.ensure(job.id, 'draft');
  const fit = fitRepo.save(input);
  const scoreText = fit.score != null ? ` (적합도 ${fit.score}점)` : '';
  activityRepo.log('fit_analysis_saved', `${job.company} · ${job.position} 적합도 분석을 저장했습니다${scoreText}.`, 'fit_analysis', fit.id);
  timelineRepo.add({
    job_id: job.id,
    type: 'fit_analysis_saved',
    title: '적합도 분석',
    summary: fit.score != null ? `종합 ${fit.score}점` : fit.summary ?? undefined,
    payload: {
      fit_id: fit.id,
      score: fit.score,
    },
    occurred_at: fit.updated_at,
  });
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
    throw new CareerMateError(`저장 전 자동 점검에서 막혔습니다 — ${detail}. ${tail}`, 400, 'save_gate');
  }
  const { coverLetter, version } = coverLetterRepo.addVersion({
    cover_letter_id: input.cover_letter_id,
    title: input.title,
    // Pass job_id through verbatim — do NOT coerce undefined→null here. addVersion
    // treats `undefined` as "leave the link alone" and `null` as "clear it"; the old
    // `?? null` wiped a cover letter's job link whenever a new version was saved
    // without re-specifying job_id (e.g. editing an existing letter).
    job_id: input.job_id,
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
    // Title already names the document (often ends in "자기소개서") — don't append the
    // word again or it doubles ("…자기소개서 자기소개서 v2"). Title + version is enough.
    `${coverLetter.title} v${version.version_no}를 저장했습니다.`,
    'cover_letter',
    coverLetter.id,
  );
  if (coverLetter.job_id) {
    timelineRepo.add({
      job_id: coverLetter.job_id,
      type: 'cover_letter_version_saved',
      title: '자기소개서 작성',
      summary: `${coverLetter.title} v${version.version_no}`,
      payload: {
        cover_letter: coverLetterTimelineRef(coverLetter, version),
      },
      occurred_at: version.created_at,
    });
  }
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
  submission?: ApplicationSubmission,
): StatusChangeResult {
  const job = jobRepo.get(jobId);
  if (!job) throw notFound('공고를 찾을 수 없습니다.');
  const before = applicationRepo.getByJob(jobId);
  // Status change, submission upsert, activity log, and timeline entry must land
  // together: if any write throws (e.g. a bad bind), roll back so we never leave
  // the status changed but the submission/timeline missing.
  const application = tx(() => {
    let application = applicationRepo.setStatus(jobId, status, note);
    const submittedDocs = (submission?.document_ids ?? [])
      .map((docId) => documentRepo.get(docId))
      .filter((doc): doc is DocumentRecord => !!doc);
    const submittedCoverLetter = submission?.cover_letter_id
      ? coverLetterRepo.get(submission.cover_letter_id, true)
      : null;
    if (status === 'applied' && submission) {
      const resumeLike =
        submittedDocs.find((doc) => doc.kind === 'resume' || doc.kind === 'career_description') ??
        submittedDocs[0] ??
        null;
      application = applicationRepo.upsert({
        job_id: jobId,
        resume_id: resumeLike?.id ?? application.resume_id ?? undefined,
        cover_letter_id: submittedCoverLetter?.id ?? application.cover_letter_id ?? undefined,
        applied_at: submission.submitted_at ?? application.applied_at ?? undefined,
      });
    }
    activityRepo.log(
      'application_status_changed',
      `${job.company} · ${job.position} 상태를 '${APPLICATION_STATUS_LABELS[status]}'(으)로 변경했습니다.`,
      'application',
      application.id,
    );
    const submittedAt = submission?.submitted_at?.trim();
    const channel = submission?.channel?.trim();
    const submissionPayload =
      submission && (submittedAt || channel || submittedCoverLetter || submittedDocs.length > 0)
        ? {
            submitted_at: submittedAt || null,
            channel: channel || null,
            cover_letter: submittedCoverLetter
              ? coverLetterTimelineRef(submittedCoverLetter, null, submission.cover_letter_version_id)
              : null,
            documents: submittedDocs.map(documentTimelineRef),
          }
        : null;
    timelineRepo.add({
      job_id: job.id,
      type: 'application_status_changed',
      title: APPLICATION_STATUS_LABELS[status],
      summary: channel && status === 'applied' ? `${channel}로 제출` : note ?? undefined,
      payload: {
        from_status: before?.status ?? null,
        status,
        status_label: APPLICATION_STATUS_LABELS[status],
        note: note ?? null,
        submission: submissionPayload,
      },
      occurred_at: submittedAtToOccurrence(submittedAt),
    });
    return application;
  });

  const interview_unlocked = INTERVIEW_UNLOCK_STATUSES.includes(status);
  const hasPrep = !!interviewRepo.getByJob(jobId);
  const hint =
    interview_unlocked && !hasPrep
      ? '서류 단계를 통과했어요. 이 공고 기준으로 예상 면접 질문과 1분 자기소개를 준비할까요?'
      : null;

  return { application, job, interview_unlocked, hint };
}

/* --------------------------------------------------------- Interview prep */

export function saveInterviewPrep(input: InterviewPrepInput): InterviewPrepRecord {
  const job = jobRepo.get(input.job_id);
  if (!job) throw notFound('공고를 찾을 수 없습니다.');
  // Interview prep can be drafted before a formal document pass. Status still
  // controls when the dashboard recommends it as a to-do, not whether it can be saved.
  const prep = interviewRepo.save(input);
  activityRepo.log('interview_prep_saved', `${job.company} · ${job.position} 면접 준비 자료를 저장했습니다.`, 'interview_prep', prep.id);
  timelineRepo.add({
    job_id: job.id,
    type: 'interview_prep_saved',
    title: '면접 준비',
    summary: prep.questions.length > 0 ? `예상 질문 ${prep.questions.length}개` : prep.notes ?? undefined,
    payload: {
      interview_prep_id: prep.id,
      question_count: prep.questions.length,
    },
    occurred_at: prep.updated_at,
  });
  return prep;
}
