/**
 * Folder sync (opt-in via CAREERMATE_SYNC_DIR). Unset means none of this runs.
 *
 * The DB stays in the data dir. A text snapshot of it goes to <SYNC_DIR>/careermate/:
 * one JSON file per table, the profile photo as a binary file, and meta.json (written
 * last) listing every file's sha256. A reader trusts a snapshot only when every hash
 * matches, so a half-downloaded Drive folder or a half-written export is skipped.
 *
 * Each cycle compares three hashes: local DB, snapshot in the folder, and `base` (the
 * last hash both sides agreed on, kept per PC in <DATA_DIR>/sync-state.json):
 *   local = base, remote = base -> nothing        local != base, remote = base -> export
 *   local = base, remote != base -> import        both != base -> conflict: local wins,
 *                                                 the remote snapshot is copied to backups/
 * When the folder root has .git, the cycle also fetches/merges before and commits/pushes
 * after. Web and MCP run this in parallel against one DB, so a lock file in the data
 * dir keeps one cycle at a time per PC.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { getDb } from './connection.ts';
import { getBackupsDir, getDataDir, readConfig, writeConfig } from './paths.ts';
import { isProcessAlive } from './runtime.ts';
import { listTables, restoreBackup, schemaVersion } from './backup.ts';
import { readProfilePhoto } from './photo.ts';

const FORMAT = 1;
const SNAP_DIR = 'careermate';
const LOCAL_INTERVAL_MS = 15_000;
const REMOTE_INTERVAL_MS = 3 * 60_000;
const READ_TIMEOUT_MS = 30_000;
const GIT_TIMEOUT_MS = 60_000;
const LOCK_STALE_MS = 10 * 60_000;
const KEEP_IMPORT_BACKUPS = 10;
const CONFLICT_NOTICE_MS = 7 * 24 * 60 * 60_000;
const PARTIAL_GIVE_UP_MS = 10 * 60_000;
const PHOTO_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const PHOTO_MIME: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png' };
const SNAP_FILE = /^(tables\/[A-Za-z0-9_]+\.json|profile_photo\.(jpg|png))$/;

export type SyncWarningCode = 'conflict' | 'first_join' | 'partial_snapshot' | 'newer_schema' | 'conflict_copies' | 'empty_local';
export interface SyncWarning {
  code: SyncWarningCode;
  message: string;
  paths?: string[];
}
interface SyncState {
  base: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  warnings: SyncWarning[];
  last_conflict: { at: string; backup_dir: string; code: 'conflict' | 'first_join' } | null;
  /** The folder `base` belongs to; another folder starts from scratch. */
  dir: string | null;
  partial_since: string | null;
}
export interface SyncStatus extends Omit<SyncState, 'base' | 'dir' | 'partial_since'> {
  enabled: boolean;
  dir?: string;
  mode?: 'git' | 'folder';
  /** 'env' = set by CAREERMATE_SYNC_DIR, so Settings can't change it. */
  source: 'env' | 'settings';
}
interface Snapshot {
  schema_version: number;
  files: Map<string, Buffer>;
  hash: string;
  rows: number;
}
type Remote =
  | { status: 'missing' }
  | { status: 'partial'; reason: string }
  | { status: 'newer'; schema_version: number }
  | { status: 'ok'; snap: Snapshot };

/** Env var first, then the folder picked in Settings (read each time, so connecting or disconnecting applies at once). */
function syncDir(): string | null {
  const v = process.env.CAREERMATE_SYNC_DIR?.trim() || readConfig().sync_dir?.trim();
  return v ? path.resolve(v) : null;
}
const isGit = (dir: string): boolean => fs.existsSync(path.join(dir, '.git'));
const sha = (b: Buffer | string): string => crypto.createHash('sha256').update(b).digest('hex');
const pretty = (v: unknown): string => JSON.stringify(v, null, 2) + '\n';
const quoteIdent = (n: string): string => `"${n.replace(/"/g, '""')}"`;
// unlinkSync, not rmSync: rmSync hard-crashes on Node 25/Windows (see connection.ts).
const unlinkQuiet = (file: string): void => {
  try {
    fs.unlinkSync(file);
  } catch {
    /* already gone */
  }
};
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e)).trim();

