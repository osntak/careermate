/**
 * @careermate/exporters — turn CareerMate records into downloadable documents.
 *
 * Every exporter returns an {@link ExportResult} (`{ filename, mimeType, content }`).
 * Markdown exporters emit `text/markdown`; HTML exporters emit a standalone,
 * print-optimized document (`text/html`) the user can "Print → Save as PDF".
 *
 * Filenames are slugified and ASCII-fallback safe; they carry NO timestamp —
 * the caller is expected to add one if desired.
 */
import type {
  CoverLetterRecord,
  DocumentRecord,
  ExperienceRecord,
  InterviewPrepRecord,
  JobRecord,
  ProfileRecord,
  ProjectRecord,
  SkillRecord,
} from '@careermate/shared';
import { DOCUMENT_KIND_LABELS } from '@careermate/shared';

import {
  bulletList,
  dateRange,
  joinBlocks,
  kv,
  slugify,
} from './markdown.ts';
import { escapeHtml, toPrintableHtml } from './html.ts';
import { markdownToDocx, DOCX_MIME } from './docx.ts';

/** The uniform shape every exporter returns. */
export interface ExportResult {
  /** Safe, slugified base filename including extension (no timestamp). */
  filename: string;
  /** MIME type, e.g. `text/markdown` or `text/html`. */
  mimeType: string;
  /**
   * The document body as text. For binary formats (`.docx`) this is a short,
   * human-readable note instead of the payload — write/stream {@link bytes}.
   */
  content: string;
  /**
   * Present only for binary formats (e.g. `.docx`). When set, callers MUST
   * write/stream these bytes rather than {@link content}.
   */
  bytes?: Uint8Array;
}

export type ExportOptions = {
  job?: JobRecord | null;
  profile?: ProfileRecord | null;
};

const MD_MIME = 'text/markdown';
const HTML_MIME = 'text/html';

/** Stand-in `content` for binary exports — the real payload rides in `bytes`. */
function docxNote(filename: string): string {
  return `(Word 문서로 저장됨: ${filename})`;
}

/**
 * Compose an export filename from slugged parts joined by `_`, then the
 * extension — e.g. `["토스 백엔드 자기소개서", "홍길동"]` → `토스_백엔드_자기소개서_홍길동.docx`.
 * Empty parts (no title, no owner name) drop out; if nothing survives, `fallback`
 * is used. The owner's name as the trailing part makes files self-identifying in
 * a downloads folder.
 */
function exportName(parts: (string | null | undefined)[], ext: string, fallback: string): string {
  const slug = parts.map((p) => slugify(p, '')).filter(Boolean).join('_') || fallback;
  return `${slug}.${ext}`;
}

/* ------------------------------------------------------------- cover letters */

/** Build the shared markdown body for a cover letter (used by MD + HTML). */
function coverLetterBody(cl: CoverLetterRecord, opts?: ExportOptions): string {
  const job = opts?.job ?? null;
  const profile = opts?.profile ?? null;

  const meta: string[] = [];
  if (profile?.name) meta.push(kv('지원자', profile.name));
  if (job) meta.push(kv('지원 회사', job.company), kv('지원 직무', job.position));

  const content = (cl.current_content ?? '').trim() || '_(내용 없음)_';

  return joinBlocks([
    `# ${cl.title}`,
    meta.length ? meta.filter(Boolean).join('\n\n') : '',
    meta.length ? '---' : '',
    content,
  ]);
}

/** Cover letter → Markdown. */
export function coverLetterToMarkdown(
  cl: CoverLetterRecord,
  opts?: ExportOptions,
): ExportResult {
  return {
    filename: exportName([cl.title, opts?.profile?.name], 'md', 'cover_letter'),
    mimeType: MD_MIME,
    content: coverLetterBody(cl, opts),
  };
}

/** Cover letter → standalone, print-optimized HTML (our PDF strategy). */
export function coverLetterToHtml(
  cl: CoverLetterRecord,
  opts?: ExportOptions,
): ExportResult {
  return {
    filename: exportName([cl.title, opts?.profile?.name], 'html', 'cover_letter'),
    mimeType: HTML_MIME,
    content: toPrintableHtml(cl.title, coverLetterBody(cl, opts)),
  };
}

