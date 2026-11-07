/**
 * Backup, restore, export and reset of the whole database. Shared by the dashboard
 * (Settings page) and folder sync, which runs in both the web and MCP processes.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { getDb, tx, vacuumInto } from './connection.ts';
import { getBackupsDir, getDataDir, readConfig, writeConfig } from './paths.ts';
import { readProfilePhoto, restoreProfilePhotoFile, removeProfilePhoto, sniffPhotoMime, PHOTO_MAX_BYTES } from './photo.ts';

/**
 * Every user-data table, discovered from the live schema rather than a hand-kept
 * list — so a table added by a future migration is automatically included in
 * export/backup/reset (a stale list would silently skip it, e.g. dropping data
 * on reset that was never backed up). `_meta` (schema_version) is intentionally
 * excluded so reset keeps the migration state. Names come from sqlite_master,
 * not user input, so interpolating them into SQL below is safe.
 */
export function listTables(db: DatabaseSync): string[] {
  return (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_meta' ORDER BY name`,
      )
      .all() as { name: string }[]
  ).map((r) => r.name);
}

const RESTORE_ORDER = [
  'profile',
  'experiences',
  'projects',
  'skills',
  'documents',
  'jobs',
  'cover_letters',
  'cover_letter_versions',
  'fit_analyses',
  'applications',
  'interview_preps',
  'application_timeline_events',
  'activities',
] as const;

type BackupRow = Record<string, string | number | boolean | null>;

interface ParsedBackup {
  exported_at: string | null;
  version: number;
  current_version: number;
  tables: Record<string, BackupRow[]>;
  photo: Buffer | null;
  counts: Record<string, number>;
  total_rows: number;
  warnings: string[];
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function schemaVersion(db: DatabaseSync): number {
  const ver = db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as
    | { value: string }
    | undefined;
  return Number(ver?.value ?? 0);
}

function tableColumns(db: DatabaseSync, table: string): string[] {
  return (db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string }[]).map((r) => r.name);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseBackup(raw: unknown): ParsedBackup {
  if (!isRecord(raw) || !isRecord(raw.tables)) {
    throw new Error('CareerMate 백업 JSON 형식이 아닙니다.');
  }

  const rawTables = raw.tables;
  const db = getDb();
  const currentVersion = schemaVersion(db);
  const version = Number(raw.version);
  if (!Number.isInteger(version) || version < 0) {
    throw new Error('백업 파일의 스키마 버전을 확인할 수 없습니다.');
  }
  if (version > currentVersion) {
    throw new Error('이 백업은 더 최신 CareerMate에서 만들어졌습니다. 앱을 업데이트한 뒤 다시 가져와 주세요.');
  }

  const allowedTables = new Set(listTables(db));
  const unknownTables = Object.keys(rawTables).filter((name) => !allowedTables.has(name));
  if (unknownTables.length > 0) {
    throw new Error(`현재 앱에서 알 수 없는 데이터가 포함되어 있습니다: ${unknownTables.join(', ')}`);
  }

  const columnsByTable = new Map<string, Set<string>>();
  for (const table of allowedTables) columnsByTable.set(table, new Set(tableColumns(db, table)));

  const tables: Record<string, BackupRow[]> = {};
  const counts: Record<string, number> = {};
  let totalRows = 0;

  for (const table of allowedTables) {
    const rows = rawTables[table] ?? [];
    if (!Array.isArray(rows)) throw new Error(`${table} 데이터가 배열 형식이 아닙니다.`);

    const columns = columnsByTable.get(table)!;
    tables[table] = rows.map((row, rowIndex) => {
      if (!isRecord(row)) throw new Error(`${table} ${rowIndex + 1}번째 행이 올바른 형식이 아닙니다.`);

      const clean: BackupRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (!columns.has(key)) throw new Error(`${table} 데이터에 현재 앱에서 쓰지 않는 항목(${key})이 있습니다.`);
        if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
          throw new Error(`${table} 데이터의 ${key} 값 형식이 올바르지 않습니다.`);
        }
        clean[key] = value as BackupRow[string];
      }
      if (Object.keys(clean).length === 0) throw new Error(`${table} ${rowIndex + 1}번째 행이 비어 있습니다.`);
      return clean;
    });
    counts[table] = tables[table].length;
    totalRows += tables[table].length;
  }

  // The profile photo is a file, not a row, so it rides next to 	ables as base64.
  let photo: Buffer | null = null;
  const rawPhoto = isRecord(raw.files) ? raw.files.profile_photo : undefined;
  if (rawPhoto !== undefined) {
    photo = isRecord(rawPhoto) && typeof rawPhoto.data === 'string' ? Buffer.from(rawPhoto.data, 'base64') : null;
    if (!photo || photo.length > PHOTO_MAX_BYTES || !sniffPhotoMime(photo)) throw new Error('백업 파일의 프로필 사진 형식이 올바르지 않습니다.');
  }

  const warnings = [...allowedTables]
    .filter((table) => !(table in rawTables))
    .map((table) => `${table} 데이터가 백업 파일에 없어 빈 값으로 가져옵니다.`);

  return {
    exported_at: typeof raw.exported_at === 'string' ? raw.exported_at : null,
    version,
    current_version: currentVersion,
    tables,
    photo,
    counts,
    total_rows: totalRows,
    warnings,
  };
}

