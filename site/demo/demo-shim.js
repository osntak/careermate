// =============================================================================
// Demo shim — makes the CareerMate dashboard run with NO server.
//
// The real dashboard is a static SPA that talks to a local Node server over
// /api/*. Here we intercept window.fetch and serve everything from an in-memory
// DB seeded from seed.js. Writes mutate that DB (so editing the profile updates
// the home counts, etc.), but nothing is persisted — a page reload resets to the
// seed. Response shapes mirror apps/web/src/routes.ts exactly.
//
// This module is injected BEFORE app.js (see scripts/build-demo.mjs), so fetch is
// patched before any page code calls it.
// =============================================================================
import { buildSeed } from './seed.js';
import { buildSeedEn } from './seed.en.js';
import { t, getLang } from '/demo/i18n.js';

/* ------------------------------------------------------------- demo-only strings */
const DEMO_STR = {
  ko: {
    // timeline titles
    job_saved_title: '공고 등록',
    fit_title: '적합도 분석',
    cover_letter_title: '자기소개서 작성',
    interview_title: '면접 준비',
    // timeline summaries
    fit_summary: '종합 {{score}}점',
    interview_summary_one: '예상 질문 1개',
    interview_summary_other: '예상 질문 {{count}}개',
    // fallback titles
    deleted_document: '삭제된 문서',
    deleted_cover_letter: '삭제된 자기소개서',
    untitled: '제목 없음',
    // onboarding next_steps
    step_profile: '기본 프로필을 입력하세요 (이름, 한 줄 소개, 희망 직무).',
    step_resume: '이력서나 경력기술서를 추가하세요. 파일 내용을 붙여넣어도 됩니다.',
    step_experience: '주요 경력을 1개 이상 추가하면 적합도 분석 품질이 올라갑니다.',
    step_skills: '보유 기술스택을 정리해 두면 공고 매칭이 정확해집니다.',
    step_cover_letter: '기존 자기소개서가 있다면 추가해 두세요. AI가 문체를 학습합니다.',
    step_job: '관심 있는 채용공고 URL이나 내용을 AI에게 전달해 적합도 분석을 받아보세요.',
    step_all_done: '준비가 잘 되어 있어요. 새 공고를 분석하거나 자기소개서를 작성해 보세요.',
    // settings/info
    url_label: '데모 모드',
    data_dir: '데모 모드 — 브라우저 메모리에만 존재',
    db_path: '저장되지 않습니다 (새로고침 시 초기화)',
    demo_label: '데모',
    // activity log
    activity_backup_restored: '데모 백업 JSON을 가져왔습니다.',
    activity_profile_updated: '프로필을 업데이트했습니다.',
    activity_doc_added: '{{title}}을(를) 추가했습니다.',
    activity_cover_added: '{{title}} 자기소개서를 추가했습니다.',
    activity_cover_version: '{{title}} v{{version}}을(를) 저장했습니다.',
    activity_job_saved: '{{company}} 공고를 저장했습니다.',
    activity_interview_saved: '면접 준비 자료를 저장했습니다.',
    activity_fit_saved: '{{company}} 적합도 분석을 저장했습니다.',
    activity_status_changed: "{{company}} · {{position}} 상태를 '{{statusLabel}}'(으)로 변경했습니다.",
    activity_verify_mode: '자소서 점검을 {{mode}} 모드로 변경했습니다.',
    verify_strict_mode: '엄격',
    verify_default_mode: '기본',
    // errors
    err_job_not_found: '공고를 찾을 수 없습니다.',
    err_doc_not_found: '문서를 찾을 수 없습니다.',
    err_cover_not_found: '자기소개서를 찾을 수 없습니다.',
    err_item_not_found: '항목을 찾을 수 없습니다.',
    err_not_found: '요청한 항목을 찾을 수 없어요.',
    err_demo_error: '데모 처리 중 오류가 발생했습니다.',
    err_bad_backup: 'CareerMate 백업 JSON 형식이 아닙니다.',
    err_restore_confirm: '복원을 진행하려면 확인 값이 필요합니다.',
    err_reset_confirm: 'confirm 값이 올바르지 않습니다.',
    // backup/shortcuts
    backup_path: '데모 브라우저 메모리',
    backup_warning: '데모에서는 브라우저 메모리의 샘플 데이터만 바뀌며 실제 파일은 변경되지 않습니다.',
    shortcut_dir: '데모 모드 — 실제 폴더를 만들지 않습니다',
    shortcut_launcher: '실제 앱에서는 CareerMate 대시보드 바로가기가 생성됩니다',
    // submission channel suffix
    submitted_via: '{{channel}}로 제출',
    // hint after document pass
    hint_document_passed: '서류 단계를 통과했어요. 면접 질문과 자기소개를 준비해 보세요.',
    // export
    interview_export_title: '면접 준비',
    interview_export_filename: '면접준비.md',
    // demo bar
    bar_brand_title: 'CareerMate 소개로 돌아가기',
    bar_badge: '데모',
    bar_text: '샘플 데이터 미리보기 · 입력·수정은 저장되지 않아요',
    bar_theme_label: '테마 전환',
    bar_install: '설치하기',
    bar_back: '소개로 ←',
    foot_status: '데모 모드 · 저장 안 됨',
    foot_path: '브라우저 메모리 · 새로고침 시 초기화',
  },
  en: {
    // timeline titles
    job_saved_title: 'Posting added',
    fit_title: 'Fit analysis',
    cover_letter_title: 'Cover letter written',
    interview_title: 'Interview prep',
    // timeline summaries
    fit_summary: 'Overall {{score}}/100',
    interview_summary_one: '1 likely question',
    interview_summary_other: '{{count}} likely questions',
    // fallback titles
    deleted_document: 'Deleted document',
    deleted_cover_letter: 'Deleted cover letter',
    untitled: 'Untitled',
    // onboarding next_steps
    step_profile: 'Fill in your basic profile (name, headline, desired role).',
    step_resume: 'Add a resume or career description. You can paste the text directly.',
    step_experience: 'Adding at least one work experience improves fit analysis quality.',
    step_skills: 'List your skills so job matching is more accurate.',
    step_cover_letter: 'If you have an existing cover letter, add it — the AI learns your style.',
    step_job: 'Share a job posting URL or text with the AI to get a fit analysis.',
    step_all_done: "You're all set. Try analyzing a new posting or writing a cover letter.",
    // settings/info
    url_label: 'Demo mode',
    data_dir: 'Demo mode — browser memory only',
    db_path: 'Not saved (resets on refresh)',
    demo_label: 'Demo',
    // activity log
    activity_backup_restored: 'Demo backup JSON imported.',
    activity_profile_updated: 'Profile updated.',
    activity_doc_added: '{{title}} added.',
    activity_cover_added: '{{title}} cover letter added.',
    activity_cover_version: '{{title}} v{{version}} saved.',
    activity_job_saved: '{{company}} posting saved.',
    activity_interview_saved: 'Interview prep saved.',
    activity_fit_saved: '{{company}} fit analysis saved.',
    activity_status_changed: "{{company}} · {{position}} moved to '{{statusLabel}}'.",
    activity_verify_mode: 'Cover letter check switched to {{mode}} mode.',
    verify_strict_mode: 'strict',
    verify_default_mode: 'default',
    // errors
    err_job_not_found: 'Posting not found.',
    err_doc_not_found: 'Document not found.',
    err_cover_not_found: 'Cover letter not found.',
    err_item_not_found: 'Item not found.',
    err_not_found: 'The requested item could not be found.',
    err_demo_error: 'An error occurred while processing the demo request.',
    err_bad_backup: 'Not a valid CareerMate backup JSON.',
    err_restore_confirm: 'A confirmation value is required to proceed with the restore.',
    err_reset_confirm: 'The confirm value is incorrect.',
    // backup/shortcuts
    backup_path: 'Demo browser memory',
    backup_warning: 'In demo mode only the in-memory sample data changes — no real files are modified.',
    shortcut_dir: 'Demo mode — no real folder is created',
    shortcut_launcher: 'In the real app a CareerMate dashboard shortcut would be created here.',
    // submission channel suffix
    submitted_via: 'Submitted via {{channel}}',
    // hint after document pass
    hint_document_passed: "You passed the document screening. Start preparing interview questions and your self-introduction.",
    // export
    interview_export_title: 'Interview prep',
    interview_export_filename: 'interview-prep.md',
    // demo bar
    bar_brand_title: 'Back to CareerMate overview',
    bar_badge: 'Demo',
    bar_text: 'Sample data preview · changes are not saved',
    bar_theme_label: 'Toggle theme',
    bar_install: 'Install',
    bar_back: '← Overview',
    foot_status: 'Demo mode · not saved',
    foot_path: 'Browser memory · resets on refresh',
  },
};

