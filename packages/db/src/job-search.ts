import { getDb, tx } from './connection.ts';

/**
 * Job-search state, in real tables (not `_meta`) so backup, export and reset cover it:
 *  - job_search_seen: first/last sighting of each posting search_jobs returned, keyed by
 *    (source, external_id). Wanted/Jumpit lists carry no posting date, so "posted since"
 *    for them falls back to first_seen_at. Only board ids and dates, never content.
 *  - job_search_preferences: the saved conditions search_jobs uses when called without
 *    its own keyword/category (single row).
 */
function ensureTables(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS job_search_seen (
      source TEXT NOT NULL,
      external_id TEXT NOT NULL,
      first_seen_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL,
      PRIMARY KEY (source, external_id)
    );
    CREATE TABLE IF NOT EXISTS job_search_preferences (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      keyword TEXT NOT NULL DEFAULT '',
      remember_categories TEXT NOT NULL DEFAULT '[]',
      saramin_categories TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );
  `);
  // Added after the table first shipped, so older databases get the columns here.
  const cols = getDb().prepare(`PRAGMA table_info(job_search_preferences)`).all() as { name: string }[];
  for (const col of ['wanted_categories', 'jumpit_categories']) {
    if (!cols.some((c) => c.name === col)) {
      getDb().exec(`ALTER TABLE job_search_preferences ADD COLUMN ${col} TEXT NOT NULL DEFAULT '[]'`);
    }
  }
}

/** A posting not returned by any search for this long is forgotten (and counts as new if it reappears). */
const FORGET_AFTER_DAYS = 120;

/** Record the given postings as seen today and return each one's first-seen date (YYYY-MM-DD), keyed "source:external_id". */
export function markJobsSeen(items: { source: string; external_id: string }[], today: string): Map<string, string> {
  const seen = new Map<string, string>();
  if (!items.length) return seen;
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO job_search_seen (source, external_id, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(source, external_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
     RETURNING first_seen_at`,
  );
  tx(() => {
    for (const it of items) {
      const row = upsert.get(it.source, it.external_id, today, today) as { first_seen_at: string } | undefined;
      seen.set(`${it.source}:${it.external_id}`, row?.first_seen_at ?? today);
    }
    db.prepare(`DELETE FROM job_search_seen WHERE last_seen_at < date(?, ?)`).run(today, `-${FORGET_AFTER_DAYS} days`);
  });
  return seen;
}

export interface JobSearchPreferences {
  keyword: string;
  remember_categories: string[];
  saramin_categories: string[];
  wanted_categories: string[];
  jumpit_categories: string[];
  updated_at: string | null;
}

function parseList(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function getJobSearchPreferences(): JobSearchPreferences {
  const row = getDb().prepare(`SELECT * FROM job_search_preferences WHERE id = 1`).get() as
    | Record<string, unknown>
    | undefined;
  return {
    keyword: typeof row?.keyword === 'string' ? row.keyword : '',
    remember_categories: parseList(row?.remember_categories ?? '[]'),
    saramin_categories: parseList(row?.saramin_categories ?? '[]'),
    wanted_categories: parseList(row?.wanted_categories ?? '[]'),
    jumpit_categories: parseList(row?.jumpit_categories ?? '[]'),
    updated_at: typeof row?.updated_at === 'string' ? row.updated_at : null,
  };
}

/** Only the given fields change; an empty string/array clears that field. */
export function setJobSearchPreferences(
  prefs: Partial<Omit<JobSearchPreferences, 'updated_at'>>,
): JobSearchPreferences {
  const next = { ...getJobSearchPreferences(), ...prefs, updated_at: new Date().toISOString() };
  getDb()
    .prepare(
      `INSERT INTO job_search_preferences (id, keyword, remember_categories, saramin_categories, wanted_categories, jumpit_categories, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET keyword = excluded.keyword, remember_categories = excluded.remember_categories,
         saramin_categories = excluded.saramin_categories, wanted_categories = excluded.wanted_categories,
         jumpit_categories = excluded.jumpit_categories,
         updated_at = excluded.updated_at`,
    )
    .run(
      next.keyword,
      JSON.stringify(next.remember_categories),
      JSON.stringify(next.saramin_categories),
      JSON.stringify(next.wanted_categories),
      JSON.stringify(next.jumpit_categories),
      next.updated_at,
    );
  return next;
}

// Backup import accepts only tables that already exist, so create these when @careermate/db
// loads (same as provenance.ts): a backup from a machine that has searched must restore on a
// fresh install that never has.
ensureTables();
