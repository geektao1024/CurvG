import { latexNumber } from '../expr';
import { ManimScript, niceRange, num, plotSegments } from '../manim';
import type { VideoTemplate } from '../types';

interface Series {
  label: string;
  latex: string;
  py: string;
  fn: (x: number) => number;
  /** Coefficient of x^n. */
  coefficient: (n: number) => number;
  /** LaTeX of the x^n term without its sign (for the partial-sum display). */
  term: (n: number) => string;
  x: [number, number];
  y: [number, number];
  /** Radius of convergence (Infinity for entire functions). */
  radius: number;
  general: string;
}

const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1));
const power = (n: number) => (n === 0 ? '1' : n === 1 ? 'x' : `x^{${n}}`);
const overFactorial = (n: number) =>
  n <= 1 ? power(n) : `\\frac{${power(n)}}{${n}!}`;
const overN = (n: number) => (n === 1 ? 'x' : `\\frac{${power(n)}}{${n}}`);

const SERIES: Record<string, Series> = {
  sin: {
    label: 'sin x',
    latex: '\\sin x',
    py: 'np.sin(x)',
    fn: Math.sin,
    coefficient: (n) =>
      n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / factorial(n) : 0,
    term: overFactorial,
    x: [-7.5, 7.5],
    y: [-2.5, 2.5],
    radius: Infinity,
    general: '\\sin x = \\sum_{k=0}^{\\infty} \\frac{(-1)^k x^{2k+1}}{(2k+1)!}',
  },
  cos: {
    label: 'cos x',
    latex: '\\cos x',
    py: 'np.cos(x)',
    fn: Math.cos,
    coefficient: (n) =>
      n % 2 === 0 ? ((n / 2) % 2 === 0 ? 1 : -1) / factorial(n) : 0,
    term: overFactorial,
    x: [-7.5, 7.5],
    y: [-2.5, 2.5],
    radius: Infinity,
    general: '\\cos x = \\sum_{k=0}^{\\infty} \\frac{(-1)^k x^{2k}}{(2k)!}',
  },
  exp: {
    label: 'eˣ',
    latex: 'e^{x}',
    py: 'np.exp(x)',
    fn: Math.exp,
    coefficient: (n) => 1 / factorial(n),
    term: overFactorial,
    x: [-4, 3],
    y: [-2, 12],
    radius: Infinity,
    general: 'e^{x} = \\sum_{n=0}^{\\infty} \\frac{x^{n}}{n!}',
  },
  ln1p: {
    label: 'ln(1 + x)',
    latex: '\\ln(1+x)',
    py: 'np.log(1 + x)',
    fn: (x) => Math.log(1 + x),
    coefficient: (n) => (n === 0 ? 0 : (n % 2 === 1 ? 1 : -1) / n),
    term: overN,
    x: [-1, 3],
    y: [-3, 2.5],
    radius: 1,
    general: '\\ln(1+x) = \\sum_{n=1}^{\\infty} \\frac{(-1)^{n+1} x^{n}}{n}',
  },
  geometric: {
    label: '1 / (1 − x)',
    latex: '\\frac{1}{1-x}',
    py: '1 / (1 - x)',
    fn: (x) => 1 / (1 - x),
    coefficient: (n) => 1,
    term: power,
    x: [-2, 2],
    y: [-3, 8],
    radius: 1,
    general: '\\frac{1}{1-x} = \\sum_{n=0}^{\\infty} x^{n}',
  },
  atan: {
    label: 'arctan x',
    latex: '\\arctan x',
    py: 'np.arctan(x)',
    fn: Math.atan,
    coefficient: (n) =>
      n % 2 === 1 ? (((n - 1) / 2) % 2 === 0 ? 1 : -1) / n : 0,
    term: overN,
    x: [-2.5, 2.5],
    y: [-2.5, 2.5],
    radius: 1,
    general: '\\arctan x = \\sum_{k=0}^{\\infty} \\frac{(-1)^k x^{2k+1}}{2k+1}',
  },
};

