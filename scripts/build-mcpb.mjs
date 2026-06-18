#!/usr/bin/env node
/**
 * scripts/build-mcpb.mjs — Claude Desktop용 .mcpb(원클릭 설치 번들) 빌드.
 *
 * .mcpb = manifest.json + 실행 코드를 담은 zip. Claude Desktop이 Node를 내장 제공한다.
 * 이전엔 소스+tsx+node_modules를 통째로 담았지만, 이제는 esbuild로 만든 플레인 JS 번들
 * (dist/)만 담는다 → tsx/경로별칭 런타임 의존성 제거, 용량 대폭 축소.
 *
 * 절차:
 *   1) node scripts/build-dist.mjs 로 dist/ 번들 생성(없거나 강제 시)
 *   2) dist/mcpb-stage/ 에 manifest.json + dist/ 만 복사
 *   3) 공식 패커(@anthropic-ai/mcpb)로 dist/careermate.mcpb 생성
 *   4) Claude Desktop 파일 설치 UI가 막힌 버전용으로, 같은 ZIP을 dist/careermate.zip으로도 생성
 *
 * 사용: node scripts/build-mcpb.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const STAGE = path.join(DIST, 'mcpb-stage');
const OUT = path.join(DIST, 'careermate.mcpb');
const ZIP_OUT = path.join(DIST, 'careermate.zip');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  return r.status === 0;
}

function assertFile(file) {
  if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
    throw new Error(`필수 산출물이 없습니다: ${file}`);
  }
}

function assertSameFile(a, b) {
  const left = fs.readFileSync(a);
  const right = fs.readFileSync(b);
  if (!left.equals(right)) {
    throw new Error(`${path.basename(a)}와 ${path.basename(b)} 내용이 다릅니다.`);
  }
}

/**
 * The MCP tool registry (packages/mcp-tools) is the single source of truth for
 * what tools exist. Extract {name, description} from it so manifest.json never
 * drifts from the real tool list. Returns null if extraction fails.
 */
