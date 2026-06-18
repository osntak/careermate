/**
 * Bridge from the MCP process to the local dashboard process.
 *
 * `open_dashboard` / `open_application` need the running web server's URL. The
 * web server publishes it to a runtime file (see @careermate/db runtime). If the
 * server isn't running we start it (detached) and wait for it to register.
 */
import { spawn, type SpawnOptions } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRuntimeInfo, isProcessAlive } from '@careermate/db';
import { BUNDLED } from '@careermate/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// packages/mcp-tools/src -> repo root (dev). 번들에서는 __dirname이 dist/ 이다.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export function projectRoot(): string {
  return REPO_ROOT;
}

function liveServer() {
  const info = readRuntimeInfo();
  if (info && isProcessAlive(info.pid)) return info;
  return null;
}

/**
 * Fire-and-forget detached spawn that NEVER throws — synchronously OR
 * asynchronously. A missing binary (e.g. `xdg-open` on a headless Linux box)
 * makes spawn emit an async `'error'` event; with no listener that becomes an
 * uncaughtException and crashes the MCP process. A surrounding try/catch only
 * guards the synchronous spawn() call, not the later event — so attach the
 * listener here. stdio defaults to 'ignore'; callers may override via opts.
 */
function spawnDetached(cmd: string, args: string[], opts: SpawnOptions = {}): void {
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, ...opts });
    child.on('error', () => {
      /* binary missing / spawn failed — best-effort, never crash */
    });
    child.unref();
  } catch {
    /* best-effort */
  }
}

/** Start the dashboard server detached and wait until it publishes its address. */
export async function ensureServer(timeoutMs = 12000): Promise<{ url: string } | null> {
  const existing = liveServer();
  if (existing) return { url: existing.url };

  // prod(번들): dist/web.mjs를 플레인 node로 실행. dev: tsx로 소스 실행.
  const [bin, args, cwd] = BUNDLED
    ? [process.execPath, ['--experimental-sqlite', path.join(__dirname, 'web.mjs')], __dirname]
    : [process.execPath, ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', 'apps/web/src/index.ts'], REPO_ROOT];
  // Spawn failures (sync or async) just leave the server down; the poll loop
  // below then times out and returns null — no crash.
  spawnDetached(bin as string, args as string[], { cwd: cwd as string, env: { ...process.env, CAREERMATE_NO_OPEN: '1' } });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = liveServer();
    if (info) return { url: info.url };
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

/** Open a URL or a local folder via the OS default handler. Best-effort, never throws. */
function openOsTarget(target: string): void {
  switch (process.platform) {
    case 'win32':
      // `start` is a cmd builtin; the empty "" is the window-title arg so a
      // quoted target isn't mistaken for the title. (explorer also opens URLs,
      // but `start` is the canonical default-handler launcher.)
      spawnDetached('cmd', ['/c', 'start', '', target]);
      break;
    case 'darwin':
      spawnDetached('open', [target]);
      break;
    default:
      spawnDetached('xdg-open', [target]);
  }
}

export function openInBrowser(url: string): void {
  openOsTarget(url);
}

/** Open a local folder in the OS file manager (Explorer/Finder/xdg). Best-effort. */
export function openInFileManager(dir: string): void {
  // Windows: `explorer <dir>` is the idiomatic folder opener (start "" <dir>
  // also works, but explorer focuses an existing window if already open).
  if (process.platform === 'win32') spawnDetached('explorer', [dir]);
  else openOsTarget(dir);
}

/** Resolve the dashboard URL, starting the server if needed. */
export async function resolveDashboardUrl(hash = ''): Promise<{ url: string; running: boolean }> {
  const live = liveServer();
  if (live) return { url: live.url + hash, running: true };
  const started = await ensureServer();
  if (started) return { url: started.url + hash, running: true };
  return { url: 'http://127.0.0.1:4319' + hash, running: false };
}
