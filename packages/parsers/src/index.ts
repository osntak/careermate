/**
 * @careermate/parsers — extract clean text from pasted/uploaded content and
 * normalize raw job postings.
 *
 * Two layers:
 * - `extractText` / `cleanJobPosting` (this file): pure, total helpers over text
 *   that is already in hand (pasted/HTML/markdown). Never throw.
 * - `extractDocument` (./documents): reads a file from disk and extracts text
 *   from binary office formats (.docx/.hwp/.hwpx) that AI clients can't read
 *   themselves. PDF/images are deferred to the client's native file reading.
 */
import { stripHtml } from './html.ts';
import { extractTechKeywords } from './keywords.ts';

export { stripHtml, decodeEntities } from './html.ts';
export { extractTechKeywords, TECH_TERMS } from './keywords.ts';
export type { TechTerm } from './keywords.ts';
export { extractDocument, resolveDocumentPath } from './documents.ts';
export type { ExtractDocumentResult, DocumentFormat } from './documents.ts';

/* ----------------------------------------------------------------- extractText */

export interface ExtractTextInput {
  filename?: string;
  mimeType?: string;
  content: string;
}

export interface ExtractTextResult {
  text: string;
  /** Detected logical format: `text` | `markdown` | `html` | `unsupported`. */
  format: string;
  warnings: string[];
}

const HTML_MIME_RE = /html/i;
const MD_EXT_RE = /\.(md|markdown|mdown|mkd)$/i;
const HTML_EXT_RE = /\.(html?|xhtml)$/i;
const BINARY_EXT_RE = /\.(pdf|docx?|hwpx?|pptx?|xlsx?|rtf|odt|pages|key)$/i;
const BINARY_MIME_RE = /(pdf|msword|officedocument|hancom|rtf|opendocument)/i;

/** Heuristic: does this content contain unprintable bytes (i.e. binary)? */
function looksBinary(s: string): boolean {
  if (!s) return false;
  // Sample the first chunk; count control chars (excluding tab/newline/CR).
  const sample = s.slice(0, 2000);
  let control = 0;
  for (let i = 0; i < sample.length; i++) {
    const c = sample.charCodeAt(i);
    if (c === 0) return true; // NUL almost always means binary
    if (c < 9 || (c > 13 && c < 32)) control++;
  }
  return control / sample.length > 0.1;
}

/** Heuristic: does this text look like HTML markup? */
function looksLikeHtml(s: string): boolean {
  return /<\/?[a-z][\s\S]*?>/i.test(s) && /<\/?(html|body|div|p|span|br|table|h[1-6]|ul|li)\b/i.test(s);
}

/**
 * Extract readable text from pasted/uploaded content.
 *
 * - plain text / markdown → returned as-is (markdown is kept verbatim).
 * - HTML (by mime, extension, or sniffing) → stripped to text.
 * - PDF/DOCX/etc → if the payload is already decodable text we pass it through
 *   with a note; otherwise we warn and return an empty string.
 */
export function extractText(input: ExtractTextInput): ExtractTextResult {
  const warnings: string[] = [];
  const safe: ExtractTextInput = input ?? { content: '' };
  const content = typeof safe.content === 'string' ? safe.content : '';
  const filename = safe.filename ?? '';
  const mimeType = safe.mimeType ?? '';

  const isBinaryType = BINARY_EXT_RE.test(filename) || BINARY_MIME_RE.test(mimeType);

  // Binary document formats: we don't parse them in the MVP.
  if (isBinaryType) {
    if (content && !looksBinary(content)) {
      // Payload happens to already be plain text (e.g. pre-extracted).
      warnings.push(
        '바이너리 문서(PDF/DOCX 등)는 직접 파싱하지 않습니다. 이미 텍스트로 보이는 내용을 그대로 사용했습니다.',
      );
      return { text: content.trim(), format: 'unsupported', warnings };
    }
    warnings.push(
      'PDF/DOCX 등 바이너리 문서는 현재 자동 추출을 지원하지 않습니다. 내용을 텍스트로 복사해 붙여넣어 주세요.',
    );
    return { text: '', format: 'unsupported', warnings };
  }

  // Anything else that still smells binary -> warn.
  if (looksBinary(content)) {
    warnings.push(
      '읽을 수 없는 바이너리 데이터로 보입니다. 내용을 텍스트로 복사해 붙여넣어 주세요.',
    );
    return { text: '', format: 'unsupported', warnings };
  }

  // HTML — by mime, extension, or content sniffing.
  if (HTML_MIME_RE.test(mimeType) || HTML_EXT_RE.test(filename) || looksLikeHtml(content)) {
    return { text: stripHtml(content), format: 'html', warnings };
  }

  // Markdown — by extension or mime (kept verbatim; markdown IS readable text).
  if (MD_EXT_RE.test(filename) || /markdown/i.test(mimeType)) {
    return { text: content.trim(), format: 'markdown', warnings };
  }

  // Default: plain text.
  return { text: content.trim(), format: 'text', warnings };
}

