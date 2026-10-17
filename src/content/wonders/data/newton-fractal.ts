import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the √2 steps and
 * their correct places, the straight border of z² − 1, the point −2^(−1/3)
 * that lands on 0, the 1200× zoom, and the 0 ↔ 1 cycle of z³ − 2z + 2 all
 * come from `@/lib/wonders/newton`.
 */
export const newtonFractal: Wonder = {
  slug: 'newton-fractal',
  publication: 'public',
  number: 7,
  updated: '2026-10-17',
  field: { zh: '复数 · 方程', en: 'Complex numbers · Equations' },
  name: { zh: '牛顿分形', en: 'Newton fractal' },
  metaTitle: {
    zh: '牛顿分形：用牛顿法解 z³ = 1 为什么会画出分形 | CurvG',
    en: 'Newton Fractal: Why Solving z³ = 1 Draws a Fractal | CurvG',
  },
  question: {
    zh: '用牛顿法解 z³ = 1，为什么会画出分形？',
    en: 'Solve z³ = 1 by Newton’s method: why do fractals grow between the roots’ territories?',
  },
  summary: {
    zh: '牛顿法沿着切线一步步逼近方程的根。把复平面上每个点都当作起点，按它最后到达哪个根上色：z² = 1 的两块地盘以一条直线为界，z³ = 1 的三块地盘之间却是无穷无尽的花边。拖动根，看边界怎么变。',
    en: 'Newton’s method closes in on a root of an equation one tangent at a time. Start it from every point of the complex plane and colour each by the root it reaches: for z² = 1 the two territories meet along a straight line, but for z³ = 1 the three meet in endless lace. Drag the roots and watch the borders change.',
  },
  takeaway: {
    zh: '在导数为 0 的地方附近，切线几乎是平的，一步就能把起点甩到任何地方，所以相邻的起点会奔向不同的根。结果是：边界上任何一点，三种颜色都同时紧挨着它，放大多少倍都一样。',
    en: 'Near a point where the derivative is 0 the tangent is almost flat, so one step can fling a start anywhere and neighbouring starts head for different roots. The result: every point on the border touches all three colours at once, however far you zoom in.',
  },
  beats: [
    {
      zh: '牛顿法求 √2：从 1 出发，沿切线滑到横轴，得到 1.5、1.4167、1.4142157……正确的位数从 1 位到 2、5、11 位，每步大约翻一倍。',
      en: 'Newton’s method for √2: start at 1, slide down the tangent to the axis, and get 1.5, 1.4167, 1.4142157… The correct places go from 1 to 2, 5 and 11, roughly doubling each step.',
    },
    {
      zh: '把起点放到复平面上解 z² = 1：每个点最后都落到离它近的那个根，两块地盘以一条直线为界。凯莱在 1879 年证明了这一点。',
      en: 'Move the starts to the complex plane and solve z² = 1: every point ends at the nearer root, and the two territories meet along a straight line. Cayley proved this in 1879.',
    },
    {
      zh: '换成 z³ = 1，三个根相隔 120°。你也许会猜是三块整齐的扇形。但有些起点并不去离它最近的根。',
      en: 'Now z³ = 1, three roots 120° apart. You might guess three tidy sectors. But some starts do not go to the nearest root at all.',
    },
    {
      zh: '真正的地盘长这样：每两块之间的边界上开出一串串花瓣，花瓣上又有花瓣。凯莱没能解决这个问题。',
      en: 'The real territories look like this: along every border grows a chain of petals, with petals on the petals. Cayley never solved this one.',
    },
    {
      zh: '把边界上的一点放大 1200 倍：三种颜色仍然同时在场。只要一个点挨着两块地盘，它就一定也挨着第三块。',
      en: 'Zoom 1200 times into a point on the border: all three colours are still there. Any point touching two territories touches the third as well.',
    },
    {
      zh: '原因在 0 附近：那里切线几乎是平的，一步就把起点甩到很远。点 −0.7937 第一步正好落在 0 上，所以它周围什么颜色都有。',
      en: 'The reason sits near 0: the tangent there is almost flat, and one step flings a start far away. The point −0.7937 lands exactly on 0 in one step, which is why every colour crowds around it.',
    },
    {
      zh: '牛顿法也会失败。解 z³ − 2z + 2 = 0，从 0 出发会在 0 和 1 之间来回跳，永远到不了根；附近一整片起点都这样，涂成黑色。',
      en: 'Newton’s method can fail, too. For z³ − 2z + 2 = 0, a start at 0 bounces between 0 and 1 for ever and never reaches a root; a whole patch of starts nearby does the same, shown in black.',
    },
    {
      zh: '现在轮到你：拖动白色圆圈移动根，换一个方程，点任意一点看它的牛顿路径。',
      en: 'Your turn: drag the white rings to move the roots, switch equations, and tap any point to see its Newton path.',
    },
  ],
  sections: [
    {
      id: 'method',
      title: { zh: '沿切线逼近根', en: 'Closing in along tangents' },
      body: {
        zh: '想解 $f(x)=0$，先猜一个 $x_0$，在曲线上这一点画切线，切线和横轴的交点就是更好的猜测：\n\n$$x_{n+1}=x_n-\\frac{f(x_n)}{f\'(x_n)}$$\n\n求 $\\sqrt2$ 就是解 $x^2-2=0$。从 $x_0=1$ 出发：$1.5$、$1.41667$、$1.4142157$、$1.41421356237469$，正确的小数位依次是 1、2、5、11。靠近根以后，误差每步大约平方一次，位数翻倍，这叫二次收敛。',
        en: 'To solve $f(x)=0$, guess $x_0$, draw the tangent to the curve there, and take where it meets the axis as a better guess:\n\n$$x_{n+1}=x_n-\\frac{f(x_n)}{f\'(x_n)}$$\n\nFinding $\\sqrt2$ means solving $x^2-2=0$. From $x_0=1$: $1.5$, $1.41667$, $1.4142157$, $1.41421356237469$, with 1, 2, 5 and 11 correct decimal places. Near a root the error is roughly squared each step and the digits double: quadratic convergence.',
      },
    },
    {
      id: 'complex',
      title: { zh: '搬到复平面', en: 'Into the complex plane' },
      body: {
        zh: '同一个公式对复数也成立，只是"切线"变成了复导数。对 $p(z)=(z-r_1)(z-r_2)\\cdots(z-r_n)$，一步牛顿法可以只用根来写：\n\n$$z\\;\\to\\;z-\\frac{1}{\\dfrac{1}{z-r_1}+\\cdots+\\dfrac{1}{z-r_n}}$$\n\n画板就是这样算的，所以你可以直接拖动根。\n\n对 $z^2-1$，到 $\\pm1$ 距离相等的点构成虚轴，虚轴两边的起点各自奔向近的那个根，边界是一条直线，凯莱 1879 年证明了这一点。对 $z^3-1$ 他写道，这个情形"似乎相当困难"。',
        en: 'The same formula works for complex numbers, with the complex derivative as the "tangent". For $p(z)=(z-r_1)(z-r_2)\\cdots(z-r_n)$ one Newton step can be written with the roots alone:\n\n$$z\\;\\to\\;z-\\frac{1}{\\dfrac{1}{z-r_1}+\\cdots+\\dfrac{1}{z-r_n}}$$\n\nThat is how the stage computes it, which is why you can drag the roots.\n\nFor $z^2-1$ the points equally far from $\\pm1$ form the imaginary axis; starts on either side go to the nearer root, and the border is a straight line, as Cayley proved in 1879. Of $z^3-1$ he wrote that the case "appears to present considerable difficulty".',
      },
    },
    {
      id: 'border',
      title: { zh: '为什么边界是分形', en: 'Why the border is a fractal' },
      body: {
        zh: '对 $z^3-1$，牛顿一步是 $z\\to\\dfrac{2z^3+1}{3z^2}$。在 $z=0$ 处导数为 0，切线是平的，这一步除以 0；0 附近的点一步就被甩到很远。\n\n实轴上的点 $-2^{-1/3}\\approx-0.7937$ 第一步正好到 0。它的邻居第一步落在 0 的四周，再一步就去向四面八方，所以它周围三种颜色都有。而落到这类点上的点又有无数个，每一个周围都是同样的情形：花瓣上又有花瓣。\n\n复动力系统里有一条定理：对这样的映射，每一块地盘的边界都是同一个集合（茱莉亚集）。所以边界上任何一点同时挨着三块地盘，叫"三盆性质"，和拓扑学里的"瓦达湖"是同一种怪现象。',
        en: 'For $z^3-1$ one Newton step is $z\\to\\dfrac{2z^3+1}{3z^2}$. At $z=0$ the derivative is 0, the tangent is flat and the step divides by zero; points near 0 are flung far away in one step.\n\nThe point $-2^{-1/3}\\approx-0.7937$ on the real axis lands exactly on 0 in one step. Its neighbours land all around 0 and are then sent in every direction, so all three colours crowd around it. Infinitely many points land on points like this one, and around each the same thing happens: petals on petals.\n\nA theorem of complex dynamics says that for maps like this the border of every territory is one and the same set (the Julia set). So every border point touches all three territories, the "three-basin property", the same strange phenomenon as the Lakes of Wada in topology.',
      },
    },
    {
      id: 'failure',
      title: { zh: '牛顿法什么时候会失败', en: 'When Newton’s method fails' },
      body: {
        zh: '对 $p(z)=z^3-2z+2$，一步牛顿法把 0 送到 1，又把 1 送回 0：\n\n$$0\\to1\\to0\\to1\\to\\cdots$$\n\n而且 $p\'\'(0)=0$，这个循环会把附近的点吸过来，所以 0 和 1 周围各有一整片起点永远到不了根，画板上是黑色。实际计算里，解方程的程序会检查是否收敛，不收敛就换一个起点。',
        en: 'For $p(z)=z^3-2z+2$ one Newton step sends 0 to 1 and 1 back to 0:\n\n$$0\\to1\\to0\\to1\\to\\cdots$$\n\nAnd since $p\'\'(0)=0$ the cycle pulls nearby points in, so a whole patch of starts around 0 and around 1 never reaches a root, shown in black. In practice equation solvers check for convergence and try another start when it fails.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '颜色的深浅表示什么？',
        en: 'What does the brightness show?',
      },
      answer: {
        zh: '颜色表示最后到达哪个根，亮度表示用了几步：步数越多越亮，根附近一两步就到，所以最暗。一圈圈的环是步数相同的起点。白色的细线是边界：同一个像素里的几个起点去了不同的根。',
        en: 'The colour says which root a start reaches; the brightness says how many steps it took, brighter meaning more, so starts next to a root, which arrive in a step or two, are darkest. Each ring is a set of starts needing the same number of steps. The thin white lines are the borders: starts within one pixel there head for different roots.',
      },
    },
    {
      question: {
        zh: '为什么放大到一定程度画面会变糊？',
        en: 'Why does the picture blur when I zoom far in?',
      },
      answer: {
        zh: '画板在显卡上用单精度浮点数计算，大约 7 位有效数字，所以最多放大到视野宽 0.0002。分形本身是无限细的，用更高精度就能一直放大下去。',
        en: 'The stage computes on the graphics card in single precision, about 7 significant digits, so it stops at a view 0.0002 wide. The fractal itself is infinitely fine; with more precision you could keep zooming.',
      },
    },
    {
      question: {
        zh: '这和曼德博集合有关系吗？',
        en: 'Is this related to the Mandelbrot set?',
      },
      answer: {
        zh: '有。两者都是复平面上反复迭代一个函数得到的图形，属于复动力系统。数学家研究三次方程的牛顿法时发现：让方程的系数变化，按牛顿法在哪些系数下会失败来上色，会出现曼德博集合的小复制品。',
        en: 'Yes. Both come from repeating a function on the complex plane, the subject of complex dynamics. Mathematicians studying Newton’s method for cubics found that if you vary the coefficients and colour those for which the method fails, small copies of the Mandelbrot set appear.',
      },
    },
  ],
  relatedCurves: ['parabola'],
  relatedLabs: ['zeros-bisection', 'derivative-tangent-slope'],
  sources: [
    {
      title: 'Newton fractal — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Newton_fractal',
    },
    {
      title: 'Newton’s method — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Newton%27s_method',
    },
    {
      title: 'Lakes of Wada — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Lakes_of_Wada',
    },
  ],
};
