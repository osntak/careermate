/**
 * Deterministic verify engine — the "machine check, not self-grade" layer.
 *
 * NO LLM. NO DB. Pure functions over (output text, stored corpus). The caller
 * (services.ts) collects the corpus from the DB so the AI can't inject support
 * values (zero-ai). Two jobs:
 *
 *  1. Number/fact provenance (the hard gate): every refutable quantified claim
 *     in the output must be *supported* — present in, or server-derivable from,
 *     the user's stored facts (same segment + same unit only). Unsupported
 *     high-risk numbers = suspected fabrication → block unless force.
 *  2. Style lint (advisory only): slop / 번역투 / generic openers / blind-PII.
 *
 * Source-scope rule (Codex review): a job posting's numbers must NOT support an
 * applicant's *performance* claim ("5년 이상" in the JD can't license "5년 경험").
 * Applicant claims are supported only by the applicant corpus; numbers that only
 * match the job corpus are surfaced as an advisory, never as clean support.
 */
import {
  extractNumbers,
  buildCorpus,
  normalizeText,
  type Corpus,
  type NumberToken,
} from './normalize.ts';
import { STYLE_LEXICONS, countHits } from './lexicons.ts';

export type Severity = 'critical' | 'warn' | 'info';

export interface Signal {
  id: string;
  label: string;
  severity: Severity;
  count: number;
  hits: string[];
}

export interface UnsupportedNumber {
  raw: string;
  value: number;
  unit: string;
  /**
   * 'fabricated'      — matches nothing the user stored (blocking).
   * 'structured_only' — only in a structured record (experience/project/skill),
   *                     NOT in the user's actual résumé/document text. The AI is
   *                     the sole writer of structured records, so this can't be
   *                     verified → advisory, surfaced (de-silences the
   *                     fabricate-a-record-then-cite-it bypass).
   * 'job_only'        — only in the job posting (don't claim as your own).
   */
  reason: 'fabricated' | 'structured_only' | 'job_only';
}

export interface ProvenanceResult {
  /** Count of risk-bearing (refutable) numbers checked. */
  checked: number;
  /** Traced to the user's actual résumé/document text (or derivable from it). */
  supported: number;
  /** Explained by nothing the user stored → suspected fabrication (blocking). */
  fabricated: UnsupportedNumber[];
  /** Only in a structured record, not in the résumé text → advisory (verify). */
  unverified: UnsupportedNumber[];
  /** Only in the job posting → advisory (don't claim as your own). */
  jobSourced: UnsupportedNumber[];
}

export interface LintReport {
  kind: 'cover_letter' | 'fit' | 'interview' | 'resume';
  charCount: number;
  /** Advisory style signals (never block). */
  signals: Signal[];
  provenance: ProvenanceResult;
  /** Hard-gate violations (block save unless force). Empty = nothing to block. */
  blocking: { id: string; label: string; detail: string }[];
  /** Whether a stored corpus existed to verify against (else provenance is N/A). */
  corpusAvailable: boolean;
  disclaimer: string;
}

const within = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.5, 0.02 * Math.max(Math.abs(a), Math.abs(b)));
const approx = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.5, 0.01 * Math.max(Math.abs(a), Math.abs(b)));

/**
 * Is `token` explained by the corpus — literally/rounded (same unit, anywhere),
 * or by a bounded same-segment + same-unit derivation? Percent claims may be
 * derived from a single same-unit pair within one segment (ratio / % change).
 */
function isExplained(token: NumberToken, corpus: Corpus): boolean {
  const v = token.value;
  // 1) literal / rounding membership, unit-aware.
  for (const s of corpus.byUnit.get(token.unit) ?? []) if (within(v, s)) return true;
  // 2) sum / difference of two same-unit numbers within ONE segment.
  for (const seg of corpus.segments) {
    const vals = seg.get(token.unit);
    if (vals && vals.length >= 2) {
      for (let i = 0; i < vals.length; i++)
        for (let j = 0; j < vals.length; j++) {
          if (i === j) continue;
          if (approx(v, vals[i] - vals[j]) || approx(v, vals[i] + vals[j])) return true;
        }
    }
  }
  // 3) percentages: ratio / %-change of a same-unit pair within one segment.
  if (token.unit === '%') {
    for (const seg of corpus.segments) {
      for (const [u, vals] of seg) {
        if (u === '%' || vals.length < 2) continue;
        for (let i = 0; i < vals.length; i++)
          for (let j = 0; j < vals.length; j++) {
            if (i === j) continue;
            const a = vals[i];
            const b = vals[j];
            if (b !== 0 && (approx(v, (a / b) * 100) || approx(v, ((a - b) / b) * 100) || approx(v, ((a - b) / a) * 100)))
              return true;
            if (a + b !== 0 && approx(v, (a / (a + b)) * 100)) return true;
          }
      }
    }
  }
  return false;
}

