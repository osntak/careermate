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
import { fileURLToPath } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-e2e-'));
process.env.CAREERMATE_DATA_DIR = tmp;
process.env.CAREERMATE_SHORTCUT_DIR = path.join(tmp, 'shortcut');
process.env.CAREERMATE_NO_OPEN = '1';

const { startServer } = await import('../apps/web/src/server.ts');
const { SESSION_TOKEN } = await import('../apps/web/src/security.ts');
const here = path.dirname(fileURLToPath(import.meta.url));

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
// Domain errors must reach the dashboard with their real message + status, not an
// opaque 500. (Regression: 면접 진행→작성 중 같은 금지 전환·없는 공고가 500으로 삼켜졌음.)
const blockedRes = await reqRaw('PUT', `/api/applications/${apiJob.id}/status`, { status: 'draft' }, { 'x-careermate-token': SESSION_TOKEN });
ok('금지된 전환 → 409 + 명확한 메시지(불투명 500 아님)', blockedRes.status === 409 && JSON.parse(blockedRes.text).error.includes('바꿀 수 없습니다'), `(${blockedRes.status})`);
const missingRes = await reqRaw('PUT', '/api/applications/job_does_not_exist/status', { status: 'planned' }, { 'x-careermate-token': SESSION_TOKEN });
ok('없는 공고 상태변경 → 404 + 명확한 메시지', missingRes.status === 404 && JSON.parse(missingRes.text).error.includes('공고를 찾을 수 없습니다'), `(${missingRes.status})`);
const ctx = await json('GET', `/api/context?job_id=${apiJob.id}`);
ok('get_application_context 집계', ctx.job?.id === apiJob.id && ctx.fit_analysis?.score === 77 && ctx.writing_preferences.preferred_tone === '담백');
const cl = (await json('POST', '/api/cover-letters', { title: '라인 자소서', job_id: apiJob.id, content: 'v1' }, { 'x-careermate-token': SESSION_TOKEN })).cover_letter;
await authed('POST', `/api/cover-letters/${cl.id}/versions`, { content: 'v2', note: '보강' });
ok('자소서 버전 관리', (await json('GET', `/api/cover-letters/${cl.id}`)).cover_letter.version_count === 2);
const timelineBeforeApply = (await json('GET', `/api/jobs/${apiJob.id}`)).job.timeline;
ok(
  '공고 상세 타임라인: 공고 등록/분석/자소서 이벤트',
  timelineBeforeApply.some((e: any) => e.type === 'job_saved') &&
    timelineBeforeApply.some((e: any) => e.type === 'fit_analysis_saved') &&
    timelineBeforeApply.some((e: any) => e.type === 'cover_letter_version_saved'),
);
const submissionDoc = (await json('POST', '/api/documents', {
  kind: 'career_description',
  title: '제출용 경력기술서',
  content: '경력기술서 본문',
}, { 'x-careermate-token': SESSION_TOKEN })).document;
await authed('PUT', `/api/applications/${apiJob.id}/status`, {
  status: 'applied',
  note: '원티드 제출',
  submission: {
    submitted_at: '2026-06-19',
    channel: '원티드',
    cover_letter_id: cl.id,
    document_ids: [submissionDoc.id],
  },
});
let timelineDetail = (await json('GET', `/api/jobs/${apiJob.id}`)).job.timeline;
const appliedEvent = timelineDetail.find((e: any) => e.type === 'application_status_changed' && e.payload?.submission?.channel === '원티드');
ok(
  '지원 완료 타임라인: 제출 자료 링크 참조',
  appliedEvent?.payload?.submission?.cover_letter?.exists === true &&
    appliedEvent.payload.submission.cover_letter.route === `/documents/cover/${cl.id}` &&
    appliedEvent.payload.submission.documents?.[0]?.exists === true &&
    appliedEvent.payload.submission.documents[0].route === `/documents/career/${submissionDoc.id}`,
);
await authed('DELETE', `/api/documents/${submissionDoc.id}`);
timelineDetail = (await json('GET', `/api/jobs/${apiJob.id}`)).job.timeline;
const deletedDocRef = timelineDetail
  .find((e: any) => e.id === appliedEvent.id)
  ?.payload?.submission?.documents?.[0];
