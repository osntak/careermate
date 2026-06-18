/**
 * @careermate/workflows — public entry point.
 *
 * Re-exports the workflow data plus helpers to look up a single workflow and
 * render it as readable Korean markdown (used in docs and MCP tool descriptions).
 */
export { WORKFLOWS } from './definitions.ts';
export type { WorkflowDefinition } from './definitions.ts';

import { WORKFLOWS, type WorkflowDefinition } from './definitions.ts';

/** Look up a single workflow by id. Returns undefined if the id is unknown. */
export function getWorkflow(id: string): WorkflowDefinition | undefined {
  return WORKFLOWS.find((w) => w.id === id);
}

/**
 * Render a workflow as a readable Korean markdown block. Used in documentation
 * and as MCP tool descriptions so the AI can read the full step list inline.
 * Returns undefined if the id is unknown.
 */
export function renderWorkflowMarkdown(id: string): string | undefined {
  const wf = getWorkflow(id);
  if (!wf) return undefined;

  const lines: string[] = [];
  lines.push(`# ${wf.title}`);
  lines.push('');
  lines.push(wf.description);
  lines.push('');
  lines.push(`**트리거:** ${wf.trigger}`);
  lines.push('');
  lines.push('## 단계');
  wf.steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  lines.push('');
  return lines.join('\n');
}
