import { checkExpression, fn1, toLatex, toNumpy, toPlain } from '../expr';
import { ManimScript, niceRange, num } from '../manim';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: 'Drawing a polar curve',
    subtitle: 'r depends on the angle θ',
    setup:
      'A ray turns through angle θ; the point sits at distance r(θ) along it.',
    trace: 'As θ grows, the point sweeps out the curve.',
    negative:
      'Where r is negative, the point lands on the opposite side of the origin.',
    done: 'The complete polar curve.',
    takeaway: 'In polar form, distance is a function of direction',
    beats: ['The equation', 'Ray and radius', 'The sweep', 'The curve'],
  },
  zh: {
    title: '极坐标曲线的描绘',
    subtitle: '半径 r 随角度 θ 变化',
    setup: '一条射线转过角度 θ，点在射线上距原点 r(θ) 处。',
    trace: 'θ 增大，点扫出整条曲线。',
    negative: 'r 为负时，点落在原点的另一侧。',
    done: '完整的极坐标曲线。',
    takeaway: '极坐标中，距离是方向的函数',
    beats: ['方程', '射线与半径', '扫描', '完整曲线'],
  },
};

function analyse(params: TemplateParamValues) {
  const check = checkExpression(String(params.r), ['theta']);
  if (!check.ok) throw new Error(`r(θ): ${check.error}`);
  const r = fn1(check.source, 'theta');
  const t0 = Number(params.t0);
  const t1 = Number(params.t1);
  if (!(t1 > t0)) throw new Error('θ must run forward');
  let reach = 0;
  let negative = false;
  for (let i = 0; i <= 1200; i += 1) {
    const value = r(t0 + ((t1 - t0) * i) / 1200);
    if (!Number.isFinite(value))
      throw new Error('r(θ) is undefined somewhere on the range');
    reach = Math.max(reach, Math.abs(value));
    if (value < -1e-9) negative = true;
  }
  if (reach === 0) throw new Error('r(θ) is zero everywhere');
  if (reach > 1e4) throw new Error('The curve is too large to draw');
  return { source: check.source, t0, t1, reach, negative };
}

