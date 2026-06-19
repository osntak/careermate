/**
 * Data management — the user's right to see, export, import, back up, and delete
 * their own data. All operations are local file operations; nothing leaves the
 * machine.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { getDb, getDbPath, getBackupsDir, getDataDir, getExportsDir, tx } from '@careermate/db';
import { BUNDLED } from '@careermate/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  'activities',
] as const;

type BackupRow = Record<string, string | number | boolean | null>;

interface ParsedBackup {
  exported_at: string | null;
  version: number;
  current_version: number;
  tables: Record<string, BackupRow[]>;
  counts: Record<string, number>;
  total_rows: number;
  warnings: string[];
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function cmdQuote(value: string): string {
  return value.replace(/"/g, '""');
}

function schemaVersion(db: DatabaseSync): number {
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

function appRoot(): string {
  return BUNDLED ? __dirname : path.resolve(__dirname, '..', '..', '..');
}

function shortcutFolder(): string {
  const override = process.env.CAREERMATE_SHORTCUT_DIR?.trim();
  if (override) return override;
  const desktop = path.join(os.homedir(), 'Desktop');
  const parent = fs.existsSync(desktop) ? desktop : getExportsDir();
  return path.join(parent, 'CareerMate 대시보드');
}

function openFolder(dir: string): void {
  try {
    if (process.platform === 'win32') spawn('explorer', [dir], { stdio: 'ignore', detached: true }).unref();
    else if (process.platform === 'darwin') spawn('open', [dir], { stdio: 'ignore', detached: true }).unref();
    else spawn('xdg-open', [dir], { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* best-effort */
  }
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

  const warnings = [...allowedTables]
    .filter((table) => !(table in rawTables))
    .map((table) => `${table} 데이터가 백업 파일에 없어 빈 값으로 가져옵니다.`);

  return {
    exported_at: typeof raw.exported_at === 'string' ? raw.exported_at : null,
    version,
    current_version: currentVersion,
    tables,
    counts,
    total_rows: totalRows,
    warnings,
  };
}

function macLauncherScript(): string {
  const root = appRoot();
  const dataDir = getDataDir();
  const nodePath = process.execPath;
  const binPath = path.join(root, 'bin', 'careermate.mjs');
  const bundledWeb = BUNDLED ? path.join(root, 'web.mjs') : path.join(root, 'dist', 'web.mjs');

  return `#!/bin/zsh
set -e

export CAREERMATE_DATA_DIR=${shQuote(dataDir)}
NODE=${shQuote(nodePath)}
ROOT=${shQuote(root)}
BIN=${shQuote(binPath)}
BUNDLED_WEB=${shQuote(bundledWeb)}
INFO="$CAREERMATE_DATA_DIR/server.json"

if [ ! -x "$NODE" ]; then
  NODE="$(command -v node || true)"
fi
if [ -z "$NODE" ]; then
  echo "Node.js를 찾지 못했습니다. CareerMate를 설치한 뒤 다시 실행해 주세요."
  exit 1
fi

URL=$("$NODE" -e 'const fs=require("fs"); try { const info=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(info.url || ""); } catch {}' "$INFO")
if [ -n "$URL" ] && command -v curl >/dev/null 2>&1 && curl -fsS --max-time 1 "$URL/api/health" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

echo "CareerMate 대시보드를 시작합니다."
if [ -f "$BIN" ]; then
  cd "$ROOT"
  exec "$NODE" "$BIN" start
fi

if [ -f "$BUNDLED_WEB" ]; then
  cd "$(dirname "$BUNDLED_WEB")"
  exec "$NODE" --no-warnings --experimental-sqlite "$BUNDLED_WEB"
fi

if command -v careermate >/dev/null 2>&1; then
  exec careermate start
fi

exec npx -y careermate start
`;
}

