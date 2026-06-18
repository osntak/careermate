// =============================================================================
// build-demo.mjs — generate the no-server demo dashboard served at
// careermate.life/demo.
//
// What it does:
//   1. Copy apps/web/public/*  ->  site/demo/
//   2. Rewrite root-absolute asset paths (/lib.js, /pages/, /styles.css, ...)
//      to /demo/... so they resolve under the subpath. (/api/* is left alone —
//      the shim intercepts those at runtime.)
//   3. Copy the demo overlay (demo-shim.js, seed.js, demo.css) into site/demo/.
//   4. Inject the shim + demo.css into the copied index.html, and a hint that
//      this is a demo build.
//
// The generated site/demo/ folder is committed so Vercel (which serves
// site/ statically) publishes it with no build step or config change.
//
// Run:  node scripts/build-demo.mjs
//
// Note: avoids fs.rmSync(recursive) — it hard-crashes on Node 25 / Windows
// (see project memory). Uses a manual recursive remove instead.
// =============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'apps', 'web', 'public');
const OVERLAY = path.join(ROOT, 'apps', 'web', 'demo');
const OUT = path.join(ROOT, 'site', 'demo');

const TEXT_EXT = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt', '.md']);

/** Manual recursive delete (Node-25-safe; fs.rmSync recursive crashes there). */
function rimraf(target) {
  let st;
  try { st = fs.lstatSync(target); } catch { return; }
  if (st.isDirectory()) {
    for (const entry of fs.readdirSync(target)) rimraf(path.join(target, entry));
    fs.rmdirSync(target);
  } else {
    fs.unlinkSync(target);
  }
}

/** Rewrite root-absolute references to assets so they work under /demo/. */
function rewritePaths(code) {
  return code
    // import/href/src strings: '/lib.js', "/app.js", '/styles.css', '/icon-180.png'
    .replace(/(['"`])\/(lib\.js|app\.js|styles\.css|icon-180\.png)/g, '$1/demo/$2')
    // directories referenced as '/pages/...' or '/fonts/...' (JS/HTML)
    .replace(/(['"`])\/(pages|fonts)\//g, '$1/demo/$2/')
    // CSS url(/fonts/...) — with or without quotes
    .replace(/url\(\s*(['"]?)\/fonts\//g, 'url($1/demo/fonts/');
}

function copyTree(src, out) {
  fs.mkdirSync(out, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(out, entry.name);
    if (entry.isDirectory()) { copyTree(from, to); continue; }
    const ext = path.extname(entry.name).toLowerCase();
    if (TEXT_EXT.has(ext)) {
      fs.writeFileSync(to, rewritePaths(fs.readFileSync(from, 'utf8')));
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function injectDemo(htmlPath) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Pre-paint theme resolver — same key/default as the marketing site so the
  // theme is shared and there's no flash (FOUC) before app.js runs.
  const themeScript =
    '\n  <!-- Resolve the saved theme before first paint (shared with the marketing site; default dark). -->\n' +
    '  <script>\n' +
    '    (function () {\n' +
    "      try {\n" +
    "        var t = window.localStorage.getItem('careermate-theme') || window.localStorage.getItem('cf-theme');\n" +
    "        document.documentElement.setAttribute('data-theme', t === 'light' || t === 'dark' ? t : 'dark');\n" +
    "      } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }\n" +
    '    })();\n' +
    '  </script>';
  html = html.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' + themeScript,
  );

  // demo.css after the dashboard stylesheet
  html = html.replace(
    '<link rel="stylesheet" href="/demo/styles.css" />',
    '<link rel="stylesheet" href="/demo/styles.css" />\n  <link rel="stylesheet" href="/demo/demo.css" />',
  );

  // Shim must run before app.js. Both are ES modules; module scripts execute in
  // document order, so placing the shim immediately before app.js guarantees the
  // fetch patch is installed before any page code calls it.
  html = html.replace(
    '<script type="module" src="/demo/app.js"></script>',
    '<script type="module" src="/demo/demo-shim.js"></script>\n  <script type="module" src="/demo/app.js"></script>',
  );

  // Title hint so the browser tab reads as a demo.
  html = html.replace(
    '<title>CareerMate — 내 커리어 흐름 관리</title>',
    '<title>CareerMate 데모 — 대시보드 미리보기</title>',
  );

  fs.writeFileSync(htmlPath, html);
}

/* ------------------------------------------------------------------- run */
console.log('· clearing', path.relative(ROOT, OUT));
rimraf(OUT);

console.log('· copying dashboard', path.relative(ROOT, SRC), '->', path.relative(ROOT, OUT));
copyTree(SRC, OUT);

console.log('· copying demo overlay');
for (const f of ['demo-shim.js', 'seed.js', 'demo.css']) {
  fs.copyFileSync(path.join(OVERLAY, f), path.join(OUT, f));
}

console.log('· injecting shim + styles into index.html');
injectDemo(path.join(OUT, 'index.html'));

console.log('✓ demo built at', path.relative(ROOT, OUT), '— serve site/ and open /demo');
