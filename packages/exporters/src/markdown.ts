/**
 * @careermate/exporters — Markdown rendering helpers.
 *
 * Pure, dependency-free utilities for turning CareerMate records into Markdown
 * documents and for converting that Markdown into print-ready HTML. The markdown
 * renderer here is intentionally tiny: it covers the constructs our own exporters
 * emit (headings, bold, lists, paragraphs, line breaks) and nothing more.
 */
import { escapeHtml } from './html.ts';

/* ----------------------------------------------------------- slug / filenames */

/**
 * Make a filesystem-safe slug from arbitrary text, PRESERVING the original
 * script (Hangul, CJK, Latin, digits) so a Korean title like "백엔드 자기소개서"
 * yields "백엔드_자기소개서" instead of a generic fallback. Spaces and any
 * characters that aren't Unicode letters/numbers (punctuation, path separators)
 * collapse to `_`; the result is trimmed and capped to a sane filename length.
 * Falls back to `fallback` when nothing survives (e.g. emoji-only titles); pass
 * `''` to opt out of the fallback when composing a multi-part name.
 * Unicode filenames are safe on modern OSes, and the download header
 * (`http.ts` `sendDownload`) already allows Hangul and encodes UTF-8.
 */
export function slugify(input: string | null | undefined, fallback = 'document'): string {
  const slug = (input ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}]+/gu, '_') // non letter/number (space, punctuation, /\:*?…) -> separator
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
    .replace(/_+$/g, ''); // re-trim a separator left dangling by the length cap
  return slug || fallback;
}

/* ----------------------------------------------------------- markdown helpers */

/** Join non-empty lines/blocks with blank lines between them. */
export function joinBlocks(blocks: (string | null | undefined | false)[]): string {
  return blocks
    .filter((b): b is string => typeof b === 'string' && b.trim().length > 0)
    .join('\n\n');
}

/** Render a markdown bullet list from string items (empty/whitespace skipped). */
export function bulletList(items: (string | null | undefined)[]): string {
  const lines = items
    .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
    .map((i) => `- ${i.trim()}`);
  return lines.join('\n');
}

/** `**label**: value` style key/value line; returns '' if value empty. */
export function kv(label: string, value: string | null | undefined): string {
  if (!value || !value.trim()) return '';
  return `**${label}**: ${value.trim()}`;
}

/** Render a date range like `2021-03 ~ 현재` / `2021-03 ~ 2023-06`. */
export function dateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  current = false,
): string {
  const s = (start ?? '').trim();
  const e = current ? '현재' : (end ?? '').trim();
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} ~ ${e}`;
}

/* ------------------------------------------------------ tiny markdown → HTML */

/**
 * Convert inline markdown (bold, links, line breaks) within already
 * HTML-escaped text. Order matters: escaping happens before this so user
 * angle-brackets are safe; we only re-introduce the tags we generate.
 */
function renderInline(escaped: string): string {
  let out = escaped;
  // **bold**
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // [label](url) — url is already escaped; guard against javascript: schemes.
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, url: string) => {
    const safe = /^(https?:|mailto:|#|\/)/i.test(url.trim()) ? url.trim() : '#';
    return `<a href="${safe}">${label}</a>`;
  });
  return out;
}

/**
 * Minimal Markdown → HTML renderer. Supports:
 *  - ATX headings `#`..`######`
 *  - unordered lists (`-`, `*`, `+`)
 *  - ordered lists (`1.`)
 *  - horizontal rule `---`
 *  - bold + links inline
 *  - blank-line separated paragraphs, single newline -> <br>
 *
 * Anything else is treated as paragraph text. Input is HTML-escaped first, so
 * raw HTML in the markdown is rendered as literal text (safe by default).
 */
export function markdownToHtml(md: string): string {
  const src = (md ?? '').replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  const html: string[] = [];

  let i = 0;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph
      .map((l) => renderInline(escapeHtml(l)))
      .join('<br>\n');
    html.push(`<p>${text}</p>`);
    paragraph = [];
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line -> paragraph boundary.
    if (trimmed === '') {
      flushParagraph();
      i++;
      continue;
    }

    // Horizontal rule.
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph();
      html.push('<hr>');
      i++;
      continue;
    }

    // Heading.
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const content = renderInline(escapeHtml(heading[2].trim()));
      html.push(`<h${level}>${content}</h${level}>`);
      i++;
      continue;
    }

    // Unordered list block.
    if (/^[-*+]\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^[-*+]\s+/, '');
        items.push(`<li>${renderInline(escapeHtml(item))}</li>`);
        i++;
      }
      html.push(`<ul>\n${items.join('\n')}\n</ul>`);
      continue;
    }

    // Ordered list block.
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const item = lines[i].trim().replace(/^\d+\.\s+/, '');
        items.push(`<li>${renderInline(escapeHtml(item))}</li>`);
        i++;
      }
      html.push(`<ol>\n${items.join('\n')}\n</ol>`);
      continue;
    }

    // Otherwise: accumulate into the current paragraph.
    paragraph.push(line.trim());
    i++;
  }
  flushParagraph();

  return html.join('\n');
}
