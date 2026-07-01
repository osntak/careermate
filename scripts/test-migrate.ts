/**
 * Migration tests for the SQLite schema runner (@careermate/db · migrate).
 * Run: node --no-warnings --experimental-sqlite --import tsx scripts/test-migrate.ts
 * Wired into `npm test` via scripts/run.mjs (which supplies the sqlite flag).
 *
 * Why (audit R22, gap-4): every other test creates a fresh mkdtemp DB, so
 * migrate() always runs with from=0 (full build). The path that actually runs on
 * EVERY user update — an incremental from>0 migration over a populated old-shape
 * DB — was never exercised. In a local-first app the DB is the user's only copy,
 * so a bad ALTER/rebuild in a future migration is a data-loss risk. This suite
 * stamps a v1 DB with real rows (valid + orphan) and asserts the v2 destructive
 * rebuild + v3 upgrade preserve data, repair orphans (CASCADE/SET NULL), and
 * leave a clean foreign_key_check.
 *
 * Pre-launch hardening additions (§3~5): the runner now applies each migration
 * in its own transaction with an immediate version stamp, skips ADD COLUMN when
 * the column already exists (self-heal of pre-hardening partial states), and
 * never stamps a newer-versioned DB downward. Those guarantees are locked here
 * with failure injection.
 *
 * Note: no fs.rmSync cleanup — Node 25/Windows hard-crashes on rmSync.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS, migrate } from '../packages/db/src/schema.ts';

let pass = 0,
  fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

const LATEST = MIGRATIONS.length; // v1..v7
const T = '2026-01-01T00:00:00.000Z';

function newDb(): DatabaseSync {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-migrate-'));
  const db = new DatabaseSync(path.join(tmp, 'test.db'));
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  return db;
}

console.log(`\n0) MIGRATIONS = ${LATEST}개 (v1..v7)`);
ok('MIGRATIONS 길이 7', LATEST === 7, String(LATEST));

console.log('\n1) 신규 설치 — from=0 전체 빌드');
{
  const db = newDb();
  const r = migrate(db);
  ok(`fresh → {from:0, to:${LATEST}}`, r.from === 0 && r.to === LATEST, JSON.stringify(r));
  const ver = (db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as { value: string }).value;
  ok(`schema_version 기록 = ${LATEST}`, ver === String(LATEST), ver);
  // v4 profile credential columns present, default '[]'.
  const pcols = (db.prepare(`PRAGMA table_info(profile)`).all() as { name: string }[]).map((c) => c.name);
  ok('v4 프로필 스펙 컬럼 4종 생성(education·certifications·language_scores·awards)',
    ['education', 'certifications', 'language_scores', 'awards'].every((c) => pcols.includes(c)), pcols.join(','));
  const jcols = (db.prepare(`PRAGMA table_info(jobs)`).all() as { name: string }[]).map((c) => c.name);
  ok('v5 공고 기업리서치 컬럼 3종 생성(company_overview·talent_profile·core_values)',
    ['company_overview', 'talent_profile', 'core_values'].every((c) => jcols.includes(c)), jcols.join(','));
  // idempotent re-run
  const r2 = migrate(db);
  ok(`재실행 멱등 → {from:${LATEST}, to:${LATEST}} (무변경)`, r2.from === LATEST && r2.to === LATEST, JSON.stringify(r2));
  db.close();
}

console.log('\n2) 업그레이드 from=1 — v1 구버전 DB에 실데이터 적재 후 마이그레이션');
{
  const db = newDb();
  // Stamp a v1-only schema (apply MIGRATIONS[0] alone) + schema_version=1.
  db.exec(MIGRATIONS[0]!);
  db.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  db.prepare(`INSERT INTO _meta (key,value) VALUES ('schema_version','1')`).run();

  // Old-shape rows: a kept job + valid children, plus orphans the v2 rebuild must repair.
  db.prepare(`INSERT INTO jobs (id,company,position,created_at,updated_at) VALUES (?,?,?,?,?)`).run('job-keep', '회사A', '데이터 분석가', T, T);
  // A v1 profile row (no spec columns yet) → v4 ALTER must add columns without losing it.
  db.prepare(`INSERT INTO profile (id,name,created_at,updated_at) VALUES ('singleton','홍길동',?,?)`).run(T, T);

  db.prepare(`INSERT INTO cover_letters (id,title,job_id,created_at,updated_at) VALUES (?,?,?,?,?)`).run('cl-keep', '자소서1', 'job-keep', T, T);
  // cover_letter whose job is gone → v2 SET-NULLs job_id but KEEPS the row.
  db.prepare(`INSERT INTO cover_letters (id,title,job_id,created_at,updated_at) VALUES (?,?,?,?,?)`).run('cl-orphanjob', '자소서-고아', 'job-gone', T, T);

  db.prepare(`INSERT INTO cover_letter_versions (id,cover_letter_id,version_no,content,created_at) VALUES (?,?,?,?,?)`).run('v-keep', 'cl-keep', 1, '본문 내용 보존 확인', T);
  // version whose parent letter is gone → v2 CASCADE-drops it.
  db.prepare(`INSERT INTO cover_letter_versions (id,cover_letter_id,version_no,content,created_at) VALUES (?,?,?,?,?)`).run('v-orphan', 'cl-gone', 1, '삭제되어야 함', T);
  // version under the job-orphaned (but existing) letter → must survive.
  db.prepare(`INSERT INTO cover_letter_versions (id,cover_letter_id,version_no,content,created_at) VALUES (?,?,?,?,?)`).run('v-orphanjob', 'cl-orphanjob', 1, '고아잡 자소서 본문', T);

  db.prepare(`INSERT INTO fit_analyses (id,job_id,score,created_at,updated_at) VALUES (?,?,?,?,?)`).run('fit-keep', 'job-keep', 88, T, T);
  // fit whose job is gone → v2 CASCADE-drops it.
  db.prepare(`INSERT INTO fit_analyses (id,job_id,score,created_at,updated_at) VALUES (?,?,?,?,?)`).run('fit-orphan', 'job-gone', 1, T, T);

  db.prepare(`INSERT INTO applications (id,job_id,status,created_at,updated_at) VALUES (?,?,?,?,?)`).run('app-keep', 'job-keep', 'applied', T, T);

  // --- the path under test: incremental from>0 migration ---
  const r = migrate(db);
  ok(`업그레이드 → {from:1, to:${LATEST}}`, r.from === 1 && r.to === LATEST, JSON.stringify(r));

  const cnt = (sql: string) => Number((db.prepare(sql).get() as { c: number }).c);

  ok('job-keep 보존', cnt(`SELECT COUNT(*) c FROM jobs WHERE id='job-keep'`) === 1);
  // v5 ALTER over a populated v1 jobs row: company + new research columns (core_values default []).
  const jobKeep = db.prepare(`SELECT company, core_values FROM jobs WHERE id='job-keep'`).get() as
    | { company: string; core_values: string }
    | undefined;
  ok('v1 공고 행 보존 + v5 기업리서치 컬럼 default [] 추가', !!jobKeep && jobKeep.company === '회사A' && jobKeep.core_values === '[]', JSON.stringify(jobKeep));
  // v4 ALTER over a populated v1 profile: row survives + new spec columns added with default '[]'.
  const prof = db.prepare(`SELECT name, education, language_scores FROM profile WHERE id='singleton'`).get() as
    | { name: string; education: string; language_scores: string }
    | undefined;
  ok('v1 프로필 행 보존 + v4 스펙 컬럼 default [] 추가', !!prof && prof.name === '홍길동' && prof.education === '[]' && prof.language_scores === '[]', JSON.stringify(prof));
  ok('cl-keep 보존(job_id=job-keep 유지)', cnt(`SELECT COUNT(*) c FROM cover_letters WHERE id='cl-keep' AND job_id='job-keep'`) === 1);

  const orphanJob = db.prepare(`SELECT job_id FROM cover_letters WHERE id='cl-orphanjob'`).get() as { job_id: string | null } | undefined;
  ok('cl-orphanjob 행 보존 + job_id는 NULL로 복구(SET NULL)', !!orphanJob && orphanJob.job_id === null, JSON.stringify(orphanJob));

  const vk = db.prepare(`SELECT content FROM cover_letter_versions WHERE id='v-keep'`).get() as { content: string } | undefined;
  ok('v-keep 보존 + 본문 내용 무손실', !!vk && vk.content === '본문 내용 보존 확인', JSON.stringify(vk));
  ok('v-orphan 삭제(부모 letter 없음 → CASCADE)', cnt(`SELECT COUNT(*) c FROM cover_letter_versions WHERE id='v-orphan'`) === 0);
  ok('v-orphanjob 보존(letter는 존재)', cnt(`SELECT COUNT(*) c FROM cover_letter_versions WHERE id='v-orphanjob'`) === 1);

  ok('fit-keep 보존', cnt(`SELECT COUNT(*) c FROM fit_analyses WHERE id='fit-keep'`) === 1);
  ok('fit-orphan 삭제(job 없음 → CASCADE)', cnt(`SELECT COUNT(*) c FROM fit_analyses WHERE id='fit-orphan'`) === 0);

  const app = db.prepare(`SELECT status FROM applications WHERE id='app-keep'`).get() as { status: string } | undefined;
  ok('app-keep 보존 + status=applied 무손실', !!app && app.status === 'applied', JSON.stringify(app));

  // v3 table present.
  const tbl = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='application_timeline_events'`).get();
  ok('v3 신규 테이블 application_timeline_events 생성', !!tbl);

  // FK integrity is clean after the rebuild.
  const fkViolations = db.prepare(`PRAGMA foreign_key_check`).all();
  ok('마이그레이션 후 foreign_key_check 위반 0건', fkViolations.length === 0, JSON.stringify(fkViolations));

  const ver = (db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as { value: string }).value;
  ok(`schema_version = ${LATEST} 기록`, ver === String(LATEST), ver);

  db.close();
}

console.log('\n3) 부분 실패 상태 자가치유 — 컬럼 일부만 적용된 채 버전 미기록(과거 러너 사고)');
{
  const db = newDb();
  // v1~v3까지 적용된 DB에서, v4가 절반(2/4 컬럼)만 적용되고 버전은 3에 머문 상태를 재현.
  db.exec(MIGRATIONS[0]!);
  db.exec(MIGRATIONS[1]!);
  db.exec(MIGRATIONS[2]!);
  db.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  db.prepare(`INSERT INTO _meta (key,value) VALUES ('schema_version','3')`).run();
  db.exec(`ALTER TABLE profile ADD COLUMN education TEXT NOT NULL DEFAULT '[]';`);
  db.exec(`ALTER TABLE profile ADD COLUMN certifications TEXT NOT NULL DEFAULT '[]';`);

  let threw = false;
  let r = { from: -1, to: -1 };
  try {
    r = migrate(db);
  } catch {
    threw = true;
  }
  ok('부분 적용 상태에서 migrate()가 throw하지 않음(duplicate column 자가치유)', !threw);
  ok(`복구 → {from:3, to:${LATEST}}`, r.from === 3 && r.to === LATEST, JSON.stringify(r));
  const pcols = (db.prepare(`PRAGMA table_info(profile)`).all() as { name: string }[]).map((c) => c.name);
  ok('기존 2컬럼 유지 + 누락 2컬럼(language_scores·awards) 추가 완료',
    ['education', 'certifications', 'language_scores', 'awards'].every((c) => pcols.includes(c)), pcols.join(','));
  const ver = (db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as { value: string }).value;
  ok(`schema_version = ${LATEST} 복구`, ver === String(LATEST), ver);
  db.close();
}

console.log('\n4) 마이그레이션 실패 시 성공분까지는 버전 기록(개별 트랜잭션) + 재개 멱등');
{
  // 끝에 고장난 마이그레이션을 임시로 붙여 중간 실패를 주입한다.
  MIGRATIONS.push(`CREATE TABLE broken (;`);
  const db = newDb();
  let threw = false;
  try {
    migrate(db);
  } catch {
    threw = true;
  }
  ok('고장난 마이그레이션에서 throw', threw);
  const ver = (db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as { value: string }).value;
  ok(`실패 이전 성공분(v${LATEST})까지 버전 기록 — 재부팅 크래시 루프 없음`, ver === String(LATEST), ver);

  // 고장 제거(=패치 배포 시나리오) 후 재실행: 성공분은 재실행하지 않고 이어간다.
  MIGRATIONS.pop();
  const r = migrate(db);
  ok(`재개 → {from:${LATEST}, to:${LATEST}} (성공분 재실행 없음)`, r.from === LATEST && r.to === LATEST, JSON.stringify(r));
  db.close();
}

console.log('\n5) 미래 버전 DB 가드 — 더 새 버전이 만든 DB를 다운스탬프하지 않음');
{
  const db = newDb();
  migrate(db);
  db.prepare(`UPDATE _meta SET value='99' WHERE key='schema_version'`).run();
  const r = migrate(db);
  ok('migrate() no-op → {from:99, to:99}', r.from === 99 && r.to === 99, JSON.stringify(r));
  const ver = (db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as { value: string }).value;
  ok('schema_version 99 유지(다운스탬프 없음)', ver === '99', ver);
  db.close();
}

console.log(`\nMIGRATE_VERDICT ${fail === 0 ? 'PASS' : 'FAIL'}  (pass=${pass} fail=${fail})`);
process.exit(fail === 0 ? 0 : 1);
