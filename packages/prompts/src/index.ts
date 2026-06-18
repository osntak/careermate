/**
 * @careermate/prompts — public entry point.
 *
 * Exports the well-structured prompt strings plus a small registry so the web
 * app and MCP server can list, look up, and render the prompts.
 */
export { CAREERMATE_SYSTEM_PROMPT } from './system.ts';
export {
  INSTALL_PROMPT_CLAUDE,
  INSTALL_PROMPT_CHATGPT,
  INSTALL_PROMPT_GENERIC,
} from './install.ts';
export { ONBOARDING_PROMPT } from './onboarding.ts';
export { HUMANIZE_WRITING_GUIDE } from './humanize.ts';

import { CAREERMATE_SYSTEM_PROMPT } from './system.ts';
import {
  INSTALL_PROMPT_CLAUDE,
  INSTALL_PROMPT_CHATGPT,
  INSTALL_PROMPT_GENERIC,
} from './install.ts';
import { ONBOARDING_PROMPT } from './onboarding.ts';
import { HUMANIZE_WRITING_GUIDE } from './humanize.ts';

/** Which assistant / surface a prompt is meant for. */
export type PromptAudience = 'system' | 'claude' | 'chatgpt' | 'generic' | 'all';

export interface PromptEntry {
  /** Stable machine id (used by getPrompt and the web/MCP listing). */
  id: string;
  /** Human-facing title (Korean). */
  title: string;
  /** Target assistant / surface. */
  audience: PromptAudience;
  /** The prompt body itself. */
  body: string;
}

/** All CareerMate prompts, listable by the web app and MCP server. */
export const PROMPTS: PromptEntry[] = [
  {
    id: 'system',
    title: 'CareerMate 시스템 프롬프트 (AI 동작 방식)',
    audience: 'system',
    body: CAREERMATE_SYSTEM_PROMPT,
  },
  {
    id: 'install_claude',
    title: 'Claude 설치 프롬프트',
    audience: 'claude',
    body: INSTALL_PROMPT_CLAUDE,
  },
  {
    id: 'install_chatgpt',
    title: 'ChatGPT 설치 프롬프트',
    audience: 'chatgpt',
    body: INSTALL_PROMPT_CHATGPT,
  },
  {
    id: 'install_generic',
    title: '범용 AI 설치 프롬프트',
    audience: 'generic',
    body: INSTALL_PROMPT_GENERIC,
  },
  {
    id: 'onboarding',
    title: '온보딩 프롬프트 (연결 직후)',
    audience: 'all',
    body: ONBOARDING_PROMPT,
  },
  {
    id: 'humanize_writing',
    title: 'AI 티 안 나는 글쓰기 가이드 (자기소개서 작성)',
    audience: 'all',
    body: HUMANIZE_WRITING_GUIDE,
  },
];

/** Look up a prompt body by id. Returns undefined if the id is unknown. */
export function getPrompt(id: string): string | undefined {
  return PROMPTS.find((p) => p.id === id)?.body;
}