ok(
  '지원 완료 타임라인: 삭제된 제출 문서는 정적 삭제 표시용 데이터',
  deletedDocRef?.exists === false && deletedDocRef.title === '제출용 경력기술서' && deletedDocRef.route === null,
);
// 회귀: 제출 자료(문서/자소서) 없이 채널·날짜만 담은 submission으로 '지원 완료'를 기록해도
// 크래시 없이 저장돼야 한다(undefined → node:sqlite 바인딩 거부 방지).
const bareJob = (await json('POST', '/api/jobs', { company: '쿠팡', position: '플랫폼 엔지니어' }, { 'x-careermate-token': SESSION_TOKEN })).job;
const bareApplied = await authed('PUT', `/api/applications/${bareJob.id}/status`, {
  status: 'applied',
  submission: { submitted_at: '2026-06-20', channel: '사람인' },
});
ok('지원 완료(제출 문서 없이 채널만)도 크래시 없이 저장', bareApplied.status === 200);
const bareTimeline = (await json('GET', `/api/jobs/${bareJob.id}`)).job.timeline;
ok(
  '문서 없는 지원 완료도 타임라인에 기록(채널만)',
  bareTimeline.some((e: any) => e.type === 'application_status_changed' && e.payload?.submission?.channel === '사람인'),
);

const exp = await reqRaw('GET', `/api/export/cover-letter/${cl.id}?format=md`);
ok('자소서 내보내기(MD)', String(exp.headers['content-disposition'] || '').includes('attachment'));

const { TOOLS } = await import('../packages/mcp-tools/src/tools.ts');
const tool = (name: string) => {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`tool not found: ${name}`);
  return t;
};
/* get_application_context: 오늘 날짜(today) 주입 — 연차·재직기간 환산 기준일(LLM이 현재일 모름 보정) */
const ctxToday = await tool('get_application_context').handler({});
ok(
  'get_application_context에 오늘 날짜(today) 주입',
  ctxToday.isError !== true &&
    /^\d{4}-\d{2}-\d{2}$/.test((ctxToday.data as any).today) &&
    (ctxToday.data as any).today === new Date().toISOString().slice(0, 10),
);

/* get_application_context: tenure 서버 결정적 계산 — LLM 산술 회귀 방지(R18/R19 검증).
   종료 경력 = end_date − start_date(완전 결정적). 재직중 = updated_at(정보 확인 시점) 기준. */
await tool('add_experience').handler({ experiences: [{ company: '연차계산종료', role: '백엔드', start_date: '2019-01', end_date: '2021-01' }] });
await tool('add_experience').handler({ experiences: [{ company: '연차계산재직', role: '백엔드', start_date: '2020-01', is_current: true }] });
const ctxTen = await tool('get_application_context').handler({});
const ten = (ctxTen.data as any).tenure as any[];
const tEnded = ten.find((t) => t.company === '연차계산종료');
const tCur = ten.find((t) => t.company === '연차계산재직');
ok(
  'tenure: 종료 경력 = end−start (24개월·2.0년·data_age null)',
  !!tEnded && tEnded.months === 24 && tEnded.years === 2 && tEnded.data_age_months === null && tEnded.is_current === false,
);
ok(
  'tenure: 재직중 = updated_at(=오늘) 기준 연차 + data_age 0 (방금 입력이라 신선)',
  !!tCur && tCur.is_current === true && tCur.months === ((() => { const [y, m] = new Date().toISOString().slice(0, 7).split('-'); return Number(y) * 12 + Number(m); })() - (2020 * 12 + 1)) && tCur.data_age_months === 0,
);
/* tenure 엣지: 파싱 불가/모순 데이터는 안전 제외(silent drop — 발명·쓰레기 행 방지) */
await tool('add_experience').handler({ experiences: [{ company: '연차연도만', start_date: '2019' }] });
await tool('add_experience').handler({ experiences: [{ company: '연차역전', start_date: '2022-01', end_date: '2020-01' }] });
const ctxTenEdge = await tool('get_application_context').handler({});
const tenEdge = (ctxTenEdge.data as any).tenure as any[];
ok(
  'tenure 엣지: 연도만(YYYY) 입력·종료<시작은 tenure에서 제외',
  !tenEdge.some((t) => t.company === '연차연도만') && !tenEdge.some((t) => t.company === '연차역전'),
);