/** Cover letter → Word (.docx), ATS-friendly single column. */
export async function coverLetterToDocx(
  cl: CoverLetterRecord,
  opts?: ExportOptions,
): Promise<ExportResult> {
  const filename = exportName([cl.title, opts?.profile?.name], 'docx', 'cover_letter');
  const bytes = await markdownToDocx(cl.title, coverLetterBody(cl, opts));
  return { filename, mimeType: DOCX_MIME, content: docxNote(filename), bytes };
}

/* -------------------------------------------------------------------- resume */

/** A stored resume/career document → Markdown. */
export function resumeToMarkdown(
  doc: DocumentRecord,
  profile?: ProfileRecord | null,
): ExportResult {
  const kindLabel = DOCUMENT_KIND_LABELS[doc.kind] ?? doc.kind;

  const header: string[] = [];
  if (profile?.name) header.push(kv('이름', profile.name));
  if (profile?.email) header.push(kv('이메일', profile.email));
  if (profile?.phone) header.push(kv('연락처', profile.phone));

  const body = joinBlocks([
    `# ${doc.title}`,
    `_${kindLabel}_`,
    header.length ? header.filter(Boolean).join('\n\n') : '',
    header.length ? '---' : '',
    (doc.content ?? '').trim() || '_(내용 없음)_',
  ]);

  return {
    filename: exportName([doc.title, profile?.name], 'md', doc.kind),
    mimeType: MD_MIME,
    content: body,
  };
}

/** A stored resume/career document → print-optimized HTML. */
export function resumeToHtml(
  doc: DocumentRecord,
  profile?: ProfileRecord | null,
): ExportResult {
  const md = resumeToMarkdown(doc, profile);
  return {
    filename: exportName([doc.title, profile?.name], 'html', doc.kind),
    mimeType: HTML_MIME,
    content: toPrintableHtml(doc.title, md.content),
  };
}

/** A stored resume/career document → Word (.docx). */
export async function resumeToDocx(
  doc: DocumentRecord,
  profile?: ProfileRecord | null,
): Promise<ExportResult> {
  const md = resumeToMarkdown(doc, profile);
  const filename = exportName([doc.title, profile?.name], 'docx', doc.kind);
  const bytes = await markdownToDocx(doc.title, md.content);
  return { filename, mimeType: DOCX_MIME, content: docxNote(filename), bytes };
}

/* ------------------------------------------------------------------- profile */

/** Full resume-style profile export → Markdown. */
export function profileToMarkdown(
  profile: ProfileRecord,
  experiences: ExperienceRecord[] = [],
  projects: ProjectRecord[] = [],
  skills: SkillRecord[] = [],
): ExportResult {
  const name = profile.name?.trim() || '이력서';

  // Header block.
  const contact: string[] = [];
  if (profile.email) contact.push(profile.email);
  if (profile.phone) contact.push(profile.phone);
  if (profile.location) contact.push(profile.location);
  const links = (profile.links ?? [])
    .filter((l) => l.url)
    .map((l) => `[${l.label || l.url}](${l.url})`);

  const headerBlocks = joinBlocks([
    `# ${name}`,
    profile.headline ? `## ${profile.headline}` : '',
    contact.length ? contact.join(' · ') : '',
    links.length ? links.join(' · ') : '',
  ]);

  // Summary.
  const summaryBlock = profile.summary?.trim()
    ? joinBlocks(['## 소개', profile.summary.trim()])
    : '';

  // Desired roles / conditions.
  const desiredLines: string[] = [];
  if (profile.desired_roles?.length) {
    desiredLines.push(kv('희망 직무', profile.desired_roles.join(', ')));
  }
  if (profile.desired_conditions?.trim()) {
    desiredLines.push(kv('희망 조건', profile.desired_conditions));
  }
  const desiredBlock = desiredLines.length
    ? joinBlocks(['## 희망 사항', desiredLines.filter(Boolean).join('\n\n')])
    : '';

  // Experience.
  const expBlocks = experiences.length
    ? joinBlocks([
        '## 경력',
        ...experiences.map((e) => {
          const range = dateRange(e.start_date, e.end_date, e.is_current);
          const titleParts = [e.company, e.role].filter(Boolean).join(' — ');
          const subParts = [e.employment_type, range].filter(Boolean).join(' · ');
          return joinBlocks([
            `### ${titleParts}`,
            subParts ? `_${subParts}_` : '',
            e.description?.trim() ? e.description.trim() : '',
            e.achievements?.length ? bulletList(e.achievements) : '',
            e.tech?.length ? kv('기술', e.tech.join(', ')) : '',
          ]);
        }),
      ])
    : '';

  // Projects.
  const projBlocks = projects.length
    ? joinBlocks([
        '## 프로젝트',
        ...projects.map((p) => {
          const range = dateRange(p.start_date, p.end_date);
          const subParts = [p.role, range].filter(Boolean).join(' · ');
          return joinBlocks([
            `### ${p.name}`,
            subParts ? `_${subParts}_` : '',
            p.description?.trim() ? p.description.trim() : '',
            p.highlights?.length ? bulletList(p.highlights) : '',
            p.tech?.length ? kv('기술', p.tech.join(', ')) : '',
            p.url ? kv('링크', p.url) : '',
          ]);
        }),
      ])
    : '';

  // Skills — grouped by category when present.
  let skillsBlock = '';
  if (skills.length) {
    const groups = new Map<string, string[]>();
    for (const s of skills) {
      const cat = s.category?.trim() || '기타';
      const label = s.level?.trim() ? `${s.name} (${s.level.trim()})` : s.name;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(label);
    }
    const lines = [...groups.entries()].map(
      ([cat, items]) => kv(cat, items.join(', ')),
    );
    skillsBlock = joinBlocks(['## 보유 기술', lines.filter(Boolean).join('\n\n')]);
  }

  const content = joinBlocks([
    headerBlocks,
    '---',
    summaryBlock,
    desiredBlock,
    expBlocks,
    projBlocks,
    skillsBlock,
  ]);

  return {
    filename: exportName(['프로필', profile.name], 'md', 'resume'),
    mimeType: MD_MIME,
    content,
  };
}

