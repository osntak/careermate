/**
 * Company health: how solid a company looks (finances, headcount, turnover, red flags).
 * One record per company, not per posting, so every posting from that company and the
 * job-search results show the same grade. The AI does the research (DART, 잡플래닛,
 * 크레딧잡, news...) and saves the result here; CareerMate fetches nothing itself.
 */
import { getDb } from './connection.ts';

export const COMPANY_GRADES = ['S', 'A', 'B', 'C', 'D', 'U'] as const;
export type CompanyGrade = (typeof COMPANY_GRADES)[number];

/** Free-text values so the AI can keep the unit and year ("1,240억 (2024)", "+12% (1년)"). */
export const COMPANY_METRIC_KEYS = [
  'employees',
  'employees_change_1y',
  'hires_12m',
  'leavers_12m',
  'revenue',
  'operating_profit',
  'debt_ratio',
  'funding',
  'avg_salary',
  'rating',
] as const;
export type CompanyMetricKey = (typeof COMPANY_METRIC_KEYS)[number];

export interface CompanyHealth {
  company: string;
  grade: CompanyGrade;
  summary: string | null;
  metrics: Partial<Record<CompanyMetricKey, string>>;
  red_flags: string[];
  green_flags: string[];
  sources: { name: string; url?: string }[];
  checked_at: string | null;
  updated_at: string;
}

/** "(주)카카오", "주식회사 카카오", "Kakao Corp." -> "카카오" / "kakao". */
export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(주\)|㈜|주식회사|\(유\)|유한회사|\(사\)|\b(inc|corp|corporation|co|ltd|llc|limited)\b\.?/g, '')
    .replace(/[\s.,·\-_'"()[\]]/g, '');
}

function ensureTable(): void {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS company_health (
      company_key TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      grade TEXT NOT NULL CHECK (grade IN ('S','A','B','C','D','U')),
      summary TEXT,
      metrics TEXT NOT NULL DEFAULT '{}',
      red_flags TEXT NOT NULL DEFAULT '[]',
      green_flags TEXT NOT NULL DEFAULT '[]',
      sources TEXT NOT NULL DEFAULT '[]',
      checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

const parse = <T>(text: unknown, fallback: T): T => {
  try {
    return typeof text === 'string' ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
};

function map(r: any): CompanyHealth {
  return {
    company: r.company,
    grade: r.grade,
    summary: r.summary,
    metrics: parse(r.metrics, {}),
    red_flags: parse(r.red_flags, []),
    green_flags: parse(r.green_flags, []),
    sources: parse(r.sources, []),
    checked_at: r.checked_at,
    updated_at: r.updated_at,
  };
}

export const companyHealthRepo = {
  get(company: string | null | undefined): CompanyHealth | null {
    if (!company) return null;
    const row = getDb().prepare(`SELECT * FROM company_health WHERE company_key = ?`).get(companyKey(company));
    return row ? map(row) : null;
  },

  /** company_key -> grade, for lists that show a badge per row without a query each. */
  gradeIndex(): Map<string, CompanyGrade> {
    const rows = getDb().prepare(`SELECT company_key, grade FROM company_health`).all() as { company_key: string; grade: CompanyGrade }[];
    return new Map(rows.map((r) => [r.company_key, r.grade]));
  },

  save(input: Omit<CompanyHealth, 'updated_at' | 'checked_at'> & { checked_at?: string | null }): CompanyHealth {
    const key = companyKey(input.company);
    if (!key) throw new Error('회사 이름이 비어 있습니다.');
    const now = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO company_health (company_key, company, grade, summary, metrics, red_flags, green_flags, sources, checked_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(company_key) DO UPDATE SET company = excluded.company, grade = excluded.grade, summary = excluded.summary,
           metrics = excluded.metrics, red_flags = excluded.red_flags, green_flags = excluded.green_flags,
           sources = excluded.sources, checked_at = excluded.checked_at, updated_at = excluded.updated_at`,
      )
      .run(
        key,
        input.company.trim(),
        input.grade,
        input.summary ?? null,
        JSON.stringify(input.metrics ?? {}),
        JSON.stringify(input.red_flags ?? []),
        JSON.stringify(input.green_flags ?? []),
        JSON.stringify(input.sources ?? []),
        input.checked_at ?? now.slice(0, 10),
        now,
        now,
      );
    return this.get(input.company)!;
  },
};

// Created at load like the other sidecar tables, so backups and sync from another PC
// always find the table on a fresh install.
ensureTable();
