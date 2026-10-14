/**
 * Lab copy → text a TTS voice can read. Guide bodies are written to be read
 * aloud, but their math is inline TeX (`$x_0=1$`, `$\frac{\pi}{6}$`); a
 * voice reading the raw source says "backslash frac". This walks the TeX
 * subset the labs use and spells it out in English or Chinese. Unknown
 * commands fall back to their bare name, so new copy degrades instead of
 * breaking; `tests/lab-video.test.ts` reads every guide step through it.
 */

export type SpeechLang = 'en' | 'zh';

type Words = Record<SpeechLang, string>;

const GREEK: Record<string, Words> = {
  alpha: { en: 'alpha', zh: '阿尔法' },
  beta: { en: 'beta', zh: '贝塔' },
  gamma: { en: 'gamma', zh: '伽马' },
  delta: { en: 'delta', zh: '德尔塔' },
  Delta: { en: 'delta', zh: '德尔塔' },
  epsilon: { en: 'epsilon', zh: '艾普西隆' },
  varepsilon: { en: 'epsilon', zh: '艾普西隆' },
  theta: { en: 'theta', zh: '西塔' },
  lambda: { en: 'lambda', zh: '兰姆达' },
  mu: { en: 'mu', zh: '缪' },
  pi: { en: 'pi', zh: '派' },
  rho: { en: 'rho', zh: '肉' },
  sigma: { en: 'sigma', zh: '西格玛' },
  Sigma: { en: 'sigma', zh: '西格玛' },
  phi: { en: 'phi', zh: '斐' },
  varphi: { en: 'phi', zh: '斐' },
  omega: { en: 'omega', zh: '欧米伽' },
  Omega: { en: 'omega', zh: '欧米伽' },
};

const SYMBOLS: Record<string, Words> = {
  '=': { en: 'equals', zh: '等于' },
  '<': { en: 'is less than', zh: '小于' },
  '>': { en: 'is greater than', zh: '大于' },
  approx: { en: 'is about', zh: '约等于' },
  le: { en: 'is at most', zh: '小于等于' },
  leq: { en: 'is at most', zh: '小于等于' },
  ge: { en: 'is at least', zh: '大于等于' },
  geq: { en: 'is at least', zh: '大于等于' },
  ne: { en: 'is not equal to', zh: '不等于' },
  neq: { en: 'is not equal to', zh: '不等于' },
  propto: { en: 'is proportional to', zh: '正比于' },
  to: { en: 'approaches', zh: '趋向于' },
  '+': { en: 'plus', zh: '加' },
  '-': { en: 'minus', zh: '减' },
  pm: { en: 'plus or minus', zh: '正负' },
  times: { en: 'times', zh: '乘' },
  cdot: { en: 'times', zh: '乘' },
  div: { en: 'divided by', zh: '除以' },
  '/': { en: 'over', zh: '除以' },
  infty: { en: 'infinity', zh: '无穷' },
  circ: { en: 'degrees', zh: '度' },
};

/** `\text{…}` after a number: SI units the physics labs use. */
const UNITS: Record<string, Words> = {
  m: { en: 'meters', zh: '米' },
  cm: { en: 'centimeters', zh: '厘米' },
  s: { en: 'seconds', zh: '秒' },
  kg: { en: 'kilograms', zh: '千克' },
  g: { en: 'grams', zh: '克' },
  N: { en: 'newtons', zh: '牛' },
  J: { en: 'joules', zh: '焦' },
  W: { en: 'watts', zh: '瓦' },
  Hz: { en: 'hertz', zh: '赫兹' },
  'm/s': { en: 'meters per second', zh: '米每秒' },
  'N/m': { en: 'newtons per meter', zh: '牛每米' },
  'rad/s': { en: 'radians per second', zh: '弧度每秒' },
  rad: { en: 'radians', zh: '弧度' },
};

const FUNCTIONS: Record<string, Words> = {
  sin: { en: 'sine', zh: 'sin' },
  cos: { en: 'cosine', zh: 'cos' },
  tan: { en: 'tangent', zh: 'tan' },
  ln: { en: 'natural log of', zh: 'ln' },
  exp: { en: 'exp', zh: 'exp' },
};

/** Commands that only affect spacing or sizing. */
const SILENT = new Set([
  'left',
  'right',
  'displaystyle',
  'quad',
  'qquad',
  ',',
  ';',
  ':',
  '!',
  ' ',
  'mathbf',
  'boldsymbol',
]);

type Token =
  | { kind: 'cmd'; name: string }
  | { kind: 'num'; value: string }
  | { kind: 'char'; value: string };

