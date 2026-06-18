/**
 * @careermate/mcp-tools — the CareerMate tool registry + the conversion helpers
 * the MCP server (apps/mcp) uses to expose them. Kept separate from the server
 * so tools can also be unit-tested or reused in other transports later.
 */
export { TOOLS, EXPORTS_LOCATION } from './tools.ts';
export { ok, fail, toCallToolResult, type ToolDef, type ToolResult } from './result.ts';
export { resolveDashboardUrl, openInBrowser, ensureServer, projectRoot } from './bridge.ts';
export {
  getUpdateStatus,
  getUpdateStatusAsync,
  runSelfUpdate,
  installPrefix,
  compareVersions,
  type UpdateStatus,
  type UpdateResult,
} from './update.ts';