function snapshotHash(schemaVersion: number, files: Map<string, Buffer>): string {
  const entries = [...files.keys()].sort().map((k) => [k, sha(files.get(k)!)]);
  return sha(JSON.stringify({ schema_version: schemaVersion, files: entries }));
}

/* ------------------------------------------------------------ local side */

/** The DB as snapshot files: rows in primary-key order, keys sorted, so equal data gives equal bytes. */
export function serializeDb(): Snapshot {
  const db = getDb();
  const files = new Map<string, Buffer>();
  let rows = 0;
  for (const table of listTables(db)) {
    const cols = db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all() as { name: string; pk: number }[];
    const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk);
    const order = (pk.length ? pk : cols).map((c) => quoteIdent(c.name)).join(',');
    const data = (db.prepare(`SELECT * FROM ${quoteIdent(table)} ORDER BY ${order}`).all() as Record<string, unknown>[]).map(
      (r) => Object.fromEntries(Object.keys(r).sort().map((k) => [k, r[k]])),
    );
    rows += data.length;
    files.set(`tables/${table}.json`, Buffer.from(pretty(data)));
  }
  const photo = readProfilePhoto();
  if (photo && PHOTO_EXT[photo.mime]) files.set(`profile_photo.${PHOTO_EXT[photo.mime]}`, Buffer.from(photo.bytes));
  const sv = schemaVersion(db);
  return { schema_version: sv, files, hash: snapshotHash(sv, files), rows };
}

/* ----------------------------------------------------------- folder side */

function readWithTimeout(file: string): Promise<Buffer> {
  // Drive "streaming" files download on first read and can stall; give up and retry next cycle.
  return Promise.race([
    fs.promises.readFile(file),
    new Promise<Buffer>((_, reject) => setTimeout(() => reject(new Error(`읽기 시간 초과: ${file}`)), READ_TIMEOUT_MS).unref()),
  ]);
}

async function readRemote(dir: string): Promise<Remote> {
  const root = path.join(dir, SNAP_DIR);
  if (!fs.existsSync(root)) return { status: 'missing' };
  let meta: { format?: unknown; schema_version?: unknown; files?: unknown };
  // No meta.json: empty folder means nothing was shared yet; snapshot files without it mean
  // a download or an export is still under way.
  if (!fs.existsSync(path.join(root, 'meta.json'))) {
    const started = fs.existsSync(path.join(root, 'tables')) && fs.readdirSync(path.join(root, 'tables')).some((f) => !f.startsWith('.'));
    return started ? { status: 'partial', reason: 'meta.json 이 아직 없습니다.' } : { status: 'missing' };
  }
  try {
    meta = JSON.parse((await readWithTimeout(path.join(root, 'meta.json'))).toString('utf8'));
  } catch (e) {
    return { status: 'partial', reason: `meta.json: ${errMsg(e)}` };
  }
  const sv = Number(meta.schema_version);
  if (typeof meta.format === 'number' && meta.format > FORMAT) return { status: 'newer', schema_version: sv };
  if (meta.format !== FORMAT || !Number.isInteger(sv) || typeof meta.files !== 'object' || meta.files === null) {
    return { status: 'partial', reason: 'meta.json 형식이 올바르지 않습니다.' };
  }
  const files = new Map<string, Buffer>();
  for (const [rel, want] of Object.entries(meta.files as Record<string, unknown>)) {
    if (!SNAP_FILE.test(rel)) return { status: 'partial', reason: `알 수 없는 파일: ${rel}` };
    let buf: Buffer;
    try {
      buf = await readWithTimeout(path.join(root, rel));
    } catch (e) {
      return { status: 'partial', reason: `${rel}: ${errMsg(e)}` };
    }
    if (sha(buf) !== want) return { status: 'partial', reason: `${rel} 내용이 meta.json 과 다릅니다.` };
    files.set(rel, buf);
  }
  return { status: 'ok', snap: { schema_version: sv, files, hash: snapshotHash(sv, files), rows: -1 } };
}

