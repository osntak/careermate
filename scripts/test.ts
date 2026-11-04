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
// 회귀: 새 버전을 (job_id 없이) 추가해도 공고 연결이 유지돼야 한다. (버그: addVersion이
// undefined→null 강제로 job_id를 지워 공고 상세에서 자소서가 사라졌음.)
ok('자소서 새 버전 저장이 공고 연결을 유지(회귀)',
  (await json('GET', `/api/jobs/${apiJob.id}`)).job.cover_letters.some((c: any) => c.id === cl.id));
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

/* prescreen(A-2): 대표 이력서가 아직 없을 때 resume_checked=false + combined=스킬만.
   (이 지점에는 저장된 이력서가 없다 — 첫 add_resume은 아래 내보내기 섹션에서 발생.) */
{
  const { prescreenJob } = await import('../packages/core/src/summary.ts');
  const pre = prescreenJob(apiJob.id) as any; // apiJob keywords=['Java']
  ok(
    'prescreen: 이력서 없으면 resume_checked=false + combined은 스킬만',
    !!pre && pre.resume_checked === false && pre.resume_matched.length === 0 &&
      pre.combined_matched.length === pre.matched.length && pre.combined_coverage === pre.coverage,
    JSON.stringify(pre && { rc: pre.resume_checked, rm: pre.resume_matched }),
  );
}

/* MCP 어노테이션 정직성(출시 전 감사 회귀 잠금) — 프라이버시 주장("외부로 안 나감")은
   이 힌트가 사실일 때만 성립한다. 외부 통신 도구·비가역 도구 집합을 정확히 고정. */
{
  const names = (pred: (t: (typeof TOOLS)[number]) => boolean) =>
    TOOLS.filter(pred).map((t) => t.name).sort();
  const openWorld = names((t) => t.openWorld === true);
  ok(
    'openWorldHint = 실제 외부 통신 3종만(check_for_update·search_jobs·update_careermate)',
    JSON.stringify(openWorld) === JSON.stringify(['check_for_update', 'search_jobs', 'update_careermate']),
  );
  const destructive = names((t) => t.destructive === true);
  ok(
    'destructiveHint = 비가역 7종(delete_* 6 + update_careermate)만',
    JSON.stringify(destructive) ===
      JSON.stringify([
        'delete_cover_letter',
        'delete_experience',
        'delete_job_posting',
        'delete_project',
        'delete_resume',
        'delete_skill',
        'update_careermate',
      ]),
  );
  ok('readOnly 도구에 destructive/idempotent 오지정 없음', TOOLS.every((t) => !t.readOnly || (!t.destructive && !t.idempotent)));
}

/* 오퍼 생명주기(offer_status) — 기본 open, 부분 갱신 시 조건 보존, 수락 시 최종합격 넛지 */
{
  const j = (await tool('save_job_posting').handler({ company: '오퍼상태사', position: '백엔드' })).data as any;
  const o1 = (await tool('save_offer').handler({ job_id: j.id, base_salary: 6000 })).data as any;
  ok('오퍼 기본 상태 open', o1.offer_status === 'open', JSON.stringify(o1.offer_status));
  const o2 = (await tool('save_offer').handler({ job_id: j.id, offer_status: 'declined' })).data as any;
  ok('declined 갱신 + 기존 조건(base_salary) 보존 — 삭제 아님', o2.offer_status === 'declined' && o2.base_salary === 6000, JSON.stringify({ s: o2.offer_status, b: o2.base_salary }));
  const o3 = (await tool('save_offer').handler({ job_id: j.id, offer_status: 'accepted' })).data as any;
  ok('accepted 저장 시 최종 합격 상태 갱신 넛지', o3.offer_status === 'accepted' && o3.suggested_next_action?.next_tool === 'update_application_status', JSON.stringify(o3.suggested_next_action));
  const cmp = (await tool('compare_offers').handler({})).data as any[];
  ok('compare_offers 응답에 offer_status 포함', cmp.some((x) => x.job_id === j.id && x.offer_status === 'accepted'));
}

