/**
 * Safe arithmetic expressions for interactive boards.
 *
 * Lab content is authored by us, but generated lessons will carry
 * model-written expressions, so nothing here reaches `eval` or `new Function`.
 * Expressions parse into a small AST and evaluate against an explicit scope.
 *
 * Grammar (explicit `*`, no implicit multiplication):
 *   expr  := sum ('?' expr ':' expr)?
 *   sum   := term (('+' | '-') term)*
 *   term  := unary (('*' | '/' | '%') unary)*
 *   unary := ('-' | '+') unary | power
 *   power := call ('^' unary)?          // right-associative, -x^2 = -(x^2)
 *   call  := ident '(' args ')' | ident | number | '(' expr ')'
 * Comparisons (`<`, `<=`, `>`, `>=`) yield 1 or 0 and sit below the ternary.
 */

export class ExprError extends Error {
  constructor(
    message: string,
    readonly source: string
  ) {
    super(`${message} in "${source}"`);
    this.name = 'ExprError';
  }
}

type Node =
  | { kind: 'num'; value: number }
  | { kind: 'var'; name: string }
  | { kind: 'call'; name: string; args: Node[] }
  | { kind: 'unary'; op: '-'; arg: Node }
  | { kind: 'binary'; op: BinaryOp; left: Node; right: Node }
  | { kind: 'cond'; test: Node; then: Node; otherwise: Node };

type BinaryOp = '+' | '-' | '*' | '/' | '%' | '^' | '<' | '<=' | '>' | '>=';

type Token =
  | { type: 'num'; value: number }
  | { type: 'ident'; value: string }
  | { type: 'op'; value: string };

const MAX_SOURCE_LENGTH = 400;
const MAX_DEPTH = 48;

export const BUILTIN_CONSTANTS: Readonly<Record<string, number>> = {
  pi: Math.PI,
  tau: Math.PI * 2,
  e: Math.E,
};

type Builtin = {
  arity: number | [number, number];
  fn: (...a: number[]) => number;
};

export const BUILTIN_FUNCTIONS: Readonly<Record<string, Builtin>> = {
  sin: { arity: 1, fn: Math.sin },
  cos: { arity: 1, fn: Math.cos },
  tan: { arity: 1, fn: Math.tan },
  asin: { arity: 1, fn: Math.asin },
  acos: { arity: 1, fn: Math.acos },
  atan: { arity: 1, fn: Math.atan },
  atan2: { arity: 2, fn: Math.atan2 },
  sinh: { arity: 1, fn: Math.sinh },
  cosh: { arity: 1, fn: Math.cosh },
  tanh: { arity: 1, fn: Math.tanh },
  exp: { arity: 1, fn: Math.exp },
  ln: { arity: 1, fn: Math.log },
  log10: { arity: 1, fn: Math.log10 },
  log2: { arity: 1, fn: Math.log2 },
  sqrt: { arity: 1, fn: Math.sqrt },
  cbrt: { arity: 1, fn: Math.cbrt },
  abs: { arity: 1, fn: Math.abs },
  sign: { arity: 1, fn: Math.sign },
  floor: { arity: 1, fn: Math.floor },
  ceil: { arity: 1, fn: Math.ceil },
  round: { arity: 1, fn: Math.round },
  min: { arity: [1, 8], fn: Math.min },
  max: { arity: [1, 8], fn: Math.max },
  hypot: { arity: [1, 8], fn: Math.hypot },
  pow: { arity: 2, fn: Math.pow },
  clamp: {
    arity: 3,
    fn: (x, lo, hi) => Math.min(Math.max(x, lo), hi),
  },
};

// Own-property checks only: `name in obj` would resolve `constructor`,
// `toString` and friends through the prototype chain.
export function isBuiltinFunction(name: string): boolean {
  return Object.hasOwn(BUILTIN_FUNCTIONS, name);
}

