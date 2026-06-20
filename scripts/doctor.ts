/**
 * `npm run doctor` — a friendly health check non-technical users can run when
 * something looks off. Verifies the runtime, the data directory, the database,
 * and reports whether the dashboard/MCP are wired up. Reads only; never mutates
 * user data beyond ensuring the schema exists.
 */
import fs from 'node:fs';
import { getDataDir, getDbPath, getDb, readRuntimeInfo, isProcessAlive } from '@careermate/db';
import {
  profileRepo, experienceRepo, projectRepo, skillRepo, documentRepo,
  coverLetterRepo, jobRepo, applicationRepo, interviewRepo,
} from '@careermate/db';
import { TOOLS, getUpdateStatusAsync } from '@careermate/mcp-tools';

const ok = (s: string) => console.log(`  ✅ ${s}`);
const warn = (s: string) => console.log(`  ⚠️  ${s}`);
const info = (s: string) => console.log(`  ·  ${s}`);

function checkNode(): boolean {
  const [maj, min] = process.versions.node.split('.').map(Number);
  const good = maj > 22 || (maj === 22 && min >= 5);
  if (good) ok(`Node.js ${process.version} (node:sqlite 내장 사용 — 별도 빌드 불필요)`);
  else warn(`Node.js ${process.version} — 22.5 이상이 필요합니다. 업데이트를 권장합니다.`);
  return good;
}

async function main(): Promise<void> {
  console.log('\nCareerMate 상태 점검\n' + '─'.repeat(40));

  const nodeOk = checkNode();

  // Data directory
  const dir = getDataDir();
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    ok(`데이터 폴더 쓰기 가능: ${dir}`);
  } catch {
    warn(`데이터 폴더에 쓸 수 없습니다: ${dir}`);
  }

  // Database
  let dbOk = false;
  try {
    const db = getDb();
    const v = db.prepare(`SELECT value FROM _meta WHERE key='schema_version'`).get() as { value: string } | undefined;
    ok(`데이터베이스 정상 (스키마 v${v?.value ?? '?'}) — ${getDbPath()}`);
    dbOk = true;
  } catch (e) {
    warn(`데이터베이스 열기 실패: ${e instanceof Error ? e.message : e}`);
  }

  // Contents
  if (dbOk) {
    const counts = {
      프로필: profileRepo.get()?.name ? 1 : 0,
      경력: experienceRepo.list().length,
      프로젝트: projectRepo.list().length,
      기술: skillRepo.list().length,
      문서: documentRepo.list().length,
      자기소개서: coverLetterRepo.list().length,
      공고: jobRepo.list().length,
      지원: applicationRepo.list().length,
      면접준비: interviewRepo.list().length,
    };
    info('저장된 데이터: ' + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · '));
  }

  // MCP tools
  ok(`MCP 도구 ${TOOLS.length}개 등록됨`);

  // Update available?
  try {
    const u = await getUpdateStatusAsync(true); // "지금 점검" — 신선한 캐시 무시하고 재조회
    if (u.latest === null) info(`버전 v${u.current} (업데이트 확인 생략 — 오프라인이거나 일시적 오류)`);
    else if (u.update_available) warn(`새 버전 v${u.latest} 있음 (현재 v${u.current}). 업데이트: ${u.update_command}`);
    else ok(`최신 버전 v${u.current}`);
  } catch {
    /* 업데이트 확인 실패는 점검을 막지 않는다. */
  }

  // Dashboard running?
  const rt = readRuntimeInfo();
  if (rt && isProcessAlive(rt.pid)) ok(`대시보드 실행 중: ${rt.url}`);
  else info('대시보드가 실행 중이 아닙니다. `npm start` 로 실행하세요.');

  console.log('─'.repeat(40));
  console.log(nodeOk && dbOk ? '핵심 점검 통과 ✅\n' : '일부 항목을 확인해 주세요 ⚠️\n');
  process.exit(nodeOk && dbOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
