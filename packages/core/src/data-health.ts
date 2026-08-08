import {
  documentRepo,
  experienceRepo,
  projectRepo,
  jobRepo,
  fitRepo,
  applicationRepo,
} from '@careermate/db';

export interface DataHealthIssue {
  code: string;
  severity: 'info' | 'warning' | 'error';
  entity_type: string;
  entity_id?: string;
  message: string;
}

export interface DataHealthReport {
  score: number;
  checked_at: string;
  counts: Record<string, number>;
  issues: DataHealthIssue[];
}

function monthValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 12 + Number(m[2]);
}

function normalized(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function getDataHealthReport(now = new Date()): DataHealthReport {
  const experiences = experienceRepo.list();
  const projects = projectRepo.list();
  const documents = documentRepo.list();
  const jobs = jobRepo.list();
  const issues: DataHealthIssue[] = [];

  for (const exp of experiences) {
    const start = monthValue(exp.start_date);
    const end = monthValue(exp.end_date);
    if (start != null && end != null && end < start) {
      issues.push({
        code: 'experience_date_reversed',
        severity: 'error',
        entity_type: 'experience',
        entity_id: exp.id,
        message: `${exp.company} 경력의 종료일이 시작일보다 빠릅니다.`,
      });
    }
    if (exp.is_current && exp.end_date) {
      issues.push({
        code: 'current_experience_has_end_date',
        severity: 'warning',
        entity_type: 'experience',
        entity_id: exp.id,
        message: `${exp.company} 경력이 재직 중이지만 종료일이 입력돼 있습니다.`,
      });
    }
    if (!exp.role) {
      issues.push({
        code: 'experience_missing_role',
        severity: 'warning',
        entity_type: 'experience',
        entity_id: exp.id,
        message: `${exp.company} 경력에 직무/역할이 없습니다.`,
      });
    }
  }

  const seenProjects = new Map<string, string>();
  for (const project of projects) {
    const key = normalized(project.name);
    const duplicate = seenProjects.get(key);
    if (key && duplicate) {
      issues.push({
        code: 'duplicate_project_name',
        severity: 'warning',
        entity_type: 'project',
        entity_id: project.id,
        message: `같은 이름의 프로젝트가 중복돼 있습니다: ${project.name}`,
      });
    } else if (key) {
      seenProjects.set(key, project.id);
    }
    const start = monthValue(project.start_date);
    const end = monthValue(project.end_date);
    if (start != null && end != null && end < start) {
      issues.push({
        code: 'project_date_reversed',
        severity: 'error',
        entity_type: 'project',
        entity_id: project.id,
        message: `${project.name} 프로젝트의 종료일이 시작일보다 빠릅니다.`,
      });
    }
  }

  const primaryDocs = documents.filter((doc) => doc.is_primary);
  if (documents.length > 0 && primaryDocs.length === 0) {
    issues.push({
      code: 'missing_primary_document',
      severity: 'warning',
      entity_type: 'document',
      message: '대표 이력서 또는 경력기술서가 지정되지 않았습니다.',
    });
  }

  const nowDate = now.toISOString().slice(0, 10);
  let staleDrafts = 0;
  let jobsWithoutFit = 0;
  for (const job of jobs) {
    if (!fitRepo.getByJob(job.id)) jobsWithoutFit++;
    const app = applicationRepo.getByJob(job.id);
    if (app?.status === 'draft') {
      const updated = String(app.updated_at ?? '').slice(0, 10);
      if (updated && updated < nowDate) staleDrafts++;
    }
  }
  if (jobsWithoutFit > 0) {
    issues.push({
      code: 'jobs_without_fit_analysis',
      severity: 'info',
      entity_type: 'job',
      message: `적합도 분석이 없는 공고가 ${jobsWithoutFit}개 있습니다.`,
    });
  }
  if (staleDrafts > 0) {
    issues.push({
      code: 'stale_draft_applications',
      severity: 'info',
      entity_type: 'application',
      message: `후속 행동을 확인할 임시 지원 건이 ${staleDrafts}개 있습니다.`,
    });
  }

  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === 'error') return sum + 15;
    if (issue.severity === 'warning') return sum + 7;
    return sum + 2;
  }, 0);

  return {
    score: Math.max(0, 100 - penalty),
    checked_at: now.toISOString(),
    counts: {
      experiences: experiences.length,
      projects: projects.length,
      documents: documents.length,
      jobs: jobs.length,
      issues: issues.length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
    },
    issues,
  };
}
