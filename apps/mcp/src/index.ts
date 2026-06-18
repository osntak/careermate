/**
 * CareerMate MCP server (stdio).
 *
 * Launched by the AI client (Claude Desktop, ChatGPT, Cursor, …). It registers
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
import { getDb, getDataDir } from '@careermate/db';
import { TOOLS, toCallToolResult } from '@careermate/mcp-tools';
import { APP_VERSION } from '@careermate/shared';

async function main(): Promise<void> {
  // Ensure the DB is created/migrated before serving any tool call.
  getDb();

  const server = new McpServer(
    { name: 'careermate', version: APP_VERSION },
    {
      instructions:
        'CareerMate는 사용자의 로컬 커리어 데이터베이스입니다. 공고 분석이나 자기소개서 작성 전에는 항상 get_application_context를 먼저 호출해 사용자 정보를 가져오고(응답의 recommended_route·next_tool가 다음 호출을 안내합니다), 이어 get_workflow_guide로 그 작업의 전문가 실행 절차와 검증 순서를 받아 적용하세요. 결과는 save_fit_analysis / save_cover_letter_version 등으로 다시 저장하되, 저장 직전 안내된 get_verifier 루브릭으로 당신이 스스로 점검하세요 — CareerMate는 셀 수 있는 항목만 돌려주고 분석·작성·판단은 당신(AI)이 합니다. 모든 데이터는 사용자 로컬에만 저장됩니다.',
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
          openWorldHint: false,
        },
      },
      async (args: unknown) => {
        try {
          const result = await tool.handler(args ?? {});
          return toCallToolResult(result);
        } catch (err) {
          // Never leak document bodies; return a safe message.
          const message = err instanceof Error ? err.message : '도구 실행 중 오류가 발생했습니다.';
          return toCallToolResult({ text: message, isError: true });
        }
      },
    );
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // IMPORTANT: never write to stdout — it is the MCP transport. Logs go to stderr.
  console.error(`[careermate-mcp] 연결됨 · 도구 ${TOOLS.length}개 · 데이터: ${getDataDir()}`);
}

main().catch((err) => {
  console.error('[careermate-mcp] 시작 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
