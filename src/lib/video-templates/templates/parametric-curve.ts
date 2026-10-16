import { checkExpression, fn1, toLatex, toNumpy, toPlain } from '../expr';
import { ManimScript, niceRange, num } from '../manim';
import type { TemplateParamValues, VideoTemplate } from '../types';

const copy = {
  en: {
    title: 'Tracing a parametric curve',
    subtitle: 'x and y both follow one parameter t',
    setup: 'Each value of t gives one point (x(t), y(t)).',
    trace: (t0: string, t1: string) =>
      `Let t run from ${t0} to ${t1}: the point draws the curve.`,
    done: 'The finished path: one parameter, two coordinates.',
    takeaway: 'A parametric curve is the path of a moving point',
    beats: ['The equations', 'The moving point', 'The trace', 'The curve'],
  },
  zh: {
    title: '参数曲线的描绘',
    subtitle: 'x 和 y 都由同一个参数 t 决定',
    setup: '每个 t 对应一个点 (x(t), y(t))。',
    trace: (t0: string, t1: string) =>
      `让 t 从 ${t0} 走到 ${t1}：这个点画出整条曲线。`,
    done: '完整的轨迹：一个参数，两个坐标。',
    takeaway: '参数曲线就是动点走过的路径',
    beats: ['参数方程', '动点', '描迹', '完整曲线'],
  },
};

function analyse(params: TemplateParamValues) {
  const xs = checkExpression(String(params.x), ['t']);
  const ys = checkExpression(String(params.y), ['t']);
  if (!xs.ok) throw new Error(`x(t): ${xs.error}`);
  if (!ys.ok) throw new Error(`y(t): ${ys.error}`);
  const t0 = Number(params.t0);
  const t1 = Number(params.t1);
  if (!(t1 > t0)) throw new Error('t must run forward: t1 > t0');
  const X = fn1(xs.source, 't');
  const Y = fn1(ys.source, 't');
  let xmin = Infinity;
  let xmax = -Infinity;
  let ymin = Infinity;
  let ymax = -Infinity;
  for (let i = 0; i <= 1000; i += 1) {
    const t = t0 + ((t1 - t0) * i) / 1000;
    const x = X(t);
    const y = Y(t);
    if (!Number.isFinite(x) || !Number.isFinite(y))
      throw new Error(`The curve is undefined at t = ${t.toFixed(3)}`);
    xmin = Math.min(xmin, x);
    xmax = Math.max(xmax, x);
    ymin = Math.min(ymin, y);
    ymax = Math.max(ymax, y);
  }
  if (Math.max(xmax - xmin, ymax - ymin) > 1e4)
    throw new Error('The curve is too large to draw');
  return {
    x: xs.source,
    y: ys.source,
    t0,
    t1,
    X,
    Y,
    bounds: { xmin, xmax, ymin, ymax },
  };
}

const tText = (value: number) => {
  const ratio = value / Math.PI;
  if (Math.abs(ratio - Math.round(ratio)) < 1e-6 && Math.round(ratio) !== 0) {
    const m = Math.round(ratio);
    return `${m === 1 ? '' : m === -1 ? '-' : m}π`;
  }
  return String(Number(value.toFixed(3)));
};

