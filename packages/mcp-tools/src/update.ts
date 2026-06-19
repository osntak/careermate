/**
 * 업데이트 확인 + 자기 업데이트.
 *
 * CareerMate는 `npm install --prefix <설치폴더> careermate`로 한 곳에 **고정 설치**된다
 * (npx@latest 매 실행 방식의 불안정함을 피하기 위함). 고정 설치라 자동 최신화가 안 되므로,
 * 사용자가 새 버전을 모르고 지나가는 갭을 메우는 두 장치를 둔다:
 *
 *   1) getUpdateStatus()  — 비차단 신호. 캐시(24h)를 동기로 읽고, 만료면 백그라운드로만
 *      재확인한다. get_onboarding_status 응답에 실어 에이전트가 사용자에게 알리게 한다.
 *   2) runSelfUpdate()    — 사용자가 "업데이트해줘"라고 하면 에이전트가 호출. 설치 폴더에
 *      `npm install ... careermate@latest`를 실행하고 재시작을 안내한다(재시작 시 DB는
 *      connection.ts의 migrate()가 자동 적용).
 *
 * 네트워크: 공개 npm 레지스트리(registry.npmjs.org)에 버전만 GET한다. 사용자 데이터는
 * 전송하지 않는다. `CAREERMATE_NO_UPDATE_CHECK=1`로 끌 수 있다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { getDataDir } from '@careermate/db';
import { APP_VERSION, BUNDLED } from '@careermate/shared';

const REGISTRY_URL = 'https://registry.npmjs.org/careermate/latest';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 성공한 확인은 하루에 한 번만
const NULL_CACHE_TTL_MS = 30 * 60 * 1000; // 실패(오프라인 등)는 30분 뒤 재시도 — 하루 동안 고정되지 않게
const FETCH_TIMEOUT_MS = 1500;
const INSTALL_TIMEOUT_MS = 120_000;

const cacheFile = (): string => path.join(getDataDir(), '.update-check.json');

function checkDisabled(): boolean {
  const v = process.env.CAREERMATE_NO_UPDATE_CHECK?.trim().toLowerCase();
  return v === '1' || v === 'true';
}

/** x.y.z[-pre][+build] 비교. a>b면 1, a<b면 -1, 같으면 0. 정식 릴리스가 프리릴리스보다 높다(semver). */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const noBuild = (v.split('+', 1)[0] ?? '').trim(); // build metadata(+...)는 우선순위에 영향 없음
    const dash = noBuild.indexOf('-');
    const core = dash === -1 ? noBuild : noBuild.slice(0, dash);
    const pre = dash === -1 ? '' : noBuild.slice(dash + 1);
    const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
    return { nums, pre };
  };
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (pa.nums[i] ?? 0) - (pb.nums[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  // 코어 동일: 프리릴리스 비교. 프리릴리스 없음(정식)이 있음보다 높다.
  if (pa.pre === '' && pb.pre === '') return 0;
  if (pa.pre === '') return 1;
  if (pb.pre === '') return -1;
  return comparePrerelease(pa.pre, pb.pre);
}

/**
 * semver 프리릴리스 식별자 비교(점으로 분리). 규칙: 숫자vs숫자는 수치 비교,
 * 숫자는 영숫자보다 낮음, 영숫자는 사전식, 모두 같으면 식별자가 적은 쪽이 낮음.
 * 예: rc.2 < rc.10, alpha < beta, 1.0.0-rc < 1.0.0-rc.1
 */
function comparePrerelease(a: string, b: string): number {
  const as = a.split('.');
  const bs = b.split('.');
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i];
    const y = bs[i];
    if (x === undefined) return -1; // 식별자가 적은 쪽이 낮음
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x);
    const yn = /^\d+$/.test(y);
    if (xn && yn) {
      const d = parseInt(x, 10) - parseInt(y, 10);
      if (d !== 0) return d > 0 ? 1 : -1;
    } else if (xn !== yn) {
      return xn ? -1 : 1; // 숫자 식별자는 영숫자보다 낮음
    } else if (x !== y) {
      return x < y ? -1 : 1; // 둘 다 영숫자 → 사전식
    }
  }
  return 0;
}

interface UpdateCache {
  checkedAt: number;
  latest: string | null;
}

function readCache(): UpdateCache | null {
  try {
    return JSON.parse(fs.readFileSync(cacheFile(), 'utf8')) as UpdateCache;
  } catch {
    return null;
  }
}