const copy = {
  en: {
    title: (f: string) => `Taylor polynomials of ${f}`,
    subtitle: 'Add one term at a time and watch the polynomial hug the curve',
    curve: (f: string) =>
      `The target: y = ${f}. Near x = 0 we build it from powers of x.`,
    first: 'The first term matches the value (and slope) at 0.',
    more: 'Each new term matches one more derivative at 0: the fit spreads outward.',
    degree: (n: number) => `Degree ${n}: close agreement over a wide stretch.`,
    radius:
      'But only for |x| < 1: beyond the radius of convergence the polynomials break away.',
    everywhere:
      'With enough terms the polynomials agree with the function for every x.',
    takeaway: 'A smooth function, rebuilt from its derivatives at one point',
    beats: ['The function', 'First term', 'More terms', 'Convergence'],
  },
  zh: {
    title: (f: string) => `${f} 的泰勒多项式`,
    subtitle: '一次加一项，看多项式如何贴合曲线',
    curve: (f: string) =>
      `目标函数 y = ${f}。在 x = 0 附近，用 x 的幂把它拼出来。`,
    first: '第一项让函数值（和斜率）在 0 处对上。',
    more: '每加一项，就在 0 处多对上一阶导数：贴合的范围向外扩展。',
    degree: (n: number) => `${n} 次多项式：在很宽的范围内都贴合。`,
    radius: '但只在 |x| < 1 内成立：超出收敛半径，多项式会离开曲线。',
    everywhere: '项数足够多时，对任意 x 多项式都能逼近函数。',
    takeaway: '光滑函数，可以由它在一点的各阶导数重建',
    beats: ['目标函数', '第一项', '逐项添加', '收敛'],
  },
};

/** Degrees with a new nonzero term, up to max. */
function degrees(series: Series, max: number): number[] {
  const list: number[] = [];
  for (let n = 0; n <= max; n += 1)
    if (series.coefficient(n) !== 0) list.push(n);
  return list;
}

function partialSumLatex(series: Series, degree: number): string {
  const terms = degrees(series, degree);
  const shown =
    terms.length > 4 ? [...terms.slice(0, 3), terms[terms.length - 1]] : terms;
  let text = '';
  shown.forEach((n, i) => {
    const c = series.coefficient(n);
    const body = series.term(n);
    const sign = c < 0 ? '-' : i === 0 ? '' : '+';
    if (terms.length > 4 && i === 3) text += ' + \\cdots ';
    text += `${i === 0 && c < 0 ? '-' : i === 0 ? '' : ` ${sign} `}${body}`;
  });
  return `P_{${degree}}(x) = ${text}`;
}

