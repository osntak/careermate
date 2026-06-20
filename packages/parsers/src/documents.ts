/**
 * @careermate/parsers/documents — extract readable text from binary document
 * files that an AI client cannot read on its own.
 *
 * Handled here (all pure-JS, no external binaries — bundles into dist and ships
 * with the normal npm install, zero extra setup):
 * - `.docx`  → mammoth
 * - `.hwp`   → hwp.js (HWP 5.x)
 * - `.hwpx`  → unzip + OWPML text nodes
 * - `.pdf`   → pdfjs-dist (text-based PDFs; scanned/image PDFs have no text layer)
 * - `.txt/.md/...` → read as UTF-8
 *
 * Deliberately NOT handled:
 * - Images → no OCR in pure JS that's worth bundling; defer to the client's
 *   native image reading (Claude reads images directly).
 * - Legacy `.doc/.ppt/.xls`, `.odt`, Apple iWork → no reliable pure-JS reader;
 *   we ask the user to re-save as PDF/DOCX.
 *
 * `extractDocument` never throws: a bad/unsupported file comes back as
 * `unsupported: true` with a friendly Korean `warnings` message, so the MCP tool
 * can relay it instead of crashing.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { unzipSync, strFromU8 } from 'fflate';
import mammoth from 'mammoth';
import hwpjs from 'hwp.js';
import { BUNDLED } from '@careermate/shared';
import { decodeEntities } from './html.ts';

// hwp.js ships as CJS ({ Viewer, parse }); tolerate either interop shape.
const parseHwp: ((input: unknown, opts?: unknown) => HwpDoc) | undefined =
  (hwpjs as any)?.parse ?? (hwpjs as any)?.default?.parse;

/** Logical source format we detected/handled. */
export type DocumentFormat =
  | 'docx'
  | 'hwp'
  | 'hwpx'
  | 'pdf'
  | 'image'
  | 'text'
  | 'markdown'
  | 'unsupported';

export interface ExtractDocumentResult {
  /** Extracted plain text (empty when unsupported). */
  text: string;
  format: DocumentFormat;
  /** Human-facing notes/caveats in Korean (always present, may be empty). */
  warnings: string[];
  /** Bytes read from disk (0 when not read). */
  bytes: number;
  /** True when the file could not be turned into text here. */
  unsupported: boolean;
  /**
   * True only for *operational* failures the caller should surface as an error
   * (file not found, path is a directory, too large, unreadable). Soft cases —
   * images, scanned PDFs, legacy/unparseable formats — are `unsupported: true`
   * but `errored: false`: they carry actionable guidance, not a failure.
   */
  errored: boolean;
  /** Absolute path we resolved the input to (for messaging). */
  path: string;
}

/** Hard ceiling so a giant/mis-typed file can't blow up memory. */
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Refuse to read obviously-sensitive files (private keys, credentials, secrets).
 * read_document runs with the user's full filesystem privileges, and a malicious
 * job posting could prompt-inject the user's agent into reading e.g. ~/.ssh/id_rsa
 * "to finish the analysis". None of these are ever a résumé/career document, so
 * declining them costs nothing and closes a real exfiltration amplifier.
 * (`.key` is intentionally absent — it's Apple Keynote, handled as legacy-binary.)
 */
const SENSITIVE_PATH_RE =
  /(^|[/\\])\.(ssh|aws|gnupg)([/\\]|$)|(^|[/\\])id_(rsa|dsa|ecdsa|ed25519)(\.[\w]+)?$|\.(pem|ppk)$|(^|[/\\])\.env(\.[\w-]+)?$|(^|[/\\])\.(npmrc|netrc|git-credentials)$/i;

// Bound the work a single (possibly hostile) file can trigger. The MAX_BYTES cap
// only limits the *compressed* input; a crafted archive can still expand far
// beyond that, and a PDF can declare an enormous page count — either can hang or
// OOM the MCP process. These caps keep extraction best-effort and bounded.
const MAX_HWPX_ENTRY_BYTES = 40 * 1024 * 1024; // per decompressed body section
const MAX_HWPX_TOTAL_BYTES = 80 * 1024 * 1024; // sum across decompressed sections
const MAX_PDF_PAGES = 300; // extract at most this many pages

const DOCX_RE = /\.docx$/i;
const HWP_RE = /\.hwp$/i;
const HWPX_RE = /\.hwpx$/i;
const PDF_RE = /\.pdf$/i;
const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|svg)$/i;
const TEXT_RE = /\.(txt|text|log|csv|tsv|json|ya?ml|xml)$/i;
const MD_RE = /\.(md|markdown|mdown|mkd)$/i;
const LEGACY_BINARY_RE = /\.(docm?|dot[xm]?|pptx?|ppt|xlsx?|xls|odt|ods|odp|rtf|pages|key|numbers)$/i;