/* 탈락 회고(rejected_stage) — 단계 기록·미기록 유도·파이프라인 분포 집계.
   기존 apiJob 등 상태를 건드리지 않도록 전용 공고를 새로 만들어 테스트한다. */
{
  // ① rejected + rejected_stage='interview' → 응답·조회에 반영.
  const rj1 = (await tool('save_job_posting').handler({ company: '탈락회고면접사', position: '백엔드' })).data as any;
  const rejRes = await tool('update_application_status').handler({ job_id: rj1.id, status: 'rejected', rejected_stage: 'interview', note: '최종 면접 탈락' });
  ok('탈락 단계 저장: 응답 application.rejected_stage=interview', (rejRes.data as any).application?.rejected_stage === 'interview', JSON.stringify((rejRes.data as any).application?.rejected_stage));
  const rj1App = (await json('GET', '/api/applications')).applications.find((a: any) => a.job_id === rj1.id);
  ok('탈락 단계 조회: /api/applications에 rejected_stage 반영', rj1App?.rejected_stage === 'interview', JSON.stringify(rj1App?.rejected_stage));

  // ② rejected without stage → suggested_next_action(회고 유도) 존재.
  const rj2 = (await tool('save_job_posting').handler({ company: '탈락회고미기록사', position: '프론트' })).data as any;
  const noStageRes = await tool('update_application_status').handler({ job_id: rj2.id, status: 'rejected' });
  ok(
    '탈락 단계 미기록 → 저장은 되고 회고 유도(suggested_next_action) 동봉',
    noStageRes.isError !== true &&
      (noStageRes.data as any).application?.rejected_stage == null &&
      (noStageRes.data as any).suggested_next_action?.next_tool === 'update_application_status',
    JSON.stringify((noStageRes.data as any).suggested_next_action),
  );

  // ③ get_pipeline_stats: rejected_by_stage 집계 + rejected_unrecorded 카운트.
  const stats = (await tool('get_pipeline_stats').handler({})).data as any;
  const interviewBucket = stats.rejected_by_stage.find((x: any) => x.stage === 'interview');
  ok(
    'get_pipeline_stats: rejected_by_stage에 interview 집계 + rejected_unrecorded≥1',
    !!interviewBucket && interviewBucket.count >= 1 && stats.rejected_unrecorded >= 1,
    JSON.stringify({ byStage: stats.rejected_by_stage, unrecorded: stats.rejected_unrecorded }),
  );
}
/* 탈락 회고 불변식(upsert): rejected(stage 기록됨) → applied로 되살리면 rejected_stage가
   NULL로 초기화된다(탈락이 아닌데 단계가 남으면 안 됨). 웹 PUT /api/applications/:jobId 경유. */
{
  const rj = (await tool('save_job_posting').handler({ company: '되살림회고사', position: '백엔드' })).data as any;
  await tool('update_application_status').handler({ job_id: rj.id, status: 'rejected', rejected_stage: 'final' });
  const before = (await json('GET', '/api/applications')).applications.find((a: any) => a.job_id === rj.id);
  ok('되살림 전제: rejected_stage=final 기록', before?.rejected_stage === 'final', JSON.stringify(before?.rejected_stage));
  await authed('PUT', `/api/applications/${rj.id}`, { status: 'applied' });
  const after = (await json('GET', '/api/applications')).applications.find((a: any) => a.job_id === rj.id);
  ok('upsert로 rejected→applied 전이 시 rejected_stage=NULL 초기화',
    after?.status === 'applied' && after?.rejected_stage == null, JSON.stringify({ s: after?.status, rs: after?.rejected_stage }));
}

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

/* docx 렌더러 회귀(감사 보완): snake_case 밑줄 보존 · XML 위법 제어문자 제거 · 링크 스킴 검증 */
const { markdownToDocx } = await import('../packages/exporters/src/docx.ts');
const rdBytes = await markdownToDocx(
  't',
  '# 제목\n- read_write_latency 를 50% 개선, API_KEY 설정\n- [정상](https://ex.com) / [위험](javascript:alert(1))\n_강조_ 와 본문\x0c제어\x07문자',
);
const rdZip = unzipSync(new Uint8Array(rdBytes));
const rdXml = strFromU8(rdZip['word/document.xml']);
const rdAll = Object.values(rdZip).map((b) => strFromU8(b)).join('');
const rdText = rdXml.replace(/<[^>]+>/g, ''); // 런 경계 무시·본문만 — 분리된 run도 인접 렌더되므로 내용 보존만 확인
ok('docx: snake_case 밑줄 보존(이탤릭 변환 안 함)', rdText.includes('read_write_latency') && rdText.includes('API_KEY'));
ok('docx: XML 위법 제어문자(0x0C·0x07 등) 제거 → well-formed', !/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(rdXml));
ok('docx: 위험 스킴(javascript:) 하이퍼링크 미생성', !rdAll.includes('javascript:'));
ok('docx: 정상 링크(https)는 유지', rdAll.includes('https://ex.com'));
ok('docx: 공백 양옆 _강조_는 이탤릭 유지', rdXml.includes('<w:i') && rdXml.includes('강조'));

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

