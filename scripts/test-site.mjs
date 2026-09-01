import fs from 'node:fs';

let failures = 0;
function ok(name, condition) {
  console.log(`  ${condition ? '✅' : '❌'} ${name}`);
  if (!condition) failures++;
}

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const files = {
  home: read('site/index.html'),
  homeEn: read('site/en/index.html'),
  start: read('site/start.html'),
  startEn: read('site/en/start.html'),
  faq: read('site/faq.html'),
  faqEn: read('site/en/faq.html'),
  guides: read('site/guides/index.html'),
  analytics: read('site/analytics.js'),
  sitemap: read('site/sitemap.xml'),
};

ok('한국어 홈에서 가이드 허브 연결', files.home.includes('href="/guides"'));
ok('한국어 홈에서 npm 공개 배포본 연결', files.home.includes('https://www.npmjs.com/package/careermate'));
ok('영문 홈에서 npm 공개 배포본 연결', files.homeEn.includes('https://www.npmjs.com/package/careermate'));
ok('비공개 저장소와 충돌하는 공개 오픈소스 표현 제거', !Object.values(files).join('\n').match(/무료[· ]*오픈소스|free and open-source|free &amp; open source/i));
ok('설치 전 PC 에이전트 요구사항 명시', files.start.includes('내 PC의 파일과 명령') && files.startEn.includes('local files and commands'));

for (const eventName of ['begin_install', 'view_demo', 'copy_install_command', 'select_ai_client', 'select_os', 'view_install_path', 'open_install_method', 'view_guides']) {
  ok(`GA4 이벤트 정의: ${eventName}`, files.analytics.includes(`'${eventName}'`));
}
ok('Core Web Vitals 수집 활성화', files.analytics.includes('var ENABLE_SPEED_INSIGHTS = true'));

const newGuides = ['job-posting-analysis', 'career-description', 'interview-prep'];
for (const slug of newGuides) {
  const path = `site/guides/${slug}.html`;
  const html = read(path);
  ok(`${slug}: 사이트맵 포함`, files.sitemap.includes(`https://careermate.life/guides/${slug}`));
  ok(`${slug}: canonical 일치`, html.includes(`<link rel="canonical" href="https://careermate.life/guides/${slug}">`));
  ok(`${slug}: 검색 설명 존재`, /<meta name="description" content=".{60,}">/.test(html));
  ok(`${slug}: 본문 섹션 충분`, (html.match(/<h2>/g) || []).length >= 5);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  let validJsonLd = false;
  try { validJsonLd = JSON.parse(jsonLd || '')['@type'] === 'Article'; } catch { validJsonLd = false; }
  ok(`${slug}: Article 구조화 데이터 유효`, validJsonLd);
}

console.log(`\nSITE_GROWTH_VERDICT ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failed)`);
process.exitCode = failures === 0 ? 0 : 1;
