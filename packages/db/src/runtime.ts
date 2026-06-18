/**
 * Runtime handshake between the two local processes.
 *
 * The web server and the MCP server run independently (the MCP server is
 * launched by the AI client). They find each other through a small JSON file in
 * the data dir: the web server writes its live URL/port/pid on boot; the MCP
 * server reads it so tools like `open_dashboard` can point the browser at the
 * right place — without any network discovery.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDataDir } from './paths.ts';

export interface RuntimeInfo {
  url: string;
  port: number;
  pid: number;
  started_at: string;
}

function runtimeFile(): string {
  return path.join(getDataDir(), 'server.json');
}

export function writeRuntimeInfo(info: RuntimeInfo): void {
  try {
    fs.writeFileSync(runtimeFile(), JSON.stringify(info, null, 2), 'utf8');
  } catch {
    /* non-fatal */
  }
}

export function readRuntimeInfo(): RuntimeInfo | null {
  try {
    const raw = fs.readFileSync(runtimeFile(), 'utf8');
    return JSON.parse(raw) as RuntimeInfo;
  } catch {
    return null;
  }
}

/** True if a process with this pid is currently alive. */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export function clearRuntimeInfo(): void {
  try {
    fs.unlinkSync(runtimeFile());
  } catch {
    /* ignore */
  }
}