export const polarCurve: VideoTemplate = {
  id: 'polar-curve',
  version: 1,
  category: 'curves',
  title: { en: 'Polar curve', zh: '极坐标曲线' },
  summary: {
    en: 'A ray turns through θ while the point sits at r(θ): roses, cardioids, limaçons, spirals drawn as they are defined.',
    zh: '射线转过 θ，点位于 r(θ) 处：玫瑰线、心脏线、蜗线、螺线按定义画出来。',
  },
  matchHint:
    'Polar coordinates, r = f(θ), rose curve r = cos(kθ), cardioid r = 1 + cos θ, limaçon, Archimedean or logarithmic spiral, lemniscate (as r² not supported; use r = sqrt(abs(cos(2θ)))). Not: parametric x(t), y(t) (use parametric-curve).',
  examples: [
    {
      prompt: 'Draw the cardioid r = 1 + cos θ',
      params: { r: '1 + cos(theta)', t0: 0, t1: 6.283185 },
    },
    {
      prompt: '四叶玫瑰线',
      params: { r: 'cos(2*theta)', t0: 0, t1: 6.283185 },
    },
    {
      prompt: 'Archimedean spiral',
      params: { r: '0.3*theta', t0: 0, t1: 18.849556 },
    },
  ],
  params: [
    {
      key: 'r',
      type: 'expression',
      variables: ['theta'],
      default: 'cos(3*theta)',
      label: { en: 'r(θ)', zh: 'r(θ)' },
      help: { en: 'Write θ as theta', zh: 'θ 写作 theta' },
    },
    {
      key: 't0',
      type: 'number',
      default: 0,
      min: -100,
      max: 100,
      label: { en: 'θ from', zh: 'θ 起点' },
    },
    {
      key: 't1',
      type: 'number',
      default: 3.141593,
      min: -100,
      max: 100,
      label: { en: 'θ to', zh: 'θ 终点' },
    },
  ],
  check(params) {
    try {
      analyse(params);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  },
  build(params, context) {
    const text = copy[context.locale];
    const { source, t0, t1, reach, negative } = analyse(params);
    const s = new ManimScript(context);
    const range = niceRange(-reach * 1.12, reach * 1.12);
    s.define('R', 'theta', toNumpy(source, { theta: 'theta' }));
    s.intro(text.title, text.subtitle);
    const ax = s.axes({
      name: 'axes',
      x: range,
      y: range,
      equal: true,
      xLabel: 'x',
      yLabel: 'y',
    });
    s.line(
      `path = ParametricFunction(lambda th: ${ax.axes}.c2p(R(th) * np.cos(th), R(th) * np.sin(th)), t_range=[${num(t0)}, ${num(t1)}, ${num((t1 - t0) / 900)}], color=AMBER, stroke_width=5)`,
      `th = ValueTracker(${num(t0)})`,
      `ray = always_redraw(lambda: Line(${ax.axes}.c2p(0, 0), ${ax.axes}.c2p(${num(reach * 1.08)} * np.cos(th.get_value()), ${num(reach * 1.08)} * np.sin(th.get_value())), color=GRID, stroke_width=3))`,
      `P = always_redraw(lambda: Dot(${ax.axes}.c2p(R(th.get_value()) * np.cos(th.get_value()), R(th.get_value()) * np.sin(th.get_value())), radius=0.09, color=BLUE))`,
      `arm = always_redraw(lambda: Line(${ax.axes}.c2p(0, 0), P.get_center(), color=BLUE, stroke_width=4))`,
      'trail = TracedPath(P.get_center, stroke_color=AMBER, stroke_width=5)'
    );
    s.panelTex(
      'eq',
      `r = ${toLatex(source).replace(/\\mathrm\{theta\}/g, '\\theta')}`,
      0
    );
    const angle = s.readout('th_value', '\\theta =', 'th.get_value()', 1.2, {
      color: 'MUTED',
      decimals: 2,
    });
    const radius = s.readout('r_value', 'r =', 'R(th.get_value())', 2.1, {
      color: 'BLUE',
      decimals: 2,
    });
    s.caption(text.setup);
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play('Write(eq)', 1.2);
    s.play(
      [
        'FadeIn(ray)',
        'FadeIn(arm)',
        'FadeIn(P, scale=0.5)',
        `FadeIn(${angle.label})`,
        `FadeIn(${angle.value})`,
        `FadeIn(${radius.label})`,
        `FadeIn(${radius.value})`,
      ],
      1
    );
    s.wait(1.2);
    s.caption(text.trace);
    s.line('self.add(trail)');
    const sweep = Math.min(12, Math.max(7, (t1 - t0) * 1.2));
    if (negative) {
      s.play(
        `th.animate.set_value(${num(t0 + (t1 - t0) / 2)})`,
        sweep / 2,
        'linear'
      );
      s.caption(text.negative);
      s.play(`th.animate.set_value(${num(t1)})`, sweep / 2, 'linear');
    } else {
      s.play(`th.animate.set_value(${num(t1)})`, sweep, 'linear');
    }
    s.wait(0.6);
    s.caption(text.done);
    s.play(
      ['FadeIn(path)', 'FadeOut(trail)', 'FadeOut(ray)', 'FadeOut(arm)'],
      1
    );
    s.wait(2.2);
    s.outro(
      `r = ${toLatex(source).replace(/\\mathrm\{theta\}/g, '\\theta')}`,
      text.takeaway
    );
    return {
      title: `${text.title} · r = ${toPlain(source)}`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        {
          label: context.locale === 'zh' ? '最大半径' : 'Max radius',
          value: reach.toFixed(4),
        },
      ],
      beats: text.beats,
    };
  },
};
