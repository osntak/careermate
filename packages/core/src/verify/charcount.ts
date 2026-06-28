/**
 * Deterministic character counting for Korean cover letters — the thing a chatbot
 * cannot do reliably. Korean 문항형 자소서 grade on per-question length limits, and
 * the counting rule (with-space / no-space / byte) varies by company; getting it
 * wrong is the single most common disqualification. Pure, LLM-free.
 */

export type CountMode = 'with_space' | 'no_space' | 'byte';

export interface CharCounts {
  /** Code points incl. all whitespace. Uses [...text] so surrogate pairs (emoji) count as 1. */
  withSpace: number;
  /** Code points with every whitespace char (space/tab/newline) removed. */
  noSpace: number;
  /**
   * UTF-8 byte length. NOTE: some legacy Korean forms count 2 bytes per Hangul
   * syllable (EUC-KR/KS X 1001); modern web forms and most "byte" limits today are
   * UTF-8 (3 bytes per Hangul). We report UTF-8 — the AI should confirm the posting's
   * convention when a byte limit is given.
   */
  byte: number;
}

export interface CharLimitCheck {
  mode: CountMode;
  /** The count under the chosen mode. */
  count: number;
  min?: number;
  max?: number;
  /** 'no_limit' when neither min nor max is given. */
  status: 'under' | 'ok' | 'over' | 'no_limit';
  /** over: count−max ; under: min−count ; otherwise undefined. */
  delta?: number;
}

const utf8Bytes = (text: string): number => {
  // Avoid a Node Buffer dependency in this pure module — count UTF-8 bytes directly.
  let bytes = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp <= 0x7f) bytes += 1;
    else if (cp <= 0x7ff) bytes += 2;
    else if (cp <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
};

/** Count a string three ways. Deterministic, encoding-explicit. */
export function countChars(text: string): CharCounts {
  const cps = [...text];
  return {
    withSpace: cps.length,
    noSpace: cps.filter((c) => !/\s/.test(c)).length,
    byte: utf8Bytes(text),
  };
}

/** Pick the count for a mode (default with_space — AGENTS.md: 미지정 시 공백포함). */
export function countForMode(text: string, mode: CountMode = 'with_space'): number {
  const c = countChars(text);
  return mode === 'no_space' ? c.noSpace : mode === 'byte' ? c.byte : c.withSpace;
}

/**
 * Check a text against an optional min/max under one counting mode. Advisory —
 * the caller decides what to do with `over`/`under` (this never throws or blocks).
 */
export function checkCharLimit(
  text: string,
  opts: { min?: number; max?: number; mode?: CountMode } = {},
): CharLimitCheck {
  const mode = opts.mode ?? 'with_space';
  const count = countForMode(text, mode);
  const hasMin = typeof opts.min === 'number';
  const hasMax = typeof opts.max === 'number';
  if (!hasMin && !hasMax) {
    return { mode, count, status: 'no_limit' };
  }
  if (hasMax && count > opts.max!) {
    return { mode, count, min: opts.min, max: opts.max, status: 'over', delta: count - opts.max! };
  }
  if (hasMin && count < opts.min!) {
    return { mode, count, min: opts.min, max: opts.max, status: 'under', delta: opts.min! - count };
  }
  return { mode, count, min: opts.min, max: opts.max, status: 'ok' };
}
