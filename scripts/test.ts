/**
 * `npm test` — end-to-end smoke test of the whole system in one run:
 *   1. core + DB use-cases
 *   2. HTTP API + security gate (CSRF token, Host allow-list, cross-origin)
 *   3. MCP stdio server with a real MCP client (via a spawnSync probe)
 *   4. THE key invariant: the dashboard (API) and the MCP server (separate
 *      process) read & write the SAME local database.
 *
 * Run it through the plain-Node runner: `npm test` (→ scripts/run.mjs), which
 * reads the TEST_VERDICT line below. HTTP calls use node:http with agent:false
 * (no keep-alive pooling) because the spawnSync probe blocks the event loop,
 * which would otherwise leave a stale pooled socket → ECONNRESET.
 *
 * Runs entirely against a throwaway data directory; never touches real data.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import net from 'node:net';
import http from 'node:http';
import { spawnSync } from 'node:child_process';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-e2e-'));
process.env.CAREERMATE_DATA_DIR = tmp;
process.env.CAREERMATE_NO_OPEN = '1';

const { startServer } = await import('../apps/web/src/server.ts');
const { SESSION_TOKEN } = await import('../apps/web/src/security.ts');
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

let pass = 0;
let fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};
const section = (s: string) => console.log(`\n${s}`);

const { port, server } = await startServer(46070);
const ORIGIN = `127.0.0.1:${port}`;

/** Fresh-socket HTTP (no keep-alive) so a blocking spawnSync can't stale a pool. */
function reqRaw(method: string, p: string, body?: unknown, headers: Record<string, string> = {}): Promise<{ status: number; text: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const r = http.request(
      { host: '127.0.0.1', port, path: p, method, agent: false, headers: { 'content-type': 'application/json', ...headers } },
      (res) => { let d = ''; res.on('data', (c) => (d += c)); res.on('end', () => resolve({ status: res.statusCode!, text: d, headers: res.headers })); },
    );
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}
const authed = (m: string, p: string, b?: unknown) => reqRaw(m, p, b, { 'x-careermate-token': SESSION_TOKEN });
const json = async (m: string, p: string, b?: unknown, h?: Record<string, string>) => JSON.parse((await reqRaw(m, p, b, h)).text);

/* ---------------------------------------------------------- 1. API + security */
section('1) HTTP API + 보안');
ok('헬스 체크', (await json('GET', '/api/health')).ok === true);
ok('토큰 없는 변경요청 차단(CSRF)', (await reqRaw('PUT', '/api/profile', {})).status === 403);
ok('외부 Origin 차단', (await reqRaw('GET', '/api/health', undefined, { origin: 'https://attacker.example' })).status === 403);

const spoof = await new Promise<string>((res) => {
  const s = net.connect(port, '127.0.0.1', () => s.write(`GET /api/health HTTP/1.1\r\nHost: attacker.example\r\nConnection: close\r\n\r\n`));
  let b = ''; s.on('data', (d) => (b += d)); s.on('end', () => res(b.split('\r\n')[0]!));
});
ok('Host 스푸핑 차단(DNS 리바인딩)', spoof.includes('403'));
ok('zod 입력검증', (await authed('POST', '/api/jobs', { company: '' })).status === 400);

/* ------------------------------------------------------------- 2. API 업무 흐름 */
section('2) 대시보드 업무 흐름 (API)');
await authed('PUT', '/api/profile', { name: '김커리어', desired_roles: ['백엔드'], preferred_tone: '담백' });
ok('프로필 저장/조회', (await json('GET', '/api/profile')).profile.name === '김커리어');
ok('온보딩 상태 반영', (await json('GET', '/api/onboarding')).has_profile === true);

const apiJob = (await json('POST', '/api/jobs', { company: '라인', position: '서버 개발자', keywords: ['Java'] }, { 'x-careermate-token': SESSION_TOKEN })).job;
await authed('PUT', `/api/jobs/${apiJob.id}/fit`, { score: 77, strengths: ['s'] });
const statusRes = await json('PUT', `/api/applications/${apiJob.id}/status`, { status: 'document_passed' }, { 'x-careermate-token': SESSION_TOKEN });
ok('상태 변경 + 면접 힌트', statusRes.application.status === 'document_passed' && !!statusRes.hint);
const ctx = await json('GET', `/api/context?job_id=${apiJob.id}`);
ok('get_application_context 집계', ctx.job?.id === apiJob.id && ctx.fit_analysis?.score === 77 && ctx.writing_preferences.preferred_tone === '담백');
const cl = (await json('POST', '/api/cover-letters', { title: '라인 자소서', job_id: apiJob.id, content: 'v1' }, { 'x-careermate-token': SESSION_TOKEN })).cover_letter;
await authed('POST', `/api/cover-letters/${cl.id}/versions`, { content: 'v2', note: '보강' });
ok('자소서 버전 관리', (await json('GET', `/api/cover-letters/${cl.id}`)).cover_letter.version_count === 2);
const exp = await reqRaw('GET', `/api/export/cover-letter/${cl.id}?format=md`);
ok('자소서 내보내기(MD)', String(exp.headers['content-disposition'] || '').includes('attachment'));

