import { ManimScript, num } from '../manim';
import type { VideoTemplate } from '../types';

const copy = {
  en: {
    title: (fn: string) => `${fn} θ from the unit circle`,
    subtitle: (fn: string) =>
      `Turn a point around the circle and watch ${fn} θ draw itself`,
    circle:
      'A point P on the unit circle, at angle θ from the positive x-axis.',
    sin: 'Its height above the x-axis is sin θ.',
    cos: 'Its horizontal distance from the y-axis is cos θ.',
    turn: (fn: string) =>
      `As θ grows, P goes round and ${fn} θ is plotted against θ.`,
    full: (fn: string) => `One full turn is one period of ${fn}: 2π.`,
    takeaway: (fn: string) =>
      `${fn} θ is the ${fn === 'sin' ? 'height' : 'horizontal position'} of a point on the unit circle`,
    beats: ['Unit circle', 'The projection', 'One turn', 'The wave'],
  },
  zh: {
    title: (fn: string) => `从单位圆看 ${fn} θ`,
    subtitle: (fn: string) => `让点绕单位圆转一圈，看 ${fn} θ 自己画出来`,
    circle: '单位圆上的点 P，与 x 轴正方向的夹角为 θ。',
    sin: 'P 到 x 轴的高度就是 sin θ。',
    cos: 'P 到 y 轴的水平距离就是 cos θ。',
    turn: (fn: string) => `θ 增大，P 沿圆转动，${fn} θ 随 θ 画在右边。`,
    full: (fn: string) => `转一整圈，正好是 ${fn} 的一个周期：2π。`,
    takeaway: (fn: string) =>
      `${fn} θ 就是单位圆上一点的${fn === 'sin' ? '纵坐标' : '横坐标'}`,
    beats: ['单位圆', '投影', '转一圈', '波形'],
  },
};

const PI_TICKS = [
  { value: Math.PI / 2, latex: '\\frac{\\pi}{2}' },
  { value: Math.PI, latex: '\\pi' },
  { value: (3 * Math.PI) / 2, latex: '\\frac{3\\pi}{2}' },
  { value: 2 * Math.PI, latex: '2\\pi' },
  { value: (5 * Math.PI) / 2, latex: '\\frac{5\\pi}{2}' },
  { value: 3 * Math.PI, latex: '3\\pi' },
  { value: (7 * Math.PI) / 2, latex: '\\frac{7\\pi}{2}' },
  { value: 4 * Math.PI, latex: '4\\pi' },
];

