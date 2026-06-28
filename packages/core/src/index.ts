/**
 * @careermate/core — transport-agnostic business use-cases. The HTTP API and the
 * MCP server both call into these so the dashboard and the AI always agree.
 */
export * from './onboarding.ts';
export * from './context.ts';
export * from './services.ts';
export * from './summary.ts';
export * from './jobsearch.ts';
export * from './verify/index.ts';
