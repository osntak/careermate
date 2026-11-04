/**
 * Unit tests for document ingestion (@careermate/parsers · extractDocument).
 * Run: node --import tsx scripts/test-parsers.ts   (no DB needed). Wired into
 * `npm test` via scripts/run.mjs.
 *
 * Covers the security-critical and encoding paths that had ZERO coverage before
 * (audit R22, gap-2): the SENSITIVE_PATH deny-list, the symlink-escape guard
 * (benign-named link → sensitive target), CP949/EUC-KR sniffing for Korean text
 * files, and the zero-byte / missing / directory / image soft-fail messaging.
 * §4-1 adds real binary fixtures (pre-launch audit follow-up): a hand-assembled
 * minimal PDF, a docx-library-generated DOCX (Korean round-trip), and a minimal
 * OWPML HWPX zip. Binary .hwp (OLE) still needs a real authored fixture — the
 * format can't be synthesized simply — and remains the one uncovered decoder.
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

    // 확장 deny-list(출시 전 감사 후속): 클라우드 자격증명·브라우저 로그인 저장소·지갑.
    const denyMore = [
      '~/.kube/config',
      '~/.docker/config.json',
      '~/.config/gcloud/credentials.db',
      'C:\\Users\\me\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login Data',
      '~/.mozilla/firefox/abc.default/key4.db',
      '~/wallet.dat',
    ];
    for (const p of denyMore) {
      const rr = await extractDocument(p);
      ok(`확장 차단: ${p}`, rr.unsupported && rr.errored, JSON.stringify(rr.warnings));
    }
    // 오탐 방지: 흔한 문서 경로는 deny에 걸리면 안 된다(파일 없음 소프트 실패는 무방).
    const legit = await extractDocument('~/Documents/이력서_지원서_cookies관련경험.txt');
    ok('일반 문서 경로 오탐 없음(보안 차단 문구 아님)', !(legit.warnings[0] ?? '').includes('보안상'), JSON.stringify(legit.warnings));
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

  console.log('\n4-1) 바이너리 픽스처 — PDF·DOCX·HWPX 실추출');
  {
    // PDF: xref 오프셋까지 계산한 최소 유효 PDF(본문은 ASCII — 한글은 폰트 임베드 필요라 제외).
    const buildMinimalPdf = (text: string): Buffer => {
      const objs: string[] = [];
      objs[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
      objs[2] = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`;
      objs[3] = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n`;
      const stream = `BT /F1 24 Tf 72 720 Td (${text}) Tj ET`;
      objs[4] = `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
      objs[5] = `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;
      let pdf = `%PDF-1.4\n`;
      const offsets: number[] = [0];
      for (let i = 1; i <= 5; i++) {
        offsets[i] = Buffer.byteLength(pdf, 'ascii');
        pdf += objs[i];
      }
      const xrefPos = Buffer.byteLength(pdf, 'ascii');
      pdf +=
        `xref\n0 6\n0000000000 65535 f \n` +
        offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
      pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
      return Buffer.from(pdf, 'ascii');
    };
    const pdfPath = path.join(tmp, 'fixture.pdf');
    fs.writeFileSync(pdfPath, buildMinimalPdf('CareerMate PDF Fixture 2026'));
    const rp = await extractDocument(pdfPath);
    ok('PDF → 텍스트 추출(형식·본문)', rp.format === 'pdf' && rp.text.includes('CareerMate PDF Fixture 2026'),
      JSON.stringify({ f: rp.format, u: rp.unsupported, w: rp.warnings, t: rp.text.slice(0, 80) }));

    // DOCX: 실제 docx 라이브러리로 생성 → 추출 왕복(한글 본문 보존 확인).
    const { Document, Packer, Paragraph, TextRun } = await import('docx');
    const docxDoc = new Document({
      sections: [{
        children: [
          new Paragraph({ children: [new TextRun('경력기술서 픽스처 — 한글 본문 보존 확인')] }),
          new Paragraph({ children: [new TextRun('second paragraph roundtrip')] }),
        ],
      }],
    });
    const docxPath = path.join(tmp, 'fixture.docx');
    fs.writeFileSync(docxPath, await Packer.toBuffer(docxDoc));
    const rd = await extractDocument(docxPath);
    ok('DOCX → 한글 본문 왕복 보존', rd.format === 'docx' && rd.text.includes('한글 본문 보존 확인') && rd.text.includes('second paragraph roundtrip'),
      JSON.stringify({ f: rd.format, u: rd.unsupported, w: rd.warnings, t: rd.text.slice(0, 80) }));

    // HWPX: 최소 OWPML(Contents/section0.xml) zip — 문단 분리·엔티티 디코드 확인.
    const { zipSync, strToU8 } = await import('fflate');
    const sectionXml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">` +
      `<hp:p id="1"><hp:run><hp:t>한컴 픽스처 본문입니다</hp:t></hp:run></hp:p>` +
      `<hp:p id="2"><hp:run><hp:t>둘째 줄 &amp; 엔티티</hp:t></hp:run></hp:p>` +
      `</hs:sec>`;
    const hwpxPath = path.join(tmp, 'fixture.hwpx');
    fs.writeFileSync(hwpxPath, zipSync({ 'Contents/section0.xml': strToU8(sectionXml), 'mimetype': strToU8('application/hwp+zip') }));
    const rh = await extractDocument(hwpxPath);
    ok('HWPX → 문단 텍스트 추출 + 엔티티 디코드', rh.format === 'hwpx' && rh.text.includes('한컴 픽스처 본문입니다') && rh.text.includes('둘째 줄 & 엔티티'),
      JSON.stringify({ f: rh.format, u: rh.unsupported, w: rh.warnings, t: rh.text.slice(0, 80) }));
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

  console.log('\n8) 사람인 검색 목록 HTML 파싱(parseSaraminList)');
  {
    // 실제 get-recruit-list innerHTML에서 줄인 픽스처. 두 번째 항목은 회사명이 없어 버려져야 한다.
    const html = `<div class="content">
      <div class="item_recruit" value="55478983" data-data_layer="x">
        <h2 class="job_tit"><a target="_blank" title="B2C 백엔드 개발자(Java&amp;Spring, 3~7년)" href="/zf_user/jobs/relay/view?rec_idx=55478983"><span>B2C</span></a></h2>
        <div class="job_date"><span class="date">~ 01/04(일)</span></div>
        <div class="job_condition">
          <span><a href="/a">경기</a>  <a href="/b">용인시 수지구</a></span> <span>경력 3~7년</span> <span>대졸↑</span> <span>정규직</span>
        </div>
        <div class="job_sector"><b><a target="_blank" href="/zf_user/jobs/list/job-category?cat_kewd=84">백엔드/서버개발</a></b>, <a target="_blank" href="/zf_user/jobs/list/job-category?cat_kewd=214">Docker</a> 외 <span class="job_day">등록일 26/11/04</span></div>
        <div class="area_corp"><strong class="corp_name"><a href="/c" class="x">
          (주)인투씨엔에스 </a></strong></div>
      </div>
      <div class="item_recruit" value="1"><h2 class="job_tit"><a title="회사 없음">x</a></h2></div>
    </div>`;
    const { parseSaraminList } = await import('../packages/core/src/jobsearch.ts');
    const rows = parseSaraminList(html, new Date(2026, 10, 4));
    const r = rows[0];
    ok('회사명 없는 항목은 버림', rows.length === 1, JSON.stringify(rows.length));
    ok(
      '제목·회사·링크·지역·경력 추출(엔티티 디코딩)',
      r?.position === 'B2C 백엔드 개발자(Java&Spring, 3~7년)' &&
        r.company === '(주)인투씨엔에스' &&
        r.url === 'https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=55478983' &&
        r.location === '경기 용인시 수지구' &&
        r.experience === '경력 3~7년',
      JSON.stringify(r),
    );
    ok(
      '직무 이름과 코드를 같은 순서로',
      JSON.stringify(r?.keywords) === '["백엔드/서버개발","Docker"]' && JSON.stringify(r?.category_codes) === '["84","214"]',
    );
    ok('지난 달 마감일은 다음 해로', r?.deadline === '2027-01-04', String(r?.deadline));
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