/**
 * Resolve a demo-only string by key, with optional {{var}} interpolation.
 * Falls back to Korean if a key is missing in the active locale.
 */
const d = (k, vars) => {
  const lang = getLang();
  let s = (DEMO_STR[lang] || DEMO_STR.ko)[k] ?? DEMO_STR.ko[k] ?? k;
  return vars ? s.replace(/\{\{(\w+)\}\}/g, (_, n) => (vars[n] ?? '')) : s;
};

/** Pluralised interview question summary */
function interviewSummary(count) {
  if (getLang() === 'ko') {
    return d('interview_summary_other', { count });
  }
  return count === 1 ? d('interview_summary_one') : d('interview_summary_other', { count });
}

/* ------------------------------------------------------------- constants */
const BOARD_ORDER = ['draft', 'planned', 'applied', 'document_passed', 'interview', 'final_passed', 'on_hold', 'rejected'];
const INTERVIEW_UNLOCK = ['document_passed', 'interview', 'final_passed'];
const ACTIVE = ['draft', 'planned', 'applied', 'document_passed', 'interview'];

/* --------------------------------------------------------------- the DB */
let db = getLang() === 'en' ? buildSeedEn() : buildSeed();
let seq = 1000;
const nid = (p) => `${p}${++seq}`;
const nowIso = () => new Date().toISOString();
const clone = (v) => JSON.parse(JSON.stringify(v));

function logActivity(type, summary, entity_type = null, entity_id = null) {
  db.activities.unshift({ id: nid('ac'), type, entity_type, entity_id, summary, created_at: nowIso() });
}

function addTimeline(job_id, type, title, summary = null, payload = {}, occurred_at = null) {
  db.timeline = db.timeline || [];
  const ts = nowIso();
  const event = { id: nid('tl'), job_id, type, title, summary, payload, occurred_at: occurred_at || ts, created_at: ts };
  db.timeline.push(event);
  return event;
}

/* ------------------------------------------------------- derived helpers */
const appByJob = (jobId) => db.applications.find((a) => a.job_id === jobId) || null;
const fitByJob = (jobId) => db.fits.find((f) => f.job_id === jobId) || null;
const ivByJob = (jobId) => db.interviews.find((i) => i.job_id === jobId) || null;
const clByJob = (jobId) => db.coverLetters.filter((c) => c.job_id === jobId);
const timelineByJob = (jobId) => (db.timeline || []).filter((e) => e.job_id === jobId);

function jobWithMeta(job) {
  const app = appByJob(job.id);
  const fit = fitByJob(job.id);
  const status = app?.status ?? 'draft';
  return { ...job, status, status_label: t('status.' + status), fit_score: fit?.score ?? null };
}

function coverRef(cl, version = null, versionId = null) {
  const resolved = version || (cl.versions || []).find((v) => v.id === versionId || v.id === cl.current_version_id) || null;
  return {
    kind: 'cover_letter',
    id: cl.id,
    title: cl.title,
    version_id: resolved?.id || versionId || cl.current_version_id,
    version_no: resolved?.version_no || cl.version_count,
  };
}

function documentRef(doc) {
  return { kind: 'document', id: doc.id, title: doc.title, document_kind: doc.kind };
}

