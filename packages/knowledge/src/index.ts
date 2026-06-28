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

/** 7 verifier rubrics — 1:1 with docs/career-os/knowledge/verifiers/<id>.md (CONTRACT C3).
 *  ai-detection-risk: additive (한국 AI-자소서 탐지 시장 전용 — 진정성·면접 방어가능성 점검,
 *  탐지기 우회가 아님). human-voice(문체 "AI 티")와 역할이 다르다. */
export const VERIFIER_IDS = [
  'truthfulness',
  'consistency',
  'recency-staleness',
  'responsiveness-on-target',
  'ats-compat',
  'human-voice',
  'ai-detection-risk',
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
  // R22(audit): responsiveness-on-target는 한국 문항형 자소서 전용 검증기(문항별 1:1 응답·
  // 글자수 상·하한 = "핵심 탈락 사유")인데 analyze_job에만 라우팅돼 있어 정작 자소서 자가검증
  // 루프에서 빠져 있었다. 동문서답·미응답 문항·글자수 초과를 잡도록 write_cover_letter에 추가.
  write_cover_letter: {
    eop: 'cover-letter',
    expertSequence: ['cover-letter', 'human-writing', 'company-research'],
    // ai-detection-risk: 한국 자소서는 AI 탐지(무하유 GPT킬러 등)가 제도화돼 있어, 저장 전
    // "진정성·면접 방어가능성·자기복제 여부"를 점검한다(탐지 우회가 아님 — 짝은 human-voice).
    verifierSequence: ['human-voice', 'truthfulness', 'responsiveness-on-target', 'ats-compat', 'consistency', 'ai-detection-risk'],
    loop: 'draft_verify_revise',
  },
  write_career_description: {
    eop: 'career-description',
    expertSequence: ['resume', 'ats'],
    verifierSequence: ['truthfulness', 'consistency', 'ats-compat', 'ai-detection-risk'],
    loop: 'draft_verify_revise',
  },
  prepare_interview: {
    eop: 'interview-prep',
    expertSequence: ['recruiter-screen', 'interview-behavioral', 'interview-technical', 'company-research'],
    // R22(audit): recency-staleness 추가 — 면접의 "최근 소식"·회사 근황이 낡으면 거짓 신선도가
    // 되므로(company-research) 저장 전 신선도 점검을 푸시한다.
    verifierSequence: ['truthfulness', 'consistency', 'recency-staleness'],
    loop: 'draft_verify_revise',
  },
  // R7 A2: manage_application_status had no route → rejection-triage / offer-evaluation /
  // salary-negotiation were orphaned (served only on-demand via get_playbook). Route the
  // decision-stage playbooks so they are pushed when the user manages application outcomes.
  // R7 A4: A2 routed the decision-stage playbooks, but the EOP-free lifecycle domains
  // onboarding-first-90-days and networking-referrals were still on-demand-only. Anchor them
  // here (the only EOP-free lifecycle route). NOTE: networking's strongest lever is *before*
  // applied (pre-referral, networking-referrals §2) — this route is the surfacing point, not
  // the recommended timing, so surface networking early when the user is pre-application.
  // linkedin-profile/portfolio stay on-demand pending a dedicated personal-brand workflow id
  // (FIXES.md / STATUS §7.9 follow-up — onboarding EOP is résumé-import-only, so brand-
  // creation playbooks would blur its stage meaning). Additive wiring (A1/A2 precedent).
  manage_application_status: {
    expertSequence: [
      'rejection-triage-iteration',
      'offer-evaluation-decision',
      'salary-negotiation',
      'onboarding-first-90-days',
      'networking-referrals',
    ],
    // R22(audit): recency-staleness 추가 — 연봉 벤치마크·오퍼 비교는 시점이 지나면 낡은 기준이
    // 되므로(salary-negotiation/offer-evaluation) 저장 전 신선도 점검을 푸시한다.
    verifierSequence: ['truthfulness', 'consistency', 'recency-staleness'],
  },
  // R7 후속: linkedin-profile·portfolio는 onboarding(이력서 임포트)과 단계 의미가
  // 달라(개인 브랜드 자산 *생성*) 전용 워크플로우로 분리(consensus 권고). networking은
  // manage_application_status에 이미 정박. 저장은 add_resume(kind=portfolio); linkedin
  // 전용 저장/검증은 Phase B.
  build_personal_brand: {
    expertSequence: ['linkedin-profile', 'portfolio'],
    verifierSequence: ['truthfulness', 'human-voice', 'consistency'],
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