function tokenize(tex: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < tex.length) {
    const c = tex[i];
    if (c === '\\') {
      const match = /^\\([A-Za-z]+|.)/.exec(tex.slice(i));
      const name = match?.[1] ?? '';
      tokens.push({ kind: 'cmd', name });
      i += 1 + name.length;
      continue;
    }
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    const num = /^\d+(?:\.\d+)?/.exec(tex.slice(i));
    if (num) {
      tokens.push({ kind: 'num', value: num[0] });
      i += num[0].length;
      continue;
    }
    tokens.push({ kind: 'char', value: c });
    i++;
  }
  return tokens;
}

type Node =
  | { kind: 'text'; value: string; atom: boolean }
  | { kind: 'op'; key: string }
  | { kind: 'group'; items: Node[] }
  | { kind: 'frac'; num: Node; den: Node }
  | { kind: 'sqrt'; body: Node }
  | { kind: 'binom'; n: Node; k: Node }
  | { kind: 'sup'; base: Node | null; exp: Node }
  | { kind: 'sub'; base: Node | null; index: Node }
  | { kind: 'vec'; body: Node }
  | { kind: 'abs'; body: Node }
  | { kind: 'paren'; open: string; body: Node }
  | { kind: 'fn'; name: string }
  | { kind: 'log'; base: Node | null; arg: Node }
  | { kind: 'int'; from: Node | null; to: Node | null }
  | { kind: 'angle' }
  | { kind: 'prime' }
  | { kind: 'unit'; value: string }
  | { kind: 'factorial' }
  | { kind: 'comma' };

const CLOSE: Record<string, string> = { '(': ')', '[': ']' };

class Parser {
  private i = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Node {
    return this.sequence(() => false);
  }

  private peek(): Token | undefined {
    return this.tokens[this.i];
  }

  private isChar(value: string) {
    const t = this.peek();
    return t?.kind === 'char' && t.value === value;
  }

  private sequence(stop: () => boolean): Node {
    const items: Node[] = [];
    while (this.i < this.tokens.length && !stop()) {
      const node = this.atom(items);
      if (node) items.push(node);
    }
    return { kind: 'group', items };
  }

  /** One argument: a `{group}` or a single token. */
  private argument(): Node {
    if (this.isChar('{')) {
      this.i++;
      const body = this.sequence(() => this.isChar('}'));
      this.i++;
      return body;
    }
    const t = this.tokens[this.i++];
    if (!t) return { kind: 'group', items: [] };
    if (t.kind === 'num') {
      // `\frac12`: a bare digit run is one argument per digit.
      if (t.value.length > 1 && !t.value.includes('.')) {
        this.tokens.splice(this.i, 0, {
          kind: 'num',
          value: t.value.slice(1),
        });
        return { kind: 'text', value: t.value[0], atom: true };
      }
      return { kind: 'text', value: t.value, atom: true };
    }
    if (t.kind === 'cmd') return this.command(t.name, []) ?? emptyGroup();
    return { kind: 'text', value: t.value, atom: true };
  }

  private optionalScripts(): { from: Node | null; to: Node | null } {
    let from: Node | null = null;
    let to: Node | null = null;
    for (let n = 0; n < 2; n++) {
      if (this.isChar('_')) {
        this.i++;
        from = this.argument();
      } else if (this.isChar('^')) {
        this.i++;
        to = this.argument();
      }
    }
    return { from, to };
  }

  private command(name: string, items: Node[]): Node | null {
    if (SILENT.has(name)) return null;
    if (name === 'frac' || name === 'tfrac' || name === 'dfrac') {
      const num = this.argument();
      const den = this.argument();
      return { kind: 'frac', num, den };
    }
    if (name === 'binom') {
      const n = this.argument();
      const k = this.argument();
      return { kind: 'binom', n, k };
    }
    if (name === 'sqrt') return { kind: 'sqrt', body: this.argument() };
    if (name === 'vec' || name === 'overrightarrow')
      return { kind: 'vec', body: this.argument() };
    if (name === 'text' || name === 'operatorname' || name === 'mathrm') {
      const body = this.argument();
      const value = flatText(body);
      return value in UNITS
        ? { kind: 'unit', value }
        : { kind: 'text', value, atom: true };
    }
    if (name === 'log') {
      const { from } = this.optionalScripts();
      return { kind: 'log', base: from, arg: this.argument() };
    }
    if (name === 'int') {
      const { from, to } = this.optionalScripts();
      return { kind: 'int', from, to };
    }
    if (name === 'angle') return { kind: 'angle' };
    if (name === 'sum') {
      this.optionalScripts();
      return { kind: 'op', key: 'sum' };
    }
    if (name in FUNCTIONS) return { kind: 'fn', name };
    if (name in GREEK) return { kind: 'text', value: `\\${name}`, atom: true };
    if (name in SYMBOLS) return { kind: 'op', key: name };
    if (name === '{' || name === '}') return null;
    if (name === '%') return { kind: 'text', value: '%', atom: true };
    void items;
    return { kind: 'text', value: name, atom: true };
  }

