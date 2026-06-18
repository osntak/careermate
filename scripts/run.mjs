// Plain-Node test runner (no tsx). Runs a tsx test script as a child and derives
// the real pass/fail from a stdout verdict sentinel.
//
// Why: on Windows, a tsx module that uses top-level `await` and then calls
// process.exit() exits with a corrupted code (the esbuild loader is mid-flight).
// This runner is plain Node, so ITS exit code is reliable; it ignores the
// child's mangled code and trusts the printed verdict instead.
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const [, , scriptPath, sentinel] = process.argv;
if (!scriptPath || !sentinel) {
  console.error('usage: node scripts/run.mjs <script.ts> "<PASS SENTINEL>"');
  process.exit(2);
}

const res = spawnSync(process.execPath, ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', scriptPath], {
  encoding: 'utf8',
  env: process.env,
  timeout: 180000,
});

// Surface the child's output (minus the noisy Windows libuv teardown lines).
const clean = (s) =>
  (s || '')
    .split('\n')
    .filter((l) => !/Assertion failed|async\.c|UV_HANDLE|^Node\.js v\d/.test(l))
    .join('\n');
process.stdout.write(clean(res.stdout));
if (res.stderr) process.stderr.write(clean(res.stderr));

const passed = (res.stdout || '').includes(sentinel);
process.exit(passed ? 0 : 1);
