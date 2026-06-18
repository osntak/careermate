/**
 * SQLite schema + lightweight migration runner.
 *
 * Migrations are an ordered list of SQL strings. The current version is tracked
 * in `_meta`. Applying is idempotent and safe to run on every process start, so
 * both the web server and the MCP server can call `migrate()` on boot and share
 * the same database file without coordination.
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
];

export function migrate(db: DatabaseSync): { from: number; to: number } {
  db.exec(`CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const row = db.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  const from = row ? Number(row.value) : 0;

  for (let v = from; v < MIGRATIONS.length; v++) {
    db.exec(MIGRATIONS[v]!);
  }

  const to = MIGRATIONS.length;
  if (to !== from) {
    db.prepare(
      `INSERT INTO _meta (key, value) VALUES ('schema_version', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run(String(to));
  }
  return { from, to };
}
