import { pick, type Lab } from '../types';

export const vectorDotProduct: Lab = {
  slug: 'vector-dot-product',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Vector addition & dot product', zh: '向量加法与数量积' },
  title: {
    en: 'Vector addition and the dot product: from |a||b|cos θ to a₁b₁ + a₂b₂',
    zh: '向量加法与数量积：从 |a||b|cos θ 到 x₁x₂ + y₁y₂',
  },
  question: {
    en: 'The dot product is defined with lengths and an angle. Why does it come out as a₁b₁ + a₂b₂ in coordinates, where no angle appears?',
    zh: '数量积是用长度和夹角定义的，为什么换成坐标后变成 x₁x₂ + y₁y₂，夹角却不见了？',
  },
  summary: {
    en: 'Drag the tips of a and b. The board measures the angle between them on its own and computes |a||b|cos θ, then compares it with a₁b₁ + a₂b₂ from the coordinates: the two always agree. The parallelogram shows a + b, the red segment shows the projection of b onto a.',
    zh: '拖动向量 a、b 的终点。画板单独量出两者的夹角，算出 |a||b|cos θ，再和坐标算出的 x₁x₂ + y₁y₂ 比较：两者始终相等。平行四边形给出 a + b，红色线段是 b 在 a 上的投影。',
  },
  keyPoints: [
    { en: 'Parallelogram rule', zh: '平行四边形法则' },
    { en: 'Dot product', zh: '数量积' },
    { en: 'Projection', zh: '投影' },
    { en: 'Perpendicular when a·b = 0', zh: 'a·b = 0 时垂直' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-4, 8], y: [-3, 6.5] },
      params: [
        { id: 'ax', label: 'x_1', min: -3.5, max: 7.5, step: 0.1, value: 4 },
        { id: 'ay', label: 'y_1', min: -2.5, max: 6, step: 0.1, value: 1 },
        { id: 'bx', label: 'x_2', min: -3.5, max: 7.5, step: 0.1, value: 1.5 },
        { id: 'by', label: 'y_2', min: -2.5, max: 6, step: 0.1, value: 3 },
      ],
      scalars: [
        { id: 'na', expr: 'hypot(ax, ay)' },
        { id: 'nb', expr: 'hypot(bx, by)' },
        { id: 'ua', expr: 'atan2(ay, ax)' },
        // Signed turn from a to b, measured from the two directions alone.
        { id: 'sw', expr: 'atan2(sin(atan2(by, bx) - ua), cos(atan2(by, bx) - ua))' },
        { id: 'th', expr: 'abs(sw)' },
        { id: 'geo', expr: 'na * nb * cos(th)' },
        { id: 'proj', expr: 'nb * cos(th)' },
        // Foot of the perpendicular from b's tip onto the line of a.
        { id: 'fx', expr: 'proj * ax / max(na, 0.001)' },
        { id: 'fy', expr: 'proj * ay / max(na, 0.001)' },
        { id: 'dot', expr: 'ax * bx + ay * by' },
        { id: 'perp', expr: 'abs(dot) < 0.05' },
      ],
      objects: [
        { type: 'line', through: [0, 0], to: ['ax', 'ay'], color: 'muted', dashed: true, width: 1 },
        // The parallelogram: a then b, or b then a, ends at the same point.
        { type: 'segment', from: ['ax', 'ay'], to: ['ax + bx', 'ay + by'], color: 'green', dashed: true, width: 1.5 },
        { type: 'segment', from: ['bx', 'by'], to: ['ax + bx', 'ay + by'], color: 'blue', dashed: true, width: 1.5 },
        { type: 'segment', from: [0, 0], to: ['ax + bx', 'ay + by'], color: 'purple', width: 2.5, arrow: true },
        { type: 'text', at: ['ax + bx + 0.25', 'ay + by + 0.25'], text: 'a + b', color: 'purple', anchor: 'start' },
        // a − b closes the triangle used to derive the coordinate formula.
        // (Its midpoint is the parallelogram's centre, where a + b also
        // crosses, so the label sits further along.)
        { type: 'segment', from: ['bx', 'by'], to: ['ax', 'ay'], color: 'muted', width: 1.2 },
        { type: 'text', at: ['bx + 0.75 * (ax - bx) + 0.2', 'by + 0.75 * (ay - by) + 0.3'], text: 'a − b', color: 'muted', anchor: 'start' },
        // Projection of b onto a.
        { type: 'segment', from: ['bx', 'by'], to: ['fx', 'fy'], color: 'muted', dashed: true, width: 1.2 },
        { type: 'segment', from: [0, 0], to: ['fx', 'fy'], color: 'red', width: 8, opacity: 0.35, visible: 'abs(proj) > 0.05' },
        { type: 'arc', center: [0, 0], r: 0.6, start: 'ua', end: 'ua + sw', color: 'amber', width: 2, label: 'θ' },
        { type: 'segment', from: [0, 0], to: ['ax', 'ay'], color: 'blue', width: 3, arrow: true, label: 'a' },
        { type: 'segment', from: [0, 0], to: ['bx', 'by'], color: 'green', width: 3, arrow: true, label: 'b' },
        {
          type: 'text',
          at: [2, -2.4],
          text: t('a ⊥ b: a·b = 0', 'a ⊥ b：a·b = 0'),
          color: 'red',
          visible: 'perp',
        },
        { type: 'point', at: [0, 0], color: 'ink', size: 4, label: 'O' },
        { type: 'point', at: ['ax', 'ay'], color: 'blue', size: 7, drag: { x: 'ax', y: 'ay' } },
        { type: 'point', at: ['bx', 'by'], color: 'green', size: 7, drag: { x: 'bx', y: 'by' } },
      ],
      readouts: [
        { label: '|\\vec a|', expr: 'na', digits: 3 },
        { label: '|\\vec b|', expr: 'nb', digits: 3 },
        { label: '\\theta', expr: 'th * 180 / pi', digits: 1 },
        { label: '|\\vec a|\\,|\\vec b|\\cos\\theta', expr: 'geo', digits: 3 },
        { label: 'x_1x_2 + y_1y_2', expr: 'dot', digits: 3, highlight: true },
        { label: '|\\vec b|\\cos\\theta', expr: 'proj', digits: 3 },
        { label: '|\\vec a + \\vec b|', expr: 'hypot(ax + bx, ay + by)', digits: 3 },
        {
          kind: 'status',
          label: t('angle between a and b', 'a 与 b 的夹角'),
          expr: 'dot > 0.05',
          ok: t('acute: a·b > 0', '锐角：a·b > 0'),
          bad: t('right or obtuse: a·b ≤ 0', '直角或钝角：a·b ≤ 0'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Two ways to the same number', zh: '两种算法，同一个数' },
      body: {
        en: 'The board measures $|\\vec a|=4.123$, $|\\vec b|=3.354$ and the angle between them, $\\theta=49.4^\\circ$, and multiplies: $|\\vec a||\\vec b|\\cos\\theta=9$. Separately it takes the coordinates: $4\\times1.5+1\\times3=9$. Drag either tip and the two keep agreeing.',
        zh: '画板量出 $|\\vec a|=4.123$、$|\\vec b|=3.354$ 和两者夹角 $\\theta=49.4^\\circ$，相乘得 $|\\vec a||\\vec b|\\cos\\theta=9$。另一边直接用坐标：$4\\times1.5+1\\times3=9$。随便拖动哪个终点，两边始终相等。',
      },
      set: { ax: 4, ay: 1, bx: 1.5, by: 3 },
    },
    {
      title: { en: 'Head to tail', zh: '首尾相接' },
      body: {
        en: 'Walking along $\\vec a$ and then along $\\vec b$ lands at the same corner as $\\vec b$ then $\\vec a$: the far corner of the parallelogram, $\\vec a+\\vec b=(5.5,\\,4)$. Coordinates simply add. Its length is $6.801$, less than $|\\vec a|+|\\vec b|=7.477$.',
        zh: '先沿 $\\vec a$ 走、再沿 $\\vec b$ 走，和先 $\\vec b$ 后 $\\vec a$，落在同一个点：平行四边形的对角顶点，$\\vec a+\\vec b=(5.5,\\,4)$，坐标直接相加。它的长度是 $6.801$，比 $|\\vec a|+|\\vec b|=7.477$ 短。',
      },
      set: { ax: 4, ay: 1, bx: 1.5, by: 3 },
    },
    {
      title: { en: 'Perpendicular: zero', zh: '垂直：等于零' },
      body: {
        en: 'Move $\\vec b$ to $(-1,\\,4)$. The angle is $90^\\circ$, the projection shrinks to nothing and $\\vec a\\cdot\\vec b=-4+4=0$. The parallelogram is now a rectangle and $|\\vec a+\\vec b|^2=17+17=34$: Pythagoras.',
        zh: '把 $\\vec b$ 移到 $(-1,\\,4)$。夹角是 $90^\\circ$，投影缩成一个点，$\\vec a\\cdot\\vec b=-4+4=0$。平行四边形变成矩形，$|\\vec a+\\vec b|^2=17+17=34$，正是勾股定理。',
      },
      set: { ax: 4, ay: 1, bx: -1, by: 4 },
    },
    {
      title: { en: 'Obtuse: negative', zh: '钝角：为负' },
      body: {
        en: 'At $\\vec b=(-3,\\,1)$ the angle is $147.5^\\circ$. The projection of $\\vec b$ falls behind $O$, $|\\vec b|\\cos\\theta=-2.668$, and the dot product is $-12+1=-11$. The sign of $\\vec a\\cdot\\vec b$ tells you which side of the right angle you are on.',
        zh: '$\\vec b=(-3,\\,1)$ 时夹角是 $147.5^\\circ$。$\\vec b$ 的投影落到 $O$ 的后面，$|\\vec b|\\cos\\theta=-2.668$，数量积为 $-12+1=-11$。$\\vec a\\cdot\\vec b$ 的符号告诉你夹角在直角的哪一边。',
      },
      set: { ax: 4, ay: 1, bx: -3, by: 1 },
    },
  ],
  sections: [
    {
      id: 'addition',
      title: { en: 'Adding vectors', zh: '向量的加法' },
      body: {
        en: 'A vector is a displacement: how far and which way, wherever it starts. Doing displacement $\\vec a$ and then $\\vec b$ is one displacement, $\\vec a+\\vec b$. Placing them head to tail in either order gives the two halves of a parallelogram, so $\\vec a+\\vec b=\\vec b+\\vec a$.\n\nIn coordinates a displacement is (across, up), and acrosses add to acrosses, ups to ups:\n\n$$(x_1,y_1)+(x_2,y_2)=(x_1+x_2,\\;y_1+y_2)$$',
        zh: '向量就是一次位移：走多远、朝哪个方向，与从哪里出发无关。先位移 $\\vec a$ 再位移 $\\vec b$，合起来是一次位移 $\\vec a+\\vec b$。两种顺序首尾相接，正好是平行四边形的两半，所以 $\\vec a+\\vec b=\\vec b+\\vec a$。\n\n用坐标表示，位移就是（横向，纵向），横向和横向相加，纵向和纵向相加：\n\n$$(x_1,y_1)+(x_2,y_2)=(x_1+x_2,\\;y_1+y_2)$$',
      },
    },
    {
      id: 'definition',
      title: { en: 'The dot product and projection', zh: '数量积与投影' },
      body: {
        en: 'The dot product is defined by lengths and the angle between the vectors:\n\n$$\\vec a\\cdot\\vec b=|\\vec a|\\,|\\vec b|\\cos\\theta$$\n\nRead it as length times projection: $|\\vec b|\\cos\\theta$ is how far $\\vec b$ reaches along the direction of $\\vec a$ (the red segment), and that is multiplied by $|\\vec a|$. Work done by a force is exactly this: force times the distance moved along it.',
        zh: '数量积用长度和夹角定义：\n\n$$\\vec a\\cdot\\vec b=|\\vec a|\\,|\\vec b|\\cos\\theta$$\n\n可以读成"长度乘投影"：$|\\vec b|\\cos\\theta$ 是 $\\vec b$ 沿 $\\vec a$ 方向伸出去的长度（红色线段），再乘 $|\\vec a|$。力做的功就是这样算的：力乘以沿力方向移动的距离。',
      },
    },
    {
      id: 'coordinates',
      title: { en: 'Why the angle disappears in coordinates', zh: '为什么坐标公式里没有夹角' },
      body: {
        en: 'Look at the triangle with sides $\\vec a$, $\\vec b$ and $\\vec a-\\vec b$ and work out $|\\vec a-\\vec b|^2$ twice.\n\n- **With the angle.** Drop the perpendicular from the tip of $\\vec b$ to the line of $\\vec a$. Its foot is $|\\vec b|\\cos\\theta$ from $O$ and the perpendicular has height $|\\vec b|\\sin\\theta$. Pythagoras on the right triangle with the tip of $\\vec a$:\n$$|\\vec a-\\vec b|^2=(|\\vec a|-|\\vec b|\\cos\\theta)^2+(|\\vec b|\\sin\\theta)^2=|\\vec a|^2+|\\vec b|^2-2|\\vec a||\\vec b|\\cos\\theta$$\n- **With coordinates.** Pythagoras on the horizontal and vertical gaps:\n$$|\\vec a-\\vec b|^2=(x_1-x_2)^2+(y_1-y_2)^2=|\\vec a|^2+|\\vec b|^2-2(x_1x_2+y_1y_2)$$\n\nThe two right-hand sides are equal, so\n\n$$|\\vec a|\\,|\\vec b|\\cos\\theta=x_1x_2+y_1y_2$$\n\nThe angle has not vanished: it is hidden in the coordinates. The first line is the law of cosines, and this argument is its proof.',
        zh: '看以 $\\vec a$、$\\vec b$、$\\vec a-\\vec b$ 为三边的三角形，把 $|\\vec a-\\vec b|^2$ 算两遍。\n\n- **用夹角算。** 从 $\\vec b$ 的终点向 $\\vec a$ 所在直线作垂线，垂足到 $O$ 的距离是 $|\\vec b|\\cos\\theta$，垂线高 $|\\vec b|\\sin\\theta$。对它和 $\\vec a$ 终点构成的直角三角形用勾股定理：\n$$|\\vec a-\\vec b|^2=(|\\vec a|-|\\vec b|\\cos\\theta)^2+(|\\vec b|\\sin\\theta)^2=|\\vec a|^2+|\\vec b|^2-2|\\vec a||\\vec b|\\cos\\theta$$\n- **用坐标算。** 对横向差和纵向差用勾股定理：\n$$|\\vec a-\\vec b|^2=(x_1-x_2)^2+(y_1-y_2)^2=|\\vec a|^2+|\\vec b|^2-2(x_1x_2+y_1y_2)$$\n\n两式右边相等，所以\n\n$$|\\vec a|\\,|\\vec b|\\cos\\theta=x_1x_2+y_1y_2$$\n\n夹角并没有消失，而是藏进了坐标里。第一行就是余弦定理，这段推导顺便证明了它。',
      },
    },
    {
      id: 'uses',
      title: { en: 'What it is used for', zh: '它能用来做什么' },
      body: {
        en: '- **Perpendicular test.** $\\vec a\\perp\\vec b$ exactly when $x_1x_2+y_1y_2=0$; no angle needs measuring.\n- **Angle between vectors.** $\\cos\\theta=\\dfrac{x_1x_2+y_1y_2}{|\\vec a|\\,|\\vec b|}$.\n- **Length of a sum.** Expanding $(\\vec a+\\vec b)\\cdot(\\vec a+\\vec b)$ gives $|\\vec a+\\vec b|^2=|\\vec a|^2+|\\vec b|^2+2\\,\\vec a\\cdot\\vec b$, so $|\\vec a+\\vec b|\\le|\\vec a|+|\\vec b|$, with equality only when the two point the same way.',
        zh: '- **判断垂直。** $\\vec a\\perp\\vec b$ 当且仅当 $x_1x_2+y_1y_2=0$，不用去量角。\n- **求夹角。** $\\cos\\theta=\\dfrac{x_1x_2+y_1y_2}{|\\vec a|\\,|\\vec b|}$。\n- **和的长度。** 展开 $(\\vec a+\\vec b)\\cdot(\\vec a+\\vec b)$ 得 $|\\vec a+\\vec b|^2=|\\vec a|^2+|\\vec b|^2+2\\,\\vec a\\cdot\\vec b$，因此 $|\\vec a+\\vec b|\\le|\\vec a|+|\\vec b|$，只有两者同向时取等号。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'For $\\vec a=(2,\\,3)$ and $\\vec b=(3,\\,-2)$, what is $\\vec a\\cdot\\vec b$?',
        zh: '$\\vec a=(2,\\,3)$，$\\vec b=(3,\\,-2)$，$\\vec a\\cdot\\vec b$ 等于多少？',
      },
      choices: [
        { en: '$0$, so they are perpendicular', zh: '$0$，所以两者垂直' },
        { en: '$12$', zh: '$12$' },
        { en: '$(6,\\,-6)$', zh: '$(6,\\,-6)$' },
        { en: '$5$', zh: '$5$' },
      ],
      answer: 0,
      explanation: {
        en: '$2\\times3+3\\times(-2)=0$. The dot product is a number, not a vector.',
        zh: '$2\\times3+3\\times(-2)=0$。数量积是一个数，不是向量。',
      },
    },
    {
      question: {
        en: 'If $\\vec a\\cdot\\vec b<0$, the angle between them is:',
        zh: '若 $\\vec a\\cdot\\vec b<0$，两向量的夹角是：',
      },
      choices: [
        { en: 'Obtuse', zh: '钝角' },
        { en: 'Acute', zh: '锐角' },
        { en: 'A right angle', zh: '直角' },
        { en: 'It cannot be told', zh: '无法判断' },
      ],
      answer: 0,
      explanation: {
        en: 'Lengths are positive, so the sign comes from $\\cos\\theta$, which is negative exactly for $90^\\circ<\\theta\\le180^\\circ$.',
        zh: '长度都是正的，符号只来自 $\\cos\\theta$，而 $\\cos\\theta<0$ 恰好对应 $90^\\circ<\\theta\\le180^\\circ$。',
      },
    },
    {
      question: {
        en: 'In the derivation of $x_1x_2+y_1y_2$, which fact is used twice?',
        zh: '推导 $x_1x_2+y_1y_2$ 时，哪个事实用了两次？',
      },
      choices: [
        { en: 'The Pythagorean theorem', zh: '勾股定理' },
        { en: 'The inscribed angle theorem', zh: '圆周角定理' },
        { en: 'Similar triangles', zh: '相似三角形' },
        { en: 'The parallelogram rule', zh: '平行四边形法则' },
      ],
      answer: 0,
      explanation: {
        en: 'Once on the triangle with the perpendicular, once on the coordinate gaps. Setting the two equal gives the formula.',
        zh: '一次用在作垂线得到的直角三角形上，一次用在坐标差上。两者相等就得到公式。',
      },
    },
  ],
  resultTex: '|\\vec a||\\vec b|\\cos\\theta = x_1x_2 + y_1y_2',
  related: ['pythagorean-theorem-rearrangement', 'similarity-homothety'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Show two vectors a and b from the origin, their sum by the parallelogram rule, and the projection of b onto a; compute |a||b|cos θ and x₁x₂ + y₁y₂ side by side and show they match, then rotate b to 90° where both become zero.',
    zh: '展示从原点出发的两个向量 a、b，用平行四边形法则作出 a + b，再作 b 在 a 上的投影；并排计算 |a||b|cos θ 与 x₁x₂ + y₁y₂，显示两者相等，最后把 b 转到 90°，两者同时变成 0。',
  },
};
