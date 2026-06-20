/**
 * scripts/init.ts — CareerMate 자동 설치/연결.
 *
 * 비개발자도 명령 한 번(또는 AI 에이전트가 INSTALL.md를 따라가며)으로 끝나도록, AI 클라이언트의
 * MCP 설정에 CareerMate 서버를 자동 등록하고 로컬 데이터 폴더를 준비한다. CareerMate 안에는
 * LLM이 없으므로, 이 단계가 끝나면 사용자의 AI가 MCP로 로컬 데이터를 읽고 쓸 수 있다.
 *
 * v1이 지원하는 연결 대상(우선순위 순):
 *   - Claude Desktop  →  claude_desktop_config.json   (JSON · mcpServers)
 *   - Claude Code     →  <현재 작업 폴더>/.mcp.json    (JSON · mcpServers, project scope)
 *   - Codex CLI       →  ~/.codex/config.toml          (TOML · [mcp_servers.careermate])
 *   - Cursor          →  ~/.cursor/mcp.json            (JSON · mcpServers, 기타 MCP 클라이언트 호환)
 *
 * 사용:
 *   careermate init                       감지되는 클라이언트에 등록 (기본: 로컬 실행 모드)
 *   careermate init --client claude-code  특정 클라이언트만 (claude | claude-code | codex | cursor | gemini | antigravity)
 *   careermate init --all-clients         감지 여부와 무관하게 지원하는 모든 클라이언트에 등록
 *   careermate init --npx                 MCP 실행을 npx 방식으로 등록(공개 배포/개발자용)
 *   careermate init --print               실제로 쓰지 않고 등록할 설정/명령만 출력
 *
 * 주의(메모리: careerflow-windows-tsx-exit-gotcha): top-level await + process.exit 조합은
 * Windows tsx에서 종료코드를 오염시키므로, 동기 main()으로 두고 실패는 process.exitCode로만 표시한다.
 */
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** npm에 공개되는 패키지 이름 = MCP 서버 키로도 사용. */
const PKG = 'careermate';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type ConfigFormat = 'mcp-json' | 'codex-toml';

interface ClientTarget {
  id: string;
  label: string;
  format: ConfigFormat;
  configPath: string;
  /** JSON 클라이언트 중 `"type": "stdio"`를 함께 써야 하는 경우(Claude Code). */
  jsonType?: boolean;
  /** project scope처럼 항상 적용 가능한 대상은 감지 없이 기본 포함. */
  alwaysPresent?: boolean;
  /** 설정 경로가 유동적인 대상(Antigravity)은 '실제 파일이 있을 때만' 감지해 추측 파일 생성을 막는다. */
  requireFileForPresent?: boolean;
}

interface ServerEntry {
  command: string;
  args: string[];
}

interface WriteResult {
  changed: boolean;
  backedUp: string | null;
  replacedExisting: boolean;
}