/** Resolve `~` and relative paths to an absolute path. */
export function resolveDocumentPath(input: string, baseDir?: string): string {
  let p = (input ?? '').trim().replace(/^["']|["']$/g, '');
  if (p === '~' || p.startsWith('~/') || p.startsWith('~\\')) p = path.join(os.homedir(), p.slice(1));
  if (!path.isAbsolute(p)) p = path.resolve(baseDir ?? process.cwd(), p);
  return p;
}

/**
 * Read a document file from disk and extract its text. Never throws.
 *
 * @param input    file path (absolute, relative, or `~/…`)
 * @param baseDir  base for relative paths (default: process.cwd())
 */
export async function extractDocument(input: string, baseDir?: string): Promise<ExtractDocumentResult> {
  const filePath = resolveDocumentPath(input, baseDir);
  const base = (fmt: DocumentFormat, over: Partial<ExtractDocumentResult> = {}): ExtractDocumentResult => ({
    text: '',
    format: fmt,
    warnings: [],
    bytes: 0,
    unsupported: false,
    errored: false,
    path: filePath,
    ...over,
  });

  // Decline secrets/credentials before touching the file (see SENSITIVE_PATH_RE).
  // Check the literal path AND the fully-resolved real path: a benign-named
  // symlink (e.g. inbox/resume.pdf → ~/.ssh/id_rsa) would otherwise slip the
  // deny-list and leak the target's contents. realpathSync follows every link
  // and `..` segment to the final on-disk target. It throws for a
  // missing/broken path — that's fine, statSync below reports it cleanly.
  let realPath = filePath;
  try {
    realPath = fs.realpathSync.native(filePath);
  } catch {
    /* not yet resolvable — leave realPath as the literal path */
  }
  if (SENSITIVE_PATH_RE.test(filePath) || SENSITIVE_PATH_RE.test(realPath)) {
    return base('unsupported', {
      warnings: [
        '보안상 민감할 수 있는 파일(개인 키·자격증명 등)은 읽지 않습니다. 이력서·경력기술서·자기소개서 같은 문서 파일을 지정해 주세요.',
      ],
      unsupported: true,
      errored: true,
    });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return base('unsupported', { warnings: [`파일을 찾을 수 없습니다: ${filePath}`], unsupported: true, errored: true });
  }
  if (stat.isDirectory())
    return base('unsupported', { warnings: [`경로가 폴더입니다(파일이 아님): ${filePath}`], unsupported: true, errored: true });
  if (stat.size > MAX_BYTES)
    return base('unsupported', {
      bytes: stat.size,
      warnings: [`파일이 너무 큽니다(${(stat.size / 1048576).toFixed(1)}MB, 최대 ${MAX_BYTES / 1048576}MB).`],
      unsupported: true,
      errored: true,
    });
  // Zero-byte files: a clean, format-agnostic message instead of a silent empty
  // "success" (text files) or a leaked library error ("The PDF file is empty…").
  if (stat.size === 0)
    return base('unsupported', {
      bytes: 0,
      warnings: ['파일이 비어 있습니다(0바이트). 내용이 있는 파일을 지정해 주세요.'],
      unsupported: true,
    });

  const name = path.basename(filePath);
  const bytes = stat.size;

  // Images: no pure-JS OCR worth bundling — let the client read them natively.
  if (IMAGE_RE.test(name)) {
    return base('image', {
      bytes,
      warnings: [
        '이미지는 이 도구로 글자를 추출하지 않습니다. AI 클라이언트가 이미지를 직접 볼 수 있으면 그렇게 읽고, 아니면 내용을 텍스트로 붙여넣어 주세요.',
      ],
      unsupported: true,
    });
  }

  // Plain text / markdown. Decode by sniffing the encoding (BOM → UTF-8 →
  // CP949): Korean résumés saved by Notepad/Excel are often EUC-KR/CP949, not
  // UTF-8, and reading those as UTF-8 yields mojibake.
  if (TEXT_RE.test(name) || MD_RE.test(name)) {
    let textBuf: Buffer;
    try {
      textBuf = fs.readFileSync(filePath);
    } catch (e) {
      return base('unsupported', { bytes, warnings: [`텍스트 파일을 읽지 못했습니다: ${errMsg(e)}`], unsupported: true, errored: true });
    }
    const decoded = decodeText(textBuf).trim();
    if (!decoded)
      return base(MD_RE.test(name) ? 'markdown' : 'text', {
        bytes,
        warnings: ['파일에 읽을 텍스트가 없습니다(빈 파일). 내용이 있는 파일을 지정해 주세요.'],
        unsupported: true,
      });
    return base(MD_RE.test(name) ? 'markdown' : 'text', { text: decoded, bytes });
  }

  // Read bytes once for binary handlers.
  let buf: Buffer;
  try {
    buf = fs.readFileSync(filePath);
  } catch (e) {
    return base('unsupported', { bytes, warnings: [`파일을 읽지 못했습니다: ${errMsg(e)}`], unsupported: true, errored: true });
  }

  if (DOCX_RE.test(name)) return finishDocx(buf, base);
  if (HWPX_RE.test(name)) return finishHwpx(buf, base);
  if (HWP_RE.test(name)) return finishHwp(buf, base);
  if (PDF_RE.test(name)) return finishPdf(buf, base);

  // Legacy binary office formats with no reliable pure-JS reader.
  if (LEGACY_BINARY_RE.test(name)) {
    return base('unsupported', {
      bytes,
      warnings: [
        `${path.extname(name) || '이 형식'}은 자동 추출을 지원하지 않습니다. PDF 또는 .docx/.hwp/.hwpx로 다시 저장하거나, 내용을 텍스트로 복사해 붙여넣어 주세요.`,
      ],
      unsupported: true,
    });
  }

  // Unknown extension: try to decode as text (BOM → UTF-8 → CP949), bail if it looks binary.
  const asText = decodeText(buf);
  if (looksBinary(asText)) {
    return base('unsupported', {
      bytes,
      warnings: ['지원하지 않는 형식이거나 바이너리 파일로 보입니다. PDF/.docx/.hwp/.hwpx로 저장하거나 텍스트로 붙여넣어 주세요.'],
      unsupported: true,
    });
  }
  const trimmed = asText.trim();
  if (!trimmed)
    return base('unsupported', {
      bytes,
      warnings: ['파일에 읽을 텍스트가 없습니다(빈 파일). 내용이 있는 파일을 지정해 주세요.'],
      unsupported: true,
    });
  return base('text', { text: trimmed, bytes });
}

type BaseFn = (fmt: DocumentFormat, over?: Partial<ExtractDocumentResult>) => ExtractDocumentResult;

/* ------------------------------------------------------------------- docx */

async function finishDocx(buf: Buffer, base: BaseFn): Promise<ExtractDocumentResult> {
  try {
    const { value, messages } = await mammoth.extractRawText({ buffer: buf });
    const text = (value ?? '').trim();
    if (!text)
      return base('docx', { bytes: buf.length, warnings: ['DOCX에서 텍스트를 찾지 못했습니다(이미지 위주 문서일 수 있음).'], unsupported: true });
    const warnings = messages?.length ? ['일부 서식/이미지는 무시하고 본문 텍스트만 추출했습니다.'] : [];
    return base('docx', { text, bytes: buf.length, warnings });
  } catch (e) {
    return base('unsupported', {
      bytes: buf.length,
      warnings: [`DOCX를 읽지 못했습니다(${errMsg(e)}). 구버전 .doc이면 .docx 또는 PDF로 다시 저장해 주세요.`],
      unsupported: true,
    });
  }
}

/* -------------------------------------------------------------------- hwp */

interface HwpChar {
  type: number;
  value: number | string;
}
interface HwpParagraph {
  content?: HwpChar[];
}
interface HwpSection {
  content?: HwpParagraph[];
}
interface HwpDoc {
  sections?: HwpSection[];
}

function finishHwp(buf: Buffer, base: BaseFn): ExtractDocumentResult {
  if (typeof parseHwp !== 'function')
    return base('unsupported', { bytes: buf.length, warnings: ['HWP 파서를 불러오지 못했습니다.'], unsupported: true });
  try {
    const doc = parseHwp(buf, { type: 'buffer' });
    const text = hwpDocToText(doc);
    if (!text.trim())
      return base('hwp', {
        bytes: buf.length,
        warnings: ['HWP에서 본문 텍스트를 찾지 못했습니다(이미지 위주이거나 보호된 문서일 수 있음). PDF로 저장해 다시 시도하거나 텍스트로 붙여넣어 주세요.'],
        unsupported: true,
      });
    return base('hwp', {
      text,
      bytes: buf.length,
      warnings: ['HWP는 형식 특성상 표·머리말 등 일부 서식이 단순 텍스트로 펼쳐질 수 있습니다. 핵심 내용 위주로 활용하세요.'],
    });
  } catch (e) {
    return base('unsupported', {
      bytes: buf.length,
      warnings: [`HWP를 읽지 못했습니다(${errMsg(e)}). 구버전·암호화·배포용 문서일 수 있습니다. PDF로 저장하거나 텍스트로 붙여넣어 주세요.`],
      unsupported: true,
    });
  }
}

/** sections → paragraphs → chars; CharType 0 (Char) carries the text. */
function hwpDocToText(doc: HwpDoc): string {
  const lines: string[] = [];
  for (const section of doc.sections ?? []) {
    for (const para of section.content ?? []) {
      let line = '';
      for (const ch of para.content ?? []) {
        if (typeof ch.value === 'string') line += ch.value;
        else if (ch.type === 0 && typeof ch.value === 'number' && isPrintableCodePoint(ch.value))
          // fromCodePoint (not fromCharCode) so supplementary-plane chars (emoji,
          // rare CJK) survive instead of being truncated to their low 16 bits.
          line += String.fromCodePoint(ch.value);
      }
      lines.push(line.trimEnd());
    }
  }
  return collapseBlankRuns(lines).join('\n').trim();
}

/* ------------------------------------------------------------------ hwpx */

function finishHwpx(buf: Buffer, base: BaseFn): ExtractDocumentResult {
  try {
    // Only decompress the body section XML — skipping embedded images/fonts/binData
    // both speeds extraction and bounds a zip-bomb's expansion. Reject sections that
    // declare (or together sum to) an absurd uncompressed size before inflating.
    let total = 0;
    const files = unzipSync(new Uint8Array(buf), {
      filter: (f) => {
        if (!/(^|\/)Contents\/section\d+\.xml$/i.test(f.name)) return false;
        if (f.originalSize > MAX_HWPX_ENTRY_BYTES) throw new Error('HWPX 본문 항목이 비정상적으로 큽니다.');
        total += f.originalSize;
        if (total > MAX_HWPX_TOTAL_BYTES) throw new Error('HWPX 압축 해제 크기가 한도를 초과했습니다.');
        return true;
      },
    });
    const sections = Object.keys(files).sort();
    if (sections.length === 0)
      return base('unsupported', { bytes: buf.length, warnings: ['HWPX 구조에서 본문(Contents/section*.xml)을 찾지 못했습니다.'], unsupported: true });
    const lines: string[] = [];
    for (const name of sections) {
      const xml = strFromU8(files[name]);
      for (const pm of xml.split(/<hp:p[\s>]/).slice(1)) {
        const para = pm.split('</hp:p>')[0];
        const runs = [...para.matchAll(/<hp:t[^>]*>([\s\S]*?)<\/hp:t>/g)].map((m) => decodeEntities(m[1]));
        lines.push(runs.join('').trimEnd());
      }
    }
    const text = collapseBlankRuns(lines).join('\n').trim();
    if (!text)
      return base('hwpx', { bytes: buf.length, warnings: ['HWPX에서 본문 텍스트를 찾지 못했습니다. PDF로 저장하거나 텍스트로 붙여넣어 주세요.'], unsupported: true });
    return base('hwpx', { text, bytes: buf.length });
  } catch (e) {
    return base('unsupported', {
      bytes: buf.length,
      warnings: [`HWPX를 읽지 못했습니다(${errMsg(e)}). 파일이 손상되었거나 형식이 다를 수 있습니다.`],
      unsupported: true,
    });
  }
}

/* ------------------------------------------------------------------- pdf */

async function finishPdf(buf: Buffer, base: BaseFn): Promise<ExtractDocumentResult> {
  try {
    // Lazy import: pdfjs is heavy; only load it when a PDF actually arrives.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    // In the esbuild bundle, pdfjs's main is inlined into dist/*.mjs, so on load
    // it auto-derives its worker path as `dist/pdf.worker.mjs` (next to the
    // bundle) — which doesn't exist. We ship `dist/pdf.worker.min.mjs` instead
    // (see scripts/build-dist.mjs), so override workerSrc to point at it. Must
    // be unconditional: pdfjs has already self-set workerSrc by now. Under
    // tsx/source pdfjs resolves its worker from node_modules, so leave it.
    if (BUNDLED) {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('./pdf.worker.min.mjs', import.meta.url).href;
      } catch {
        /* keep pdfjs's own resolution */
      }
    }
    const data = new Uint8Array(buf);
    const task = pdfjs.getDocument({
      data,
      // Keep stdout clean (MCP protocol channel) and avoid optional asset fetches.
      verbosity: 0,
      useSystemFonts: false,
    });

    const pages: string[] = [];
    let pageWarnings: string[] = [];
    try {
      const doc = await task.promise;
      const limit = Math.min(doc.numPages, MAX_PDF_PAGES);
      if (doc.numPages > MAX_PDF_PAGES)
        pageWarnings = [
          `페이지가 많아 앞 ${MAX_PDF_PAGES}쪽만 추출했습니다(총 ${doc.numPages}쪽). 나머지가 필요하면 해당 부분만 따로 저장하거나 텍스트로 붙여넣어 주세요.`,
        ];
      for (let i = 1; i <= limit; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        let line = '';
        for (const item of tc.items as Array<{ str?: string; hasEOL?: boolean }>) {
          line += item.str ?? '';
          if (item.hasEOL) line += '\n';
        }
        pages.push(line.replace(/[ \t]+\n/g, '\n').trim());
      }
    } finally {
      // Always tear down the loading task (worker/transport + document), even if
      // a page throws mid-parse — otherwise repeated PDF reads leak pdfjs resources.
      // Best-effort: a teardown failure must not discard an already-successful extraction.
      try {
        await task.destroy();
      } catch {
        /* ignore teardown errors */
      }
    }
    const text = collapseBlankRuns(pages.join('\n\n').split('\n')).join('\n').trim();

    if (!text)
      return base('pdf', {
        bytes: buf.length,
        warnings: [
          '이 PDF에는 추출 가능한 텍스트 레이어가 없습니다(스캔본/이미지 PDF로 보임). 이미지를 직접 볼 수 있는 AI 클라이언트라면 PDF를 직접 열어 읽고, 아니면 내용을 텍스트로 붙여넣어 주세요.',
        ],
        unsupported: true,
      });
    return base('pdf', { text, bytes: buf.length, warnings: pageWarnings });
  } catch (e) {
    // pdfjs throws a named PasswordException for password-protected PDFs — give
    // a distinct, actionable hint instead of the generic "corrupted or encrypted".
    const name = e && typeof e === 'object' && 'name' in e ? String((e as { name?: unknown }).name) : '';
    if (name === 'PasswordException') {
      return base('unsupported', {
        bytes: buf.length,
        warnings: [
          '이 PDF는 암호(비밀번호)로 보호되어 있어 읽을 수 없습니다. PDF 뷰어에서 암호를 해제해 다시 저장하거나, 내용을 텍스트로 붙여넣어 주세요.',
        ],
        unsupported: true,
      });
    }
    return base('unsupported', {
      bytes: buf.length,
      warnings: [`PDF를 읽지 못했습니다(${errMsg(e)}). 손상되었거나 지원하지 않는 PDF일 수 있습니다. 텍스트로 붙여넣어 주세요.`],
      unsupported: true,
    });
  }
}

/* ---------------------------------------------------------------- helpers */

function collapseBlankRuns(lines: string[]): string[] {
  const out: string[] = [];
  let blanks = 0;
  for (const l of lines) {
    if (l.trim() === '') {
      blanks++;
      if (blanks <= 1) out.push('');
    } else {
      blanks = 0;
      out.push(l);
    }
  }
  while (out.length && out[0] === '') out.shift();
  while (out.length && out[out.length - 1] === '') out.pop();
  return out;
}

/** Keep printable code points; preserve tab. Drop other C0/C1 controls. Guard fromCodePoint's valid range. */
function isPrintableCodePoint(cp: number): boolean {
  return cp === 9 || (cp >= 32 && cp <= 0x10ffff);
}

/** 완성형 한글 음절 수에서 대체문자(U+FFFD, 디코드 실패 신호)를 페널티로 뺀 점수. 인코딩 선택용. */
function koreanScore(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 0xac00 && c <= 0xd7a3) n++; // 완성형 한글 음절
    else if (c === 0xfffd) n -= 2; // 깨진 디코드일수록 낮은 점수
  }
  return n;
}