export const taylorSeries: VideoTemplate = {
  id: 'taylor-series',
  version: 1,
  category: 'series',
  title: { en: 'Taylor (Maclaurin) series', zh: '泰勒（麦克劳林）级数' },
  summary: {
    en: 'Polynomials of growing degree close in on sin, cos, eˣ, ln(1+x), 1/(1−x) or arctan around x = 0, with the radius of convergence where it matters.',
    zh: '次数不断增加的多项式在 x = 0 附近逼近 sin、cos、eˣ、ln(1+x)、1/(1−x) 或 arctan，并展示收敛半径。',
  },
  matchHint:
    'Taylor series, Maclaurin series, polynomial approximation of sin/cos/exp/ln/arctan/geometric series, radius of convergence, why sin x ≈ x for small x. Only these six functions, expanded at 0. Not: Taylor series of arbitrary functions or about other centers, Fourier series.',
  examples: [
    {
      prompt: 'Show how Taylor polynomials approximate sin x',
      params: { fn: 'sin', degree: 11 },
    },
    { prompt: 'e 的 x 次方的泰勒展开动画', params: { fn: 'exp', degree: 8 } },
    {
      prompt: 'radius of convergence of ln(1+x) series',
      params: { fn: 'ln1p', degree: 10 },
    },
  ],
  params: [
    {
      key: 'fn',
      type: 'choice',
      default: 'sin',
      label: { en: 'Function', zh: '函数' },
      options: Object.entries(SERIES).map(([value, series]) => ({
        value,
        label: { en: series.label, zh: series.label },
      })),
    },
    {
      key: 'degree',
      type: 'number',
      default: 11,
      min: 3,
      max: 15,
      integer: true,
      label: { en: 'Highest degree', zh: '最高次数' },
    },
  ],
  build(params, context) {
    const t = copy[context.locale];
    const series = SERIES[String(params.fn)] ?? SERIES.sin;
    const maxDegree = Number(params.degree);
    const s = new ManimScript(context);
    const xr = niceRange(series.x[0], series.x[1]);
    const yr = niceRange(series.y[0], series.y[1]);
    const window = { min: yr.min, max: yr.max };
    s.define('f', 'x', series.py);
    const allDegrees = degrees(series, maxDegree);
    // At most six frames of the build-up: early terms one by one, then jumps.
    const shownDegrees =
      allDegrees.length <= 6
        ? allDegrees
        : [
            ...allDegrees.slice(0, 4),
            allDegrees[Math.floor((allDegrees.length + 4) / 2)],
            allDegrees[allDegrees.length - 1],
          ].filter((d, i, list) => list.indexOf(d) === i);
    const poly = (degree: number) => (x: number) => {
      let total = 0;
      for (let n = 0; n <= degree; n += 1)
        total += series.coefficient(n) * x ** n;
      return total;
    };
    const polyPy = (degree: number) =>
      degrees(series, degree)
        .map((n) => `(${num(series.coefficient(n))}) * x ** ${n}`)
        .join(' + ') || '0 * x';

    s.intro(t.title(series.label), t.subtitle);
    const ax = s.axes({ name: 'axes', x: xr, y: yr });
    s.plot(
      'target',
      ax.axes,
      'f(x)',
      plotSegments(series.fn, xr.min, xr.max, window),
      'AMBER',
      6
    );
    shownDegrees.forEach((degree) =>
      s.plot(
        `p_${degree}`,
        ax.axes,
        polyPy(degree),
        plotSegments(poly(degree), xr.min, xr.max, window),
        'BLUE',
        4
      )
    );
    s.panelTex('target_eq', `f(x) = ${series.latex}`, 0, { color: 'AMBER' });
    shownDegrees.forEach((degree) =>
      s.panelTex(`eq_${degree}`, partialSumLatex(series, degree), 1.2, {
        color: 'BLUE',
        size: 36,
      })
    );

    s.caption(t.curve(series.label));
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play(['Create(target)', 'Write(target_eq)'], 1.8);
    s.wait(0.8);
    if (series.radius < Infinity) {
      s.line(
        `band = Rectangle(width=${ax.axes}.c2p(1, 0)[0] - ${ax.axes}.c2p(-1, 0)[0], height=${ax.axes}.c2p(0, ${num(yr.max)})[1] - ${ax.axes}.c2p(0, ${num(yr.min)})[1], stroke_width=0).set_fill(GREEN, 0.08).move_to(${ax.axes}.c2p(0, ${num((yr.max + yr.min) / 2)}))`
      );
    }
    const [first, ...rest] = shownDegrees;
    s.caption(t.first);
    s.line(`current = p_${first}.copy()`, `current_eq = eq_${first}.copy()`);
    s.play(['Create(current)', 'Write(current_eq)'], 1.4);
    s.wait(1.2);
    s.caption(t.more);
    rest.forEach((degree, i) => {
      if (i === rest.length - 1) s.caption(t.degree(degree));
      s.play(
        [
          `Transform(current, p_${degree}.copy())`,
          `Transform(current_eq, eq_${degree}.copy())`,
        ],
        1.6
      );
      s.wait(i === rest.length - 1 ? 1.6 : 0.9);
    });
    if (series.radius < Infinity) {
      s.caption(t.radius);
      s.play('FadeIn(band)', 1);
      s.wait(2.4);
    } else {
      s.caption(t.everywhere);
      s.wait(2);
    }
    s.outro(series.general, t.takeaway);
    const at = series.radius < Infinity ? 0.5 : 1;
    return {
      title: t.title(series.label),
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        {
          label: `P${maxDegree}(${at})`,
          value: latexNumber(Number(poly(maxDegree)(at).toFixed(6))),
        },
        {
          label: `f(${at})`,
          value: latexNumber(Number(series.fn(at).toFixed(6))),
        },
        {
          label: context.locale === 'zh' ? '收敛半径' : 'Radius of convergence',
          value: series.radius === Infinity ? '∞' : String(series.radius),
        },
      ],
      beats: t.beats,
    };
  },
};