/** Files Drive/OneDrive left next to ours after a two-sided edit, e.g. "meta (1).json". Never deleted. */
function conflictCopies(dir: string): string[] {
  const root = path.join(dir, SNAP_DIR);
  const found: string[] = [];
  for (const sub of ['', 'tables']) {
    let names: string[] = [];
    try {
      names = fs.readdirSync(path.join(root, sub));
    } catch {
      continue;
    }
    for (const name of names) {
      const rel = sub ? `${sub}/${name}` : name;
      if (name.startsWith('.') || rel === 'meta.json' || rel === 'tables' || SNAP_FILE.test(rel)) continue;
      found.push(path.join(root, rel));
    }
  }
  return found;
}

function writeAtomic(file: string, data: Buffer | string): void {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  try {
    fs.writeFileSync(tmp, data);
    fs.renameSync(tmp, file);
  } catch (e) {
    unlinkQuiet(tmp);
    throw e;
  }
}

function sameContent(file: string, data: Buffer): boolean {
  try {
    return fs.readFileSync(file).equals(data);
  } catch {
    return false;
  }
}

/** Write the snapshot, skipping unchanged files (no needless Drive uploads), meta.json last. */
function writeSnapshot(dir: string, snap: Snapshot): void {
  const root = path.join(dir, SNAP_DIR);
  fs.mkdirSync(path.join(root, 'tables'), { recursive: true });
  // Byte-exact files or the hashes break: stop git's autocrlf (on by default on Windows) from rewriting them.
  const attrs = Buffer.from('* -text\n');
  if (!sameContent(path.join(root, '.gitattributes'), attrs)) writeAtomic(path.join(root, '.gitattributes'), attrs);
  for (const [rel, buf] of snap.files) {
    const file = path.join(root, rel);
    if (!sameContent(file, buf)) writeAtomic(file, buf);
  }
  // Drop files the previous meta listed that this snapshot no longer has (dropped photo, renamed table).
  try {
    const prev = JSON.parse(fs.readFileSync(path.join(root, 'meta.json'), 'utf8')) as { files?: Record<string, string> };
    for (const rel of Object.keys(prev.files ?? {})) {
      if (SNAP_FILE.test(rel) && !snap.files.has(rel)) unlinkQuiet(path.join(root, rel));
    }
  } catch {
    /* no previous meta */
  }
  const filesObj = Object.fromEntries([...snap.files.keys()].sort().map((k) => [k, sha(snap.files.get(k)!)]));
  const meta = Buffer.from(pretty({ format: FORMAT, schema_version: snap.schema_version, files: filesObj }));
  const metaPath = path.join(root, 'meta.json');
  if (!sameContent(metaPath, meta)) writeAtomic(metaPath, meta);
}

/** Restore the snapshot into the DB; returns the safety backup made first. */
function importSnapshot(snap: Snapshot, safetyPrefix: string): string {
  const tables: Record<string, unknown> = {};
  let photo: { mime: string; data: string } | undefined;
  for (const [rel, buf] of snap.files) {
    if (rel.startsWith('tables/')) tables[rel.slice(7, -5)] = JSON.parse(buf.toString('utf8'));
    else photo = { mime: PHOTO_MIME[rel.split('.').pop()!], data: buf.toString('base64') };
  }
  const res = restoreBackup(
    { version: snap.schema_version, tables, ...(photo ? { files: { profile_photo: photo } } : {}) },
    { safetyPrefix },
  );
  // Every import leaves a safety backup; keep only the newest few so a long-running dashboard doesn't fill the disk.
  const dir = getBackupsDir();
  const stale = fs.readdirSync(dir).filter((f) => f.startsWith('sync-import-')).sort().reverse().slice(KEEP_IMPORT_BACKUPS * 2);
  for (const f of stale) unlinkQuiet(path.join(dir, f));
  return res.safety_json_path;
}

function conflictBackupDir(): string {
  return path.join(getBackupsDir(), `sync-conflict-${new Date().toISOString().replace(/[:.]/g, '-')}`);
}

/* --------------------------------------------------------------- git */

