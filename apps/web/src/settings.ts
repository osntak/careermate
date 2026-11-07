/**
 * Settings-page helpers only the dashboard needs (desktop shortcut, data location).
 * Backup/restore/export/reset live in @careermate/db (backup.ts) so folder sync in
 * the MCP process can use them too.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getDbPath, getDataDir, getExportsDir } from '@careermate/db';
import { BUNDLED } from '@careermate/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function shQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function cmdQuote(value: string): string {
  return value.replace(/"/g, '""');
}

function appRoot(): string {
  return BUNDLED ? __dirname : path.resolve(__dirname, '..', '..', '..');
}

function shortcutFolder(): string {
  const override = process.env.CAREERMATE_SHORTCUT_DIR?.trim();
  if (override) return override;
  const desktop = path.join(os.homedir(), 'Desktop');
  const parent = fs.existsSync(desktop) ? desktop : getExportsDir();
  return path.join(parent, 'CareerMate 대시보드');
}

function openFolder(dir: string): void {
  try {
    if (process.platform === 'win32') spawn('explorer', [dir], { stdio: 'ignore', detached: true }).unref();
    else if (process.platform === 'darwin') spawn('open', [dir], { stdio: 'ignore', detached: true }).unref();
    else spawn('xdg-open', [dir], { stdio: 'ignore', detached: true }).unref();
  } catch {
    /* best-effort */
  }
}

function macLauncherScript(): string {
  const root = appRoot();
  const dataDir = getDataDir();
  const nodePath = process.execPath;
  const binPath = path.join(root, 'bin', 'careermate.mjs');
  const bundledWeb = BUNDLED ? path.join(root, 'web.mjs') : path.join(root, 'dist', 'web.mjs');

  return `#!/bin/zsh
set -e

export CAREERMATE_DATA_DIR=${shQuote(dataDir)}
NODE=${shQuote(nodePath)}
ROOT=${shQuote(root)}
BIN=${shQuote(binPath)}
BUNDLED_WEB=${shQuote(bundledWeb)}
INFO="$CAREERMATE_DATA_DIR/server.json"

if [ ! -x "$NODE" ]; then
  NODE="$(command -v node || true)"
fi
if [ -z "$NODE" ]; then
  echo "Node.js를 찾지 못했습니다. CareerMate를 설치한 뒤 다시 실행해 주세요."
  exit 1
fi

URL=$("$NODE" -e 'const fs=require("fs"); try { const info=JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(info.url || ""); } catch {}' "$INFO")
if [ -n "$URL" ] && command -v curl >/dev/null 2>&1 && curl -fsS --max-time 1 "$URL/api/health" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

echo "CareerMate 대시보드를 시작합니다."
if [ -f "$BIN" ]; then
  cd "$ROOT"
  exec "$NODE" "$BIN" start
fi

if [ -f "$BUNDLED_WEB" ]; then
  cd "$(dirname "$BUNDLED_WEB")"
  exec "$NODE" --no-warnings --experimental-sqlite "$BUNDLED_WEB"
fi

if command -v careermate >/dev/null 2>&1; then
  exec careermate start
fi

exec npx -y careermate start
`;
}

function windowsLauncherScript(): string {
  const root = appRoot();
  const dataDir = getDataDir();
  const nodePath = process.execPath;
  const binPath = path.join(root, 'bin', 'careermate.mjs');
  const bundledWeb = BUNDLED ? path.join(root, 'web.mjs') : path.join(root, 'dist', 'web.mjs');

  return `@echo off
setlocal
set "CAREERMATE_DATA_DIR=${cmdQuote(dataDir)}"
set "NODE=${cmdQuote(nodePath)}"
set "ROOT=${cmdQuote(root)}"
set "BIN=${cmdQuote(binPath)}"
set "BUNDLED_WEB=${cmdQuote(bundledWeb)}"
set "INFO=%CAREERMATE_DATA_DIR%\\server.json"
set "URL="

if not exist "%NODE%" (
  for /f "usebackq delims=" %%N in (\`where node 2^>nul\`) do (
    set "NODE=%%N"
    goto :node_found
  )
)
:node_found
if not exist "%NODE%" (
  echo Node.js를 찾지 못했습니다. CareerMate를 설치한 뒤 다시 실행해 주세요.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%U in (\`"%NODE%" -e "const fs=require('fs'); try { const info=JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); process.stdout.write(info.url || ''); } catch {}" "%INFO%"\`) do set "URL=%%U"
if defined URL (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 '%URL%/api/health' | Out-Null; Start-Process '%URL%'; exit 0 } catch { exit 1 }"
  if not errorlevel 1 exit /b 0
)

echo CareerMate 대시보드를 시작합니다.
if exist "%BIN%" (
  cd /d "%ROOT%"
  "%NODE%" "%BIN%" start
  exit /b %ERRORLEVEL%
)

if exist "%BUNDLED_WEB%" (
  cd /d "%ROOT%"
  "%NODE%" --no-warnings --experimental-sqlite "%BUNDLED_WEB%"
  exit /b %ERRORLEVEL%
)

where careermate >nul 2>nul
if not errorlevel 1 (
  careermate start
  exit /b %ERRORLEVEL%
)

npx -y careermate start
`;
}

