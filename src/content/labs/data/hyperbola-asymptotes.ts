import { pick, type Lab } from '../types';

export const hyperbolaAsymptotes: Lab = {
  slug: 'hyperbola-asymptotes',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Hyperbola', zh: '双曲线与渐近线' },
  title: {
    en: 'The hyperbola: a constant difference of distances, and its asymptotes',
    zh: '双曲线：距离之差为定值，以及它的渐近线',
  },
  question: {
    en: 'What stays constant on a hyperbola, and why do its branches hug the lines y = ±(b/a)x without touching them?',
    zh: '双曲线上什么量保持不变？它的两支为什么越来越贴近直线 y = ±(b/a)x，却永远碰不到？',
  },
  summary: {
    en: 'Drag a point along the right branch: |PF₁| − |PF₂| stays at 2a while the gap to the asymptote shrinks toward zero. The dashed rectangle with corners (±a, ±b) gives the asymptotes as its diagonals and c as its half-diagonal.',
    zh: '让点沿右支移动：|PF₁| − |PF₂| 始终等于 2a，而它与渐近线的距离越来越接近 0。顶点为 (±a, ±b) 的虚线矩形，两条对角线就是渐近线，半条对角线的长就是 c。',
  },
  keyPoints: [
    { en: 'Definition by two foci', zh: '双曲线的定义' },
    { en: 'Standard equation', zh: '标准方程' },
    { en: 'c² = a² + b²', zh: 'c² = a² + b²' },
    { en: 'Asymptotes', zh: '渐近线' },
    { en: 'Eccentricity e = c/a', zh: '离心率 e = c/a' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-8, 8], y: [-6, 6] },
      params: [
        { id: 'a', label: 'a', min: 1, max: 3, step: 0.1, value: 2 },
        { id: 'b', label: 'b', min: 0.5, max: 3, step: 0.1, value: 1.5 },
        { id: 'py', label: 'y_P', min: -5, max: 5, step: 0.1, value: 3 },
      ],
      scalars: [
        { id: 'c', expr: 'hypot(a, b)' },
        { id: 'k', expr: 'b / a' },
        { id: 'px', expr: 'a * sqrt(1 + (py / b)^2)' },
        { id: 'd1', expr: 'hypot(px + c, py)' },
        { id: 'd2', expr: 'hypot(px - c, py)' },
        // The asymptote on P's side, straight above or below P.
        { id: 'ya', expr: 'py >= 0 ? k * px : -k * px' },
      ],
      objects: [
        {
          type: 'polygon',
          points: [['-a', '-b'], ['a', '-b'], ['a', 'b'], ['-a', 'b']],
          color: 'muted',
          dashed: true,
          width: 1.2,
          fill: false,
        },
        { type: 'circle', center: [0, 0], r: 'c', color: 'muted', dashed: true, width: 1, opacity: 0.6 },
        { type: 'segment', from: [0, 0], to: ['a', 'b'], color: 'amber', width: 1.8, label: 'c' },
        { type: 'line', through: [0, 0], slope: 'k', color: 'blue', dashed: true, width: 1.5 },
        { type: 'line', through: [0, 0], slope: '-k', color: 'blue', dashed: true, width: 1.5 },
        { type: 'text', at: [7.8, 'min(k * 7.8, 5.6) + 0.3'], text: 'y = (b/a)x', color: 'blue', anchor: 'end' },
        {
          type: 'parametric',
          x: 'a * cosh(s)',
          y: 'b * sinh(s)',
          variable: 's',
          range: [-3.5, 3.5],
          samples: 300,
          color: 'primary',
          width: 3,
        },
        {
          type: 'parametric',
          x: '-a * cosh(s)',
          y: 'b * sinh(s)',
          variable: 's',
          range: [-3.5, 3.5],
          samples: 300,
          color: 'primary',
          width: 3,
        },
        { type: 'segment', from: ['-c', 0], to: ['px', 'py'], color: 'blue', width: 2, label: 'PF₁' },
        { type: 'segment', from: ['c', 0], to: ['px', 'py'], color: 'green', width: 2, label: 'PF₂' },
        { type: 'segment', from: ['px', 'py'], to: ['px', 'ya'], color: 'red', width: 2.5 },
        { type: 'point', at: ['-a', 0], color: 'muted', size: 4, label: 'A₁' },
        { type: 'point', at: ['a', 0], color: 'muted', size: 4, label: 'A₂' },
        { type: 'point', at: ['-c', 0], color: 'ink', size: 6, label: 'F₁' },
        { type: 'point', at: ['c', 0], color: 'ink', size: 6, label: 'F₂' },
        {
          type: 'point',
          at: ['px', 'py'],
          color: 'red',
          size: 6,
          label: 'P',
          drag: { y: 'py' },
        },
      ],
      readouts: [
        { label: '|PF_1|', expr: 'd1', digits: 3 },
        { label: '|PF_2|', expr: 'd2', digits: 3 },
        { label: '|PF_1| - |PF_2|', expr: 'd1 - d2', digits: 3, highlight: true },
        { label: 'c = \\sqrt{a^2 + b^2}', expr: 'c', digits: 3 },
        { label: 'e = c / a', expr: 'c / a', digits: 3 },
        { label: '\\pm\\dfrac{b}{a}', expr: 'k', digits: 3 },
        {
          label: t('\\text{gap to asymptote}', '\\text{到渐近线的竖直距离}'),
          expr: 'abs(ya - py)',
          digits: 3,
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'The difference is 2a', zh: '距离之差是 2a' },
      body: {
        en: 'With $a=2$, $b=1.5$ the foci are at $(\\pm2.5,0)$. At $P$ with $y_P=1.5$: $|PF_1|=5.536$ and $|PF_2|=1.536$, so $|PF_1|-|PF_2|=4=2a$. Drag $P$ along the branch and the difference holds. On the left branch it is $|PF_2|-|PF_1|$ that equals $2a$.',
        zh: '$a=2$、$b=1.5$ 时，焦点在 $(\\pm2.5,0)$。在 $y_P=1.5$ 的点 $P$ 处：$|PF_1|=5.536$，$|PF_2|=1.536$，所以 $|PF_1|-|PF_2|=4=2a$。沿右支拖动 $P$，差值始终不变；在左支上是 $|PF_2|-|PF_1|=2a$。',
      },
      set: { a: 2, b: 1.5, py: 1.5 },
    },
    {
      title: { en: 'Closer and closer to the asymptote', zh: '越来越贴近渐近线' },
      body: {
        en: 'The red segment is the vertical gap between $P$ and the line $y=\\frac{b}{a}x$. At $y_P=1.5$ it is $0.621$; drag $P$ out to $y_P=5$ and it shrinks to $0.220$. It keeps shrinking toward $0$ but never reaches it.',
        zh: '红色线段是 $P$ 与直线 $y=\\frac{b}{a}x$ 之间的竖直距离。$y_P=1.5$ 时是 $0.621$；把 $P$ 拖到 $y_P=5$，缩小到 $0.220$。它会一直向 $0$ 靠近，但永远到不了 $0$。',
      },
      set: { a: 2, b: 1.5, py: 5 },
    },
    {
      title: { en: 'The rectangle holds a, b and c', zh: '矩形里藏着 a、b、c' },
      body: {
        en: 'Put $P$ at the vertex $(2,0)$: $|PF_1|=4.5$, $|PF_2|=0.5$. The dashed rectangle has corners $(\\pm2,\\pm1.5)$; its diagonals are the asymptotes, slope $\\pm0.75$, and its half-diagonal is $c=\\sqrt{2^2+1.5^2}=2.5$. The circle of radius $c$ through the corners passes through both foci. So $e=\\frac{c}{a}=1.25$.',
        zh: '把 $P$ 放到顶点 $(2,0)$：$|PF_1|=4.5$，$|PF_2|=0.5$。虚线矩形的顶点是 $(\\pm2,\\pm1.5)$，两条对角线就是渐近线，斜率 $\\pm0.75$；半条对角线长 $c=\\sqrt{2^2+1.5^2}=2.5$，过矩形顶点、半径为 $c$ 的圆正好经过两个焦点。所以 $e=\\frac{c}{a}=1.25$。',
      },
      set: { a: 2, b: 1.5, py: 0 },
    },
    {
      title: { en: 'a = b: a rectangular hyperbola', zh: 'a = b：等轴双曲线' },
      body: {
        en: 'Set $b=2$ as well. The rectangle becomes a square, the asymptotes $y=\\pm x$ are perpendicular, and $e=\\sqrt2\\approx1.414$. Raise $b$ further and the branches open wider; $e$ grows with them.',
        zh: '把 $b$ 也设为 $2$。矩形变成正方形，渐近线 $y=\\pm x$ 互相垂直，$e=\\sqrt2\\approx1.414$。继续增大 $b$，两支张得更开，$e$ 也随之变大。',
      },
      set: { a: 2, b: 2, py: 1.5 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'Definition and equation', zh: '定义与方程' },
      body: {
        en: 'A **hyperbola** is the set of points whose distances to two foci $F_1$, $F_2$ differ by a constant: $\\big||PF_1|-|PF_2|\\big|=2a$, with $0<2a<|F_1F_2|=2c$. (By the triangle inequality the difference can never exceed $2c$.)\n\nWith $F_1=(-c,0)$, $F_2=(c,0)$, the same two squarings as for the ellipse give $(c^2-a^2)x^2-a^2y^2=a^2(c^2-a^2)$. Now $c>a$, so name $b^2=c^2-a^2$:\n\n$$\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1\\qquad(a>0,\\ b>0)$$',
        zh: '平面内到两个焦点 $F_1$、$F_2$ 的距离之差的绝对值为常数的点的集合叫**双曲线**：$\\big||PF_1|-|PF_2|\\big|=2a$，且 $0<2a<|F_1F_2|=2c$。（由三角形两边之差小于第三边，这个差不可能超过 $2c$。）\n\n取 $F_1=(-c,0)$、$F_2=(c,0)$，与椭圆一样平方两次，得到 $(c^2-a^2)x^2-a^2y^2=a^2(c^2-a^2)$。这次 $c>a$，记 $b^2=c^2-a^2$：\n\n$$\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1\\qquad(a>0,\\ b>0)$$',
      },
    },
    {
      id: 'compare',
      title: { en: 'Ellipse and hyperbola side by side', zh: '与椭圆对照' },
      body: {
        en: '- Ellipse: **sum** $2a$, so $2a>2c$ and $a^2=b^2+c^2$; $a$ is the longest of the three.\n- Hyperbola: **difference** $2a$, so $2a<2c$ and $c^2=a^2+b^2$; $c$ is the longest.\n\nOne sign in the definition flips the sign in the equation and decides which length is the hypotenuse.',
        zh: '- 椭圆：距离之**和**为 $2a$，所以 $2a>2c$，$a^2=b^2+c^2$，$a$ 最大。\n- 双曲线：距离之**差**为 $2a$，所以 $2a<2c$，$c^2=a^2+b^2$，$c$ 最大。\n\n定义里一个"和"换成"差"，方程里就换了一个符号，也决定了三者中谁是斜边。',
      },
    },
    {
      id: 'asymptotes',
      title: { en: 'Why the asymptotes are y = ±(b/a)x', zh: '渐近线为什么是 y = ±(b/a)x' },
      body: {
        en: 'Solve for the upper half of the right branch: $y=\\frac{b}{a}\\sqrt{x^2-a^2}$. Its vertical gap below the line $y=\\frac bax$ is\n\n$$\\frac ba\\left(x-\\sqrt{x^2-a^2}\\right)=\\frac ba\\cdot\\frac{a^2}{x+\\sqrt{x^2-a^2}}=\\frac{ab}{x+\\sqrt{x^2-a^2}}$$\n\nThe gap is always positive, so the curve never touches the line, and it tends to $0$ as $x$ grows. A quick way to recall them: replace the $1$ in the equation by $0$, $\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=0$, which factors into the two lines.',
        zh: '解出右支上半部分：$y=\\frac{b}{a}\\sqrt{x^2-a^2}$。它在直线 $y=\\frac bax$ 下方的竖直距离是\n\n$$\\frac ba\\left(x-\\sqrt{x^2-a^2}\\right)=\\frac ba\\cdot\\frac{a^2}{x+\\sqrt{x^2-a^2}}=\\frac{ab}{x+\\sqrt{x^2-a^2}}$$\n\n这个距离恒为正，所以曲线永远碰不到直线；$x$ 越大它越趋于 $0$。速记方法：把方程右边的 $1$ 换成 $0$，$\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=0$ 分解开就是这两条直线。',
      },
    },
    {
      id: 'eccentricity',
      title: { en: 'Eccentricity and the opening', zh: '离心率与开口大小' },
      body: {
        en: '$e=\\dfrac ca>1$, and $\\dfrac ba=\\sqrt{e^2-1}$. The larger $e$, the steeper the asymptotes and the wider the branches open. At $e=\\sqrt2$, $a=b$ and the asymptotes are perpendicular: the rectangular hyperbola, which turned through $45^\\circ$ is the familiar $y=\\frac kx$.',
        zh: '$e=\\dfrac ca>1$，且 $\\dfrac ba=\\sqrt{e^2-1}$。$e$ 越大，渐近线越陡，两支开口越大。$e=\\sqrt2$ 时 $a=b$，渐近线互相垂直，这就是等轴双曲线，把它旋转 $45^\\circ$ 就是熟悉的 $y=\\frac kx$。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'What are the asymptotes of $\\dfrac{x^2}{9}-\\dfrac{y^2}{16}=1$?',
        zh: '双曲线 $\\dfrac{x^2}{9}-\\dfrac{y^2}{16}=1$ 的渐近线方程是？',
      },
      choices: [
        { en: '$y=\\pm\\frac43x$', zh: '$y=\\pm\\frac43x$' },
        { en: '$y=\\pm\\frac34x$', zh: '$y=\\pm\\frac34x$' },
        { en: '$y=\\pm\\frac{16}{9}x$', zh: '$y=\\pm\\frac{16}{9}x$' },
        { en: '$y=\\pm\\frac53x$', zh: '$y=\\pm\\frac53x$' },
      ],
      answer: 0,
      explanation: {
        en: '$a=3$, $b=4$, so $y=\\pm\\frac bax=\\pm\\frac43x$.',
        zh: '$a=3$，$b=4$，所以 $y=\\pm\\frac bax=\\pm\\frac43x$。',
      },
    },
    {
      question: {
        en: 'For $\\dfrac{x^2}{9}-\\dfrac{y^2}{16}=1$, what are $c$ and $e$?',
        zh: '双曲线 $\\dfrac{x^2}{9}-\\dfrac{y^2}{16}=1$ 的 $c$ 与 $e$ 分别是？',
      },
      choices: [
        { en: '$c=5$, $e=\\frac53$', zh: '$c=5$，$e=\\frac53$' },
        { en: '$c=\\sqrt7$, $e=\\frac{\\sqrt7}{3}$', zh: '$c=\\sqrt7$，$e=\\frac{\\sqrt7}{3}$' },
        { en: '$c=5$, $e=\\frac54$', zh: '$c=5$，$e=\\frac54$' },
        { en: '$c=7$, $e=\\frac73$', zh: '$c=7$，$e=\\frac73$' },
      ],
      answer: 0,
      explanation: {
        en: 'For a hyperbola $c^2=a^2+b^2=9+16=25$, so $c=5$ and $e=\\frac ca=\\frac53$. Using $a^2-b^2$ is the ellipse rule.',
        zh: '双曲线中 $c^2=a^2+b^2=9+16=25$，$c=5$，$e=\\frac ca=\\frac53$。用 $a^2-b^2$ 是椭圆的公式。',
      },
    },
    {
      question: {
        en: 'A point $P$ on the right branch of $\\dfrac{x^2}{9}-\\dfrac{y^2}{16}=1$ has $|PF_1|=10$. What is $|PF_2|$?',
        zh: '点 $P$ 在双曲线 $\\dfrac{x^2}{9}-\\dfrac{y^2}{16}=1$ 的右支上，$|PF_1|=10$，则 $|PF_2|=$？',
      },
      choices: [
        { en: '$4$', zh: '$4$' },
        { en: '$16$', zh: '$16$' },
        { en: '$7$', zh: '$7$' },
        { en: '$13$', zh: '$13$' },
      ],
      answer: 0,
      explanation: {
        en: 'On the right branch $P$ is nearer $F_2$, so $|PF_1|-|PF_2|=2a=6$ and $|PF_2|=4$.',
        zh: '在右支上 $P$ 离 $F_2$ 更近，所以 $|PF_1|-|PF_2|=2a=6$，$|PF_2|=4$。',
      },
    },
  ],
  resultTex: '\\big||PF_1| - |PF_2|\\big| = 2a',
  curveSlugs: ['hyperbola'],
  related: ['ellipse-definition', 'conic-sections-eccentricity'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'For x²/4 − y²/2.25 = 1, move a point along the right branch with |PF₁| − |PF₂| = 4 shown live while the vertical gap to the asymptote y = 0.75x shrinks from 0.621 to 0.220. Draw the rectangle with corners (±2, ±1.5): its diagonals are the asymptotes and its half-diagonal is c = 2.5. End with a = b and perpendicular asymptotes.',
    zh: '对 x²/4 − y²/2.25 = 1，让点沿右支移动，实时显示 |PF₁| − |PF₂| = 4，同时它到渐近线 y = 0.75x 的竖直距离从 0.621 缩小到 0.220。画出顶点为 (±2, ±1.5) 的矩形：对角线就是渐近线，半条对角线长 c = 2.5。最后展示 a = b 时渐近线互相垂直。',
  },
};