export const unitCircleTrig: VideoTemplate = {
  id: 'unit-circle-trig',
  version: 1,
  category: 'trigonometry',
  title: { en: 'Sine and cosine from the unit circle', zh: '单位圆与三角函数' },
  summary: {
    en: 'A point turns around the unit circle; its height (sin) or horizontal position (cos) is traced against the angle into the wave.',
    zh: '点绕单位圆转动，它的纵坐标（sin）或横坐标（cos）随角度画成波形。',
  },
  matchHint:
    'Unit circle definition of sine or cosine, why the sine graph is a wave, radians and the period 2π, circular motion projected to a wave. Not: solving trig equations, trig identities proofs, triangles (SOHCAHTOA) word problems.',
  examples: [
    {
      prompt:
        '用动画解释为什么 sin 函数的图像是单位圆上一点的纵坐标随角度变化的轨迹。',
      params: { fn: 'sin', turns: 1 },
    },
    {
      prompt: 'Where does the cosine wave come from?',
      params: { fn: 'cos', turns: 1 },
    },
  ],
  params: [
    {
      key: 'fn',
      type: 'choice',
      default: 'sin',
      label: { en: 'Function', zh: '函数' },
      options: [
        { value: 'sin', label: { en: 'sin θ', zh: 'sin θ' } },
        { value: 'cos', label: { en: 'cos θ', zh: 'cos θ' } },
      ],
    },
    {
      key: 'turns',
      type: 'number',
      default: 1,
      min: 1,
      max: 2,
      integer: true,
      label: { en: 'Turns', zh: '圈数' },
    },
  ],
  build(params, context) {
    const t = copy[context.locale];
    const fn = String(params.fn) === 'cos' ? 'cos' : 'sin';
    const turns = Number(params.turns) === 2 ? 2 : 1;
    const s = new ManimScript(context);
    const end = 2 * Math.PI * turns;
    const portrait = !s.landscape;

    s.intro(t.title(fn), t.subtitle(fn));
    // The circle and the graph share one vertical unit, so the height of P
    // and the height of the wave line up across the frame.
    const unit = portrait ? 1.55 : 1.45;
    const circleBox = portrait
      ? { x: 0, y: 2.4, width: unit * 2.8, height: unit * 2.8 }
      : { x: -4.35, y: -0.2, width: unit * 2.8, height: unit * 2.8 };
    const graphWidth = portrait ? 8.1 : 7.4;
    const graphBox = portrait
      ? { x: 0, y: -2.6, width: graphWidth, height: unit * 2.8 }
      : { x: 2.75, y: -0.2, width: graphWidth, height: unit * 2.8 };
    const circle = s.axes({
      name: 'cax',
      x: { min: -1.4, max: 1.4, step: 1 },
      y: { min: -1.4, max: 1.4, step: 1 },
      box: circleBox,
      grid: false,
      numbers: { x: false, y: false },
      xLabel: 'x',
      yLabel: 'y',
    });
    const graph = s.axes({
      name: 'gax',
      x: { min: 0, max: end, step: Math.PI / 2 },
      y: { min: -1.4, max: 1.4, step: 1 },
      box: graphBox,
      xTicks: PI_TICKS.filter((tick) => tick.value <= end + 1e-9),
      xLabel: '\\theta',
      yLabel: fn === 'sin' ? '\\sin\\theta' : '\\cos\\theta',
    });
    const px = 'np.cos(theta.get_value())';
    const py = 'np.sin(theta.get_value())';
    const value = fn === 'sin' ? py : px;
    s.line(
      `ring = Circle(radius=${num(unit)}, color=INK, stroke_width=3).move_to(cax.c2p(0, 0))`,
      'theta = ValueTracker(0.6)',
      `P = always_redraw(lambda: Dot(cax.c2p(${px}, ${py}), radius=0.09, color=AMBER))`,
      'radius = always_redraw(lambda: Line(cax.c2p(0, 0), P.get_center(), color=INK, stroke_width=3))',
      `angle = always_redraw(lambda: Arc(radius=0.38, start_angle=0, angle=max(0.02, np.mod(theta.get_value(), 2 * np.pi)), arc_center=cax.c2p(0, 0), color=MUTED, stroke_width=3))`,
      fn === 'sin'
        ? `proj = always_redraw(lambda: Line(cax.c2p(${px}, 0), P.get_center(), color=BLUE, stroke_width=6))`
        : `proj = always_redraw(lambda: Line(cax.c2p(0, ${py}), P.get_center(), color=BLUE, stroke_width=6))`
    );
    s.caption(t.circle);
    s.play(['Create(cax)', 'FadeIn(cax_labels)', 'Create(ring)'], 1.4);
    s.play(['FadeIn(P, scale=0.5)', 'Create(radius)', 'Create(angle)'], 1);
    s.wait(1);
    s.caption(t[fn]);
    s.play('Create(proj)', 1);
    s.wait(1.4);
    s.caption(t.turn(fn));
    s.play(['FadeIn(gax_grid)', 'Create(gax)', 'FadeIn(gax_labels)'], 1.2);
    s.play('theta.animate.set_value(0)', 0.8);
    // Built at θ = 0, so the trace starts exactly at the origin of the wave.
    s.line(
      `G = always_redraw(lambda: Dot(gax.c2p(theta.get_value(), ${value}), radius=0.08, color=BLUE))`,
      `bar = always_redraw(lambda: Line(gax.c2p(theta.get_value(), 0), G.get_center(), color=BLUE, stroke_width=6))`,
      fn === 'sin' && !portrait
        ? 'link = always_redraw(lambda: DashedLine(P.get_center(), G.get_center(), color=MUTED, stroke_width=2, dash_length=0.08))'
        : 'link = VGroup()',
      'wave = TracedPath(G.get_center, stroke_color=BLUE, stroke_width=5)',
      'self.add(wave)'
    );
    s.play(['FadeIn(G)', 'FadeIn(bar)', 'FadeIn(link)'], 0.6);
    s.play(`theta.animate.set_value(${num(end)})`, 7 * turns, 'linear');
    s.wait(0.6);
    s.line(
      `exact = gax.plot(lambda x: np.${fn}(x), x_range=[0, ${num(end)}, ${num(end / 240)}], color=BLUE, stroke_width=5)`,
      `eq = ${s.tex(`y = \\${fn}\\theta`, { size: 46, color: 'BLUE' })}`,
      portrait
        ? 'eq.next_to(gax, UP, buff=0.25)'
        : 'eq.next_to(gax, UP, buff=0.2).align_to(gax, RIGHT)'
    );
    s.caption(t.full(fn));
    s.play(['FadeIn(exact)', 'Write(eq)'], 1.2);
    s.wait(2.2);
    s.outro(
      `${fn === 'sin' ? 'y_P = \\sin\\theta' : 'x_P = \\cos\\theta'},\\quad P = (\\cos\\theta,\\ \\sin\\theta)`,
      t.takeaway(fn)
    );
    return {
      title: t.title(fn),
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        { label: context.locale === 'zh' ? '周期' : 'Period', value: '2π' },
        { label: context.locale === 'zh' ? '值域' : 'Range', value: '[-1, 1]' },
      ],
      beats: t.beats,
    };
  },
};
