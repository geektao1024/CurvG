import { ManimScript, num } from '../manim';
import { curve } from '../preview';
import type { VideoTemplate } from '../types';

interface Wave {
  label: { en: string; zh: string };
  /** The target wave, NumPy. */
  py: string;
  /** k-th harmonic coefficient of sin(kx) (0 when absent). */
  b: (k: number) => number;
  series: string;
  y: [number, number];
  gibbs: boolean;
}

const WAVES: Record<string, Wave> = {
  square: {
    label: { en: 'square wave', zh: '方波' },
    py: 'np.sign(np.sin(x))',
    b: (k) => (k % 2 === 1 ? 4 / (Math.PI * k) : 0),
    series: 'f(x) = \\frac{4}{\\pi} \\sum_{k \\text{ odd}} \\frac{\\sin kx}{k}',
    y: [-1.5, 1.5],
    gibbs: true,
  },
  sawtooth: {
    label: { en: 'sawtooth wave', zh: '锯齿波' },
    py: 'np.mod(x + np.pi, 2 * np.pi) - np.pi',
    b: (k) => (2 * (k % 2 === 1 ? 1 : -1)) / k,
    series: 'f(x) = 2 \\sum_{k=1}^{\\infty} \\frac{(-1)^{k+1} \\sin kx}{k}',
    y: [-4, 4],
    gibbs: true,
  },
  triangle: {
    label: { en: 'triangle wave', zh: '三角波' },
    py: '(2 / np.pi) * np.arcsin(np.sin(x))',
    b: (k) =>
      k % 2 === 1
        ? ((((k - 1) / 2) % 2 === 0 ? 1 : -1) * 8) / (Math.PI * Math.PI * k * k)
        : 0,
    series:
      'f(x) = \\frac{8}{\\pi^2} \\sum_{k \\text{ odd}} \\frac{(-1)^{(k-1)/2} \\sin kx}{k^2}',
    y: [-1.5, 1.5],
    gibbs: false,
  },
};

const copy = {
  en: {
    title: (w: string) => `Building a ${w} from sine waves`,
    subtitle: 'A Fourier series, one harmonic at a time',
    target: (w: string) => `The target: a ${w}, with sharp corners.`,
    first: 'Start with a single sine wave of the same period.',
    add: 'Add the next harmonic: a faster, smaller sine wave.',
    many: (n: number) => `With ${n} harmonics the sum traces the wave closely.`,
    gibbs:
      'Near each jump the sum overshoots by about 9%, however many terms: the Gibbs phenomenon.',
    smooth:
      'The corners are gentle, so the terms shrink fast and the fit is quick.',
    takeaway: 'Any periodic shape is a sum of sine waves',
    beats: ['The target wave', 'One sine', 'More harmonics', 'The limit'],
    harmonics: 'harmonics',
  },
  zh: {
    title: (w: string) => `用正弦波拼出${w}`,
    subtitle: '傅里叶级数：一次加一个谐波',
    target: (w: string) => `目标：带尖角的${w}。`,
    first: '先用一个同周期的正弦波。',
    add: '再加下一个谐波：频率更高、振幅更小的正弦波。',
    many: (n: number) => `加到 ${n} 个谐波，和已经紧贴波形。`,
    gibbs: '在跳跃处，无论加多少项都会超出约 9%：这就是吉布斯现象。',
    smooth: '尖角比较平缓，各项衰减很快，逼近也很快。',
    takeaway: '任何周期形状，都可以由正弦波叠加而成',
    beats: ['目标波形', '一个正弦波', '更多谐波', '极限'],
    harmonics: '个谐波',
  },
};

