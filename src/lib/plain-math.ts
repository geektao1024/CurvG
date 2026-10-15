/**
 * Inline TeX-ish math as readable plain text, for places that cannot render
 * KaTeX: meta descriptions, share images, structured data.
 * `x^{2/3}` → `x^(2/3)`, `e^{bθ}` → `e^(bθ)`, `\pi` → `π`, `a_{1}` → `a₁`,
 * `\frac{3}{8}\pi a^2` → `(3/8)π a^2`, `\sqrt{1+b^2}` → `√(1+b^2)`.
 */
const SYMBOLS: Record<string, string> = {
  pi: 'π',
  theta: 'θ',
  phi: 'φ',
  varphi: 'φ',
  varpi: 'ϖ',
  alpha: 'α',
  beta: 'β',
  omega: 'ω',
  delta: 'δ',
  lambda: 'λ',
  Gamma: 'Γ',
  cdot: '·',
  times: '×',
  pm: '±',
  le: '≤',
  ge: '≥',
  approx: '≈',
  in: '∈',
  infty: '∞',
};
const SETS: Record<string, string> = { Q: 'ℚ', Z: 'ℤ', R: 'ℝ', N: 'ℕ' };
const SUB = '₀₁₂₃₄₅₆₇₈₉';

/** The `{…}` group starting at `open`, and the index just past it. */
function group(text: string, open: number): [string, number] {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') depth -= 1;
    if (depth === 0) return [text.slice(open + 1, index), index + 1];
  }
  return [text.slice(open + 1), text.length];
}

/** A `{…}` group, or a single character as in `\frac43`. */
function argument(text: string, at: number): [string, number] {
  if (text[at] === '{') return group(text, at);
  return [text[at] ?? '', at + 1];
}

/** A bare token (`3`, `x`, `\pi`) needs no parentheses; anything longer does. */
function wrap(text: string): string {
  return /^√?[\p{L}\d.]+$/u.test(text.trim())
    ? text.trim()
    : `(${text.trim()})`;
}

/** Rewrites `\frac{a}{b}` and `\sqrt{x}` from the inside out. */
function structures(text: string): string {
  let out = '';
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const frac = /^\\[dt]?frac(?=[{\w])/.exec(rest);
    const sqrt = /^\\sqrt(?=\{)/.exec(rest);
    if (frac) {
      const [top, afterTop] = argument(text, index + frac[0].length);
      const [bottom, after] = argument(text, afterTop);
      const quotient = `${wrap(structures(top))}/${wrap(structures(bottom))}`;
      if (/[\p{L}\d)]$/u.test(out)) out += ' ';
      // `\frac{3}{8}\pi` must not read as 3/(8π).
      out += /^[\s,;=+\-)\]|]|^$/.test(text.slice(after))
        ? quotient
        : `(${quotient})`;
      index = after;
    } else if (sqrt) {
      const [body, after] = group(text, index + sqrt[0].length);
      out += `√${wrap(structures(body))}`;
      index = after;
    } else if (rest.startsWith('\\sqrt')) {
      // `\sqrt5`: the radicand is the next character.
      out += '√';
      index += 5;
    } else {
      out += text[index];
      index += 1;
    }
  }
  return out;
}

/**
 * `\pi` → `π`; a function name keeps a space from its neighbours, so
 * `a\cos t` reads `a cos t` and `\cosh\frac{x}{a}` reads `cosh x/a`.
 */
function commands(text: string): string {
  return text.replace(
    /\\([a-zA-Z]+)/g,
    (match, name: string, offset: number, whole: string) => {
      if (/^[dt]?frac$|^sqrt$/.test(name)) return match;
      if (SYMBOLS[name]) return SYMBOLS[name];
      const before = /[\p{L}\d)]/u.test(whole[offset - 1] ?? '') ? ' ' : '';
      const next = whole[offset + match.length] ?? '';
      const after = /[\p{L}\d\\]/u.test(next) ? ' ' : '';
      return `${before}${name}${after}`;
    }
  );
}

export function plainMath(text: string): string {
  const cleaned = text
    .replace(/\\(left|right|big|Big|bigg|Bigg)\b\\?/g, '')
    .replace(/\\(quad|qquad)\b/g, '  ')
    .replace(/\\[,;:! ]/g, (m) => (m === '\\!' ? '' : ' '))
    .replace(/\\(?:operatorname|text|mathrm)\{([^{}]*)\}/g, '$1')
    .replace(/\\mathbb\{([A-Z])\}/g, (_, set: string) => SETS[set] ?? set);
  return structures(commands(cleaned))
    .replace(/\^\{([^{}]+)\}/g, (_, exp: string) =>
      exp.length === 1 ? `^${exp}` : `^(${exp})`
    )
    .replace(/_\{?(\d)\}?/g, (_, d: string) => SUB[Number(d)])
    .replace(/[{}]/g, '')
    .replace(/ {3,}/g, '  ');
}
