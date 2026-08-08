import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'careermate-review-'));
process.env.CAREERMATE_DATA_DIR = tmp;
process.env.CAREERMATE_NO_OPEN = '1';

const {
  experienceRepo,
  projectRepo,
  jobRepo,
  fitRepo,
  provenanceRepo,
  interviewRetrospectiveRepo,
  getDb,
  closeDb,
} = await import('../packages/db/src/index.ts');
const { getDataHealthReport, getExplainableFitAnalysis } = await import('../packages/core/src/index.ts');
const { CAREERMATE_SYSTEM_PROMPT } = await import('../packages/prompts/src/system.ts');
const { toSafeToolError } = await import('../apps/mcp/src/safe-error.ts');
const { createBackup } = await import('../apps/web/src/settings.ts');

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
  ok('전역 지침은 전체 컨텍스트 강제 조회를 금지', CAREERMATE_SYSTEM_PROMPT.includes('전체 데이터를 습관적으로 불러오지 않습니다'));
  ok('전역 지침은 임의 저장을 금지', CAREERMATE_SYSTEM_PROMPT.includes('임의로 저장하지 않습니다'));
  ok('전역 지침은 파괴적 작업 확인을 요구', CAREERMATE_SYSTEM_PROMPT.includes('명시적 확인 후 실행'));

  const leaked = toSafeToolError(new Error('SQL failed at C:\\Users\\홍길동\\career.db: SELECT * FROM resumes WHERE content="secret"'));
  ok('알 수 없는 MCP 오류에서 내부 경로와 SQL 차단', !leaked.includes('Users') && !leaked.includes('SELECT') && !leaked.includes('secret'));
  ok('SQLite busy 오류를 재시도 가능 메시지로 변환', toSafeToolError(new Error('SQLITE_BUSY: database is locked')).includes('잠시 후 다시 시도'));
  ok('SQLite corrupt 오류를 복구 필요 메시지로 변환', toSafeToolError(new Error('SQLITE_CORRUPT')).includes('백업 복원'));

  const connectionSource = fs.readFileSync(new URL('../packages/db/src/connection.ts', import.meta.url), 'utf8');
  const settingsSource = fs.readFileSync(new URL('../apps/web/src/settings.ts', import.meta.url), 'utf8');
  ok(
    'WAL 사용 중 메인 DB 파일만 복사하는 백업 fallback 금지',
    !connectionSource.includes('copyFileSync(getDbPath()') && !settingsSource.includes('copyFileSync(getDbPath()'),
  );

  const sidecarTables = new Set(
    (getDb()
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .all() as Array<{ name: string }>).map((row) => row.name),
  );
  ok('새 설치에서도 출처 테이블을 즉시 준비', sidecarTables.has('entity_provenance'));
  ok('새 설치에서도 면접 회고 테이블을 즉시 준비', sidecarTables.has('interview_retrospectives'));

  const exp = experienceRepo.add({
    company: '테스트회사',
    role: '개발자',
    start_date: '2025-12',
    end_date: '2025-01',
    is_current: true,
  });

  const backup = createBackup();
  ok('SQLite와 JSON 백업 쌍 생성', fs.existsSync(backup.backup_path) && fs.existsSync(backup.json_path));
  const snapshot = new DatabaseSync(backup.backup_path, { readOnly: true });
  try {
    const snapExp = snapshot.prepare(`SELECT company FROM experiences WHERE id=?`).get(exp.id) as
      | { company: string }
      | undefined;
    ok('WAL 활성 상태 백업에 최신 커밋 포함', snapExp?.company === '테스트회사');
    ok('백업 SQLite 무결성 검사', snapshot.prepare(`PRAGMA integrity_check`).get() !== undefined);
  } finally {
    snapshot.close();
  }

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

  const job = jobRepo.upsert({
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

  interviewRetrospectiveRepo.save({
    job_id: job.id,
    interview_round: '1차',
    questions: ['최근 프로젝트를 설명해 주세요.'],
  });
  ok('면접 회고 저장', interviewRetrospectiveRepo.listByJob(job.id).length === 1);
  jobRepo.remove(job.id);
  ok('공고 삭제 시 면접 회고 자동 정리', interviewRetrospectiveRepo.listByJob(job.id).length === 0);
} finally {
  closeDb();
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log(`\nREVIEW_VERDICT ${fail === 0 ? 'PASS' : 'FAIL'} (${pass} passed, ${fail} failed)`);
process.exitCode = fail === 0 ? 0 : 1;
