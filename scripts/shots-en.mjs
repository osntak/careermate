// scripts/shots-en.mjs — capture ENGLISH dashboard screenshots for the /en landing.
//
// The marketing seed (shots-seed.ts) is Korean, so instead of the real server we
// capture the demo (site/demo) which already renders fully in English from
// seed.en.js. We serve site/ ourselves, open each demo screen with
// careermate-lang=en, hide the demo bar, and capture light+dark into
// site/en/shots/. The /en landing carousel points at these.
//
// Run:  node scripts/shots-en.mjs   (needs playwright + chromium; build the demo first)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = path.join(ROOT, 'site');
const OUT = path.join(SITE, 'en', 'shots');
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json',
  '.txt': 'text/plain', '.ico': 'image/x-icon',
};

// Minimal static server for site/ with clean-URL fallback (so the demo's
// root-absolute /demo/... asset requests resolve).
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(SITE, p);
  if (!file.startsWith(SITE)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (fs.existsSync(file + '.html')) file += '.html';
    else if (fs.existsSync(path.join(file, 'index.html'))) file = path.join(file, 'index.html');
    else { res.writeHead(404); return res.end('not found'); }
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const PORT = 4338;
await new Promise((r) => server.listen(PORT, r));
const base = `http://127.0.0.1:${PORT}`;
console.log('serving site/ at', base);

const SCREENS = ['home', 'applications', 'jobs', 'documents', 'interview', 'settings'];
const THEMES = ['light', 'dark'];
const VIEWPORT = { width: 1360, height: 940 };

const browser = await chromium.launch();
try {
  for (const theme of THEMES) {
    const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
    await ctx.addInitScript((t) => {
      try {
        window.localStorage.setItem('careermate-lang', 'en');
        window.localStorage.setItem('careermate-theme', t);
      } catch (e) { /* ignore */ }
    }, theme);
    const page = await ctx.newPage();
    for (const s of SCREENS) {
      await page.goto(`${base}/demo/#/${s}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => {
        const v = document.getElementById('view');
        return v && v.childElementCount > 0 && !document.querySelector('.spinner') &&
          (!document.fonts || document.fonts.status === 'loaded');
      }, { timeout: 10000 }).catch(() => { /* best effort */ });
      // Strip demo-only chrome so the shot looks like the real dashboard: remove
      // the #demo-bar, drop its body padding class, and restore the sidebar footer.
      await page.evaluate(() => {
        document.getElementById('demo-bar')?.remove();
        document.body.classList.remove('has-demo-bar');
        const st = document.getElementById('foot-status'); if (st) st.textContent = 'Running locally';
        const fp = document.getElementById('foot-path'); if (fp) fp.textContent = '~/.careermate/careermate.sqlite';
      });
      await page.waitForTimeout(350);
      const file = path.join(OUT, `${s}-${theme}.png`);
      await page.screenshot({ path: file });
      console.log('  ✓', path.relative(ROOT, file));
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log('done — site/en/shots/*.png');
