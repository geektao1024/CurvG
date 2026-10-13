/**
 * Tiny prose format for lab copy: paragraphs split by blank lines, `- ` list
 * lines, `$…$` inline TeX, `$$…$$` display TeX and `**bold**`. Parsed here,
 * rendered by `RichMath`, and walked by the content tests so every TeX
 * fragment is compiled by KaTeX before it ships.
 */

export type RichInline =
  | { kind: 'text'; value: string; bold: boolean }
  | { kind: 'math'; tex: string };

export type RichBlock =
  | { kind: 'paragraph'; inlines: RichInline[] }
  | { kind: 'list'; items: RichInline[][] }
  | { kind: 'display'; tex: string };

function parseInlines(text: string): RichInline[] {
  const inlines: RichInline[] = [];
  text.split(/(\$[^$]+?\$)/g).forEach((part) => {
    if (!part) return;
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
      inlines.push({ kind: 'math', tex: part.slice(1, -1) });
      return;
    }
    part.split(/(\*\*[^*]+?\*\*)/g).forEach((piece) => {
      if (!piece) return;
      const bold =
        piece.startsWith('**') && piece.endsWith('**') && piece.length > 4;
      inlines.push({
        kind: 'text',
        value: bold ? piece.slice(2, -2) : piece,
        bold,
      });
    });
  });
  return inlines;
}

export function parseRichMath(source: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  source.split(/(\$\$[\s\S]+?\$\$)/g).forEach((chunk) => {
    if (chunk.startsWith('$$') && chunk.endsWith('$$') && chunk.length > 4) {
      blocks.push({ kind: 'display', tex: chunk.slice(2, -2).trim() });
      return;
    }
    chunk
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph) => {
        const lines = paragraph.split('\n').map((line) => line.trim());
        if (lines.every((line) => line.startsWith('- '))) {
          blocks.push({
            kind: 'list',
            items: lines.map((line) => parseInlines(line.slice(2))),
          });
        } else {
          blocks.push({
            kind: 'paragraph',
            inlines: parseInlines(lines.join(' ')),
          });
        }
      });
  });
  return blocks;
}

/** Every TeX fragment in a rich string, display and inline. */
export function richMathTex(source: string): string[] {
  const tex: string[] = [];
  const visit = (inlines: RichInline[]) =>
    inlines.forEach((inline) => {
      if (inline.kind === 'math') tex.push(inline.tex);
    });
  for (const block of parseRichMath(source)) {
    if (block.kind === 'display') tex.push(block.tex);
    else if (block.kind === 'paragraph') visit(block.inlines);
    else block.items.forEach(visit);
  }
  return tex;
}