export function isBuiltinConstant(name: string): boolean {
  return Object.hasOwn(BUILTIN_CONSTANTS, name);
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < source.length) {
    const ch = source[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const match = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(
        source.slice(i)
      );
      if (!match) throw new ExprError(`Bad number at ${i}`, source);
      tokens.push({ type: 'num', value: Number(match[0]) });
      i += match[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(source.slice(i))!;
      tokens.push({ type: 'ident', value: match[0] });
      i += match[0].length;
      continue;
    }
    const two = source.slice(i, i + 2);
    if (two === '<=' || two === '>=') {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }
    if ('+-*/%^(),?:<>'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    throw new ExprError(`Unexpected "${ch}"`, source);
  }
  return tokens;
}

class Parser {
  private pos = 0;
  private depth = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly source: string
  ) {}

  parse(): Node {
    const node = this.expr();
    if (this.pos < this.tokens.length) {
      throw new ExprError('Unexpected trailing input', this.source);
    }
    return node;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private isOp(value: string): boolean {
    const token = this.peek();
    return token?.type === 'op' && token.value === value;
  }

  private expect(value: string) {
    if (!this.isOp(value))
      throw new ExprError(`Expected "${value}"`, this.source);
    this.pos += 1;
  }

  private enter() {
    this.depth += 1;
    if (this.depth > MAX_DEPTH)
      throw new ExprError('Expression too deep', this.source);
  }

  private expr(): Node {
    this.enter();
    const test = this.comparison();
    let node = test;
    if (this.isOp('?')) {
      this.pos += 1;
      const then = this.expr();
      this.expect(':');
      const otherwise = this.expr();
      node = { kind: 'cond', test, then, otherwise };
    }
    this.depth -= 1;
    return node;
  }

  private comparison(): Node {
    let left = this.sum();
    for (const op of ['<=', '>=', '<', '>'] as const) {
      if (this.isOp(op)) {
        this.pos += 1;
        left = { kind: 'binary', op, left, right: this.sum() };
        break;
      }
    }
    return left;
  }

  private sum(): Node {
    let left = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const op = (this.tokens[this.pos++] as { value: '+' | '-' }).value;
      left = { kind: 'binary', op, left, right: this.term() };
    }
    return left;
  }

  private term(): Node {
    let left = this.unary();
    while (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
      const op = (this.tokens[this.pos++] as { value: '*' | '/' | '%' }).value;
      left = { kind: 'binary', op, left, right: this.unary() };
    }
    return left;
  }

  private unary(): Node {
    if (this.isOp('-')) {
      this.pos += 1;
      this.enter();
      const arg = this.unary();
      this.depth -= 1;
      return { kind: 'unary', op: '-', arg };
    }
    if (this.isOp('+')) {
      this.pos += 1;
      return this.unary();
    }
    return this.power();
  }

  private power(): Node {
    const base = this.primary();
    if (this.isOp('^')) {
      this.pos += 1;
      this.enter();
      const exponent = this.unary();
      this.depth -= 1;
      return { kind: 'binary', op: '^', left: base, right: exponent };
    }
    return base;
  }

  private primary(): Node {
    const token = this.peek();
    if (!token) throw new ExprError('Unexpected end', this.source);
    if (token.type === 'num') {
      this.pos += 1;
      return { kind: 'num', value: token.value };
    }
    if (token.type === 'ident') {
      this.pos += 1;
      if (this.isOp('(')) {
        this.pos += 1;
        const args: Node[] = [];
        if (!this.isOp(')')) {
          args.push(this.expr());
          while (this.isOp(',')) {
            this.pos += 1;
            args.push(this.expr());
          }
        }
        this.expect(')');
        return { kind: 'call', name: token.value, args };
      }
      return { kind: 'var', name: token.value };
    }
    if (token.value === '(') {
      this.pos += 1;
      const inner = this.expr();
      this.expect(')');
      return inner;
    }
    throw new ExprError(`Unexpected "${token.value}"`, this.source);
  }
}

export type ExprScope = {
  vars: Readonly<Record<string, number>>;
  fns?: Readonly<Record<string, (...args: number[]) => number>>;
};

export type CompiledExpr = {
  source: string;
  /** Free variable names, constants excluded unless shadowed by the scope. */
  variables: ReadonlySet<string>;
  /** Called names that are not builtins (user functions). */
  calls: ReadonlySet<string>;
  evaluate: (scope: ExprScope) => number;
};

