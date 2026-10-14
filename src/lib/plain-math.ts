/**
 * Inline TeX-ish math as readable plain text, for places that cannot render
 * KaTeX: meta descriptions, share images, structured data.
 * `x^{2/3}` → `x^(2/3)`, `e^{bθ}` → `e^(bθ)`, `\pi` → `π`, `a_{1}` → `a₁`.
 */
const SYMBOLS: Record<string, string> = {
  pi: 'π',
  theta: 'θ',
  phi: 'φ',
  alpha: 'α',
  beta: 'β',
  omega: 'ω',
  delta: 'δ',
  lambda: 'λ',
  cdot: '·',
  times: '×',
  pm: '±',
  le: '≤',
  ge: '≥',
  infty: '∞',
  sqrt: '√',
};
const SUB = '₀₁₂₃₄₅₆₇₈₉';

export function plainMath(text: string): string {
  return text
    .replace(/\\([a-zA-Z]+)/g, (m, name: string) => SYMBOLS[name] ?? name)
    .replace(/\^\{([^{}]+)\}/g, (_, exp: string) =>
      exp.length === 1 ? `^${exp}` : `^(${exp})`
    )
    .replace(/_\{?(\d)\}?/g, (_, d: string) => SUB[Number(d)])
    .replace(/[{}]/g, '');
}
