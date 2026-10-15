import { pick, type Lab } from '../types';

// P is placed by its polar angle around the centre, so dragging it round the
// curve writes back the same angle: r(θ) = ab / √((b cos θ)² + (a sin θ)²).
const R = 'a * bb / hypot(bb * cos(t), a * sin(t))';

export const ellipseDefinition: Lab = {
  slug: 'ellipse-definition',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Ellipse', zh: '椭圆的定义' },
  title: {
    en: 'The ellipse: a constant sum of distances to two foci',
    zh: '椭圆：到两个焦点的距离之和为定值',
  },
  question: {
    en: 'Why does a loop of string around two pins draw an ellipse, and where does b² = a² − c² come from?',
    zh: '为什么用一根绳子绕两颗钉子就能画出椭圆？b² = a² − c² 又是从哪里来的？',
  },
  summary: {
    en: 'Drag a point around the curve and watch |PF₁| + |PF₂| stay at 2a. Move the foci together to get a circle, apart to flatten the ellipse, and read b² = a² − c² off the triangle at the top vertex.',
    zh: '拖动曲线上的点，看 |PF₁| + |PF₂| 始终等于 2a。把两个焦点合拢得到圆，拉开则椭圆变扁，再从短轴端点处的直角三角形读出 b² = a² − c²。',
  },
  keyPoints: [
    { en: 'Definition by two foci', zh: '椭圆的定义' },
    { en: 'Standard equation', zh: '标准方程' },
    { en: 'b² = a² − c²', zh: 'b² = a² − c²' },
    { en: 'Eccentricity e = c/a', zh: '离心率 e = c/a' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-6, 6], y: [-4.5, 4.5] },
      params: [
        { id: 'a', label: 'a', min: 2, max: 5, step: 0.1, value: 4 },
        {
          id: 'c',
          label: 'c',
          min: 0,
          max: 4.8,
          step: 0.1,
          value: 2.4,
          bands: [
            { from: 0, to: 0, label: t('circle', '圆'), color: 'green' },
          ],
        },
        { id: 't', label: '\\theta_P', min: 0, max: 6.2832, step: 0.01, value: 1.2 },
      ],
      scalars: [
        { id: 'ok', expr: 'c < a' },
        // b is only real while c < a; keep a sliver for drawing otherwise.
        { id: 'bb', expr: 'sqrt(max(a^2 - c^2, 0.01))' },
        { id: 'r', expr: R },
        { id: 'px', expr: 'r * cos(t)' },
        { id: 'py', expr: 'r * sin(t)' },
        { id: 'd1', expr: 'hypot(px + c, py)' },
        { id: 'd2', expr: 'hypot(px - c, py)' },
      ],
      objects: [
        // The right triangle at the top vertex: legs b and c, hypotenuse a.
        {
          type: 'polygon',
          points: [[0, 0], ['c', 0], [0, 'bb']],
          color: 'amber',
          fill: true,
          opacity: 0.12,
          visible: 'ok',
        },
        { type: 'segment', from: [0, 0], to: [0, 'bb'], color: 'amber', dashed: true, width: 1.5, label: 'b', visible: 'ok' },
        { type: 'segment', from: [0, 0], to: ['c', 0], color: 'amber', dashed: true, width: 1.5, label: 'c', visible: 'ok * (c > 0.2)' },
        { type: 'segment', from: [0, 'bb'], to: ['c', 0], color: 'amber', dashed: true, width: 1.5, label: 'a', visible: 'ok * (c > 0.2)' },
        {
          type: 'parametric',
          x: 'a * cos(s)',
          y: 'bb * sin(s)',
          variable: 's',
          range: [0, '2 * pi'],
          samples: 400,
          color: 'primary',
          width: 3,
          visible: 'ok',
        },
        // The string: F₁ → P → F₂.
        { type: 'segment', from: ['-c', 0], to: ['px', 'py'], color: 'blue', width: 2.2, label: 'PF₁', visible: 'ok' },
        { type: 'segment', from: ['px', 'py'], to: ['c', 0], color: 'green', width: 2.2, label: 'PF₂', visible: 'ok' },
        { type: 'point', at: ['-a', 0], color: 'muted', size: 4, label: 'A₁', visible: 'ok' },
        { type: 'point', at: ['a', 0], color: 'muted', size: 4, label: 'A₂', visible: 'ok' },
        { type: 'point', at: ['-c', 0], color: 'ink', size: 6, label: 'F₁' },
        { type: 'point', at: ['c', 0], color: 'ink', size: 6, label: 'F₂' },
        {
          type: 'text',
          at: [0, -1],
          text: t('string shorter than F₁F₂: no curve', '绳长不超过 |F₁F₂|：画不出曲线'),
          color: 'red',
          anchor: 'middle',
          visible: '1 - ok',
        },
        {
          type: 'point',
          at: ['px', 'py'],
          color: 'red',
          size: 6,
          label: 'P',
          drag: { angle: 't', center: [0, 0] },
          visible: 'ok',
        },
      ],
      readouts: [
        { label: '|PF_1|', expr: 'ok ? d1 : 0 / 0', digits: 3 },
        { label: '|PF_2|', expr: 'ok ? d2 : 0 / 0', digits: 3 },
        { label: '|PF_1| + |PF_2|', expr: 'ok ? d1 + d2 : 0 / 0', digits: 3, highlight: true },
        { label: 'b = \\sqrt{a^2 - c^2}', expr: 'ok ? bb : 0 / 0', digits: 3 },
        { label: 'e = c / a', expr: 'c / a', digits: 3 },
        {
          kind: 'status',
          label: t('2a > 2c', '2a > 2c'),
          expr: 'ok',
          ok: t('yes: an ellipse', '成立：是椭圆'),
          bad: t('no: no ellipse', '不成立：不是椭圆'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'A string of length 2a', zh: '一根长 2a 的绳子' },
      body: {
        en: 'Pin a string of length $2a=8$ at $F_1$ and $F_2$, $2c=4.8$ apart, and pull it tight with a pencil at $P$. Here $|PF_1|=4.713$ and $|PF_2|=3.287$: they add up to $8$. Drag $P$ anywhere on the curve and the sum does not change.',
        zh: '把一根长 $2a=8$ 的绳子两端钉在相距 $2c=4.8$ 的 $F_1$、$F_2$ 上，用笔尖在 $P$ 处把绳子拉紧。此时 $|PF_1|=4.713$，$|PF_2|=3.287$，加起来正好是 $8$。把 $P$ 拖到曲线上任何位置，这个和都不变。',
      },
      set: { a: 4, c: 2.4, t: 1.2 },
    },
    {
      title: { en: 'b comes from a right triangle', zh: 'b 来自一个直角三角形' },
      body: {
        en: 'Move $P$ to the top of the curve. By symmetry the string is split evenly: $|PF_1|=|PF_2|=a=4$. The height $b$, the half-distance $c=2.4$ and the half-string $a$ form a right triangle, so $b^2=a^2-c^2$ and $b=3.2$.',
        zh: '把 $P$ 拖到曲线最高点。由对称性，绳子被平分：$|PF_1|=|PF_2|=a=4$。高度 $b$、焦距的一半 $c=2.4$ 和半根绳长 $a$ 构成直角三角形，所以 $b^2=a^2-c^2$，$b=3.2$。',
      },
      set: { a: 4, c: 2.4, t: 1.5708 },
    },
    {
      title: { en: 'Foci together: a circle', zh: '焦点重合：圆' },
      body: {
        en: 'Slide $c$ to $0$. The two pins coincide, every point is $a=4$ from the centre, and the ellipse is a circle: $b=a$ and $e=\\frac{c}{a}=0$.',
        zh: '把 $c$ 调到 $0$。两颗钉子重合，每个点到中心的距离都是 $a=4$，椭圆变成了圆：$b=a$，$e=\\frac{c}{a}=0$。',
      },
      set: { a: 4, c: 0, t: 1.2 },
    },
    {
      title: { en: 'Foci apart: a flatter ellipse', zh: '焦点拉开：椭圆变扁' },
      body: {
        en: 'At $c=3.8$ almost all of the string is used up spanning the foci: $b=1.249$ and $e=0.95$. Push $c$ up to $a$ and the curve collapses onto the segment $F_1F_2$; beyond that the string is too short to reach round at all.',
        zh: '$c=3.8$ 时，绳子几乎全用来跨越两个焦点：$b=1.249$，$e=0.95$。把 $c$ 推到等于 $a$，曲线就压成线段 $F_1F_2$；再大，绳子就短得绕不过去了。',
      },
      set: { a: 4, c: 3.8, t: 1.2 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'The definition', zh: '定义' },
      body: {
        en: 'An **ellipse** is the set of points $P$ in the plane whose distances to two fixed points $F_1$, $F_2$ (the **foci**) add up to a constant $2a$, with $2a>|F_1F_2|=2c$.\n\n- $2a=2c$: the points form the segment $F_1F_2$.\n- $2a<2c$: no point qualifies, because $|PF_1|+|PF_2|\\ge|F_1F_2|$ by the triangle inequality.',
        zh: '平面内到两个定点 $F_1$、$F_2$（**焦点**）的距离之和等于常数 $2a$（$2a>|F_1F_2|=2c$）的点的集合叫**椭圆**。\n\n- $2a=2c$：点的轨迹是线段 $F_1F_2$。\n- $2a<2c$：没有点满足条件，因为由三角形两边之和大于第三边，$|PF_1|+|PF_2|\\ge|F_1F_2|$。',
      },
    },
    {
      id: 'equation',
      title: { en: 'From the definition to the equation', zh: '从定义推出方程' },
      body: {
        en: 'Put $F_1=(-c,0)$, $F_2=(c,0)$ and write the definition out:\n\n$$\\sqrt{(x+c)^2+y^2}+\\sqrt{(x-c)^2+y^2}=2a$$\n\nMove one root across and square, which leaves $a^2-cx=a\\sqrt{(x-c)^2+y^2}$. Square again and collect terms: $(a^2-c^2)x^2+a^2y^2=a^2(a^2-c^2)$. Name $b^2=a^2-c^2>0$ and divide by $a^2b^2$:\n\n$$\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1\\qquad(a>b>0)$$',
        zh: '取 $F_1=(-c,0)$、$F_2=(c,0)$，把定义写成式子：\n\n$$\\sqrt{(x+c)^2+y^2}+\\sqrt{(x-c)^2+y^2}=2a$$\n\n把一个根式移到右边再平方，整理得 $a^2-cx=a\\sqrt{(x-c)^2+y^2}$。再平方并合并：$(a^2-c^2)x^2+a^2y^2=a^2(a^2-c^2)$。记 $b^2=a^2-c^2>0$，两边同除以 $a^2b^2$：\n\n$$\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1\\qquad(a>b>0)$$',
      },
    },
    {
      id: 'abc',
      title: { en: 'What a, b, c measure', zh: 'a、b、c 各是什么' },
      body: {
        en: '- $a$: half the string, and also the semi-major axis, since at the vertex $A_2$ the string runs $a+c$ and $a-c$.\n- $b$: the semi-minor axis, the height of the top vertex.\n- $c$: half the distance between the foci.\n\nThe shaded triangle is the whole reason for $a^2=b^2+c^2$: at the top vertex each half of the string is a hypotenuse of length $a$.',
        zh: '- $a$：绳长的一半，也是长半轴，因为在顶点 $A_2$ 处两段绳长分别是 $a+c$ 和 $a-c$。\n- $b$：短半轴，即最高点的高度。\n- $c$：两焦点间距离的一半。\n\n$a^2=b^2+c^2$ 的全部理由就是画板上那个阴影三角形：在最高点，每半根绳子都是长为 $a$ 的斜边。',
      },
    },
    {
      id: 'eccentricity',
      title: { en: 'Eccentricity measures flatness', zh: '离心率刻画扁平程度' },
      body: {
        en: '$e=\\dfrac{c}{a}$ lies between $0$ and $1$. It is the share of the half-string spent bridging the foci: near $0$ the ellipse is round, near $1$ it is long and thin, because $\\dfrac{b}{a}=\\sqrt{1-e^2}$. The eccentricity chapter shows the same $e$ from a focus and a directrix instead.',
        zh: '$e=\\dfrac{c}{a}$ 介于 $0$ 和 $1$ 之间，表示半根绳子里有多少用来跨越焦点：接近 $0$ 时椭圆很圆，接近 $1$ 时又长又扁，因为 $\\dfrac{b}{a}=\\sqrt{1-e^2}$。"离心率"一章会从焦点和准线的角度得到同一个 $e$。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'For $\\dfrac{x^2}{25}+\\dfrac{y^2}{16}=1$, what is $|PF_1|+|PF_2|$ for any point $P$ on it?',
        zh: '椭圆 $\\dfrac{x^2}{25}+\\dfrac{y^2}{16}=1$ 上任意一点 $P$ 满足 $|PF_1|+|PF_2|=$？',
      },
      choices: [
        { en: '$10$', zh: '$10$' },
        { en: '$5$', zh: '$5$' },
        { en: '$8$', zh: '$8$' },
        { en: '$6$', zh: '$6$' },
      ],
      answer: 0,
      explanation: {
        en: '$a^2=25$, so $a=5$ and the sum is $2a=10$.',
        zh: '$a^2=25$，$a=5$，距离之和是 $2a=10$。',
      },
    },
    {
      question: {
        en: 'Where are the foci of $\\dfrac{x^2}{25}+\\dfrac{y^2}{16}=1$?',
        zh: '椭圆 $\\dfrac{x^2}{25}+\\dfrac{y^2}{16}=1$ 的焦点坐标是？',
      },
      choices: [
        { en: '$(\\pm3,0)$', zh: '$(\\pm3,0)$' },
        { en: '$(\\pm\\sqrt{41},0)$', zh: '$(\\pm\\sqrt{41},0)$' },
        { en: '$(0,\\pm3)$', zh: '$(0,\\pm3)$' },
        { en: '$(\\pm4,0)$', zh: '$(\\pm4,0)$' },
      ],
      answer: 0,
      explanation: {
        en: '$c^2=a^2-b^2=25-16=9$. The larger denominator is under $x^2$, so the foci are on the $x$-axis at $(\\pm3,0)$.',
        zh: '$c^2=a^2-b^2=25-16=9$。较大的分母在 $x^2$ 下面，焦点在 $x$ 轴上，为 $(\\pm3,0)$。',
      },
    },
    {
      question: {
        en: 'Points with $|PF_1|+|PF_2|=6$ where $|F_1F_2|=6$ form…',
        zh: '若 $|F_1F_2|=6$，满足 $|PF_1|+|PF_2|=6$ 的点 $P$ 的轨迹是？',
      },
      choices: [
        { en: 'the segment $F_1F_2$', zh: '线段 $F_1F_2$' },
        { en: 'an ellipse', zh: '椭圆' },
        { en: 'a circle', zh: '圆' },
        { en: 'no points at all', zh: '不存在' },
      ],
      answer: 0,
      explanation: {
        en: 'The sum equals the distance between the foci only when $P$ lies on the segment between them.',
        zh: '距离之和等于两焦点间距离，只有 $P$ 在两焦点之间的线段上时才成立。',
      },
    },
  ],
  resultTex: '|PF_1| + |PF_2| = 2a',
  curveSlugs: ['ellipse'],
  related: ['hyperbola-asymptotes', 'conic-sections-eccentricity'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Draw an ellipse with a string of length 8 pinned at two foci 4.8 apart: trace the curve with |PF₁| + |PF₂| = 8 shown live, stop at the top vertex to reveal the 2.4–3.2–4 right triangle behind b² = a² − c², then merge the foci into a circle and pull them apart into a flat ellipse.',
    zh: '用一根长 8 的绳子钉在相距 4.8 的两个焦点上画椭圆：描出曲线，同时显示 |PF₁| + |PF₂| = 8；停在最高点，揭示 b² = a² − c² 背后的 2.4–3.2–4 直角三角形；再把焦点合拢成圆，拉开成扁椭圆。',
  },
};