/* A-1. 팔로업 타이밍 규칙(결정론 영업일) — getActionDigest에 now 주입 */
{
  const { getActionDigest, businessDaysSince } = await import('../packages/core/src/summary.ts');
  // 금요일(2026-01-02) 지원 → 다음주 금요일(2026-01-09) = 5영업일(주말 제외)
  ok(
    '영업일 계산: 금요일 지원→다음주 금요일 = 5영업일',
    businessDaysSince('2026-01-02T09:00:00', new Date('2026-01-09T09:00:00')) === 5,
    String(businessDaysSince('2026-01-02T09:00:00', new Date('2026-01-09T09:00:00'))),
  );
  ok('영업일 계산: 주말만 경과하면 0영업일', businessDaysSince('2026-01-02T09:00:00', new Date('2026-01-04T09:00:00')) === 0);

  const timJob = (await tool('save_job_posting').handler({ company: '타이밍테스트회사', position: '직무' })).data as any;
  await tool('update_application_status').handler({ job_id: timJob.id, status: 'applied' });
  const findTim = (d: any) => d.followups.find((f: any) => f.job.company === '타이밍테스트회사');
  const due = findTim(getActionDigest(new Date(Date.now() + 9 * 86400000)));
  ok(
    'get_followups 타이밍: 지원 9일 후 followup_timing=due(5~7영업일)',
    !!due && due.followup_timing === 'due' && due.business_days_since >= 5 && due.business_days_since <= 7,
    JSON.stringify(due && { t: due.followup_timing, b: due.business_days_since }),
  );
  const over = findTim(getActionDigest(new Date(Date.now() + 20 * 86400000)));
  ok(
    'get_followups 타이밍: 지원 20일 후 followup_timing=overdue(8영업일+)',
    !!over && over.followup_timing === 'overdue' && over.business_days_since >= 8,
    JSON.stringify(over && { t: over.followup_timing, b: over.business_days_since }),
  );
  const hold = findTim(getActionDigest(new Date(Date.now() + 50 * 86400000)));
  ok('get_followups: 45일+ 무응답이면 suggest_on_hold=true', !!hold && hold.suggest_on_hold === true, JSON.stringify(hold && hold.suggest_on_hold));
}

/* A-2. prescreen: 대표 이력서 본문에만 있는 키워드가 resume_matched·combined에 잡히는지 */
{
  const { prescreenJob } = await import('../packages/core/src/summary.ts');
  const covJob = (await tool('save_job_posting').handler({ company: '커버리지테스트회사', position: '직무', keywords: ['Kubernetes', 'GraphQL'] })).data as any;
  // 스킬 목록엔 없고 대표 이력서 본문에만 'Kubernetes'가 등장하도록 저장(방금 저장 → 최신=대표).
  await tool('add_resume').handler({ title: '커버리지 이력서', kind: 'resume', content: 'AWS EKS 위에서 Kubernetes 클러스터를 운영했습니다.' });
  const pre = prescreenJob(covJob.id) as any;
  ok(
    'prescreen: 이력서 본문 키워드가 resume_matched·combined에 잡히고 combined_coverage>coverage',
    !!pre && pre.resume_checked === true &&
      pre.resume_matched.includes('Kubernetes') && pre.combined_matched.includes('Kubernetes') &&
      !pre.matched.includes('Kubernetes') && (pre.combined_coverage ?? 0) > (pre.coverage ?? 0),
    JSON.stringify(pre && { rc: pre.resume_checked, rm: pre.resume_matched, cc: pre.combined_coverage, c: pre.coverage }),
  );
}