// Never wait on a login: no terminal prompt, no Credential Manager window, no ssh passphrase question.
const GIT_ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes' };

interface GitResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}
function git(dir: string, args: string[], env: NodeJS.ProcessEnv = GIT_ENV): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile(
      'git',
      args,
      { cwd: dir, timeout: GIT_TIMEOUT_MS, windowsHide: true, maxBuffer: 64 * 1024 * 1024, env },
      (err, stdout, stderr) => resolve({ ok: !err, stdout: String(stdout).trim(), stderr: String(stderr || (err ? errMsg(err) : '')).trim() }),
    );
  });
}
async function gitOrThrow(dir: string, args: string[]): Promise<string> {
  const r = await git(dir, args);
  if (!r.ok) throw new Error(`git ${args[0]} 실패: ${r.stderr}`);
  return r.stdout;
}

/** Copy the upstream's snapshot out of git objects (the working tree holds ours). */
async function saveUpstreamSnapshot(dir: string, dest: string): Promise<void> {
  const list = (await gitOrThrow(dir, ['ls-tree', '-r', '--name-only', '@{u}', '--', SNAP_DIR])).split('\n').filter(Boolean);
  for (const rel of list) {
    const out = path.join(dest, rel.slice(SNAP_DIR.length + 1));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const content = await new Promise<Buffer>((resolve, reject) =>
      execFile('git', ['show', `@{u}:${rel}`], { cwd: dir, encoding: 'buffer', maxBuffer: 64 * 1024 * 1024, windowsHide: true }, (err, stdout) =>
        err ? reject(err) : resolve(stdout),
      ),
    );
    fs.writeFileSync(out, content);
  }
}

/** Fetch and bring the upstream in. Returns a conflict record when both sides had new snapshot commits. */
async function gitUpdate(dir: string): Promise<{ at: string; backup_dir: string } | null> {
  await gitOrThrow(dir, ['fetch', '--quiet']);
  if (!(await git(dir, ['rev-parse', '--verify', '--quiet', '@{u}'])).ok) return null; // remote branch not created yet
  const counts = await git(dir, ['rev-list', '--left-right', '--count', 'HEAD...@{u}']);
  if (!counts.ok) {
    await gitOrThrow(dir, ['merge', '--ff-only', '@{u}']); // unborn local branch
    return null;
  }
  const [ahead, behind] = counts.stdout.split(/\s+/).map(Number);
  if (behind === 0) return null;
  if (ahead === 0) {
    await gitOrThrow(dir, ['merge', '--ff-only', '--quiet', '@{u}']);
    return null;
  }
  // Diverged: our unpushed snapshot commits vs new ones upstream.
  const upstreamTouchedSnapshot = !(await git(dir, ['diff', '--quiet', 'HEAD...@{u}', '--', SNAP_DIR])).ok;
  if (!upstreamTouchedSnapshot && (await git(dir, ['rebase', '--autostash', '@{u}'])).ok) return null;
  await git(dir, ['rebase', '--abort']);
  // Local wins: keep the upstream snapshot in backups/, then stack our tree on top of upstream.
  // ponytail: assumes the repo is CareerMate-only; non-snapshot files changed upstream are not merged here.
  const backup = conflictBackupDir();
  await saveUpstreamSnapshot(dir, backup);
  await gitOrThrow(dir, ['reset', '--soft', '@{u}']);
  return { at: new Date().toISOString(), backup_dir: backup };
}

async function gitCommitAndPush(dir: string): Promise<'pushed' | 'rejected' | 'nothing'> {
  await gitOrThrow(dir, ['add', '-A', '--', SNAP_DIR]);
  if (!(await git(dir, ['diff', '--cached', '--quiet', '--', SNAP_DIR])).ok) {
    await gitOrThrow(dir, ['commit', '--quiet', '-m', `careermate sync: ${os.hostname()} ${new Date().toISOString()}`, '--', SNAP_DIR]);
  }
  if (!(await git(dir, ['rev-parse', '--verify', '--quiet', 'HEAD'])).ok) return 'nothing';
  const hasUpstream = (await git(dir, ['rev-parse', '--verify', '--quiet', '@{u}'])).ok;
  if (hasUpstream && (await git(dir, ['rev-list', '--count', '@{u}..HEAD'])).stdout === '0') return 'nothing';
  const push = await git(dir, hasUpstream ? ['push', '--quiet'] : ['push', '--quiet', '-u', 'origin', 'HEAD']);
  if (push.ok) return 'pushed';
  if (/rejected|non-fast-forward|fetch first/i.test(push.stderr)) return 'rejected';
  throw new Error(`git push 실패: ${push.stderr}`);
}