/** 데이터 폴더(@careermate/db의 getDataDir와 동일 규칙). db 패키지를 끌어오지 않으려고 인라인. */
function ensureDataDir(): string {
  const override = process.env.CAREERMATE_DATA_DIR?.trim();
  const dir = override && override.length > 0 ? override : path.join(os.homedir(), '.careermate');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function claudeDesktopConfigPath(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
}

function cursorConfigPath(): string {
  return path.join(os.homedir(), '.cursor', 'mcp.json');
}

/**
 * 사용자가 init을 실행한 '작업 폴더'. bin/careermate.mjs는 tsx 해석을 위해 자식 cwd를 패키지
 * 루트로 고정하므로, 원래 폴더를 CAREERMATE_INIT_CWD로 받아 우선한다(없으면 process.cwd()).
 * Claude Code는 사용자가 실제로 여는 폴더의 .mcp.json·.claude 설정만 읽으므로 이 폴더가 기준이다.
 */
function userCwd(): string {
  const fromBin = process.env.CAREERMATE_INIT_CWD?.trim();
  return fromBin && fromBin.length > 0 ? fromBin : process.cwd();
}

/**
 * Claude Code project scope 설정: 사용자가 지금 작업 중인 폴더에 둔다.
 *
 * `npx -y careermate init`은 패키지를 임시 캐시에 풀어 실행하므로 ROOT는 사용자의
 * 프로젝트가 아니라 설치물 위치다. Claude Code는 실제로 열 폴더의 `.mcp.json`만
 * 승인/로드하므로 사용자의 작업 폴더(userCwd)를 기준으로 한다.
 */
function claudeCodeConfigPath(): string {
  return path.join(userCwd(), '.mcp.json');
}

/** Codex CLI 글로벌 설정(CODEX_HOME 우선). */
function codexConfigPath(): string {
  const home = process.env.CODEX_HOME?.trim();
  const base = home && home.length > 0 ? home : path.join(os.homedir(), '.codex');
  return path.join(base, 'config.toml');
}

/** Gemini CLI: `~/.gemini/settings.json` 의 mcpServers(Cursor 등과 동일 JSON 형식). */
function geminiConfigPath(): string {
  return path.join(os.homedir(), '.gemini', 'settings.json');
}

/**
 * Antigravity(Gemini CLI의 소비자용 후속, 2026-06-18 전환) MCP 설정.
 * 출시 직후라 정확한 파일 경로가 커뮤니티 소스 간 갈려, 존재하는 후보를 우선 사용한다.
 * requireFileForPresent로 '실제 파일이 있을 때만' 감지 → 기본 init은 추측 경로에 파일을 만들지 않는다
 * (--all-clients / --client antigravity 일 때만 첫 후보에 생성). 스키마는 Gemini와 동일(mcpServers).
 */
function antigravityCandidates(): string[] {
  const g = path.join(os.homedir(), '.gemini');
  return [
    path.join(g, 'config', 'mcp_config.json'),
    path.join(g, 'antigravity', 'mcp_config.json'),
    path.join(g, 'antigravity-cli', 'mcp_config.json'),
  ];
}
function antigravityConfigPath(): string {
  return antigravityCandidates().find((p) => fs.existsSync(p)) ?? antigravityCandidates()[0];
}

function allTargets(): ClientTarget[] {
  return [
    { id: 'claude', label: 'Claude Desktop', format: 'mcp-json', configPath: claudeDesktopConfigPath() },
    { id: 'claude-code', label: 'Claude Code', format: 'mcp-json', configPath: claudeCodeConfigPath(), jsonType: true, alwaysPresent: true },
    { id: 'codex', label: 'Codex CLI', format: 'codex-toml', configPath: codexConfigPath() },
    { id: 'cursor', label: 'Cursor (기타 MCP 클라이언트)', format: 'mcp-json', configPath: cursorConfigPath() },
    { id: 'gemini', label: 'Gemini CLI', format: 'mcp-json', configPath: geminiConfigPath() },
    { id: 'antigravity', label: 'Antigravity', format: 'mcp-json', configPath: antigravityConfigPath(), requireFileForPresent: true },
  ];
}

/**
 * 대상이 이 컴퓨터에 "있어 보이는가" — 설정 파일이나 그 부모 폴더가 존재하면 설치된 것으로 본다.
 * 기본 `init`은 감지된 대상에만 써서 쓰지 않는 도구의 설정 파일을 만들지 않는다(임의 파일 생성 최소화).
 */
function isPresent(t: ClientTarget): boolean {
  if (t.alwaysPresent) return true;
  if (t.requireFileForPresent) return fs.existsSync(t.configPath);
  return fs.existsSync(t.configPath) || fs.existsSync(path.dirname(t.configPath));
}

function pickTargets(which: string, forceAll: boolean): ClientTarget[] {
  const all = allTargets();
  if (which !== 'all') return all.filter((t) => t.id === which);
  if (forceAll) return all;
  return all.filter(isPresent);
}

/**
 * MCP 서버 실행 방법.
 *  - 기본(local): 현재 Node로 이 패키지의 bin을 직접 호출 → PATH/네트워크에 의존하지 않아
 *    설치 파일 안에 동봉된 런타임에서도 그대로 동작.
 *  - --npx: npm 레지스트리에서 받아 실행(개발자/공개 배포용). npx 캐시 경로는 휘발성이라
 *    npx로 실행된 init은 자동으로 이 방식을 기본값으로 쓴다(절대경로가 곧 깨지는 것을 방지).
 */
function serverEntry(useNpx: boolean): ServerEntry {
  if (useNpx) return { command: 'npx', args: ['-y', PKG, 'mcp'] };
  return { command: process.execPath, args: [path.join(ROOT, 'bin', 'careermate.mjs'), 'mcp'] };
}

/** 이 프로세스가 `npx`를 통해 실행됐는지 추정(휘발성 캐시에서 돔). */
function runningUnderNpx(): boolean {
  const ua = process.env.npm_config_user_agent ?? '';
  if (/\bnpx\b/.test(ua)) return true;
  // npx 캐시 디렉터리 흔적(`_npx`)이 패키지 루트 경로에 있으면 npx 실행으로 본다.
  return ROOT.split(path.sep).includes('_npx');
}

function readJsonObject(file: string): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(file, 'utf8').trim();
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function backupFile(file: string): string | null {
  // 타임스탬프를 붙여 이전 백업을 덮어쓰지 않는다(원본을 영구 보존).
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dest = `${file}.careermate-backup-${stamp}`;
  try {
    fs.copyFileSync(file, dest);
    return dest;
  } catch {
    return null;
  }
}

/** Claude Desktop / Claude Code / Cursor 등 `mcpServers` JSON 형식. */
function writeMcpJson(target: ClientTarget, server: ServerEntry): WriteResult {
  const existed = fs.existsSync(target.configPath);
  const json = existed ? readJsonObject(target.configPath) : {};
  const servers =
    json.mcpServers && typeof json.mcpServers === 'object'
      ? (json.mcpServers as Record<string, unknown>)
      : {};

  const prev = servers[PKG];
  const before = JSON.stringify(prev ?? null);
  // 사용자가 careermate 항목에 직접 넣어둔 env(예: CAREERMATE_DATA_DIR)는 보존한다.
  const next: Record<string, unknown> = {};
  if (target.jsonType) next.type = 'stdio';
  next.command = server.command;
  next.args = server.args;
  if (prev && typeof prev === 'object' && 'env' in (prev as Record<string, unknown>)) {
    next.env = (prev as Record<string, unknown>).env;
  }
  servers[PKG] = next;
  json.mcpServers = servers;
  const changed = JSON.stringify(servers[PKG]) !== before;
  const replacedExisting = prev != null && changed;

  let backedUp: string | null = null;
  if (existed && changed) backedUp = backupFile(target.configPath);
  fs.mkdirSync(path.dirname(target.configPath), { recursive: true });
  fs.writeFileSync(target.configPath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  return { changed, backedUp, replacedExisting };
}

/** TOML 기본 문자열로 직렬화(역슬래시/따옴표 이스케이프). JSON 문자열 규칙과 호환된다. */
function tomlString(s: string): string {
  return JSON.stringify(s);
}

/** Codex 설정의 careermate 블록(헤더 + command + args). 우리가 형태를 통제하므로 단순하다. */
function codexBlock(server: ServerEntry): string {
  const args = server.args.map(tomlString).join(', ');
  return [`[mcp_servers.${PKG}]`, `command = ${tomlString(server.command)}`, `args = [${args}]`].join('\n');
}

/**
 * 기존 config.toml에 careermate 블록을 안전하게 삽입/교체한다.
 * - TOML 파서를 끌어오지 않고 텍스트로 처리하되, 우리가 만든 블록만 건드린다.
 * - 블록 경계는 "다음 `[` 로 시작하는 테이블 헤더"까지 → `[mcp_servers.careermate.env]`
 *   같은 사용자 하위 테이블은 보존된다.
 */
function upsertCodexBlock(raw: string, block: string): { next: string; found: boolean } {
  const lines = raw.length ? raw.split(/\r?\n/) : [];
  const headerRe = /^\s*\[\s*mcp_servers\s*\.\s*careermate\s*\]\s*$/;
  const tableRe = /^\s*\[/;
  const start = lines.findIndex((l) => headerRe.test(l));

  if (start === -1) {
    const trimmed = raw.replace(/\s+$/, '');
    const next = trimmed.length ? `${trimmed}\n\n${block}\n` : `${block}\n`;
    return { next, found: false };
  }

  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) {
    if (tableRe.test(lines[j])) {
      end = j;
      break;
    }
  }
  const merged = [...lines.slice(0, start), ...block.split('\n'), ...lines.slice(end)];
  let next = merged.join('\n');
  if (!next.endsWith('\n')) next += '\n';
  return { next, found: true };
}

/** Codex CLI: `~/.codex/config.toml` 의 `[mcp_servers.careermate]` 테이블. */
function writeCodexToml(target: ClientTarget, server: ServerEntry): WriteResult {
  const existed = fs.existsSync(target.configPath);
  let raw = '';
  if (existed) {
    try {
      raw = fs.readFileSync(target.configPath, 'utf8');
    } catch {
      raw = '';
    }
  }
  const { next, found } = upsertCodexBlock(raw, codexBlock(server));
  const changed = next.trim() !== raw.trim();

  let backedUp: string | null = null;
  if (existed && changed) backedUp = backupFile(target.configPath);
  fs.mkdirSync(path.dirname(target.configPath), { recursive: true });
  fs.writeFileSync(target.configPath, next, 'utf8');
  return { changed, backedUp, replacedExisting: found && changed };
}

function writeTarget(target: ClientTarget, server: ServerEntry): WriteResult {
  return target.format === 'codex-toml' ? writeCodexToml(target, server) : writeMcpJson(target, server);
}

/**
 * Claude Code 도구 사전허용 분류.
 * 첫 사용 마찰의 핵심은 careermate MCP 도구를 처음 부를 때마다 뜨는 승인 프롬프트다. init이 작업
 * 폴더의 .claude/settings.local.json에 아래 SAFE 도구를 미리 허용하면 그 프롬프트가 사라진다.
 * SENSITIVE는 의도적으로 제외해 사용자 확인을 유지한다 — 데이터는 어차피 ~/.careermate 로컬이라
 * SAFE는 외부 유출·시스템 변경이 없지만, SENSITIVE는 다음과 같이 손이 밖으로 나가기 때문이다:
 *   read_document/read_inbox = 임의 파일경로 읽기 · open_* = 외부 프로세스/브라우저 실행 ·
 *   update_careermate = npm 실행 · delete_* = 파괴적 삭제.
 * 새 MCP 도구를 추가하면 둘 중 하나로 분류해야 한다(scripts/test-init.ts가 manifest와 대조해 누락을 잡는다).
 */
const SENSITIVE_TOOLS: readonly string[] = [
  'read_document',
  'read_inbox',
  'open_inbox',
  'open_dashboard',
  'open_application',
  'update_careermate',
  'delete_cover_letter',
  'delete_job_posting',
];

const SAFE_TOOLS: readonly string[] = [
  'get_onboarding_status', 'get_profile', 'save_profile', 'add_resume', 'get_resumes',
  'add_experience', 'get_experiences', 'add_project', 'get_projects', 'add_skill', 'get_skills',
  'get_cover_letters', 'save_cover_letter_version', 'save_job_posting', 'get_job_posting', 'list_jobs',
  'get_application_context', 'save_fit_analysis', 'update_application_status', 'save_interview_prep',
  'export_cover_letter', 'list_recent_activity', 'get_workflow_guide', 'get_playbook', 'get_verifier',
  'validate_cover_letter', 'set_verify_mode', 'get_writing_style_guide', 'check_for_update',
];

/** Claude Code 작업 폴더의 로컬(비공유) 설정 파일. 권한·신뢰는 머신/사용자 로컬 산출물이다. */
function claudeSettingsLocalPath(): string {
  return path.join(userCwd(), '.claude', 'settings.local.json');
}

/**
 * 작업 폴더가 git repo이거나 이미 .gitignore가 있으면 주어진 경로를 무시 목록에 보장한다(best-effort).
 * settings.local.json은 머신 로컬 권한이라 공유 대상이 아니므로 실수로 커밋되지 않게 한다.
 */
function ensureGitignored(file: string): void {
  const cwd = userCwd();
  const gitignorePath = path.join(cwd, '.gitignore');
  const isRepo = fs.existsSync(path.join(cwd, '.git'));
  if (!isRepo && !fs.existsSync(gitignorePath)) return;
  const rel = path.relative(cwd, file).split(path.sep).join('/');
  let body = '';
  try {
    body = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
  } catch {
    return;
  }
  const already = body.split(/\r?\n/).some((l) => {
    const t = l.trim();
    return t === rel || t === `/${rel}`;
  });
  if (already) return;
  const prefix = body.length && !body.endsWith('\n') ? '\n' : '';
  try {
    fs.appendFileSync(gitignorePath, `${prefix}${rel}\n`, 'utf8');
  } catch {
    /* best-effort: 무시 등록 실패해도 설치는 계속 */
  }
}

/**
 * Claude Code 사전허용: 작업 폴더의 .claude/settings.local.json에
 *   (1) enabledMcpjsonServers: ["careermate"] — 재시작 후 'project 서버 신뢰' 1회 프롬프트 제거
 *   (2) permissions.allow에 SAFE 도구(mcp__careermate__<tool>) — 데이터 도구 첫 호출 프롬프트 제거
 * 를 병합 기록한다(기존 키·사용자 설정 보존, 변경 시 타임스탬프 백업). 폴더를 처음 '신뢰'하는
 * 1회 다이얼로그는 Claude Code가 강제하므로 사라지지 않는다(보안 게이트 유지).
 */
function writeClaudeAllowlist(): WriteResult {
  const file = claudeSettingsLocalPath();
  const existed = fs.existsSync(file);
  const json = existed ? readJsonObject(file) : {};
  const before = JSON.stringify(json);

  // (1) 우리가 방금 쓴 .mcp.json의 careermate 서버를 미리 신뢰(다른 서버는 건드리지 않음).
  const enabled = Array.isArray(json.enabledMcpjsonServers)
    ? (json.enabledMcpjsonServers as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  if (!enabled.includes(PKG)) enabled.push(PKG);
  json.enabledMcpjsonServers = enabled;

  // (2) SAFE 도구만 사전허용에 추가. 기존 사용자 allow는 보존하고, 어떤 경우에도 SENSITIVE는 추가하지 않는다.
  const perms =
    json.permissions && typeof json.permissions === 'object' && !Array.isArray(json.permissions)
      ? (json.permissions as Record<string, unknown>)
      : {};
  const allow = new Set<string>(
    Array.isArray(perms.allow)
      ? (perms.allow as unknown[]).filter((x): x is string => typeof x === 'string')
      : [],
  );
  for (const tool of SAFE_TOOLS) {
    if (SENSITIVE_TOOLS.includes(tool)) continue; // 방어: 분류 실수로 SAFE에 민감 도구가 섞여도 추가하지 않음
    allow.add(`mcp__${PKG}__${tool}`);
  }
  perms.allow = [...allow];
  json.permissions = perms;

  const changed = JSON.stringify(json) !== before;
  let backedUp: string | null = null;
  if (existed && changed) backedUp = backupFile(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  ensureGitignored(file);
  return { changed, backedUp, replacedExisting: false };
}

function flagValue(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
}

/** 셸에 그대로 붙여넣을 수 있는 명령 문자열(공백 포함 인자는 따옴표). */
function shellJoin(parts: string[]): string {
  return parts.map((p) => (/\s/.test(p) ? `"${p}"` : p)).join(' ');
}

function printConfigs(server: ServerEntry): void {
  const cmd = [server.command, ...server.args];
  console.log('CareerMate를 AI 클라이언트에 직접 연결하는 방법입니다.\n');

  console.log('① Claude Desktop / Claude Code / Cursor / Gemini CLI / Antigravity — MCP 설정(mcpServers)에 추가:');
  console.log(
    JSON.stringify(
      { mcpServers: { [PKG]: { type: 'stdio', command: server.command, args: server.args } } },
      null,
      2,
    ),
  );
  console.log('\n  · Claude Code는 위 내용을 실제 작업 폴더의 .mcp.json 으로 저장하면 됩니다.');
  console.log('  · Gemini CLI는 ~/.gemini/settings.json, Antigravity는 ~/.gemini/(config|antigravity|antigravity-cli)/mcp_config.json 의 mcpServers에 같은 블록을 넣으세요(type 키는 없어도 됨).');
  console.log(`  · 또는 명령으로:  ${shellJoin(['claude', 'mcp', 'add', '--scope', 'project', '--transport', 'stdio', PKG, '--', ...cmd])}`);

  console.log('\n② Codex CLI — ~/.codex/config.toml 에 추가:');
  console.log(codexBlock(server));
  console.log(`\n  · 또는 명령으로:  ${shellJoin(['codex', 'mcp', 'add', PKG, '--', ...cmd])}`);
}

function main(): void {
  const argv = process.argv.slice(2);
  const useNpx = argv.includes('--npx') || runningUnderNpx();
  const printOnly = argv.includes('--print');
  const forceAll = argv.includes('--all-clients');
  const skipAllow = argv.includes('--no-allow-tools');
  const which = flagValue(argv, '--client') ?? 'all';

  const server = serverEntry(useNpx);

  if (printOnly) {
    printConfigs(server);
    return;
  }

  console.log('CareerMate 설치를 시작합니다…\n');
  const dataDir = ensureDataDir();
  console.log(`• 데이터 폴더 준비됨: ${dataDir}`);

  const targets = pickTargets(which, forceAll);
  let connected = 0;
  const connectedIds = new Set<string>();
  for (const t of targets) {
    try {
      const { changed, backedUp, replacedExisting } = writeTarget(t, server);
      connected += 1;
      connectedIds.add(t.id);
      console.log(
        `• ${t.label} 연결 ${changed ? '완료' : '이미 최신'}: ${t.configPath}` +
          (replacedExisting ? `\n    (기존 careermate 설정을 새 설정으로 교체했습니다)` : '') +
          (backedUp ? `\n    (기존 설정 백업: ${backedUp})` : ''),
      );
    } catch (e) {
      console.log(`• ${t.label} 연결 실패: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (connected === 0) {
    console.log('\n연결할 AI 클라이언트를 찾지 못했습니다.');
    console.log('특정 클라이언트를 지정하거나(--client claude|claude-code|codex|cursor|gemini|antigravity),');
    console.log('설정을 직접 복사해 추가할 수 있어요:  careermate init --print');
    process.exitCode = 1;
    return;
  }

  // Claude Code: 도구 사전허용을 작업 폴더에 함께 써, 재시작 후 도구별 승인 프롬프트를 없앤다.
  // (민감/파괴 도구는 SAFE 목록에서 제외돼 그대로 확인을 받는다. --no-allow-tools로 끌 수 있다.)
  let allowlisted = false;
  if (connectedIds.has('claude-code') && !skipAllow) {
    try {
      const r = writeClaudeAllowlist();
      allowlisted = true;
      console.log(
        `• Claude Code 도구 사전허용 ${r.changed ? '기록됨' : '이미 최신'}: ${claudeSettingsLocalPath()}` +
          (r.backedUp ? `\n    (기존 설정 백업: ${r.backedUp})` : ''),
      );
      console.log('    (커리어 데이터 도구는 미리 허용 — 파일 읽기·업데이트 등 민감한 작업은 그때그때 확인을 받습니다)');
    } catch (e) {
      console.log(`• Claude Code 사전허용은 건너뜁니다(설치는 계속): ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log('\n✅ 거의 끝났습니다. 다음만 해주세요:');
  console.log('  1) 연결한 AI 클라이언트를 완전히 종료했다가 다시 켜기');
  if (connectedIds.has('claude-code')) {
    console.log(
      allowlisted
        ? '     (Claude Code: 이 폴더를 처음 열 때 "신뢰"만 한 번 확인하면 됩니다 — 커리어 데이터 도구는 미리 허용해 두었습니다.)'
        : '     (Claude Code는 이 명령을 실행한 폴더의 .mcp.json을 처음 띄울 때 1회 "승인"을 물어봅니다 — 승인해 주세요.)',
    );
  }
  console.log('  2) AI에게: "get_onboarding_status 호출해서 연결됐는지 확인해줘"');
  console.log('  3) 내 데이터 대시보드 열기:  careermate start');
}

main();
