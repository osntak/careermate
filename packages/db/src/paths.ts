/**
 * Resolves where CareerMate keeps its local data. Everything is on the user's
 * machine — no cloud, no external transfer. The location is overridable so power
 * users can relocate it and the Settings page can display it.
 *
 * Priority:
 *   1. CAREERMATE_DATA_DIR env var (absolute path)
 *   2. data_dir in config.json (picked in Settings; read once, a change needs a restart)
 *   3. ~/.careermate            (default)
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

/** Folders picked in Settings. Env vars still win over these. */
export interface UserConfig {
  data_dir?: string;
  sync_dir?: string;
}

const homeDataDir = (): string => path.join(os.homedir(), '.careermate');

/**
 * config.json sits in the default data dir even after the data moves, so both the web
 * and MCP process find it. With CAREERMATE_DATA_DIR set it sits there instead, which
 * keeps tests and side-by-side installs away from the user's real settings.
 */
export function getConfigPath(): string {
  return path.join(process.env.CAREERMATE_DATA_DIR?.trim() || homeDataDir(), 'config.json');
}

export function readConfig(): UserConfig {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')) as UserConfig;
  } catch {
    return {};
  }
}

export function writeConfig(patch: UserConfig): UserConfig {
  const next: Record<string, unknown> = { ...readConfig(), ...patch };
  for (const k of Object.keys(next)) if (!next[k]) delete next[k];
  const file = getConfigPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(next, null, 2) + '\n');
  fs.renameSync(`${file}.tmp`, file);
  return next;
}

let configuredDataDir: string | undefined;

export function getDataDir(): string {
  const override = process.env.CAREERMATE_DATA_DIR?.trim();
  const dir = override || (configuredDataDir ??= readConfig().data_dir?.trim() || homeDataDir());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDbPath(): string {
  return path.join(getDataDir(), 'careermate.sqlite');
}

export function getExportsDir(): string {
  const dir = path.join(getDataDir(), 'exports');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getUploadsDir(): string {
  const dir = path.join(getDataDir(), 'uploads');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Drop folder where the user places existing résumé/career files for the AI to
 * ingest — a workaround for CLI clients that can't attach files (only paths).
 * Lives under the data dir (not the user's project) so it never pollutes a repo.
 */
export function getInboxDir(): string {
  const dir = path.join(getDataDir(), 'inbox');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getBackupsDir(): string {
  const dir = path.join(getDataDir(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
