/**
 * Tool result shape shared by every CareerMate MCP tool, plus the conversion to
 * the MCP CallToolResult the SDK expects.
 *
 * We always embed the structured payload as pretty JSON inside the text content
 * (so *any* model/client can read it) AND expose it as `structuredContent` for
 * clients that support it. No output schema is declared, so structuredContent is
 * passed through without validation.
 */
import type { ZodRawShape } from 'zod';

export interface ToolResult {
  text: string;
  data?: unknown;
  isError?: boolean;
}

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  /** Hint flags for clients (readOnly tools don't mutate). */
  readOnly?: boolean;
  handler: (args: any) => ToolResult | Promise<ToolResult>;
}

export function ok(text: string, data?: unknown): ToolResult {
  return { text, data };
}

export function fail(text: string): ToolResult {
  return { text, isError: true };
}

/** Convert a ToolResult into the MCP SDK's CallToolResult. */
export function toCallToolResult(r: ToolResult) {
  const blocks: { type: 'text'; text: string }[] = [{ type: 'text', text: r.text }];
  if (r.data !== undefined) {
    blocks.push({ type: 'text', text: '```json\n' + JSON.stringify(r.data, null, 2) + '\n```' });
  }
  const isPlainObject =
    typeof r.data === 'object' && r.data !== null && !Array.isArray(r.data);
  return {
    content: blocks,
    ...(isPlainObject ? { structuredContent: r.data as Record<string, unknown> } : {}),
    ...(r.isError ? { isError: true } : {}),
  };
}
