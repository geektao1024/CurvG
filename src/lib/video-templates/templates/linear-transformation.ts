import { latexNumber } from '../expr';
import { ManimScript, num } from '../manim';
import type {
  TemplateParamValues,
  TemplatePreview,
  VideoTemplate,
} from '../types';

const copy = {
  en: {
    title: 'A matrix moves the whole plane',
    subtitle: 'Follow î, ĵ and the unit square',
    grid: 'The plane with its basis vectors î and ĵ, and the unit square they span.',
    columns: 'The columns of the matrix say where î and ĵ land.',
    apply:
      'Apply the matrix: every grid line stays straight and evenly spaced.',
    det: (d: string) =>
      `The unit square becomes a parallelogram of area |det| = ${d}.`,
    flip: 'The determinant is negative: the plane has been flipped over.',
    flat: 'The determinant is 0: the plane collapses onto a line.',
    takeaway: 'The determinant is the factor by which areas scale',
    beats: [
      'The plane',
      'The columns',
      'The transformation',
      'The determinant',
    ],
  },
  zh: {
    title: '矩阵如何变换整个平面',
    subtitle: '盯住 î、ĵ 和单位正方形',
    grid: '平面、基向量 î 和 ĵ，以及它们张成的单位正方形。',
    columns: '矩阵的两列，就是 î 和 ĵ 变换后的位置。',
    apply: '作用这个矩阵：网格线依旧笔直、等距。',
    det: (d: string) => `单位正方形变成面积为 |det| = ${d} 的平行四边形。`,
    flip: '行列式为负：平面被翻转了。',
    flat: '行列式为 0：整个平面被压成一条直线。',
    takeaway: '行列式就是面积的缩放倍数',
    beats: ['平面', '矩阵的列', '变换', '行列式'],
  },
};

function analyse(params: TemplateParamValues) {
  const m = [
    Number(params.a),
    Number(params.b),
    Number(params.c),
    Number(params.d),
  ];
  if (m.every((value) => value === 0))
    throw new Error('The zero matrix sends everything to the origin');
  return { m, det: m[0] * m[3] - m[1] * m[2] };
}

