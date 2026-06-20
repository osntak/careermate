#!/usr/bin/env node
/**
 * careermate — 공개 배포용 실행 진입점 (npm bin).
 *
 * 이 파일은 plain JS라서 Node가 바로 실행할 수 있고, 내부에서 tsx 로더를 얹어
 * 무빌드(TS 직접 실행) 방식 그대로 각 진입점을 띄운다. `npm run mcp` 등과 동일한
 * `node --no-warnings --import tsx <entry>` 호출을 재현하되, cwd를 패키지 루트로
 * 고정해 tsx/tsconfig(paths 별칭) 해석이 어디서 실행되든 깨지지 않게 한다.
 *
 *   careermate init        AI 클라이언트(MCP 설정)에 CareerMate를 자동 등록
 *   careermate mcp         MCP stdio 서버 실행 (AI 클라이언트가 호출)
 *   careermate start       로컬 대시보드 실행
 *   careermate doctor      설치/환경 점검
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const ENTRIES = {
  init: 'scripts/init.ts',
  mcp: 'apps/mcp/src/index.ts',
  start: 'apps/web/src/index.ts',
  dashboard: 'apps/web/src/index.ts',
  doctor: 'scripts/doctor.ts',
  migrate: 'scripts/migrate.ts',
};

// 번들 빌드가 있으면 tsx 없이 플레인 node로 실행(배포 경로). 없으면 소스를 tsx로 실행(개발).
const BUNDLES = {
  mcp: 'dist/mcp.mjs',
  start: 'dist/web.mjs',
  dashboard: 'dist/web.mjs',
  doctor: 'dist/doctor.mjs',
  migrate: 'dist/migrate.mjs',
};

const [cmd = 'help', ...rest] = process.argv.slice(2);

const isHelp = cmd === 'help' || cmd === '--help' || cmd === '-h';
if (isHelp || !ENTRIES[cmd]) {
  const lines = [
    'CareerMate — 내 AI를 커리어 비서로 (로컬 MCP 도구)',
    '',
    '사용법: careermate <명령>',
    '',
    '  init        AI 클라이언트에 CareerMate를 자동 연결(MCP 설정 등록, Claude Code는 현재 폴더 기준)',
    '  mcp         MCP 서버 실행 (보통 AI 클라이언트가 자동 호출)',
    '  start       로컬 대시보드 실행 (http://127.0.0.1:4319)',
    '  doctor      설치/환경 점검',
    '',
    '처음이라면:  사용할 작업 폴더에서 careermate init  → AI 클라이언트 재시작',
  ];
  // 명시적 도움말은 stdout+exit0, 알 수 없는 명령은 stderr+exit1
  // (stdout은 MCP 전송 채널이므로 오류 안내로 오염시키지 않는다).
  (isHelp ? console.log : console.error)(lines.join('\n'));
  process.exit(isHelp ? 0 : 1);
}

const bundle = BUNDLES[cmd] ? path.join(ROOT, BUNDLES[cmd]) : null;
const runArgs =
  bundle && fs.existsSync(bundle)
    ? ['--no-warnings', '--experimental-sqlite', bundle, ...rest]
    : ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', path.join(ROOT, ENTRIES[cmd]), ...rest];

// 자식 cwd는 tsx/tsconfig(paths 별칭) 해석을 위해 ROOT로 고정한다. 하지만 init은 사용자가
// 명령을 친 '작업 폴더'에 .mcp.json·권한 설정을 써야 하므로, 원래 cwd를 env로 함께 넘긴다
// (init.ts의 userCwd()가 이 값을 우선한다). 다른 명령에는 무해하다.
const child = spawn(process.execPath, runArgs, {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, CAREERMATE_INIT_CWD: process.cwd() },
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
child.on('error', (err) => {
  console.error('[careermate] 실행 실패:', err instanceof Error ? err.message : err);
  process.exit(1);
});