/** Full resume-style profile export → print-optimized HTML. */
export function profileToHtml(
  profile: ProfileRecord,
  experiences: ExperienceRecord[] = [],
  projects: ProjectRecord[] = [],
  skills: SkillRecord[] = [],
): ExportResult {
  const md = profileToMarkdown(profile, experiences, projects, skills);
  const title = profile.name?.trim() || '이력서';
  return {
    filename: exportName(['프로필', profile.name], 'html', 'resume'),
    mimeType: HTML_MIME,
    content: toPrintableHtml(title, md.content),
  };
}

/** Full resume-style profile export → Word (.docx). */
export async function profileToDocx(
  profile: ProfileRecord,
  experiences: ExperienceRecord[] = [],
  projects: ProjectRecord[] = [],
  skills: SkillRecord[] = [],
): Promise<ExportResult> {
  const md = profileToMarkdown(profile, experiences, projects, skills);
  const title = profile.name?.trim() || '이력서';
  const filename = exportName(['프로필', profile.name], 'docx', 'resume');
  const bytes = await markdownToDocx(title, md.content);
  return { filename, mimeType: DOCX_MIME, content: docxNote(filename), bytes };
}

/**
 * Full profile → JSON Resume (jsonresume.org, schema v1.0.0). Makes CareerMate
 * data portable: the open standard is consumed by 100+ themes (HTML/PDF render)
 * and other AI/ATS tools. Dates pass through as stored (YYYY-MM[-DD]); only
 * populated fields are emitted to keep the document clean.
 */
export function profileToJsonResume(
  profile: ProfileRecord,
  experiences: ExperienceRecord[] = [],
  projects: ProjectRecord[] = [],
  skills: SkillRecord[] = [],
): ExportResult {
  const clean = <T extends Record<string, unknown>>(o: T): T =>
    Object.fromEntries(
      Object.entries(o).filter(([, v]) => v != null && !(Array.isArray(v) && v.length === 0) && v !== ''),
    ) as T;

  const basics = clean({
    name: profile.name ?? '',
    label: profile.headline ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    summary: profile.summary ?? '',
    location: profile.location ? { address: profile.location } : undefined,
    profiles: (profile.links ?? [])
      .filter((l) => l.url)
      .map((l) => clean({ network: l.label ?? '', url: l.url })),
  });

  const work = experiences.map((e) =>
    clean({
      name: e.company ?? '',
      position: e.role ?? '',
      startDate: e.start_date ?? '',
      endDate: e.is_current ? '' : (e.end_date ?? ''),
      summary: e.description ?? '',
      highlights: e.achievements ?? [],
    }),
  );

  const projectsOut = projects.map((p) =>
    clean({
      name: p.name ?? '',
      description: p.description ?? '',
      highlights: p.highlights ?? [],
      keywords: p.tech ?? [],
      url: p.url ?? '',
      startDate: p.start_date ?? '',
      endDate: p.end_date ?? '',
      roles: p.role ? [p.role] : [],
    }),
  );

  const skillsOut = skills.map((s) => clean({ name: s.name, level: s.level ?? '' }));

  const resume = {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics,
    work,
    projects: projectsOut,
    skills: skillsOut,
    meta: { canonical: 'https://jsonresume.org', version: 'v1.0.0', generatedBy: 'CareerMate' },
  };

  return {
    filename: exportName(['프로필', profile.name], 'json', 'resume'),
    mimeType: 'application/json',
    content: JSON.stringify(resume, null, 2),
  };
}

