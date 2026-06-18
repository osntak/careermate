/**
 * REST API surface. Every endpoint mirrors a core use-case so the dashboard and
 * the MCP server stay in lockstep. Handlers return plain objects (serialized to
 * JSON by the server) or throw HttpError for clean failures.
 *
 * Body validation goes through zod schemas from @careermate/shared — nothing
 * untrusted reaches the DB unvalidated.
 */
import {
  ProfileInputSchema,
  ExperienceInputSchema,
  ProjectInputSchema,
  SkillInputSchema,
  DocumentInputSchema,
  CoverLetterInputSchema,
  CoverLetterVersionInputSchema,
  JobInputSchema,
  FitAnalysisInputSchema,
  ApplicationInputSchema,
  ApplicationStatusUpdateSchema,
  InterviewPrepInputSchema,
  APPLICATION_STATUS_LABELS,
  DOCUMENT_KIND_LABELS,
  APPLICATION_BOARD_ORDER,
  INTERVIEW_UNLOCK_STATUSES,
  type DocumentKind,
  type JobInput,
} from '@careermate/shared';
import {
  profileRepo,
  experienceRepo,
  projectRepo,
  skillRepo,
  documentRepo,
  coverLetterRepo,
  jobRepo,
  fitRepo,
  applicationRepo,
  interviewRepo,
  activityRepo,
} from '@careermate/db';
import {
  getOnboardingStatus,
  getApplicationContext,
  getHomeSummary,
  listRecentActivity,
  saveProfile,
  addResume,
  addExperience,
  addProject,
  addSkill,
  saveJobPosting,
  saveFitAnalysis,
  saveCoverLetterVersion,
  updateApplicationStatus,
  saveInterviewPrep,
  jobWithMeta,
} from '@careermate/core';
import { PROMPTS } from '@careermate/prompts';
import { WORKFLOWS } from '@careermate/workflows';
import { cleanJobPosting, extractText } from '@careermate/parsers';
import { z } from 'zod';
import { Router, HttpError, readJsonBody, type Ctx } from './http.ts';
import { exportCoverLetter, exportDocument, exportProfile, exportInterview, type ExportFormat } from './exports.ts';
import { getServerInfo } from './info.ts';
import { exportAll, createBackup, resetAll, listBackups } from './settings.ts';

function id(ctx: Ctx, key = 'id'): string {
  const v = ctx.params[key];
  if (!v) throw new HttpError(400, 'id가 필요합니다.');
  return v;
}

function fmt(ctx: Ctx): ExportFormat {
  const f = (ctx.query.get('format') ?? 'md').toLowerCase();
  return (['md', 'html', 'txt'].includes(f) ? f : 'md') as ExportFormat;
}

/** Assemble the full detail bundle for one job (used by the Jobs/Applications UI). */
function jobDetail(jobId: string) {
  const job = jobRepo.get(jobId);
  if (!job) throw new HttpError(404, '공고를 찾을 수 없습니다.');
  const application = applicationRepo.getByJob(jobId);
  const fit = fitRepo.getByJob(jobId);
  const cover_letters = coverLetterRepo.listByJob(jobId);
  const interview = interviewRepo.getByJob(jobId);
  const related = jobRepo.relatedTo(job.company, job.position, job.id).map(jobWithMeta);
  return {
    ...jobWithMeta(job),
    application,
    fit,
    cover_letters,
    interview,
    related,
  };
}