function submittedAtToOccurrence(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${value}T00:00:00.000Z` : null;
}

function documentRoute(doc) {
  return doc.kind === 'career_description' ? `/documents/career/${doc.id}` : `/documents/docs/${doc.id}`;
}

function enrichDocumentRef(ref) {
  if (!ref || typeof ref !== 'object') return ref;
  const doc = db.documents.find((doc) => doc.id === ref.id);
  return {
    ...ref,
    title: doc?.title || ref.title || d('deleted_document'),
    document_kind: doc?.kind || ref.document_kind || ref.kind || null,
    exists: !!doc,
    route: doc ? documentRoute(doc) : null,
  };
}

function enrichCoverRef(ref) {
  if (!ref || typeof ref !== 'object') return ref;
  const cl = db.coverLetters.find((c) => c.id === ref.id);
  return {
    ...ref,
    title: cl?.title || ref.title || d('deleted_cover_letter'),
    exists: !!cl,
    route: cl ? `/documents/cover/${cl.id}` : null,
  };
}

function enrichTimelinePayload(payload) {
  const out = payload && typeof payload === 'object' && !Array.isArray(payload) ? { ...payload } : {};
  if (out.cover_letter) out.cover_letter = enrichCoverRef(out.cover_letter);
  if (out.submission && typeof out.submission === 'object') {
    const submission = { ...out.submission };
    if (submission.cover_letter) submission.cover_letter = enrichCoverRef(submission.cover_letter);
    if (Array.isArray(submission.documents)) submission.documents = submission.documents.map(enrichDocumentRef);
    out.submission = submission;
  }
  return out;
}

function buildTimeline(job) {
  const app = appByJob(job.id);
  const fit = fitByJob(job.id);
  const covers = clByJob(job.id);
  const interview = ivByJob(job.id);
  const stored = timelineByJob(job.id);
  const events = [
    { id: `synthetic-job-${job.id}`, job_id: job.id, type: 'job_saved', title: d('job_saved_title'), summary: `${job.company} · ${job.position}`, payload: { synthetic: true }, occurred_at: job.created_at, created_at: job.created_at },
    ...stored,
  ];
  const hasStored = (type, predicate) => stored.some((event) => event.type === type && (!predicate || predicate(enrichTimelinePayload(event.payload))));
  if (fit && !hasStored('fit_analysis_saved', (payload) => payload.fit_id === fit.id)) {
    events.push({ id: `synthetic-fit-${fit.id}`, job_id: job.id, type: 'fit_analysis_saved', title: d('fit_title'), summary: fit.score != null ? d('fit_summary', { score: fit.score }) : fit.summary, payload: { synthetic: true, fit_id: fit.id, score: fit.score }, occurred_at: fit.updated_at, created_at: fit.created_at });
  }
  for (const cl of covers) {
    const alreadyStored = hasStored('cover_letter_version_saved', (payload) => {
      const ref = payload.cover_letter && typeof payload.cover_letter === 'object' ? payload.cover_letter : null;
      return ref?.id === cl.id && (!cl.current_version_id || ref.version_id === cl.current_version_id);
    });
    if (!alreadyStored) {
      events.push({ id: `synthetic-cover-${cl.id}`, job_id: job.id, type: 'cover_letter_version_saved', title: d('cover_letter_title'), summary: `${cl.title}${cl.version_count ? ` v${cl.version_count}` : ''}`, payload: { synthetic: true, cover_letter: coverRef(cl) }, occurred_at: cl.updated_at, created_at: cl.created_at });
    }
  }
  if (app?.status && app.status !== 'draft' && !hasStored('application_status_changed', (payload) => payload.status === app.status)) {
    events.push({ id: `synthetic-status-${app.id}`, job_id: job.id, type: 'application_status_changed', title: t('status.' + app.status), summary: app.notes, payload: { synthetic: true, status: app.status, status_label: t('status.' + app.status), submission: null }, occurred_at: app.applied_at || app.updated_at, created_at: app.created_at });
  }
  if (interview && !hasStored('interview_prep_saved', (payload) => payload.interview_prep_id === interview.id)) {
    events.push({ id: `synthetic-interview-${interview.id}`, job_id: job.id, type: 'interview_prep_saved', title: d('interview_title'), summary: interview.questions.length ? interviewSummary(interview.questions.length) : interview.notes, payload: { synthetic: true, interview_prep_id: interview.id, question_count: interview.questions.length }, occurred_at: interview.updated_at, created_at: interview.created_at });
  }
  return events
    .sort((a, b) => String(a.occurred_at).localeCompare(String(b.occurred_at)) || String(a.created_at).localeCompare(String(b.created_at)))
    .map((event) => ({ ...event, payload: enrichTimelinePayload(event.payload) }));
}

function onboarding() {
  const p = db.profile;
  const has_profile = !!(p && p.name);
  const has_resume = db.documents.some((doc) => doc.kind === 'resume' || doc.kind === 'career_description');
  const has_cover_letter = db.coverLetters.length > 0;
  const has_experience = db.experiences.length > 0;
  const has_skills = db.skills.length > 0;
  const has_job = db.jobs.length > 0;
  const checks = p ? [
    !!p.name, !!(p.headline || p.summary), !!p.location, p.desired_roles.length > 0,
    !!p.desired_conditions, !!p.preferred_tone, p.emphasis_points.length > 0, p.links.length > 0,
    db.experiences.length > 0, db.skills.length > 0,
  ] : [];
  const completeness = p ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0;
  const completed = has_profile && (has_resume || has_experience);
  const next_steps = [];
  if (!has_profile) next_steps.push(d('step_profile'));
  if (!has_resume) next_steps.push(d('step_resume'));
  if (!has_experience) next_steps.push(d('step_experience'));
  if (!has_skills) next_steps.push(d('step_skills'));
  if (has_profile && !has_cover_letter) next_steps.push(d('step_cover_letter'));
  if (completed && !has_job) next_steps.push(d('step_job'));
  if (next_steps.length === 0) next_steps.push(d('step_all_done'));
  return { completed, has_profile, has_resume, has_cover_letter, has_experience, has_skills, has_job, profile_completeness: completeness, next_steps };
}

function homeSummary() {
  const apps = db.applications;
  const status_breakdown = BOARD_ORDER.map((status) => ({
    status, label: t('status.' + status), count: apps.filter((a) => a.status === status).length,
  }));
  const active = apps.filter((a) => ACTIVE.includes(a.status));
  const interview_todo = apps
    .filter((a) => INTERVIEW_UNLOCK.includes(a.status) && !ivByJob(a.job_id))
    .map((a) => { const job = db.jobs.find((j) => j.id === a.job_id); return job ? { job, status_label: t('status.' + a.status) } : null; })
    .filter(Boolean);
  return {
    onboarding: onboarding(),
    counts: {
      jobs: db.jobs.length,
      active_applications: active.length,
      cover_letters: db.coverLetters.length,
      interview_pending: interview_todo.length,
    },
    status_breakdown,
    recent_jobs: db.jobs.slice(0, 6).map(jobWithMeta),
    in_progress: active.slice(0, 6).map((application) => ({
      application, job: db.jobs.find((j) => j.id === application.job_id) || null, status_label: t('status.' + application.status),
    })),
    recent_cover_letters: db.coverLetters.slice(0, 5),
    interview_todo,
    recent_activity: db.activities.slice(0, 10),
  };
}

function jobDetail(jobId) {
  const job = db.jobs.find((j) => j.id === jobId);
  if (!job) return { __status: 404, error: d('err_job_not_found') };
  const related = db.jobs
    .filter((j) => j.id !== jobId && (j.company === job.company || j.position === job.position))
    .map(jobWithMeta);
  return {
    job: {
      ...jobWithMeta(job),
      application: appByJob(jobId),
      fit: fitByJob(jobId),
      cover_letters: clByJob(jobId),
      interview: ivByJob(jobId),
      related,
      timeline: buildTimeline(job),
    },
  };
}

function settingsInfo() {
  return {
    name: 'CareerMate', version: 'demo', port: 0, url: d('url_label'),
    demo: true,
    data_dir: d('data_dir'),
    db_path: d('db_path'),
    exports_dir: d('demo_label'), backups_dir: d('demo_label'), node_version: d('demo_label'),
    verify_strict: !!db.verify_strict,
    counts: {
      profile: db.profile ? 1 : 0, experiences: db.experiences.length, projects: db.projects.length,
      skills: db.skills.length, documents: db.documents.length, cover_letters: db.coverLetters.length,
      jobs: db.jobs.length, applications: db.applications.length, interview_preps: db.interviews.length,
      application_timeline_events: (db.timeline || []).length,
    },
  };
}

/* --------------------------------------------------- normalizers (input) */
// Mirror the *Input → *Record defaulting the server's repos perform.
function normProfile(input, base) {
  const b = base || {};
  return {
    id: 'p1', created_at: b.created_at || nowIso(), updated_at: nowIso(),
    name: input.name ?? b.name ?? null, email: input.email ?? b.email ?? null,
    phone: input.phone ?? b.phone ?? null, location: input.location ?? b.location ?? null,
    headline: input.headline ?? b.headline ?? null, summary: input.summary ?? b.summary ?? null,
    desired_roles: input.desired_roles ?? b.desired_roles ?? [],
    desired_conditions: input.desired_conditions ?? b.desired_conditions ?? null,
    preferred_tone: input.preferred_tone ?? b.preferred_tone ?? null,
    emphasis_points: input.emphasis_points ?? b.emphasis_points ?? [],
    links: input.links ?? b.links ?? [],
  };
}
const arr = (v) => (Array.isArray(v) ? v : []);

function backupTables() {
  return {
    profile: db.profile ? [db.profile] : [],
    experiences: db.experiences,
    projects: db.projects,
    skills: db.skills,
    documents: db.documents,
    jobs: db.jobs,
    cover_letters: db.coverLetters.map(({ versions, ...letter }) => letter),
    cover_letter_versions: db.coverLetters.flatMap((letter) => letter.versions || []),
    fit_analyses: db.fits,
    applications: db.applications,
    interview_preps: db.interviews,
    application_timeline_events: db.timeline || [],
    activities: db.activities,
  };
}

function demoBackup() {
  return { exported_at: nowIso(), version: 0, tables: backupTables() };
}

function previewBackup(backup) {
  if (!backup || typeof backup !== 'object' || !backup.tables || typeof backup.tables !== 'object') {
    return { __status: 400, error: d('err_bad_backup') };
  }
  const counts = {};
  let total_rows = 0;
  for (const [key, rows] of Object.entries(backup.tables)) {
    counts[key] = Array.isArray(rows) ? rows.length : 0;
    total_rows += counts[key];
  }
  return {
    exported_at: typeof backup.exported_at === 'string' ? backup.exported_at : null,
    version: Number.isFinite(Number(backup.version)) ? Number(backup.version) : 0,
    current_version: 0,
    counts,
    total_rows,
    warnings: [d('backup_warning')],
  };
}

function restoreDemoBackup(backup) {
  const preview = previewBackup(backup);
  if (preview.__status) return preview;
  const tables = backup.tables || {};
  const coverLetters = clone(tables.cover_letters || []);
  const versions = clone(tables.cover_letter_versions || []);
  for (const cl of coverLetters) {
    cl.versions = versions.filter((v) => v.cover_letter_id === cl.id);
    const current = cl.versions.find((v) => v.id === cl.current_version_id) || cl.versions.at(-1);
    cl.current_version_id = current?.id || null;
    cl.current_content = current?.content || null;
    cl.version_count = cl.versions.length;
  }
  db = {
    profile: clone(tables.profile?.[0] || null),
    experiences: clone(tables.experiences || []),
    projects: clone(tables.projects || []),
    skills: clone(tables.skills || []),
    documents: clone(tables.documents || []),
    jobs: clone(tables.jobs || []),
    coverLetters,
    fits: clone(tables.fit_analyses || []),
    applications: clone(tables.applications || []),
    interviews: clone(tables.interview_preps || []),
    timeline: clone(tables.application_timeline_events || []),
    activities: clone(tables.activities || []),
    backups: db.backups || [],
    verify_strict: !!db.verify_strict,
  };
  logActivity('profile_updated', d('activity_backup_restored'));
  return { ok: true, restored: previewBackup(demoBackup()) };
}

/* -------------------------------------------------------------- routes */
// Each: [method, RegExp on pathname, handler(params, body, query) -> data | {__status,error}]
const ROUTES = [
  ['GET', /^\/api\/health$/, () => ({ ok: true, ...settingsInfo() })],
  ['GET', /^\/api\/onboarding$/, () => onboarding()],
  ['GET', /^\/api\/summary$/, () => homeSummary()],
  ['GET', /^\/api\/activity$/, () => ({ activities: db.activities.slice(0, 30) })],
  ['GET', /^\/api\/meta$/, () => ({
    statuses: BOARD_ORDER.map((s) => ({ value: s, label: t('status.' + s) })),
    document_kinds: ['resume', 'career_description', 'portfolio', 'other'].map((value) => ({ value, label: t('kind.' + value) })),
  })],

  /* profile */
  ['GET', /^\/api\/profile$/, () => ({ profile: db.profile })],
  ['PUT', /^\/api\/profile$/, (_p, body) => {
    db.profile = normProfile(body, db.profile);
    logActivity('profile_updated', d('activity_profile_updated'), 'profile', 'p1');
    return { profile: db.profile };
  }],

  /* experiences / projects / skills share a CRUD shape */
  ...crud('experiences', 'experience', ['company', 'role', 'employment_type', 'start_date', 'end_date', 'is_current', 'description', 'achievements', 'tech', 'order_index']),
  ...crud('projects', 'project', ['name', 'role', 'description', 'highlights', 'tech', 'url', 'start_date', 'end_date', 'order_index']),
  ...crud('skills', 'skill', ['name', 'category', 'level', 'years', 'order_index']),

  /* documents */
  ['GET', /^\/api\/documents$/, (_p, _b, q) => {
    const kind = q.get('kind');
    return { documents: kind ? db.documents.filter((doc) => doc.kind === kind) : db.documents };
  }],
  ['POST', /^\/api\/documents$/, (_p, body) => {
    const doc = {
      id: nid('d'), created_at: nowIso(), updated_at: nowIso(),
      kind: body.kind || 'other', title: body.title || d('untitled'), content: body.content || '',
      source: body.source || 'manual', is_primary: !!body.is_primary, tags: arr(body.tags),
    };
    if (doc.is_primary) db.documents.forEach((x) => { if (x.kind === doc.kind) x.is_primary = false; });
    db.documents.unshift(doc);
    logActivity(doc.kind === 'resume' ? 'resume_added' : 'profile_updated', d('activity_doc_added', { title: doc.title }), 'document', doc.id);
    return { document: doc };
  }],
  ['GET', /^\/api\/documents\/([^/]+)$/, (p) => {
    const doc = db.documents.find((x) => x.id === p[0]);
    return doc ? { document: doc } : { __status: 404, error: d('err_doc_not_found') };
  }],
  ['PUT', /^\/api\/documents\/([^/]+)$/, (p, body) => {
    const doc = db.documents.find((x) => x.id === p[0]);
    if (!doc) return { __status: 404, error: d('err_doc_not_found') };
    Object.assign(doc, pick(body, ['kind', 'title', 'content', 'source', 'is_primary', 'tags']), { updated_at: nowIso() });
    return { document: doc };
  }],
  ['DELETE', /^\/api\/documents\/([^/]+)$/, (p) => remove(db.documents, p[0])],

  /* cover letters */
  ['GET', /^\/api\/cover-letters$/, () => ({ cover_letters: db.coverLetters })],
  ['POST', /^\/api\/cover-letters$/, (_p, body) => {
    const id = nid('c'); const ts = nowIso();
    const cl = {
      id, created_at: ts, updated_at: ts, title: body.title || d('untitled'), job_id: body.job_id ?? null,
      is_primary: !!body.is_primary, current_version_id: null, version_count: 0, current_content: null, versions: [],
    };
    if (body.content) addVersion(cl, body.content, body.note, body.source || 'manual');
    if (cl.is_primary) db.coverLetters.forEach((c) => { c.is_primary = false; });
    cl.is_primary = !!body.is_primary;
    db.coverLetters.unshift(cl);
    if (body.content && cl.job_id) {
      addTimeline(cl.job_id, 'cover_letter_version_saved', d('cover_letter_title'), `${cl.title} v${cl.version_count}`, { cover_letter: coverRef(cl) }, cl.updated_at);
    }
    logActivity('cover_letter_added', d('activity_cover_added', { title: cl.title }), 'cover_letter', id);
    return { cover_letter: cl };
  }],
  ['GET', /^\/api\/cover-letters\/([^/]+)$/, (p) => {
    const cl = db.coverLetters.find((c) => c.id === p[0]);
    return cl ? { cover_letter: cl } : { __status: 404, error: d('err_cover_not_found') };
  }],
  ['POST', /^\/api\/cover-letters\/([^/]+)\/versions$/, (p, body) => {
    const cl = db.coverLetters.find((c) => c.id === p[0]);
    if (!cl) return { __status: 404, error: d('err_cover_not_found') };
    const version = addVersion(cl, body.content, body.note, body.source || 'edit');
    if (cl.job_id) {
      addTimeline(cl.job_id, 'cover_letter_version_saved', d('cover_letter_title'), `${cl.title} v${version.version_no}`, { cover_letter: coverRef(cl, version) }, version.created_at);
    }
    logActivity('cover_letter_version_saved', d('activity_cover_version', { title: cl.title, version: version.version_no }), 'cover_letter', cl.id);
    return { cover_letter: cl, version };
  }],
  ['PUT', /^\/api\/cover-letters\/([^/]+)\/current-version$/, (p, body) => {
    const cl = db.coverLetters.find((c) => c.id === p[0]);
    if (!cl) return { __status: 404, error: d('err_cover_not_found') };
    const v = (cl.versions || []).find((x) => x.id === body.version_id);
    if (v) { cl.current_version_id = v.id; cl.current_content = v.content; cl.updated_at = nowIso(); }
    return { cover_letter: cl };
  }],
  ['PUT', /^\/api\/cover-letters\/([^/]+)\/primary$/, (p) => {
    const cl = db.coverLetters.find((c) => c.id === p[0]);
    if (!cl) return { __status: 404, error: d('err_cover_not_found') };
    db.coverLetters.forEach((c) => { c.is_primary = c.id === cl.id; });
    cl.updated_at = nowIso();
    return { cover_letter: cl };
  }],
  ['DELETE', /^\/api\/cover-letters\/([^/]+)$/, (p) => remove(db.coverLetters, p[0])],

  /* jobs */
  ['GET', /^\/api\/jobs$/, () => ({ jobs: db.jobs.map(jobWithMeta) })],
  ['POST', /^\/api\/jobs$/, (_p, body) => {
    const job = normJob(body);
    db.jobs.unshift(job);
    const application = { id: nid('a'), created_at: nowIso(), updated_at: nowIso(), job_id: job.id, status: 'draft', resume_id: null, cover_letter_id: null, applied_at: null, notes: null };
    db.applications.unshift(application);
    logActivity('job_saved', d('activity_job_saved', { company: job.company }), 'job', job.id);
    return { job: jobWithMeta(job), application };
  }],
  ['GET', /^\/api\/jobs\/([^/]+)\/interview$/, (p) => ({ interview: ivByJob(p[0]) })],
  ['PUT', /^\/api\/jobs\/([^/]+)\/interview$/, (p, body) => {
    let iv = ivByJob(p[0]);
    if (!iv) { iv = { id: nid('iv'), created_at: nowIso(), updated_at: nowIso(), job_id: p[0], questions: [], star_guides: [], self_introduction: null, notes: null }; db.interviews.unshift(iv); }
    Object.assign(iv, { questions: arr(body.questions), star_guides: arr(body.star_guides), self_introduction: body.self_introduction ?? iv.self_introduction, notes: body.notes ?? iv.notes, updated_at: nowIso() });
    logActivity('interview_prep_saved', d('activity_interview_saved'), 'interview_prep', iv.id);
    addTimeline(p[0], 'interview_prep_saved', d('interview_title'), iv.questions.length ? interviewSummary(iv.questions.length) : iv.notes, { interview_prep_id: iv.id, question_count: iv.questions.length }, iv.updated_at);
    return { interview: iv };
  }],
  ['PUT', /^\/api\/jobs\/([^/]+)\/fit$/, (p, body) => {
    const job = db.jobs.find((j) => j.id === p[0]);
    if (!job) return { __status: 404, error: d('err_job_not_found') };
    let fit = fitByJob(p[0]);
    if (!fit) { fit = { id: nid('f'), created_at: nowIso(), updated_at: nowIso(), job_id: p[0], score: null, summary: null, strengths: [], gaps: [], matched_keywords: [], missing_keywords: [], recommendations: [] }; db.fits.unshift(fit); }
    Object.assign(fit, pick(body, ['score', 'summary', 'strengths', 'gaps', 'matched_keywords', 'missing_keywords', 'recommendations']), { updated_at: nowIso() });
    logActivity('fit_analysis_saved', d('activity_fit_saved', { company: job.company }), 'fit_analysis', fit.id);
    addTimeline(p[0], 'fit_analysis_saved', d('fit_title'), fit.score != null ? d('fit_summary', { score: fit.score }) : fit.summary, { fit_id: fit.id, score: fit.score }, fit.updated_at);
    return { fit };
  }],
  ['GET', /^\/api\/jobs\/([^/]+)$/, (p) => jobDetail(p[0])],
  ['PUT', /^\/api\/jobs\/([^/]+)$/, (p, body) => {
    const job = db.jobs.find((j) => j.id === p[0]);
    if (!job) return { __status: 404, error: d('err_job_not_found') };
    Object.assign(job, pick(body, ['company', 'position', 'url', 'location', 'employment_type', 'description', 'requirements', 'keywords', 'deadline', 'source']), { updated_at: nowIso() });
    return { job: jobWithMeta(job) };
  }],
  ['DELETE', /^\/api\/jobs\/([^/]+)$/, (p) => {
    db.applications = db.applications.filter((a) => a.job_id !== p[0]);
    db.fits = db.fits.filter((f) => f.job_id !== p[0]);
    db.interviews = db.interviews.filter((i) => i.job_id !== p[0]);
    db.timeline = (db.timeline || []).filter((e) => e.job_id !== p[0]);
    return remove(db.jobs, p[0]);
  }],

  /* interview page */
  ['GET', /^\/api\/interview$/, () => {
    const preps = db.interviews.map((pp) => ({ ...pp, job: db.jobs.find((j) => j.id === pp.job_id) }));
    const eligible = db.applications
      .map((a) => ({ job: db.jobs.find((j) => j.id === a.job_id), status: a.status, status_label: t('status.' + a.status), has_prep: !!ivByJob(a.job_id) }))
      .filter((x) => x.job && (x.has_prep || INTERVIEW_UNLOCK.includes(x.status)));
    return { preps, eligible };
  }],

  /* applications */
  ['GET', /^\/api\/applications$/, () => ({
    applications: db.applications.map((a) => ({ ...a, status_label: t('status.' + a.status), job: db.jobs.find((j) => j.id === a.job_id), fit_score: fitByJob(a.job_id)?.score ?? null })),
    board_order: BOARD_ORDER,
  })],
  ['PUT', /^\/api\/applications\/([^/]+)\/status$/, (p, body) => {
    const job = db.jobs.find((j) => j.id === p[0]);
    if (!job) return { __status: 404, error: d('err_job_not_found') };
    let app = appByJob(p[0]);
    if (!app) { app = { id: nid('a'), created_at: nowIso(), updated_at: nowIso(), job_id: p[0], status: 'draft', resume_id: null, cover_letter_id: null, applied_at: null, notes: null }; db.applications.unshift(app); }
    const beforeStatus = app.status;
    app.status = body.status; app.updated_at = nowIso();
    if (body.note) app.notes = [app.notes, body.note].filter(Boolean).join('\n');
    const submittedDocs = arr(body.submission?.document_ids).map((id) => db.documents.find((x) => x.id === id)).filter(Boolean);
    const submittedCover = body.submission?.cover_letter_id ? db.coverLetters.find((c) => c.id === body.submission.cover_letter_id) : null;
    if (body.status === 'applied' && body.submission) {
      const resumeLike = submittedDocs.find((doc) => doc.kind === 'resume' || doc.kind === 'career_description') || submittedDocs[0] || null;
      if (resumeLike) app.resume_id = resumeLike.id;
      if (submittedCover) app.cover_letter_id = submittedCover.id;
      if (body.submission.submitted_at) app.applied_at = body.submission.submitted_at;
    }
    logActivity('application_status_changed', d('activity_status_changed', { company: job.company, position: job.position, statusLabel: t('status.' + body.status) }), 'application', app.id);
    const submittedAt = body.submission?.submitted_at || null;
    const channel = body.submission?.channel || null;
    addTimeline(p[0], 'application_status_changed', t('status.' + body.status), channel && body.status === 'applied' ? d('submitted_via', { channel }) : body.note || null, {
      from_status: beforeStatus,
      status: body.status,
      status_label: t('status.' + body.status),
      note: body.note || null,
      submission: body.submission ? {
        submitted_at: submittedAt,
        channel,
        cover_letter: submittedCover ? coverRef(submittedCover, null, body.submission.cover_letter_version_id) : null,
        documents: submittedDocs.map(documentRef),
      } : null,
    }, submittedAtToOccurrence(submittedAt));
    const interview_unlocked = INTERVIEW_UNLOCK.includes(body.status);
    return { application: app, job, interview_unlocked, hint: interview_unlocked && !ivByJob(p[0]) ? d('hint_document_passed') : null };
  }],
  ['PUT', /^\/api\/applications\/([^/]+)$/, (p, body) => {
    let app = appByJob(p[0]);
    if (!app) { app = { id: nid('a'), created_at: nowIso(), updated_at: nowIso(), job_id: p[0], status: 'draft', resume_id: null, cover_letter_id: null, applied_at: null, notes: null }; db.applications.unshift(app); }
    Object.assign(app, pick(body, ['status', 'resume_id', 'cover_letter_id', 'applied_at', 'notes']), { updated_at: nowIso() });
    return { application: app };
  }],

  /* settings */
  ['GET', /^\/api\/settings$/, () => ({ info: settingsInfo(), backups: db.backups || [] })],
  ['POST', /^\/api\/settings\/verify-mode$/, (_p, body) => {
    db.verify_strict = !!body.strict;
    logActivity('profile_updated', d('activity_verify_mode', { mode: db.verify_strict ? d('verify_strict_mode') : d('verify_default_mode') }));
    return { verify_strict: db.verify_strict };
  }],
  ['POST', /^\/api\/settings\/backup$/, () => {
    db.backups = db.backups || [];
    const b = { filename: `careermate-demo-${nowIso().replace(/[:.]/g, '-')}.json`, path: d('backup_path'), created_at: nowIso(), size: JSON.stringify(demoBackup()).length };
    db.backups.unshift(b);
    return b;
  }],
  ['POST', /^\/api\/settings\/dashboard-shortcut$/, () => ({
    shortcut: {
      shortcut_dir: d('shortcut_dir'),
      launcher_path: d('shortcut_launcher'),
    },
  })],
  ['POST', /^\/api\/settings\/import-preview$/, (_p, body) => {
    const preview = previewBackup(body.backup);
    return preview.__status ? preview : { preview };
  }],
  ['POST', /^\/api\/settings\/restore$/, (_p, body) => {
    if (body.confirm !== 'RESTORE') return { __status: 400, error: d('err_restore_confirm') };
    return restoreDemoBackup(body.backup);
  }],
  ['POST', /^\/api\/settings\/reset$/, (_p, body) => {
    if (body.confirm !== 'DELETE') return { __status: 400, error: d('err_reset_confirm') };
    db = getLang() === 'en' ? buildSeedEn() : buildSeed(); // demo "reset" = back to the seed
    return { ok: true };
  }],

  /* parse helper (deterministic, no AI) */
  ['POST', /^\/api\/parse\/job$/, (_p, body) => cleanPosting(body.raw || '')],
];

/* -------------------------------------------------- CRUD route factory */
function crud(coll, key, fields) {
  const re = new RegExp(`^/api/${coll}/([^/]+)$`);
  return [
    ['GET', new RegExp(`^/api/${coll}$`), () => ({ [coll]: db[coll] })],
    ['POST', new RegExp(`^/api/${coll}$`), (_p, body) => {
      const rec = { id: nid(key[0]), created_at: nowIso(), updated_at: nowIso(), ...defaults(fields), ...pick(body, fields) };
      db[coll].push(rec);
      return { [key]: rec };
    }],
    ['PUT', re, (p, body) => {
      const rec = db[coll].find((x) => x.id === p[0]);
      if (!rec) return { __status: 404, error: d('err_item_not_found') };
      Object.assign(rec, pick(body, fields), { updated_at: nowIso() });
      return { [key]: rec };
    }],
    ['DELETE', re, (p) => remove(db[coll], p[0])],
  ];
}
function defaults(fields) {
  const out = {};
  for (const f of fields) {
    if (['achievements', 'tech', 'highlights'].includes(f)) out[f] = [];
    else if (f === 'is_current') out[f] = false;
    else if (f === 'order_index') out[f] = 0;
    else out[f] = null;
  }
  return out;
}

/* ------------------------------------------------------------- helpers */
function pick(obj, fields) {
  const out = {};
  for (const f of fields) if (obj[f] !== undefined) out[f] = obj[f];
  return out;
}
function remove(coll, id) {
  const i = coll.findIndex((x) => x.id === id);
  if (i >= 0) coll.splice(i, 1);
  return { ok: i >= 0 };
}
function addVersion(cl, content, note, source) {
  cl.versions = cl.versions || [];
  const v = { id: nid('clv'), cover_letter_id: cl.id, version_no: cl.versions.length + 1, content, note: note ?? null, source: source || 'manual', created_at: nowIso() };
  cl.versions.push(v);
  cl.current_version_id = v.id; cl.current_content = content; cl.version_count = cl.versions.length; cl.updated_at = nowIso();
  return v;
}
function normJob(body) {
  return {
    id: nid('j'), created_at: nowIso(), updated_at: nowIso(),
    company: body.company || '', position: body.position || '', url: body.url ?? null,
    location: body.location ?? null, employment_type: body.employment_type ?? null,
    description: body.description ?? null, requirements: arr(body.requirements), keywords: arr(body.keywords),
    deadline: body.deadline ?? null, source: body.source ?? null,
  };
}
const TECH = ['Java', 'Spring', 'Kotlin', 'Node.js', 'TypeScript', 'Python', 'Go', 'Kafka', 'MySQL', 'PostgreSQL', 'Redis', 'Kubernetes', 'AWS', 'Docker', 'React', 'MSA'];
function cleanPosting(raw) {
  const text = String(raw).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
  const keywords = TECH.filter((t) => new RegExp(`\\b${t.replace(/[.+]/g, '\\$&')}\\b`, 'i').test(text));
  const out = { text, keywords };
  const m = text.match(/(?:마감|접수\s*마감)[^\d]*(\d{4}[.\-/]\d{1,2}[.\-/]\d{1,2})/);
  if (m) out.deadline = m[1].replace(/[.\/]/g, '-');
  return out;
}

/* ----------------------------------------------------- fetch interception */
const realFetch = window.fetch.bind(window);
function jsonResponse(data) {
  const status = data && data.__status ? data.__status : 200;
  const payload = data && data.__status ? { error: data.error } : data;
  return new Response(JSON.stringify(payload ?? {}), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

window.fetch = async function (input, init) {
  const url = typeof input === 'string' ? input : input.url;
  let pathname;
  try { pathname = new URL(url, location.href).pathname; } catch { return realFetch(input, init); }
  if (!pathname.startsWith('/api/')) return realFetch(input, init);

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const query = new URL(url, location.href).searchParams;
  let body = {};
  const rawBody = init?.body ?? (input instanceof Request ? null : null);
  if (rawBody) { try { body = JSON.parse(rawBody); } catch { body = {}; } }

  for (const [m, re, handler] of ROUTES) {
    if (m !== method) continue;
    const match = re.exec(pathname);
    if (!match) continue;
    try {
      const data = handler(match.slice(1), body, query);
      return jsonResponse(clone(data));
    } catch (e) {
      return jsonResponse({ __status: 500, error: e?.message || d('err_demo_error') });
    }
  }
  return jsonResponse({ __status: 404, error: d('err_not_found') });
};

/* ------------------------------------------ export-download interception */
// downloadUrl() builds an <a download href="/api/export/..."> and clicks it.
// That's a navigation, not fetch — so we catch the click and build the file
// from the in-memory DB instead.
function buildExport(pathname, query) {
  const fmt = (query.get('format') || 'md').toLowerCase();
  let m;
  if ((m = pathname.match(/^\/api\/export\/cover-letter\/([^/]+)$/))) {
    const cl = db.coverLetters.find((c) => c.id === m[1]);
    return cl ? { name: `${cl.title}.${fmt === 'html' ? 'html' : 'md'}`, content: wrap(fmt, cl.title, cl.current_content || '') } : null;
  }
  if ((m = pathname.match(/^\/api\/export\/document\/([^/]+)$/))) {
    const doc = db.documents.find((x) => x.id === m[1]);
    return doc ? { name: `${doc.title}.md`, content: doc.content || '' } : null;
  }
  if ((m = pathname.match(/^\/api\/export\/interview\/([^/]+)$/))) {
    const iv = ivByJob(m[1]); const job = db.jobs.find((j) => j.id === m[1]);
    if (!iv) return null;
    const exportTitle = d('interview_export_title');
    const lines = [`# ${exportTitle} — ${job ? job.company : ''}`, '', iv.self_introduction || '', '', ...(iv.questions || []).map((q) => `- ${q.question}`)];
    return { name: d('interview_export_filename'), content: wrap(fmt, exportTitle, lines.join('\n')) };
  }
  if (pathname === '/api/settings/export-all') {
    return { name: 'careermate-demo-export.json', content: JSON.stringify(demoBackup(), null, 2) };
  }
  return null;
}
function wrap(fmt, title, body) {
  if (fmt !== 'html') return body;
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><pre>${body.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</pre>`;
}
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[download]');
  if (!a) return;
  let pathname, query;
  try { const u = new URL(a.getAttribute('href'), location.href); pathname = u.pathname; query = u.searchParams; } catch { return; }
  if (!pathname.startsWith('/api/')) return;
  e.preventDefault();
  const file = buildExport(pathname, query);
  if (!file) return;
  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href; link.download = file.name;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}, true);

/* ----------------------------------------------------- theme (synced) */
// Both the marketing site and this demo share localStorage key 'careermate-theme'
// and the <html data-theme> attribute (same origin), so a choice on either side
// carries over. The pre-paint resolver is injected into <head> by build-demo.mjs;
// here we just wire the toggle button.
function effectiveTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t === 'light' || t === 'dark') return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
const SUN = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
function paintToggle(btn) {
  // Show the icon of the mode you'd switch TO.
  btn.innerHTML = effectiveTheme() === 'dark' ? SUN : MOON;
}

/* ------------------------------------------------------ demo top bar */
// A slim top bar that frames the page as a no-save preview and links back to the
// marketing site. Kept intentionally light so it doesn't compete with the
// dashboard's own sidebar/topbar navigation.
function installChrome() {
  if (document.getElementById('demo-bar')) return;
  const bar = document.createElement('div');
  bar.id = 'demo-bar';
  bar.innerHTML =
    `<a class="demo-bar__brand" href="/" title="${d('bar_brand_title')}">` +
      '<span class="demo-bar__logo" aria-hidden="true">C</span>' +
      '<span class="demo-bar__name">CareerMate</span>' +
      `<span class="demo-bar__badge">${d('bar_badge')}</span>` +
    '</a>' +
    `<span class="demo-bar__text">${d('bar_text')}</span>` +
    '<span class="demo-bar__spacer"></span>' +
    `<button class="demo-bar__icon" id="demo-theme" type="button" aria-label="${d('bar_theme_label')}" title="${d('bar_theme_label')}"></button>` +
    `<a class="demo-bar__link" href="/#install">${d('bar_install')}</a>` +
    `<a class="demo-bar__link demo-bar__link--primary" href="/">${d('bar_back')}</a>`;
  document.body.prepend(bar);
  document.body.classList.add('has-demo-bar');

  const toggle = bar.querySelector('#demo-theme');
  paintToggle(toggle);
  toggle.addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('careermate-theme', next); localStorage.removeItem('cf-theme'); } catch { /* ignore */ }
    paintToggle(toggle);
  });

  // Reframe the sidebar footer (it normally says "로컬에서 실행 중").
  const foot = document.getElementById('foot-status');
  if (foot) foot.textContent = d('foot_status');
  const footPath = document.getElementById('foot-path');
  if (footPath) footPath.textContent = d('foot_path');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installChrome);
else installChrome();
