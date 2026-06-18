/**
 * Data management — the user's right to see, export, back up, and delete their
 * own data. All operations are local file operations; nothing leaves the machine.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { getDb, getDbPath, getBackupsDir, getDataDir } from '@careermate/db';

/**
 * Every user-data table, discovered from the live schema rather than a hand-kept
 * list — so a table added by a future migration is automatically included in
 * export/backup/reset (a stale list would silently skip it, e.g. dropping data
 * on reset that was never backed up). `_meta` (schema_version) is intentionally
 * excluded so reset keeps the migration state. Names come from sqlite_master,
 * not user input, so interpolating them into SQL below is safe.
 */
function listTables(db: DatabaseSync): string[] {
  return (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_meta' ORDER BY name`,
      )
      .all() as { name: string }[]
  ).map((r) => r.name);
}

/** Full machine-readable dump of every table — portable backup / GDPR-style export. */
export function exportAll(): { exported_at: string; version: number; tables: Record<string, unknown[]> } {
  const db = getDb();
  const tables: Record<string, unknown[]> = {};
  for (const t of listTables(db)) {
    tables[t] = db.prepare(`SELECT * FROM ${t}`).all();
  }
  const ver = db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as
    | { value: string }
    | undefined;
  return { exported_at: new Date().toISOString(), version: Number(ver?.value ?? 0), tables };
}

/** Copy the live SQLite file + a JSON dump into the backups directory. */
export function createBackup(): { backup_path: string; json_path: string } {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = getBackupsDir();
  const dbBackup = path.join(dir, `careermate-${stamp}.sqlite`);
  const jsonBackup = path.join(dir, `careermate-${stamp}.json`);

  // Defense in depth: the backup target must stay inside the backups directory,
  // even though the filename is built from a controlled timestamp.
  const resolvedDir = path.resolve(dir);
  if (!path.resolve(dbBackup).startsWith(resolvedDir + path.sep)) {
    throw new Error('백업 경로가 백업 폴더를 벗어났습니다.');
  }

  // Prefer SQLite's VACUUM INTO for a WAL-consistent snapshot. node:sqlite's
  // exec() can't bind parameters, so the path is embedded as a quoted string
  // literal (single quotes doubled). If the path can't be embedded safely
  // (NUL / newline), fall back to a plain file copy instead of risking a
  // malformed statement.
  const safeForLiteral = !/[\0\n\r]/.test(dbBackup);
  try {
    if (!safeForLiteral) throw new Error('backup path not safe for SQL literal');
    getDb().exec(`VACUUM INTO '${dbBackup.replace(/'/g, "''")}'`);
  } catch {
    fs.copyFileSync(getDbPath(), dbBackup);
  }
  fs.writeFileSync(jsonBackup, JSON.stringify(exportAll(), null, 2), 'utf8');
  return { backup_path: dbBackup, json_path: jsonBackup };
}

/** Wipe all user data. Requires an explicit confirmation string to avoid mistakes. */
export function resetAll(confirm: string): { ok: boolean; backup_path?: string } {
  if (confirm !== 'DELETE') {
    return { ok: false };
  }
  // Safety: always back up before destroying.
  const { backup_path } = createBackup();
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const t of listTables(db)) db.exec(`DELETE FROM ${t}`);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return { ok: true, backup_path };
}

export function listBackups(): { filename: string; path: string; size: number; created_at: string }[] {
  const dir = getBackupsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sqlite') || f.endsWith('.json'))
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      return { filename: f, path: p, size: st.size, created_at: st.mtime.toISOString() };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getDataLocation(): { data_dir: string; db_path: string } {
  return { data_dir: getDataDir(), db_path: getDbPath() };
}
