/**
 * App settings — small key/value preferences stored in the existing `_meta`
 * table (created by migrate()). No schema migration needed, so this adds zero
 * boot-time ALTER risk. Currently holds one flag: verify_strict.
 */
import { getDb } from './connection.ts';

const SETTING_PREFIX = 'setting.';

function getSetting(key: string): string | null {
  const row = getDb()
    .prepare(`SELECT value FROM _meta WHERE key = ?`)
    .get(SETTING_PREFIX + key) as { value: string } | undefined;
  return row ? row.value : null;
}

function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      `INSERT INTO _meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    )
    .run(SETTING_PREFIX + key, value);
}

/**
 * Strict provenance mode. When ON, the cover-letter gate also blocks numbers
 * that live only in structured records (not the user's résumé document) — i.e.
 * "back your claims with your actual résumé". OFF (default) only blocks numbers
 * that trace to nothing. The user opts in via the dashboard toggle or by asking
 * the AI ("엄격하게 봐줘"); the AI confirms before turning it ON, and must only
 * turn it OFF on an explicit, unambiguous request (weakening the safety net).
 */
export function getVerifyStrict(): boolean {
  return getSetting('verify_strict') === '1';
}

export function setVerifyStrict(on: boolean): boolean {
  setSetting('verify_strict', on ? '1' : '0');
  return on;
}