export const linearTransformation: VideoTemplate = {
  id: 'linear-transformation',
  version: 1,
  category: 'linear-algebra',
  title: {
    en: '2×2 matrix as a linear transformation',
    zh: '2×2 矩阵与线性变换',
  },
  summary: {
    en: 'The grid, î, ĵ and the unit square move under a 2×2 matrix; the determinant appears as the new area (and orientation).',
    zh: '网格、î、ĵ 和单位正方形在 2×2 矩阵作用下变换，行列式就是新面积（及方向）。',
  },
  matchHint:
    'Linear transformations of the plane, what a 2x2 matrix does geometrically, basis vectors i-hat j-hat, determinant as area scaling, shear, rotation, reflection, projection matrices. Not: matrix multiplication arithmetic drills, eigenvalue computations, 3D.',
  examples: [
    {
      prompt: 'What does the matrix [[1,1],[0,1]] do to the plane?',
      params: { a: 1, b: 1, c: 0, d: 1 },
    },
    {
      prompt: '用动画说明行列式的几何意义',
      params: { a: 2, b: 1, c: 1, d: 1.5 },
    },
    {
      prompt: 'rotation by 90 degrees matrix',
      params: { a: 0, b: -1, c: 1, d: 0 },
    },
  ],
  params: [
    {
      key: 'a',
      type: 'number',
      default: 2,
      min: -3,
      max: 3,
      label: { en: 'a (row 1, col 1)', zh: 'a（第 1 行第 1 列）' },
    },
    {
      key: 'b',
      type: 'number',
      default: 1,
      min: -3,
      max: 3,
      label: { en: 'b (row 1, col 2)', zh: 'b（第 1 行第 2 列）' },
    },
    {
      key: 'c',
      type: 'number',
      default: 0.5,
      min: -3,
      max: 3,
      label: { en: 'c (row 2, col 1)', zh: 'c（第 2 行第 1 列）' },
    },
    {
      key: 'd',
      type: 'number',
      default: 1.5,
      min: -3,
      max: 3,
      label: { en: 'd (row 2, col 2)', zh: 'd（第 2 行第 2 列）' },
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
  preview(params) {
    const { m } = analyse(params);
    const [a, b, c, d] = m;
    const apply = (x: number, y: number): [number, number] => [
      a * x + b * y,
      c * x + d * y,
    ];
    const shapes: TemplatePreview['shapes'] = [];
    for (let i = -4; i <= 4; i += 1) {
      shapes.push({
        kind: 'line',
        points: [apply(i, -4), apply(i, 4)],
        tone: 'muted',
      });
      shapes.push({
        kind: 'line',
        points: [apply(-4, i), apply(4, i)],
        tone: 'muted',
      });
    }
    shapes.push(
      {
        kind: 'area',
        points: [apply(0, 0), apply(1, 0), apply(1, 1), apply(0, 1)],
        tone: 'amber',
        opacity: 0.45,
      },
      { kind: 'arrow', from: [0, 0], to: apply(1, 0), tone: 'green' },
      { kind: 'arrow', from: [0, 0], to: apply(0, 1), tone: 'red' }
    );
    return { x: [-4.5, 4.5], y: [-3, 3], equal: true, shapes };
  },
  build(params, context) {
    const t = copy[context.locale];
    const { m, det } = analyse(params);
    const [a, b, c, d] = m;
    const s = new ManimScript(context);
    const landscape = s.landscape;
    // The plane fills the frame; the panel floats on a card above it.
    const unit = landscape ? 0.62 : 0.66;
    const center = landscape ? [1.6, -0.3] : [0, -0.6];
    const matrixTex = `A = \\begin{bmatrix} ${latexNumber(a)} & ${latexNumber(b)} \\\\ ${latexNumber(c)} & ${latexNumber(d)} \\end{bmatrix}`;
    s.intro(t.title, t.subtitle);
    s.line(
      `plane = NumberPlane(x_range=[-14, 14, 1], y_range=[-14, 14, 1], x_length=${num(28 * unit)}, y_length=${num(28 * unit)}, background_line_style={"stroke_color": AXIS, "stroke_width": 1.5, "stroke_opacity": 0.55}, axis_config={"stroke_color": MUTED, "stroke_width": 2}).move_to([${num(center[0])}, ${num(center[1])}, 0])`,
      `ghost = NumberPlane(x_range=[-14, 14, 1], y_range=[-14, 14, 1], x_length=${num(28 * unit)}, y_length=${num(28 * unit)}, background_line_style={"stroke_color": GRID, "stroke_width": 1, "stroke_opacity": 1}, axis_config={"stroke_color": GRID, "stroke_width": 1}).move_to([${num(center[0])}, ${num(center[1])}, 0])`,
      'O = plane.c2p(0, 0)',
      'square = Polygon(plane.c2p(0, 0), plane.c2p(1, 0), plane.c2p(1, 1), plane.c2p(0, 1), stroke_width=0).set_fill(AMBER, 0.45)',
      'i_hat = Arrow(O, plane.c2p(1, 0), buff=0, color=GREEN, stroke_width=7, max_tip_length_to_length_ratio=0.25)',
      'j_hat = Arrow(O, plane.c2p(0, 1), buff=0, color=RED, stroke_width=7, max_tip_length_to_length_ratio=0.25)',
      `i_label = ${s.tex('\\hat{\\imath}', { size: 40, color: 'GREEN' })}.next_to(plane.c2p(1, 0), DOWN, buff=0.12)`,
      `j_label = ${s.tex('\\hat{\\jmath}', { size: 40, color: 'RED' })}.next_to(plane.c2p(0, 1), LEFT, buff=0.12)`,
      `i_new = Arrow(O, plane.c2p(${num(a)}, ${num(c)}), buff=0, color=GREEN, stroke_width=7, max_tip_length_to_length_ratio=0.25)`,
      `j_new = Arrow(O, plane.c2p(${num(b)}, ${num(d)}), buff=0, color=RED, stroke_width=7, max_tip_length_to_length_ratio=0.25)`,
      `i_new_label = ${s.tex(`(${latexNumber(a)},\\ ${latexNumber(c)})`, { size: 32, color: 'GREEN' })}.next_to(plane.c2p(${num(a)}, ${num(c)}), DR, buff=0.08)`,
      `j_new_label = ${s.tex(`(${latexNumber(b)},\\ ${latexNumber(d)})`, { size: 32, color: 'RED' })}.next_to(plane.c2p(${num(b)}, ${num(d)}), UL, buff=0.08)`,
      `matrix = ${s.tex(matrixTex, { size: landscape ? 44 : 46 })}`,
      `det_tex = ${s.tex(`\\det A = ${latexNumber(a)} \\cdot ${latexNumber(d)} - ${latexNumber(b)} \\cdot ${latexNumber(c)} = ${latexNumber(Number(det.toFixed(6)))}`, { size: landscape ? 34 : 38, color: det < 0 ? 'RED' : 'AMBER' })}`,
      landscape
        ? 'card_items = VGroup(matrix, det_tex).arrange(DOWN, buff=0.45, aligned_edge=LEFT).move_to([-4.5, 1.2, 0])'
        : 'card_items = VGroup(matrix, det_tex).arrange(DOWN, buff=0.35).move_to([0, 4.7, 0])',
      'card = SurroundingRectangle(card_items, buff=0.3, corner_radius=0.15, stroke_color=GRID, stroke_width=1).set_fill(PANEL, 0.94)',
      'card.set_z_index(5)',
      'card_items.set_z_index(6)'
    );
    s.caption(t.grid);
    s.play(['FadeIn(ghost)', 'Create(plane)'], 1.6);
    s.play(
      [
        'FadeIn(square)',
        'GrowArrow(i_hat)',
        'GrowArrow(j_hat)',
        'FadeIn(i_label)',
        'FadeIn(j_label)',
      ],
      1.2
    );
    s.wait(1);
    s.caption(t.columns);
    s.play(['FadeIn(card)', 'Write(matrix)'], 1.4);
    s.wait(1.6);
    s.caption(t.apply);
    s.play(['FadeOut(i_label)', 'FadeOut(j_label)'], 0.5);
    s.play(
      [
        `ApplyMatrix([[${num(a)}, ${num(b)}], [${num(c)}, ${num(d)}]], plane, about_point=O)`,
        `ApplyMatrix([[${num(a)}, ${num(b)}], [${num(c)}, ${num(d)}]], square, about_point=O)`,
        'Transform(i_hat, i_new)',
        'Transform(j_hat, j_new)',
      ],
      3
    );
    s.play(['FadeIn(i_new_label)', 'FadeIn(j_new_label)'], 0.8);
    s.wait(1.2);
    s.caption(
      Math.abs(det) < 1e-9
        ? t.flat
        : det < 0
          ? t.flip
          : t.det(latexNumber(Number(Math.abs(det).toFixed(4))))
    );
    s.play(['Write(det_tex)', 'Indicate(square, color=AMBER)'], 1.4);
    if (det < 0 && Math.abs(det) > 1e-9) {
      s.wait(1.4);
      s.caption(t.det(latexNumber(Number(Math.abs(det).toFixed(4)))));
    }
    s.wait(2.2);
    s.outro(`\\text{area}' = |\\det A| \\cdot \\text{area}`, t.takeaway);
    return {
      title: t.title,
      summary: this.summary[context.locale],
      durationSeconds: s.elapsed,
      code: s.toPython(),
      facts: [
        { label: 'det A', value: latexNumber(Number(det.toFixed(6))) },
        { label: 'Aî', value: `(${a}, ${c})` },
        { label: 'Aĵ', value: `(${b}, ${d})` },
      ],
      beats: t.beats,
    };
  },
};
