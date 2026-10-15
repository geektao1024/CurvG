import { pick, type Lab } from '../types';

// Big square [0, a+b]². At s = 0 four right triangles (legs a, b) ring a
// tilted square of side c. At s = 1 three of them have slid (pure
// translations, no rotation) so the same four leave an a² and a b² square.
const T2 = [
  ['a + b', 's * b'],
  ['a + b', 'a + s * b'],
  ['a', 's * b'],
] as const;
const T3 = [
  ['a + b - s * b', 'a + b - s * a'],
  ['b - s * b', 'a + b - s * a'],
  ['a + b - s * b', 'a - s * a'],
] as const;
const T4 = [
  ['s * a', 'a + b'],
  ['s * a', 'b'],
  ['b + s * a', 'a + b'],
] as const;

const tri = (points: readonly (readonly [string, string])[], color: 'blue' | 'green' | 'amber' | 'purple') => ({
  type: 'polygon' as const,
  points: points.map(([x, y]) => [x, y] as [string, string]),
  color,
  opacity: 0.5,
  width: 1.5,
});

export const pythagoreanTheoremRearrangement: Lab = {
  slug: 'pythagorean-theorem-rearrangement',
  publication: 'public',
  levels: ['middle', 'high'],
  chapterTitle: { en: 'Proof by rearrangement', zh: '勾股定理' },
  title: {
    en: 'Pythagorean theorem: proof by rearrangement',
    zh: '勾股定理：拼图证明',
  },
  question: {
    en: 'Why is a² + b² = c² for every right triangle?',
    zh: '为什么每个直角三角形都满足 a² + b² = c²？',
  },
  summary: {
    en: 'Four copies of the same right triangle sit inside one big square. Slide them and the empty space changes shape from c² into a² + b², without changing its area.',
    zh: '把同一个直角三角形复制四份放进一个大正方形。移动它们，空出来的部分从 c² 变成 a² + b²，面积却没有变。',
  },
  keyPoints: [
    { en: 'Right triangle', zh: '直角三角形' },
    { en: 'Area conservation', zh: '面积不变' },
    { en: 'Proof without words', zh: '无字证明' },
    { en: 'Pythagorean triples', zh: '勾股数' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-0.7, 6.7], y: [-0.7, 6.7], grid: false, axes: false },
      params: [
        { id: 's', label: t('\\text{slide}', '\\text{移动}'), min: 0, max: 1, step: 0.01, value: 0, play: 4 },
        { id: 'a', label: 'a', min: 0.5, max: 3.2, step: 0.05, value: 3 },
        { id: 'b', label: 'b', min: 0.5, max: 3.2, step: 0.05, value: 2.25 },
      ],
      scalars: [
        { id: 'c', expr: 'hypot(a, b)' },
        { id: 'start', expr: 's < 0.01' },
        { id: 'end', expr: 's > 0.99' },
      ],
      objects: [
        {
          type: 'polygon',
          points: [
            ['a', 0],
            ['a + b', 'a'],
            ['b', 'a + b'],
            [0, 'b'],
          ],
          color: 'red',
          opacity: 0.18,
          width: 2,
          visible: 'start',
          label: 'c²',
        },
        {
          type: 'polygon',
          points: [
            [0, 'b'],
            ['a', 'b'],
            ['a', 'a + b'],
            [0, 'a + b'],
          ],
          color: 'red',
          opacity: 0.18,
          width: 2,
          visible: 'end',
          label: 'a²',
        },
        {
          type: 'polygon',
          points: [
            ['a', 0],
            ['a + b', 0],
            ['a + b', 'b'],
            ['a', 'b'],
          ],
          color: 'red',
          opacity: 0.18,
          width: 2,
          visible: 'end',
          label: 'b²',
        },
        tri(
          [
            ['0', '0'],
            ['a', '0'],
            ['0', 'b'],
          ],
          'blue'
        ),
        tri(T2, 'green'),
        tri(T3, 'amber'),
        tri(T4, 'purple'),
        {
          type: 'polygon',
          points: [
            [0, 0],
            ['a + b', 0],
            ['a + b', 'a + b'],
            [0, 'a + b'],
          ],
          fill: false,
          color: 'ink',
          width: 2.5,
        },
        { type: 'text', at: ['a / 2', -0.4], text: 'a', color: 'blue' },
        { type: 'text', at: ['a + b / 2', -0.4], text: 'b', color: 'blue' },
        { type: 'text', at: [-0.4, 'b / 2'], text: 'b', color: 'blue' },
        { type: 'text', at: [-0.4, 'b + a / 2'], text: 'a', color: 'blue' },
      ],
      readouts: [
        { label: 'c', expr: 'c', digits: 3 },
        { label: 'c^2', expr: 'c^2', digits: 2 },
        { label: 'a^2 + b^2', expr: 'a^2 + b^2', digits: 2 },
        { label: '(a+b)^2', expr: '(a + b)^2', digits: 2 },
        { label: '4\\cdot\\tfrac{ab}{2}', expr: '2 * a * b', digits: 2 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Four triangles around c²', zh: '四个三角形围住 c²' },
      body: {
        en: 'The big square has side $a+b$. Four copies of the right triangle with legs $a$ and $b$ sit in its corners, and the space left in the middle is a tilted square of side $c$: area $c^2$.',
        zh: '大正方形的边长是 $a+b$。四个直角边为 $a$、$b$ 的直角三角形放在四个角上，中间空出一个边长为 $c$ 的斜放正方形，面积是 $c^2$。',
      },
      set: { s: 0 },
    },
    {
      title: { en: 'Slide, do not rotate', zh: '只平移，不旋转' },
      body: {
        en: 'Halfway through, three triangles are on the move. Nothing is cut, stretched or turned, so the triangles cover exactly the same area as before.',
        zh: '移动到一半时，有三个三角形在滑动。没有剪开、拉伸或转动，所以三角形覆盖的面积和原来完全一样。',
      },
      set: { s: 0.5 },
    },
    {
      title: { en: 'Now a² and b²', zh: '现在空出 a² 和 b²' },
      body: {
        en: 'The same four triangles now pair up into two rectangles, and the space left is a square of side $a$ and a square of side $b$. Same big square, same triangles, so the leftovers are equal: $a^2+b^2=c^2$.',
        zh: '同样四个三角形两两拼成两个矩形，空出一个边长 $a$ 的正方形和一个边长 $b$ 的正方形。大正方形没变，三角形没变，剩下的面积也就相等：$a^2+b^2=c^2$。',
      },
      set: { s: 1 },
    },
    {
      title: { en: 'Any right triangle', zh: '对任何直角三角形都成立' },
      body: {
        en: 'Change $a$ and $b$ and slide again; the argument never used their values. With $a=3$, $b=4$ (scaled here by $0.6$) you get the triple $3^2+4^2=5^2$.',
        zh: '改变 $a$ 和 $b$ 再滑动一次，论证从没用到它们的具体数值。$a=3$、$b=4$（这里按 $0.6$ 缩放）就得到勾股数 $3^2+4^2=5^2$。',
      },
      set: { s: 1, a: 1.8, b: 2.4 },
    },
  ],
  sections: [
    {
      id: 'statement',
      title: { en: 'The theorem', zh: '定理内容' },
      body: {
        en: 'In a right triangle with legs $a$, $b$ and hypotenuse $c$:\n\n$$a^2+b^2=c^2$$\n\nRead geometrically: the square built on the hypotenuse has the same area as the two squares on the legs together.',
        zh: '直角三角形的两条直角边为 $a$、$b$，斜边为 $c$，则\n\n$$a^2+b^2=c^2$$\n\n从几何上读：斜边上的正方形面积，等于两条直角边上的正方形面积之和。',
      },
    },
    {
      id: 'proof',
      title: { en: 'Why the rearrangement proves it', zh: '为什么拼图就是证明' },
      body: {
        en: 'Both pictures are the same square of area $(a+b)^2$ holding the same four triangles of area $\\frac{ab}{2}$ each. Subtracting the triangles from the square leaves\n\n$$c^2=(a+b)^2-4\\cdot\\tfrac{ab}{2}\\qquad\\text{and}\\qquad a^2+b^2=(a+b)^2-4\\cdot\\tfrac{ab}{2}$$\n\nso the two leftovers are equal. One fact the picture relies on: the middle shape at the start really is a square, because at each of its corners the two acute angles of a triangle add to $90^\\circ$, leaving $90^\\circ$ for the corner.',
        zh: '两幅图都是同一个面积为 $(a+b)^2$ 的正方形，里面放着同样四个面积各为 $\\frac{ab}{2}$ 的三角形。从大正方形里减去三角形，得到\n\n$$c^2=(a+b)^2-4\\cdot\\tfrac{ab}{2}\\qquad\\text{且}\\qquad a^2+b^2=(a+b)^2-4\\cdot\\tfrac{ab}{2}$$\n\n所以两次剩下的面积相等。图里用到一个事实：开始时中间那块确实是正方形，因为它的每个角旁边是三角形的两个锐角，它们加起来是 $90^\\circ$，剩下的角也是 $90^\\circ$。',
      },
    },
    {
      id: 'algebra',
      title: { en: 'The same proof in algebra', zh: '同一个证明的代数写法' },
      body: {
        en: 'Expand the first picture: $(a+b)^2=4\\cdot\\frac{ab}{2}+c^2$, so $a^2+2ab+b^2=2ab+c^2$. Cancel $2ab$ and the theorem drops out.',
        zh: '把第一幅图写成式子：$(a+b)^2=4\\cdot\\frac{ab}{2}+c^2$，即 $a^2+2ab+b^2=2ab+c^2$。两边消去 $2ab$，定理就出来了。',
      },
    },
    {
      id: 'uses',
      title: { en: 'Where it shows up', zh: '它会出现在哪里' },
      body: {
        en: 'The distance between $(x_1,y_1)$ and $(x_2,y_2)$ is $\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$: the theorem on the triangle formed by the horizontal and vertical gaps. Whole-number solutions such as $3,4,5$ and $5,12,13$ are **Pythagorean triples**. The converse also holds: if $a^2+b^2=c^2$, the angle opposite $c$ is a right angle.',
        zh: '两点 $(x_1,y_1)$ 与 $(x_2,y_2)$ 的距离是 $\\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}$，就是对水平差和竖直差构成的直角三角形用勾股定理。像 $3,4,5$、$5,12,13$ 这样的整数解叫**勾股数**。逆定理也成立：若 $a^2+b^2=c^2$，则 $c$ 所对的角是直角。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A right triangle has legs $5$ and $12$. How long is the hypotenuse?',
        zh: '直角三角形两条直角边是 $5$ 和 $12$，斜边多长？',
      },
      choices: [
        { en: '$13$', zh: '$13$' },
        { en: '$17$', zh: '$17$' },
        { en: '$\\sqrt{119}$', zh: '$\\sqrt{119}$' },
        { en: '$60$', zh: '$60$' },
      ],
      answer: 0,
      explanation: {
        en: '$25+144=169=13^2$.',
        zh: '$25+144=169=13^2$。',
      },
    },
    {
      question: {
        en: 'In the rearrangement, what stays the same between the two pictures?',
        zh: '拼图证明中，两幅图之间什么保持不变？',
      },
      choices: [
        { en: 'The big square and the four triangles', zh: '大正方形和四个三角形' },
        { en: 'The position of every triangle', zh: '每个三角形的位置' },
        { en: 'The shape of the empty space', zh: '空白部分的形状' },
        { en: 'Nothing; the areas change', zh: '都变了，面积也变了' },
      ],
      answer: 0,
      explanation: {
        en: 'Only positions change. Equal totals minus equal triangles leave equal areas.',
        zh: '只有位置变了。总面积相同、三角形面积相同，剩下的面积也相同。',
      },
    },
    {
      question: {
        en: 'Is a triangle with sides $6$, $8$, $11$ a right triangle?',
        zh: '边长为 $6$、$8$、$11$ 的三角形是直角三角形吗？',
      },
      choices: [
        { en: 'No, $36+64=100\\ne121$', zh: '不是，$36+64=100\\ne121$' },
        { en: 'Yes, $6+8>11$', zh: '是，因为 $6+8>11$' },
        { en: 'Yes, it is a multiple of $3,4,5$', zh: '是，它是 $3,4,5$ 的倍数' },
        { en: 'It cannot be decided', zh: '无法判断' },
      ],
      answer: 0,
      explanation: {
        en: 'By the converse, a right angle needs $a^2+b^2=c^2$ exactly. Here $100<121$, so the largest angle is obtuse.',
        zh: '由逆定理，直角要求 $a^2+b^2=c^2$ 恰好成立。这里 $100<121$，最大的角是钝角。',
      },
    },
  ],
  resultTex: 'a^2 + b^2 = c^2',
  related: ['unit-circle-sine', 'vector-dot-product', 'inscribed-angle-theorem'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Build a visual proof of the Pythagorean theorem by rearrangement: four right triangles inside a square of side a + b first leave a tilted c² square, then slide to leave a² and b², proving a² + b² = c².',
    zh: '用拼图做勾股定理的可视化证明：边长 a + b 的正方形里放四个直角三角形，先空出斜放的 c² 正方形，再平移三角形空出 a² 和 b²，从而证明 a² + b² = c²。',
  },
};