export const parametricCurve: VideoTemplate = {
  id: 'parametric-curve',
  version: 1,
  category: 'curves',
  title: { en: 'Parametric curve', zh: '参数曲线' },
  summary: {
    en: 'A point at (x(t), y(t)) moves as t runs and leaves the curve behind it: cycloids, Lissajous figures, hearts, spirals.',
    zh: '点 (x(t), y(t)) 随 t 运动并留下轨迹：摆线、李萨如图形、心形线、螺线。',
  },
  matchHint:
    'Parametric equations x = x(t), y = y(t); cycloid, Lissajous curve, astroid, heart curve, epicycloid, any named curve given parametrically, motion of a point along a path. Not: polar curves r(θ) (use polar-curve), graphs y = f(x).',
  examples: [
    {
      prompt: 'Lissajous figure x = sin 3t, y = sin 2t',
      params: { x: 'sin(3*t)', y: 'sin(2*t)', t0: 0, t1: 6.283185 },
    },
    {
      prompt: '画一条摆线',
      params: { x: 't - sin(t)', y: '1 - cos(t)', t0: 0, t1: 12.566371 },
    },
    {
      prompt: 'heart curve',
      params: {
        x: '16*sin(t)^3',
        y: '13*cos(t) - 5*cos(2*t) - 2*cos(3*t) - cos(4*t)',
        t0: 0,
        t1: 6.283185,
      },
    },
  ],
  params: [
    {
      key: 'x',
      type: 'expression',
      variables: ['t'],
      default: 'sin(3*t)',
      label: { en: 'x(t)', zh: 'x(t)' },
    },
    {
      key: 'y',
      type: 'expression',
      variables: ['t'],
      default: 'sin(2*t)',
      label: { en: 'y(t)', zh: 'y(t)' },
    },
    {
      key: 't0',
      type: 'number',
      default: 0,
      min: -100,
      max: 100,
      label: { en: 't from', zh: 't 起点' },
    },
    {
      key: 't1',
      type: 'number',
      default: 6.283185,
      min: -100,
      max: 100,
      label: { en: 't to', zh: 't 终点' },
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
    const { x, y, t0, t1, bounds } = analyse(params);
    const s = new ManimScript(context);
    const padX = (bounds.xmax - bounds.xmin || 1) * 0.12;
    const padY = (bounds.ymax - bounds.ymin || 1) * 0.12;
    const xr = niceRange(
      Math.min(bounds.xmin - padX, 0),
      Math.max(bounds.xmax + padX, 0)
    );
    const yr = niceRange(
      Math.min(bounds.ymin - padY, 0),
      Math.max(bounds.ymax + padY, 0)
    );
    s.define('X', 't', toNumpy(x, { t: 't' }));
    s.define('Y', 't', toNumpy(y, { t: 't' }));
    s.intro(text.title, text.subtitle);
    const ax = s.axes({ name: 'axes', x: xr, y: yr, equal: true });
    s.line(
      `path = ParametricFunction(lambda t: ${ax.axes}.c2p(X(t), Y(t)), t_range=[${num(t0)}, ${num(t1)}, ${num((t1 - t0) / 600)}], color=AMBER, stroke_width=5)`,
      `tt = ValueTracker(${num(t0)})`,
      `P = always_redraw(lambda: Dot(${ax.axes}.c2p(X(tt.get_value()), Y(tt.get_value())), radius=0.09, color=BLUE))`,
      `arm = always_redraw(lambda: DashedLine(${ax.axes}.c2p(0, 0), P.get_center(), color=MUTED, stroke_width=2, dash_length=0.08))`,
      'trail = TracedPath(P.get_center, stroke_color=AMBER, stroke_width=5)'
    );
    s.panelTex('eq_x', `x(t) = ${toLatex(x)}`, 0, { size: 38 });
    s.panelTex('eq_y', `y(t) = ${toLatex(y)}`, 0.9, { size: 38 });
    const read = s.readout('t_value', 't =', 'tt.get_value()', 2.1, {
      color: 'BLUE',
      decimals: 2,
    });
    s.caption(text.setup);
    s.play(
      [`FadeIn(${ax.grid})`, `Create(${ax.axes})`, `FadeIn(${ax.labels})`],
      1.2
    );
    s.play(['Write(eq_x)', 'Write(eq_y)'], 1.4);
    s.play(
      [
        'FadeIn(P, scale=0.5)',
        'FadeIn(arm)',
        `FadeIn(${read.label})`,
        `FadeIn(${read.value})`,
      ],
      1
    );
    s.wait(1);
    s.caption(text.trace(tText(t0), tText(t1)));
    s.line('self.add(trail)');
    s.play(`tt.animate.set_value(${num(t1)})`, 9, 'linear');
    s.wait(0.6);
    s.caption(text.done);
    s.play(['FadeIn(path)', 'FadeOut(trail)', 'FadeOut(arm)'], 1);
    s.wait(2.2);
    s.outro(
      `\\big(x(t),\\ y(t)\\big) = \\big(${toLatex(x)},\\ ${toLatex(y)}\\big)`,
      text.takeaway
    );
    return {
      title: `${text.title} · (${toPlain(x)}, ${toPlain(y)})`,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        {
          label: 'x',
          value: `[${bounds.xmin.toFixed(3)}, ${bounds.xmax.toFixed(3)}]`,
        },
        {
          label: 'y',
          value: `[${bounds.ymin.toFixed(3)}, ${bounds.ymax.toFixed(3)}]`,
        },
      ],
      beats: text.beats,
    };
  },
};