/* ------------------------------------------------------------- state + lock */

const statePath = (): string => path.join(getDataDir(), 'sync-state.json');
const lockPath = (): string => path.join(getDataDir(), 'sync.lock');

function readState(): SyncState {
  const empty: SyncState = { base: null, last_sync_at: null, last_error: null, last_error_at: null, warnings: [], last_conflict: null, dir: null, partial_since: null };
  try {
    return { ...empty, ...JSON.parse(fs.readFileSync(statePath(), 'utf8')) };
  } catch {
    return empty;
  }
}

function acquireLock(): boolean {
  for (let i = 0; i < 2; i++) {
    try {
      fs.writeFileSync(lockPath(), JSON.stringify({ pid: process.pid, at: Date.now() }), { flag: 'wx' });
      return true;
    } catch {
      try {
        const held = JSON.parse(fs.readFileSync(lockPath(), 'utf8')) as { pid: number; at: number };
        if (isProcessAlive(held.pid) && Date.now() - held.at < LOCK_STALE_MS) return false;
      } catch {
        // Unreadable: maybe the other process created it a moment ago and is still writing it.
        try {
          if (Date.now() - fs.statSync(lockPath()).mtimeMs < LOCK_STALE_MS) return false;
        } catch {
          /* gone already */
        }
      }
      unlinkQuiet(lockPath());
    }
  }
  return false;
}

/* ------------------------------------------------------------------- cycle */

let running: Promise<SyncStatus> | null = null;

/**
 * One sync pass. `fetch` also pulls from the git remote (start-up and the periodic
 * remote check); the short local timer skips it. Never throws: failures land in the status.
 */
export function runSyncCycle(opts: { fetch: boolean }): Promise<SyncStatus> {
  if (!syncDir()) return Promise.resolve(getSyncStatus());
  running ??= cycle(opts.fetch).finally(() => {
    running = null;
  });
  return running;
}

export const runSyncNow = (): Promise<SyncStatus> => runSyncCycle({ fetch: true });

