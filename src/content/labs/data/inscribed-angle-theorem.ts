import { pick, type Lab } from '../types';

// Unit-free circle of radius 3 about O. A, B and P are placed by their polar
// angles, so each can be dragged round the circle.
const TAU = '(2 * pi)';
const wrap = (x: string) => `(${x} - ${TAU} * floor((${x}) / ${TAU}))`;
// Unsigned angle between two directions, in degrees.
const between = (u: string, v: string) =>
  `abs(atan2(sin(${v} - ${u}), cos(${v} - ${u}))) * 180 / pi`;

export const inscribedAngleTheorem: Lab = {
  slug: 'inscribed-angle-theorem',
  publication: 'public',
  levels: ['middle', 'high'],
  chapterTitle: { en: 'Inscribed angle theorem', zh: '圆周角定理' },
  title: {
    en: 'Inscribed angle theorem: half the arc it stands on',
    zh: '圆周角定理：圆周角等于所对弧的一半',
  },
  question: {
    en: 'Why does every angle drawn from the circle onto the same arc come out the same, and exactly half the central angle?',
    zh: '为什么从圆上任一点看同一段弧，张角都一样，而且恰好是圆心角的一半？',
  },
  summary: {
    en: 'Drag P around the circle: the angle APB stays fixed while P stays on the same side of AB, and it is always half the arc it stands on. Pull AB into a diameter for a right angle, or move P across the chord to get the supplement.',
    zh: '拖动圆上的点 P：只要 P 留在弦 AB 的同一侧，∠APB 就不变，并且总是所对弧的一半。把 AB 拉成直径得到直角，把 P 拖到弦的另一侧得到补角。',
  },
  keyPoints: [
    { en: 'Inscribed angle', zh: '圆周角' },
    { en: 'Central angle', zh: '圆心角' },
    { en: 'Angle in a semicircle', zh: '直径所对的圆周角' },
    { en: 'Cyclic quadrilateral', zh: '圆内接四边形' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-5, 5], y: [-4, 4], grid: false },
      params: [
        { id: 'tA', label: '\\theta_A', min: 0, max: 6.2832, step: 0.01, value: 3.6652 },
        { id: 'tB', label: '\\theta_B', min: 0, max: 6.2832, step: 0.01, value: 5.7596 },
        { id: 'tP', label: '\\theta_P', min: 0, max: 6.2832, step: 0.01, value: 1.7453 },
      ],
      scalars: [
        { id: 'ax', expr: '3 * cos(tA)' },
        { id: 'ay', expr: '3 * sin(tA)' },
        { id: 'bx', expr: '3 * cos(tB)' },
        { id: 'by', expr: '3 * sin(tB)' },
        { id: 'px', expr: '3 * cos(tP)' },
        { id: 'py', expr: '3 * sin(tP)' },
        // Directions out of P, measured from the coordinates.
        { id: 'uA', expr: 'atan2(ay - py, ax - px)' },
        { id: 'uB', expr: 'atan2(by - py, bx - px)' },
        { id: 'uO', expr: 'atan2(-py, -px)' },
        { id: 'sw', expr: 'atan2(sin(uB - uA), cos(uB - uA))' },
        { id: 'apb', expr: 'abs(sw) * 180 / pi' },
        // The arc AB that P does not sit on: anticlockwise A → B unless P is
        // on that stretch, in which case it is the other one, B → A.
        { id: 'd', expr: wrap('tB - tA') },
        { id: 'inside', expr: `${wrap('tP - tA')} < d` },
        { id: 'arcStart', expr: 'inside ? tB : tA' },
        { id: 'arcLen', expr: `inside ? ${TAU} - d : d` },
        { id: 'cen', expr: 'arcLen * 180 / pi' },
        { id: 'opa', expr: between('uO', 'uA') },
        { id: 'opb', expr: between('uO', 'uB') },
        { id: 'oap', expr: between('atan2(-ay, -ax)', 'atan2(py - ay, px - ax)') },
      ],
      objects: [
        { type: 'circle', center: [0, 0], r: 3, color: 'ink', width: 2 },
        // The arc ∠APB stands on, and the central angle that measures it.
        { type: 'arc', center: [0, 0], r: 3, start: 'arcStart', end: 'arcStart + arcLen', color: 'amber', width: 6 },
        { type: 'arc', center: [0, 0], r: 0.55, start: 'arcStart', end: 'arcStart + arcLen', color: 'amber', width: 2 },
        { type: 'segment', from: [0, 0], to: ['ax', 'ay'], color: 'amber', width: 1.8 },
        { type: 'segment', from: [0, 0], to: ['bx', 'by'], color: 'amber', width: 1.8 },
        // The diameter through P splits the proof into two isosceles triangles.
        { type: 'segment', from: ['px', 'py'], to: ['-px', '-py'], color: 'muted', dashed: true, width: 1.5 },
        { type: 'segment', from: ['ax', 'ay'], to: ['bx', 'by'], color: 'muted', width: 1.2 },
        { type: 'segment', from: ['px', 'py'], to: ['ax', 'ay'], color: 'blue', width: 2.5 },
        { type: 'segment', from: ['px', 'py'], to: ['bx', 'by'], color: 'blue', width: 2.5 },
        { type: 'arc', center: ['px', 'py'], r: 0.7, start: 'uA', end: 'uA + sw', color: 'blue', width: 2 },
        {
          type: 'text',
          at: [0, -3.6],
          text: t('AB is a diameter: right angle', 'AB 是直径：直角'),
          color: 'green',
          visible: 'abs(apb - 90) < 0.5',
        },
        { type: 'point', at: [0, 0], color: 'ink', size: 4, label: 'O' },
        { type: 'point', at: ['ax', 'ay'], color: 'green', size: 6, label: 'A', drag: { angle: 'tA', center: [0, 0] } },
        { type: 'point', at: ['bx', 'by'], color: 'green', size: 6, label: 'B', drag: { angle: 'tB', center: [0, 0] } },
        { type: 'point', at: ['px', 'py'], color: 'red', size: 7, label: 'P', drag: { angle: 'tP', center: [0, 0] } },
      ],
      readouts: [
        { label: '\\angle APB', expr: 'apb', digits: 1 },
        { label: '\\overset{\\frown}{AB}', expr: 'cen', digits: 1 },
        { label: '\\overset{\\frown}{AB} \\div \\angle APB', expr: 'apb > 0.5 ? cen / apb : 0 / 0', digits: 3, highlight: true },
        { label: '\\angle OPA', expr: 'opa', digits: 1 },
        { label: '\\angle OAP', expr: 'oap', digits: 1 },
        { label: '\\angle OPB', expr: 'opb', digits: 1 },
        {
          kind: 'status',
          label: t('∠APB is a right angle', '∠APB 是直角'),
          expr: 'abs(apb - 90) < 0.5',
          ok: t('yes: AB is a diameter', '是：AB 是直径'),
          bad: t('no', '不是'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Half the arc', zh: '弧的一半' },
      body: {
        en: 'The highlighted arc $AB$ is the one $P$ looks at, and it measures $120^\\circ$: the central angle $\\angle AOB$. From $P$ the same arc is seen under $\\angle APB=60^\\circ$, exactly half. Both are measured from the coordinates, not set.',
        zh: '高亮的弧 $AB$ 就是 $P$ "看着"的那段弧，度数是 $120^\\circ$，也就是圆心角 $\\angle AOB$。从 $P$ 看同一段弧，张角 $\\angle APB=60^\\circ$，正好一半。两个角都是按坐标量出来的，不是写死的。',
      },
      set: { tA: 3.6652, tB: 5.7596, tP: 1.7453 },
    },
    {
      title: { en: 'Move P, the angle stays', zh: '移动 P，角不变' },
      body: {
        en: 'Drag $P$ anywhere on the upper arc. The chords swing, $\\angle OPA$ and $\\angle OPB$ change, but $\\angle APB$ stays $60^\\circ$: inscribed angles on the same arc are equal.',
        zh: '把 $P$ 拖到上方这段弧的任何位置。两条弦在转，$\\angle OPA$、$\\angle OPB$ 都在变，但 $\\angle APB$ 一直是 $60^\\circ$：同弧所对的圆周角相等。',
      },
      set: { tA: 3.6652, tB: 5.7596, tP: 2.7925 },
    },
    {
      title: { en: 'Why: one isosceles triangle', zh: '为什么：一个等腰三角形' },
      body: {
        en: 'Put $P$ opposite $A$, so $PA$ passes through $O$. Then $OP=OB$ (both radii), so triangle $OPB$ is isosceles and its base angles are equal. The central angle $\\angle AOB$ is the exterior angle at $O$, so it equals the sum of the two base angles: $2\\angle OPB$. Here $\\angle OPB=60^\\circ$ and the arc is $120^\\circ$.',
        zh: '把 $P$ 放到 $A$ 的正对面，让 $PA$ 经过圆心 $O$。$OP=OB$（都是半径），所以三角形 $OPB$ 是等腰三角形，两个底角相等。圆心角 $\\angle AOB$ 是这个三角形在 $O$ 处的外角，等于两个底角之和，即 $2\\angle OPB$。此时 $\\angle OPB=60^\\circ$，弧是 $120^\\circ$。',
      },
      set: { tA: 3.6652, tB: 5.7596, tP: 0.5236 },
    },
    {
      title: { en: 'A diameter gives 90°', zh: '直径对直角' },
      body: {
        en: 'Make $AB$ a diameter. The arc it cuts off is a semicircle, $180^\\circ$, so every $P$ on the circle sees it under $90^\\circ$.',
        zh: '让 $AB$ 成为直径。它截出的弧是半圆，$180^\\circ$，所以圆上任一点 $P$ 看它都是 $90^\\circ$。',
      },
      set: { tA: 3.1416, tB: 0, tP: 1.1 },
    },
    {
      title: { en: 'Cross the chord', zh: '越过弦' },
      body: {
        en: 'Bring $A$ and $B$ back and drag $P$ onto the lower arc. Now $P$ looks at the other arc, $360^\\circ-120^\\circ=240^\\circ$, and $\\angle APB=120^\\circ$. Together with the $60^\\circ$ from above it makes $180^\\circ$: opposite angles of a quadrilateral in a circle are supplementary.',
        zh: '把 $A$、$B$ 放回原处，再把 $P$ 拖到下方的弧上。现在 $P$ 看的是另一段弧，$360^\\circ-120^\\circ=240^\\circ$，$\\angle APB=120^\\circ$。和上方的 $60^\\circ$ 合起来是 $180^\\circ$：圆内接四边形的对角互补。',
      },
      set: { tA: 3.6652, tB: 5.7596, tP: 4.7124 },
    },
  ],
  sections: [
    {
      id: 'statement',
      title: { en: 'The theorem', zh: '定理内容' },
      body: {
        en: 'An **inscribed angle** has its vertex on the circle and its sides along two chords. The arc between its sides, on the far side from the vertex, is the arc it **stands on**. Measuring an arc by its central angle:\n\n$$\\angle APB=\\tfrac12\\,\\overset{\\frown}{AB}$$\n\nTwo things follow at once: inscribed angles on the same arc are equal, and an angle on a diameter is $90^\\circ$.',
        zh: '顶点在圆上、两边都是弦的角叫**圆周角**。它两边之间、远离顶点的那段弧，就是它**所对的弧**。弧的度数用它的圆心角来量，则\n\n$$\\angle APB=\\tfrac12\\,\\overset{\\frown}{AB}$$\n\n由此立刻得到两条推论：同弧所对的圆周角相等；直径所对的圆周角是 $90^\\circ$。',
      },
    },
    {
      id: 'proof',
      title: { en: 'Proof from two facts', zh: '只用两个事实的证明' },
      body: {
        en: 'The proof needs only: base angles of an isosceles triangle are equal, and an exterior angle equals the sum of the two opposite interior angles (both follow from the angle sum $180^\\circ$).\n\n- **$O$ on a side.** Say $PA$ passes through $O$. In triangle $OPB$, $OP=OB$, so $\\angle OPB=\\angle OBP$. The central angle $\\angle AOB$ is exterior at $O$, so $\\angle AOB=2\\angle OPB=2\\angle APB$.\n- **$O$ inside the angle.** Draw the diameter $PP\'$ (dashed). It splits $\\angle APB$ into $\\angle OPA+\\angle OPB$ and the arc into two pieces. The first case applies to each piece; add them.\n- **$O$ outside the angle.** The same diameter, but now $\\angle APB=|\\angle OPA-\\angle OPB|$; subtract instead of add.\n\nOn the board, $\\angle OPA$ and $\\angle OAP$ are measured separately and always agree: that is the isosceles step.',
        zh: '证明只用到两件事：等腰三角形两底角相等；三角形的外角等于不相邻的两个内角之和（都由内角和 $180^\\circ$ 推出）。\n\n- **$O$ 在角的一边上。** 设 $PA$ 过 $O$。三角形 $OPB$ 中 $OP=OB$，所以 $\\angle OPB=\\angle OBP$。圆心角 $\\angle AOB$ 是它在 $O$ 处的外角，所以 $\\angle AOB=2\\angle OPB=2\\angle APB$。\n- **$O$ 在角的内部。** 作直径 $PP\'$（虚线）。它把 $\\angle APB$ 分成 $\\angle OPA+\\angle OPB$，把弧也分成两段。对每一段用上一种情形，再相加。\n- **$O$ 在角的外部。** 同样作直径，这时 $\\angle APB=|\\angle OPA-\\angle OPB|$，改成相减。\n\n画板上 $\\angle OPA$ 和 $\\angle OAP$ 是分别量出来的，两者始终相等，这就是等腰三角形那一步。',
      },
    },
    {
      id: 'diameter',
      title: { en: 'The angle in a semicircle', zh: '直径所对的圆周角' },
      body: {
        en: 'When $AB$ is a diameter the arc is $180^\\circ$, so $\\angle APB=90^\\circ$ for every $P$. The converse is how you find a circle\'s centre with a set square: put the right angle on the rim, mark where the sides cross it, and that chord is a diameter.',
        zh: '当 $AB$ 是直径时，弧是 $180^\\circ$，所以对每个 $P$ 都有 $\\angle APB=90^\\circ$。反过来用，就能拿三角尺找圆心：把直角顶点放在圆周上，两边与圆的交点连成的弦就是直径，两条直径的交点就是圆心。',
      },
    },
    {
      id: 'cyclic',
      title: { en: 'Quadrilaterals in a circle', zh: '圆内接四边形' },
      body: {
        en: 'Points $P$ and $Q$ on opposite sides of chord $AB$ stand on the two arcs, which add to $360^\\circ$. Halving, $\\angle APB+\\angle AQB=180^\\circ$: the opposite angles of a cyclic quadrilateral $APBQ$ are supplementary.',
        zh: '弦 $AB$ 两侧各取一点 $P$、$Q$，它们所对的是两段弧，两段弧加起来是 $360^\\circ$。各取一半，$\\angle APB+\\angle AQB=180^\\circ$：圆内接四边形 $APBQ$ 的对角互补。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'An arc measures $100^\\circ$. What is an inscribed angle standing on it?',
        zh: '一段弧的度数是 $100^\\circ$，它所对的圆周角是多少？',
      },
      choices: [
        { en: '$50^\\circ$', zh: '$50^\\circ$' },
        { en: '$100^\\circ$', zh: '$100^\\circ$' },
        { en: '$200^\\circ$', zh: '$200^\\circ$' },
        { en: '$130^\\circ$', zh: '$130^\\circ$' },
      ],
      answer: 0,
      explanation: {
        en: 'Half the arc: $50^\\circ$.',
        zh: '弧的一半：$50^\\circ$。',
      },
    },
    {
      question: {
        en: 'In the proof, why is $\\angle OPB=\\angle OBP$?',
        zh: '证明中，为什么 $\\angle OPB=\\angle OBP$？',
      },
      choices: [
        { en: '$OP$ and $OB$ are both radii', zh: '$OP$、$OB$ 都是半径' },
        { en: '$PB$ is a diameter', zh: '$PB$ 是直径' },
        { en: 'The arc is $180^\\circ$', zh: '弧是 $180^\\circ$' },
        { en: 'By the theorem itself', zh: '由圆周角定理本身' },
      ],
      answer: 0,
      explanation: {
        en: 'Two equal sides make triangle $OPB$ isosceles, so its base angles are equal. Using the theorem here would be circular.',
        zh: '两边相等，三角形 $OPB$ 是等腰三角形，底角相等。这里若用定理本身就成了循环论证。',
      },
    },
    {
      question: {
        en: 'A quadrilateral $ABCD$ is inscribed in a circle and $\\angle A=70^\\circ$. What is $\\angle C$?',
        zh: '四边形 $ABCD$ 内接于圆，$\\angle A=70^\\circ$，$\\angle C$ 是多少？',
      },
      choices: [
        { en: '$110^\\circ$', zh: '$110^\\circ$' },
        { en: '$70^\\circ$', zh: '$70^\\circ$' },
        { en: '$140^\\circ$', zh: '$140^\\circ$' },
        { en: '$35^\\circ$', zh: '$35^\\circ$' },
      ],
      answer: 0,
      explanation: {
        en: '$A$ and $C$ stand on the two arcs cut by $BD$, which add to $360^\\circ$, so $\\angle A+\\angle C=180^\\circ$.',
        zh: '$A$、$C$ 分别对着 $BD$ 截出的两段弧，两段弧和为 $360^\\circ$，所以 $\\angle A+\\angle C=180^\\circ$。',
      },
    },
  ],
  resultTex: '\\angle APB = \\tfrac12\\,\\overset{\\frown}{AB}',
  related: ['pythagorean-theorem-rearrangement', 'unit-circle-sine'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Show the inscribed angle theorem: a point P moves around a circle while the angle APB on a fixed arc stays the same, equal to half the central angle; prove it with the isosceles triangle formed by two radii, then show a diameter giving a right angle.',
    zh: '演示圆周角定理：点 P 在圆上移动，对着固定弧 AB 的 ∠APB 保持不变，且等于圆心角的一半；用两条半径构成的等腰三角形证明，最后展示直径所对的圆周角是直角。',
  },
};