/* 이력서/프로필 내보내기 — 자소서와 동일한 패리티(도구 + API HTML) */
const exResumeDoc = await tool('add_resume').handler({ title: '내보내기용 이력서', kind: 'resume', content: '5년차 백엔드 엔지니어 이력서 본문' });
const exResumeId = (exResumeDoc.data as any).id;
const exportResumeRes = await tool('export_resume').handler({ document_id: exResumeId });
ok(
  'MCP 이력서 내보내기: 파일 경로 + 본문 반환',
  exportResumeRes.isError !== true &&
    typeof (exportResumeRes.data as any).path === 'string' &&
    String((exportResumeRes.data as any).content).includes('5년차 백엔드'),
);
const exportProfileRes = await tool('export_profile').handler({});
ok(
  'MCP 프로필 이력서 내보내기: 프로필 이름 포함',
  exportProfileRes.isError !== true && String((exportProfileRes.data as any).content).includes('김커리어'),
);
// 웹 API: format=html 은 실제 HTML(text/html)이어야 한다(md 가 아니라).
const docHtmlExp = await reqRaw('GET', `/api/export/document/${exResumeId}?format=html`);
ok('문서 내보내기 HTML 은 text/html', String(docHtmlExp.headers['content-type'] || '').includes('text/html'));
const profHtmlExp = await reqRaw('GET', '/api/export/profile?format=html');
ok('프로필 내보내기 HTML 은 text/html', String(profHtmlExp.headers['content-type'] || '').includes('text/html'));

/* Word(.docx) 내보내기 — 실제 OOXML 바이너리(zip)인지, 본문 텍스트가 들어갔는지 */
const { unzipSync, strFromU8 } = await import('fflate');
const docxRes = await tool('export_resume').handler({ document_id: exResumeId, format: 'docx' });
const docxPath = (docxRes.data as any).path as string;
ok('MCP 이력서 docx: .docx 경로 반환(본문엔 바이너리 대신 안내문)',
  docxRes.isError !== true &&
    typeof docxPath === 'string' && docxPath.endsWith('.docx') &&
    !String((docxRes.data as any).content).includes('PK'));
const docxBytes = fs.readFileSync(docxPath);
ok('docx 파일은 PK(zip) 헤더로 시작', docxBytes[0] === 0x50 && docxBytes[1] === 0x4b);
const docxXml = strFromU8(unzipSync(new Uint8Array(docxBytes))['word/document.xml']);
ok('docx 본문(word/document.xml)에 이력서 텍스트 포함', docxXml.includes('5년차 백엔드'));
// 웹 API: format=docx 는 wordprocessingml MIME + .docx 첨부여야 한다.
const docDocxExp = await reqRaw('GET', `/api/export/document/${exResumeId}?format=docx`);
ok('문서 내보내기 docx 는 wordprocessingml + .docx 첨부',
  String(docDocxExp.headers['content-type'] || '').includes('wordprocessingml') &&
    /\.docx/.test(String(docDocxExp.headers['content-disposition'] || '')));

/* 홈 시간축 넛지 — 마감 임박(deadlines) + 지원 후 무응답(followups) */
const { getHomeSummary } = await import('../packages/core/src/summary.ts');
const dlDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const dlJob = (await tool('save_job_posting').handler({ company: '마감테스트회사', position: '직무', deadline: dlDate })).data as any;
void dlJob;
const sumNow = getHomeSummary() as any;
ok(
  '홈 요약: 마감 임박 공고를 deadlines로 노출(draft, days_left≈5)',
  Array.isArray(sumNow.deadlines) &&
    sumNow.deadlines.some((d: any) => d.job.company === '마감테스트회사' && d.days_left >= 4 && d.days_left <= 6),
);
const fuJob = (await tool('save_job_posting').handler({ company: '후속테스트회사', position: '직무' })).data as any;
await tool('update_application_status').handler({ job_id: fuJob.id, status: 'applied' });
const sumFuture = getHomeSummary(new Date(Date.now() + 12 * 86400000)) as any;
ok(
  '홈 요약: 지원 후 무응답을 followups로 노출(applied, days_since≈12)',
  Array.isArray(sumFuture.followups) &&
    sumFuture.followups.some((f: any) => f.job.company === '후속테스트회사' && f.days_since >= 11 && f.days_since <= 13),
);