async function cycle(fetch: boolean): Promise<SyncStatus> {
  const dir = syncDir()!;
  if (!acquireLock()) return getSyncStatus(); // the other CareerMate process on this PC is syncing
  const state = readState();
  const warnings: SyncWarning[] = [];
  let error: string | null = null;
  if (state.dir !== dir) {
    state.base = null;
    state.dir = dir;
  }
  const conflict = (at: string, backup_dir: string, code: 'conflict' | 'first_join'): void => {
    state.last_conflict = { at, backup_dir, code };
  };
  try {
    const gitMode = isGit(dir);
    if (gitMode && fetch) {
      try {
        const c = await gitUpdate(dir);
        if (c) conflict(c.at, c.backup_dir, 'conflict');
      } catch (e) {
        error = errMsg(e); // offline etc.: keep going with what we have locally
      }
    }

    const local = serializeDb();
    const remote = await readRemote(dir);
    const copies = conflictCopies(dir);
    if (copies.length) {
      warnings.push({ code: 'conflict_copies', message: '외부 저장소 폴더에 사본 파일이 있습니다. 읽지도 지우지도 않으니 직접 정리하세요.', paths: copies });
    }

    if (remote.status !== 'partial') state.partial_since = null;
    if (remote.status === 'partial') {
      state.partial_since ??= new Date().toISOString();
      // A partial snapshot that never completes (an export killed midway, two PCs writing at
      // once on Drive) would stall every PC forever. After a while treat it as a conflict.
      const stuck = Date.now() - Date.parse(state.partial_since) > PARTIAL_GIVE_UP_MS;
      if (stuck && (state.base !== null || local.rows > 0)) {
        const backup = conflictBackupDir();
        fs.cpSync(path.join(dir, SNAP_DIR), backup, { recursive: true });
        conflict(new Date().toISOString(), backup, 'conflict');
        writeSnapshot(dir, local);
        state.base = local.hash;
        state.partial_since = null;
      } else {
        warnings.push({ code: 'partial_snapshot', message: `다른 PC 데이터를 아직 다 받지 못해 이번에는 건너뜁니다 (${remote.reason}).` });
      }
    } else if (remote.status === 'newer' || (remote.status === 'ok' && remote.snap.schema_version > local.schema_version)) {
      warnings.push({ code: 'newer_schema', message: '다른 PC가 더 새 버전의 CareerMate 로 저장했습니다. 업데이트 전까지 동기화를 멈춥니다.' });
    } else if (remote.status === 'missing') {
      // A fresh PC with nothing in it has nothing to share. Exporting it could overwrite a
      // snapshot Drive simply hasn't downloaded yet with an empty one.
      if (state.base !== null || local.rows > 0) {
        writeSnapshot(dir, local);
        state.base = local.hash;
      }
    } else {
      const R = remote.snap.hash;
      const B = state.base;
      if (local.hash === R) state.base = R;
      else if (B === null || local.hash === B) {
        // Import. B === null is this PC joining a folder that already holds shared data: the
        // shared data wins, and whatever this PC had goes to the (unpruned) first-join backup.
        // Re-serialize right before restoring: an edit made while we awaited the folder read
        // must not be wiped by the import; it gets exported (or flagged) next round instead.
        if (serializeDb().hash === local.hash) {
          const joining = B === null && local.rows > 0;
          const safety = importSnapshot(remote.snap, joining ? 'sync-first-join' : 'sync-import');
          if (joining) conflict(new Date().toISOString(), safety, 'first_join');
          state.base = R;
        }
      } else if (R === B) {
        if (local.rows === 0) {
          // An empty DB (deleted or corrupted file, sync-state.json left behind) must not wipe every PC.
          warnings.push({ code: 'empty_local', message: '이 PC 데이터가 비어 있어 내보내지 않았습니다. 다른 PC 데이터를 지우지 않기 위해서입니다.' });
        } else {
          writeSnapshot(dir, local);
          state.base = local.hash;
        }
      } else {
        const backup = conflictBackupDir();
        fs.cpSync(path.join(dir, SNAP_DIR), backup, { recursive: true });
        conflict(new Date().toISOString(), backup, 'conflict');
        writeSnapshot(dir, local);
        state.base = local.hash;
      }
    }

    if (gitMode) {
      try {
        let pushed = await gitCommitAndPush(dir);
        if (pushed === 'rejected') {
          const c = await gitUpdate(dir);
          if (c) conflict(c.at, c.backup_dir, 'conflict');
          pushed = await gitCommitAndPush(dir);
          if (pushed === 'rejected') throw new Error('git push 가 거절되었습니다. 다음 주기에 다시 시도합니다.');
        }
      } catch (e) {
        error = errMsg(e);
      }
    }
  } catch (e) {
    error = errMsg(e);
  }

  const lc = state.last_conflict;
  if (lc && Date.now() - Date.parse(lc.at) < CONFLICT_NOTICE_MS) {
    warnings.push(
      lc.code === 'first_join'
        ? { code: 'first_join', message: '외부 저장소의 데이터를 가져왔습니다. 이 PC에 있던 데이터는 백업했습니다.', paths: [lc.backup_dir] }
        : { code: 'conflict', message: '두 PC에서 따로 고쳐 이 PC 내용을 남겼습니다. 다른 PC 내용은 백업했습니다.', paths: [lc.backup_dir] },
    );
  }
  const now = new Date().toISOString();
  if (error) {
    state.last_error = error;
    state.last_error_at = now;
  } else {
    state.last_error = null;
    state.last_error_at = null;
    if (!warnings.some((w) => w.code !== 'conflict' && w.code !== 'conflict_copies')) state.last_sync_at = now;
  }
  state.warnings = warnings;
  try {
    writeAtomic(statePath(), pretty(state));
  } catch {
    /* disk full or file locked: keep the old state, try again next round */
  }
  unlinkQuiet(lockPath());
  return getSyncStatus();
}

