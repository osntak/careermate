/**
 * Bridge from the MCP process to the local dashboard process.
 *
 * `open_dashboard` / `open_application` need the running web server's URL. The
 * web server publishes it to a runtime file (see @careermate/db runtime). If the
 * server isn't running we start it in the background and wait for it to register.
 */
import { spawn, spawnSync, type SpawnOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDataDir, readRuntimeInfo, isProcessAlive, type RuntimeInfo } from '@careermate/db';
import { BUNDLED } from '@careermate/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// packages/mcp-tools/src -> repo root (dev). 번들에서는 __dirname이 dist/ 이다.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

export function projectRoot(): string {
  return REPO_ROOT;
}

const HEALTH_TIMEOUT_MS = 800;
let pendingStart: Promise<{ url: string } | null> | null = null;

function dashboardLogPath(): string {
  return path.join(getDataDir(), 'server.log');
}

function launchdPlistPath(): string {
  return path.join(getDataDir(), 'dashboard.launchd.plist');
}

function launchdLabel(): string {
  let hash = 5381;
  for (const ch of getDataDir()) hash = ((hash * 33) ^ ch.charCodeAt(0)) >>> 0;
  return `life.careermate.dashboard.${hash.toString(16)}`;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function plistString(key: string, value: string): string {
  return `  <key>${xmlEscape(key)}</key>\n  <string>${xmlEscape(value)}</string>`;
}

function renderLaunchdPlist(bin: string, args: string[], cwd: string, log: string): string {
  const env: Record<string, string> = {
    CAREERMATE_DATA_DIR: getDataDir(),
    CAREERMATE_NO_OPEN: '1',
  };
  if (process.env.CAREERMATE_PORT) env.CAREERMATE_PORT = process.env.CAREERMATE_PORT;
  if (process.env.PATH) env.PATH = process.env.PATH;

  const programArgs = [bin, ...args].map((arg) => `    <string>${xmlEscape(arg)}</string>`).join('\n');
  const envEntries = Object.entries(env).map(([key, value]) => `${plistString(key, value)}`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${xmlEscape(launchdLabel())}</string>
  <key>ProgramArguments</key>
  <array>
${programArgs}
  </array>
  <key>WorkingDirectory</key>
  <string>${xmlEscape(cwd)}</string>
  <key>EnvironmentVariables</key>
  <dict>
${envEntries}
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${xmlEscape(log)}</string>
  <key>StandardErrorPath</key>
  <string>${xmlEscape(log)}</string>
</dict>
</plist>
`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pingDashboard(url: string, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  try {
    const healthUrl = new URL('/api/health', url);
    const res = await fetch(healthUrl, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return false;
    const body = (await res.json().catch(() => null)) as { ok?: unknown } | null;
    return body?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function liveServer(): Promise<RuntimeInfo | null> {
  const info = readRuntimeInfo();
  if (info && isProcessAlive(info.pid) && await pingDashboard(info.url)) return info;
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
function spawnDetached(cmd: string, args: string[], opts: SpawnOptions = {}): number | null {
  try {
    const child = spawn(cmd, args, { stdio: 'ignore', detached: true, ...opts });
    child.on('error', () => {
      /* binary missing / spawn failed — best-effort, never crash */
    });
    child.unref();
    return child.pid ?? null;
  } catch {
    /* best-effort */
    return null;
  }
}

function spawnViaLaunchd(bin: string, args: string[], cwd: string, log: string): boolean {
  if (process.platform !== 'darwin' || process.env.CAREERMATE_LAUNCHER === 'detached') return false;
  if (typeof process.getuid !== 'function') return false;

  const domain = `gui/${process.getuid()}`;
  const label = launchdLabel();
  const plist = launchdPlistPath();
  try {
    fs.writeFileSync(plist, renderLaunchdPlist(bin, args, cwd, log), 'utf8');
    // Remove a stale loaded job for the same data dir. If it is not loaded,
    // launchctl exits non-zero; that is fine and should not block bootstrap.
    spawnSync('launchctl', ['bootout', `${domain}/${label}`], { stdio: 'ignore' });
    const res = spawnSync('launchctl', ['bootstrap', domain, plist], {
      encoding: 'utf8',
      timeout: 5000,
    });
    if (res.status === 0) return true;
    fs.appendFileSync(log, `[${new Date().toISOString()}] launchctl bootstrap failed: ${res.stderr || res.stdout || res.status}\n`);
  } catch (e) {
    try {
      fs.appendFileSync(log, `[${new Date().toISOString()}] launchctl launch failed: ${e instanceof Error ? e.message : String(e)}\n`);
    } catch {
      /* ignore */
    }
  }
  return false;
}

function spawnDashboardDetached(bin: string, args: string[], cwd: string, logFd: number | null): void {
  spawnDetached(bin, args, {
    cwd,
    env: { ...process.env, CAREERMATE_NO_OPEN: '1' },
    stdio: logFd === null ? 'ignore' : ['ignore', logFd, logFd],
  });
}

/** Start the dashboard server in the background and wait until it publishes its address. */
export async function ensureServer(timeoutMs = 12000): Promise<{ url: string } | null> {
  const existing = await liveServer();
  if (existing) return { url: existing.url };
  if (pendingStart) return pendingStart;

  pendingStart = startServerBackground(timeoutMs);
  try {
    return await pendingStart;
  } finally {
    pendingStart = null;
  }
}

async function startServerBackground(timeoutMs: number): Promise<{ url: string } | null> {
  // prod(번들): dist/web.mjs를 플레인 node로 실행. dev: tsx로 소스 실행.
  const [bin, args, cwd] = BUNDLED
    ? [process.execPath, ['--experimental-sqlite', path.join(__dirname, 'web.mjs')], __dirname]
    : [
      process.execPath,
      ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', path.join(REPO_ROOT, 'apps/web/src/index.ts')],
      REPO_ROOT,
    ];
  // Spawn failures (sync or async) just leave the server down; the poll loop
  // below then times out and returns null — no crash.
  const log = dashboardLogPath();
  let logFd: number | null = null;
  try {
    logFd = fs.openSync(log, 'a');
    fs.writeSync(logFd, `\n[${new Date().toISOString()}] CareerMate dashboard background launch\n`);
  } catch {
    logFd = null;
  }
  let launchedViaLaunchd = false;
  try {
    launchedViaLaunchd = spawnViaLaunchd(bin as string, args as string[], cwd as string, log);
    if (!launchedViaLaunchd) spawnDashboardDetached(bin as string, args as string[], cwd as string, logFd);
  } finally {
    if (logFd !== null) {
      try { fs.closeSync(logFd); } catch { /* ignore */ }
    }
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await liveServer();
    if (info) return { url: info.url };
    await delay(300);
  }

  // If launchd accepted the job but the server never became healthy, give the
  // simpler detached path one chance. This protects dev/source installs where
  // launchd has a thinner environment than the invoking AI client.
  if (launchedViaLaunchd) {
    try {
      fs.appendFileSync(log, `[${new Date().toISOString()}] launchd did not produce a healthy server; falling back to detached spawn\n`);
    } catch {
      /* ignore */
    }
    spawnDashboardDetached(bin as string, args as string[], cwd as string, null);
    const fallbackStart = Date.now();
    while (Date.now() - fallbackStart < Math.min(timeoutMs, 8000)) {
      const info = await liveServer();
      if (info) return { url: info.url };
      await delay(300);
    }
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
  const live = await liveServer();
  if (live) return { url: live.url + hash, running: true };
  const started = await ensureServer();
  if (started) return { url: started.url + hash, running: true };
  return { url: 'http://127.0.0.1:4319' + hash, running: false };
}