/* 구조화 항목·문서 삭제 (MCP) — confirm 게이트 */
const exExpRec = (await tool('add_experience').handler({ experiences: [{ company: '삭제할경력', role: '직무' }] })).data as any;
const exExpId = exExpRec[0].id;
ok('MCP 경력 삭제: 확인값 없으면 차단', (await tool('delete_experience').handler({ experience_id: exExpId })).isError === true);
const delExp = await tool('delete_experience').handler({ experience_id: exExpId, confirm: 'DELETE' });
ok('MCP 경력 삭제', delExp.isError !== true && !((await tool('get_experiences').handler({})).data as any[]).some((e) => e.id === exExpId));
const exSkillRec = (await tool('add_skill').handler({ skills: [{ name: '삭제할스킬' }] })).data as any;
const delSkill = await tool('delete_skill').handler({ skill_id: exSkillRec[0].id, confirm: 'DELETE' });
ok('MCP 스킬 삭제', delSkill.isError !== true && !((await tool('get_skills').handler({})).data as any[]).some((s) => s.id === exSkillRec[0].id));
const exProjRec = (await tool('add_project').handler({ projects: [{ name: '삭제할프로젝트' }] })).data as any;
const delProj = await tool('delete_project').handler({ project_id: exProjRec[0].id, confirm: 'DELETE' });
ok('MCP 프로젝트 삭제', delProj.isError !== true && !((await tool('get_projects').handler({})).data as any[]).some((p) => p.id === exProjRec[0].id));
const exDocRec = (await tool('add_resume').handler({ title: '삭제할문서', kind: 'resume', content: 'tmp' })).data as any;
const delDoc = await tool('delete_resume').handler({ document_id: exDocRec.id, confirm: 'DELETE' });
ok('MCP 문서 삭제', delDoc.isError !== true && !((await tool('get_resumes').handler({})).data as any[]).some((d) => d.id === exDocRec.id));

const savedJobToolRes = await tool('save_job_posting').handler({ company: '친화회사', position: '친화직무' });
ok(
  'MCP 공고 저장 메시지: 내부 ID 노출 없음 + 사용자용 문장 제공',
  savedJobToolRes.isError !== true &&
    !savedJobToolRes.text.includes('job_id') &&
    (savedJobToolRes.data as any).user_message?.includes('공고를 저장했어요'),
);
const fitToolRes = await tool('save_fit_analysis').handler({ job_id: apiJob.id, score: 78, summary: '선택지 안내 테스트' });
ok(
  'MCP 적합도 저장 후 자소서 작성 여부 선택지 안내',
  fitToolRes.isError !== true &&
    fitToolRes.text.includes('사용자에게 다음 선택지를 보여주세요') &&
    (fitToolRes.data as any).user_message?.includes('적합도 분석을 저장했어요') &&
    (fitToolRes.data as any).suggested_next_action?.options?.length === 2,
);
const deleteClTarget = (await json('POST', '/api/cover-letters', { title: '삭제 테스트 자소서', content: 'tmp' }, { 'x-careermate-token': SESSION_TOKEN })).cover_letter;
const blockedDeleteCl = await tool('delete_cover_letter').handler({ cover_letter_id: deleteClTarget.id });
ok('MCP 자소서 삭제: 확인값 없으면 차단', blockedDeleteCl.isError === true);
const deletedCl = await tool('delete_cover_letter').handler({ cover_letter_id: deleteClTarget.id, confirm: 'DELETE' });
ok('MCP 자소서 삭제', deletedCl.isError !== true && (await reqRaw('GET', `/api/cover-letters/${deleteClTarget.id}`)).status === 404);
const deleteJob = (await json('POST', '/api/jobs', { company: '삭제회사', position: '삭제직무' }, { 'x-careermate-token': SESSION_TOKEN })).job;
const linkedCl = (await json('POST', '/api/cover-letters', { title: '공고 삭제 후 보존 자소서', job_id: deleteJob.id, content: 'tmp' }, { 'x-careermate-token': SESSION_TOKEN })).cover_letter;
const deletedJob = await tool('delete_job_posting').handler({ job_id: deleteJob.id, confirm: 'DELETE' });
const linkedAfterJobDelete = (await json('GET', `/api/cover-letters/${linkedCl.id}`)).cover_letter;
ok(
  'MCP 공고 삭제: 공고는 삭제하고 연결 자소서는 보존',
  deletedJob.isError !== true &&
    (await reqRaw('GET', `/api/jobs/${deleteJob.id}`)).status === 404 &&
    linkedAfterJobDelete.job_id === null,
);

