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

/** Inline tokens: **bold**, _italic_, [text](url). Order-preserving, non-nesting. */
const INLINE_RE = /(\*\*([^*]+)\*\*|_([^_]+)_|\[([^\]]+)\]\(([^)]+)\))/g;

function inlineRuns(text: string): (TextRun | ExternalHyperlink)[] {
  const out: (TextRun | ExternalHyperlink)[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(new TextRun(text.slice(last, idx)));
    if (m[2] !== undefined) {
      out.push(new TextRun({ text: m[2], bold: true }));
    } else if (m[3] !== undefined) {
      out.push(new TextRun({ text: m[3], italics: true }));
    } else if (m[4] !== undefined) {
      // [text](url) — a real Word hyperlink so it survives ATS text extraction.
      out.push(
        new ExternalHyperlink({
          children: [new TextRun({ text: m[4], style: 'Hyperlink' })],
          link: m[5],
        }),
      );
    }
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(new TextRun(text.slice(last)));
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

    // Bullet.
    const b = /^[-*]\s+(.*)$/.exec(line);
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