function collect(node: Node, variables: Set<string>, calls: Set<string>) {
  switch (node.kind) {
    case 'num':
      return;
    case 'var':
      variables.add(node.name);
      return;
    case 'call':
      if (!isBuiltinFunction(node.name)) calls.add(node.name);
      node.args.forEach((arg) => collect(arg, variables, calls));
      return;
    case 'unary':
      collect(node.arg, variables, calls);
      return;
    case 'binary':
      collect(node.left, variables, calls);
      collect(node.right, variables, calls);
      return;
    case 'cond':
      collect(node.test, variables, calls);
      collect(node.then, variables, calls);
      collect(node.otherwise, variables, calls);
  }
}

function checkArity(node: Node, source: string) {
  if (node.kind === 'call') {
    const builtin = isBuiltinFunction(node.name)
      ? BUILTIN_FUNCTIONS[node.name]
      : undefined;
    if (builtin) {
      const [lo, hi] =
        typeof builtin.arity === 'number'
          ? [builtin.arity, builtin.arity]
          : builtin.arity;
      if (node.args.length < lo || node.args.length > hi) {
        throw new ExprError(
          `${node.name} takes ${lo === hi ? lo : `${lo}-${hi}`} argument(s)`,
          source
        );
      }
    }
    node.args.forEach((arg) => checkArity(arg, source));
  } else if (node.kind === 'unary') checkArity(node.arg, source);
  else if (node.kind === 'binary') {
    checkArity(node.left, source);
    checkArity(node.right, source);
  } else if (node.kind === 'cond') {
    checkArity(node.test, source);
    checkArity(node.then, source);
    checkArity(node.otherwise, source);
  }
}

function evaluateNode(node: Node, scope: ExprScope, source: string): number {
  switch (node.kind) {
    case 'num':
      return node.value;
    case 'var': {
      if (Object.hasOwn(scope.vars, node.name)) return scope.vars[node.name];
      if (isBuiltinConstant(node.name)) return BUILTIN_CONSTANTS[node.name];
      throw new ExprError(`Unknown variable "${node.name}"`, source);
    }
    case 'call': {
      const args = node.args.map((arg) => evaluateNode(arg, scope, source));
      if (scope.fns && Object.hasOwn(scope.fns, node.name)) {
        return scope.fns[node.name](...args);
      }
      if (isBuiltinFunction(node.name)) {
        return BUILTIN_FUNCTIONS[node.name].fn(...args);
      }
      throw new ExprError(`Unknown function "${node.name}"`, source);
    }
    case 'unary':
      return -evaluateNode(node.arg, scope, source);
    case 'cond':
      return evaluateNode(node.test, scope, source) !== 0
        ? evaluateNode(node.then, scope, source)
        : evaluateNode(node.otherwise, scope, source);
    case 'binary': {
      const a = evaluateNode(node.left, scope, source);
      const b = evaluateNode(node.right, scope, source);
      switch (node.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '%':
          return a % b;
        case '^':
          return Math.pow(a, b);
        case '<':
          return a < b ? 1 : 0;
        case '<=':
          return a <= b ? 1 : 0;
        case '>':
          return a > b ? 1 : 0;
        case '>=':
          return a >= b ? 1 : 0;
      }
    }
  }
}

export function compileExpr(input: string | number): CompiledExpr {
  const source = String(input).trim();
  if (!source) throw new ExprError('Empty expression', source);
  if (source.length > MAX_SOURCE_LENGTH) {
    throw new ExprError('Expression too long', source.slice(0, 40));
  }
  if (typeof input === 'number') {
    if (!Number.isFinite(input))
      throw new ExprError('Non-finite number', source);
    return {
      source,
      variables: new Set(),
      calls: new Set(),
      evaluate: () => input,
    };
  }
  const ast = new Parser(tokenize(source), source).parse();
  checkArity(ast, source);
  const variables = new Set<string>();
  const calls = new Set<string>();
  collect(ast, variables, calls);
  return {
    source,
    variables,
    calls,
    evaluate: (scope) => evaluateNode(ast, scope, source),
  };
}
