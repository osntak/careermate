// Distribution-bundle smoke: builds dist/ then boots the REAL artifact users
// get (dist/mcp.mjs) over stdio and exercises tools through mcp-probe.
//
// Why (pre-launch audit): every other suite runs the TypeScript sources via
// tsx, so esbuild regressions — a missing external, a broken banner shim, a
// forgotten sidecar (pdfjs worker, career-os knowledge md) — sailed through CI
// green and only failed on user machines. This suite closes that gap.
//
// Plain-Node parent with a reliable exit code (the tsx probe child's own exit
// code is untrusted on Windows; we read its RESULT stdout line instead — same
// pattern as scripts/test-all.mjs). Prints DIST_VERDICT PASS/FAIL.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

console.log('\n1) dist 빌드 (scripts/build-dist.mjs)');
const build = spawnSync(process.execPath, ['scripts/build-dist.mjs'], {
  cwd: repoRoot,
  encoding: 'utf8',
  timeout: 300000,
});
if (build.stderr) process.stderr.write(build.stderr);
ok('build-dist 종료코드 0', build.status === 0, `status=${build.status}`);
ok('dist/mcp.mjs 존재', fs.existsSync(path.join(repoRoot, 'dist', 'mcp.mjs')));

console.log('\n2) dist/mcp.mjs 실기동 프로브 (빈 데이터 폴더, 실 stdio MCP 클라이언트)');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-dist-smoke-'));
const probe = spawnSync(
  process.execPath,
  ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', 'scripts/mcp-probe.ts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 120000,
    env: { ...process.env, CAREERMATE_DATA_DIR: dataDir, CAREERMATE_PROBE_TARGET: 'dist' },
  },
);
const resultLine = (probe.stdout || '').split('\n').find((l) => l.startsWith('RESULT '));
let result = null;
try {
  result = resultLine ? JSON.parse(resultLine.slice('RESULT '.length)) : null;
} catch {
  /* handled below */
}
ok('프로브 RESULT 수신', !!result, (probe.stdout || probe.stderr || '').slice(0, 400));
if (result) {
  ok('번들 서버 연결·도구 호출 성공(ok=true)', result.ok === true, JSON.stringify(result));

  // manifest.json은 build-mcpb가 도구 레지스트리에서 재생성하는 단일 출처 —
  // 번들이 노출한 도구 수와 일치해야 한다(누락 번들링을 수치로 포착).
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8'));
  const expected = Array.isArray(manifest.tools) ? manifest.tools.length : -1;
  ok(
    `도구 노출 수 = manifest.tools (${expected})`,
    result.toolCount === expected,
    `toolCount=${result.toolCount}`,
  );
  ok('get_application_context 노출', result.hasContext === true);
  ok('쓰기 도구 실동작(save_job_posting → job id)', typeof result.jobId === 'string' && result.jobId.length > 0, String(result.jobId));
}

console.log(`\nDIST_VERDICT ${fail === 0 ? 'PASS' : 'FAIL'}  (pass=${pass} fail=${fail})`);
process.exit(fail === 0 ? 0 : 1);