export const fourierSeries: VideoTemplate = {
  id: 'fourier-series',
  version: 1,
  category: 'series',
  title: { en: 'Fourier series of a periodic wave', zh: '傅里叶级数' },
  summary: {
    en: 'Partial sums of sine harmonics build a square, sawtooth or triangle wave; the Gibbs overshoot shows at the jumps.',
    zh: '正弦谐波的部分和逐步拼出方波、锯齿波或三角波，并展示跳跃处的吉布斯现象。',
  },
  matchHint:
    'Fourier series, building a square/sawtooth/triangle wave from sines, harmonics, partial sums, Gibbs phenomenon. Not: Fourier transform of signals, epicycles drawing pictures (that is a wonder), Taylor series.',
  examples: [
    {
      prompt: 'How do sine waves add up to a square wave?',
      params: { wave: 'square', terms: 15 },
    },
    { prompt: '傅里叶级数逼近锯齿波', params: { wave: 'sawtooth', terms: 12 } },
  ],
  params: [
    {
      key: 'wave',
      type: 'choice',
      default: 'square',
      label: { en: 'Wave', zh: '波形' },
      options: Object.entries(WAVES).map(([value, wave]) => ({
        value,
        label: wave.label,
      })),
    },
    {
      key: 'terms',
      type: 'number',
      default: 15,
      min: 3,
      max: 30,
      integer: true,
      label: { en: 'Harmonics at the end', zh: '最终谐波数' },
    },
  ],
  preview(params) {
    const wave = WAVES[String(params.wave)] ?? WAVES.square;
    const terms = Number(params.terms);
    const harmonics: number[] = [];
    for (let k = 1; harmonics.length < terms && k < 200; k += 1)
      if (wave.b(k) !== 0) harmonics.push(k);
    const sum = (x: number) =>
      harmonics.reduce((total, k) => total + wave.b(k) * Math.sin(k * x), 0);
    const target =
      String(params.wave) === 'sawtooth'
        ? (x: number) =>
            ((((x + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) -
            Math.PI
        : String(params.wave) === 'triangle'
          ? (x: number) => (2 / Math.PI) * Math.asin(Math.sin(x))
          : (x: number) => Math.sign(Math.sin(x));
    const end = 3 * Math.PI;
    const window = { min: wave.y[0], max: wave.y[1] };
    return {
      x: [-end, end],
      y: [wave.y[0], wave.y[1]],
      shapes: [
        ...curve(target, -end, end, window, 'amber', {
          width: 3,
          samples: 600,
        }),
        ...curve(sum, -end, end, window, 'blue', { width: 2, samples: 600 }),
      ],
    };
  },
  build(params, context) {
    const t = copy[context.locale];
    const wave = WAVES[String(params.wave)] ?? WAVES.square;
    const terms = Number(params.terms);
    const s = new ManimScript(context);
    const harmonics: number[] = [];
    for (let k = 1; harmonics.length < terms && k < 200; k += 1)
      if (wave.b(k) !== 0) harmonics.push(k);
    const partial = (count: number) =>
      harmonics
        .slice(0, count)
        .map(
          (k) =>
            `(${num(Number(wave.b(k).toPrecision(12)))}) * np.sin(${k} * x)`
        )
        .join(' + ');
    const steps = [1, 2, 3, Math.min(6, terms), terms].filter(
      (count, i, list) => count <= terms && list.indexOf(count) === i
    );
    const end = 2 * Math.PI * 1.5;
    s.module('def target(x):', `    return ${wave.py}`);
    s.intro(t.title(wave.label[context.locale]), t.subtitle);
    const ax = s.axes({
      name: 'axes',
      x: { min: -end, max: end, step: Math.PI },
      y: { min: wave.y[0], max: wave.y[1], step: wave.y[1] > 2 ? 2 : 0.5 },
      xTicks: [-2, -1, 1, 2].map((m) => ({
        value: m * Math.PI,
        latex: `${m < 0 ? '-' : ''}${Math.abs(m) === 1 ? '' : Math.abs(m)}\\pi`,
      })),
    });
    // The target is discontinuous; plot it in pieces between the jumps.
    const jumps =
      String(params.wave) === 'triangle'
        ? []
        : String(params.wave) === 'square'
          ? [-3, -2, -1, 0, 1, 2, 3].map((m) => m * Math.PI)
          : [-3, -1, 1, 3].map((m) => m * Math.PI);
    const cuts = [-end, ...jumps.filter((x) => x > -end && x < end), end];
    s.line(
      `target_curve = VGroup(${cuts
        .slice(0, -1)
        .map(
          (x0, i) =>
            `${ax.axes}.plot(target, x_range=[${num(x0 + 1e-3)}, ${num(cuts[i + 1] - 1e-3)}, 0.01], color=AMBER, stroke_width=5)`
        )
        .join(', ')})`
    );
    steps.forEach((count) =>
      s.line(
        `sum_${count} = ${ax.axes}.plot(lambda x: ${partial(count)}, x_range=[${num(-end)}, ${num(end)}, 0.01], color=BLUE, stroke_width=4)`
      )
    );
    s.panelTex('series', wave.series, 0, { size: 36 });
    steps.forEach((count) =>
      s.panelMixed(
        `count_${count}`,
        `${count} ${context.locale === 'zh' ? t.harmonics : count === 1 ? 'harmonic' : t.harmonics}`,
        `S_{${count}}`,
        1.3,
        { color: 'BLUE' }
      )
    );

    s.caption(t.target(wave.label[context.locale]));
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play(['Create(target_curve)', 'Write(series)'], 2);
    s.wait(0.8);
    s.caption(t.first);
    s.line(
      `current = sum_${steps[0]}.copy()`,
      `current_count = count_${steps[0]}.copy()`
    );
    s.play(['Create(current)', 'FadeIn(current_count)'], 1.4);
    s.wait(1);
    steps.slice(1).forEach((count, i, rest) => {
      s.caption(i === rest.length - 1 ? t.many(count) : t.add);
      s.play(
        [
          `Transform(current, sum_${count}.copy())`,
          `Transform(current_count, count_${count}.copy())`,
        ],
        1.8
      );
      s.wait(i === rest.length - 1 ? 1.6 : 1);
    });
    s.caption(wave.gibbs ? t.gibbs : t.smooth);
    if (wave.gibbs) {
      s.line(
        `gibbs = Circle(radius=0.45, color=RED, stroke_width=4).move_to(${ax.axes}.c2p(${num(String(params.wave) === 'square' ? 0.18 : Math.PI - 0.25)}, ${num(String(params.wave) === 'square' ? 1.09 : 3.4)}))`
      );
      s.play('Create(gibbs)', 1);
    }
    s.wait(2.4);
    s.outro(wave.series, t.takeaway);
    return {
      title: t.title(wave.label[context.locale]),
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        {
          label: context.locale === 'zh' ? '最终谐波' : 'Harmonics',
          value: String(terms),
        },
        {
          label: context.locale === 'zh' ? '最高频率' : 'Highest frequency',
          value: `${harmonics[harmonics.length - 1]}x`,
        },
      ],
      beats: t.beats,
    };
  },
};
