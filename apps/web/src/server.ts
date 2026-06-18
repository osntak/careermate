/**
 * HTTP server: security gate → API router → static dashboard (SPA fallback) and
 * the install page. Bound to loopback only.
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, writeRuntimeInfo, clearRuntimeInfo } from '@careermate/db';
import { BUNDLED } from '@careermate/shared';
import { checkRequest, injectToken } from './security.ts';
import { Router, sendJson, sendDownload, serveStatic, HttpError } from './http.ts';
import { registerApiRoutes, isDownload } from './routes.ts';
import { setServerPort } from './info.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dev(tsx): apps/web/src 기준 상대경로 · prod(dist/web.mjs): dist 기준.
const WEB_ROOT = BUNDLED ? path.resolve(__dirname, 'public') : path.resolve(__dirname, '..', 'public');
const INSTALL_ROOT = BUNDLED
  ? path.resolve(__dirname, 'site')
  : path.resolve(__dirname, '..', '..', '..', 'site');

const router = new Router();
registerApiRoutes(router);

export interface StartedServer {
  server: http.Server;
  port: number;
  url: string;
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    try {
      // Security gate runs before any work.
      const decision = checkRequest(req);
      if (!decision.ok) {
        sendJson(res, decision.status ?? 403, { error: '접근이 거부되었습니다.', code: decision.reason });
        return;
      }

      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const pathname = url.pathname;

      // API routes.
      if (pathname.startsWith('/api/')) {
        const matched = router.match(req.method ?? 'GET', pathname);
        if (!matched) {
          sendJson(res, 404, { error: '존재하지 않는 API 경로입니다.', path: pathname });
          return;
        }
        const result = await matched.handler({
          req,
          res,
          params: matched.params,
          query: url.searchParams,
          url,
        });
        if (res.writableEnded) return;
        if (isDownload(result)) {
          const d = result.__download;
          sendDownload(res, d.filename, d.mimeType, d.content);
        } else {
          sendJson(res, 200, result ?? { ok: true });
        }
        return;
      }

      // Install page (human + AI onboarding) served under /install.
      // Redirect the bare /install to /install/ so the page's relative asset
      // URLs (style.css, etc.) resolve under /install/ instead of the site root.
      if (pathname === '/install') {
        res.writeHead(308, { Location: `/install/${url.search}` });
        res.end();
        return;
      }
      if (pathname.startsWith('/install/')) {
        // The install page is public static guidance and uses no API/CSRF token,
        // so do not inject the session token there (least privilege).
        const rel = pathname === '/install/' ? 'index.html' : pathname.slice('/install/'.length);
        if (serveStatic(res, INSTALL_ROOT, rel)) return;
        if (serveStatic(res, INSTALL_ROOT, 'index.html')) return;
      }

      // Dashboard static assets, with SPA fallback to index.html.
      const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (serveStatic(res, WEB_ROOT, rel, injectToken)) return;
      if (serveStatic(res, WEB_ROOT, 'index.html', injectToken)) return;

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message, code: err.code });
      } else {
        // Never leak résumé/cover-letter content into logs or responses.
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[careermate] 요청 처리 중 오류:', message);
        sendJson(res, 500, { error: '서버 오류가 발생했습니다.' });
      }
    }
  });
}

/**
 * Start on the desired port, falling back to the next free port if taken.
 * Always binds 127.0.0.1 — never 0.0.0.0 — so the server is unreachable from the
 * network.
 */
export function startServer(preferredPort: number): Promise<StartedServer> {
  // Ensure the DB exists/migrated before accepting requests.
  getDb();
  const server = createServer();

  return new Promise((resolve, reject) => {
    let attempt = 0;
    // Persistent handlers (attached once). Re-calling server.listen() on the same
    // server for retries must NOT pass a one-time 'listening' callback per attempt:
    // those accumulate and all fire on the eventual bind, so the FIRST (wrong) port
    // would win the resolve. Instead read the real bound port from server.address().
    const onError = (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE' && attempt < 15) {
        attempt++;
        server.listen(preferredPort + attempt, '127.0.0.1');
      } else {
        reject(e);
      }
    };
    server.on('error', onError);
    server.once('listening', () => {
      server.removeListener('error', onError);
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : preferredPort;
      setServerPort(port);
      const url = `http://127.0.0.1:${port}`;
      // Publish our address so the MCP server (a separate process) can find us.
      writeRuntimeInfo({ url, port, pid: process.pid, started_at: new Date().toISOString() });
      const cleanup = () => {
        clearRuntimeInfo();
        process.exit(0);
      };
      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
      resolve({ server, port, url });
    });
    server.listen(preferredPort, '127.0.0.1');
  });
}
