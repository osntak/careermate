/**
 * Unit tests for document ingestion (@careermate/parsers · extractDocument).
 * Run: node --import tsx scripts/test-parsers.ts   (no DB needed). Wired into
 * `npm test` via scripts/run.mjs.
 *
 * Covers the security-critical and encoding paths that had ZERO coverage before
 * (audit R22, gap-2): the SENSITIVE_PATH deny-list, the symlink-escape guard
 * (benign-named link → sensitive target), CP949/EUC-KR sniffing for Korean text
 * files, and the zero-byte / missing / directory / image soft-fail messaging.
 * Binary decoders (pdf/docx/hwp) need real fixtures and are a follow-up; this
 * suite locks the deterministic, fixture-free paths.
 *
 * Note: no fs.rmSync cleanup — on Node 25/Windows every rmSync hard-crashes the
 * process (uncatchable), so we leave the os.tmpdir() scratch dir for the OS.
 */
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { extractDocument, resolveDocumentPath } from '../packages/parsers/src/documents.ts';

let pass = 0,
  fail = 0;
const ok = (name: string, cond: boolean, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${extra}`);
  }
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-parsers-'));
const w = (name: string, data: string | Buffer): string => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, data);
  return p;
};

async function main() {
  console.log('\n1) 텍스트 추출 — UTF-8 / Markdown');
  {
    const p = w('utf8.txt', '이력서: 홍길동\n경력 7년, 데이터 분석.');
    const r = await extractDocument(p);
    ok(
      'UTF-8 .txt → format=text, 본문 추출',
      r.format === 'text' && r.text.includes('홍길동') && !r.unsupported,
      JSON.stringify({ f: r.format, u: r.unsupported }),
    );

    const md = w('readme.md', '# 제목\n본문입니다.');
    const rm = await extractDocument(md);
    ok('.md → format=markdown', rm.format === 'markdown' && rm.text.includes('제목'), rm.format);
  }

  console.log('\n2) 인코딩 스니핑 — CP949/EUC-KR 한글(모지바케 방지)');
  {
    // "한글" in EUC-KR/CP949 = C7 D1 B1 DB (invalid UTF-8 → sniff falls to CP949).
    const cp949 = Buffer.concat([Buffer.from([0xc7, 0xd1, 0xb1, 0xdb]), Buffer.from(' resume\n', 'ascii')]);
    const p = w('cp949.txt', cp949);
    const r = await extractDocument(p);
    ok(
      'CP949 .txt → "한글"로 디코딩(UTF-8 오독 아님)',
      r.format === 'text' && r.text.includes('한글') && r.text.includes('resume'),
      JSON.stringify(r.text),
    );
  }

  console.log('\n3) 보안 — 민감 파일 deny-list(개인키·자격증명)');
  {
    const env = w('.env', 'SECRET_TOKEN=do-not-leak');
    const r = await extractDocument(env);
    ok('.env → 차단(unsupported+errored)', r.unsupported && r.errored, JSON.stringify({ u: r.unsupported, e: r.errored }));
    ok('.env → 본문 누출 없음', r.text === '' && !r.text.includes('do-not-leak'), JSON.stringify(r.text));

    const key = w('id_rsa', '-----BEGIN PRIVATE KEY-----\nleak\n-----END-----');
    const rk = await extractDocument(key);
    ok('id_rsa → 차단, 본문 누출 없음', rk.unsupported && rk.errored && !rk.text.includes('leak'), JSON.stringify({ u: rk.unsupported, t: rk.text.length }));

    // ~/.ssh/... matches even when the file does not exist (check precedes statSync).
    const rssh = await extractDocument('~/.ssh/id_ed25519');
    ok('~/.ssh/id_ed25519 → 존재하지 않아도 deny-list 우선 차단', rssh.unsupported && rssh.errored, JSON.stringify(rssh.warnings));
  }

  console.log('\n4) 보안 — 심링크 탈출 가드(양성 이름 .txt → 민감 대상)');
  {
    // tmp/id_rsa already exists from section 3 (sensitive-named real file).
    // A benign-named .txt symlink must still be blocked because realpathSync
    // resolves it to the sensitive target.
    const link = path.join(tmp, 'resume_cv.txt');
    let symlinked = false;
    try {
      fs.symlinkSync(path.join(tmp, 'id_rsa'), link, 'file');
      symlinked = true;
    } catch (e) {
      console.log(`  ⏭️  심링크 생성 권한 없음 — 이 환경에서는 건너뜀 (${(e as { code?: string }).code ?? String(e)})`);
    }
    if (symlinked) {
      const r = await extractDocument(link);
      ok('양성 이름 .txt 심링크 → 민감 대상 해석 후 차단', r.unsupported && r.errored, JSON.stringify({ u: r.unsupported, e: r.errored }));
      ok('심링크 경유 본문 누출 없음', !r.text.includes('PRIVATE') && !r.text.includes('leak'), JSON.stringify(r.text.length));
    }
  }

  console.log('\n5) 소프트 실패 메시지 — 빈/없음/폴더/이미지');
  {
    const empty = w('empty.txt', '');
    const re = await extractDocument(empty);
    ok('0바이트 파일 → unsupported(안내문 포함)', re.unsupported && re.warnings.length > 0, JSON.stringify(re));

    const rmiss = await extractDocument(path.join(tmp, 'nope-does-not-exist.txt'));
    ok('없는 파일 → unsupported+errored', rmiss.unsupported && rmiss.errored, JSON.stringify(rmiss.warnings));

    const rdir = await extractDocument(tmp);
    ok('폴더 경로 → unsupported+errored', rdir.unsupported && rdir.errored, JSON.stringify(rdir.warnings));

    const png = w('photo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const rpng = await extractDocument(png);
    ok('.png → format=image, unsupported', rpng.format === 'image' && rpng.unsupported, rpng.format);
  }

  console.log('\n6) resolveDocumentPath — ~ 확장 / 상대경로 / 따옴표');
  {
    ok('~ → 홈 디렉터리로 확장', resolveDocumentPath('~/x.txt') === path.join(os.homedir(), 'x.txt'), resolveDocumentPath('~/x.txt'));
    ok('상대경로 → baseDir 기준 절대화', resolveDocumentPath('a/b.txt', tmp) === path.resolve(tmp, 'a/b.txt'));
    ok('따옴표 감싼 경로 → 트림', resolveDocumentPath('"' + path.join(tmp, 'q.txt') + '"') === path.join(tmp, 'q.txt'));
  }

  console.log('\n7) 견고성 — extractDocument는 절대 throw하지 않음');
  {
    let threw = false;
    let r: Awaited<ReturnType<typeof extractDocument>> | undefined;
    try {
      r = await extractDocument('');
    } catch {
      threw = true;
    }
    ok('빈 입력에도 throw 없이 결과 객체 반환', !threw && !!r && typeof r.unsupported === 'boolean', JSON.stringify({ threw }));
  }
}

main()
  .then(() => {
    console.log(`\nPARSERS_VERDICT ${fail === 0 ? 'PASS' : 'FAIL'}  (pass=${pass} fail=${fail})`);
    process.exit(fail === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    console.log(`\nPARSERS_VERDICT FAIL  (uncaught: ${(e as Error).message})`);
    process.exit(1);
  });
