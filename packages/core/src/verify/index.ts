/**
 * @careermate/core/verify — deterministic, LLM-free verification primitives.
 *
 * The "machine check, not self-grade" layer: number/fact provenance (hard gate
 * for suspected fabrication) + Korean style lint (advisory). Pure functions; the
 * corpus is collected from the DB by services.ts so the connected AI can never
 * inject support values (zero-ai invariant).
 */
export * from './normalize.ts';
export * from './lexicons.ts';
export * from './charcount.ts';
export * from './lint.ts';
