/**
 * Local lookup over the Remember/Saramin category snapshots, so the AI can turn a
 * user's role ("경리", "데이터 분석가", "간호사") into each board's filter values.
 * No network: the tables ship with CareerMate (job-categories.data.ts).
 */

import { REMEMBER_CATEGORIES, SARAMIN_CATEGORIES } from './job-categories.data.ts';

export interface SaraminCategory {
  code: string;
  name: string;
  group: string;
  kind: string;
}

export interface JobCategoryMatches {
  query: string;
  /** Values for search_jobs' remember_categories: "group>sub", or a whole "group". */
  remember: string[];
  saramin: SaraminCategory[];
}

const norm = (s: string) => s.toLowerCase().replace(/[\s·/(),&.\-]/g, '');

/**
 * Does `hay` contain `needle` (already normalized)? Short Latin needles ("AI", "IT", "QA") must
 * stand alone in the raw text, or "AI" would match "AICPA" and "IT" would match "Git".
 */
function contains(hayRaw: string, needle: string): boolean {
  if (/^[a-z0-9]{1,3}$/.test(needle)) return new RegExp(`(?<![a-z0-9])${needle}(?![a-z0-9])`).test(hayRaw.toLowerCase());
  return norm(hayRaw).includes(needle);
}

/**
 * 3 = same name, 2 = name contains the term, 1 = term contains the name ("데이터 분석가 신입" →
 * "데이터분석가") or a word of the term is the name, 0.5 = a word of the term is inside the name
 * ("회계 담당자" → "회계결산").
 */
function score(name: string, terms: string[]): number {
  const n = norm(name);
  if (n.length < 2) return 0;
  let best = 0;
  for (const term of terms) {
    const t = norm(term);
    if (n === t) return 3;
    if (contains(name, t)) best = Math.max(best, 2);
    else if (contains(term, n)) best = Math.max(best, 1);
    for (const word of term.split(/\s+/).map(norm)) {
      if (word.length < 2 || word === t) continue;
      if (word === n) best = Math.max(best, 1);
      else if (contains(name, word)) best = Math.max(best, 0.5);
    }
  }
  return best;
}

/** Roles as comma/newline separated terms, e.g. "경리, 회계". Results are ranked, best first. */
export function findJobCategories(query: string, limit = 20): JobCategoryMatches {
  const terms = (query ?? '').split(/[,\n]/).map((t) => t.trim()).filter((t) => norm(t).length >= 2);
  const remember: { v: string; s: number }[] = [];
  for (const [group, subs] of Object.entries(REMEMBER_CATEGORIES)) {
    const gs = score(group, terms);
    if (gs) remember.push({ v: group, s: gs - 0.5 }); // a whole group is broader than a matching sub
    for (const sub of subs) {
      const s = score(sub, terms);
      if (s) remember.push({ v: `${group}>${sub}`, s });
    }
  }
  const saramin: (SaraminCategory & { s: number })[] = [];
  for (const [group, kinds] of Object.entries(SARAMIN_CATEGORIES)) {
    for (const [kind, list] of Object.entries(kinds)) {
      for (const [code, name] of list) {
        // Job titles first; skill/tool/place facets (기술스택, 근무장소 ...) rank just below.
        const s = score(name, terms) - (kind === '직무·직업' ? 0 : 0.25);
        if (s > 0) saramin.push({ code, name, group, kind, s });
      }
    }
  }
  return {
    query,
    remember: remember.sort((a, b) => b.s - a.s).slice(0, limit).map((r) => r.v),
    saramin: saramin
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map(({ s: _s, ...c }) => c),
  };
}

/** "group>sub" or "group" exactly as in the snapshot; Remember silently ignores anything else. */
export function isRememberCategory(value: string): boolean {
  const parts = value.split('>').map((s) => s.trim());
  if (parts.length > 2) return false;
  const [group, sub] = parts;
  const subs = REMEMBER_CATEGORIES[group];
  return !!subs && (sub === undefined || subs.includes(sub));
}

let saraminCodes: Map<string, string> | undefined;
// First name wins if a code repeats, so the 직무·직업 name (listed first) is kept.
const saraminIndex = () => {
  if (!saraminCodes) {
    saraminCodes = new Map();
    for (const kinds of Object.values(SARAMIN_CATEGORIES))
      for (const list of Object.values(kinds)) for (const [c, n] of list) if (!saraminCodes.has(c)) saraminCodes.set(c, n);
  }
  return saraminCodes;
};

/** A cat_kewd code from the snapshot. Unknown codes are rejected rather than risk an unfiltered list. */
export function isSaraminCategory(code: string): boolean {
  return saraminIndex().has(code);
}

/** Display name of a Saramin code ("322" -> "경리"), or undefined if unknown. */
export function saraminCategoryName(code: string): string | undefined {
  return saraminIndex().get(code);
}