/* ------------------------------------------------------------ interview prep */

/** Interview prep record → Markdown study sheet. */
export function interviewPrepToMarkdown(
  prep: InterviewPrepRecord,
  job?: JobRecord | null,
): ExportResult {
  const titleBase = job ? `${job.company} ${job.position} 면접 준비` : '면접 준비';

  const meta: string[] = [];
  if (job) {
    meta.push(kv('회사', job.company), kv('직무', job.position));
    if (job.deadline) meta.push(kv('마감', job.deadline));
  }

  const introBlock = prep.self_introduction?.trim()
    ? joinBlocks(['## 1분 자기소개', prep.self_introduction.trim()])
    : '';

  const renderQuestion = (q: InterviewPrepRecord['questions'][number], idx: number, level: string) =>
    joinBlocks([
      `${level} Q${idx + 1}. ${q.question}`,
      q.intent?.trim() ? kv('의도', q.intent) : '',
      q.answer_outline?.trim()
        ? joinBlocks(['**답변 가이드**', q.answer_outline.trim()])
        : '',
      q.followups?.length
        ? joinBlocks(['**예상 꼬리 질문**', bulletList(q.followups)])
        : '',
    ]);

  let questionsBlock = '';
  if (prep.questions?.length) {
    const technical = prep.questions.filter((q) => (q.category ?? 'technical') === 'technical');
    const behavioral = prep.questions.filter((q) => q.category === 'behavioral');
    // Split into 기술 / 인성·컬처핏 sub-sections only when both tracks are present;
    // a single-track sheet stays flat (backward-compatible output).
    questionsBlock = behavioral.length
      ? joinBlocks([
          '## 예상 질문',
          technical.length
            ? joinBlocks(['### 기술 면접', ...technical.map((q, i) => renderQuestion(q, i, '####'))])
            : '',
          joinBlocks(['### 인성·컬처핏 면접', ...behavioral.map((q, i) => renderQuestion(q, i, '####'))]),
        ])
      : joinBlocks(['## 예상 질문', ...prep.questions.map((q, i) => renderQuestion(q, i, '###'))]);
  }

  const starBlock = prep.star_guides?.length
    ? joinBlocks([
        '## STAR 정리',
        ...prep.star_guides.map((s) =>
          joinBlocks([
            `### ${s.question}`,
            kv('Situation', s.situation),
            kv('Task', s.task),
            kv('Action', s.action),
            kv('Result', s.result),
          ]),
        ),
      ])
    : '';

  const notesBlock = prep.notes?.trim()
    ? joinBlocks(['## 메모', prep.notes.trim()])
    : '';

  const content = joinBlocks([
    `# ${titleBase}`,
    meta.length ? meta.filter(Boolean).join('\n\n') : '',
    meta.length ? '---' : '',
    introBlock,
    questionsBlock,
    starBlock,
    notesBlock,
  ]);

  return {
    filename: exportName([titleBase], 'md', 'interview_prep'),
    mimeType: MD_MIME,
    content,
  };
}

/** Interview prep record → print-optimized HTML. */
export function interviewPrepToHtml(
  prep: InterviewPrepRecord,
  job?: JobRecord | null,
): ExportResult {
  const md = interviewPrepToMarkdown(prep, job);
  const title = job ? `${job.company} ${job.position} 면접 준비` : '면접 준비';
  return {
    filename: exportName([title], 'html', 'interview_prep'),
    mimeType: HTML_MIME,
    content: toPrintableHtml(title, md.content),
  };
}

/* ----------------------------------------------------------------- re-exports */

export {
  escapeHtml,
  toPrintableHtml,
} from './html.ts';
export {
  markdownToHtml,
  slugify,
} from './markdown.ts';
export { DOCX_MIME } from './docx.ts';
