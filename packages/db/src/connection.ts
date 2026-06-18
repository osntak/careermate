/**
 * Single shared DatabaseSync connection.
 *
 * Both the web server and the MCP server import this. SQLite with WAL handles
 * the two-process concurrency (dashboard editing + AI writing) cleanly.
 */
import { DatabaseSync } from 'node:sqlite';
import { getDbPath } from './paths.ts';
import { migrate } from './schema.ts';

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const db = new DatabaseSync(getDbPath());
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA busy_timeout = 5000;');
  migrate(db);
  _db = db;
  return db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

let _inTx = false;

/**
 * Run `fn` inside a single transaction so multi-statement writes are atomic:
 * any thrown error rolls back every statement instead of leaving a half-written
 * row. node:sqlite has no transaction() helper, so we drive BEGIN/COMMIT/ROLLBACK
 * directly. Re-entrant: a nested tx() call joins the outer transaction (SQLite
 * has no nested transactions), so only the outermost call commits or rolls back.
 */
export function tx<T>(fn: () => T): T {
  if (_inTx) return fn();
  const db = getDb();
  db.exec('BEGIN');
  _inTx = true;
  try {
    const result = fn();
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