  private atom(items: Node[]): Node | null {
    const t = this.tokens[this.i++];
    if (!t) return null;
    if (t.kind === 'num') return { kind: 'text', value: t.value, atom: true };
    if (t.kind === 'cmd') return this.command(t.name, items);
    const c = t.value;
    if (c === '{') {
      const body = this.sequence(() => this.isChar('}'));
      this.i++;
      return body;
    }
    if (c === '}') return null;
    if (c === '^' || c === '_') {
      const base = items.pop() ?? null;
      const arg = this.argument();
      return c === '^'
        ? { kind: 'sup', base, exp: arg }
        : { kind: 'sub', base, index: arg };
    }
    if (c === "'") return { kind: 'prime' };
    if (c === '!') return { kind: 'factorial' };
    if (c === ',') return { kind: 'comma' };
    if (c === '|') {
      const body = this.sequence(() => this.isChar('|'));
      this.i++;
      return { kind: 'abs', body };
    }
    if (c in CLOSE) {
      const close = CLOSE[c];
      const body = this.sequence(() => this.isChar(close));
      this.i++;
      return { kind: 'paren', open: c, body };
    }
    if (c in SYMBOLS) return { kind: 'op', key: c };
    return { kind: 'text', value: c, atom: true };
  }
}

function emptyGroup(): Node {
  return { kind: 'group', items: [] };
}

function flatText(node: Node): string {
  if (node.kind === 'text') return node.value;
  if (node.kind === 'op') return node.key.length === 1 ? node.key : '';
  if (node.kind === 'group') return node.items.map(flatText).join('');
  return '';
}

function isSimple(node: Node): boolean {
  if (node.kind === 'text') return true;
  if (node.kind === 'group')
    return node.items.length === 1 && isSimple(node.items[0]);
  return false;
}

function isUpperLetters(node: Node): boolean {
  const flat = node.kind === 'group' ? node.items : [node];
  return (
    flat.length > 0 &&
    flat.every((n) => n.kind === 'text' && /^[A-Z]$/.test(n.value))
  );
}

function hasOp(node: Node): boolean {
  if (node.kind === 'op') return true;
  if (node.kind === 'group') return node.items.some(hasOp);
  return false;
}

function hasVector(node: Node): boolean {
  if (node.kind === 'vec') return true;
  if (node.kind === 'group') return node.items.some(hasVector);
  return false;
}

const ORDINAL_EN: Record<string, string> = {
  '2': 'squared',
  '3': 'cubed',
};

const NUMBER_ZH = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

function speakText(value: string, lang: SpeechLang): string {
  if (value.startsWith('\\')) return GREEK[value.slice(1)]?.[lang] ?? value;
  return value;
}

