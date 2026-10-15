import { pick, type Lab } from '../types';

export const parabolaFocalChord: Lab = {
  slug: 'parabola-focal-chord',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Parabola', zh: '抛物线与焦点弦' },
  title: {
    en: 'The parabola: equal distances to a focus and a directrix',
    zh: '抛物线：到焦点与到准线的距离相等',
  },
  question: {
    en: 'Why is the focal radius of y² = 2px just x + p/2, and how long is a chord through the focus?',
    zh: '为什么抛物线 y² = 2px 的焦半径就是 x + p/2？过焦点的弦有多长？',
  },
  summary: {
    en: 'Drag a point along y² = 2px and compare its distance to the focus with its distance to the directrix: they are always equal. Then turn a chord through the focus and see why its length is x₁ + x₂ + p = 2p / sin²α, shortest when it stands upright.',
    zh: '让点沿 y² = 2px 移动，比较它到焦点和到准线的距离：两者始终相等。再转动一条过焦点的弦，看它的长度为什么是 x₁ + x₂ + p = 2p / sin²α，竖直时最短。',
  },
  keyPoints: [
    { en: 'Focus and directrix', zh: '焦点与准线' },
    { en: 'Standard equation y² = 2px', zh: '标准方程 y² = 2px' },
    { en: 'Focal radius', zh: '焦半径' },
    { en: 'Focal chord and latus rectum', zh: '焦点弦与通径' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-3, 9], y: [-6, 6] },
      params: [
        { id: 'p', label: 'p', min: 0.5, max: 4, step: 0.1, value: 2 },
        { id: 'yp', label: 'y_P', min: -5, max: 5, step: 0.1, value: 2 },
        {
          id: 'deg',
          label: '\\alpha\\,(^\\circ)',
          min: 15,
          max: 165,
          step: 5,
          value: 60,
          bands: [
            { from: 90, to: 90, label: t('latus rectum', '通径'), color: 'green' },
          ],
        },
      ],
      scalars: [
        { id: 'f', expr: 'p / 2' },
        { id: 'xp', expr: 'yp^2 / (2 * p)' },
        { id: 'PF', expr: 'hypot(xp - f, yp)' },
        { id: 'PD', expr: 'xp + f' },
        { id: 'al', expr: 'deg * pi / 180' },
        // Along the chord x = p/2 + s·cos α, y = s·sin α the parabola gives
        // s = p / (1 − cos α) and s = −p / (1 + cos α).
        { id: 'tA', expr: 'p / (1 - cos(al))' },
        { id: 'tB', expr: 'p / (1 + cos(al))' },
        { id: 'ax', expr: 'f + tA * cos(al)' },
        { id: 'ay', expr: 'tA * sin(al)' },
        { id: 'bx', expr: 'f - tB * cos(al)' },
        { id: 'by', expr: '-tB * sin(al)' },
      ],
      objects: [
        {
          type: 'line',
          through: ['-f', 0],
          to: ['-f', 1],
          color: 'green',
          dashed: true,
          width: 2,
        },
        { type: 'text', at: ['-f - 0.15', 5.4], text: t('directrix x = −p/2', '准线 x = −p/2'), color: 'green', anchor: 'end' },
        {
          type: 'parametric',
          x: 's^2 / (2 * p)',
          y: 's',
          variable: 's',
          range: [-9, 9],
          samples: 300,
          color: 'primary',
          width: 3,
        },
        // Focal chord AB and the drops from A and B to the directrix.
        { type: 'segment', from: ['ax', 'ay'], to: ['bx', 'by'], color: 'amber', width: 2.4 },
        { type: 'segment', from: ['ax', 'ay'], to: ['-f', 'ay'], color: 'amber', dashed: true, width: 1.2 },
        { type: 'segment', from: ['bx', 'by'], to: ['-f', 'by'], color: 'amber', dashed: true, width: 1.2 },
        { type: 'point', at: ['ax', 'ay'], color: 'amber', size: 5, label: 'A' },
        { type: 'point', at: ['bx', 'by'], color: 'amber', size: 5, label: 'B' },
        // The defining pair of distances for P.
        { type: 'segment', from: ['xp', 'yp'], to: ['f', 0], color: 'blue', width: 2.2, label: 'PF' },
        { type: 'segment', from: ['xp', 'yp'], to: ['-f', 'yp'], color: 'green', width: 2.2, label: 'PD' },
        { type: 'point', at: ['-f', 'yp'], color: 'green', size: 4, label: 'D' },
        { type: 'point', at: ['f', 0], color: 'ink', size: 6, label: 'F' },
        {
          type: 'point',
          at: ['xp', 'yp'],
          color: 'red',
          size: 6,
          label: 'P',
          drag: { y: 'yp' },
        },
      ],
      readouts: [
        { label: '|PF|', expr: 'PF', digits: 3 },
        { label: '|PD| = x_P + \\tfrac{p}{2}', expr: 'PD', digits: 3 },
        { label: '|AF|', expr: 'tA', digits: 3 },
        { label: '|BF|', expr: 'tB', digits: 3 },
        { label: '|AB|', expr: 'tA + tB', digits: 3, highlight: true },
        { label: '\\dfrac{2p}{\\sin^2\\alpha}', expr: '2 * p / sin(al)^2', digits: 3 },
        { label: '\\dfrac{1}{|AF|} + \\dfrac{1}{|BF|}', expr: '1 / tA + 1 / tB', digits: 3 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Same distance to F and to the line', zh: '到 F 和到直线一样远' },
      body: {
        en: 'With $p=2$ the focus is $F=(1,0)$ and the directrix is $x=-1$. At $P=(1,2)$: $|PF|=2$ and the distance to the directrix is $|PD|=2$. That equality is the whole definition of the parabola.',
        zh: '$p=2$ 时焦点是 $F=(1,0)$，准线是 $x=-1$。在 $P=(1,2)$ 处：$|PF|=2$，到准线的距离 $|PD|=2$。抛物线的定义就是这一句"相等"。',
      },
      set: { p: 2, yp: 2, deg: 60 },
    },
    {
      title: { en: 'A distance you can read off x', zh: '焦半径直接看横坐标' },
      body: {
        en: 'Drag $P$ up to $y_P=4$, so $x_P=4$. Computing $|PF|=\\sqrt{(4-1)^2+4^2}=5$ takes a square root, but $|PD|=x_P+\\frac{p}{2}=4+1=5$ does not. Swapping one distance for the other is the main trick with parabolas.',
        zh: '把 $P$ 拖到 $y_P=4$，此时 $x_P=4$。直接算 $|PF|=\\sqrt{(4-1)^2+4^2}=5$ 要开方，而 $|PD|=x_P+\\frac{p}{2}=4+1=5$ 不用。把一种距离换成另一种，是处理抛物线的头号技巧。',
      },
      set: { p: 2, yp: 4, deg: 60 },
    },
    {
      title: { en: 'A chord through the focus', zh: '过焦点的弦' },
      body: {
        en: 'The amber chord meets the parabola at $A$ and $B$ at $\\alpha=60^\\circ$. Each focal radius equals its own drop to the directrix, so $|AB|=x_A+x_B+p$. Here $|AF|=4$, $|BF|=1.333$ and $|AB|=5.333$, matching $\\frac{2p}{\\sin^2\\alpha}=\\frac{4}{3/4}$.',
        zh: '$\\alpha=60^\\circ$ 时，琥珀色的弦与抛物线交于 $A$、$B$。每条焦半径都等于各自到准线的距离，所以 $|AB|=x_A+x_B+p$。这里 $|AF|=4$，$|BF|=1.333$，$|AB|=5.333$，正好等于 $\\frac{2p}{\\sin^2\\alpha}=\\frac{4}{3/4}$。',
      },
      set: { p: 2, yp: 4, deg: 60 },
    },
    {
      title: { en: 'Upright: the shortest focal chord', zh: '竖直时最短：通径' },
      body: {
        en: 'At $\\alpha=90^\\circ$ the chord is the latus rectum: $|AF|=|BF|=p=2$ and $|AB|=2p=4$, the shortest of all, since $\\sin^2\\alpha\\le1$. Turn it to $30^\\circ$ and it grows to $16$. Through all of this, $\\frac{1}{|AF|}+\\frac{1}{|BF|}$ stays at $\\frac{2}{p}=1$.',
        zh: '$\\alpha=90^\\circ$ 时这条弦叫通径：$|AF|=|BF|=p=2$，$|AB|=2p=4$，因为 $\\sin^2\\alpha\\le1$，它是所有焦点弦里最短的。转到 $30^\\circ$ 时长度增到 $16$。整个过程中 $\\frac{1}{|AF|}+\\frac{1}{|BF|}$ 始终等于 $\\frac{2}{p}=1$。',
      },
      set: { p: 2, yp: 2, deg: 90 },
    },
  ],
  sections: [
    {
      id: 'definition',
      title: { en: 'Definition and equation', zh: '定义与方程' },
      body: {
        en: 'A **parabola** is the set of points equally far from a fixed point $F$ (the focus) and a fixed line $l$ (the directrix) not through $F$. Let $p$ be the distance from $F$ to $l$, and put $F=\\left(\\frac p2,0\\right)$, $l:\\ x=-\\frac p2$. Then\n\n$$\\sqrt{\\left(x-\\tfrac p2\\right)^2+y^2}=x+\\tfrac p2$$\n\nSquaring both sides, the $x^2$ and $\\frac{p^2}{4}$ terms cancel and leave\n\n$$y^2=2px\\qquad(p>0)$$',
        zh: '平面内到一个定点 $F$（焦点）和一条不过 $F$ 的定直线 $l$（准线）距离相等的点的集合叫**抛物线**。设 $F$ 到 $l$ 的距离为 $p$，取 $F=\\left(\\frac p2,0\\right)$，$l:\\ x=-\\frac p2$，则\n\n$$\\sqrt{\\left(x-\\tfrac p2\\right)^2+y^2}=x+\\tfrac p2$$\n\n两边平方，$x^2$ 和 $\\frac{p^2}{4}$ 两项消掉，得到\n\n$$y^2=2px\\qquad(p>0)$$',
      },
    },
    {
      id: 'focal-radius',
      title: { en: 'Focal radius', zh: '焦半径公式' },
      body: {
        en: 'For $P(x_0,y_0)$ on $y^2=2px$:\n\n$$|PF|=x_0+\\frac p2$$\n\nThis is not a new fact, only the definition read the other way: the distance to the focus is replaced by the distance to the directrix, which is a horizontal length.',
        zh: '对 $y^2=2px$ 上的点 $P(x_0,y_0)$：\n\n$$|PF|=x_0+\\frac p2$$\n\n这不是新结论，只是把定义反过来用：把到焦点的距离换成到准线的距离，而后者只是一段水平长度。',
      },
    },
    {
      id: 'chord',
      title: { en: 'Length of a focal chord', zh: '焦点弦长' },
      body: {
        en: 'Add the two focal radii: $|AB|=|AF|+|BF|=x_1+x_2+p$.\n\nFor the angle, write the chord as $x=\\frac p2+s\\cos\\alpha$, $y=s\\sin\\alpha$ and substitute: $s^2\\sin^2\\alpha-2ps\\cos\\alpha-p^2=0$, whose roots are $s=\\dfrac{p}{1-\\cos\\alpha}$ and $s=-\\dfrac{p}{1+\\cos\\alpha}$. So\n\n$$|AB|=\\frac{p}{1-\\cos\\alpha}+\\frac{p}{1+\\cos\\alpha}=\\frac{2p}{\\sin^2\\alpha}$$\n\nand $\\dfrac{1}{|AF|}+\\dfrac{1}{|BF|}=\\dfrac{(1-\\cos\\alpha)+(1+\\cos\\alpha)}{p}=\\dfrac2p$ for every direction.',
        zh: '把两条焦半径相加：$|AB|=|AF|+|BF|=x_1+x_2+p$。\n\n要用倾斜角表示，把弦写成 $x=\\frac p2+s\\cos\\alpha$，$y=s\\sin\\alpha$ 代入方程：$s^2\\sin^2\\alpha-2ps\\cos\\alpha-p^2=0$，两根是 $s=\\dfrac{p}{1-\\cos\\alpha}$ 和 $s=-\\dfrac{p}{1+\\cos\\alpha}$。于是\n\n$$|AB|=\\frac{p}{1-\\cos\\alpha}+\\frac{p}{1+\\cos\\alpha}=\\frac{2p}{\\sin^2\\alpha}$$\n\n并且对任何方向都有 $\\dfrac{1}{|AF|}+\\dfrac{1}{|BF|}=\\dfrac{(1-\\cos\\alpha)+(1+\\cos\\alpha)}{p}=\\dfrac2p$。',
      },
    },
    {
      id: 'reflection',
      title: { en: 'Why dishes are parabolic', zh: '为什么天线锅是抛物面' },
      body: {
        en: 'Since $|PF|=|PD|$, triangle $PFD$ is isosceles, and the line through $P$ that bisects $\\angle FPD$ is the perpendicular bisector of $FD$. Every other point $Q$ of that line is equally far from $F$ and $D$ too, but $Q$ is farther from $D$ than from the directrix, so $Q$ lies outside the parabola: the line touches the curve only at $P$, which makes it the tangent. So the tangent bisects the angle between $PF$ and the horizontal through $P$. A ray coming in parallel to the axis therefore reflects through the focus, and light from a bulb at the focus leaves as a parallel beam. Satellite dishes, car headlights and solar cookers all use this.',
        zh: '因为 $|PF|=|PD|$，三角形 $PFD$ 是等腰三角形，过 $P$ 平分 $\\angle FPD$ 的直线就是 $FD$ 的垂直平分线。这条直线上的其他点 $Q$ 到 $F$、$D$ 的距离也相等，但 $Q$ 到 $D$ 的距离大于它到准线的距离，所以 $Q$ 在抛物线外部：这条线只在 $P$ 处碰到曲线，它就是切线。于是切线平分 $PF$ 与过 $P$ 的水平线所成的角。因此，平行于对称轴射入的光线反射后都经过焦点，而焦点处的光源发出的光反射后成为平行光束。卫星天线、车灯和太阳灶都用到了这一点。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A point $P$ on $y^2=8x$ has $x=3$. What is $|PF|$?',
        zh: '抛物线 $y^2=8x$ 上一点 $P$ 的横坐标为 $3$，则 $|PF|=$？',
      },
      choices: [
        { en: '$5$', zh: '$5$' },
        { en: '$3$', zh: '$3$' },
        { en: '$7$', zh: '$7$' },
        { en: '$\\sqrt{33}$', zh: '$\\sqrt{33}$' },
      ],
      answer: 0,
      explanation: {
        en: '$2p=8$, so $p=4$ and $|PF|=x+\\frac p2=3+2=5$.',
        zh: '$2p=8$，$p=4$，$|PF|=x+\\frac p2=3+2=5$。',
      },
    },
    {
      question: {
        en: 'A chord of $y^2=4x$ through the focus has $x_1+x_2=6$. How long is it?',
        zh: '过抛物线 $y^2=4x$ 焦点的弦 $AB$ 满足 $x_1+x_2=6$，则 $|AB|=$？',
      },
      choices: [
        { en: '$8$', zh: '$8$' },
        { en: '$6$', zh: '$6$' },
        { en: '$10$', zh: '$10$' },
        { en: '$7$', zh: '$7$' },
      ],
      answer: 0,
      explanation: {
        en: '$p=2$, so $|AB|=x_1+x_2+p=6+2=8$.',
        zh: '$p=2$，$|AB|=x_1+x_2+p=6+2=8$。',
      },
    },
    {
      question: {
        en: 'What is the shortest chord of $y^2=2px$ through the focus?',
        zh: '抛物线 $y^2=2px$ 所有过焦点的弦中，最短的长度是？',
      },
      choices: [
        { en: '$2p$', zh: '$2p$' },
        { en: '$p$', zh: '$p$' },
        { en: '$4p$', zh: '$4p$' },
        { en: '$\\frac p2$', zh: '$\\frac p2$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\frac{2p}{\\sin^2\\alpha}$ is smallest when $\\sin^2\\alpha=1$: the upright chord, of length $2p$.',
        zh: '$\\frac{2p}{\\sin^2\\alpha}$ 在 $\\sin^2\\alpha=1$ 时最小，即竖直的通径，长 $2p$。',
      },
    },
  ],
  resultTex: '|PF| = |PD| = x + \\tfrac{p}{2}',
  curveSlugs: ['parabola'],
  related: ['ellipse-definition', 'conic-sections-eccentricity'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'For y² = 4x with focus (1, 0) and directrix x = −1, move a point and show |PF| = |PD| (2 at (1, 2), 5 at (4, 4)). Then rotate a chord through the focus: at 60° it is 5.333 = 4 + 1.333, upright it is the latus rectum of length 4, and 1/|AF| + 1/|BF| stays 1.',
    zh: '对 y² = 4x（焦点 (1, 0)，准线 x = −1），移动一点并展示 |PF| = |PD|（(1, 2) 处为 2，(4, 4) 处为 5）。再转动一条过焦点的弦：60° 时长 5.333 = 4 + 1.333，竖直时是长为 4 的通径，并且 1/|AF| + 1/|BF| 始终等于 1。',
  },
};
