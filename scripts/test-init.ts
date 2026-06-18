/**
 * Regression tests for installer behavior that is easy to break in packaging.
 *
 * The important invariant: Claude Code reads `.mcp.json` from the user's
 * workspace (the folder where `init` runs), not from the installed package
 * directory or the volatile npx cache. So we run a real `init` with its cwd
 * set to a throwaway workspace and assert the file lands there.
 *
 * Two Windows + Node 25 footguns this script deliberately avoids:
 *   - tsx must be loaded by ABSOLUTE path. `init` runs with cwd = a temp folder
 *     that has no node_modules, so a bare `--import tsx` can't be resolved from
 *     there. We resolve tsx's loader against this file and pass the file: URL.
 *   - No recursive `fs.rmSync`: on Node 25 it hard-crashes the process
 *     (STATUS_STACK_BUFFER_OVERRUN) and would drop the verdict line below.
 *     The unique mkdtemp dir is left for the OS temp sweep.
 *     (memory: careermate-node25-rmsync-crash)
 *
 * Driven by scripts/run.mjs, which reads the INIT_TEST_VERDICT line.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

let pass = 0;
let fail = 0;

function ok(name: string, condition: unknown): void {
  if (condition) {
    pass += 1;
    console.log(`  ✅ ${name}`);
  } else {
    fail += 1;
    console.log(`  ❌ ${name}`);
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
// Absolute tsx loader so the child `init` can load TS regardless of its cwd.
const tsxLoader = pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-init-'));
const workspace = path.join(tmp, 'workspace');
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(workspace, { recursive: true });

console.log('\ninit 설치 동작');
try {
  // init.ts는 sqlite를 쓰지 않으므로 --experimental-sqlite는 붙이지 않는다.
  const res = spawnSync(
    process.execPath,
    ['--no-warnings', '--import', tsxLoader, path.join(here, 'init.ts'), '--client', 'claude-code', '--npx'],
    {
      cwd: workspace,
      encoding: 'utf8',
      env: { ...process.env, CAREERMATE_DATA_DIR: dataDir },
      timeout: 30000,
    },
  );

  ok('init 명령 성공', res.status === 0);
  const mcpPath = path.join(workspace, '.mcp.json');
  const exists = fs.existsSync(mcpPath);
  ok('현재 작업 폴더에 .mcp.json 생성', exists);

  if (exists) {
    const parsed = JSON.parse(fs.readFileSync(mcpPath, 'utf8')) as {
      mcpServers?: Record<string, { type?: string; command?: string; args?: string[] }>;
    };
    const server = parsed.mcpServers?.careermate;
    ok('Claude Code stdio 타입 등록', server?.type === 'stdio');
    ok('npx 실행 명령 등록', server?.command === 'npx');
    ok('careermate mcp 인자 등록', JSON.stringify(server?.args) === JSON.stringify(['-y', 'careermate', 'mcp']));
  } else {
    // 파일이 없으면 나머지 단언도 실패로 남기고, 원인 파악용으로 init 출력을 흘려준다.
    ok('Claude Code stdio 타입 등록', false);
    ok('npx 실행 명령 등록', false);
    ok('careermate mcp 인자 등록', false);
    console.log((res.stdout || '') + (res.stderr || ''));
  }
} catch (e) {
  fail += 1;
  console.log(`  ❌ 예외 발생: ${e instanceof Error ? e.message : String(e)}`);
}

console.log(`\n결과: ${pass} 통과 · ${fail} 실패`);
console.log(fail === 0 ? 'INIT_TEST_VERDICT PASS' : `INIT_TEST_VERDICT FAIL ${fail}`);
process.exit(fail === 0 ? 0 : 1);
