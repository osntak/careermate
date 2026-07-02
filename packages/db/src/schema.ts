/**
 * SQLite schema + lightweight migration runner.
 *
 * Migrations are an ordered list of SQL strings. The current version is tracked
 * in `_meta`. Applying is idempotent and safe to run on every process start, so
 * both the web server and the MCP server can call `migrate()` on boot and share
 * the same database file without coordination.
 *
 * Crash safety (this DB is the user's only copy):
 *  - Each migration runs in its own transaction and `schema_version` is stamped
 *    inside that same transaction, so a step either fully applies (including its
 *    version bump) or fully rolls back — a process death mid-upgrade can never
 *    leave "applied but unrecorded" work that re-throws on the next boot.
 *  - `ALTER TABLE … ADD COLUMN` statements are skipped when the column already
 *    exists (SQLite has no IF NOT EXISTS for columns), so a DB damaged by the
 *    pre-hardening runner self-heals instead of crash-looping on boot.
 *  - A DB stamped by a NEWER CareerMate is left untouched (never stamped down).
 */
import type { DatabaseSync } from 'node:sqlite';

export const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY,
    name TEXT, email TEXT, phone TEXT, location TEXT,
    headline TEXT, summary TEXT,
    desired_roles TEXT NOT NULL DEFAULT '[]',
    desired_conditions TEXT,
    preferred_tone TEXT,
    emphasis_points TEXT NOT NULL DEFAULT '[]',
    links TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS experiences (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    role TEXT,
    employment_type TEXT,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    achievements TEXT NOT NULL DEFAULT '[]',
    tech TEXT NOT NULL DEFAULT '[]',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    description TEXT,
    highlights TEXT NOT NULL DEFAULT '[]',
    tech TEXT NOT NULL DEFAULT '[]',
    url TEXT,
    start_date TEXT,
    end_date TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    level TEXT,
    years REAL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'manual',
    is_primary INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cover_letters (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    job_id TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    current_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cover_letter_versions (
    id TEXT PRIMARY KEY,
    cover_letter_id TEXT NOT NULL,
    version_no INTEGER NOT NULL,
    content TEXT NOT NULL,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'ai',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    url TEXT,
    location TEXT,
    employment_type TEXT,
    description TEXT,
    requirements TEXT NOT NULL DEFAULT '[]',
    keywords TEXT NOT NULL DEFAULT '[]',
    deadline TEXT,
    source TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS fit_analyses (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    score REAL,
    summary TEXT,
    strengths TEXT NOT NULL DEFAULT '[]',
    gaps TEXT NOT NULL DEFAULT '[]',
    matched_keywords TEXT NOT NULL DEFAULT '[]',
    missing_keywords TEXT NOT NULL DEFAULT '[]',
    recommendations TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft',
    resume_id TEXT,
    cover_letter_id TEXT,
    applied_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS interview_preps (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    questions TEXT NOT NULL DEFAULT '[]',
    star_guides TEXT NOT NULL DEFAULT '[]',
    self_introduction TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    summary TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_fit_job ON fit_analyses(job_id);
  CREATE INDEX IF NOT EXISTS idx_clv_letter ON cover_letter_versions(cover_letter_id);
  CREATE INDEX IF NOT EXISTS idx_cl_job ON cover_letters(job_id);
  CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
  `,

  // v2 — add foreign keys so PRAGMA foreign_keys=ON is actually enforced.
  //
  // SQLite cannot ALTER a table to add constraints, so each table that needs an
  // FK is recreated (create new → copy → drop old → rename). The copy also
  // repairs pre-existing orphans: child rows whose parent is gone are dropped
  // (CASCADE intent) and dangling optional refs are nulled (SET NULL intent), so
  // a subsequent PRAGMA foreign_key_check stays clean. FKs are disabled for the
  // rebuild and the whole thing runs in one transaction (auto-rolled-back if the
  // process dies mid-migration, since the version bump happens only afterwards).
  `
  PRAGMA foreign_keys=OFF;
  BEGIN;

  -- cover_letters.job_id -> jobs(id) ON DELETE SET NULL
  CREATE TABLE cover_letters_new (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
    is_primary INTEGER NOT NULL DEFAULT 0,
    current_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  INSERT INTO cover_letters_new (id,title,job_id,is_primary,current_version_id,created_at,updated_at)
    SELECT id,title,
           CASE WHEN job_id IN (SELECT id FROM jobs) THEN job_id ELSE NULL END,
           is_primary,current_version_id,created_at,updated_at
    FROM cover_letters;
  DROP TABLE cover_letters;
  ALTER TABLE cover_letters_new RENAME TO cover_letters;

  -- cover_letter_versions.cover_letter_id -> cover_letters(id) ON DELETE CASCADE
  CREATE TABLE cover_letter_versions_new (
    id TEXT PRIMARY KEY,
    cover_letter_id TEXT NOT NULL REFERENCES cover_letters(id) ON DELETE CASCADE,
    version_no INTEGER NOT NULL,
    content TEXT NOT NULL,
    note TEXT,
    source TEXT NOT NULL DEFAULT 'ai',
    created_at TEXT NOT NULL
  );
  INSERT INTO cover_letter_versions_new (id,cover_letter_id,version_no,content,note,source,created_at)
    SELECT id,cover_letter_id,version_no,content,note,source,created_at
    FROM cover_letter_versions
    WHERE cover_letter_id IN (SELECT id FROM cover_letters);
  DROP TABLE cover_letter_versions;
  ALTER TABLE cover_letter_versions_new RENAME TO cover_letter_versions;

  -- fit_analyses.job_id -> jobs(id) ON DELETE CASCADE
  CREATE TABLE fit_analyses_new (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    score REAL,
    summary TEXT,
    strengths TEXT NOT NULL DEFAULT '[]',
    gaps TEXT NOT NULL DEFAULT '[]',
    matched_keywords TEXT NOT NULL DEFAULT '[]',
    missing_keywords TEXT NOT NULL DEFAULT '[]',
    recommendations TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  INSERT INTO fit_analyses_new (id,job_id,score,summary,strengths,gaps,matched_keywords,missing_keywords,recommendations,created_at,updated_at)
    SELECT id,job_id,score,summary,strengths,gaps,matched_keywords,missing_keywords,recommendations,created_at,updated_at
    FROM fit_analyses
    WHERE job_id IN (SELECT id FROM jobs);
  DROP TABLE fit_analyses;
  ALTER TABLE fit_analyses_new RENAME TO fit_analyses;

  -- applications: job_id CASCADE, resume_id/cover_letter_id SET NULL
  CREATE TABLE applications_new (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft',
    resume_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
    cover_letter_id TEXT REFERENCES cover_letters(id) ON DELETE SET NULL,
    applied_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  INSERT INTO applications_new (id,job_id,status,resume_id,cover_letter_id,applied_at,notes,created_at,updated_at)
    SELECT id,job_id,status,
           CASE WHEN resume_id IN (SELECT id FROM documents) THEN resume_id ELSE NULL END,
           CASE WHEN cover_letter_id IN (SELECT id FROM cover_letters) THEN cover_letter_id ELSE NULL END,
           applied_at,notes,created_at,updated_at
    FROM applications
    WHERE job_id IN (SELECT id FROM jobs);
  DROP TABLE applications;
  ALTER TABLE applications_new RENAME TO applications;

  -- interview_preps.job_id -> jobs(id) ON DELETE CASCADE
  CREATE TABLE interview_preps_new (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    questions TEXT NOT NULL DEFAULT '[]',
    star_guides TEXT NOT NULL DEFAULT '[]',
    self_introduction TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  INSERT INTO interview_preps_new (id,job_id,questions,star_guides,self_introduction,notes,created_at,updated_at)
    SELECT id,job_id,questions,star_guides,self_introduction,notes,created_at,updated_at
    FROM interview_preps
    WHERE job_id IN (SELECT id FROM jobs);
  DROP TABLE interview_preps;
  ALTER TABLE interview_preps_new RENAME TO interview_preps;

  -- Recreate indexes dropped along with their tables.
  CREATE INDEX IF NOT EXISTS idx_fit_job ON fit_analyses(job_id);
  CREATE INDEX IF NOT EXISTS idx_clv_letter ON cover_letter_versions(cover_letter_id);
  CREATE INDEX IF NOT EXISTS idx_cl_job ON cover_letters(job_id);

  COMMIT;
  PRAGMA foreign_keys=ON;
  `,

  // v3 — per-job timeline entries. Document/cover-letter refs live in payload
  // snapshots instead of FKs so deleting a document does not erase the history.
  `
  CREATE TABLE IF NOT EXISTS application_timeline_events (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    payload TEXT NOT NULL DEFAULT '{}',
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_timeline_job ON application_timeline_events(job_id, occurred_at ASC);
  `,

  // v4 — structured quantitative credentials on the profile (학력·자격증·어학점수·수상).
  // Stored as JSON arrays in TEXT columns (same pattern as profile.links), so the AI
  // can cite exact values (GPA, TOEIC 920) without re-asking or hallucinating, and
  // they feed the verify corpus. ALTER ADD COLUMN is non-destructive and idempotent
  // across the ordered migration runner.
  `
  ALTER TABLE profile ADD COLUMN education TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE profile ADD COLUMN certifications TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE profile ADD COLUMN language_scores TEXT NOT NULL DEFAULT '[]';
  ALTER TABLE profile ADD COLUMN awards TEXT NOT NULL DEFAULT '[]';
  `,

  // v5 — company research on the job posting (사업개요·인재상·핵심가치). Korea-centric: cover
  // letters and interview prep align to a company's 인재상/핵심가치, so store it where the AI
  // already reads it (the job context) rather than a separate entity. Additive ALTER, idempotent.
  `
  ALTER TABLE jobs ADD COLUMN company_overview TEXT;
  ALTER TABLE jobs ADD COLUMN talent_profile TEXT;
  ALTER TABLE jobs ADD COLUMN core_values TEXT NOT NULL DEFAULT '[]';
  `,

  // v6 — post-interview debrief on interview_preps (받은 질문·잘된 점·개선점·다음 라운드 포커스·
  // 체감 분위기). Closes the loop: prep is pre-interview, debrief is post-interview, but both belong
  // to the same per-job entity, so store as one JSON column rather than a new table. Additive ALTER,
  // idempotent. Feeds next-round prep and consistency (lessons carry into later interviews).
  `
  ALTER TABLE interview_preps ADD COLUMN debrief TEXT NOT NULL DEFAULT '{}';
  `,

  // v7 — offer comparison (한국 총보상 필드) + company reputation research field on jobs.
  // offers: one per job (UNIQUE job_id, mirrors interview_preps). Cash pieces are numeric (만원) so
  // the server can deterministically sum an annual estimate; equity/other stay free-text (comp is
  // messy). ai_score/verdict are written by the connected AI at save time (no LLM here) and rendered
  // by the dashboard, so it never needs to call an LLM. jobs.reputation: AI-researched company
  // reputation summary (same pattern as company_overview) — feeds offer verdicts + offer-evaluation.
  `
  CREATE TABLE IF NOT EXISTS offers (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    base_salary INTEGER,
    bonus_amount INTEGER,
    welfare_amount INTEGER,
    signing_amount INTEGER,
    equity_note TEXT,
    comp_note TEXT,
    work_arrangement TEXT,
    contract_type TEXT,
    accept_deadline TEXT,
    ai_score INTEGER,
    verdict TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_offers_job ON offers(job_id);
  ALTER TABLE jobs ADD COLUMN reputation TEXT;
  `,

  // v8 — offer lifecycle status. 지원 상태(전형 깔때기 = 회사의 프로세스)와 직교하는
  // "내 응답" 축: open(진행)/accepted(수락)/declined(거절). declined여도 행을 지우지
  // 않는다 — 조건(연봉·처우) 히스토리는 다음 협상의 자산이라, 대시보드가 접힌
  // '지난 오퍼'로 강등해 보여줄 뿐이다. Additive ALTER (runner가 멱등 처리).
  `
  ALTER TABLE offers ADD COLUMN offer_status TEXT NOT NULL DEFAULT 'open';
  `,

  // v9 — 한국 문항형 자소서: 회사가 지정한 문항·글자수를 공고에 구조화 보관. 한국 자소서는
  // 회사별 문항형(항목·글자수 제한)이 지배적이라, AI가 문항별로 답변을 쓰고 글자수를 점검할 때
  // 참조할 원본을 공고 옆에 둔다(별도 엔티티가 아니라 job 컨텍스트에 함께 실린다). JSON 배열을
  // TEXT에 저장(다른 JSON 필드와 동일). Additive ALTER (runner가 멱등 처리).
  `
  ALTER TABLE jobs ADD COLUMN questions TEXT NOT NULL DEFAULT '[]';
  `,

  // v10 — 탈락 회고: 어느 전형 단계에서 떨어졌는지 자가 기록. 탈락 사유를 고지하는 기업은 6%뿐이고
  // 지원자 83%가 알고 싶어하므로, 이 자가 기록이 "서류는 붙는데 면접에서 떨어진다" 같은 패턴을 로컬
  // 데이터로 드러내는 유일한 신호다. 탈락이 아니거나 미기록이면 NULL. Additive ALTER (runner가 멱등 처리).
  `
  ALTER TABLE applications ADD COLUMN rejected_stage TEXT;
  `,

  // v11 — 전형 일정: 서류마감→인적성·AI역검→1·2차 면접→발표로 이어지는 단계별 날짜를 공고에
  // 구조화 보관. 일정을 jobs에 두는 이유: 서류마감(deadline)이 이미 jobs에 있고, save_job_posting
  // 업서트를 그대로 재사용해 도구 신설 없이 갱신할 수 있다. 면접초대 메일·발표 공지를 사용자가
  // 붙여넣으면 AI가 날짜를 추출해 저장하고, 서버가 D-day·같은 날짜 충돌을 결정론으로 계산한다.
  // JSON 배열을 TEXT에 저장(다른 JSON 필드와 동일). Additive ALTER (runner가 멱등 처리).
  `
  ALTER TABLE jobs ADD COLUMN schedule TEXT NOT NULL DEFAULT '[]';
  `,
];

export function migrate(db: DatabaseSync): { from: number; to: number } {
  db.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const row = db.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  const from = row ? Number(row.value) : 0;

  // DB stamped by a newer CareerMate than this code: leave it alone. Stamping it
  // back down would make the newer app re-run migrations it already applied.
  if (from >= MIGRATIONS.length) return { from, to: from };

  for (let v = from; v < MIGRATIONS.length; v++) {
    applyMigration(db, v);
  }
  return { from, to: MIGRATIONS.length };
}

function stampVersion(db: DatabaseSync, version: number): void {
  db.prepare(
    `INSERT INTO _meta (key, value) VALUES ('schema_version', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(String(version));
}

function columnExists(db: DatabaseSync, table: string, column: string): boolean {
  const rows = db
    .prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`)
    .all() as Array<{ name: string }>;
  return rows.some((r) => r.name === column);
}

// One `ALTER TABLE <t> ADD COLUMN <c> …;` statement on its own line (how all
// column-adding migrations here are written).
const ALTER_ADD_COLUMN_RE = /^[ \t]*ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)[^;]*;[ \t]*$/gm;

/** Drop ADD COLUMN statements whose column already exists (idempotent re-run). */
function skipExistingColumns(db: DatabaseSync, sql: string): string {
  return sql.replace(ALTER_ADD_COLUMN_RE, (stmt, table: string, column: string) =>
    columnExists(db, table, column) ? '' : stmt,
  );
}

function applyMigration(db: DatabaseSync, v: number): void {
  const sql = MIGRATIONS[v]!;

  if (sql.includes('BEGIN;')) {
    // Self-transactional migration (v2 toggles PRAGMA foreign_keys, which is a
    // no-op inside an open transaction, so it must manage BEGIN/COMMIT itself).
    // Stamp right after; if the process dies in the tiny window between the two
    // statements, re-running the rebuild is safe (it copies the data again).
    db.exec(sql);
    stampVersion(db, v + 1);
    return;
  }

  db.exec('BEGIN');
  try {
    db.exec(skipExistingColumns(db, sql));
    stampVersion(db, v + 1);
    db.exec('COMMIT');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* surface the original error */
    }
    throw err;
  }
}