function extractTools() {
  const script =
    "import {TOOLS} from '@careermate/mcp-tools';" +
    "process.stdout.write(JSON.stringify(TOOLS.map(t=>({name:t.name,description:t.title||t.description}))));";
  const r = spawnSync(process.execPath, ['--no-warnings', '--import', 'tsx', '-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

function main() {
  console.log('CareerMate .mcpb 빌드를 시작합니다…\n');

  console.log('1) dist 번들 빌드…');
  if (!run('node', [path.join(ROOT, 'scripts', 'build-dist.mjs')], { cwd: ROOT })) {
    console.error('\n✗ dist 번들 빌드 실패.');
    process.exitCode = 1;
    return;
  }

  console.log('\n2) 번들 스테이징(manifest + dist)…');
  fs.rmSync(STAGE, { recursive: true, force: true });
  fs.mkdirSync(STAGE, { recursive: true });
  // manifest 버전은 package.json을 단일 출처로 삼아 주입한다(.mcpb 버전 드리프트 방지).
  const pkgVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  if (manifest.version !== pkgVersion) {
    console.log(`   manifest 버전 ${manifest.version} → ${pkgVersion} (package.json 기준으로 맞춤)`);
    manifest.version = pkgVersion;
  }
  // 도구 목록은 mcp-tools 레지스트리를 단일 출처로 주입(레지스트리 ↔ manifest 드리프트 방지).
  const tools = extractTools();
  if (tools) {
    console.log(`   manifest 도구 목록 ${manifest.tools?.length ?? 0} → ${tools.length} (mcp-tools 기준으로 맞춤)`);
    manifest.tools = tools;
  } else {
    console.warn('   ⚠ 도구 목록 추출 실패 — 기존 manifest.tools를 그대로 사용합니다.');
  }
  fs.writeFileSync(path.join(STAGE, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  // dist/ 에서 런타임에 필요한 산출물만 복사한다.
  //  - mcp.mjs        : .mcpb의 entry_point(필수)
  //  - web.mjs/public : open_dashboard로 띄우는 로컬 대시보드(필수)
  //  - site   : 제외. 공개 마케팅 랜딩의 사본이라 MCP 서버·대시보드 동작에 불필요하고,
  //                     fonts(2MB)+shots(2MB) 때문에 .mcpb를 두 배로 불린다. 대시보드 /install/
  //                     라우트는 부재 시 serveStatic이 폴백하므로 깨지지 않는다(.mcpb 사용자는
  //                     애초에 careermate.life를 거쳐 들어온다). npm 패키지는 dist/site를
  //                     그대로 포함하므로 /install/가 유지된다.
  fs.mkdirSync(path.join(STAGE, 'dist'), { recursive: true });
  // career-os(전문가 플레이북·검증 루브릭)와 pdf 워커는 런타임 사이드카다. 빠지면 .mcpb에서
  // get_playbook/get_verifier와 PDF 추출(read_document)이 깨진다. site만 제외(마케팅 사본).
  for (const name of ['mcp.mjs', 'web.mjs', 'public', 'career-os', 'pdf.worker.min.mjs']) {
    const src = path.join(DIST, name);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(STAGE, 'dist', name), { recursive: true });
  }
  for (const extra of ['README.md']) {
    const src = path.join(ROOT, extra);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(STAGE, extra));
  }

  console.log('\n3) .mcpb 패키징…');
  fs.rmSync(OUT, { force: true });
  fs.rmSync(ZIP_OUT, { force: true });
  if (!run('npx', ['-y', '@anthropic-ai/mcpb', 'pack', STAGE, OUT])) {
    console.error('\n✗ @anthropic-ai/mcpb 패커 실행 실패.');
    console.error('  수동 패킹:  cd dist/mcpb-stage && npx @anthropic-ai/mcpb pack . ../careermate.mcpb');
    process.exitCode = 1;
    return;
  }

  const size = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(1);
  console.log(`\n✅ 완성: ${OUT} (${size} MB)`);

  // .mcpb 자체가 ZIP이므로 같은 바이트를 .zip으로도 제공한다. 일부 Claude Desktop 빌드는
  // custom .mcpb 파일 설치 UI가 무반응이지만, 압축을 풀어 폴더로 추가하면 같은 manifest가 동작한다.
  fs.copyFileSync(OUT, ZIP_OUT);
  assertFile(OUT);
  assertFile(ZIP_OUT);
  assertSameFile(OUT, ZIP_OUT);
  console.log(`   폴더 설치용 ZIP: ${ZIP_OUT}`);

  // 랜딩 페이지(site/)가 .mcpb와 폴더 설치용 .zip을 직접 서빙할 수 있다.
  // private repo라 GitHub Release 다운로드가 막혀, 빌드 결과를 페이지로 복사해 다운로드
  // 버튼을 항상 최신으로 유지한다. site/ 는 배포 소스라 사이트와 함께 배포된다.
  console.log('\n4) 랜딩 페이지로 복사…');
  const pageDir = path.join(ROOT, 'site');
  if (fs.existsSync(pageDir)) {
    const pageCopy = path.join(pageDir, 'careermate.mcpb');
    const zipPageCopy = path.join(pageDir, 'careermate.zip');
    fs.copyFileSync(OUT, pageCopy);
    fs.copyFileSync(ZIP_OUT, zipPageCopy);
    console.log(`   복사 완료: ${pageCopy}`);
    console.log(`   복사 완료: ${zipPageCopy}`);
    console.log('   배포: site/ 를 배포하면 유저가 .mcpb 직접 설치 또는 ZIP 압축 해제 후 폴더 설치를 선택할 수 있습니다.');
  } else {
    console.log(`   건너뜀: ${pageDir} 없음 — 페이지 호스팅 복사 생략.`);
  }
}

main();