const backupPayload = JSON.parse((await reqRaw('GET', '/api/settings/export-all')).text);
const preview = await json('POST', '/api/settings/import-preview', { backup: backupPayload }, { 'x-careermate-token': SESSION_TOKEN });
ok('백업 가져오기 미리보기', preview.preview.total_rows > 0 && preview.preview.counts.jobs >= 1);
await authed('PUT', '/api/profile', { name: '임시 변경' });
await authed('POST', '/api/settings/restore', { backup: backupPayload, confirm: 'RESTORE' });
ok('백업 가져오기: 현재 데이터 자동 백업 후 전체 교체', (await json('GET', '/api/profile')).profile.name === '김커리어');
const shortcut = (await json('POST', '/api/settings/dashboard-shortcut', { open: false }, { 'x-careermate-token': SESSION_TOKEN })).shortcut;
ok('대시보드 바로가기 생성', fs.existsSync(shortcut.launcher_path) && fs.readFileSync(shortcut.launcher_path, 'utf8').includes('/api/health'));

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

/* -------------------------- 6. 결정론 검증 엔진 (verify) — 숫자 출처 게이트 */
section('6) 검증 엔진(verify) — 숫자 출처 게이트');
{
  const { lintArtifact, analyzeProvenance } = await import('../packages/core/src/verify/index.ts');
  const corpus = {
    documents: '이력서: 매출 30% 성장. 고객 1,200명.',
    structured: '경력: 야간 인계 누락 민원을 분기 12건에서 3건으로 줄였다. 공공데이터 약 8만 건. 경력 7년.',
    job: '데이터 분석가 5년 이상. SQL.',
  };
  ok('구조화 전용 수치(12→3, 8만)는 차단 안 함', lintArtifact('cover_letter', '민원을 12건에서 3건으로 줄였고 8만 건을 정제했습니다.', corpus).blocking.length === 0);
  ok('파생 수치(9건=12−3)는 fabricated 아님', analyzeProvenance('9건을 줄였습니다', corpus).fabricated.length === 0);
  ok('허위 수치(250%)는 차단', lintArtifact('cover_letter', '매출을 250% 올렸습니다.', corpus).blocking.length === 1);
  ok('구조화 전용 수치는 unverified로 표기', analyzeProvenance('12건에서 3건으로 줄였습니다', corpus).unverified.length >= 1);
  ok('공고의 5년이 본인 5년을 지지하지 않음', analyzeProvenance('5년 경험이 있습니다', corpus).jobSourced.length === 1);
  ok('코퍼스 없으면 차단 안 함', lintArtifact('cover_letter', '250% 향상', { documents: '', structured: '', job: '' }).blocking.length === 0);
  ok('엄격 모드: 구조화 전용 수치(12→3)도 차단', lintArtifact('cover_letter', '12건에서 3건으로 줄였습니다', corpus, { strict: true }).blocking.length === 1);
}

