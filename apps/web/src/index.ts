/**
 * CareerMate local app entry point.
 *
 *   npm start   →   starts the dashboard at http://127.0.0.1:<port> and opens
 *                   your browser. The MCP server (apps/mcp) is launched
 *                   separately by your AI client and shares the same database.
 */
import { spawn } from 'node:child_process';
import { startServer } from './server.ts';
import { getDataDir } from '@careermate/db';
import { APP_VERSION } from './info.ts';

const DEFAULT_PORT = Number(process.env.CAREERMATE_PORT ?? 4319);

function openBrowser(url: string): void {
  if (process.env.CAREERMATE_NO_OPEN === '1') return;
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true }).unref();
    } else if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true }).unref();
    }
  } catch {
    /* opening the browser is best-effort */
  }
}

async function main(): Promise<void> {
  const { url } = await startServer(DEFAULT_PORT);
  const line = '─'.repeat(54);
  console.log(`\n┌${line}┐`);
  console.log(`  CareerMate v${APP_VERSION} — 내 커리어 흐름 관리 도구`);
  console.log(`${' '.repeat(2)}${'┄'.repeat(52)}`);
  console.log(`  대시보드   ${url}`);
  console.log(`  설치 안내   ${url}/install`);
  console.log(`  데이터 위치 ${getDataDir()}`);
  console.log(`  (모든 데이터는 이 컴퓨터에만 저장됩니다)`);
  console.log(`└${line}┘\n`);
  console.log(`종료하려면 Ctrl+C 를 누르세요.`);
  openBrowser(url);
}

main().catch((err) => {
  console.error('CareerMate 시작 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
