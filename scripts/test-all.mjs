// Aggregating test runner. Runs EVERY suite to completion — no `&&` short-circuit
// — so one environment-sensitive failure can't hide the rest. The bridge suite,
// for example, needs a bindable localhost port and a detached child process; in a
// sandboxed shell it fails, and under the old `&&` chain that failure silently
// skipped test-verify / test-parsers / test-migrate / the main e2e. Here all eight
// always run, you see exactly which failed, and the process exits non-zero iff any
// suite failed (so CI still catches real regressions).
//
// Two suite kinds:
//  - 'sentinel': a tsx test whose process exit code is unreliable on Windows
//    (top-level await + process.exit() corrupts it — see scripts/run.mjs). Trust a
//    stdout verdict string instead of the exit code.
//  - 'exit': a plain-Node script with a reliable exit code.
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const SUITES = [
  { name: 'i18n keys', kind: 'exit', script: 'scripts/check-i18n-keys.mjs' },
  { name: 'i18n', kind: 'sentinel', script: 'scripts/test-i18n.ts', sentinel: 'I18N_VERDICT PASS' },
  { name: 'init', kind: 'sentinel', script: 'scripts/test-init.ts', sentinel: 'INIT_TEST_VERDICT PASS' },
  { name: 'bridge', kind: 'sentinel', script: 'scripts/test-bridge.ts', sentinel: 'BRIDGE_TEST_VERDICT PASS' },
  { name: 'verify', kind: 'sentinel', script: 'scripts/test-verify.ts', sentinel: 'VERIFY_VERDICT PASS' },
  { name: 'parsers', kind: 'sentinel', script: 'scripts/test-parsers.ts', sentinel: 'PARSERS_VERDICT PASS' },
  { name: 'migrate', kind: 'sentinel', script: 'scripts/test-migrate.ts', sentinel: 'MIGRATE_VERDICT PASS' },
  { name: 'core+api', kind: 'sentinel', script: 'scripts/test.ts', sentinel: 'TEST_VERDICT PASS' },
];

// Drop the noisy Windows libuv teardown lines (same filter as run.mjs).
const clean = (s) =>
  (s || '')
    .split('\n')
    .filter((l) => !/Assertion failed|async\.c|UV_HANDLE|^Node\.js v\d/.test(l))
    .join('\n');

function runSuite(suite) {
  const args =
    suite.kind === 'sentinel'
      ? ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', suite.script]
      : ['--no-warnings', suite.script];
  const res = spawnSync(process.execPath, args, { encoding: 'utf8', env: process.env, timeout: 180000 });
  process.stdout.write(clean(res.stdout));
  if (res.stderr) process.stderr.write(clean(res.stderr));
  if (suite.kind === 'sentinel') return (res.stdout || '').includes(suite.sentinel);
  return res.status === 0;
}

const results = [];
for (const suite of SUITES) {
  console.log(`\n──────── ${suite.name} ────────`);
  let passed = false;
  try {
    passed = runSuite(suite);
  } catch (e) {
    console.error(`  러너 오류: ${e instanceof Error ? e.message : String(e)}`);
  }
  results.push({ name: suite.name, passed });
}

const failed = results.filter((r) => !r.passed);
console.log('\n════════ 요약 ════════');
for (const r of results) console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
console.log(
  `\n${results.length - failed.length}/${results.length} 통과` +
    (failed.length ? ` · 실패: ${failed.map((r) => r.name).join(', ')}` : ''),
);

process.exit(failed.length ? 1 : 0);