function windowsLauncherScript(): string {
  const root = appRoot();
  const dataDir = getDataDir();
  const nodePath = process.execPath;
  const binPath = path.join(root, 'bin', 'careermate.mjs');
  const bundledWeb = BUNDLED ? path.join(root, 'web.mjs') : path.join(root, 'dist', 'web.mjs');

  return `@echo off
setlocal
set "CAREERMATE_DATA_DIR=${cmdQuote(dataDir)}"
set "NODE=${cmdQuote(nodePath)}"
set "ROOT=${cmdQuote(root)}"
set "BIN=${cmdQuote(binPath)}"
set "BUNDLED_WEB=${cmdQuote(bundledWeb)}"
set "INFO=%CAREERMATE_DATA_DIR%\\server.json"
set "URL="

if not exist "%NODE%" (
  for /f "usebackq delims=" %%N in (\`where node 2^>nul\`) do (
    set "NODE=%%N"
    goto :node_found
  )
)
:node_found
if not exist "%NODE%" (
  echo Node.js를 찾지 못했습니다. CareerMate를 설치한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%U in (\`"%NODE%" -e "const fs=require('fs'); try { const info=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(info.url || ''); } catch {}" "%INFO%"\`) do set "URL=%%U"
if defined URL (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '%URL%/api/health' | Out-Null; Start-Process '%URL%'; exit 0 } catch { exit 1 }"
  if not errorlevel 1 exit /b 0
)

echo CareerMate 대시보드를 시작합니다.
if exist "%BIN%" (
  cd /d "%ROOT%"
  "%NODE%" "%BIN%" start
  exit /b %ERRORLEVEL%
)

if exist "%BUNDLED_WEB%" (
  cd /d "%ROOT%"
  "%NODE%" --no-warnings --experimental-sqlite "%BUNDLED_WEB%"
  exit /b %ERRORLEVEL%
)

where careermate >nul 2>nul
if not errorlevel 1 (
  careermate start
  exit /b %ERRORLEVEL%
)

npx -y careermate start
`;
}

function linuxLauncherScript(): string {
  return macLauncherScript()
    .replace('#!/bin/zsh', '#!/usr/bin/env sh')
    .replace('\n  open "$URL"', '\n  xdg-open "$URL"');
}

/** Full machine-readable dump of every table — portable backup / GDPR-style export. */
export function exportAll(): { exported_at: string; version: number; tables: Record<string, unknown[]> } {
  const db = getDb();
  const tables: Record<string, unknown[]> = {};
  for (const t of listTables(db)) {
    tables[t] = db.prepare(`SELECT * FROM ${quoteIdent(t)}`).all();
  }
  return { exported_at: new Date().toISOString(), version: schemaVersion(db), tables };
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

export function restoreBackup(raw: unknown): {
  ok: boolean;
  safety_backup_path: string;
  safety_json_path: string;
  restored: ReturnType<typeof previewBackupImport>;
} {
  const parsed = parseBackup(raw);
  const safety = createBackup();
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

  return {
    ok: true,
    safety_backup_path: safety.backup_path,
    safety_json_path: safety.json_path,
    restored: previewBackupImport(raw),
  };
}

/** Copy the live SQLite file + a JSON dump into the backups directory. */
export function createBackup(): { backup_path: string; json_path: string } {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = getBackupsDir();
  const dbBackup = path.join(dir, `careermate-${stamp}.sqlite`);
  const jsonBackup = path.join(dir, `careermate-${stamp}.json`);

  const resolvedDir = path.resolve(dir);
  if (!path.resolve(dbBackup).startsWith(resolvedDir + path.sep)) {
    throw new Error('백업 경로가 백업 폴더를 벗어났습니다.');
  }

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

export function createDashboardShortcut(open = false): {
  shortcut_dir: string;
  launcher_path: string;
  platform: NodeJS.Platform;
  files: string[];
} {
  const dir = shortcutFolder();
  fs.mkdirSync(dir, { recursive: true });

  const readme = `CareerMate 대시보드 바로가기

- 대시보드가 이미 실행 중이면 브라우저만 엽니다.
- 대시보드가 꺼져 있으면 서버를 시작하고 브라우저를 엽니다.
- 이 폴더는 이 컴퓨터의 CareerMate 설치 경로와 데이터 폴더를 기준으로 만들어졌습니다.
`;
  const readmePath = path.join(dir, 'README.txt');
  fs.writeFileSync(readmePath, readme, 'utf8');

  let launcherPath: string;
  if (process.platform === 'win32') {
    launcherPath = path.join(dir, 'CareerMate 대시보드.cmd');
    fs.writeFileSync(launcherPath, windowsLauncherScript(), 'utf8');
  } else if (process.platform === 'darwin') {
    launcherPath = path.join(dir, 'CareerMate 대시보드.command');
    fs.writeFileSync(launcherPath, macLauncherScript(), { encoding: 'utf8', mode: 0o755 });
    fs.chmodSync(launcherPath, 0o755);
  } else {
    launcherPath = path.join(dir, 'careermate-dashboard.sh');
    fs.writeFileSync(launcherPath, linuxLauncherScript(), { encoding: 'utf8', mode: 0o755 });
    fs.chmodSync(launcherPath, 0o755);
  }

  if (open) openFolder(dir);

  return {
    shortcut_dir: dir,
    launcher_path: launcherPath,
    platform: process.platform,
    files: [launcherPath, readmePath],
  };
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
