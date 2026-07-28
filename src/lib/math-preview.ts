import type { AnimationMathObjectType } from '@/lib/animation';

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'name'; value: string }
  | { kind: 'operator'; value: string }
  | { kind: 'paren'; value: '(' | ')' }
  | { kind: 'comma'; value: ',' };

const functions: Record<string, (value: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  log: Math.log,
  ln: Math.log,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
};

function tokenize(expression: string): Token[] {
  const source = expression
    .replaceAll('π', 'pi')
    .replaceAll('−', '-')
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .trim();
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) {
      index += whitespace[0].length;
      continue;
    }
    const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(rest);
    if (number) {
      tokens.push({ kind: 'number', value: Number(number[0]) });
      index += number[0].length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
    if (name) {
      tokens.push({ kind: 'name', value: name[0].toLowerCase() });
      index += name[0].length;
      continue;
    }
    const character = source[index];
    if ('+-*/^'.includes(character)) {
      tokens.push({ kind: 'operator', value: character });
      index += 1;
      continue;
    }
    if (character === '(' || character === ')') {
      tokens.push({ kind: 'paren', value: character });
      index += 1;
      continue;
    }
    if (character === ',') {
      tokens.push({ kind: 'comma', value: ',' });
      index += 1;
      continue;
    }
    throw new Error(`Unsupported symbol: ${character}`);
  }
  return tokens;
}

class ExpressionParser {
  private index = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variables: Record<string, number>
  ) {}

  parse(): number {
    const value = this.additive();
    if (this.index !== this.tokens.length) throw new Error('Unexpected token');
    return value;
  }

  private additive(): number {
    let value = this.multiplicative();
    while (this.operator('+') || this.operator('-')) {
      const operator = (this.tokens[this.index - 1] as { value: string }).value;
      const right = this.multiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  private multiplicative(): number {
    let value = this.power();
    while (true) {
      if (this.operator('*')) value *= this.power();
      else if (this.operator('/')) value /= this.power();
      else if (this.isImplicitProduct()) value *= this.power();
      else break;
    }
    return value;
  }

  private power(): number {
    const base = this.unary();
    if (this.operator('^')) return base ** this.power();
    return base;
  }

  private unary(): number {
    if (this.operator('+')) return this.unary();
    if (this.operator('-')) return -this.unary();
    return this.primary();
  }

  private primary(): number {
    const token = this.tokens[this.index];
    if (!token) throw new Error('Expression ended unexpectedly');
    if (token.kind === 'number') {
      this.index += 1;
      return token.value;
    }
    if (token.kind === 'name') {
      this.index += 1;
      if (token.value === 'pi') return Math.PI;
      if (token.value === 'e') return Math.E;
      const fn = functions[token.value];
      if (fn) {
        this.expectParen('(');
        const value = this.additive();
        this.expectParen(')');
        return fn(value);
      }
      if (Object.hasOwn(this.variables, token.value)) {
        return this.variables[token.value];
      }
      throw new Error(`Unknown name: ${token.value}`);
    }
    if (token.kind === 'paren' && token.value === '(') {
      this.index += 1;
      const value = this.additive();
      this.expectParen(')');
      return value;
    }
    throw new Error('Expected a number, variable, or parenthesis');
  }

  private isImplicitProduct(): boolean {
    const token = this.tokens[this.index];
    return (
      token?.kind === 'number' ||
      token?.kind === 'name' ||
      (token?.kind === 'paren' && token.value === '(')
    );
  }

  private operator(value: string): boolean {
    const token = this.tokens[this.index];
    if (token?.kind === 'operator' && token.value === value) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private expectParen(value: '(' | ')') {
    const token = this.tokens[this.index];
    if (token?.kind !== 'paren' || token.value !== value) {
      throw new Error(`Expected ${value}`);
    }
    this.index += 1;
  }
}

export function evaluateMathExpression(
  expression: string,
  variables: Record<string, number>
): number {
  const value = new ExpressionParser(tokenize(expression), variables).parse();
  if (!Number.isFinite(value)) throw new Error('Result is not finite');
  return value;
}

export function detectMathObjectType(formula: string): AnimationMathObjectType {
  const normalized = formula.toLowerCase().replace(/\s/g, '');
  if (
    normalized.includes('\\begin{matrix}') ||
    normalized.includes('\\begin{bmatrix}') ||
    /^\[\[.*\]\]$/.test(normalized)
  ) {
    return 'matrix';
  }
  if (
    normalized.startsWith('sum(') ||
    normalized.includes('\\sum') ||
    normalized.includes('σ')
  ) {
    return 'series';
  }
  if (
    normalized.startsWith('int(') ||
    normalized.includes('\\int') ||
    normalized.includes('∫')
  ) {
    return 'integral';
  }
  return 'function';
}

function splitArguments(value: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '(' || value[index] === '[') depth += 1;
    if (value[index] === ')' || value[index] === ']') depth -= 1;
    if (value[index] === ',' && depth === 0) {
      result.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  result.push(value.slice(start).trim());
  return result;
}

export function integralParts(formula: string): {
  expression: string;
  from: number;
  to: number;
} {
  const match = /^int\((.*)\)$/i.exec(formula.trim());
  if (!match) return { expression: formula, from: 0, to: 1 };
  const [expression, variable, from, to] = splitArguments(match[1]);
  if (variable?.toLowerCase() !== 'x') {
    throw new Error('Preview integrals currently use x as the variable');
  }
  return {
    expression,
    from: Number(from),
    to: Number(to),
  };
}

export function seriesParts(formula: string): {
  expression: string;
  from: number;
  to: number;
} {
  const match = /^sum\((.*)\)$/i.exec(formula.trim());
  if (!match) return { expression: '1/n^2', from: 1, to: 12 };
  const [expression, variable, from, to] = splitArguments(match[1]);
  if (variable?.toLowerCase() !== 'n') {
    throw new Error('Preview series currently use n as the index');
  }
  return {
    expression,
    from: Math.max(1, Math.round(Number(from))),
    to: Math.min(40, Math.max(2, Math.round(Number(to)))),
  };
}

export function parseMatrix(formula: string): number[][] {
  if (/^\s*\[\[/.test(formula)) {
    const parsed = JSON.parse(formula) as unknown;
    if (
      !Array.isArray(parsed) ||
      parsed.length < 2 ||
      parsed.length > 4 ||
      !parsed.every(
        (row) =>
          Array.isArray(row) &&
          row.length === parsed.length &&
          row.every(
            (value) => typeof value === 'number' && Number.isFinite(value)
          )
      )
    ) {
      throw new Error('Matrix preview expects a 2×2 to 4×4 numeric matrix');
    }
    return parsed as number[][];
  }
  throw new Error('Use matrix syntax such as [[1, 0], [0, 1]]');
}

export function formulaToLatex(formula: string): string {
  const trimmed = formula.trim();
  if (/\\[A-Za-z]+|[∫Σ√]/.test(trimmed)) return trimmed;
  return trimmed
    .replaceAll('*', '\\cdot ')
    .replace(/\b(sin|cos|tan|log|ln|sqrt)\b/g, '\\$1')
    .replace(/\^\(([^)]+)\)/g, '^{$1}');
}