function speak(node: Node, lang: SpeechLang): string[] {
  const zh = lang === 'zh';
  switch (node.kind) {
    case 'text':
      return [speakText(node.value, lang)];
    case 'op':
      if (node.key === 'sum') return [zh ? '求和' : 'the sum of'];
      return [SYMBOLS[node.key]?.[lang] ?? node.key];
    case 'comma':
      return [','];
    case 'prime':
      return [zh ? '撇' : 'prime'];
    case 'factorial':
      return [zh ? '的阶乘' : 'factorial'];
    case 'unit':
      return [UNITS[node.value][lang]];
    case 'angle':
      return [zh ? '角' : 'angle'];
    case 'fn':
      return [FUNCTIONS[node.name][lang]];
    case 'log':
      if (!node.base) return ['log', ...speak(node.arg, lang)];
      return zh
        ? [
            '以',
            ...speak(node.base, lang),
            '为底',
            ...speak(node.arg, lang),
            '的对数',
          ]
        : [
            'log base',
            ...speak(node.base, lang),
            'of',
            ...speak(node.arg, lang),
          ];
    case 'int': {
      const words: string[] = [];
      if (zh) {
        if (node.from && node.to)
          words.push(
            '从',
            ...speak(node.from, lang),
            '到',
            ...speak(node.to, lang),
            '的积分'
          );
        else words.push('积分');
      } else {
        words.push('the integral');
        if (node.from && node.to)
          words.push(
            'from',
            ...speak(node.from, lang),
            'to',
            ...speak(node.to, lang),
            'of'
          );
      }
      return words;
    }
    case 'group':
      return speakSequence(node.items, lang);
    case 'frac':
      return zh
        ? [...speak(node.den, lang), '分之', ...speak(node.num, lang)]
        : [...speak(node.num, lang), 'over', ...speak(node.den, lang)];
    case 'sqrt':
      return zh
        ? ['根号', ...speak(node.body, lang)]
        : isSimple(node.body)
          ? ['root', ...speak(node.body, lang)]
          : ['the square root of', ...speak(node.body, lang)];
    case 'binom':
      return zh
        ? [...speak(node.n, lang), '选', ...speak(node.k, lang)]
        : [...speak(node.n, lang), 'choose', ...speak(node.k, lang)];
    case 'vec':
      return [zh ? '向量' : 'vector', ...speak(node.body, lang)];
    case 'abs': {
      const body = speak(node.body, lang);
      if (hasVector(node.body))
        return zh ? [...body, '的模'] : ['the length of', ...body];
      if (isUpperLetters(node.body))
        return zh ? ['线段', ...body, '的长度'] : ['the length of', ...body];
      return zh ? [...body, '的绝对值'] : ['the absolute value of', ...body];
    }
    case 'paren':
      return speak(node.body, lang);
    case 'sup': {
      const exp = node.exp;
      const flat = flatText(exp);
      if (node.base?.kind === 'unit' && flat === '2') {
        const unit = node.base.value;
        if (unit === 'm/s')
          return [zh ? '米每二次方秒' : 'meters per second squared'];
        return zh ? ['平方', UNITS[unit].zh] : ['square', UNITS[unit].en];
      }
      if (node.base?.kind === 'fn' && flat === '2')
        return zh
          ? [FUNCTIONS[node.base.name].zh, '平方']
          : [FUNCTIONS[node.base.name].en, 'squared'];
      const base = !node.base
        ? []
        : node.base.kind === 'paren' && hasOp(node.base.body)
          ? zh
            ? ['括号', ...speak(node.base, lang), '括号']
            : ['the quantity', ...speak(node.base, lang), ',']
          : speak(node.base, lang);
      const expItems = exp.kind === 'group' ? exp.items : [exp];
      if (
        expItems.length === 1 &&
        expItems[0].kind === 'op' &&
        expItems[0].key === 'circ'
      )
        return [...base, zh ? '度' : 'degrees'];
      if (zh) {
        if (flat === '2') return [...base, '的平方'];
        if (flat === '3') return [...base, '的立方'];
        if (/^\d$/.test(flat))
          return [...base, `的${NUMBER_ZH[Number(flat)]}次方`];
        return [...base, '的', ...speak(exp, lang), '次方'];
      }
      if (ORDINAL_EN[flat]) return [...base, ORDINAL_EN[flat]];
      return [...base, 'to the power', ...speak(exp, lang)];
    }
    case 'sub': {
      const base = node.base ? speak(node.base, lang) : [];
      const index = speak(node.index, lang);
      if (flatText(node.index) === '0' && !zh) return [...base, 'naught'];
      return [...base, ...index];
    }
  }
}

function isValue(node: Node | undefined): boolean {
  if (!node) return false;
  return (
    node.kind === 'text' ||
    node.kind === 'paren' ||
    node.kind === 'sup' ||
    node.kind === 'sub' ||
    node.kind === 'frac' ||
    node.kind === 'sqrt' ||
    node.kind === 'abs' ||
    node.kind === 'vec' ||
    node.kind === 'binom' ||
    node.kind === 'unit' ||
    node.kind === 'factorial' ||
    node.kind === 'group'
  );
}