/* ------------------------------------------------- 3 & 4. MCP + DB 공유 불변식 */
section('3) MCP 서버 (stdio) + 4) 핵심 불변식: 대시보드 ↔ MCP 동일 DB');
await authed('PUT', '/api/profile', { headline: 'API가 추가한 한 줄' });

// Run the MCP stdio session as a fully-reaped child; read its verdict from stdout.
const probe = spawnSync(process.execPath, ['--no-warnings', '--import', 'tsx', path.join(here, 'mcp-probe.ts')], {
  cwd: path.resolve(here, '..'),
  env: { ...process.env },
  encoding: 'utf8',
  timeout: 60000,
});
const probeLine = (probe.stdout || '').split('\n').find((l) => l.startsWith('RESULT '));
const pr = probeLine ? JSON.parse(probeLine.slice('RESULT '.length)) : { ok: false, error: probe.stderr?.slice(0, 200) };

ok('MCP 서버 연결 + 도구 20개 이상 노출', pr.ok === true && pr.toolCount >= 20, `(${pr.toolCount ?? 0})`);
ok('get_application_context 존재', pr.hasContext === true);
ok('MCP가 API가 쓴 프로필 이름을 읽음 (DB 공유 ←)', pr.profileName === '김커리어');
ok('MCP가 API의 수정(한 줄 소개)을 즉시 봄 (←)', pr.profileHeadline === 'API가 추가한 한 줄');
ok('MCP save_job_posting', !!pr.jobId);
ok('대시보드(API)가 MCP가 저장한 공고를 봄 (→)', (await json('GET', '/api/jobs')).jobs.some((j: any) => j.id === pr.jobId));

/* --------------------------------------------- 5. 내보내기 HTML 인젝션 차단 (회귀) */
// Cover-letter/resume bodies are user/agent text rendered into exported .html
// (opened in a browser → live XSS surface). markdownToHtml MUST neutralize raw
// HTML and dangerous link schemes. These assertions lock that property so a
// future refactor of the markdown renderer can't silently reintroduce XSS.
section('5) 내보내기 HTML 인젝션 차단 (회귀)');
const { markdownToHtml } = await import('../packages/exporters/src/markdown.ts');
const { toPrintableHtml } = await import('../packages/exporters/src/html.ts');

const imgPayload = markdownToHtml('<img src=x onerror="alert(1)">');
ok('raw <img onerror> 무력화', !imgPayload.includes('<img') && imgPayload.includes('&lt;img') && !imgPayload.includes('onerror="alert'));

const scriptPayload = markdownToHtml('<script>alert(1)</script>');
ok('raw <script> 무력화', !scriptPayload.includes('<script>') && scriptPayload.includes('&lt;script&gt;'));

const jsLink = markdownToHtml('[클릭](javascript:alert(1))');
ok('javascript: 링크 차단(→ #)', jsLink.includes('href="#"') && !jsLink.toLowerCase().includes('javascript:'));

// Attribute-breakout attempt: a quote inside an otherwise-valid https URL.
const breakout = markdownToHtml('[x](https://a.com" onmouseover="alert(1))');
ok('링크 속성 탈출 차단', !breakout.includes('onmouseover="alert') && breakout.includes('&quot;'));

const titleInj = toPrintableHtml('</title><script>alert(1)</script>', '본문');
ok('내보내기 제목 인젝션 차단', !titleInj.includes('<script>') && !titleInj.includes('</title><script>'));

console.log(`\n${'='.repeat(40)}`);
console.log(`결과: ${pass} 통과 · ${fail} 실패`);
console.log(fail === 0 ? '✅ 전체 통과' : '❌ 실패 있음');
console.log(fail === 0 ? 'TEST_VERDICT PASS' : `TEST_VERDICT FAIL ${fail}`);

await new Promise<void>((r) => server.close(() => r()));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
process.exit(fail === 0 ? 0 : 1);
