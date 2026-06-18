/**
 * `npm run test:ui` — render every dashboard page in a real browser and assert
 * it mounts with no console/page errors. Optional: requires Playwright + a
 * Chromium build (`npm i -D playwright && npx playwright install chromium`).
 *
 * Uses a throwaway data directory so it never touches the user's real data.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-uismoke-'));
process.env.CAREERMATE_DATA_DIR = tmp;
process.env.CAREERMATE_NO_OPEN = '1';

const { startServer } = await import('../apps/web/src/server.ts');
const { saveProfile, saveJobPosting, saveFitAnalysis, saveCoverLetterVersion, updateApplicationStatus, saveInterviewPrep } =
  await import('@careermate/core');

// minimal data so every page has something to render
saveProfile({ name: '테스트', desired_roles: ['개발자'], preferred_tone: '담백하게' });
const { job } = saveJobPosting({ company: '테스트회사', position: '개발자', keywords: ['JS'] });
saveFitAnalysis({ job_id: job.id, score: 80, strengths: ['강점'], gaps: ['보완'] });
saveCoverLetterVersion({ job_id: job.id, title: '자소서', content: '내용 v1', note: '초안' });
updateApplicationStatus(job.id, 'document_passed');
saveInterviewPrep({ job_id: job.id, questions: [{ question: '질문?' }], self_introduction: '소개' });

// Skip gracefully if either the package OR the browser binary is missing — both
// are optional dev deps, and a confusing uncaught launch error helps no one.
let browser: any;
try {
  const { chromium } = await import('playwright');
  browser = await chromium.launch();
} catch {
  console.log('⚠️  Playwright(또는 Chromium 브라우저)가 없어 UI 스모크를 건너뜁니다.');
  console.log('    설치: npm i -D playwright && npx playwright install chromium');
  process.exit(0);
}

const { port, server } = await startServer(46050);
const base = `http://127.0.0.1:${port}`;
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors: string[] = [];
let route = '';
page.on('console', (m: any) => { if (m.type() === 'error') errors.push(`[${route}] ${m.text()}`); });
page.on('pageerror', (e: any) => errors.push(`[${route}] PAGEERROR ${e.message}`));

const routes: [string, string][] = [
  ['home', '#/'], ['profile', '#/profile'], ['jobs', '#/jobs'], ['job-detail', `#/jobs/${job.id}`],
  ['applications', '#/applications'], ['documents', '#/documents'], ['interview', '#/interview'], ['settings', '#/settings'],
];

let failures = 0;
for (const [name, hash] of routes) {
  route = name;
  await page.goto(base + '/' + hash, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  const mounted = await page.$eval('#view', (node: any) => node.children.length > 0).catch(() => false);
  const ok = mounted;
  if (!ok) failures++;
  console.log(`  ${ok ? '✅' : '❌'} ${name.padEnd(13)} mounted=${mounted}`);
}

if (errors.length) { console.log('\n콘솔/페이지 오류:'); errors.forEach((e) => console.log('  ' + e)); }
failures += errors.length;

// Responsive: every page must fit its viewport with no horizontal overflow at
// a laptop (1366×768) and a small phone (390×844). A page wider than the
// viewport means a broken layout (off-screen content, horizontal scrollbar).
// 1px tolerance for sub-pixel rounding.
const viewports: [string, number, number][] = [
  ['laptop-1366', 1366, 768],
  ['phone-390', 390, 844],
];
for (const [vpName, width, height] of viewports) {
  await page.setViewportSize({ width, height });
  for (const [name, hash] of routes) {
    route = `${vpName}/${name}`;
    await page.goto(base + '/' + hash, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    // Runs in the browser; reach DOM globals via globalThis so this node-libbed
    // file still typechecks (tsc has no 'dom' lib here).
    const overflow: number = await page.evaluate(() => {
      const w = globalThis as any;
      return Math.max(w.document.documentElement.scrollWidth, w.document.body.scrollWidth) - w.innerWidth;
    });
    const ok = overflow <= 1;
    if (!ok) failures++;
    console.log(`  ${ok ? '✅' : '❌'} ${vpName}/${name.padEnd(11)} overflow=${overflow}px`);
  }
}
console.log(`\n${failures === 0 ? '✅ UI 스모크 테스트 통과' : `❌ 실패 ${failures}건`}`);
console.log(failures === 0 ? 'UI_VERDICT PASS' : `UI_VERDICT FAIL ${failures}`);

await browser.close();
await new Promise((r) => setTimeout(r, 200));
await new Promise<void>((r) => server.close(() => r()));
try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* ignore */ }
process.exitCode = failures === 0 ? 0 : 1;
setTimeout(() => process.exit(process.exitCode), 1500).unref();