/** Full machine-readable dump of every table — portable backup / GDPR-style export. */
export function exportAll(): {
  exported_at: string;
  version: number;
  tables: Record<string, unknown[]>;
  files?: { profile_photo: { mime: string; data: string } };
} {
  const db = getDb();
  const tables: Record<string, unknown[]> = {};
  for (const t of listTables(db)) {
    tables[t] = db.prepare(`SELECT * FROM ${quoteIdent(t)}`).all();
  }
  const photo = readProfilePhoto();
  return {
    exported_at: new Date().toISOString(),
    version: schemaVersion(db),
    tables,
    ...(photo ? { files: { profile_photo: { mime: photo.mime, data: Buffer.from(photo.bytes).toString('base64') } } } : {}),
  };
}

export function previewBackupImport(raw: unknown) {
  const parsed = parseBackup(raw);
  return {
    exported_at: parsed.exported_at,
    version: parsed.version,
    current_version: parsed.current_version,
    counts: parsed.counts,
    total_rows: parsed.total_rows,
    warnings: parsed.warnings,
  };
}

export function restoreBackup(raw: unknown, opts: { safetyPrefix?: string } = {}): {
  ok: boolean;
  safety_backup_path: string;
  safety_json_path: string;
  restored: ReturnType<typeof previewBackupImport>;
} {
  const parsed = parseBackup(raw);
  const safety = createBackup(opts.safetyPrefix);
  const db = getDb();
  const tables = listTables(db);
  const restoreOrder = [
    ...RESTORE_ORDER.filter((table) => tables.includes(table)),
    ...tables.filter((table) => !RESTORE_ORDER.includes(table as (typeof RESTORE_ORDER)[number])),
  ];

  tx(() => {
    for (const table of [...restoreOrder].reverse()) {
      db.prepare(`DELETE FROM ${quoteIdent(table)}`).run();
    }

    for (const table of restoreOrder) {
      for (const row of parsed.tables[table] ?? []) {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(',');
        const values = columns.map((column) => {
          const value = row[column];
          return typeof value === 'boolean' ? Number(value) : value;
        });
        db.prepare(
          `INSERT INTO ${quoteIdent(table)} (${columns.map(quoteIdent).join(',')}) VALUES (${placeholders})`,
        ).run(...values);
      }
    }

    const fkProblems = db.prepare(`PRAGMA foreign_key_check`).all();
    if (fkProblems.length > 0) {
      throw new Error('백업 파일의 데이터 관계가 맞지 않아 가져올 수 없습니다.');
    }
  });

  // The restored profile row may point at a photo file this PC does not have; the backup's own copy wins.
  // Only the file is written: the row's photo meta (and updated_at) stay as restored, so a sync
  // import reproduces the snapshot exactly instead of looking like a fresh local edit.
  restoreProfilePhotoFile(parsed.photo);

  return {
    ok: true,
    safety_backup_path: safety.backup_path,
    safety_json_path: safety.json_path,
    restored: previewBackupImport(raw),
  };
}

