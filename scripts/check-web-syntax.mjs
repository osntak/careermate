// Parse-check every dashboard script (apps/web/public, apps/web/demo). Nothing else parses
// them before a browser does: tsc skips plain JS here and the API tests never load pages,
// so a syntax error in a page only showed up as a blank screen.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const files = [];
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
};
walk('apps/web/public');
walk('apps/web/demo');

const bad = files.filter((f) => {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) process.stderr.write(`${f}\n${r.stderr}\n`);
  return r.status !== 0;
});
console.log(`web syntax: ${files.length - bad.length}/${files.length} ok`);
process.exit(bad.length ? 1 : 0);