/* ------------------ 7. 배치 입력 + 멱등 upsert (스킬/경력/프로젝트) */
// add_skill/add_experience/add_project now take an array so the AI saves a whole
// résumé's worth of items in ONE call. Re-extracting the same data must not create
// duplicate rows (natural-key upsert), and within-batch dupes must collapse.
section('7) 배치 입력 + 멱등 upsert');
{
  const { addSkills, addExperiences, addProjects } = await import('../packages/core/src/services.ts');
  const { skillRepo, experienceRepo, projectRepo } = await import('../packages/db/src/index.ts');

  // One call, many items; within-batch duplicate (case-insensitive) collapses to one row.
  const r1 = addSkills([{ name: 'Python' }, { name: 'React' }, { name: 'python' }]);
  ok('배치 스킬: 3개 입력 → 중복 합쳐 2건 저장', skillRepo.list().length === 2, `(${skillRepo.list().length})`);
  ok('배치 스킬: created=2 (배치 내 dedupe)', r1.created === 2 && r1.updated === 1);

  // Re-saving the same names must not grow the table (idempotent) and must keep
  // existing fields while applying the newly-provided one (non-destructive merge).
  const r2 = addSkills([{ name: 'Python', level: '상' }]);
  ok('배치 스킬 멱등: 재저장해도 2건 유지', skillRepo.list().length === 2, `(${skillRepo.list().length})`);
  ok('배치 스킬 멱등: updated=1 · created=0', r2.updated === 1 && r2.created === 0);
  ok('배치 스킬 멱등: 누락 필드 보존 + 신규 필드 반영', skillRepo.list().find((s) => s.name.toLowerCase() === 'python')?.level === '상');

  // Experience natural key = company + role + start_date.
  addExperiences([{ company: '네이버', role: '백엔드', start_date: '2020-01' }]);
  addExperiences([{ company: '네이버', role: '백엔드', start_date: '2020-01', description: '갱신본' }]);
  const navers = experienceRepo.list().filter((e) => e.company === '네이버');
  ok('배치 경력 멱등: 같은 회사·직무·입사일은 1건', navers.length === 1 && navers[0]?.description === '갱신본');

  // Project natural key = name; within-batch dupes collapse.
  const p = addProjects([{ name: '대시보드' }, { name: '대시보드' }]);
  ok('배치 프로젝트: 배치 내 동명은 1건', projectRepo.list().filter((x) => x.name === '대시보드').length === 1 && p.created === 1);
}

/* ------------------ 8. strList 코어션 (LLM이 배열을 문자열로 보낼 때) */
// Reproduces the real failure: a client sent `keywords` as a string and the SDK
// rejected the call with "Expected array, received string". The schema must now
// absorb JSON-string and comma/newline forms into a real array — across MCP and
// HTTP, since both validate with the same JobInput/FitAnalysis schemas.
section('8) strList 코어션: 문자열 → 배열');
{
  const { JobInputSchema, FitAnalysisInputSchema } = await import('../packages/shared/src/schemas.ts');

  const csv = JobInputSchema.parse({ company: 'A', position: 'B', keywords: 'Java, Spring, Kafka' });
  ok('CSV 문자열 keywords → 배열 3개', Array.isArray(csv.keywords) && csv.keywords.length === 3 && csv.keywords[0] === 'Java');

  const jsonStr = JobInputSchema.parse({ company: 'A', position: 'B', keywords: '["Java","Spring"]' });
  ok('JSON 문자열 keywords → 배열 2개', Array.isArray(jsonStr.keywords) && jsonStr.keywords.length === 2 && jsonStr.keywords[1] === 'Spring');

  const arr = JobInputSchema.parse({ company: 'A', position: 'B', keywords: ['Java', 'Spring'] });
  ok('실제 배열 keywords는 그대로 통과', Array.isArray(arr.keywords) && arr.keywords.length === 2);

  const nl = JobInputSchema.parse({ company: 'A', position: 'B', requirements: 'Java 경험\nSpring 경험' });
  ok('개행 문자열 requirements → 배열 2개', Array.isArray(nl.requirements) && nl.requirements.length === 2);

  const empty = JobInputSchema.parse({ company: 'A', position: 'B', keywords: '' });
  ok('빈 문자열 keywords → 빈 배열(실패 아님)', Array.isArray(empty.keywords) && empty.keywords.length === 0);

  const fit = FitAnalysisInputSchema.parse({ job_id: 'x', matched_keywords: 'Java, Spring' });
  ok('적합도 matched_keywords 문자열 → 배열', Array.isArray(fit.matched_keywords) && fit.matched_keywords.length === 2);

  // End-to-end through the HTTP save path → must be stored & returned as an array.
  const strJob = (await json('POST', '/api/jobs', { company: '카카오', position: '백엔드', keywords: 'Java, Kotlin' }, { 'x-careermate-token': SESSION_TOKEN })).job;
  ok('API: 문자열 keywords로 저장 → 배열로 보관', Array.isArray(strJob.keywords) && strJob.keywords.length === 2);
}

