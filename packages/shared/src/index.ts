/**
 * @careermate/shared — single source of truth for types, enums, and zod schemas
 * shared by the DB layer, core use-cases, HTTP API, and MCP server.
 */
export * from './enums.ts';
export * from './schemas.ts';
export { APP_VERSION, BUNDLED } from './build-info.ts';

/** Short, URL-safe, sortable-ish id. Avoids a uuid dependency. */
export function newId(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}${time}${rnd}`;
}

/** Current timestamp as ISO-8601 string (stored verbatim in SQLite). */
export function now(): string {
  return new Date().toISOString();
}
