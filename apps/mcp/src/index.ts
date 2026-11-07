/**
 * CareerMate MCP server (stdio).
 *
 * Launched by the AI client (Claude Desktop, Claude Code, Codex, …). It registers
 * every CareerMate tool and talks to the SAME local SQLite database the
 * dashboard uses, so anything the AI writes appears in the dashboard instantly,
 * and anything the user edits in the dashboard is visible to the AI.
 *
 * All reasoning stays in the user's AI. The only outbound network call is an
 * optional version check (check_for_update / update_careermate) against the
 * public npm registry — no user data is sent; disable with CAREERMATE_NO_UPDATE_CHECK.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getDb, getDataDir, closeDb, startSync } from '@careermate/db';
import { TOOLS, toCallToolResult } from '@careermate/mcp-tools';
import { APP_VERSION } from '@careermate/shared';
import { toSafeToolError } from './safe-error.js';

async function main(): Promise<void> {
  getDb();
  await startSync(); // no-op unless CAREERMATE_SYNC_DIR is set

  const server = new McpServer(
    { name: 'careermate', version: APP_VERSION },
    {
      instructions: [
        '필요한 사용자·공고 컨텍스트만 먼저 조회하세요.',
        '저장 전 사실·수치·기간과 개인 기여를 검증하고 미확인 정보는 질문으로 반환하세요.',
        '사용자 제공 사실과 AI 추정을 구분하고 근거 및 경고를 함께 반환하세요.',
        '서로 다른 문서는 각 전용 저장 도구를 사용하세요.',
        '파괴적 작업은 영향과 대상을 설명하고 명시적 확인 후 실행하세요.',
        '사용자 언어와 문서 언어를 유지하고 내부 ID·경로·SQL·원시 JSON을 노출하지 마세요.',
        '구체 절차는 workflow 또는 context 응답의 recommended route를 따르고 같은 도구를 반복 호출하지 마세요.',
      ].join(' '),
    },
  );

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          title: tool.title,
          readOnlyHint: tool.readOnly ?? false,
          openWorldHint: tool.openWorld ?? false,
          destructiveHint: tool.destructive ?? false,
          idempotentHint: tool.idempotent ?? false,
        },
      },
      async (args: unknown) => {
        try {
          const result = await tool.handler(args ?? {});
          return toCallToolResult(result);
        } catch (err) {
          return toCallToolResult({ text: toSafeToolError(err), isError: true });
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  let closing = false;
  const shutdown = (): void => {
    if (closing) return;
    closing = true;
    try {
      closeDb();
    } catch {
      /* best-effort */
    }
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  console.error(`[careermate-mcp] 연결됨 · 도구 ${TOOLS.length}개 · 데이터: ${getDataDir()}`);
}

main().catch((err) => {
  console.error('[careermate-mcp] 시작 실패:', toSafeToolError(err));
  process.exit(1);
});
