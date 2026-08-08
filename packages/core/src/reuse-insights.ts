import { coverLetterRepo, experienceRepo, projectRepo, jobRepo } from '@careermate/db';

export interface ReuseReference {
  kind: 'experience' | 'project';
  entity_id: string;
  label: string;
  cover_letters: Array<{ id: string; title: string; job_id: string | null; company: string | null; position: string | null }>;
  reuse_count: number;
}

export interface DiffLine {
  type: 'equal' | 'add' | 'remove';
  text: string;
}

function containsNormalized(content: string, needle: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const n = normalize(needle);
  return n.length >= 2 && normalize(content).includes(n);
}

export function getExperienceReuseMap(): ReuseReference[] {
  const letters = coverLetterRepo.list().map((letter) => coverLetterRepo.get(letter.id, true)!).filter(Boolean);
  const jobs = new Map(jobRepo.list().map((job) => [job.id, job]));
  const refs: ReuseReference[] = [];

  for (const exp of experienceRepo.list()) {
    const needles = [exp.company, exp.role].filter((v): v is string => !!v && v.trim().length >= 2);
    const matches = letters.filter((letter) => {
      const body = letter.current_content ?? '';
      return needles.some((needle) => containsNormalized(body, needle));
    });
    refs.push({
      kind: 'experience',
      entity_id: exp.id,
      label: [exp.company, exp.role].filter(Boolean).join(' · '),
      cover_letters: matches.map((letter) => {
        const job = letter.job_id ? jobs.get(letter.job_id) : null;
        return {
          id: letter.id,
          title: letter.title,
          job_id: letter.job_id,
          company: job?.company ?? null,
          position: job?.position ?? null,
        };
      }),
      reuse_count: matches.length,
    });
  }

  for (const project of projectRepo.list()) {
    const matches = letters.filter((letter) => containsNormalized(letter.current_content ?? '', project.name));
    refs.push({
      kind: 'project',
      entity_id: project.id,
      label: project.name,
      cover_letters: matches.map((letter) => {
        const job = letter.job_id ? jobs.get(letter.job_id) : null;
        return {
          id: letter.id,
          title: letter.title,
          job_id: letter.job_id,
          company: job?.company ?? null,
          position: job?.position ?? null,
        };
      }),
      reuse_count: matches.length,
    });
  }

  return refs.sort((a, b) => b.reuse_count - a.reuse_count || a.label.localeCompare(b.label));
}

export function diffText(before: string, after: string): DiffLine[] {
  const a = before.replace(/\r\n/g, '\n').split('\n');
  const b = after.replace(/\r\n/g, '\n').split('\n');
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => new Uint32Array(cols));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push({ type: 'equal', text: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      result.push({ type: 'remove', text: a[i]! });
      i++;
    } else {
      result.push({ type: 'add', text: b[j]! });
      j++;
    }
  }
  while (i < a.length) result.push({ type: 'remove', text: a[i++]! });
  while (j < b.length) result.push({ type: 'add', text: b[j++]! });
  return result;
}

export function diffCoverLetterVersions(coverLetterId: string, beforeVersionId: string, afterVersionId: string) {
  const letter = coverLetterRepo.get(coverLetterId, true);
  if (!letter?.versions) return null;
  const before = letter.versions.find((version) => version.id === beforeVersionId);
  const after = letter.versions.find((version) => version.id === afterVersionId);
  if (!before || !after) return null;
  const lines = diffText(before.content, after.content);
  return {
    cover_letter_id: coverLetterId,
    before: { id: before.id, version_no: before.version_no, source: before.source, created_at: before.created_at },
    after: { id: after.id, version_no: after.version_no, source: after.source, created_at: after.created_at },
    summary: {
      added: lines.filter((line) => line.type === 'add').length,
      removed: lines.filter((line) => line.type === 'remove').length,
      unchanged: lines.filter((line) => line.type === 'equal').length,
    },
    lines,
  };
}
