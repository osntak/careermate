/**
 * Regression tests for the MCP → dashboard bridge.
 *
 * The user-facing promise: when an AI calls `open_dashboard`, the dashboard
 * should start in a background process and keep serving after the tool call
 * returns. A stale server.json must not trick the bridge into opening a dead URL.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let pass = 0;
let fail = 0;

function ok(name: string, condition: unknown, extra = ''): void {
  if (condition) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

async function waitUntil(condition: () => boolean, timeoutMs: number): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (condition()) return true;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return condition();
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-bridge-'));
process.env.CAREERMATE_DATA_DIR = tmp;
process.env.CAREERMATE_PORT = '46190';
process.env.CAREERMATE_NO_OPEN = '1';
process.env.CAREERMATE_LAUNCHER = 'detached';

console.log('\nMCP ↔ 대시보드 브리지');

const { ensureServer, resolveDashboardUrl } = await import('../packages/mcp-tools/src/bridge.ts');
const { writeRuntimeInfo, readRuntimeInfo, clearRuntimeInfo, isProcessAlive } = await import('../packages/db/src/runtime.ts');

let dashboardPid: number | null = null;

try {
  // PID만 보면 살아있는 것처럼 보이지만 URL은 죽어 있는 상태를 만든다.
  writeRuntimeInfo({
    url: 'http://127.0.0.1:9',
    port: 9,
    pid: process.pid,
    started_at: new Date().toISOString(),
  });

  const started = await ensureServer(20000);
  const info = readRuntimeInfo();
  dashboardPid = info?.pid ?? null;

  ok('stale server.json은 헬스체크로 걸러냄', !!started && started.url !== 'http://127.0.0.1:9');
  ok('대시보드는 별도 프로세스로 실행됨', !!info?.pid && info.pid !== process.pid, `(${info?.pid ?? 'no pid'})`);

  const health = started
    ? await fetch(new URL('/api/health', started.url))
      .then(async (r) => (await r.json()) as { ok?: unknown })
      .catch(() => null)
    : null;
  ok('/api/health 응답 확인', health?.ok === true);

  const resolved = await resolveDashboardUrl('/#/settings');
  ok('resolveDashboardUrl이 열린 서버를 재사용', resolved.running === true && resolved.url.endsWith('/#/settings'));

  const pidBefore = readRuntimeInfo()?.pid;
  await ensureServer(5000);
  const pidAfter = readRuntimeInfo()?.pid;
  ok('이미 실행 중이면 새 서버를 중복 실행하지 않음', !!pidBefore && pidBefore === pidAfter);
} catch (e) {
  fail += 1;
  console.log(`  ❌ 예외 발생: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  if (dashboardPid && dashboardPid !== process.pid) {
    try { process.kill(dashboardPid, 'SIGTERM'); } catch { /* ignore */ }
    await waitUntil(() => !isProcessAlive(dashboardPid!), 5000);
  }
  clearRuntimeInfo();
  // No recursive `fs.rmSync` cleanup: on Node 25 / Windows it hard-crashes the
  // process (0xC0000409), which would drop the still-buffered verdict line below.
  // The unique mkdtemp dir is left for the OS temp sweep (same as test.ts).
}

// Emit the summary as ONE write and wait for its OS-pipe flush callback before
// exiting. process.exit() on Node 25 / Windows can trigger a libuv teardown crash
// that drops still-buffered stdout — and run.mjs derives pass/fail by grepping the
// child's stdout for the BRIDGE_TEST_VERDICT line. Awaiting the write callback
// guarantees the verdict reached the pipe (and run.mjs's capture) first.
const summary =
  `\n결과: ${pass} 통과 · ${fail} 실패\n` +
  `${fail === 0 ? 'BRIDGE_TEST_VERDICT PASS' : `BRIDGE_TEST_VERDICT FAIL ${fail}`}\n`;
await new Promise<void>((r) => process.stdout.write(summary, () => r()));
process.exit(fail === 0 ? 0 : 1);
