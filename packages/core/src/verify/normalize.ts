/**
 * Deterministic text normalization + number extraction for the verify engine.
 *
 * NO LLM. Pure functions. Everything here runs identically on the stored corpus
 * and on the AI's output so a number/fact "match" can't be dodged with
 * fullwidth digits, zero-width joiners, or Korean 조사 suffixes.
 *
 * Hardening folded in from a Codex (gpt-5.5) adversarial review:
 *  - NFKC + zero-width strip + fullwidth-digit fold on BOTH sides.
 *  - "supported" (literal OR server-derivable) instead of "literally present".
 *  - Derivation restricted to the SAME segment + SAME unit (no spurious
 *    5 = 12 − 7 across unrelated sentences).
 *  - Korean magnitude + trailing unit (`8만 건` → 80000 건, `1.2억` → money).
 */

const ZERO_WIDTH = /[​-‍⁠﻿]/g;

/** NFKC fold (folds ５→5, ％→%, ㈜→(주)…) + strip zero-width chars. */
export function normalizeText(s: string): string {
  return (s ?? '').normalize('NFKC').replace(ZERO_WIDTH, '');
}

const MAGNITUDE: Record<string, number> = { '억': 1e8, '만': 1e4, '천': 1e3 };

/** Units that mark a *refutable quantified claim* (gate-eligible when unsupported). */
export const RISK_UNITS = new Set([
  '%', '배', '원', '건', '명', '점', '위', '년차', '년', '개월', '주', '시간', '회', '개',
]);

export interface NumberToken {
  /** Original surface form (post-normalize), e.g. "8만 건", "12건", "250%". */
  raw: string;
  /** Scaled numeric value for comparison (8만 → 80000, 1.2억 → 120000000, 250% → 250). */
  value: number;
  /** Normalized unit ('%','원','건','년',…) or '' when bare. */
  unit: string;
  /** True when this looks like a refutable quantified claim (gate-eligible). */
  risk: boolean;
}

// digits (commas/decimals) + optional Korean magnitude (억/만/천) + optional unit.
// Trailing 조사 ("12건을", "5년차로") falls outside the match automatically.
const NUM_RE =
  /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*(억|만|천)?\s*(원|%p|％|%|퍼센트|배|건|명|점|위|년차|개월|년|시간|주|회|개)?/g;

const YEAR_RE = /^(?:19|20)\d{2}$/;

function normUnit(u: string): string {
  if (u === '％' || u === '퍼센트' || u === '%p') return '%';
  return u;
}

/** Extract comparable number tokens from text. Pure, deterministic. */
export function extractNumbers(text: string): NumberToken[] {
  const t = normalizeText(text);
  const out: NumberToken[] = [];
  for (const m of t.matchAll(NUM_RE)) {
    const intPart = m[1].replace(/,/g, '');
    const frac = m[2] ? '.' + m[2] : '';
    const base = Number(intPart + frac);
    if (!Number.isFinite(base)) continue;
    const mag = m[3] ?? '';
    let unit = normUnit(m[4] ?? '');
    // Year-like 4-digit numbers are dates, not claims ("2024", "2024년"); "7년" kept.
    if (!mag && (!unit || unit === '년') && YEAR_RE.test(intPart) && !frac) continue;
    const scale = MAGNITUDE[mag] ?? 1;
    const value = base * scale;
    // magnitude with no trailing unit ⇒ money (원); "8만 건" keeps 건.
    if (mag && !unit) unit = '원';
    const surface = m[0].trim();
    if (!surface) continue;
    const risk = RISK_UNITS.has(unit) || (!unit && value >= 1000) || (!!mag && !unit);
    out.push({ raw: surface, value, unit, risk });
  }
  return out;
}

/** Split text into segments (sentence / line / bullet) for same-segment derivation. */
export function splitSegments(text: string): string[] {
  return normalizeText(text)
    .split(/[\n.。!?！？·••]|(?:\s-\s)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface Corpus {
  /** unit → all values seen anywhere (for literal/rounding membership). */
  byUnit: Map<string, number[]>;
  /** per-segment: unit → values (for same-segment, same-unit derivation). */
  segments: Array<Map<string, number[]>>;
}

function addToMap(map: Map<string, number[]>, unit: string, value: number): void {
  const arr = map.get(unit);
  if (arr) arr.push(value);
  else map.set(unit, [value]);
}

/** Build a unit/segment-indexed corpus from raw text. */
export function buildCorpus(text: string): Corpus {
  const byUnit = new Map<string, number[]>();
  const segments: Array<Map<string, number[]>> = [];
  for (const seg of splitSegments(text)) {
    const segMap = new Map<string, number[]>();
    for (const n of extractNumbers(seg)) {
      addToMap(byUnit, n.unit, n.value);
      addToMap(segMap, n.unit, n.value);
    }
    if (segMap.size) segments.push(segMap);
  }
  return { byUnit, segments };
}