export function registerApiRoutes(router: Router): void {
  /* --------------------------------------------------------------- meta */
  router.get('/api/health', () => ({ ok: true, ...getServerInfo() }));
  router.get('/api/onboarding', () => getOnboardingStatus());
  router.get('/api/summary', () => getHomeSummary());
  router.get('/api/activity', (ctx) => {
    const raw = Number(ctx.query.get('limit'));
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : 30;
    return { activities: listRecentActivity(limit) };
  });
  router.get('/api/context', (ctx) =>
    getApplicationContext({ job_id: ctx.query.get('job_id') ?? undefined }),
  );
  router.get('/api/prompts', () => ({ prompts: PROMPTS }));
  router.get('/api/workflows', () => ({ workflows: WORKFLOWS }));
  router.get('/api/meta', () => ({
    statuses: APPLICATION_BOARD_ORDER.map((s) => ({ value: s, label: APPLICATION_STATUS_LABELS[s] })),
    document_kinds: Object.entries(DOCUMENT_KIND_LABELS).map(([value, label]) => ({ value, label })),
  }));

  /* ------------------------------------------------------------ profile */
  router.get('/api/profile', () => ({ profile: profileRepo.get() }));
  router.put('/api/profile', async (ctx) => {
    const input = await readJsonBody(ctx.req, ProfileInputSchema);
    return { profile: saveProfile(input) };
  });

  /* --------------------------------------------------------- experiences */
  router.get('/api/experiences', () => ({ experiences: experienceRepo.list() }));
  router.post('/api/experiences', async (ctx) => {
    const input = await readJsonBody(ctx.req, ExperienceInputSchema);
    return { experience: addExperience(input) };
  });
  router.put('/api/experiences/:id', async (ctx) => {
    const input = await readJsonBody(ctx.req, ExperienceInputSchema.partial());
    const exp = experienceRepo.update(id(ctx), input);
    if (!exp) throw new HttpError(404, '경력을 찾을 수 없습니다.');
    return { experience: exp };
  });
  router.delete('/api/experiences/:id', (ctx) => ({ ok: experienceRepo.remove(id(ctx)) }));

  /* ------------------------------------------------------------ projects */
  router.get('/api/projects', () => ({ projects: projectRepo.list() }));
  router.post('/api/projects', async (ctx) => {
    const input = await readJsonBody(ctx.req, ProjectInputSchema);
    return { project: addProject(input) };
  });
  router.put('/api/projects/:id', async (ctx) => {
    const input = await readJsonBody(ctx.req, ProjectInputSchema.partial());
    const prj = projectRepo.update(id(ctx), input);
    if (!prj) throw new HttpError(404, '프로젝트를 찾을 수 없습니다.');
    return { project: prj };
  });
  router.delete('/api/projects/:id', (ctx) => ({ ok: projectRepo.remove(id(ctx)) }));

  /* -------------------------------------------------------------- skills */
  router.get('/api/skills', () => ({ skills: skillRepo.list() }));
  router.post('/api/skills', async (ctx) => {
    const input = await readJsonBody(ctx.req, SkillInputSchema);
    return { skill: addSkill(input) };
  });
  router.put('/api/skills/:id', async (ctx) => {
    const input = await readJsonBody(ctx.req, SkillInputSchema.partial());
    const skill = skillRepo.update(id(ctx), input);
    if (!skill) throw new HttpError(404, '기술을 찾을 수 없습니다.');
    return { skill };
  });
  router.delete('/api/skills/:id', (ctx) => ({ ok: skillRepo.remove(id(ctx)) }));

  /* ----------------------------------------------------------- documents */
  router.get('/api/documents', (ctx) => {
    const kind = ctx.query.get('kind') as DocumentKind | null;
    return { documents: documentRepo.list(kind ?? undefined) };
  });
  router.post('/api/documents', async (ctx) => {
    const input = await readJsonBody(ctx.req, DocumentInputSchema);
    return { document: addResume(input) };
  });
  router.get('/api/documents/:id', (ctx) => {
    const doc = documentRepo.get(id(ctx));
    if (!doc) throw new HttpError(404, '문서를 찾을 수 없습니다.');
    return { document: doc };
  });
  router.put('/api/documents/:id', async (ctx) => {
    const input = await readJsonBody(ctx.req, DocumentInputSchema.partial());
    const doc = documentRepo.update(id(ctx), input);
    if (!doc) throw new HttpError(404, '문서를 찾을 수 없습니다.');
    return { document: doc };
  });
  router.delete('/api/documents/:id', (ctx) => ({ ok: documentRepo.remove(id(ctx)) }));

  /* ------------------------------------------------------- cover letters */
  router.get('/api/cover-letters', () => ({ cover_letters: coverLetterRepo.list() }));
  router.post('/api/cover-letters', async (ctx) => {
    const input = await readJsonBody(ctx.req, CoverLetterInputSchema);
    if (input.content) {
      // Dashboard = the user's own trusted edit surface; the deterministic
      // fabrication gate is advisory here (force) and enforced on the AI/MCP path.
      const { coverLetter } = saveCoverLetterVersion({
        title: input.title,
        job_id: input.job_id,
        content: input.content,
        note: input.note,
        source: input.source ?? 'manual',
        force: true,
      });
      if (input.is_primary) coverLetterRepo.setPrimary(coverLetter.id);
      activityRepo.log('cover_letter_added', `${coverLetter.title} 자기소개서를 추가했습니다.`, 'cover_letter', coverLetter.id);
      return { cover_letter: coverLetterRepo.get(coverLetter.id) };
    }
    const cl = coverLetterRepo.create({ title: input.title, job_id: input.job_id ?? null, is_primary: input.is_primary });
    activityRepo.log('cover_letter_added', `${cl.title} 자기소개서를 추가했습니다.`, 'cover_letter', cl.id);
    return { cover_letter: cl };
  });
  router.get('/api/cover-letters/:id', (ctx) => {
    const cl = coverLetterRepo.get(id(ctx), true);
    if (!cl) throw new HttpError(404, '자기소개서를 찾을 수 없습니다.');
    return { cover_letter: cl };
  });
  router.post('/api/cover-letters/:id/versions', async (ctx) => {
    const input = await readJsonBody(
      ctx.req,
      CoverLetterVersionInputSchema.omit({ cover_letter_id: true }),
    );
    // Dashboard edits are human-authored & self-vouched → advisory (force).
    const { coverLetter, version } = saveCoverLetterVersion({ ...input, cover_letter_id: id(ctx), force: true });
    return { cover_letter: coverLetter, version };
  });
  router.put('/api/cover-letters/:id/current-version', async (ctx) => {
    const { version_id } = await readJsonBody(ctx.req, z.object({ version_id: z.string() }));
    const cl = coverLetterRepo.setCurrentVersion(id(ctx), version_id);
    if (!cl) throw new HttpError(404, '자기소개서를 찾을 수 없습니다.');
    return { cover_letter: cl };
  });
  router.put('/api/cover-letters/:id/primary', (ctx) => {
    const cl = coverLetterRepo.setPrimary(id(ctx));
    if (!cl) throw new HttpError(404, '자기소개서를 찾을 수 없습니다.');
    return { cover_letter: cl };
  });
  router.delete('/api/cover-letters/:id', (ctx) => ({ ok: coverLetterRepo.remove(id(ctx)) }));

  /* ---------------------------------------------------------------- jobs */
  router.get('/api/jobs', () => ({ jobs: jobRepo.list().map(jobWithMeta) }));
  router.post('/api/jobs', async (ctx) => {
    const input = await readJsonBody(ctx.req, JobInputSchema);
    const { job, application } = saveJobPosting(input);
    return { job: jobWithMeta(job), application };
  });
  router.get('/api/jobs/:id', (ctx) => ({ job: jobDetail(id(ctx)) }));
  router.put('/api/jobs/:id', async (ctx) => {
    const input = await readJsonBody(ctx.req, JobInputSchema.partial());
    const jid = id(ctx);
    if (!jobRepo.get(jid)) throw new HttpError(404, '공고를 찾을 수 없습니다.');
    // upsert가 id로 기존 레코드와 병합하므로 누락 필드는 기존 값이 유지된다.
    // (존재를 위에서 확인했으므로 partial을 JobInput으로 좁혀 전달.)
    const job = jobRepo.upsert(input as JobInput, jid);
    return { job: jobWithMeta(job) };
  });
  router.delete('/api/jobs/:id', (ctx) => ({ ok: jobRepo.remove(id(ctx)) }));

  /* ----------------------------------------------------- fit / analysis */
  router.put('/api/jobs/:id/fit', async (ctx) => {
    const input = await readJsonBody(ctx.req, FitAnalysisInputSchema.omit({ job_id: true }));
    return { fit: saveFitAnalysis({ ...input, job_id: id(ctx) }) };
  });

  /* --------------------------------------------------------- interview */
  // All saved interview preps joined with their jobs, plus jobs eligible for prep
  // (status at/after 서류 합격) that don't have prep yet — powers the Interview page.
  router.get('/api/interview', () => {
    const preps = interviewRepo.list().map((p) => ({ ...p, job: jobRepo.get(p.job_id) }));
    const eligible = applicationRepo
      .list()
      .filter((a) => INTERVIEW_UNLOCK_STATUSES.includes(a.status))
      .map((a) => ({
        job: jobRepo.get(a.job_id),
        status: a.status,
        status_label: APPLICATION_STATUS_LABELS[a.status],
        has_prep: !!interviewRepo.getByJob(a.job_id),
      }))
      .filter((x) => x.job);
    return { preps, eligible };
  });
  router.get('/api/jobs/:id/interview', (ctx) => ({ interview: interviewRepo.getByJob(id(ctx)) }));
  router.put('/api/jobs/:id/interview', async (ctx) => {
    const input = await readJsonBody(ctx.req, InterviewPrepInputSchema.omit({ job_id: true }));
    return { interview: saveInterviewPrep({ ...input, job_id: id(ctx) }) };
  });

  /* ------------------------------------------------------- applications */
  router.get('/api/applications', () => {
    const apps = applicationRepo.list().map((a) => ({
      ...a,
      status_label: APPLICATION_STATUS_LABELS[a.status],
      job: jobRepo.get(a.job_id),
      fit_score: fitRepo.getByJob(a.job_id)?.score ?? null,
    }));
    return { applications: apps, board_order: APPLICATION_BOARD_ORDER };
  });
  router.put('/api/applications/:jobId/status', async (ctx) => {
    const body = await readJsonBody(ctx.req, ApplicationStatusUpdateSchema.omit({ job_id: true, application_id: true }));
    return updateApplicationStatus(id(ctx, 'jobId'), body.status, body.note);
  });
  router.put('/api/applications/:jobId', async (ctx) => {
    const body = await readJsonBody(ctx.req, ApplicationInputSchema.omit({ job_id: true }));
    return { application: applicationRepo.upsert({ ...body, job_id: id(ctx, 'jobId') }) };
  });

  /* ------------------------------------------------------------- export */
  router.get('/api/export/cover-letter/:id', (ctx) => download(exportCoverLetter(id(ctx), fmt(ctx))));
  router.get('/api/export/document/:id', (ctx) => download(exportDocument(id(ctx), fmt(ctx))));
  router.get('/api/export/profile', (ctx) => download(exportProfile(fmt(ctx))));
  router.get('/api/export/interview/:jobId', (ctx) => download(exportInterview(id(ctx, 'jobId'), fmt(ctx))));

  /* ----------------------------------------------------------- settings */
  router.get('/api/settings', () => ({
    info: getServerInfo(),
    backups: listBackups(),
  }));
  router.get('/api/settings/export-all', () =>
    download({
      filename: `careermate-backup-${new Date().toISOString().slice(0, 10)}.json`,
      mimeType: 'application/json; charset=utf-8',
      content: JSON.stringify(exportAll(), null, 2),
    }),
  );
  router.post('/api/settings/backup', () => createBackup());
  router.post('/api/settings/reset', async (ctx) => {
    const { confirm } = await readJsonBody(ctx.req, z.object({ confirm: z.string() }));
    const result = resetAll(confirm);
    if (!result.ok) throw new HttpError(400, '초기화를 진행하려면 confirm 값으로 "DELETE"를 보내야 합니다.');
    activityRepo.log('profile_updated', '모든 데이터를 초기화했습니다(백업 생성됨).');
    return result;
  });

  /* -------------------------------------------------------- parse helper */
  // Lets the dashboard pre-clean a pasted posting before saving (AI can do this
  // too, but the UI offers it for the manual "save a posting" path).
  router.post('/api/parse/job', async (ctx) => {
    const { raw } = await readJsonBody(ctx.req, z.object({ raw: z.string() }));
    return cleanJobPosting(raw);
  });
  router.post('/api/parse/text', async (ctx) => {
    const body = await readJsonBody(
      ctx.req,
      z.object({ filename: z.string().optional(), mimeType: z.string().optional(), content: z.string() }),
    );
    return extractText(body);
  });
}

/** Wrap an ExportResult so the server streams it as a file download instead of JSON. */
import type { ExportResult } from '@careermate/exporters';
export interface DownloadResponse {
  __download: ExportResult;
}
export function download(result: ExportResult): DownloadResponse {
  return { __download: result };
}
export function isDownload(v: unknown): v is DownloadResponse {
  return typeof v === 'object' && v !== null && '__download' in v;
}
