/**
 * Expressions inside video templates. A template parameter such as
 * `f(x) = x^2 - 1` is written once, in the board grammar
 * (`src/lib/board/expr.ts`), and printed three ways from the same parse tree:
 *
 * - evaluated in TypeScript, so the template can compute every number it
 *   shows (slopes, sums, roots, ranges) before any rendering happens;
 * - printed as NumPy for Manim, fully parenthesized, so precedence can never
 *   differ between what we computed and what is drawn;
 * - printed as LaTeX for the on-screen formula.
 *
 * Nothing reaches `eval`; the NumPy text is built from the tree, never from
 * the user's characters.
 */

import {
  compileExpr,
  ExprError,
  parseExpr,
  type ExprNode,
} from '@/lib/board/expr';

/** Accept what people type: 2x, 3(x+1), x², π, ×, −, **. */
export function normalizeExpressionInput(raw: string): string {
  return (
    raw
      .trim()
      // Parenthesized so implicit products still split: 2πx → 2*(pi)*x.
      .replaceAll('π', '(pi)')
      .replaceAll('θ', '(theta)')
      .replaceAll('−', '-')
      .replaceAll('–', '-')
      .replaceAll('×', '*')
      .replaceAll('·', '*')
      .replaceAll('÷', '/')
      .replaceAll('²', '^2')
      .replaceAll('³', '^3')
      .replaceAll('**', '^')
      .replace(/^\s*(?:y|f\s*\(\s*[a-z]+\s*\)|r)\s*=\s*/i, '')
      .replace(/(\d)\s*([A-Za-z(])/g, '$1*$2')
      .replace(/\)\s*([A-Za-z0-9(])/g, ')*$1')
      .replace(/\s+/g, ' ')
  );
}

export interface ExpressionCheck {
  ok: boolean;
  source: string;
  error?: string;
}

/**
 * Parse, restrict free variables to `variables`, reject unknown functions,
 * and require a finite value somewhere on `probe` so a typo like `1/0`
 * fails here instead of in the renderer.
 */
export function checkExpression(
  raw: string,
  variables: readonly string[],
  probe: readonly number[] = [-2.3, -0.7, 0.4, 1.3, 2.9]
): ExpressionCheck {
  const source = normalizeExpressionInput(raw);
  try {
    const compiled = compileExpr(source);
    for (const name of compiled.variables) {
      if (!variables.includes(name) && !['pi', 'tau', 'e'].includes(name)) {
        return {
          ok: false,
          source,
          error: `Unknown variable "${name}" (use ${variables.join(', ')})`,
        };
      }
    }
    if (compiled.calls.size) {
      return {
        ok: false,
        source,
        error: `Unknown function "${[...compiled.calls][0]}"`,
      };
    }
    const variable = variables[0] || 'x';
    const finite = probe.some((value) =>
      Number.isFinite(compiled.evaluate({ vars: { [variable]: value } }))
    );
    if (!finite) {
      return { ok: false, source, error: 'Expression is never finite' };
    }
    return { ok: true, source };
  } catch (error) {
    return {
      ok: false,
      source,
      error: error instanceof ExprError ? error.message : String(error),
    };
  }
}

/** A one-variable function from a checked expression. */
export function fn1(source: string, variable = 'x'): (value: number) => number {
  const compiled = compileExpr(source);
  return (value) => compiled.evaluate({ vars: { [variable]: value } });
}

const NUMPY_FUNCTIONS: Record<string, string> = {
  sin: 'np.sin',
  cos: 'np.cos',
  tan: 'np.tan',
  asin: 'np.arcsin',
  acos: 'np.arccos',
  atan: 'np.arctan',
  atan2: 'np.arctan2',
  sinh: 'np.sinh',
  cosh: 'np.cosh',
  tanh: 'np.tanh',
  exp: 'np.exp',
  ln: 'np.log',
  log10: 'np.log10',
  log2: 'np.log2',
  sqrt: 'np.sqrt',
  cbrt: 'np.cbrt',
  abs: 'np.abs',
  sign: 'np.sign',
  floor: 'np.floor',
  ceil: 'np.ceil',
  round: 'np.round',
  pow: 'np.power',
  clamp: 'np.clip',
};

const NUMPY_FOLDS: Record<string, string> = {
  min: 'np.minimum',
  max: 'np.maximum',
  hypot: 'np.hypot',
};

export function pythonNumber(value: number): string {
  if (!Number.isFinite(value)) throw new Error('Non-finite number in template');
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return String(Number(value.toPrecision(12)));
}

function numpyNode(node: ExprNode, vars: Record<string, string>): string {
  switch (node.kind) {
    case 'num':
      return pythonNumber(node.value);
    case 'var':
      if (Object.hasOwn(vars, node.name)) return vars[node.name];
      if (node.name === 'pi') return 'np.pi';
      if (node.name === 'tau') return '(2 * np.pi)';
      if (node.name === 'e') return 'np.e';
      throw new Error(`Unknown variable "${node.name}"`);
    case 'call': {
      const args = node.args.map((arg) => numpyNode(arg, vars));
      if (Object.hasOwn(NUMPY_FOLDS, node.name)) {
        return args
          .slice(1)
          .reduce(
            (acc, arg) => `${NUMPY_FOLDS[node.name]}(${acc}, ${arg})`,
            args[0]
          );
      }
      if (!Object.hasOwn(NUMPY_FUNCTIONS, node.name)) {
        throw new Error(`Unknown function "${node.name}"`);
      }
      return `${NUMPY_FUNCTIONS[node.name]}(${args.join(', ')})`;
    }
    case 'unary':
      return `(-${numpyNode(node.arg, vars)})`;
    case 'cond':
      return `np.where(${numpyNode(node.test, vars)}, ${numpyNode(node.then, vars)}, ${numpyNode(node.otherwise, vars)})`;
    case 'binary': {
      const left = numpyNode(node.left, vars);
      const right = numpyNode(node.right, vars);
      if (node.op === '^') return `(${left} ** ${right})`;
      if (node.op === '%') return `np.mod(${left}, ${right})`;
      return `(${left} ${node.op} ${right})`;
    }
  }
}

/** NumPy source for Manim; `vars` maps expression names to Python names. */
export function toNumpy(source: string, vars: Record<string, string>): string {
  return numpyNode(parseExpr(normalizeExpressionInput(source)), vars);
}

const LATEX_FUNCTIONS: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  sinh: '\\sinh',
  cosh: '\\cosh',
  tanh: '\\tanh',
  ln: '\\ln',
  log10: '\\log_{10}',
  log2: '\\log_{2}',
  sign: '\\operatorname{sgn}',
  round: '\\operatorname{round}',
  min: '\\min',
  max: '\\max',
  atan2: '\\operatorname{atan2}',
  hypot: '\\operatorname{hypot}',
  clamp: '\\operatorname{clamp}',
};

