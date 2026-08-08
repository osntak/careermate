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

const SAFE_ERROR_PATTERNS: Array<[RegExp, string]> = [
  [/SQLITE_BUSY|database is locked/i, '데이터베이스가 사용 중입니다. 잠시 후 다시 시도해 주세요.'],
  [/SQLITE_FULL|database or disk is full/i, '저장 공간이 부족해 작업을 완료하지 못했습니다. 디스크 여유 공간을 확인해 주세요.'],
  [/SQLITE_READONLY|attempt to write a readonly database/i, '데이터 폴더가 읽기 전용이라 저장할 수 없습니다. 폴더 권한을 확인해 주세요.'],
  [/SQLITE_CORRUPT|database disk image is malformed/i, '데이터베이스 손상이 감지되었습니다. 쓰기 작업을 중단하고 백업 복원을 진행해 주세요.'],
];

export function toSafeToolError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  for (const [pattern, message] of SAFE_ERROR_PATTERNS) {
    if (pattern.test(raw)) return message;
  }
  return '도구 실행 중 오류가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.';
}

async function main(): Promise<void> {
  getDb();

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
