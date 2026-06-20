/**
 * HTTP server: security gate → API router → static dashboard (SPA fallback) and
 * the install page. Bound to loopback only.
 */
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, writeRuntimeInfo, clearRuntimeInfo } from '@careermate/db';
import { BUNDLED, CareerMateError } from '@careermate/shared';
import { checkRequest, injectToken } from './security.ts';
import { Router, sendJson, sendDownload, serveStatic, HttpError } from './http.ts';
import { registerApiRoutes, isDownload } from './routes.ts';
import { setServerPort } from './info.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// dev(tsx): apps/web/src 기준 상대경로 · prod(dist/web.mjs): dist 기준.
const WEB_ROOT = BUNDLED ? path.resolve(__dirname, 'public') : path.resolve(__dirname, '..', 'public');
// 설치·온보딩 안내 페이지는 공개 사이트에서 서빙한다(번들에 동봉하지 않음). /install 라우트는
// 이 URL로 리다이렉트해 항상 최신·완전한 랜딩을 보여준다. package.json homepage와 일치시킬 것.
const LANDING_URL = 'https://careermate.life/';

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

      // 설치·온보딩 안내(human + AI)는 공개 사이트에서 서빙한다. 번들 대시보드는 이미 연결된
      // AI 클라이언트가 띄우므로(연결=온보딩 완료) 로컬 사본은 잉여라 동봉하지 않고, 대시보드
      // 설정의 "설치·연결 안내" 버튼이 여는 /install 은 공개 사이트로 리다이렉트한다. 302(임시)는
      // 나중에 대상 변경 시 브라우저 캐시에 고착되지 않게 하기 위함.
      if (pathname === '/install' || pathname.startsWith('/install/')) {
        res.writeHead(302, { Location: LANDING_URL });
        res.end();
        return;
      }

      // Dashboard static assets, with SPA fallback to index.html.
      const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (serveStatic(res, WEB_ROOT, rel, injectToken)) return;
      if (serveStatic(res, WEB_ROOT, 'index.html', injectToken)) return;

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message, code: err.code });
      } else if (err instanceof CareerMateError) {
        // Expected domain failure (공고 없음, 금지된 전환, 저장 게이트 …). Its message is
        // user-facing Korean guidance — surface it with the right status, exactly
        // as the MCP layer relays e.message. Mirrors how chat shows the real reason.
        sendJson(res, err.httpStatus, { error: err.message, code: err.code });
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