function speakSequence(items: Node[], lang: SpeechLang): string[] {
  const zh = lang === 'zh';
  const words: string[] = [];
  items.forEach((node, index) => {
    const prev = items[index - 1];
    if (node.kind === 'op' && (node.key === '-' || node.key === '+')) {
      // Unary sign: nothing that yields a value precedes it.
      const lone = items.length === 1;
      if (!lone && !isValue(prev) && prev?.kind !== 'prime') {
        if (node.key === '-') words.push(zh ? '负' : 'negative');
        return;
      }
    }
    // `f(x)`: a function name applied to a bracket.
    if (
      node.kind === 'paren' &&
      (prev?.kind === 'prime' ||
        (prev?.kind === 'text' && /^[fP]$/.test(prev.value)))
    ) {
      const inner = speak(node.body, lang);
      words.push(...(zh ? inner : ['of', ...inner]));
      return;
    }
    if (node.kind === 'paren') {
      const inner = speak(node.body, lang);
      // `np(1-p)`: a product with a bracketed sum or difference.
      if (isValue(prev) && hasOp(node.body))
        words.push(
          ...(zh
            ? ['乘括号', ...inner, '括号']
            : ['times the quantity', ...inner])
        );
      else words.push(...inner);
      return;
    }
    words.push(...speak(node, lang));
  });
  return words;
}

/** One TeX fragment as spoken words. */
export function speakTex(tex: string, lang: SpeechLang): string {
  const tree = new Parser(tokenize(tex)).parse();
  return joinWords(speak(tree, lang), lang);
}

function joinWords(words: string[], lang: SpeechLang): string {
  const out = words.filter(Boolean).join(' ').replace(/\s+,/g, ',');
  if (lang === 'en') return out.replace(/\s+/g, ' ').trim();
  // Chinese reads better without spaces between CJK words, but keep them
  // around Latin letters and digits so "x 零" doesn't run together.
  return out
    .replace(/([一-鿿])\s+(?=[一-鿿])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A guide body or other lab prose as one string for a TTS voice. */
export function spokenText(source: string, lang: SpeechLang): string {
  return source
    .replace(
      /\$\$([\s\S]+?)\$\$/g,
      (_, tex: string) => ` ${speakTex(tex, lang)} `
    )
    .replace(/\$([^$]+?)\$/g, (_, tex: string) => ` ${speakTex(tex, lang)} `)
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/\s+([,.;:!?，。；：！？、])/g, '$1')
    .replace(/([一-鿿，。；：！？、])\s+/g, '$1')
    .replace(/\s+([一-鿿])/g, (m, ch: string) => (lang === 'zh' ? ` ${ch}` : m))
    .replace(/\s+/g, ' ')
    .trim();
}

const CAPTION_TEX: [RegExp, string][] = [
  [/\\[td]?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2'],
  [/\\[td]?frac(\d)(\d)/g, '$1/$2'],
  [/\\sqrt\{([^{}]*)\}/g, '√($1)'],
  [/\\sqrt\s*(\w)/g, '√$1'],
  [/\\text\{([^{}]*)\}/g, ' $1'],
  [/\\vec\s*\{?(\w)\}?/g, '$1⃗'],
  [/\\binom\s*(\{[^{}]*\}|\w)\s*(\{[^{}]*\}|\w)/g, 'C($1,$2)'],
  [/\^\\circ/g, '°'],
  [/\^\{?2\}?/g, '²'],
  [/\^\{?3\}?/g, '³'],
  [/_\{?0\}?/g, '₀'],
  [/_\{?1\}?/g, '₁'],
  [/_\{?2\}?/g, '₂'],
];

const CAPTION_SYMBOLS: Record<string, string> = {
  approx: '≈',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  ne: '≠',
  pm: '±',
  times: '×',
  cdot: '·',
  div: '÷',
  infty: '∞',
  to: '→',
  angle: '∠',
  propto: '∝',
  int: '∫',
  sum: 'Σ',
  alpha: 'α',
  beta: 'β',
  delta: 'δ',
  Delta: 'Δ',
  epsilon: 'ε',
  varepsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  phi: 'φ',
  varphi: 'φ',
  omega: 'ω',
};

/** One TeX fragment as plain text for captions: `x_0=\frac12` → `x₀=1/2`. */
export function captionTex(tex: string): string {
  let out = tex;
  for (const [pattern, replacement] of CAPTION_TEX)
    out = out.replace(pattern, replacement);
  return out
    .replace(/\\([A-Za-z]+)/g, (m, name: string) =>
      name in CAPTION_SYMBOLS
        ? CAPTION_SYMBOLS[name]
        : name in FUNCTIONS
          ? `${name} `
          : ['left', 'right'].includes(name)
            ? ''
            : name
    )
    .replace(/\\[,;:! ]/g, ' ')
    .replace(/∠\s+/g, '∠')
    .replace(/\\([%{}])/g, '$1')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lab prose with its TeX flattened for captions. */
export function captionText(source: string): string {
  return source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex: string) => captionTex(tex))
    .replace(/\$([^$]+?)\$/g, (_, tex: string) => captionTex(tex))
    .replace(/\*\*([^*]+?)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
