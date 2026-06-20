/**
 * @careermate/knowledge — serves the Career-OS expert playbooks, verifier
 * rubrics, and per-feature execution procedures (EOP) to the connected AI.
 *
 * Single source of truth = the markdown under docs/career-os/{eop,knowledge}.
 * CareerMate has no LLM: these documents are *served* to the user's AI so it
 * applies senior-expert procedures and self-verifies before saving. Nothing
 * here computes or judges — that is the connected AI's job (Phase B-1: serve +
 * route; the det engine / save-time gates are deferred to B-2, see
 * docs/career-os/implementation/README.md).
 *
 * Content is read from disk lazily and cached. The path resolves in both
 * runtimes (mirrors the apps/web WEB_ROOT BUNDLED pattern):
 *   - source / tsx : <repo or package root>/docs/career-os
 *                    (this file is packages/knowledge/src/index.ts → up 3)
 *   - dist bundle  : <dist>/career-os
 *                    (scripts/build-dist.mjs copies docs/career-os → dist/career-os)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUNDLED } from '@careermate/shared';

const here = path.dirname(fileURLToPath(import.meta.url));
const CAREER_OS_DIR = BUNDLED
  ? path.join(here, 'career-os')
  : path.resolve(here, '..', '..', '..', 'docs', 'career-os');

/** 16 expert domains — 1:1 with docs/career-os/knowledge/<domain>.md (CONTRACT C3). */
export const EXPERT_DOMAINS = [
  'resume',
  'ats',
  'cover-letter',
  'fit-matching',
  'human-writing',
  'company-research',
  'recruiter-screen',
  'interview-behavioral',
  'interview-technical',
  'salary-negotiation',
  'offer-evaluation-decision',
  'rejection-triage-iteration',
  'linkedin-profile',
  'portfolio',
  'networking-referrals',
  'onboarding-first-90-days',
] as const;
export type ExpertDomain = (typeof EXPERT_DOMAINS)[number];

/** 6 verifier rubrics — 1:1 with docs/career-os/knowledge/verifiers/<id>.md (CONTRACT C3). */
export const VERIFIER_IDS = [
  'truthfulness',
  'consistency',
  'recency-staleness',
  'responsiveness-on-target',
  'ats-compat',
  'human-voice',
] as const;
export type VerifierId = (typeof VERIFIER_IDS)[number];

/** Per-feature execution procedures — docs/career-os/eop/<feature>.md. */
export const EOP_FEATURES = [
  'fit-analysis',
  'job-analysis',
  'profile-extraction',
  'cover-letter',
  'career-description',
  'interview-prep',
] as const;
export type EopFeature = (typeof EOP_FEATURES)[number];

const cache = new Map<string, string>();
function readDoc(rel: string): string {
  let cached = cache.get(rel);
  if (cached === undefined) {
    cached = fs.readFileSync(path.join(CAREER_OS_DIR, rel), 'utf8');
    cache.set(rel, cached);
  }
  return cached;
}

/** Deep playbook (principles · Do/Don't · Before→After · rubric refs) for a domain. */
export function getPlaybook(domain: ExpertDomain): string {
  return readDoc(`knowledge/${domain}.md`);
}

/** Critic rubric for a verifier id (self-checked by the connected AI, not computed here). */
export function getVerifier(id: VerifierId): string {
  return readDoc(path.join('knowledge', 'verifiers', `${id}.md`));
}

/** Thin execution procedure (EOP) for a feature. */
export function getEop(feature: EopFeature): string {
  return readDoc(`eop/${feature}.md`);
}

/** A goal → which EOP, expert playbooks, and verifiers to apply, in order. */
export interface CareerRoute {
  eop?: EopFeature | EopFeature[];
  expertSequence: ExpertDomain[];
  verifierSequence: VerifierId[];
  loop?: 'draft_verify_revise';
}

/** Routes keyed by the existing get_workflow_guide workflow ids (additive — CONTRACT C3/C5). */
export const CAREER_ROUTES: Record<string, CareerRoute> = {
  onboarding: {
    eop: 'profile-extraction',
    expertSequence: ['resume'],
    verifierSequence: ['truthfulness', 'consistency'],
  },
  analyze_job: {
    eop: ['job-analysis', 'fit-analysis'],
    expertSequence: ['fit-matching', 'company-research'],
    verifierSequence: ['truthfulness', 'consistency', 'responsiveness-on-target'],
    loop: 'draft_verify_revise',
  },
  write_cover_letter: {
    eop: 'cover-letter',
    expertSequence: ['cover-letter', 'human-writing', 'company-research'],
    verifierSequence: ['human-voice', 'truthfulness', 'ats-compat', 'consistency'],
    loop: 'draft_verify_revise',
  },
  write_career_description: {
    eop: 'career-description',
    expertSequence: ['resume', 'ats'],
    verifierSequence: ['truthfulness', 'consistency', 'ats-compat'],
    loop: 'draft_verify_revise',
  },
  prepare_interview: {
    eop: 'interview-prep',
    expertSequence: ['recruiter-screen', 'interview-behavioral', 'interview-technical', 'company-research'],
    verifierSequence: ['truthfulness', 'consistency'],
    loop: 'draft_verify_revise',
  },
  // R7 A2: manage_application_status had no route → rejection-triage / offer-evaluation /
  // salary-negotiation were orphaned (served only on-demand via get_playbook). Route the
  // decision-stage playbooks so they are pushed when the user manages application outcomes.
  manage_application_status: {
    expertSequence: ['rejection-triage-iteration', 'offer-evaluation-decision', 'salary-negotiation'],
    verifierSequence: ['truthfulness', 'consistency'],
  },
};

export function getRoute(id: string): CareerRoute | undefined {
  return CAREER_ROUTES[id];
}

/**
 * Render a route as the inline guide appended to get_workflow_guide: the EOP
 * execution procedure + which playbooks/verifiers to pull next. This is the
 * consumption wiring (CONTRACT C7) that makes the expert layer actually reach
 * the connected AI instead of sitting orphaned in docs/.
 */
export function renderRouteGuide(id: string): string | undefined {
  const route = CAREER_ROUTES[id];
  if (!route) return undefined;
  const lines: string[] = [];
  const eops = route.eop ? (Array.isArray(route.eop) ? route.eop : [route.eop]) : [];
  if (eops.length) {
    lines.push('---', '');
    lines.push('## 전문가 실행 절차 (EOP) — 즉답하지 말고 이 절차를 따르세요');
    lines.push('');
    for (const e of eops) {
      lines.push(getEop(e));
      lines.push('');
    }
  }
  lines.push('## 이 작업에 적용할 전문가 플레이북');
  lines.push('작성 직전, 아래 도메인의 깊은 지식을 받아 적용하세요:');
  for (const d of route.expertSequence) lines.push(`- \`get_playbook({ domain: "${d}" })\``);
  lines.push('');
  lines.push('## 저장 전 자가검증 (verifier)');
  lines.push(
    '저장(save_*) 직전, 아래 루브릭을 받아 **당신이 직접** 점검하고 고치세요(통과/판단은 당신 몫 — CareerMate는 셀 수 있는 것만 돕습니다):',
  );
  for (const v of route.verifierSequence) lines.push(`- \`get_verifier({ id: "${v}" })\``);
  if (route.loop) {
    lines.push('');
    lines.push(
      '> 루프: 초안 → 자가검증 → 수정. 같은 핵심 결함(허위 수치·미앵커 사실)이 2번 고쳐도 남으면 멈추고 사용자에게 사실을 확인하세요(무한정 고쳐쓰지 않음).',
    );
  }
  return lines.join('\n');
}