/* -------------------------------------------------------------- cleanJobPosting */

export interface CleanedJobPosting {
  text: string;
  company?: string;
  position?: string;
  deadline?: string;
  keywords: string[];
}

/** Boilerplate-ish lines (nav, cookie banners, share buttons) we drop. */
const BOILERPLATE_RE =
  /^(home|menu|login|로그인|회원가입|sign\s?up|sign\s?in|share|공유|스크랩|북마크|이전|다음|목록|prev(ious)?|next|cookie|쿠키|copyright|©|all rights reserved|이용약관|개인정보처리방침|상단으로|top|search|검색)$/i;

const COMPANY_LABEL_RE = /(?:회사명?|기업명?|company)\s*[:：]\s*(.+)/i;
const POSITION_LABEL_RE = /(?:포지션|직무|모집\s*부문|채용\s*부문|position|job\s*title)\s*[:：]\s*(.+)/i;
const DEADLINE_LABEL_RE =
  /(?:마감(?:일|일자|기한)?|접수\s*마감|deadline|due)\s*[:：]?\s*(.+)/i;

/** Pull a YYYY-MM-DD / YYYY.MM.DD / YYYY년 MM월 DD일 style date from text. */
function findDeadline(text: string): string | undefined {
  // Explicit "상시채용" / "채용시 마감" style.
  const rolling = /(상시\s*채용|채용\s*시\s*(?:마감|까지)|수시\s*채용)/i.exec(text);

  // Look near deadline labels first for a concrete date.
  for (const line of text.split('\n')) {
    const m = DEADLINE_LABEL_RE.exec(line);
    if (m) {
      const date = normalizeDate(m[1]);
      if (date) return date;
      const tail = m[1].trim();
      if (tail && tail.length <= 30) return tail;
    }
  }

  // Fall back to any date-looking token in the whole text.
  const any = normalizeDate(text);
  if (any) return any;

  if (rolling) return rolling[1].replace(/\s+/g, ' ').trim();
  return undefined;
}

/** Normalize the first date found in `s` to `YYYY-MM-DD` (or `YYYY-MM`). */
function normalizeDate(s: string): string | undefined {
  if (!s) return undefined;
  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD
  let m = /(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/.exec(s);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // YYYY-MM / YYYY.MM
  m = /(\d{4})[.\-/년]\s*(\d{1,2})\b/.exec(s);
  if (m) {
    const [, y, mo] = m;
    return `${y}-${mo.padStart(2, '0')}`;
  }
  return undefined;
}

/** Find a labelled value (company/position) from the lines. */
function findLabelled(lines: string[], re: RegExp): string | undefined {
  for (const line of lines) {
    const m = re.exec(line);
    if (m) {
      const val = m[1].trim();
      if (val && val.length <= 80) return val;
    }
  }
  return undefined;
}

/**
 * Normalize a raw job posting and best-effort extract structured hints.
 * Never throws; on weird input it returns whatever it can (often just `text`
 * and `keywords`).
 */
export function cleanJobPosting(raw: string): CleanedJobPosting {
  const source = typeof raw === 'string' ? raw : '';

  // If it looks like HTML, strip to text first.
  const pre = /<\/?[a-z][\s\S]*?>/i.test(source) ? stripHtml(source) : source;

  // Normalize whitespace per line and drop boilerplate-ish lines.
  const rawLines = pre.replace(/\r\n?/g, '\n').split('\n');
  const lines: string[] = [];
  for (const original of rawLines) {
    const line = original.replace(/[ \t\f\v]+/g, ' ').trim();
    if (!line) {
      // Preserve a single blank as a soft separator (collapsed later).
      if (lines.length && lines[lines.length - 1] !== '') lines.push('');
      continue;
    }
    if (BOILERPLATE_RE.test(line)) continue;
    // Drop ultra-short noise lines that are pure separators.
    if (/^[-=_*·•~]+$/.test(line)) continue;
    lines.push(line);
  }

  // Collapse leading/trailing blanks and runs.
  while (lines.length && lines[0] === '') lines.shift();
  while (lines.length && lines[lines.length - 1] === '') lines.pop();

  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  const company = findLabelled(lines, COMPANY_LABEL_RE);
  const position = findLabelled(lines, POSITION_LABEL_RE);
  const deadline = findDeadline(text);
  const keywords = extractTechKeywords(text);

  const result: CleanedJobPosting = { text, keywords };
  if (company) result.company = company;
  if (position) result.position = position;
  if (deadline) result.deadline = deadline;
  return result;
}