/* ------------------ 9. 업데이트 확인: "지금 확인"은 신선한 캐시를 무시 (회귀) */
// check_for_update·doctor·update_careermate 는 "지금 확인" 의미다. 24h 성공 캐시가
// 아직 신선해도 레지스트리를 새로 조회해야 한다. (회귀: 0.0.4 설치 후에도 1.86h 전
// 캐시에 남은 0.0.3을 'latest'로 돌려줘 설치본보다 오래된 값을 보고했음.)
section('9) 업데이트 확인: "지금 확인"은 캐시 무시');
{
  const { getUpdateStatusAsync, compareVersions } = await import('../packages/mcp-tools/src/update.ts');
  const cachePath = path.join(process.env.CAREERMATE_DATA_DIR!, '.update-check.json');
  const origFetch = globalThis.fetch;

  // 비교기 핵심 불변식 (자릿수 비교 + 정식 > 프리릴리스)
  ok('compareVersions: 0.0.4 > 0.0.3', compareVersions('0.0.4', '0.0.3') > 0);
  ok('compareVersions: 0.1.0 > 0.0.4', compareVersions('0.1.0', '0.0.4') > 0);
  ok('compareVersions: 1.0.0 > 1.0.0-rc.1 (정식>프리)', compareVersions('1.0.0', '1.0.0-rc.1') > 0);
  ok('compareVersions: 같으면 0', compareVersions('0.0.4', '0.0.4') === 0);

  try {
    // 레지스트리가 9.9.9를 보고하도록 fetch 스텁
    (globalThis as { fetch: unknown }).fetch = async () => ({ ok: true, json: async () => ({ version: '9.9.9' }) });
    // 신선한(만료 전) 캐시에 설치본보다 오래된 latest를 심는다
    fs.writeFileSync(cachePath, JSON.stringify({ checkedAt: Date.now(), latest: '0.0.1' }), 'utf8');

    // 비강제 경로(비차단 신호)는 기존대로 신선한 캐시를 존중한다(네트워크 안 침)
    ok('비강제: 신선한 캐시 존중', (await getUpdateStatusAsync(false)).latest === '0.0.1');

    // 강제 경로("지금 확인")는 캐시를 무시하고 레지스트리를 새로 읽는다 ← 버그 수정 지점
    const fresh = await getUpdateStatusAsync(true);
    ok('강제: 신선한 캐시 무시하고 재조회(9.9.9)', fresh.latest === '9.9.9', `(${fresh.latest})`);
    ok('강제: 재조회 결과가 캐시에 반영됨', JSON.parse(fs.readFileSync(cachePath, 'utf8')).latest === '9.9.9');

    // 강제 조회가 네트워크 실패하면 확인 실패로 보고하되 멀쩡한 캐시를 null로 덮지 않는다
    (globalThis as { fetch: unknown }).fetch = async () => ({ ok: false });
    ok('강제+네트워크 실패: 확인 실패로 보고(latest=null)', (await getUpdateStatusAsync(true)).latest === null);
    ok('강제+네트워크 실패: 기존 캐시(9.9.9) 보존', JSON.parse(fs.readFileSync(cachePath, 'utf8')).latest === '9.9.9');
  } finally {
    globalThis.fetch = origFetch;
    // Don't fs.rmSync the cache file: even single-file rmSync hard-crashes on Node 25 /
    // Windows. It lives in the throwaway CAREERMATE_DATA_DIR, left for the OS temp sweep.
  }
}

await new Promise<void>((r) => server.close(() => r()));

// Emit the summary as ONE write and wait for its OS-pipe flush callback before
// exiting. process.exit() on Node 25 / Windows can trigger a libuv teardown crash
// (0xC0000409) that drops still-buffered stdout — and run.mjs derives pass/fail by
// grepping the child's stdout for the TEST_VERDICT line. If that line is lost, a
// fully green run reads as a failure. Awaiting the write callback guarantees the
// verdict reached the pipe (and thus run.mjs's spawnSync capture) first.
const summary =
  `\n${'='.repeat(40)}\n` +
  `결과: ${pass} 통과 · ${fail} 실패\n` +
  `${fail === 0 ? '✅ 전체 통과' : '❌ 실패 있음'}\n` +
  `${fail === 0 ? 'TEST_VERDICT PASS' : `TEST_VERDICT FAIL ${fail}`}\n`;
await new Promise<void>((r) => process.stdout.write(summary, () => r()));

// No recursive `fs.rmSync` cleanup: on Node 25 / Windows it hard-crashes the
// process. The unique mkdtemp dir is left for the OS temp sweep (same as test-init.ts).
process.exit(fail === 0 ? 0 : 1);
