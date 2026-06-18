/**
 * @careermate/parsers — HTML → plain text.
 *
 * A tiny, dependency-free HTML stripper. It is not a full parser; it is a
 * best-effort cleaner that removes scripts/styles, converts block boundaries to
 * newlines, decodes common entities, and collapses excess whitespace. It must
 * never throw, even on malformed markup.
 */

/** Named entities we bother to decode (the common ones in job postings). */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  bull: '•',
  copy: '©',
  reg: '®',
  trade: '™',
};

/** Decode numeric (`&#123;` / `&#x7B;`) and a handful of named entities. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, body: string) => {
    if (body[0] === '#') {
      const isHex = body[1] === 'x' || body[1] === 'X';
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return match;
        }
      }
      return match;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named !== undefined ? named : match;
  });
}

/** Block-level tags whose boundaries should become line breaks. */
const BLOCK_TAG = /<\/?(p|div|section|article|header|footer|li|ul|ol|tr|table|h[1-6]|blockquote|pre)\b[^>]*>/gi;

/**
 * Convert an HTML string to readable plain text. Best-effort and total:
 * any weird input simply yields whatever survives the regex passes.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  let s = String(html);

  // Remove script/style/head blocks entirely (including content).
  s = s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');

  // Line breaks and horizontal rules -> newline.
  s = s.replace(/<br\b[^>]*>/gi, '\n');
  s = s.replace(/<hr\b[^>]*>/gi, '\n');

  // Block tag boundaries -> newline (helps keep list items / paragraphs apart).
  s = s.replace(BLOCK_TAG, '\n');

  // Strip every remaining tag.
  s = s.replace(/<\/?[^>]+>/g, ' ');

  // Decode entities after tags are gone.
  s = decodeEntities(s);

  // Normalize whitespace: collapse spaces, trim lines, cap blank-line runs.
  s = s.replace(/[ \t\f\v]+/g, ' ');
  s = s
    .split('\n')
    .map((line) => line.trim())
    .join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}