/**
 * Decode a text buffer, sniffing the encoding so Korean files aren't mangled:
 *   1) honor a UTF-8 / UTF-16 BOM if present;
 *   2) else try strict UTF-8 (the common, correct case — return as-is on success);
 *   3) else (invalid UTF-8) decide between lenient UTF-8 and CP949/EUC-KR by which
 *      yields more Korean: a real CP949 résumé wins as CP949, while a mostly-UTF-8
 *      file with one stray byte wins as lenient UTF-8 (so it isn't turned to mojibake).
 * Fixes the common "Notepad/Excel saved as ANSI(CP949)" case without breaking valid UTF-8.
 */
function decodeText(buf: Buffer): string {
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf)
    return new TextDecoder('utf-8').decode(buf.subarray(3));
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return new TextDecoder('utf-16le').decode(buf.subarray(2));
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) return new TextDecoder('utf-16be').decode(buf.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    const lenient = new TextDecoder('utf-8').decode(buf); // U+FFFD 허용
    let cp949: string | null = null;
    try {
      cp949 = new TextDecoder('euc-kr').decode(buf); // Node maps euc-kr → windows-949 (CP949 superset)
    } catch {
      return lenient; // euc-kr 미지원 빌드: lenient UTF-8로
    }
    return koreanScore(cp949) > koreanScore(lenient) ? cp949 : lenient; // 동점이면 UTF-8 우선
  }
}

function looksBinary(s: string): boolean {
  if (!s) return false;
  const sample = s.slice(0, 2000);
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0) return true;
    if (c < 9 || (c > 13 && c < 32)) control++;
  }
  return control / sample.length > 0.1;
}

/**
 * Library error → short, user-safe string. Strips URLs and library jargon links
 * (e.g. mammoth/jszip's "…see https://stuk.github.io/jszip/…") and bounds length
 * so the friendly Korean wrapper around it stays readable for non-developers.
 */
function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  return raw.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}
