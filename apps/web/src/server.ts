/**
 * HTTP server: security gate → API router → static dashboard (SPA fallback) and
 * the install page. Bound to loopback only.
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb, writeRuntimeInfo, clearRuntimeInfo } from '@careermate/db';
import { BUNDLED, CareerMateError } from '@careermate/shared';
import { checkRequest, injectToken } from './security.ts';
import { Router, sendJson, sendDownload, serveStatic, HttpError } from './http.ts';
import { registerApiRoutes, isDownload } from './routes.ts';
import { registerDiagnosticRoutes } from './diagnostic-routes.ts';
import { registerJobSearchRoutes } from './job-search-routes.ts';
import { setServerPort } from './info.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = BUNDLED ? path.resolve(__dirname, 'public') : path.resolve(__dirname, '..', 'public');
const LANDING_URL = 'https://careermate.life/';

const router = new Router();
registerApiRoutes(router);
registerDiagnosticRoutes(router);
registerJobSearchRoutes(router);

export interface StartedServer {
  server: http.Server;
  port: number;
  url: string;
}

export function createServer(): http.Server {
  return http.createServer(async (req, res) => {
    try {
      const decision = checkRequest(req);
      if (!decision.ok) {
        sendJson(res, decision.status ?? 403, { error: '접근이 거부되었습니다.', code: decision.reason });
        return;
      }

      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const pathname = url.pathname;

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
          sendDownload(res, d.filename, d.mimeType, d.bytes ?? d.content);
        } else {
          sendJson(res, 200, result ?? { ok: true });
        }
        return;
      }

      if (pathname === '/install' || pathname.startsWith('/install/')) {
        res.writeHead(302, { Location: LANDING_URL });
        res.end();
        return;
      }

      const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (serveStatic(res, WEB_ROOT, rel, injectToken)) return;
      if (serveStatic(res, WEB_ROOT, 'index.html', injectToken)) return;

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message, code: err.code });
      } else if (err instanceof CareerMateError) {
        sendJson(res, err.httpStatus, { error: err.message, code: err.code });
      } else {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[careermate] 요청 처리 중 오류:', message);
        sendJson(res, 500, { error: '서버 오류가 발생했습니다.' });
      }
    }
  });
}

export function startServer(preferredPort: number): Promise<StartedServer> {
  getDb();
  const server = createServer();

  return new Promise((resolve, reject) => {
    let attempt = 0;
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
      writeRuntimeInfo({ url, port, pid: process.pid, started_at: new Date().toISOString() });

      let closing = false;
      const cleanup = (): void => {
        if (closing) return;
        closing = true;
        clearRuntimeInfo();
        server.close(() => {
          try {
            closeDb();
          } finally {
            process.exitCode = 0;
          }
        });
        server.closeIdleConnections?.();
      };
      process.once('SIGINT', cleanup);
      process.once('SIGTERM', cleanup);

      resolve({ server, port, url });
    });
    server.listen(preferredPort, '127.0.0.1');
  });
}
