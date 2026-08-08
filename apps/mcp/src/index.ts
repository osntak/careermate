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
import { getDb, getDataDir, closeDb } from '@careermate/db';
import { TOOLS, toCallToolResult } from '@careermate/mcp-tools';
import { APP_VERSION } from '@careermate/shared';

async function main(): Promise<void> {
  getDb();

  const server = new McpServer(
    { name: 'careermate', version: APP_VERSION },
    {
      instructions: [
        'CareerMate는 사용자의 로컬 커리어 데이터베이스입니다.',
        '작업 전 관련 사용자·공고 컨텍스트를 조회하고, 응답의 recommended_route 또는 next_tool을 따르세요.',
        '전문 절차가 필요한 작업은 get_workflow_guide를 조회하고, 저장 전 안내된 verifier로 결과를 점검하세요.',
        '경력기술서·자기소개서 등 서로 다른 문서는 각각의 전용 저장 도구로 따로 저장하세요.',
        '분석·작성·판단은 연결된 AI가 수행하며 CareerMate는 저장된 사실과 결정론적 검증 결과만 제공합니다.',
        '항상 사용자가 쓴 언어로 답하고 사실·수치·고유명사는 보존하세요.',
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
          const message = err instanceof Error ? err.message : '도구 실행 중 오류가 발생했습니다.';
          return toCallToolResult({ text: message, isError: true });
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
  console.error('[careermate-mcp] 시작 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
