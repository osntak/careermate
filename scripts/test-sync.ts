/**
 * Folder sync (CAREERMATE_SYNC_DIR). Each "PC" is its own data dir, and every step runs in a
 * child process the way web/MCP would, so the DB singleton and env are fresh each time.
 *
 *   node --experimental-sqlite --import tsx scripts/test-sync.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF = fileURLToPath(import.meta.url);

/* ------------------------------------------------------------- child side */
if (process.argv[2] === 'child') {
  const db = await import('../packages/db/src/index.ts');
  const out: Record<string, unknown> = {};
  for (const op of process.argv.slice(3)) {
    const [cmd, arg] = op.split('=');
    if (cmd === 'name') db.profileRepo.save({ name: arg });
    else if (cmd === 'sync') out.status = await db.runSyncCycle({ fetch: true });
    else if (cmd === 'tick') out.status = await db.runSyncCycle({ fetch: false });
    else if (cmd === 'read') out.name = db.profileRepo.get()?.name ?? null;
    else if (cmd === 'photo') db.saveProfilePhoto(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]));
    else if (cmd === 'hasphoto') out.photo = db.readProfilePhoto()?.bytes.length ?? 0;
    else if (cmd === 'connect' || cmd === 'disconnect') {
      try {
        out.status = await db.setSyncDir(cmd === 'connect' ? arg : null);
      } catch (e) {
        out.error = (e as Error).message;
      }
    } else if (cmd === 'movedata') {
      try {
        out.moved = db.changeDataDir(arg);
      } catch (e) {
        out.error = (e as Error).message;
      }
    } else if (cmd === 'where') out.dataDir = db.getDataDir();
    else if (cmd === 'gitconnect') {
      try {
        out.connect = await db.connectGitRepo(op.slice(cmd.length + 1));
      } catch (e) {
        out.error = (e as { code?: string }).code ?? (e as Error).message;
      }
    } else if (cmd === 'tool') {
      const { TOOLS } = await import('../packages/mcp-tools/src/index.ts');
      const r = await TOOLS.find((t) => t.name === 'connect_external_storage')!.handler({ method: arg });
      out.text = r.text;
    }
  }
  db.closeDb();
  console.log('RESULT ' + JSON.stringify(out));
  process.exit(0);
}

/* ------------------------------------------------------------ parent side */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-sync-'));
const gitEnv = { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' };

interface Status {
  enabled: boolean;
  mode?: string;
  last_error: string | null;
  warnings: { code: string; paths?: string[] }[];
  last_conflict: { backup_dir: string } | null;
}
interface ChildOut {
  status?: Status & { source?: string; dir?: string };
  name?: string | null;
  photo?: number;
  error?: string;
  moved?: { data_dir: string; copied: boolean };
  dataDir?: string;
  connect?: { dir: string; how: string; status: Status & { mode?: string } };
  text?: string;
}
/** `dataDir` null = no CAREERMATE_DATA_DIR; `home` then stands in for the user's home folder. */
function pc(dataDir: string | null, syncDir: string | null, ...ops: string[]): ChildOut {
  const env: NodeJS.ProcessEnv = { ...process.env, ...gitEnv, CAREERMATE_NO_UPDATE_CHECK: '1' };
  if (dataDir) env.CAREERMATE_DATA_DIR = dataDir;
  else {
    delete env.CAREERMATE_DATA_DIR;
    env.HOME = env.USERPROFILE = path.join(tmp, 'home');
  }
  if (syncDir) env.CAREERMATE_SYNC_DIR = syncDir;
  else delete env.CAREERMATE_SYNC_DIR;
  const r = spawnSync(process.execPath, ['--no-warnings', '--experimental-sqlite', '--import', 'tsx', SELF, 'child', ...ops], { env, encoding: 'utf8' });
  const line = (r.stdout || '').split('\n').find((l) => l.startsWith('RESULT '));
  if (!line) throw new Error(`child failed: ${r.stderr}`);
  return JSON.parse(line.slice(7));
}
const gitIn = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, env: { ...process.env, ...gitEnv }, encoding: 'utf8' }).trim();
const codes = (s?: Status): string[] => (s?.warnings ?? []).map((w) => w.code);
const mtimes = (dir: string): string =>
  fs.readdirSync(dir, { recursive: true }).map(String).sort().map((f) => `${f}:${fs.statSync(path.join(dir, f)).mtimeMs}`).join('|');