export function getSyncStatus(): SyncStatus {
  const dir = syncDir();
  const source = process.env.CAREERMATE_SYNC_DIR?.trim() ? 'env' : 'settings';
  if (!dir) return { enabled: false, source, last_sync_at: null, last_error: null, last_error_at: null, warnings: [], last_conflict: null };
  const { base: _base, dir: _dir, partial_since: _p, ...rest } = readState();
  return { enabled: true, source, dir, mode: isGit(dir) ? 'git' : 'folder', ...rest };
}

const isInside = (child: string, parent: string): boolean => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};

/** Connect (folder path) or disconnect (null) from Settings. The folder itself is never touched on disconnect. */
export async function setSyncDir(dir: string | null): Promise<SyncStatus> {
  if (process.env.CAREERMATE_SYNC_DIR?.trim()) throw new Error('CAREERMATE_SYNC_DIR 환경변수로 지정되어 있어 설정에서 바꿀 수 없습니다.');
  if (dir) {
    const abs = path.resolve(dir.trim());
    if (!path.isAbsolute(dir.trim()) || !fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new Error('있는 폴더를 골라 주세요.');
    // The DB must not live inside a cloud folder (WAL files break mid-sync), and vice versa.
    if (isInside(abs, getDataDir()) || isInside(getDataDir(), abs)) throw new Error('데이터 폴더와 겹치지 않는 폴더를 골라 주세요.');
    writeConfig({ sync_dir: abs });
    await startSync();
  } else {
    writeConfig({ sync_dir: '' });
  }
  return getSyncStatus();
}

/**
 * Start-up hook for web and MCP: one full pass (waited on briefly so the first screen
 * or tool call sees imported data), then the local and remote timers. No-op when unset.
 */
let timersStarted = false;
export async function startSync(): Promise<void> {
  if (!syncDir()) return;
  const first = runSyncCycle({ fetch: true });
  if (!timersStarted) {
    timersStarted = true;
    // Ticks after a disconnect are no-ops (syncDir() is re-read each time).
    setInterval(() => void runSyncCycle({ fetch: false }).catch(() => {}), LOCAL_INTERVAL_MS).unref();
    setInterval(() => void runSyncCycle({ fetch: true }).catch(() => {}), REMOTE_INTERVAL_MS).unref();
  }
  await Promise.race([first, new Promise((r) => setTimeout(r, 15_000).unref())]);
}

/* ------------------------------------------------- connect for the AI tool */

/** Machine-readable reason, so the MCP tool can answer each case with a plain-language guide. */
export class StorageConnectError extends Error {
  constructor(
    public code: 'env_locked' | 'bad_url' | 'git_missing' | 'public_repo' | 'clone_failed' | 'target_busy' | 'drive_not_found',
    message: string,
  ) {
    super(message);
  }
}

export interface ConnectResult {
  status: SyncStatus;
  dir: string;
  how: 'git' | 'google_drive' | 'folder';
  /** git only: no user.name/email, so commits (and so pushes) will fail until it is set. */
  needs_git_identity?: boolean;
}

/** Where a repo given by URL is cloned. One fixed, visible place so the user can find it. */
export const defaultCloneDir = (): string => path.join(os.homedir(), 'CareerMate-sync');

/** git@host:owner/repo or ssh://git@host/owner/repo -> https://host/owner/repo, for the anonymous check. */
function toHttps(url: string): string | null {
  if (/^https:\/\//.test(url)) return url;
  const scp = url.match(/^[\w.-]+@([\w.-]+):(.+)$/);
  if (scp) return `https://${scp[1]}/${scp[2]}`;
  const ssh = url.match(/^ssh:\/\/(?:[\w.-]+@)?([\w.-]+)(?::\d+)?\/(.+)$/);
  return ssh ? `https://${ssh[1]}/${ssh[2]}` : null;
}

/**
 * True when anyone can read the repo: an anonymous read (no stored login, no prompt)
 * succeeds. The snapshot holds every bit of personal data, so a public repo is refused.
 */
async function isPublicRepo(url: string): Promise<boolean> {
  const https = toHttps(url);
  if (!https) return false;
  const anon = { ...GIT_ENV, GIT_ASKPASS: '', SSH_ASKPASS: '' };
  return (await git(os.tmpdir(), ['-c', 'credential.helper=', 'ls-remote', '--heads', https], anon)).ok;
}

async function needsIdentity(dir: string): Promise<boolean> {
  const name = await git(dir, ['config', 'user.name']);
  const email = await git(dir, ['config', 'user.email']);
  return !name.stdout || !email.stdout;
}

/** Clone a private repo into ~/CareerMate-sync (or reuse that clone) and connect it. */
export async function connectGitRepo(url: string): Promise<ConnectResult> {
  url = url.trim();
  if (process.env.CAREERMATE_SYNC_DIR?.trim()) throw new StorageConnectError('env_locked', 'CAREERMATE_SYNC_DIR 환경변수로 이미 지정되어 있습니다.');
  if (!/^(https:\/\/|ssh:\/\/|file:\/\/|[\w.-]+@[\w.-]+:)/.test(url)) throw new StorageConnectError('bad_url', '저장소 주소 형식이 아닙니다.');
  if (!(await git(os.homedir(), ['--version'])).ok) throw new StorageConnectError('git_missing', 'git 이 설치되어 있지 않습니다.');
  if (await isPublicRepo(url)) throw new StorageConnectError('public_repo', '누구나 읽을 수 있는 공개 저장소입니다.');

  const dir = defaultCloneDir();
  const used = fs.existsSync(dir) && fs.readdirSync(dir).length > 0;
  if (used) {
    const origin = isGit(dir) ? (await git(dir, ['config', '--get', 'remote.origin.url'])).stdout : '';
    const same = (u: string) => u.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase();
    if (!origin || same(origin) !== same(url)) throw new StorageConnectError('target_busy', `${dir} 폴더가 이미 다른 용도로 쓰이고 있습니다.`);
  } else {
    const r = await git(os.homedir(), ['clone', '--quiet', url, dir]);
    if (!r.ok) throw new StorageConnectError('clone_failed', r.stderr);
  }
  const status = await setSyncDir(dir);
  return { status, dir, how: 'git', needs_git_identity: await needsIdentity(dir) };
}

/** The Google Drive for desktop root on this PC, if it is installed and signed in. */
export function findGoogleDrive(): string | null {
  const names = ['내 드라이브', 'My Drive'];
  const roots: string[] = [];
  if (process.platform === 'win32') {
    for (const letter of 'DEFGHIJKLMNOPQRSTUVWXYZ') roots.push(`${letter}:\\`);
  } else if (process.platform === 'darwin') {
    const base = path.join(os.homedir(), 'Library', 'CloudStorage');
    try {
      for (const d of fs.readdirSync(base)) if (d.startsWith('GoogleDrive-')) roots.push(path.join(base, d));
    } catch {
      /* no CloudStorage folder */
    }
  }
  for (const root of roots) for (const n of names) if (fs.existsSync(path.join(root, n))) return path.join(root, n);
  return null;
}

/** Make (or reuse) a CareerMate folder inside Google Drive and connect it. */
export async function connectGoogleDrive(): Promise<ConnectResult> {
  if (process.env.CAREERMATE_SYNC_DIR?.trim()) throw new StorageConnectError('env_locked', 'CAREERMATE_SYNC_DIR 환경변수로 이미 지정되어 있습니다.');
  const root = findGoogleDrive();
  if (!root) throw new StorageConnectError('drive_not_found', 'Google Drive 데스크톱 앱 폴더를 찾지 못했습니다.');
  const dir = path.join(root, 'CareerMate');
  fs.mkdirSync(dir, { recursive: true });
  return { status: await setSyncDir(dir), dir, how: 'google_drive' };
}