export interface VerifyCorpus {
  /** The user's actual résumé/document TEXT (the strongest "user-provided" anchor). */
  documents: string;
  /** Structured records (experiences/projects/skills) — AI-writable, so only advisory. */
  structured: string;
  /** Job posting text (description + requirements + keywords). */
  job: string;
}

/**
 * Number/fact provenance over three SEPARATE scopes (zero-ai). A claim's number
 * is `supported` only if it traces to the user's actual document text; if it
 * only traces to a structured record it is `unverified` (advisory — the AI could
 * have written that record); job-only numbers are advisory; anything matching
 * nothing is `fabricated` (blocking).
 */
export function analyzeProvenance(outputText: string, corpus: VerifyCorpus): ProvenanceResult {
  const documents = buildCorpus(corpus.documents);
  const structured = buildCorpus(corpus.structured);
  const job = buildCorpus(corpus.job);
  const nums: NumberToken[] = extractNumbers(outputText).filter((n) => n.risk);
  const res: ProvenanceResult = { checked: nums.length, supported: 0, fabricated: [], unverified: [], jobSourced: [] };
  for (const n of nums) {
    const tok = { raw: n.raw, value: n.value, unit: n.unit };
    if (isExplained(n, documents)) res.supported++;
    else if (isExplained(n, structured)) res.unverified.push({ ...tok, reason: 'structured_only' });
    else if (isExplained(n, job)) res.jobSourced.push({ ...tok, reason: 'job_only' });
    else res.fabricated.push({ ...tok, reason: 'fabricated' });
  }
  return res;
}

/** Advisory style signals over normalized text. */
export function styleSignals(text: string): Signal[] {
  const t = normalizeText(text);
  const signals: Signal[] = [];
  for (const lex of STYLE_LEXICONS) {
    const { count, hits } = countHits(lex, t);
    if (count > 0) {
      const severity: Severity =
        lex.id === 'blind_pii' || lex.id === 'generic_opener' ? 'warn' : 'info';
      signals.push({ id: lex.id, label: lex.label, severity, count, hits });
    }
  }
  return signals;
}

const DISCLAIMER =
  '이 점검은 LLM 없이 셀 수 있는 것만 봅니다(숫자 출처·문체 신호). 통과=합격이 아니며, ' +
  '사실·동문서답·의미 판단은 당신(AI)이 직접 해야 합니다.';

/**
 * Full lint for a cover letter / fit analysis. `corpus.applicant` empty ⇒ nothing
 * to verify against ⇒ provenance reported but never blocking.
 */
export function lintArtifact(kind: LintReport['kind'], text: string, corpus: VerifyCorpus): LintReport {
  const norm = normalizeText(text);
  const corpusAvailable = (corpus.documents + corpus.structured).trim().length > 0;
  const provenance = analyzeProvenance(text, corpus);
  const signals = styleSignals(text);

  const blocking: LintReport['blocking'] = [];
  // The single hard gate: suspected fabricated quantified claims in a letter,
  // and only when a corpus exists to verify against.
  if (corpusAvailable && kind === 'cover_letter' && provenance.fabricated.length > 0) {
    blocking.push({
      id: 'fabricated_numbers',
      label: '근거 없는 수치(저장된 경력·이력서에 없음)',
      detail: provenance.fabricated.map((f) => f.raw).join(', '),
    });
  }

  return {
    kind,
    charCount: [...norm].length,
    signals,
    provenance,
    blocking,
    corpusAvailable,
    disclaimer: DISCLAIMER,
  };
}

/** One-line Korean summary for the tool/text response. */
export function summarizeReport(r: LintReport): string {
  const parts: string[] = [];
  if (r.blocking.length)
    parts.push(`⛔ 저장 차단: ${r.blocking.map((b) => `${b.label}(${b.detail})`).join('; ')}`);
  if (r.provenance.unverified.length)
    parts.push(
      `미확인 수치 ${r.provenance.unverified.length}개(${r.provenance.unverified.map((u) => u.raw).join(', ')}) — 이력서 본문엔 없고 구조화 경력/프로젝트 항목에만 있음, 사실인지 확인`,
    );
  if (r.provenance.jobSourced.length)
    parts.push(`공고 출처 수치 ${r.provenance.jobSourced.length}개(본인 성과로 쓰지 않았는지 확인)`);
  const adv = r.signals.filter((s) => s.count > 0);
  if (adv.length) parts.push('문체 신호: ' + adv.map((s) => `${s.label.split('(')[0]}×${s.count}`).join(', '));
  if (!parts.length) parts.push('자동 점검 통과(셀 수 있는 항목 기준). 의미 판단은 직접 확인하세요.');
  return parts.join(' · ');
}
