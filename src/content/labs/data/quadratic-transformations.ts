import { pick, type Lab } from '../types';

export const quadraticTransformations: Lab = {
  slug: 'quadratic-transformations',
  publication: 'public',
  primaryCategoryId: 'maps-graphs',
  levels: ['middle', 'high'],
  chapterTitle: { en: 'Transformations', zh: '图像变换' },
  title: {
    en: 'Vertex form: how a, h and k move a parabola',
    zh: '顶点式：a、h、k 怎样移动抛物线',
  },
  question: {
    en: 'What do a, h and k each do to y = a(x − h)² + k?',
    zh: 'y = a(x − h)² + k 里的 a、h、k 各自起什么作用？',
  },
  summary: {
    en: 'Stretch, flip and slide the parabola y = x² with three sliders. See where the vertex goes, why x − 2 moves the graph right, and when the roots appear.',
    zh: '用三个滑块拉伸、翻转、平移抛物线 y = x²。看顶点去了哪里，为什么 x − 2 是向右移，以及什么时候出现零点。',
  },
  keyPoints: [
    { en: 'Vertex form', zh: '顶点式' },
    { en: 'Translations', zh: '图像平移' },
    { en: 'Axis of symmetry', zh: '对称轴' },
    { en: 'Roots and discriminant', zh: '零点与判别式' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-6, 6], y: [-6, 6] },
      params: [
        {
          id: 'a',
          label: 'a',
          min: -3,
          max: 3,
          step: 0.1,
          value: 1,
          bands: [
            { from: -3, to: -0.1, label: t('opens down', '开口向下'), color: 'blue' },
            { from: 0.1, to: 3, label: t('opens up', '开口向上'), color: 'primary' },
          ],
        },
        { id: 'h', label: 'h', min: -4, max: 4, step: 0.1, value: 0 },
        { id: 'k', label: 'k', min: -4, max: 4, step: 0.1, value: 0 },
      ],
      functions: [
        { id: 'p', expr: 'x^2' },
        { id: 'f', expr: 'a * (x - h)^2 + k' },
      ],
      scalars: [
        { id: 'flat', expr: 'abs(a) < 0.001' },
        // Roots exist when -k/a >= 0 (a ≠ 0)
        { id: 'q', expr: 'flat ? -1 : -k / a' },
        { id: 'r1', expr: 'q >= 0 ? h - sqrt(q) : 0 / 0' },
        { id: 'r2', expr: 'q >= 0 ? h + sqrt(q) : 0 / 0' },
        { id: 'hasRoots', expr: 'q >= 0' },
      ],
      objects: [
        { type: 'function', fn: 'p', color: 'muted', dashed: true, width: 1.5, label: 'y = x²' },
        {
          type: 'line',
          through: ['h', 0],
          to: ['h', 1],
          color: 'blue',
          dashed: true,
          width: 1.5,
          visible: '1 - flat',
        },
        { type: 'function', fn: 'f', color: 'primary', width: 2.8 },
        {
          type: 'point',
          at: ['h', 'k'],
          color: 'primary',
          size: 6,
          label: t('vertex ({h}, {k})', '顶点 ({h}, {k})'),
          drag: { x: 'h', y: 'k' },
        },
        { type: 'point', at: ['r1', 0], color: 'blue', size: 5, visible: 'hasRoots' },
        { type: 'point', at: ['r2', 0], color: 'blue', size: 5, visible: 'hasRoots' },
      ],
      readouts: [
        { label: 'a', expr: 'a', digits: 1 },
        { label: '\\text{vertex}\\ x', expr: 'h', digits: 1 },
        { label: '\\text{vertex}\\ y', expr: 'k', digits: 1 },
        { label: 'x_1', expr: 'r1', digits: 2 },
        { label: 'x_2', expr: 'r2', digits: 2 },
        {
          kind: 'status',
          label: t('Meets the x-axis', '与 x 轴的交点'),
          expr: 'hasRoots',
          ok: t('real roots', '有实根'),
          bad: t('no real roots', '没有实根'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'The parent graph', zh: '母函数' },
      body: {
        en: 'With $a=1$, $h=0$, $k=0$ the curve is $y=x^2$: vertex at the origin, opening up, one root at $x=0$.',
        zh: '$a=1$、$h=0$、$k=0$ 时就是 $y=x^2$：顶点在原点，开口向上，只有一个零点 $x=0$。',
      },
      set: { a: 1, h: 0, k: 0 },
    },
    {
      title: { en: 'a stretches and flips', zh: 'a 负责拉伸和翻转' },
      body: {
        en: 'At $a=2$ every height doubles, so the parabola looks narrower. At $a=-0.5$ heights are halved and flipped: it opens downward.',
        zh: '$a=2$ 时每个高度都翻倍，抛物线看起来更窄。$a=-0.5$ 时高度减半并翻转，开口朝下。',
      },
      set: { a: -0.5, h: 0, k: 0 },
    },
    {
      title: { en: 'h slides sideways, against its sign', zh: 'h 左右平移，方向与符号相反' },
      body: {
        en: 'Set $h=2$: the formula reads $(x-2)^2$ and the vertex moves to $x=2$, to the **right**. The bracket is zero when $x=2$, which is where the vertex now sits.',
        zh: '令 $h=2$：式子变成 $(x-2)^2$，顶点移到 $x=2$，是向**右**移。括号在 $x=2$ 时等于零，顶点就在那里。',
      },
      set: { a: 1, h: 2, k: 0 },
    },
    {
      title: { en: 'k lifts, and roots appear', zh: 'k 上下平移，零点随之出现' },
      body: {
        en: 'Now $k=-3$ drops the vertex to $(2,-3)$ and the curve crosses the $x$-axis twice, at $x=2\\pm\\sqrt3$. Raise $k$ above $0$ and the roots disappear.',
        zh: '再令 $k=-3$，顶点降到 $(2,-3)$，曲线两次穿过 $x$ 轴，零点是 $x=2\\pm\\sqrt3$。把 $k$ 调到 $0$ 以上，零点就消失了。',
      },
      set: { a: 1, h: 2, k: -3 },
    },
  ],
  sections: [
    {
      id: 'vertex-form',
      title: { en: 'Reading the vertex form', zh: '读懂顶点式' },
      body: {
        en: '$$y=a(x-h)^2+k$$\n\nThe square $(x-h)^2$ is never negative and is $0$ only at $x=h$. So the turning point, the **vertex**, is $(h,k)$, and the vertical line $x=h$ is the **axis of symmetry**.',
        zh: '$$y=a(x-h)^2+k$$\n\n平方项 $(x-h)^2$ 永不为负，只在 $x=h$ 时为 $0$。所以拐点也就是**顶点**是 $(h,k)$，竖直线 $x=h$ 是**对称轴**。',
      },
    },
    {
      id: 'a',
      title: { en: 'What a does', zh: 'a 的作用' },
      body: {
        en: '$a$ multiplies every height measured from the vertex. $|a|>1$ stretches the curve (narrower), $0<|a|<1$ squashes it (wider), and $a<0$ flips it so it opens downward. At $a=0$ the square vanishes and the graph is the flat line $y=k$.',
        zh: '$a$ 把从顶点量起的每个高度都乘上同一个倍数。$|a|>1$ 拉伸（变窄），$0<|a|<1$ 压扁（变宽），$a<0$ 翻转使开口向下。$a=0$ 时平方项消失，图像变成水平直线 $y=k$。',
      },
    },
    {
      id: 'shifts',
      title: { en: 'Why x − h moves right', zh: '为什么 x − h 是向右移' },
      body: {
        en: 'The new graph at $x$ copies the old graph at $x-h$. To reach the old vertex at $0$ you need $x-h=0$, that is $x=h$. So subtracting $h$ inside moves the graph **right** by $h$, while adding $k$ outside moves it **up** by $k$. Inside changes act on $x$ in the opposite direction; outside changes act on $y$ directly.',
        zh: '新图像在 $x$ 处的高度，抄的是旧图像在 $x-h$ 处的高度。要取到旧顶点 $0$，需要 $x-h=0$，即 $x=h$。所以在括号里减 $h$ 是把图像向**右**移 $h$，而在外面加 $k$ 是向**上**移 $k$。括号内的变化作用在 $x$ 上、方向相反；括号外的变化直接作用在 $y$ 上。',
      },
    },
    {
      id: 'roots',
      title: { en: 'Roots from the vertex form', zh: '用顶点式求零点' },
      body: {
        en: 'Set $y=0$: $(x-h)^2=-\\frac{k}{a}$. Real roots exist exactly when $-\\frac{k}{a}\\ge0$, that is when the vertex and the opening point to opposite sides of the $x$-axis:\n\n$$x=h\\pm\\sqrt{-\\frac{k}{a}}$$\n\nExpanding to $y=ax^2+bx+c$ gives $h=-\\frac{b}{2a}$, and the condition becomes the familiar discriminant test $b^2-4ac\\ge0$.',
        zh: '令 $y=0$：$(x-h)^2=-\\frac{k}{a}$。当且仅当 $-\\frac{k}{a}\\ge0$ 时有实数根，也就是顶点和开口分别在 $x$ 轴两侧：\n\n$$x=h\\pm\\sqrt{-\\frac{k}{a}}$$\n\n展开成 $y=ax^2+bx+c$ 后有 $h=-\\frac{b}{2a}$，这个条件就是熟悉的判别式 $b^2-4ac\\ge0$。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'What is the vertex of $y=3(x+1)^2-4$?',
        zh: '$y=3(x+1)^2-4$ 的顶点是？',
      },
      choices: [
        { en: '$(-1,-4)$', zh: '$(-1,-4)$' },
        { en: '$(1,-4)$', zh: '$(1,-4)$' },
        { en: '$(-1,4)$', zh: '$(-1,4)$' },
        { en: '$(3,-4)$', zh: '$(3,-4)$' },
      ],
      answer: 0,
      explanation: {
        en: '$x+1=x-(-1)$, so $h=-1$ and $k=-4$.',
        zh: '$x+1=x-(-1)$，所以 $h=-1$，$k=-4$。',
      },
    },
    {
      question: {
        en: 'How many real roots does $y=-2(x-3)^2-1$ have?',
        zh: '$y=-2(x-3)^2-1$ 有几个实数零点？',
      },
      choices: [
        { en: '$0$', zh: '$0$' },
        { en: '$1$', zh: '$1$' },
        { en: '$2$', zh: '$2$' },
        { en: 'Infinitely many', zh: '无数个' },
      ],
      answer: 0,
      explanation: {
        en: 'It opens downward from a vertex at height $-1$, already below the axis, so it never reaches it.',
        zh: '开口向下，顶点高度是 $-1$，已经在 $x$ 轴下方，永远碰不到 $x$ 轴。',
      },
    },
    {
      question: {
        en: 'Which transformation turns $y=x^2$ into $y=(x-5)^2$?',
        zh: '把 $y=x^2$ 变成 $y=(x-5)^2$ 是哪种变换？',
      },
      choices: [
        { en: 'Shift right by $5$', zh: '向右平移 $5$' },
        { en: 'Shift left by $5$', zh: '向左平移 $5$' },
        { en: 'Shift down by $5$', zh: '向下平移 $5$' },
        { en: 'Stretch by $5$', zh: '拉伸 $5$ 倍' },
      ],
      answer: 0,
      explanation: {
        en: 'The bracket is zero at $x=5$, so the vertex moves from $0$ to $5$.',
        zh: '括号在 $x=5$ 时为零，顶点从 $0$ 移到了 $5$。',
      },
    },
  ],
  resultTex: 'y = a(x - h)^2 + k',
  curveSlugs: ['parabola'],
  related: ['derivative-tangent-slope', 'conic-sections-eccentricity'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Show how the graph of y = a(x − h)² + k changes: stretch and flip with a, slide right with h = 2 (explaining the sign), drop with k = −3, and mark the vertex and the two roots 2 ± √3.',
    zh: '展示 y = a(x − h)² + k 的图像变化：用 a 拉伸和翻转，用 h = 2 向右平移（解释符号为什么相反），用 k = −3 向下平移，标出顶点和两个零点 2 ± √3。',
  },
};