/* A-2b. prescreen 본문 매칭 정확도: ASCII 토큰은 단어 경계로만(‘AI’가 email/detail에 오탐 없음,
   ‘Kotlin’은 단독 등장 시 매칭), 한글 토큰은 substring 유지(‘결제’가 ‘결제시스템’에 매칭). */
{
  const { prescreenJob } = await import('../packages/core/src/summary.ts');
  const wbJob = (await tool('save_job_posting').handler({ company: '경계매칭회사', position: '직무', keywords: ['AI', 'Kotlin', '결제'] })).data as any;
  // 방금 저장한 이력서가 최신=대표. 본문엔 email·detail(‘ai’ 부분문자열 함정) + Kotlin + 결제시스템.
  await tool('add_resume').handler({ title: '경계매칭 이력서', kind: 'resume', content: 'email 상세 detail — Kotlin 백엔드와 결제시스템을 운영했습니다.' });
  const pre = prescreenJob(wbJob.id) as any;
  ok(
    'prescreen: 본문 ASCII 토큰은 단어 경계 매칭(‘AI’ 미매칭) · ‘Kotlin’ 매칭 · 한글 ‘결제’ substring 매칭',
    !!pre && !pre.resume_matched.includes('AI') &&
      pre.resume_matched.includes('Kotlin') && pre.resume_matched.includes('결제'),
    JSON.stringify(pre && { rm: pre.resume_matched }),
  );
}

