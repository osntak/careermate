/**
 * Local-server security.
 *
 * A server bound to localhost is still reachable by *any* web page the user
 * visits (the browser will happily send requests to 127.0.0.1). Two classic
 * attacks follow: DNS-rebinding (a malicious site points its hostname at
 * 127.0.0.1) and CSRF (a malicious page POSTs to our API using the user's
 * browser). We defend with three cheap, layered checks:
 *
 *   1. Host allow-list      — blocks DNS-rebinding (Host must be a loopback name).
 *   2. Origin allow-list    — cross-site requests carry a foreign Origin; reject.
 *   3. Per-session CSRF token — mutations require a header only same-origin
 *                               scripts can read (it's injected into our HTML).
 *
 * We never emit permissive CORS headers, so cross-origin pages cannot read any
 * response even if a request slips through. Everything stays on the machine.
 */
import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';

/** Random token minted once per server start; embedded into served HTML. */
export const SESSION_TOKEN = crypto.randomBytes(24).toString('hex');
export const TOKEN_HEADER = 'x-careermate-token';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function hostOnly(value: string | undefined): string | null {
  if (!value) return null;
  // Strip port. Handle IPv6 in brackets.
  if (value.startsWith('[')) {
    const end = value.indexOf(']');
    return end === -1 ? value.toLowerCase() : value.slice(0, end + 1).toLowerCase();
  }
  return value.split(':')[0]!.toLowerCase();
}

export function isLoopbackHost(hostHeader: string | undefined): boolean {
  const h = hostOnly(hostHeader);
  return h != null && LOOPBACK_HOSTS.has(h);
}

function originHost(origin: string | undefined): string | null {
  if (!origin || origin === 'null') return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export interface SecurityDecision {
  ok: boolean;
  status?: number;
  reason?: string;
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Returns whether a request is allowed. `req.method` and headers are inspected;
 * no body is read here (and bodies are never logged anywhere).
 */
export function checkRequest(req: IncomingMessage): SecurityDecision {
  // 1. Anti DNS-rebinding: Host must be a loopback name.
  if (!isLoopbackHost(req.headers.host)) {
    return { ok: false, status: 403, reason: 'invalid_host' };
  }

  // 2. Cross-origin guard: if an Origin is present it must be loopback.
  const origin = req.headers.origin;
  if (origin) {
    const oh = originHost(origin);
    if (oh == null || !LOOPBACK_HOSTS.has(oh)) {
      return { ok: false, status: 403, reason: 'cross_origin' };
    }
  }

  // 3. CSRF token on mutations.
  if (MUTATING.has(req.method ?? '')) {
    const token = req.headers[TOKEN_HEADER];
    const provided = Array.isArray(token) ? token[0] : token;
    if (!provided || !timingSafeEqual(provided, SESSION_TOKEN)) {
      return { ok: false, status: 403, reason: 'invalid_csrf_token' };
    }
  }

  return { ok: true };
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Inject the session token into an HTML document so same-origin JS can use it. */
export function injectToken(html: string): string {
  const tag = `<meta name="careermate-token" content="${SESSION_TOKEN}">`;
  if (html.includes('</head>')) return html.replace('</head>', `  ${tag}\n</head>`);
  return tag + html;
}
