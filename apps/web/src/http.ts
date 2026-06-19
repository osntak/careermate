/**
 * Minimal HTTP plumbing built on node:http — a tiny router, JSON helpers,
 * size-limited body parsing, and path-traversal-safe static file serving.
 * Kept dependency-free so installation is a single `npm install`.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ZodError, type ZodTypeAny, type output } from 'zod';

export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: URLSearchParams;
  url: URL;
}

export type Handler = (ctx: Ctx) => unknown | Promise<unknown>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const MAX_BODY = 32 * 1024 * 1024; // 32 MB — enough for local JSON backups, still bounded.

export class Router {
  private routes: Route[] = [];

  add(method: string, path: string, handler: Handler): this {
    const keys: string[] = [];
    const pattern = new RegExp(
      '^' +
        path.replace(/:[^/]+/g, (m) => {
          keys.push(m.slice(1));
          return '([^/]+)';
        }) +
        '/?$',
    );
    this.routes.push({ method: method.toUpperCase(), pattern, keys, handler });
    return this;
  }

  get(p: string, h: Handler) { return this.add('GET', p, h); }
  post(p: string, h: Handler) { return this.add('POST', p, h); }
  put(p: string, h: Handler) { return this.add('PUT', p, h); }
  patch(p: string, h: Handler) { return this.add('PATCH', p, h); }
  delete(p: string, h: Handler) { return this.add('DELETE', p, h); }

  match(method: string, pathname: string): { handler: Handler; params: Record<string, string> } | null {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = r.pattern.exec(pathname);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)));
      return { handler: r.handler, params };
    }
    return null;
  }
}

/* ----------------------------------------------------------- response helpers */

export function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

export function sendDownload(res: ServerResponse, filename: string, mimeType: string, content: string): void {
  const safe = filename.replace(/[^\w.\-가-힣 ]/g, '_');
  res.writeHead(200, {
    'Content-Type': mimeType,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safe)}`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(content);
}

/** Thrown by handlers to produce a clean error response. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

// Typed by the schema's OUTPUT, not its input: some schemas coerce (e.g. strList
// accepts a string and yields string[]), so input ≠ output. Callers want the
// parsed result, so return `output<S>` (= z.infer) rather than collapsing both.
export async function readJsonBody<S extends ZodTypeAny>(req: IncomingMessage, schema: S): Promise<output<S>>;
export async function readJsonBody(req: IncomingMessage): Promise<unknown>;
export async function readJsonBody(req: IncomingMessage, schema?: ZodTypeAny): Promise<unknown> {
  const raw = await readBody(req);
  if (!raw) return schema ? schema.parse({}) : {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(400, '잘못된 JSON 형식입니다.', 'bad_json');
  }
  if (!schema) return parsed;
  try {
    return schema.parse(parsed);
  } catch (e) {
    if (e instanceof ZodError) {
      // Messages already written as full Korean guidance are shown as-is (the zod
      // path like "links.0.url" is developer jargon). Generic/English messages keep
      // a field hint so the user knows which input to fix.
      const msg = e.issues
        .map((i) => (/[가-힣]/.test(i.message) ? i.message : `${i.path.join('.') || '입력값'}: ${i.message}`))
        .join('\n');
      throw new HttpError(400, msg, 'validation');
    }
    throw e;
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, '요청 본문이 너무 큽니다.', 'too_large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* -------------------------------------------------------------- static files */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

/**
 * Serve a file from `root`, refusing any path that escapes it. Returns false if
 * not found so the caller can fall back (e.g. SPA index).
 */
export function serveStatic(
  res: ServerResponse,
  root: string,
  relPath: string,
  transform?: (html: string) => string,
): boolean {
  const cleaned = decodeURIComponent(relPath).replace(/\0/g, '');
  const resolved = path.resolve(root, '.' + path.posix.normalize('/' + cleaned));
  // Path-traversal guard: resolved file must stay within root.
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return true;
  }
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return false;
  const ext = path.extname(resolved).toLowerCase();
  const mime = MIME[ext] ?? 'application/octet-stream';
  let payload: Buffer | string = fs.readFileSync(resolved);
  if (transform && (ext === '.html')) payload = transform(payload.toString('utf8'));
  const headers: Record<string, string> = {
    'Content-Type': mime,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': ext === '.html' ? 'no-store' : 'no-cache',
  };
  if (ext === '.html') {
    // Content-Security-Policy: with no inline scripts and only same-origin
    // assets, any XSS that slips past escaping can't load external code or
    // exfiltrate (connect-src 'self'). Dashboard pages (served with the token
    // transform) hold the CSRF token and render user-controlled career data, so
    // they get a strict no-inline-script policy. The install page (no transform)
    // is static marketing with inline bootstrap scripts (theme/carousel), so it
    // permits inline script but keeps every other hardening directive.
    const scriptSrc = transform ? "script-src 'self'" : "script-src 'self' 'unsafe-inline'";
    headers['Content-Security-Policy'] = [
      "default-src 'none'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'", // inline style="" attrs + JS-set element styles
      "img-src 'self' data:", // data: favicon + local screenshots/icons
      "font-src 'self'",
      "connect-src 'self'",
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'", // clickjacking guard
    ].join('; ');
  }
  res.writeHead(200, headers);
  res.end(payload);
  return true;
}
