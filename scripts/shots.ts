/**
 * `shots` — capture real dashboard screenshots for the landing page.
 *
 * Starts the local web server against whatever data dir is configured, then uses
 * Playwright to capture home / applications / jobs in BOTH light and dark themes
 * into install-page/shots/{screen}-{theme}.png. The landing page embeds these and
 * swaps light↔dark to match its own theme toggle.
 *
 * Run against the throwaway marketing data (see shots-seed.ts):
 *   CAREERMATE_DATA_DIR=./.shots-data CAREERMATE_NO_OPEN=1 npm run shots
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from '../apps/web/src/server.ts';
import { getDataDir } from '@careermate/db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../install-page/shots');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SCREENS = [
  { name: 'home', hash: '#/home' },
  { name: 'applications', hash: '#/applications' },
  { name: 'jobs', hash: '#/jobs' },
  { name: 'documents', hash: '#/documents' },
  { name: 'interview', hash: '#/interview' },
  { name: 'settings', hash: '#/settings' },
];
const THEMES = ['light', 'dark'] as const;

// A desktop viewport that fits the home/board content without scrolling; @2x for
// crisp text on retina/landing-card sizes.
const VIEWPORT = { width: 1360, height: 940 };

async function main(): Promise<void> {
  process.env.CAREERMATE_NO_OPEN = '1';
  const { url } = await startServer(Number(process.env.CAREERMATE_PORT ?? 4337));
  const expectedDir = getDataDir();
  console.log(`서버 시작: ${url}  (data: ${expectedDir})`);

  // Safety: never screenshot real career data. Confirm the server we'll capture is
  // actually serving our throwaway demo dir — not another careermate instance that
  // grabbed the URL (e.g. a real dashboard on the default port).
  const health = await fetch(`${url}/api/health`).then((r) => r.json()).catch(() => null) as { data_dir?: string } | null;
  if (!health || path.resolve(health.data_dir ?? '') !== path.resolve(expectedDir)) {
    throw new Error(`연결된 서버의 데이터 폴더(${health?.data_dir ?? '?'})가 예상(${expectedDir})과 다릅니다. `
      + '실제 데이터를 캡처할 위험이 있어 중단합니다. CAREERMATE_DATA_DIR을 빈 throwaway 폴더로 지정하세요.');
  }

  const browser = await chromium.launch();
  try {
    for (const theme of THEMES) {
      const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
      // The dashboard reads localStorage 'cf-theme' on boot (app.js initTheme).
      await ctx.addInitScript((t) => {
        try { window.localStorage.setItem('cf-theme', t as string); } catch { /* ignore */ }
      }, theme);
      const page = await ctx.newPage();

      for (const s of SCREENS) {
        await page.goto(`${url}/${s.hash}`, { waitUntil: 'networkidle' });
        // wait for the route to render (spinner gone) and webfont to load
        await page.waitForFunction(() => {
          const v = document.getElementById('view');
          const hasSpinner = !!document.querySelector('.spinner');
          const fontsReady = !document.fonts || document.fonts.status === 'loaded';
          return !!v && v.childElementCount > 0 && !hasSpinner && fontsReady;
        }, { timeout: 10_000 }).catch(() => { /* best effort */ });
        await page.waitForTimeout(450);

        const file = path.join(OUT_DIR, `${s.name}-${theme}.png`);
        await page.screenshot({ path: file });
        console.log(`  ✓ ${path.relative(process.cwd(), file)}`);
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  console.log('완료. install-page/shots/*.png 생성됨.');
  process.exit(0);
}

main().catch((err) => {
  console.error('스크린샷 캡처 실패:', err instanceof Error ? err.stack : err);
  process.exit(1);
});
