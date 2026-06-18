/**
 * Resolves where CareerMate keeps its local data. Everything is on the user's
 * machine — no cloud, no external transfer. The location is overridable so power
 * users can relocate it and the Settings page can display it.
 *
 * Priority:
 *   1. CAREERMATE_DATA_DIR env var (absolute path)
 *   2. ~/.careermate            (default)
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export function getDataDir(): string {
  const override = process.env.CAREERMATE_DATA_DIR?.trim();
  const dir = override && override.length > 0 ? override : path.join(os.homedir(), '.careermate');
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
