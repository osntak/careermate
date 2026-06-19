/**
 * One-shot MCP probe used by `npm test`. Connects to the CareerMate MCP server
 * over real stdio, exercises a few tools, and prints a single JSON line of
 * results to stdout. The parent test invokes this via spawnSync (which fully
 * reaps the child), so the parent's own exit code stays clean on Windows where
 * a long-lived tsx child otherwise corrupts it.
 *
 * Inherits CAREERMATE_DATA_DIR from the parent so it hits the same database.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', 'apps/mcp/src/index.ts'],
  env: { ...process.env } as Record<string, string>,
  cwd: repoRoot,
  stderr: 'ignore',
});

const client = new Client({ name: 'mcp-probe', version: '1.0.0' });
const parse = (r: any) => {
  const j = r.content?.find((c: any) => typeof c.text === 'string' && c.text.startsWith('```json'));
  return j ? JSON.parse(j.text.replace(/```json\n|\n```/g, '')) : r.structuredContent;
};

try {
  await client.connect(transport);
  const tools = (await client.listTools()).tools;
  const profile = parse(await client.callTool({ name: 'get_profile', arguments: {} }));
  const job = parse(await client.callTool({ name: 'save_job_posting', arguments: { company: '쿠팡', position: '데이터 엔지니어' } }));
  const out = {
    ok: true,
    toolCount: tools.length,
    hasContext: tools.some((t) => t.name === 'get_application_context'),
    profileName: profile?.name ?? null,
    profileHeadline: profile?.headline ?? null,
    jobId: job?.id ?? null,
  };
  process.stdout.write('RESULT ' + JSON.stringify(out) + '\n');
  await client.close();
  const pid = (transport as unknown as { _process?: { pid?: number } })._process?.pid;
  if (pid && process.platform === 'win32') {
    const { spawnSync } = await import('node:child_process');
    spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' });
  }
} catch (e) {
  process.stdout.write('RESULT ' + JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }) + '\n');
}
// Exit code intentionally ignored by the parent (it reads stdout); may be
// corrupted by the tsx child teardown on Windows, which is fine here.
setTimeout(() => process.exit(0), 300).unref();