let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean, detail = ''): void {
  if (cond) pass++;
  else fail++;
  console.log(`  ${cond ? '✅' : '❌'} ${name}${!cond && detail ? ` - ${detail}` : ''}`);
}

try {
  /* ---- unset: nothing runs */
  {
    const A = path.join(tmp, 'off');
    const r = pc(A, null, 'name=Off', 'sync');
    ok('미설정: 동기화 꺼짐 상태', r.status?.enabled === false);
    ok('미설정: sync-state.json 을 만들지 않음', !fs.existsSync(path.join(A, 'sync-state.json')));
  }

  /* ---- connect from Settings (config.json) instead of the env var */
  {
    const D = path.join(tmp, 'cfg');
    const F = path.join(tmp, 'cfg-share');
    fs.mkdirSync(F, { recursive: true });
    const c = pc(D, null, 'name=Cfg', 'connect=' + F);
    ok('설정에서 연결: 켜지고 바로 내보냄', c.status?.enabled === true && c.status.source === 'settings' && fs.existsSync(path.join(F, 'careermate', 'meta.json')), JSON.stringify(c));
    ok('설정에서 연결: 다시 시작해도 유지', pc(D, null, 'sync').status?.enabled === true);
    ok('데이터 폴더와 겹치면 연결 거부', !!pc(D, null, 'connect=' + D).error);
    const envLocked = pc(D, F, 'disconnect');
    ok('환경변수로 켠 경우 설정에서 못 바꿈', !!envLocked.error, JSON.stringify(envLocked));
    const d = pc(D, null, 'disconnect');
    ok('연결 해제: 꺼지고 폴더는 남음', d.status?.enabled === false && fs.existsSync(path.join(F, 'careermate', 'meta.json')), JSON.stringify(d));
  }

  /* ---- change the data folder from Settings */
  {
    const NEW = path.join(tmp, 'moved');
    fs.mkdirSync(NEW, { recursive: true });
    pc(null, null, 'name=Mover');
    const m = pc(null, null, 'movedata=' + NEW, 'where');
    ok('데이터 폴더 변경: 빈 폴더에 복사', m.moved?.copied === true && fs.existsSync(path.join(NEW, 'careermate.sqlite')), JSON.stringify(m));
    ok('데이터 폴더 변경: 다시 시작 전까지는 기존 폴더', m.dataDir === path.join(tmp, 'home', '.careermate'), String(m.dataDir));
    const after = pc(null, null, 'where', 'read');
    ok('데이터 폴더 변경: 다시 시작하면 새 폴더와 데이터', after.dataDir === NEW && after.name === 'Mover', JSON.stringify(after));
    ok('데이터 폴더: 환경변수로 지정되면 못 바꿈', !!pc(path.join(tmp, 'locked'), null, 'movedata=' + NEW).error);
  }

  /* ---- AI tool: connect by repo URL (clones into ~/CareerMate-sync) */
  {
    const R2 = path.join(tmp, 'tool-remote.git');
    execFileSync('git', ['init', '--quiet', '--bare', R2]);
    const url = pathToFileURL(R2).href;
    const g = pc(null, null, 'name=ToolUser', 'gitconnect=' + url);
    const cloneDir = path.join(tmp, 'home', 'CareerMate-sync');
    ok('저장소 주소로 연결: clone 후 git 방식으로 켜짐', g.connect?.dir === cloneDir && g.connect.status.mode === 'git' && fs.existsSync(path.join(cloneDir, 'careermate', 'meta.json')), JSON.stringify(g));
    const pushed = Number(execFileSync('git', ['--git-dir', R2, 'rev-list', '--count', '--all'], { encoding: 'utf8' }).trim() || 0);
    ok('저장소 주소로 연결: 바로 push 까지', pushed >= 1, String(pushed));
    ok('같은 주소로 다시 연결하면 기존 clone 재사용', !pc(null, null, 'gitconnect=' + url).error);
    const other = path.join(tmp, 'other.git');
    execFileSync('git', ['init', '--quiet', '--bare', other]);
    ok('다른 저장소인데 폴더가 이미 쓰이면 거부', pc(null, null, 'gitconnect=' + pathToFileURL(other).href).error === 'target_busy');
    ok('주소 형식이 아니면 거부', pc(null, null, 'gitconnect=not a url').error === 'bad_url');
    const guide = pc(null, null, 'tool=guide').text ?? '';
    ok('안내 모드: 두 방식과 개인정보 주의를 설명', guide.includes('Google Drive') && guide.includes('GitHub') && guide.includes('비공개'), guide.slice(0, 80));
    ok('저장소 만들기 안내: Private 선택 단계 포함', (pc(null, null, 'tool=repo_guide').text ?? '').includes('Private'));
    pc(null, null, 'disconnect');
  }

  /* ---- folder mode */
  const S = path.join(tmp, 'shared');
  const A = path.join(tmp, 'A');
  const B = path.join(tmp, 'B');
  const snap = path.join(S, 'careermate');
  {
    const r = pc(A, S, 'name=Alice', 'sync');
    ok('폴더: 첫 PC가 내보냄', fs.existsSync(path.join(snap, 'meta.json')) && fs.existsSync(path.join(snap, 'tables', 'profile.json')), JSON.stringify(r.status));
    ok('폴더: 상태가 folder 방식', r.status?.mode === 'folder' && !r.status.last_error, JSON.stringify(r.status));
    const meta = JSON.parse(fs.readFileSync(path.join(snap, 'meta.json'), 'utf8'));
    ok('폴더: meta.json 에 매번 바뀌는 시각이 없음', !('exported_at' in meta) && meta.format === 1);

    const before = mtimes(snap);
    pc(A, S, 'sync');
    pc(A, S, 'tick');
    ok('폴더: 변경 없이 재시작하면 파일을 다시 쓰지 않음', mtimes(snap) === before);

    const b = pc(B, S, 'sync', 'read');
    ok('폴더: 새 PC(빈 DB)는 들여옴', b.name === 'Alice', JSON.stringify(b));
    ok('폴더: 들여오기 전에 안전 백업을 만듦', fs.readdirSync(path.join(B, 'backups')).some((f) => f.startsWith('sync-import-')));
    pc(A, S, 'photo', 'sync');
    ok('사진: 바이너리 파일로 내보냄', fs.existsSync(path.join(snap, 'profile_photo.png')));
    const bp = pc(B, S, 'sync', 'hasphoto');
    ok('사진: 다른 PC가 들여옴', bp.photo === 12, JSON.stringify(bp));
    const before2 = mtimes(snap);
    pc(B, S, 'sync');
    pc(A, S, 'sync');
    ok('폴더: 들여온 PC가 다시 시작해도 내보내지 않음(핑퐁 없음)', mtimes(snap) === before2);

    pc(B, S, 'name=Bob', 'tick');
    const a = pc(A, S, 'sync', 'read');
    ok('폴더: 다른 PC 변경을 들여옴', a.name === 'Bob', JSON.stringify(a));
    ok('폴더: 한쪽만 바뀐 건 충돌이 아님', !codes(a.status).includes('conflict'));

    // both sides edit before syncing
    pc(A, S, 'name=A-edit');
    pc(B, S, 'name=B-edit');
    pc(A, S, 'sync');
    const c = pc(B, S, 'sync', 'read');
    ok('충돌: 로컬 우선', c.name === 'B-edit', JSON.stringify(c));
    ok('충돌: 경고 노출', codes(c.status).includes('conflict'), JSON.stringify(c.status));
    const backupDir = c.status?.last_conflict?.backup_dir ?? '';
    const backed = backupDir && fs.existsSync(path.join(backupDir, 'tables', 'profile.json')) ? fs.readFileSync(path.join(backupDir, 'tables', 'profile.json'), 'utf8') : '';
    ok('충돌: 원격 스냅샷을 백업', backed.includes('A-edit'), backupDir);
    ok('충돌: 이후 스냅샷은 로컬 내용', fs.readFileSync(path.join(snap, 'tables', 'profile.json'), 'utf8').includes('B-edit'));

    // half-arrived snapshot: a table file that does not match meta.json
    const skills = path.join(snap, 'tables', 'skills.json');
    const goodSkills = fs.readFileSync(skills);
    fs.writeFileSync(skills, '[{"id":"x"}]\n');
    const p = pc(A, S, 'sync', 'read');
    ok('반쯤 받은 스냅샷: 들여오지 않고 건너뜀', codes(p.status).includes('partial_snapshot') && p.name === 'A-edit', JSON.stringify(p));
    fs.writeFileSync(skills, goodSkills);

    // Drive conflict copy
    const copy = path.join(snap, 'tables', 'profile (1).json');
    fs.writeFileSync(copy, '[]\n');
    const d = pc(A, S, 'sync', 'read');
    ok('Drive 사본: 경고하고 무시', codes(d.status).includes('conflict_copies') && d.name === 'B-edit', JSON.stringify(d));
    ok('Drive 사본: 지우지 않음', fs.existsSync(copy));
    fs.unlinkSync(copy);

    // a PC that already has its own data joins the shared folder: shared data wins, own data backed up
    const C = path.join(tmp, 'C');
    const j = pc(C, S, 'name=C-own', 'sync', 'read');
    ok('처음 연결하는 PC(데이터 있음): 공유 데이터를 가져옴', j.name === 'B-edit', JSON.stringify(j));
    const joinWarn = j.status?.warnings.find((w) => w.code === 'first_join');
    ok('처음 연결하는 PC: 자기 데이터를 백업하고 경고', !!joinWarn?.paths?.[0] && fs.readFileSync(joinWarn.paths[0], 'utf8').includes('C-own'), JSON.stringify(j.status));
    ok('처음 연결하는 PC: 공유 스냅샷은 그대로', fs.readFileSync(path.join(snap, 'tables', 'profile.json'), 'utf8').includes('B-edit'));

    // DB file lost but sync-state.json left: must not push an empty snapshot over everyone
    for (const f of fs.readdirSync(C).filter((f) => f.startsWith('careermate.sqlite'))) fs.unlinkSync(path.join(C, f));
    const e = pc(C, S, 'sync');
    ok('빈 DB: 내보내지 않고 경고', codes(e.status).includes('empty_local') && fs.readFileSync(path.join(snap, 'tables', 'profile.json'), 'utf8').includes('B-edit'), JSON.stringify(e.status));

    // snapshot files present but meta.json not there yet
    const metaFile = path.join(snap, 'meta.json');
    const metaKeep = fs.readFileSync(metaFile);
    fs.unlinkSync(metaFile);
    const nm = pc(A, S, 'sync');
    ok('meta.json 없이 파일만 있음: 반쯤 받은 것으로 보고 건너뜀', codes(nm.status).includes('partial_snapshot') && !fs.existsSync(metaFile), JSON.stringify(nm.status));
    fs.writeFileSync(metaFile, metaKeep);

    // remote written by a newer CareerMate
    const metaPath = path.join(snap, 'meta.json');
    const metaRaw = fs.readFileSync(metaPath, 'utf8');
    const m = JSON.parse(metaRaw);
    pc(B, S, 'name=from-newer', 'sync');
    const newer = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    newer.schema_version = m.schema_version + 1;
    fs.writeFileSync(metaPath, JSON.stringify(newer, null, 2) + '\n');
    const n = pc(A, S, 'sync', 'read');
    ok('원격이 더 새 버전: 들여오지 않음', n.name === 'B-edit', JSON.stringify(n));
    ok('원격이 더 새 버전: 업데이트 경고', codes(n.status).includes('newer_schema'));
  }

  /* ---- git mode: one bare repo, two clones */
  {
    const R = path.join(tmp, 'remote.git');
    execFileSync('git', ['init', '--quiet', '--bare', R]);
    const GA = path.join(tmp, 'ga');
    const GB = path.join(tmp, 'gb');
    execFileSync('git', ['clone', '--quiet', R, GA], { stdio: 'ignore' });
    execFileSync('git', ['clone', '--quiet', R, GB], { stdio: 'ignore' });
    const DA = path.join(tmp, 'gA');
    const DB = path.join(tmp, 'gB');
    const commits = (): number => Number(execFileSync('git', ['--git-dir', R, 'rev-list', '--count', '--all'], { encoding: 'utf8' }).trim() || 0);

    const a = pc(DA, GA, 'name=G1', 'sync');
    ok('git: 첫 PC가 commit + push', a.status?.mode === 'git' && !a.status.last_error && commits() === 1, JSON.stringify(a.status));
    ok('git: 커밋 메시지 형식', gitIn(GA, 'log', '-1', '--format=%s').startsWith('careermate sync: '));

    const b = pc(DB, GB, 'sync', 'read');
    ok('git: 새 PC가 pull 후 들여옴', b.name === 'G1', JSON.stringify(b));

    pc(DA, GA, 'sync');
    pc(DB, GB, 'sync');
    ok('git: 변경 없이 재시작하면 커밋 없음', commits() === 1, String(commits()));

    pc(DB, GB, 'name=G2', 'tick');
    ok('git: 쓴 뒤 짧은 주기에서 push', commits() === 2 && !fs.existsSync(path.join(DB, 'sync.lock')));
    const a2 = pc(DA, GA, 'sync', 'read');
    ok('git: 켜 둔 PC가 원격 확인 주기에 충돌 없이 들여옴', a2.name === 'G2' && !codes(a2.status).includes('conflict'), JSON.stringify(a2));

    // offline: B commits locally, push fails; meanwhile A pushes -> diverged
    const url = gitIn(GB, 'remote', 'get-url', 'origin');
    gitIn(GB, 'remote', 'set-url', 'origin', path.join(tmp, 'nowhere.git'));
    const off = pc(DB, GB, 'name=B-offline', 'tick');
    ok('오프라인: push 실패를 상태에 표시', !!off.status?.last_error, JSON.stringify(off.status));
    ok('오프라인: 로컬 commit 은 만들어 둠', gitIn(GB, 'log', '-1', '--format=%s').startsWith('careermate sync: ') && gitIn(GB, 'status', '--porcelain', '--', 'careermate') === '');
    pc(DA, GA, 'name=A-online', 'tick');
    gitIn(GB, 'remote', 'set-url', 'origin', url);
    const back = pc(DB, GB, 'sync', 'read');
    ok('갈라진 이력: 로컬 우선', back.name === 'B-offline' && !back.status?.last_error, JSON.stringify(back));
    const cdir = back.status?.last_conflict?.backup_dir ?? '';
    ok('갈라진 이력: 원격 스냅샷 백업', !!cdir && fs.readFileSync(path.join(cdir, 'tables', 'profile.json'), 'utf8').includes('A-online'), cdir);
    const final = pc(DA, GA, 'sync', 'read');
    ok('갈라진 이력: 다시 연결되면 push 되어 다른 PC가 받음', final.name === 'B-offline', JSON.stringify(final));
  }
} catch (e) {
  fail++;
  console.log(`  ❌ 예외: ${e instanceof Error ? e.stack : String(e)}`);
} finally {
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* Windows may still hold a handle */
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log(fail === 0 ? 'SYNC_VERDICT PASS' : 'SYNC_VERDICT FAIL');
process.exit(fail === 0 ? 0 : 1);
