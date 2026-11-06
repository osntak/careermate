/**
 * @careermate/exporters — HTML helpers.
 *
 * `escapeHtml` and `toPrintableHtml` produce a clean, standalone, A4
 * print-optimized HTML document. The print CSS is what powers our "PDF" export:
 * the user opens the HTML in a browser and chooses "Print → Save as PDF", so we
 * never ship a binary PDF library.
 */
import { markdownToHtml } from './markdown.ts';

/** Escape the five HTML-significant characters. */
export function escapeHtml(input: string | null | undefined): string {
  return (input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wrap a markdown body in a complete, print-optimized HTML document.
 *
 * The body is ALWAYS rendered through {@link markdownToHtml}, which HTML-escapes
 * its input before re-introducing only its own safe tags. Every exporter feeds
 * this markdown it built itself, so there is no need to accept raw HTML — and
 * accepting it would let user content (e.g. a cover-letter body containing
 * `<img onerror=...>`) execute when the exported file is opened in a browser.
 */
export function toPrintableHtml(title: string, bodyMarkdown: string, footer?: string): string {
  const body = markdownToHtml(bodyMarkdown);
  const safeTitle = escapeHtml(title);
  // Printed on every page with "n / N" (CSS page-margin boxes, Chromium 131+). A quote,
  // backslash or any control char (CSS treats \f as a newline) ends the string early,
  // and `<` could close <style>, so all of them become CSS hex escapes.
  const footerCss = footer === undefined ? '' : `
    @bottom-center {
      content: "${footer.replace(/[\\"<\x00-\x1f\x7f]/g, (c) => `\\${c.charCodeAt(0).toString(16)} `)}${footer ? '   ' : ''}" counter(page) " / " counter(pages);
      font-size: 8pt;
      color: #888;
    }`;

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  :root {
    --ink: #1a1a1a;
    --muted: #555;
    --line: #d8d8d8;
    --accent: #2b4a6f;
    --maxw: 800px;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    color: var(--ink);
    background: #f4f4f5;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic",
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page {
    max-width: var(--maxw);
    margin: 24px auto;
    padding: 48px 56px;
    background: #fff;
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.08);
  }
  h1, h2, h3, h4, h5, h6 {
    color: var(--accent);
    line-height: 1.3;
    margin: 1.4em 0 0.5em;
    font-weight: 700;
  }
  h1 { font-size: 1.9em; margin-top: 0; border-bottom: 2px solid var(--accent); padding-bottom: 0.25em; }
  h2 { font-size: 1.4em; border-bottom: 1px solid var(--line); padding-bottom: 0.2em; }
  h3 { font-size: 1.15em; }
  h4, h5, h6 { font-size: 1em; }
  p { margin: 0.6em 0; }
  ul, ol { margin: 0.5em 0 0.8em; padding-left: 1.4em; }
  li { margin: 0.2em 0; }
  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
  strong { font-weight: 700; }
  table { border-collapse: collapse; width: 100%; margin: 0.6em 0 0.9em; }
  th, td { border: 1px solid var(--line); padding: 0.35em 0.6em; text-align: left; vertical-align: top; }
  th { background: #f3f4f6; }
  code { font-family: Consolas, "D2Coding", monospace; font-size: 0.9em; background: #f3f4f6; padding: 0.1em 0.3em; border-radius: 3px; }
  hr { border: none; border-top: 1px solid var(--line); margin: 1.5em 0; }
  @page {
    size: A4;
    margin: 18mm 16mm;${footerCss}
  }
  @media print {
    /* Screen spacing (line-height 1.7, 1.4em heading gaps) pushed a one-page résumé
       (about 1,800 characters) onto two printed pages. 10pt still did on a PC without
       Pretendard, where the wider Malgun Gothic fallback is used; 9.5pt fits there. */
    html, body { background: #fff; font-size: 9.5pt; line-height: 1.45; }
    h1, h2, h3, h4, h5, h6 { margin: 0.9em 0 0.3em; }
    h1 { font-size: 1.6em; padding-bottom: 0.15em; }
    h2 { font-size: 1.2em; }
    h3 { font-size: 1.05em; }
    p { margin: 0.3em 0; }
    ul, ol { margin: 0.2em 0 0.4em; }
    li { margin: 0.05em 0; }
    hr { margin: 0.8em 0; }
    .page {
      max-width: none;
      margin: 0;
      padding: 0;
      box-shadow: none;
    }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    li, p { page-break-inside: avoid; }
    a { color: var(--ink); }
  }
</style>
</head>
<body>
<main class="page">
${body}
</main>
</body>
</html>
`;
}