const GREEK = new Set([
  'alpha',
  'beta',
  'gamma',
  'delta',
  'theta',
  'lambda',
  'mu',
  'phi',
  'omega',
  'pi',
  'tau',
]);

/** Binding strength: higher binds tighter. */
function precedence(node: ExprNode): number {
  switch (node.kind) {
    case 'cond':
      return 0;
    case 'binary':
      if (['<', '<=', '>', '>='].includes(node.op)) return 1;
      if (node.op === '+' || node.op === '-') return 2;
      if (node.op === '^') return 5;
      return 3;
    case 'unary':
      return 2;
    case 'num':
      return node.value < 0 ? 2 : 6;
    default:
      return 6;
  }
}

export function latexNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const text = String(Number(value.toPrecision(6)));
  return text.includes('e')
    ? value.toExponential(3).replace(/e\+?(-?\d+)/, '\\times 10^{$1}')
    : text;
}

function wrap(node: ExprNode, minimum: number): string {
  const text = latexNode(node);
  return precedence(node) < minimum ? `\\left(${text}\\right)` : text;
}

/** Does this node print starting with a digit (so juxtaposition would merge numbers)? */
function startsWithDigit(node: ExprNode): boolean {
  if (node.kind === 'num') return true;
  if (node.kind === 'binary' && precedence(node) >= 3) {
    return node.op === '/' ? false : startsWithDigit(node.left);
  }
  return false;
}

/**
 * Whether `left * right` prints as juxtaposition (2x, 2πx, (x-1)(x+2),
 * 3sin x) rather than with a dot (x·2, sin x·cos x).
 */
function juxtaposes(left: ExprNode, right: ExprNode): boolean {
  if (startsWithDigit(right)) return false;
  if (left.kind === 'num') return precedence(right) >= 3;
  const leftOk =
    left.kind === 'var' ||
    precedence(left) < 3 ||
    (left.kind === 'binary' && (left.op === '*' || left.op === '^'));
  const rightOk =
    right.kind === 'var' ||
    precedence(right) < 4 ||
    (right.kind === 'binary' &&
      right.op === '^' &&
      right.left.kind === 'var') ||
    (right.kind === 'call' && ['sqrt', 'abs', 'exp'].includes(right.name));
  return leftOk && rightOk;
}