/* A-3. 전형 일정 다이제스트: 미래 일정이 upcoming_schedule에 D-day와 함께 잡히고,
   같은 날짜 두 공고 일정이 schedule_conflicts로 감지되는지(날짜는 new Date 기준 상대 계산으로
   생성해 결정론 유지 — 서버의 today 계산과 동일한 로컬 날짜). */
{
  const { getActionDigest } = await import('../packages/core/src/summary.ts');
  // 서버(daysUntilDate)와 같은 로컬 자정 기준으로 날짜 문자열을 만든다.
  const localDate = (offsetDays: number) => {
    const d = new Date(Date.now() + offsetDays * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const d3 = localDate(3);
  // 같은 날짜(d3)에 서로 다른 두 공고의 일정 → 충돌. 하나는 다가오는 일정에도 잡힌다.
  await tool('save_job_posting').handler({ company: '일정A사', position: '백엔드', schedule: [{ label: '1차 면접', date: d3, time: '10:00' }] });
  await tool('save_job_posting').handler({ company: '일정B사', position: '프론트', schedule: [{ label: 'AI역검', date: d3, time: '15:00' }] });

  const dg = getActionDigest() as any;
  const up = (dg.upcoming_schedule || []).find((x: any) => x.company === '일정A사');
  ok('getActionDigest: 3일 뒤 일정이 upcoming_schedule에 d_day(≈3)와 함께 잡힘',
    !!up && up.label === '1차 면접' && up.date === d3 && up.d_day >= 2 && up.d_day <= 4,
    JSON.stringify(up && { l: up.label, d: up.date, dd: up.d_day }));
  const conflict = (dg.schedule_conflicts || []).find((c: any) => c.date === d3);
  ok('getActionDigest: 같은 날짜 두 공고 일정이 schedule_conflicts로 감지',
    !!conflict && conflict.items.length >= 2 &&
      conflict.items.some((i: any) => i.company === '일정A사') && conflict.items.some((i: any) => i.company === '일정B사'),
    JSON.stringify(conflict && { date: conflict.date, n: conflict.items.length }));

  // 같은 공고의 두 단계가 같은 날 → 충돌 아님(서로 다른 공고 2건 이상일 때만 충돌).
  const dSame = localDate(40);
  await tool('save_job_posting').handler({ company: '단일공고일정사', position: '백엔드', schedule: [
    { label: '1차 면접', date: dSame, time: '10:00' },
    { label: '2차 면접', date: dSame, time: '14:00' },
  ] });
  const dg2 = getActionDigest() as any;
  ok('getActionDigest: 같은 공고의 같은 날 2단계는 schedule_conflicts 아님',
    !(dg2.schedule_conflicts || []).some((c: any) => c.date === dSame),
    JSON.stringify((dg2.schedule_conflicts || []).map((c: any) => c.date)));
}

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
  // 글자수 카운터: validate_cover_letter가 결정론 카운트 + 상·하한 advisory를 반환 (LLM은 글자수를 못 셈)
  const vCount: any = await tool('validate_cover_letter').handler({ text: '가나다라마', max_chars: 3 });
  ok('validate_cover_letter: 글자수 3모드 카운트 반환', vCount.data?.charCounts?.withSpace === 5 && vCount.data?.charCounts?.byte === 15, JSON.stringify(vCount.data?.charCounts));
  ok('validate_cover_letter: 상한 초과를 advisory로 반환(차단 아님)', vCount.data?.charLimit?.status === 'over' && vCount.data?.charLimit?.delta === 2 && vCount.isError !== true, JSON.stringify(vCount.data?.charLimit));
  const vNoLimit: any = await tool('validate_cover_letter').handler({ text: '가나다' });
  ok('validate_cover_letter: 한도 없으면 charLimit 없음', vNoLimit.data?.charLimit === undefined && vNoLimit.data?.charCounts?.noSpace === 3);

  // ③ 정량 스펙 필드: 프로필에 어학점수·학력 구조화 저장 → 조회 + 인용한 수치(920)가 환각으로 막히지 않음(corpus 통합)
  await tool('save_profile').handler({ language_scores: [{ test: 'TOEIC', score: '920' }], education: [{ school: '한국대학교', gpa: '3.8', gpa_scale: '4.5', status: '졸업' }] });
  const profApi = (await json('GET', '/api/profile')).profile;
  ok('프로필 정량 스펙(어학·학력) 구조화 저장·조회', profApi.language_scores?.[0]?.score === '920' && profApi.education?.[0]?.gpa === '3.8', JSON.stringify({ ls: profApi.language_scores, ed: profApi.education }));
  const vSpec: any = await tool('validate_cover_letter').handler({ text: '토익 920점을 취득해 영어 기술 문서를 직접 다뤄 왔습니다.' });
  ok('저장된 어학점수(920)는 환각으로 차단되지 않음(프로필 스펙 → corpus)', (vSpec.data?.provenance?.fabricated ?? []).every((f: any) => !String(f.raw).includes('920')) && vSpec.data?.blocking?.length === 0, JSON.stringify(vSpec.data?.provenance?.fabricated));

  // ② 기업 리서치 필드: 공고에 인재상·핵심가치·사업개요 저장 → 조회(자소서·면접 정렬용)
  const jobCo: any = await tool('save_job_posting').handler({ company: '컬처핏테크', position: '백엔드 엔지니어', talent_profile: '주도적으로 문제를 정의하고 해결하는 사람', core_values: ['고객집착', '실험정신'], company_overview: '핀테크 결제 플랫폼, 최근 송금 서비스 출시' });
  const coJob = (await json('GET', `/api/jobs/${jobCo.data?.id}`)).job;
  ok('공고 기업리서치(인재상·핵심가치·사업개요) 저장·조회', coJob.talent_profile?.includes('주도적') && coJob.core_values?.length === 2 && coJob.company_overview?.includes('핀테크'), JSON.stringify({ t: coJob.talent_profile, cv: coJob.core_values, o: coJob.company_overview }));

  // ⑤ 자소서 문항 뱅크: 회사 지정 문항·글자수를 questions로 저장 → get_job_posting 반환 확인.
  // 이어서 questions 없이 부분 갱신(같은 url 업서트) 시 기존 문항이 보존되는지 확인.
  const qUrl = 'https://example.com/jobs/문항뱅크';
  const jobQ: any = await tool('save_job_posting').handler({
    company: '문항뱅크사', position: '서비스 기획', url: qUrl,
    questions: [
      { no: 1, question: '지원 동기를 서술하세요.', max_chars: 700, count_mode: 'with_space', note: '필수' },
      { no: 2, question: '가장 도전적이었던 경험은?', min_chars: 300, max_chars: 1000, count_mode: 'no_space' },
    ],
  });
  const qJob = (await tool('get_job_posting').handler({ job_id: jobQ.data?.id })).data as any;
  ok('공고 자소서 문항 2건 저장·조회(문항·글자수·기준)',
    qJob?.job?.questions?.length === 2 && qJob.job.questions[0].max_chars === 700 &&
    qJob.job.questions[0].count_mode === 'with_space' && qJob.job.questions[1].min_chars === 300,
    JSON.stringify(qJob?.job?.questions));
  // 부분 갱신: questions 미전달로 같은 url 재저장 → 기존 문항 보존.
  await tool('save_job_posting').handler({ company: '문항뱅크사', position: '서비스 기획(수정)', url: qUrl });
  const qJob2 = (await tool('get_job_posting').handler({ job_id: jobQ.data?.id })).data as any;
  ok('questions 미전달 재저장 시 기존 문항 보존(부분 갱신)',
    qJob2?.job?.questions?.length === 2 && qJob2.job.position === '서비스 기획(수정)',
    JSON.stringify({ q: qJob2?.job?.questions?.length, pos: qJob2?.job?.position }));

  // ⑥ 전형 일정: 면접·발표 날짜를 schedule로 저장 → get_job_posting 반환 확인. 이어서 schedule
  // 없이 같은 url 재저장 시 기존 일정이 보존되는지(부분 갱신, questions와 동일 머지) 확인.
  const sUrl = 'https://example.com/jobs/전형일정';
  const jobS: any = await tool('save_job_posting').handler({
    company: '전형일정사', position: '데이터 엔지니어', url: sUrl,
    schedule: [
      { label: '1차 면접', date: '2026-08-10', time: '14:00', note: '판교 오피스' },
      { label: '서류 발표', date: '2026-08-03' },
    ],
  });
  const sJob = (await tool('get_job_posting').handler({ job_id: jobS.data?.id })).data as any;
  ok('공고 전형 일정 2건 저장·조회(label·date·time·note)',
    sJob?.job?.schedule?.length === 2 &&
    sJob.job.schedule.some((x: any) => x.label === '1차 면접' && x.date === '2026-08-10' && x.time === '14:00' && x.note === '판교 오피스') &&
    sJob.job.schedule.some((x: any) => x.label === '서류 발표' && x.date === '2026-08-03'),
    JSON.stringify(sJob?.job?.schedule));
  await tool('save_job_posting').handler({ company: '전형일정사', position: '데이터 엔지니어(수정)', url: sUrl });
  const sJob2 = (await tool('get_job_posting').handler({ job_id: jobS.data?.id })).data as any;
  ok('schedule 미전달 재저장 시 기존 일정 보존(부분 갱신)',
    sJob2?.job?.schedule?.length === 2 && sJob2.job.position === '데이터 엔지니어(수정)',
    JSON.stringify({ s: sJob2?.job?.schedule?.length, pos: sJob2?.job?.position }));
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

section('10) 공고 검색: 처음 본 날·게시일 필터·사이트 간 중복(네트워크 스텁)');
{
  const { searchJobs } = await import('../packages/core/src/index.ts');
  const { setJobSearchPreferences, getJobSearchPreferences } = await import('../packages/db/src/index.ts');
  const origFetch = globalThis.fetch;
  const json = (body: unknown) => ({ ok: true, headers: { get: () => 'application/json' }, text: async () => JSON.stringify(body) });
  try {
    (globalThis as { fetch: unknown }).fetch = async (url: string) =>
      url.includes('wanted')
        ? json({ data: [{ id: 11, position: '회계 담당자', company: { name: '(주)가나' } }] })
        : json({
            data: [
              { id: 21, title: '회계 담당자', organization: { name: '가나(주)' }, starts_at: '2026-11-04T09:00:00.000+09:00' },
              { id: 22, title: '재무 팀장', organization: { name: '다라' }, starts_at: '2026-10-01T09:00:00.000+09:00' },
            ],
          });
    const opts = { sources: ['wanted', 'remember'], today: '2026-11-04' };
    const day1 = await searchJobs('회계', opts);
    ok('같은 회사·제목은 원티드 한 줄로 합침(리멤버는 also_on)', day1.results.length === 2 && day1.results[0].also_on?.[0]?.source === 'remember', JSON.stringify(day1.results));
    ok('합친 줄에 리멤버 게시일 보충 + 처음 본 날 기록', day1.results[0].posted_at === '2026-11-04' && day1.results[0].first_seen_at === '2026-11-04');

    const day2 = await searchJobs('회계', { ...opts, today: '2026-11-05' });
    ok('다음 날 다시 봐도 first_seen_at은 첫날 유지', day2.results.every((r) => r.first_seen_at === '2026-11-04'), JSON.stringify(day2.results.map((r) => r.first_seen_at)));

    const fresh = await searchJobs('회계', { ...opts, today: '2026-11-05', postedSince: '2026-11-04' });
    ok('postedSince: 게시일(없으면 처음 본 날) 기준으로 지난 공고 제외', fresh.results.length === 1 && fresh.filtered_out === 1, JSON.stringify(fresh));

    const none = await searchJobs('', { sources: ['wanted'] });
    ok('키워드·직무 조건 둘 다 없으면 아무 사이트도 부르지 않음', none.providers.length === 0);

    const bad = await searchJobs('', { sources: ['remember'], rememberCategories: ['프론트엔드'] });
    ok('리멤버에 없는 분류는 요청 전에 거부(전체 공고가 오는 사고 방지)', bad.providers[0]?.ok === false && /unknown Remember category/.test(bad.providers[0]?.error ?? ''));

    const badSaramin = await searchJobs('', { sources: ['saramin'], saraminCategories: ['999999'] });
    ok('사람인 분류표에 없는 코드도 요청 전에 거부', badSaramin.providers[0]?.ok === false && /unknown Saramin/.test(badSaramin.providers[0]?.error ?? ''));

    // 매일 보이는 상시채용은 last_seen_at이 갱신돼 지워지지 않고, 안 보인 지 120일 지난 것만 지운다.
    const { markJobsSeen, getDb } = await import('../packages/db/src/index.ts');
    markJobsSeen([{ source: 't', external_id: 'daily' }, { source: 't', external_id: 'gone' }], '2026-01-01');
    markJobsSeen([{ source: 't', external_id: 'daily' }], '2026-04-30');
    const left = markJobsSeen([{ source: 't', external_id: 'daily' }], '2026-05-10');
    const gone = getDb().prepare(`SELECT 1 FROM job_search_seen WHERE source='t' AND external_id='gone'`).get();
    ok('정리는 마지막으로 본 날 기준: 계속 보이는 공고는 첫날 유지, 120일 안 보인 것만 삭제', left.get('t:daily') === '2026-01-01' && !gone, JSON.stringify({ daily: left.get('t:daily'), gone }));

    setJobSearchPreferences({ remember_categories: ['재무·회계·세무>회계결산'], saramin_categories: ['322'] });
    setJobSearchPreferences({ keyword: '회계' });
    const p = getJobSearchPreferences();
    ok('검색 조건 저장: 준 필드만 바뀌고 나머지 유지', p.keyword === '회계' && p.saramin_categories[0] === '322' && p.remember_categories.length === 1 && !!p.updated_at, JSON.stringify(p));
    const tables = (getDb().prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[]).map((t) => t.name);
    ok('검색 조건·처음 본 날은 실제 테이블(백업·초기화 대상, _meta 아님)', tables.includes('job_search_preferences') && tables.includes('job_search_seen'));

    // 도구 경계: 인자 없이 부르면 저장된 조건으로, "today"는 오늘 날짜로 바뀐다.
    const { TOOLS } = await import('../packages/mcp-tools/src/tools.ts');
    const tool = TOOLS.find((t) => t.name === 'search_jobs')!;
    const r = (await tool.handler({ posted_since: 'today' })) as { data: unknown };
    const data = r.data as { used_saved_preferences: boolean; conditions: { keyword: string; saramin_categories: string[] } };
    ok('search_jobs 인자 없음 → 저장된 조건 사용', data.used_saved_preferences === true && data.conditions.keyword === '회계' && data.conditions.saramin_categories[0] === '322', JSON.stringify(data.conditions));
    const schema = tool.inputSchema as unknown as Record<string, { safeParse: (v: unknown) => { success: boolean } }>;
    ok(
      'posted_since: "today"·실제 날짜만 통과(2026-99-99, 2026-02-30 거부)',
      schema.posted_since.safeParse('today').success && schema.posted_since.safeParse('2026-11-04').success && !schema.posted_since.safeParse('2026-99-99').success && !schema.posted_since.safeParse('2026-02-30').success,
    );

    // 페이지 넘김: 리멤버는 per 50이 상한, 점핏은 16건 고정. 둘 다 limit만큼 이어 받는다.
    const asked: string[] = [];
    (globalThis as { fetch: unknown }).fetch = async (url: string, init?: { body?: string }) => {
      if (url.includes('rememberapp')) {
        const { page, per } = JSON.parse(init!.body!);
        asked.push(`r${page}:${per}`);
        return json({ data: Array.from({ length: per }, (_, i) => ({ id: page * 1000 + i, title: `t${page}-${i}`, organization: { name: `c${page}-${i}` } })) });
      }
      const page = Number(new URL(url).searchParams.get('page'));
      asked.push(`j${page}`);
      const n = page < 3 ? 16 : 5;
      return json({ result: { positions: Array.from({ length: n }, (_, i) => ({ id: `${page}-${i}`, companyName: `j${page}-${i}`, title: `p${page}-${i}` })) } });
    };
    const paged = await searchJobs('회계', { sources: ['remember', 'jumpit'], limit: 70, trackSeen: false });
    const count = (s: string) => paged.results.filter((x) => x.source === s).length;
    ok(
      'limit 70: 리멤버 50+50 두 페이지에서 70건, 점핏은 짧은 페이지(5건)에서 멈춰 37건',
      count('remember') === 70 && count('jumpit') === 37 && asked.filter((a) => a.startsWith('r')).sort().join() === 'r1:50,r2:50' && !asked.includes('j4'),
      JSON.stringify({ asked, r: count('remember'), j: count('jumpit') }),
    );
    const today50 = await searchJobs('회계', { sources: ['remember'], postedSince: '2026-01-01', trackSeen: false });
    ok('posted_since가 있으면 limit 기본값 50', today50.providers[0]?.count === 50, JSON.stringify(today50.providers));

    (globalThis as { fetch: unknown }).fetch = async () =>
      json({
        data: [
          { id: 1, title: 'a', organization: { name: 'a' }, min_experience: 3, max_experience: 10 },
          { id: 2, title: 'b', organization: { name: 'b' }, min_experience: 8, max_experience: 20 },
          { id: 3, title: 'c', organization: { name: 'c' }, min_experience: 1, max_experience: 4 },
          { id: 4, title: 'd', organization: { name: 'd' } },
        ],
      });
    const five = await searchJobs('프론트엔드', { sources: ['remember'], years: 5, trackSeen: false });
    ok('years 5: 3~10년만 남고 8~20년·1~4년은 제외, 경력 표기 없는 공고는 남김', five.results.map((r) => r.position).join() === 'a,d' && five.filtered_out === 2, JSON.stringify(five.results));

    // 대시보드 공고 찾기 API: 외부로 요청이 나가므로 검색은 CSRF 토큰이 있는 POST만 받는다.
    const call = async (m: string, p: string, b?: unknown) => JSON.parse((await authed(m, p, b)).text);
    const cats = await call('GET', `/api/job-search/categories?q=${encodeURIComponent('경리')}`);
    ok('GET /api/job-search/categories: 직무 이름을 사람인 코드로', cats.saramin?.[0]?.code === '322', JSON.stringify(cats.saramin?.slice(0, 2)));
    const noToken = await reqRaw('POST', '/api/job-search', { keyword: '프론트엔드', sources: ['remember'] });
    ok('POST /api/job-search: 토큰 없으면 403(다른 사이트가 검색을 시키지 못함)', noToken.status === 403);
    const badPrefs = await authed('PUT', '/api/job-search/preferences', { saramin_categories: ['999999'] });
    ok('PUT /api/job-search/preferences: 분류표에 없는 코드는 400', badPrefs.status === 400, badPrefs.text);
    await call('POST', '/api/jobs', { company: 'a', position: 'a', url: 'https://career.rememberapp.co.kr/job/posting/1' });
    const web = await call('POST', '/api/job-search', { keyword: '프론트엔드', sources: ['remember'], years: 5 });
    ok(
      'POST /api/job-search: years 적용, 이미 저장한 공고는 saved_job_id로 표시',
      web.results?.length === 2 && !!web.results[0].saved_job_id && web.results[1].saved_job_id === null && web.filtered_out === 2,
      JSON.stringify(web.results?.map((r: { position: string; saved_job_id: string | null }) => [r.position, r.saved_job_id])),
    );
    const putPrefs = await authed('PUT', '/api/job-search/preferences', { keyword: '경리', saramin_categories: ['323'], remember_categories: [] });
    const prefsView = await call('GET', '/api/job-search/preferences');
    ok(
      'PUT 후 GET /api/job-search/preferences: 저장한 값과 사람인 코드 이름이 돌아옴',
      putPrefs.status === 200 && prefsView.preferences?.keyword === '경리' && prefsView.saramin_names?.['323'] === '경리사무원' && prefsView.preferences.remember_categories.length === 0,
      JSON.stringify(prefsView),
    );
    const fallback = await call('POST', '/api/job-search', { sources: ['remember'] });
    ok('POST /api/job-search 조건 없이: 저장된 조건으로 검색', fallback.used_saved_preferences === true && fallback.conditions?.keyword === '경리', JSON.stringify(fallback.conditions));
    await authed('PUT', '/api/job-search/preferences', { keyword: '', saramin_categories: [], remember_categories: [] });
    const nothing = await authed('POST', '/api/job-search', {});
    ok('POST /api/job-search: 저장된 조건도 없으면 400', nothing.status === 400, nothing.text);
    const badSearch = await authed('POST', '/api/job-search', { saramin_categories: ['999999'] });
    ok('POST /api/job-search: 분류표에 없는 코드는 요청 전에 400', badSearch.status === 400, badSearch.text);
  } finally {
    globalThis.fetch = origFetch;
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