function writeCache(c: UpdateCache): void {
  try {
    fs.writeFileSync(cacheFile(), JSON.stringify(c), 'utf8');
  } catch {
    /* 캐시는 best-effort. 못 써도 동작에 지장 없다. */
  }
}

/** 캐시가 만료됐는지. 실패(latest=null)는 짧은 TTL로 더 자주 재시도한다. */
function cacheExpired(cache: UpdateCache | null): boolean {
  if (!cache) return true;
  const ttl = cache.latest === null ? NULL_CACHE_TTL_MS : CACHE_TTL_MS;
  return Date.now() - cache.checkedAt >= ttl;
}

/** 레지스트리에서 latest 버전만 가져온다. 오프라인/오류면 null(절대 throw 안 함). */
async function fetchLatest(): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(REGISTRY_URL, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as { version?: unknown };
    return typeof json.version === 'string' ? json.version : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let refreshing = false;
function refreshInBackground(): void {
  if (refreshing) return;
  refreshing = true;
  void fetchLatest()
    .then((latest) => writeCache({ checkedAt: Date.now(), latest }))
    .finally(() => {
      refreshing = false;
    });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 이 설치를 담은 npm `--prefix`를 돌려준다(자동 업데이트 대상). 못 구하면 null.
 * 번들 레이아웃: <prefix>/node_modules/careermate/dist/<entry>.mjs — __dirname은 .../dist.
 * 개발(tsx)·전역·npx 캐시 설치는 표준 위치가 아니므로 null.
 */
export function installPrefix(): string | null {
  if (!BUNDLED) return null;
  const pkgRoot = path.resolve(__dirname, '..'); // .../node_modules/careermate
  const parent = path.dirname(pkgRoot); // .../node_modules
  if (path.basename(parent) !== 'node_modules') return null;
  return path.dirname(parent); // .../  ← npm --prefix
}

function manualCommand(): string {
  const prefix = installPrefix();
  return prefix
    ? `npm install --prefix "${prefix}" careermate@latest`
    : 'npm install --prefix "<설치 폴더>" careermate@latest';
}

export interface UpdateStatus {
  current: string;
  latest: string | null;
  update_available: boolean;
  /** 사용자가 직접 칠 수 있는 업데이트 명령(자동 실행이 막힐 때 안내용). */
  update_command: string;
}

/** 캐시 상태에서 UpdateStatus를 조립한다(동기/비동기 두 경로 공통). */
function buildStatus(cache: UpdateCache | null): UpdateStatus {
  const current = APP_VERSION;
  const latest = cache?.latest ?? null;
  return {
    current,
    latest,
    update_available: !!latest && compareVersions(latest, current) > 0,
    update_command: manualCommand(),
  };
}

/**
 * 비차단 업데이트 신호. 캐시를 동기로 읽고, 만료됐으면 백그라운드 재확인만 건다(절대 await 안 함).
 * get_onboarding_status 등 자주 불리는 도구에서 쓰기 위함 — 네트워크로 도구 호출을 막지 않는다.
 */
export function getUpdateStatus(): UpdateStatus {
  if (checkDisabled()) return buildStatus(null);
  const cache = readCache();
  if (cacheExpired(cache)) refreshInBackground();
  return buildStatus(cache);
}

/**
 * 즉시(바운드) 업데이트 확인. 캐시가 만료면 레지스트리를 한 번 await하고 캐시를 갱신한다.
 * doctor·check_for_update처럼 "지금 확인" 의미가 분명한 일회성 호출에서 사용.
 */
export async function getUpdateStatusAsync(): Promise<UpdateStatus> {
  if (checkDisabled()) return buildStatus(null);
  let cache = readCache();
  if (cacheExpired(cache)) {
    cache = { checkedAt: Date.now(), latest: await fetchLatest() };
    writeCache(cache);
  }
  return buildStatus(cache);
}

export interface UpdateResult {
  ok: boolean;
  from: string;
  to: string | null;
  message: string;
  /** 자동 업데이트가 막힌 경우 사용자가 직접 칠 명령. */
  manual?: string;
}

/**
 * 자식 프로세스 트리를 종료한다. Windows의 child.kill()은 `cmd` 래퍼만 죽이고 그 아래
 * npm/node 압축해제 프로세스는 살아남아(트리킬 아님) 설치를 반쯤 덮어쓸 수 있다. taskkill로
 * 트리 전체를 강제 종료한다. 그 외 OS는 child.kill()로 충분.
 */
function killTree(child: ReturnType<typeof spawn>): void {
  if (process.platform === 'win32' && child.pid) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).on('error', () => {});
      return;
    } catch {
      /* taskkill을 못 띄우면 아래 기본 kill로 폴백 */
    }
  }
  child.kill();
}