function latexNode(node: ExprNode): string {
  switch (node.kind) {
    case 'num':
      return latexNumber(node.value);
    case 'var':
      if (GREEK.has(node.name)) return `\\${node.name}`;
      if (node.name === 'e') return 'e';
      return node.name.length === 1 ? node.name : `\\mathrm{${node.name}}`;
    case 'call': {
      const args = node.args.map(latexNode);
      switch (node.name) {
        case 'sqrt':
          return `\\sqrt{${args[0]}}`;
        case 'cbrt':
          return `\\sqrt[3]{${args[0]}}`;
        case 'abs':
          return `\\left|${args[0]}\\right|`;
        case 'exp':
          return `e^{${args[0]}}`;
        case 'floor':
          return `\\left\\lfloor ${args[0]}\\right\\rfloor`;
        case 'ceil':
          return `\\left\\lceil ${args[0]}\\right\\rceil`;
        case 'pow':
          return `${wrap(node.args[0], 6)}^{${args[1]}}`;
      }
      const name = LATEX_FUNCTIONS[node.name] || `\\operatorname{${node.name}}`;
      const single = node.args.length === 1 ? node.args[0] : undefined;
      if (
        single &&
        (single.kind === 'var' || (single.kind === 'num' && single.value >= 0))
      ) {
        return `${name} ${args[0]}`;
      }
      return `${name}\\left(${args.join(', ')}\\right)`;
    }
    case 'unary':
      return `-${wrap(node.arg, 3)}`;
    case 'cond':
      return `\\begin{cases} ${latexNode(node.then)} & ${latexNode(node.test)} \\\\ ${latexNode(node.otherwise)} & \\text{otherwise} \\end{cases}`;
    case 'binary': {
      switch (node.op) {
        case '+': {
          const right = node.right;
          if (right.kind === 'unary') {
            return `${latexNode(node.left)} - ${wrap(right.arg, 3)}`;
          }
          if (right.kind === 'num' && right.value < 0) {
            return `${latexNode(node.left)} - ${latexNumber(-right.value)}`;
          }
          return `${latexNode(node.left)} + ${latexNode(right)}`;
        }
        case '-':
          return `${latexNode(node.left)} - ${wrap(node.right, 3)}`;
        case '*': {
          if (node.left.kind === 'unary') {
            return `-${latexNode({ ...node, left: node.left.arg })}`;
          }
          const left = wrap(node.left, 3);
          const right = wrap(node.right, 4);
          if (!juxtaposes(node.left, node.right))
            return `${left} \\cdot ${right}`;
          return /\\[A-Za-z]+$/.test(left) && /^[A-Za-z]/.test(right)
            ? `${left} ${right}`
            : `${left}${right}`;
        }
        case '/':
          return `\\frac{${latexNode(node.left)}}{${latexNode(node.right)}}`;
        case '%':
          return `${wrap(node.left, 3)} \\bmod ${wrap(node.right, 4)}`;
        case '^':
          return `${wrap(node.left, 6)}^{${latexNode(node.right)}}`;
        case '<':
          return `${latexNode(node.left)} < ${latexNode(node.right)}`;
        case '<=':
          return `${latexNode(node.left)} \\le ${latexNode(node.right)}`;
        case '>':
          return `${latexNode(node.left)} > ${latexNode(node.right)}`;
        case '>=':
          return `${latexNode(node.left)} \\ge ${latexNode(node.right)}`;
      }
    }
  }
}

export function toLatex(source: string): string {
  return latexNode(parseExpr(normalizeExpressionInput(source)));
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

const PLAIN_NAMES: Record<string, string> = { pi: 'π', tau: 'τ', theta: 'θ' };

function plainNode(node: ExprNode): string {
  switch (node.kind) {
    case 'num':
      return latexNumber(node.value).replace('\\times 10^', 'e');
    case 'var':
      return PLAIN_NAMES[node.name] || node.name;
    case 'call': {
      const args = node.args.map(plainNode);
      if (node.name === 'sqrt') return `√(${args[0]})`;
      if (node.name === 'abs') return `|${args[0]}|`;
      if (node.name === 'exp') return `e^(${args[0]})`;
      const single = node.args[0];
      if (
        node.args.length === 1 &&
        (single.kind === 'var' || single.kind === 'num')
      ) {
        return `${node.name} ${args[0]}`;
      }
      return `${node.name}(${args.join(', ')})`;
    }
    case 'unary':
      return `-${plainWrap(node.arg, 3)}`;
    case 'cond':
      return `(${plainNode(node.test)} ? ${plainNode(node.then)} : ${plainNode(node.otherwise)})`;
    case 'binary': {
      if (node.op === '^') {
        const exponent = node.right;
        const text = plainNode(exponent);
        const base = plainWrap(node.left, 6);
        if (exponent.kind === 'num' && /^-?\d+$/.test(text)) {
          return base + [...text].map((ch) => SUPERSCRIPT[ch]).join('');
        }
        return `${base}^${plainWrap(exponent, 6)}`;
      }
      if (node.op === '*') {
        if (node.left.kind === 'unary')
          return `-${plainNode({ ...node, left: node.left.arg })}`;
        return juxtaposes(node.left, node.right)
          ? `${plainWrap(node.left, 3)}${plainWrap(node.right, 4)}`
          : `${plainWrap(node.left, 3)}·${plainWrap(node.right, 4)}`;
      }
      if (node.op === '/')
        return `${plainWrap(node.left, 4)}/${plainWrap(node.right, 4)}`;
      if (node.op === '+' && node.right.kind === 'unary') {
        return `${plainNode(node.left)} - ${plainWrap(node.right.arg, 3)}`;
      }
      if (node.op === '-')
        return `${plainNode(node.left)} - ${plainWrap(node.right, 3)}`;
      return `${plainNode(node.left)} ${node.op} ${plainNode(node.right)}`;
    }
  }
}

function plainWrap(node: ExprNode, minimum: number): string {
  const text = plainNode(node);
  return precedence(node) < minimum ? `(${text})` : text;
}

/** Readable one-line math for captions and titles: 3x² - 1, sin x, √(x+1). */
export function toPlain(source: string): string {
  return plainNode(parseExpr(normalizeExpressionInput(source)));
}
