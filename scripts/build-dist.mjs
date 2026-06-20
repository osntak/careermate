#!/usr/bin/env node
/**
 * scripts/build-dist.mjs — 배포용 플레인 JS 번들 빌드 (esbuild).
 *
 * 개발은 그대로 tsx 무빌드로 돌리고, 배포(.mcpb / npm publish / 추후 독립 .exe)에서는
 * tsx·tsconfig 경로별칭 런타임 의존성을 없애기 위해 네 진입점을 각각 단일 ESM 파일로 번들한다.
 *
 *   dist/mcp.mjs        MCP stdio 서버 (Claude Desktop이 실행)
 *   dist/web.mjs        로컬 대시보드 서버
 *   dist/doctor.mjs     설치/환경 점검 CLI
 *   dist/migrate.mjs    DB 마이그레이션 CLI
 *   dist/public/        대시보드 정적 자산 (apps/web/public 복사)
 *   dist/site/  설치 안내 페이지 복사
 *
 * `define: __BUNDLED__=true` 로 런타임에서 번들 레이아웃을 인지(정적경로/대시보드 기동 분기).
 * node: 내장 모듈(node:sqlite 등)은 external로 두므로 실행에는 Node ≥22.5가 필요(런타임은 동봉 대상).
 */
import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

async function main() {
  console.log('CareerMate dist 번들 빌드(esbuild)…');
  // package.json을 버전 단일 출처로 삼아 번들에 주입(앱별 하드코딩 버전 드리프트 방지).
  const pkgVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;
  // dist를 통째로 비우고 다시 만든다. build-dist가 소유하는 산출물(mcp/web/doctor/migrate/
  // public/site)만 남기기 위함. 이렇게 해야 직전 build:mcpb가 남긴 mcpb-stage/·
  // careermate.mcpb(수 MB)나 테스트 잔여물(mcp-smoke.err)이 npm tarball에 섞여 들어가지 않는다
  // (npm publish의 prepack은 build-dist만 실행하므로 여기서 비우면 게시본이 깨끗하다).
  // build:mcpb는 이 함수를 먼저 호출한 뒤 mcpb-stage/·careermate.mcpb를 다시 생성하므로 안전.
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: {
      mcp: 'apps/mcp/src/index.ts',
      web: 'apps/web/src/index.ts',
      // doctor/migrate도 번들해 둔다. 이 둘은 @careermate/* 워크스페이스 패키지를 import하는데,
      // 게시 tarball에는 그 패키지들이 resolvable하지 않아 tsx 폴백이 실패한다(번들이면 인라인돼 동작).
      doctor: 'scripts/doctor.ts',
      migrate: 'scripts/migrate.ts',
    },
    outdir: 'dist',
    outExtension: { '.js': '.mjs' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    tsconfig: 'tsconfig.json',
    define: { __BUNDLED__: 'true', __APP_VERSION__: JSON.stringify(pkgVersion) },
    // ESM 출력에서 CJS 의존성이 require/__dirname을 써도 동작하도록 shim 주입.
    banner: {
      js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
    },
    logLevel: 'info',
  });

  // 정적 자산 복사 (번들에는 코드만 들어가므로 별도 복사).
  fs.rmSync(path.join(DIST, 'public'), { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'apps', 'web', 'public'), path.join(DIST, 'public'), { recursive: true });
  // 설치·온보딩 안내 페이지(site/)는 더 이상 번들에 싣지 않는다. 번들 대시보드는 이미
  // 연결된 AI 클라이언트가 띄우는 것이라(연결 = 온보딩 완료), 로컬 사본은 잉여이고
  // 스크린샷·데모(shots/·demo/)를 제외하면 반쯤 깨진 채로 게시됐다. 대신 서버의 /install
  // 라우트가 공개 사이트(careermate.life)로 리다이렉트해 항상 최신·완전한 랜딩을 보여준다.
  // (혹시 남아 있을 dist/site 잔재 정리)
  fs.rmSync(path.join(DIST, 'site'), { recursive: true, force: true });

  // Career-OS 지식(eop·knowledge)을 번들 옆에 복사한다. @careermate/knowledge가 런타임에
  // 이 마크다운을 읽어 get_playbook/get_verifier/get_workflow_guide로 serve한다(BUNDLED이면
  // dist/career-os, 소스면 docs/career-os). 번들에는 코드만 들어가므로 별도 복사가 필요하다.
  // 내부 R&D(implementation·validation)는 런타임 소비 대상이 아니므로 제외한다.
  fs.rmSync(path.join(DIST, 'career-os'), { recursive: true, force: true });
  fs.cpSync(path.join(ROOT, 'docs', 'career-os'), path.join(DIST, 'career-os'), {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      // 내부 R&D(implementation·validation) 제외. 그리고 점(.)으로 시작하는 모든 항목을 제외한다
      // — .omc/.omx(오케스트레이션 상태·세션 로그)·.DS_Store 등이 gitignore라 git엔 없지만
      // 디스크의 docs/career-os/ 아래 남아 있을 수 있고, cpSync는 gitignore를 무시하므로
      // 명시적으로 막지 않으면 게시 tarball/번들로 샌다(런타임 소비 대상도 아님).
      if (base === 'implementation' || base === 'validation') return false;
      if (base.startsWith('.')) return false;
      return true;
    },
  });

  // pdfjs 워커 사이드카: pdf.mjs는 번들에 인라인되지만, 워커는 런타임에 별도 파일로
  // 동적 로드된다(메인스레드 fake worker). 번들 옆에 복사해 두고 documents.ts가
  // workerSrc로 가리킨다. 이게 없으면 PDF 추출 시 "fake worker" 로드가 실패한다.
  // (node_modules가 없는 .mcpb 배포에서도 PDF가 동작하도록 dist에 자기완결로 동봉.)
  const pdfWorker = path.join(ROOT, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
  if (!fs.existsSync(pdfWorker)) {
    // 경고로 넘기면 워커 없는 번들이 조용히 게시되고 런타임에 모든 PDF 추출이 깨진다(빌드는 초록).
    // 빌드를 실패시켜 누락을 게시 전에 드러낸다. pdfjs 업그레이드로 워커 경로가 바뀌면 여기서 잡힌다.
    throw new Error(
      `pdfjs 워커를 찾지 못했습니다: ${pdfWorker}\n` +
        `pdfjs-dist가 설치됐는지, 워커 파일명/경로가 바뀌지 않았는지 확인하세요(PDF 추출의 필수 자산).`,
    );
  }
  fs.copyFileSync(pdfWorker, path.join(DIST, 'pdf.worker.min.mjs'));

  console.log('✅ dist 빌드 완료: dist/mcp.mjs, dist/web.mjs, dist/doctor.mjs, dist/migrate.mjs, dist/public');
}

main().catch((err) => {
  console.error('dist 빌드 실패:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
