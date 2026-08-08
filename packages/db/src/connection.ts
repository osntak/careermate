/**
 * Single shared DatabaseSync connection.
 *
 * Both the web server and the MCP server import this. SQLite with WAL handles
 * the two-process concurrency (dashboard editing + AI writing) cleanly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getBackupsDir, getDbPath } from './paths.ts';
import { migrate, MIGRATIONS } from './schema.ts';

let _db: DatabaseSync | null = null;

/** How many automatic pre-migration snapshots to keep (newest first). */
const PRE_MIGRATE_KEEP = 5;

/**
 * `VACUUM INTO` a destination path, with the guard both backup callers need. The
 * data dir can be set via env, so `destPath` isn't fully trusted: reject NUL/newline
 * (can't be embedded safely in the SQL string literal) and single-quote-escape the
 * rest. Throws on an unsafe path so the caller can fall back to fs.copyFileSync.
 */
export function vacuumInto(db: DatabaseSync, destPath: string): void {
  if (/[\0\n\r]/.test(destPath)) throw new Error('backup path not safe for SQL literal');
  db.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
}

/**
 * Snapshot the DB into backups/ right before a schema upgrade runs. The DB is
 * the user's only copy, so a schema upgrade must not proceed without a restore
 * point. Operators may explicitly opt out for emergency recovery with
 * CAREERMATE_ALLOW_UNBACKED_MIGRATION=1.
 */
function preMigrationBackup(db: DatabaseSync): void {
  try {
    const hasMeta = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='_meta'`)
      .get();
    if (!hasMeta) return; // fresh file — nothing to protect yet
    const row = db.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as
      | { value: string }
      | undefined;
    const from = row ? Number(row.value) : 0;
    if (from === 0 || from >= MIGRATIONS.length) return; // fresh, current, or newer — no upgrade will run

    const dir = getBackupsDir();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(dir, `pre-migrate-v${from}-${stamp}.sqlite`);
    try {
      vacuumInto(db, dest);
    } catch {
      fs.copyFileSync(getDbPath(), dest); // WAL is checkpointed on close; copy is a coarse fallback
    }

    // Prune old snapshots (ISO stamp in the name → lexicographic sort == time sort).
    // fs.unlinkSync only — rmSync hard-crashes on Node 25/Windows.
    const stale = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('pre-migrate-') && f.endsWith('.sqlite'))
      .sort()
      .reverse()
      .slice(PRE_MIGRATE_KEEP);
    for (const f of stale) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {
        /* best-effort */
      }
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    if (process.env.CAREERMATE_ALLOW_UNBACKED_MIGRATION === '1') {
      console.error(
        `[careermate] 업그레이드 전 자동 백업 실패 — 명시적 우회로 마이그레이션을 계속합니다: ${reason}`,
      );
      return;
    }
    throw new Error(
      `데이터베이스 업그레이드 전 백업을 만들지 못해 시작을 중단했습니다. ` +
        `데이터 위치를 확인하고 다시 시도하세요. 긴급 복구 시에만 ` +
        `CAREERMATE_ALLOW_UNBACKED_MIGRATION=1을 설정할 수 있습니다. 원인: ${reason}`,
    );
  }
}

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const db = new DatabaseSync(getDbPath());
  try {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    db.exec('PRAGMA busy_timeout = 5000;');
    preMigrationBackup(db);
    migrate(db);
    _db = db;
    return db;
  } catch (err) {
    try {
      db.close();
    } catch {
      /* best-effort */
    }
    throw err;
  }
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

let _inTx = false;

/**
 * Run `fn` inside a single synchronous transaction so multi-statement writes are
 * atomic. Promise-returning callbacks are rejected because committing before an
 * async callback settles would silently break transaction guarantees.
 */
export function tx<T>(fn: () => T): T {
  if (_inTx) {
    const nested = fn();
    if (nested instanceof Promise) throw new TypeError('tx() does not accept async callbacks');
    return nested;
  }
  const db = getDb();
  db.exec('BEGIN');
  _inTx = true;
  try {
    const result = fn();
    if (result instanceof Promise) {
      throw new TypeError('tx() does not accept async callbacks');
    }
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* ignore rollback failure; surface the original error */
    }
    throw err;
  } finally {
    _inTx = false;
  }
}

/** Helpers for the JSON-text columns. */
export function toJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function fromJson<T>(text: string | null | undefined, fallback: T): T {
  if (text == null || text === '') return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export const toBit = (b: boolean | undefined | null): number => (b ? 1 : 0);
export const fromBit = (n: number | null | undefined): boolean => Number(n) === 1;
