#!/usr/bin/env node
/**
 * scripts/gen-og.mjs — 소셜 공유용 OG 이미지와 앱 아이콘(PNG) 생성기.
 *
 * 브랜드 색(에메랄드 #0f7256 · 크림 페이퍼 #faf8f4)을 랜딩/대시보드와 통일해
 * Playwright(chromium)로 다음을 렌더링한다. 한 번 만들어 두면 정적 자산으로 커밋된다.
 *
 *   install-page/favicon.svg      벡터 파비콘 (모던 브라우저)
 *   install-page/og.png           1200×630 소셜 공유 카드 (og:image / twitter:image)
 *   install-page/icon-180.png     apple-touch-icon
 *   install-page/icon-512.png     PWA/대형 폴백
 *   apps/web/public/icon-180.png  대시보드 apple-touch-icon (동일 자산)
 *
 * 실행: node scripts/gen-og.mjs   (사전: npx playwright install chromium)
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANDING = path.join(ROOT, 'install-page');
const PUBLIC = path.join(ROOT, 'apps', 'web', 'public');

const EMERALD = '#0f7256';
const CREAM = '#faf8f4';
const KR_FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif";

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="${EMERALD}"/><text x="12" y="17" font-size="14" text-anchor="middle" fill="#fff" font-family="Segoe UI,sans-serif" font-weight="bold">C</text></svg>`;

const ogHtml = `<!doctype html><meta charset="utf-8"><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:${CREAM};font-family:${KR_FONT};color:#1c1a16}
  .wrap{width:100%;height:100%;padding:78px 88px;display:flex;flex-direction:column;justify-content:space-between}
  .brand{display:flex;align-items:center;gap:20px}
  .logo{width:84px;height:84px;border-radius:20px;background:${EMERALD};color:#fff;font-weight:800;font-size:48px;display:grid;place-items:center}
  .word{font-size:40px;font-weight:800;letter-spacing:-1.5px}
  .h{font-size:78px;font-weight:800;line-height:1.08;letter-spacing:-2.5px}
  .accent{color:${EMERALD}}
  .sub{font-size:29px;color:#595449;line-height:1.5;margin-top:26px;max-width:900px}
  .pill{display:inline-flex;align-items:center;gap:13px;font-size:23px;font-weight:600;color:#0b5b44;border:1px solid #bcdccd;background:#e7f1ec;padding:13px 24px;border-radius:999px;align-self:flex-start}
  .dot{width:12px;height:12px;border-radius:50%;background:${EMERALD}}
</style><div class="wrap">
  <div class="brand"><div class="logo">C</div><div class="word">CareerMate</div></div>
  <div>
    <div class="h">내 <span class="accent">AI</span>를<br>나만의 <span class="accent">커리어 비서</span>로</div>
    <div class="sub">이력서·자기소개서·지원 현황을 이 컴퓨터 안에서 관리하세요.<br>분석·글쓰기는 평소 쓰던 AI가, 데이터 보관은 CareerMate가.</div>
  </div>
  <div class="pill"><span class="dot"></span>로컬 전용 · MCP · 무료</div>
</div>`;

const iconHtml = (size) => `<!doctype html><meta charset="utf-8"><style>
  *{margin:0}
  body{width:${size}px;height:${size}px;background:${EMERALD};display:grid;place-items:center}
  .c{color:#fff;font-family:${KR_FONT};font-weight:800;font-size:${Math.round(size * 0.56)}px;line-height:1}
</style><div class="c">C</div>`;

async function shoot(page, html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('  ✔', path.relative(ROOT, out));
}

async function main() {
  fs.writeFileSync(path.join(LANDING, 'favicon.svg'), favicon);
  console.log('  ✔', path.relative(ROOT, path.join(LANDING, 'favicon.svg')));

  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  try {
    await shoot(page, ogHtml, 1200, 630, path.join(LANDING, 'og.png'));
    await shoot(page, iconHtml(180), 180, 180, path.join(LANDING, 'icon-180.png'));
    await shoot(page, iconHtml(512), 512, 512, path.join(LANDING, 'icon-512.png'));
    fs.copyFileSync(path.join(LANDING, 'icon-180.png'), path.join(PUBLIC, 'icon-180.png'));
    console.log('  ✔', path.relative(ROOT, path.join(PUBLIC, 'icon-180.png')));
  } finally {
    await browser.close();
  }
  console.log('OG/아이콘 생성 완료.');
}

main().catch((err) => {
  console.error('생성 실패:', err);
  process.exitCode = 1;
});