function npmInstallLatest(prefix: string): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = (r: { ok: boolean; error?: string }): void => {
      if (settled) return; // 타임아웃과 close가 경쟁해도 한 번만 resolve
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(r);
    };
    // Windows에서 .cmd 직접 spawn은 Node 보안 변경으로 까다롭다 → cmd /c로 명령 문자열을 넘겨
    // prefix 경로의 공백까지 안전히 인용한다. 그 외 OS는 배열 인자(셸 없음)로 실행.
    const [cmd, args] =
      process.platform === 'win32'
        ? ['cmd', ['/c', `npm install --prefix "${prefix}" careermate@latest`]]
        : ['npm', ['install', '--prefix', prefix, 'careermate@latest']];
    let child: ReturnType<typeof spawn>;
    try {
      // stdout은 반드시 'ignore'로 흘려보낸다 — 읽지 않은 채 pipe로 두면 npm의 많은 출력이
      // 파이프 버퍼를 채워 설치가 멈추고(=120s 타임아웃) 반파 위험으로 이어진다. stderr만
      // 캡처해 실패 메시지로 쓴다. cwd는 설치 대상 패키지 안이 아니라 prefix로 고정한다.
      child = spawn(cmd as string, args as string[], { cwd: prefix, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) {
      done({ ok: false, error: e instanceof Error ? e.message : String(e) });
      return;
    }
    let stderr = '';
    child.stderr?.on('data', (d) => {
      if (stderr.length < 8192) stderr += d.toString(); // bounded capture
    });
    timer = setTimeout(() => {
      killTree(child);
      done({ ok: false, error: `시간 초과(${INSTALL_TIMEOUT_MS / 1000}s)` });
    }, INSTALL_TIMEOUT_MS);
    child.on('error', (e) => done({ ok: false, error: e.message }));
    child.on('close', (code) => {
      if (code === 0) done({ ok: true });
      else done({ ok: false, error: stderr.trim().split('\n').slice(-3).join(' ') || `종료 코드 ${code}` });
    });
  });
}

/** careermate를 최신으로 설치한다. 성공해도 적용엔 AI 앱 재시작이 필요하다. */
export async function runSelfUpdate(): Promise<UpdateResult> {
  const from = APP_VERSION;
  const prefix = installPrefix();
  if (!prefix) {
    return {
      ok: false,
      from,
      to: null,
      message:
        '설치 위치를 자동으로 찾지 못했습니다(개발 모드이거나 비표준 설치). 아래 명령을 직접 실행해 업데이트해 주세요.',
      manual: manualCommand(),
    };
  }
  // 최신 버전: 신선한 캐시가 있으면 재사용하고, 없으면 한 번만 조회한다(레지스트리 중복 호출 방지).
  let cache = readCache();
  if (cacheExpired(cache)) {
    cache = { checkedAt: Date.now(), latest: await fetchLatest() };
    writeCache(cache);
  }
  const latest = cache?.latest ?? null;
  // 최신 버전을 확인하지 못함(오프라인/레지스트리 오류): 무엇을 설치할지 모른 채 실행 중인
  // 설치를 덮어쓰면 반파 위험이 있으므로 시도하지 않고 안내한다.
  if (latest === null) {
    return {
      ok: false,
      from,
      to: null,
      message:
        '최신 버전을 확인하지 못했습니다(오프라인이거나 레지스트리 일시 오류). 잠시 후 다시 시도하거나 아래 명령을 직접 실행해 주세요.',
      manual: manualCommand(),
    };
  }
  if (compareVersions(latest, from) <= 0) {
    return { ok: true, from, to: from, message: `이미 최신 버전입니다 (v${from}).` };
  }
  const installed = await npmInstallLatest(prefix);
  if (!installed.ok) {
    return {
      ok: false,
      from,
      to: latest,
      message: `업데이트 설치에 실패했습니다: ${installed.error}`,
      manual: manualCommand(),
    };
  }
  writeCache({ checkedAt: Date.now(), latest });
  return {
    ok: true,
    from,
    to: latest,
    message: `CareerMate를 ${latest ? `v${latest}` : '최신 버전'}(으)로 업데이트했습니다. 적용하려면 AI 앱(또는 MCP 연결)을 재시작하세요. 재시작 시 데이터베이스는 자동으로 마이그레이션되며 기존 데이터는 보존됩니다.`,
  };
}
