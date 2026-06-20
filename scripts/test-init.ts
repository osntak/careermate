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
import { fileURLToPath } from 'node:url';

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
const repoRoot = path.resolve(here, '..');
// 실제 배포 진입점(bin/careermate.mjs)을 그대로 호출한다. bin이 자식 cwd를 패키지 루트로 고정하되
// 사용자 작업 폴더를 CAREERMATE_INIT_CWD로 넘기므로, init이 .mcp.json·권한 설정을 작업 폴더(workspace)에
// 써야 한다. 이 경로로 호출해야 "init이 패키지 루트에 써버리던" cwd 회귀를 잡을 수 있다.
const binPath = path.join(repoRoot, 'bin', 'careermate.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-init-'));
const workspace = path.join(tmp, 'workspace');
const dataDir = path.join(tmp, 'data');
fs.mkdirSync(workspace, { recursive: true });

console.log('\ninit 설치 동작');
try {
  const res = spawnSync(
    process.execPath,
    ['--no-warnings', binPath, 'init', '--client', 'claude-code', '--npx'],
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

  // 사전허용: .mcp.json 옆(작업 폴더)에 .claude/settings.local.json이 생기고, SAFE만 허용·민감은 제외인지.
  const settingsPath = path.join(workspace, '.claude', 'settings.local.json');
  const settingsExist = fs.existsSync(settingsPath);
  ok('작업 폴더에 .claude/settings.local.json 생성', settingsExist);
  if (settingsExist) {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as {
      enabledMcpjsonServers?: unknown;
      permissions?: { allow?: unknown };
    };
    const enabled = Array.isArray(s.enabledMcpjsonServers) ? (s.enabledMcpjsonServers as string[]) : [];
    const allow = new Set(Array.isArray(s.permissions?.allow) ? (s.permissions?.allow as string[]) : []);

    ok('careermate 서버 신뢰 등록(enabledMcpjsonServers)', enabled.includes('careermate'));
    ok('SAFE 도구 사전허용(get_onboarding_status)', allow.has('mcp__careermate__get_onboarding_status'));
    ok('SAFE 도구 사전허용(save_fit_analysis)', allow.has('mcp__careermate__save_fit_analysis'));

    // 민감/파괴 도구는 사전허용에서 제외 → 프롬프트 유지.
    const MUST_PROMPT = [
      'read_document', 'read_inbox', 'open_inbox', 'open_dashboard',
      'open_application', 'update_careermate', 'delete_cover_letter', 'delete_job_posting',
    ];
    const leaked = MUST_PROMPT.filter((t) => allow.has(`mcp__careermate__${t}`));
    ok(`민감/파괴 도구는 사전허용 제외 (누출: ${leaked.join(', ') || '없음'})`, leaked.length === 0);

    // 다른 서버/Bash/와일드카드가 섞이지 않고 careermate 네임스페이스로만 한정.
    const offServer = [...allow].filter((r) => !r.startsWith('mcp__careermate__'));
    ok(`사전허용은 careermate 네임스페이스로만 한정 (이탈: ${offServer.join(', ') || '없음'})`, offServer.length === 0);

    // 드리프트 가드: manifest(레지스트리에서 생성)의 모든 도구가 SAFE(허용) 또는 MUST_PROMPT로 분류돼야 한다.
    const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'manifest.json'), 'utf8')) as {
      tools?: { name: string }[];
    };
    const manifestTools = (manifest.tools ?? []).map((t) => t.name);
    const unclassified = manifestTools.filter(
      (t) => !allow.has(`mcp__careermate__${t}`) && !MUST_PROMPT.includes(t),
    );
    ok(`새 도구 분류 누락 없음 (미분류: ${unclassified.join(', ') || '없음'})`, unclassified.length === 0);

    // 사전허용 항목은 모두 실재하는 도구여야 한다(오타/유령 방지).
    const allowedNames = [...allow].map((r) => r.replace('mcp__careermate__', ''));
    const phantom = allowedNames.filter((n) => !manifestTools.includes(n));
    ok(`사전허용 도구는 모두 실재 (유령/오타: ${phantom.join(', ') || '없음'})`, phantom.length === 0);
  }
} catch (e) {
  fail += 1;
  console.log(`  ❌ 예외 발생: ${e instanceof Error ? e.message : String(e)}`);
}

console.log(`\n결과: ${pass} 통과 · ${fail} 실패`);
console.log(fail === 0 ? 'INIT_TEST_VERDICT PASS' : `INIT_TEST_VERDICT FAIL ${fail}`);
process.exit(fail === 0 ? 0 : 1);
