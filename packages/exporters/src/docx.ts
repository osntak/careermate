/**
 * Markdown → .docx renderer.
 *
 * The other exporters already produce a small, well-known Markdown dialect
 * (headings `#`…`####`, `- ` bullets, `**label**: value` rows, `[text](url)`
 * links, `**bold**`, `_italic_`, `---` rules). Rather than re-derive structure
 * from records per document type, we render THAT dialect to a Word document —
 * exactly mirroring how `html.ts` turns the same Markdown into print HTML. One
 * faithful, ATS-safe single-column layout; no decorative template.
 *
 * Binary output is a `Uint8Array` (the OOXML zip). Callers stream/write it as-is.
 */
import {
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';

const HEADING_BY_LEVEL = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
] as const;

/**
 * XML 1.0 forbids these control chars even as numeric references; the `docx`
 * lib writes run text verbatim into document.xml, so a single one makes the
 * whole .docx not well-formed and Word refuses to open it. Tab (0x09) and
 * newline (0x0A) are valid and preserved. Strip everything else in the C0 set.
 */
const XML_INVALID_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;
const xmlSafe = (s: string): string => s.replace(XML_INVALID_RE, '');

const ALNUM_RE = /[\p{L}\p{N}]/u;
/** Link-scheme allowlist — mirrors html.ts renderInline so the docx path can't
 *  emit javascript:/file:// hyperlinks that the HTML path neutralizes. */
const SAFE_LINK_RE = /^(https?:|mailto:|#|\/)/i;

/** Inline tokens: **bold**, _italic_, [text](url). Order-preserving, non-nesting. */
const INLINE_RE = /(\*\*([^*]+)\*\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\))/g;

function inlineRuns(text: string): (TextRun | ExternalHyperlink)[] {
  const src = xmlSafe(text);
  const out: (TextRun | ExternalHyperlink)[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(new TextRun(src.slice(last, idx)));
    if (m[2] !== undefined) {
      out.push(new TextRun({ text: m[2], bold: true }));
    } else if (m[3] !== undefined) {
      // CommonMark intraword-underscore rule: `_` is emphasis only when flanked
      // by non-alphanumerics, so snake_case / env-vars / file_paths
      // (read_write_latency, API_KEY) are kept literal instead of being mangled.
      const before = idx > 0 ? src[idx - 1] : '';
      const after = src[idx + m[0].length] ?? '';
      if (ALNUM_RE.test(before) || ALNUM_RE.test(after)) {
        out.push(new TextRun(m[0])); // not emphasis — emit underscores literally
      } else {
        out.push(new TextRun({ text: m[3], italics: true }));
      }
    } else if (m[4] !== undefined) {
      // [text](url) — a real Word hyperlink so it survives ATS text extraction.
      const link = (m[5] ?? '').trim();
      if (SAFE_LINK_RE.test(link)) {
        out.push(
          new ExternalHyperlink({
            children: [new TextRun({ text: m[4], style: 'Hyperlink' })],
            link,
          }),
        );
      } else {
        // Disallowed scheme (javascript:/file:/data:) → plain text, mirroring html.ts.
        out.push(new TextRun(m[4]));
      }
    }
    last = idx + m[0].length;
  }
  if (last < src.length) out.push(new TextRun(src.slice(last)));
  return out.length ? out : [new TextRun('')];
}

/** Parse our Markdown dialect (blocks split on blank lines) into docx paragraphs. */
function markdownToParagraphs(markdown: string): Paragraph[] {
  const paras: Paragraph[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim() === '') continue; // blank lines: spacing comes from paragraph config

    // Horizontal rule → a thin bottom border on an empty paragraph.
    if (/^---+$/.test(line.trim())) {
      paras.push(
        new Paragraph({
          border: { bottom: { style: 'single', size: 6, space: 1, color: 'CCCCCC' } },
          spacing: { after: 160 },
          children: [new TextRun('')],
        }),
      );
      continue;
    }

    // ATX heading.
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length - 1;
      paras.push(
        new Paragraph({
          heading: HEADING_BY_LEVEL[level],
          spacing: { before: level === 0 ? 0 : 200, after: 80 },
          children: inlineRuns(h[2]),
        }),
      );
      continue;
    }

    // Bullet (-, *, + — match the markdown dialect html.ts accepts).
    const b = /^[-*+]\s+(.*)$/.exec(line);
    if (b) {
      paras.push(
        new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: inlineRuns(b[1]) }),
      );
      continue;
    }

    paras.push(new Paragraph({ spacing: { after: 120 }, children: inlineRuns(line) }));
  }

  return paras;
}

const DOCX_FONT = '맑은 고딕'; // Malgun Gothic — ships with Windows, renders Korean + Latin cleanly.

/**
 * Render a title + our Markdown body to a .docx byte array (single-column,
 * ATS-friendly). The leading `# title` in the body is rendered as Heading 1, so
 * we don't duplicate the title here.
 */
export async function markdownToDocx(_title: string, markdown: string): Promise<Uint8Array> {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: DOCX_FONT, size: 22 } }, // 11pt
      },
    },
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } }, // 2cm
        },
        children: markdownToParagraphs(markdown),
      },
    ],
  });
  // Packer.toBuffer returns a Node Buffer (a Uint8Array subclass) in Node.
  return Packer.toBuffer(doc);
}

export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
