import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'careermate-review-'));
process.env.CAREERMATE_DATA_DIR = tmp;
process.env.CAREERMATE_NO_OPEN = '1';

const {
  experienceRepo,
  projectRepo,
  jobRepo,
  fitRepo,
  provenanceRepo,
  closeDb,
} = await import('../packages/db/src/index.ts');
const { getDataHealthReport, getExplainableFitAnalysis } = await import('../packages/core/src/index.ts');

let pass = 0;
let fail = 0;
function ok(name: string, condition: boolean, detail = ''): void {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

try {
  const exp = experienceRepo.add({
    company: '테스트회사',
    role: '개발자',
    start_date: '2025-12',
    end_date: '2025-01',
    is_current: true,
  });
  projectRepo.add({ name: '중복 프로젝트' });
  projectRepo.add({ name: '중복 프로젝트', role: '프론트엔드' });

  const report = getDataHealthReport(new Date('2026-08-08T00:00:00.000Z'));
  ok(
    '경력 날짜 역전 감지',
    report.issues.some((issue) => issue.code === 'experience_date_reversed' && issue.entity_id === exp.id),
  );
  ok(
    '재직 중 종료일 모순 감지',
    report.issues.some((issue) => issue.code === 'current_experience_has_end_date'),
  );
  ok('중복 프로젝트 감지', report.issues.some((issue) => issue.code === 'duplicate_project_name'));
  ok('건강도 점수 감점', report.score < 100);

  const provenance = provenanceRepo.save({
    entity_type: 'experience',
    entity_id: exp.id,
    source: 'ai',
    source_excerpt: 'AI가 구조화한 테스트 경력',
  });
  ok('AI 출처 저장', provenance.source === 'ai' && !provenance.verified_by_human);
  ok('미확인 목록 노출', provenanceRepo.listUnverified().some((item) => item.entity_id === exp.id));
  const verified = provenanceRepo.setHumanVerified('experience', exp.id, true);
  ok('사람 확인 상태 저장', verified.verified_by_human && !!verified.verified_at);

  const job = jobRepo.add({
    company: '테스트회사',
    position: '프론트엔드 개발자',
    requirements: ['TypeScript', 'React', '테스트 자동화'],
    keywords: ['TypeScript', 'React', 'Playwright'],
  });
  fitRepo.save({
    job_id: job.id,
    score: 76,
    strengths: ['TypeScript 실무 경험', 'React 제품 개발'],
    gaps: ['대규모 접근성 개선 경험 부족'],
    matched_keywords: ['TypeScript', 'React'],
    missing_keywords: ['Playwright'],
    recommendations: ['테스트 자동화 경험을 구체적인 수치와 함께 보강'],
  });
  const explained = getExplainableFitAnalysis(job.id);
  ok('설명형 적합도 생성', explained?.overall_score === 76);
  ok('요구사항 충족률 계산', explained?.requirement_coverage === 67, String(explained?.requirement_coverage));
  ok('근거 강도 계산', (explained?.evidence_strength ?? 0) > 0);
  ok('위험·행동 제안 노출', !!explained?.risks.length && !!explained?.recommended_actions.length);
} finally {
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nREVIEW_VERDICT ${fail === 0 ? 'PASS' : 'FAIL'} (${pass} passed, ${fail} failed)`);
process.exitCode = fail === 0 ? 0 : 1;