/** Create a consistent SQLite snapshot and matching JSON dump. */
export function createBackup(prefix = 'careermate'): { backup_path: string; json_path: string } {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = getBackupsDir();
  const dbBackup = path.join(dir, `${prefix}-${stamp}.sqlite`);
  const jsonBackup = path.join(dir, `${prefix}-${stamp}.json`);

  const resolvedDir = path.resolve(dir);
  if (!path.resolve(dbBackup).startsWith(resolvedDir + path.sep)) {
    throw new Error('백업 경로가 백업 폴더를 벗어났습니다.');
  }

  try {
    // VACUUM INTO produces a transactionally consistent standalone database.
    // Never copy only the live main file while WAL is active.
    vacuumInto(getDb(), dbBackup);
    fs.writeFileSync(jsonBackup, JSON.stringify(exportAll(), null, 2), 'utf8');
  } catch (err) {
    // A backup is one logical artifact. Do not leave a partial SQLite/JSON pair
    // that the UI could later present as a successful restore point.
    for (const partial of [dbBackup, jsonBackup]) {
      try {
        if (fs.existsSync(partial)) fs.unlinkSync(partial);
      } catch {
        /* best-effort cleanup; surface the original failure */
      }
    }
    throw err;
  }
  return { backup_path: dbBackup, json_path: jsonBackup };
}

/**
 * Point CareerMate at another data folder (applies after a restart). An empty target gets
 * a consistent copy of the current DB, the profile photo and the sync state; a target that
 * already holds careermate.sqlite is used as it is. The old folder is left untouched.
 */
export function changeDataDir(target: string): { data_dir: string; copied: boolean } {
  if (process.env.CAREERMATE_DATA_DIR?.trim()) throw new Error('CAREERMATE_DATA_DIR 환경변수로 지정되어 있어 설정에서 바꿀 수 없습니다.');
  const abs = path.resolve(target.trim());
  if (!path.isAbsolute(target.trim()) || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error('있는 폴더를 골라 주세요.');
  const current = getDataDir();
  if (path.relative(abs, current) === '') throw new Error('지금 쓰는 폴더입니다.');
  const sync = readConfig().sync_dir || process.env.CAREERMATE_SYNC_DIR?.trim();
  const rel = sync ? path.relative(path.resolve(sync), abs) : '..';
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
    throw new Error('외부 저장소 폴더 안에는 데이터를 둘 수 없습니다.');
  }

  const dbFile = path.join(abs, 'careermate.sqlite');
  const copied = !fs.existsSync(dbFile);
  if (copied) {
    vacuumInto(getDb(), dbFile);
    for (const sub of ['uploads']) {
      const from = path.join(current, sub);
      if (fs.existsSync(from)) fs.cpSync(from, path.join(abs, sub), { recursive: true });
    }
    const state = path.join(current, 'sync-state.json');
    if (fs.existsSync(state)) fs.copyFileSync(state, path.join(abs, 'sync-state.json'));
  }
  writeConfig({ data_dir: path.relative(abs, path.join(os.homedir(), '.careermate')) === '' ? '' : abs });
  return { data_dir: abs, copied };
}

/** Wipe all user data. Requires an explicit confirmation string to avoid mistakes. */
export function resetAll(confirm: string): { ok: boolean; backup_path?: string } {
  if (confirm !== 'DELETE') {
    return { ok: false };
  }
  const { backup_path } = createBackup();
  const db = getDb();
  db.exec('BEGIN');
  try {
    for (const t of listTables(db)) db.exec(`DELETE FROM ${quoteIdent(t)}`);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  removeProfilePhoto(); // the photo file is user data too; the backup above holds a copy
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