function linuxLauncherScript(): string {
  return macLauncherScript()
    .replace('#!/bin/zsh', '#!/usr/bin/env sh')
    .replace('\n  open "$URL"', '\n  xdg-open "$URL"');
}

export function createDashboardShortcut(open = false): {
  shortcut_dir: string;
  launcher_path: string;
  platform: NodeJS.Platform;
  files: string[];
} {
  const dir = shortcutFolder();
  fs.mkdirSync(dir, { recursive: true });

  const readme = `CareerMate 대시보드 바로가기

- 대시보드가 이미 실행 중이면 브라우저만 엽니다.
- 대시보드가 꺼져 있으면 서버를 시작하고 브라우저를 엽니다.
- 이 폴더는 이 컴퓨터의 CareerMate 설치 경로와 데이터 폴더를 기준으로 만들어졌습니다.
`;
  const readmePath = path.join(dir, 'README.txt');
  fs.writeFileSync(readmePath, readme, 'utf8');

  let launcherPath: string;
  if (process.platform === 'win32') {
    launcherPath = path.join(dir, 'CareerMate 대시보드.cmd');
    fs.writeFileSync(launcherPath, windowsLauncherScript(), 'utf8');
  } else if (process.platform === 'darwin') {
    launcherPath = path.join(dir, 'CareerMate 대시보드.command');
    fs.writeFileSync(launcherPath, macLauncherScript(), { encoding: 'utf8', mode: 0o755 });
    fs.chmodSync(launcherPath, 0o755);
  } else {
    launcherPath = path.join(dir, 'careermate-dashboard.sh');
    fs.writeFileSync(launcherPath, linuxLauncherScript(), { encoding: 'utf8', mode: 0o755 });
    fs.chmodSync(launcherPath, 0o755);
  }

  if (open) openFolder(dir);

  return {
    shortcut_dir: dir,
    launcher_path: launcherPath,
    platform: process.platform,
    files: [launcherPath, readmePath],
  };
}

/**
 * Open the OS folder dialog on this PC and return the chosen path (null when cancelled).
 * A browser can't hand over real paths, but the dashboard server runs on the same
 * machine, so it opens the dialog itself. The title goes in via env, never into a command line.
 */
export function pickFolder(title: string): Promise<string | null> {
  const ps = [
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms',
    '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
    '$d.Description = $env:CM_PICK_TITLE',
    '$d.ShowNewFolderButton = $true',
    '$o = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true }',
    "if ($d.ShowDialog($o) -eq 'OK') { $d.SelectedPath }",
  ].join('; ');
  const [cmd, args] =
    process.platform === 'win32'
      ? ['powershell', ['-NoProfile', '-STA', '-Command', ps]]
      : process.platform === 'darwin'
        ? ['osascript', ['-e', 'POSIX path of (choose folder with prompt (system attribute "CM_PICK_TITLE"))']]
        : ['zenity', ['--file-selection', '--directory', `--title=${title}`]];
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { env: { ...process.env, CM_PICK_TITLE: title }, timeout: 10 * 60_000, windowsHide: false }, (err, stdout) => {
      const picked = String(stdout).trim();
      if (picked) return resolve(path.resolve(picked));
      // Cancel exits non-zero on macOS/Linux; a missing tool (ENOENT) is a real error.
      if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') return reject(new Error('폴더 선택 창을 열 수 없습니다. 경로를 직접 입력해 주세요.'));
      resolve(null);
    });
  });
}

export function getDataLocation(): { data_dir: string; db_path: string } {
  return { data_dir: getDataDir(), db_path: getDbPath() };
}
