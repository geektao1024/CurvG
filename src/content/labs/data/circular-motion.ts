import type { Lab } from '../types';

export const circularMotion: Lab = {
  slug: 'circular-motion',
  publication: 'public',
  primaryCategoryId: 'harmonic',
  additionalCategoryIds: ['parametric'],
  levels: ['high'],
  chapterTitle: { en: 'Circular motion', zh: '匀速圆周运动' },
  title: {
    en: 'Uniform circular motion and centripetal acceleration',
    zh: '匀速圆周运动：速度不变，为什么还有加速度',
  },
  question: {
    en: 'If the speed never changes, why does a body moving in a circle accelerate?',
    zh: '速度大小一直不变，做圆周运动的物体为什么还有加速度？',
  },
  summary: {
    en: 'Drag a body round a circle and change the radius and angular speed. The velocity arrow stays tangent and the same length; the acceleration arrow always points to the centre with size ω²r.',
    zh: '拖着物体绕圆转，改变半径和角速度。速度箭头始终沿切线、长度不变；加速度箭头始终指向圆心，大小为 ω²r。',
  },
  keyPoints: [
    { en: 'Angular speed', zh: '角速度与周期' },
    { en: 'v = ωr', zh: '线速度 v = ωr' },
    { en: 'Centripetal acceleration', zh: '向心加速度' },
    { en: 'Centripetal force', zh: '向心力' },
  ],
  board: () => {
    return {
      view: { x: [-4, 4], y: [-3.3, 3.3] },
      params: [
        {
          id: 'th',
          label: '\\varphi',
          min: 0,
          max: 6.2832,
          step: 0.01,
          value: 0.6,
          play: 8,
        },
        { id: 'r', label: 'r', min: 0.5, max: 3, step: 0.1, value: 2 },
        { id: 'w', label: '\\omega', min: 0.2, max: 3, step: 0.1, value: 1 },
        { id: 'm', label: 'm', min: 0.5, max: 5, step: 0.5, value: 1 },
      ],
      scalars: [
        { id: 'px', expr: 'r * cos(th)' },
        { id: 'py', expr: 'r * sin(th)' },
        { id: 'v', expr: 'w * r' },
        { id: 'ac', expr: 'w^2 * r' },
        // Arrow lengths on screen, capped so they stay inside the board.
        { id: 'lv', expr: 'min(0.6 * v, 2.4)' },
        { id: 'la', expr: 'min(0.3 * ac, r * 0.9)' },
      ],
      objects: [
        { type: 'circle', center: [0, 0], r: 'r', color: 'muted', width: 1.5, dashed: true },
        { type: 'arc', center: [0, 0], r: 'min(0.5, r * 0.4)', start: 0, end: 'th', color: 'primary', width: 2 },
        { type: 'segment', from: [0, 0], to: ['px', 'py'], color: 'ink', width: 1.5, label: 'r' },
        {
          type: 'segment',
          from: ['px', 'py'],
          to: ['px - lv * sin(th)', 'py + lv * cos(th)'],
          color: 'blue',
          width: 3,
          arrow: true,
          label: 'v',
        },
        {
          type: 'segment',
          from: ['px', 'py'],
          to: ['px - la * cos(th)', 'py - la * sin(th)'],
          color: 'red',
          width: 3,
          arrow: true,
          label: 'a',
        },
        { type: 'point', at: [0, 0], color: 'ink', size: 3 },
        { type: 'point', at: ['px', 'py'], color: 'primary', size: 8, drag: { angle: 'th' } },
      ],
      readouts: [
        { label: 'v = \\omega r', expr: 'v', digits: 2 },
        { label: 'a = \\omega^2 r', expr: 'ac', digits: 2, highlight: true },
        { label: 'T = 2\\pi/\\omega', expr: '2 * pi / w', digits: 2 },
        { label: 'F = m\\omega^2 r', expr: 'm * ac', digits: 2 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'One radian per second', zh: '每秒转 1 弧度' },
      body: {
        en: 'With $r=2\\,\\text{m}$ and $\\omega=1\\,\\text{rad/s}$ the body covers $2\\,\\text{m}$ of arc each second, so $v=\\omega r=2\\,\\text{m/s}$. One lap takes $T=2\\pi\\approx6.28\\,\\text{s}$, and the acceleration toward the centre is $\\omega^2r=2\\,\\text{m/s}^2$.',
        zh: '$r=2\\,\\text{m}$、$\\omega=1\\,\\text{rad/s}$ 时，物体每秒走过 $2\\,\\text{m}$ 的弧长，所以 $v=\\omega r=2\\,\\text{m/s}$。转一圈用时 $T=2\\pi\\approx6.28\\,\\text{s}$，指向圆心的加速度是 $\\omega^2r=2\\,\\text{m/s}^2$。',
      },
      set: { r: 2, w: 1, m: 1 },
    },
    {
      title: { en: 'Spin twice as fast', zh: '转快一倍' },
      body: {
        en: 'Double $\\omega$ to $2$. The speed doubles to $4\\,\\text{m/s}$, but the acceleration quadruples to $8\\,\\text{m/s}^2$: it grows with $\\omega^2$.',
        zh: '把 $\\omega$ 加倍到 $2$。速度加倍到 $4\\,\\text{m/s}$，加速度却变成 $8\\,\\text{m/s}^2$，是原来的 4 倍，因为它和 $\\omega^2$ 成正比。',
      },
      set: { r: 2, w: 2, m: 1 },
    },
    {
      title: { en: 'Same speed, tighter turn', zh: '速度相同，弯更急' },
      body: {
        en: 'Now $r=1$ and $\\omega=2$: the speed is back to $2\\,\\text{m/s}$, as in the first step, but the acceleration is $4\\,\\text{m/s}^2$, twice as much. At fixed speed $a=\\dfrac{v^2}{r}$: halve the radius, double the acceleration.',
        zh: '令 $r=1$、$\\omega=2$：速度又回到 $2\\,\\text{m/s}$，和第一步相同，但加速度是 $4\\,\\text{m/s}^2$，翻了一倍。速度一定时 $a=\\dfrac{v^2}{r}$，半径减半，加速度加倍。',
      },
      set: { r: 1, w: 2, m: 1 },
    },
    {
      title: { en: 'The force that does it', zh: '提供它的那个力' },
      body: {
        en: 'Give the body a mass of $2\\,\\text{kg}$ at $r=2$, $\\omega=2$. Something must pull it inward with $F=m\\omega^2r=2\\times4\\times2=16\\,\\text{N}$: a string, friction, or gravity. Cut the string and the body flies off along the blue arrow.',
        zh: '让质量为 $2\\,\\text{kg}$ 的物体在 $r=2$、$\\omega=2$ 下转动，必须有东西以 $F=m\\omega^2r=2\\times4\\times2=16\\,\\text{N}$ 把它往里拉，可能是绳子、摩擦力或引力。剪断绳子，物体就沿蓝色箭头的方向飞出去。',
      },
      set: { r: 2, w: 2, m: 2 },
    },
  ],
  sections: [
    {
      id: 'describe',
      title: { en: 'Describing motion on a circle', zh: '怎样描述圆周运动' },
      body: {
        en: 'The angle swept per second is the **angular speed** $\\omega$ (rad/s). One lap is $2\\pi$ radians, so the **period** is $T=\\dfrac{2\\pi}{\\omega}$ and the frequency $f=\\dfrac1T$. An angle of $\\varphi$ radians on a circle of radius $r$ is an arc of length $r\\varphi$, which gives the speed along the path:\n\n$$v=\\omega r$$',
        zh: '每秒转过的角度叫**角速度** $\\omega$（单位 rad/s）。一圈是 $2\\pi$ 弧度，所以**周期** $T=\\dfrac{2\\pi}{\\omega}$，频率 $f=\\dfrac1T$。半径为 $r$ 的圆上，$\\varphi$ 弧度对应的弧长是 $r\\varphi$，于是沿轨迹的速度是：\n\n$$v=\\omega r$$',
      },
    },
    {
      id: 'acceleration',
      title: { en: 'Turning is accelerating', zh: '转弯就是在加速' },
      body: {
        en: 'Velocity is a vector: it has a direction. On the circle the direction turns all the time even though the length stays put, so the velocity changes, and a change of velocity is an acceleration. The change always points inward, toward the centre:\n\n$$a=\\omega^2r=\\frac{v^2}{r}$$\n\nIt is at $90^\\circ$ to the velocity, which is exactly why it changes the direction and not the speed.',
        zh: '速度是矢量，有方向。在圆周上，速度的长度不变，方向却时刻在转，所以速度在变化，而速度变化就是加速度。这个变化始终指向圆心：\n\n$$a=\\omega^2r=\\frac{v^2}{r}$$\n\n它与速度垂直，正因为垂直，它只改变方向、不改变大小。',
      },
    },
    {
      id: 'force',
      title: { en: 'Centripetal force is a job, not a new force', zh: '向心力是一个"角色"，不是新的力' },
      body: {
        en: 'Newton\'s second law says an inward acceleration needs an inward net force, $F=m\\omega^2r$. It is always provided by a real force: string tension for a ball on a string, friction for a car on a bend, gravity for a satellite. When a question asks for the centripetal force, find which real forces add up toward the centre.',
        zh: '由牛顿第二定律，指向圆心的加速度需要指向圆心的合力，$F=m\\omega^2r$。它总是由真实的力来提供：绳拉小球时是拉力，汽车转弯时是摩擦力，卫星绕地球时是万有引力。题目问向心力时，要找的是哪些真实的力在圆心方向上的合力。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A wheel turns at $\\omega=4\\,\\text{rad/s}$. A point $0.5\\,\\text{m}$ from the axle moves at what speed?',
        zh: '车轮以 $\\omega=4\\,\\text{rad/s}$ 转动，离轴 $0.5\\,\\text{m}$ 的点速度是多少？',
      },
      choices: [
        { en: '$8\\,\\text{m/s}$', zh: '$8\\,\\text{m/s}$' },
        { en: '$2\\,\\text{m/s}$', zh: '$2\\,\\text{m/s}$' },
        { en: '$0.125\\,\\text{m/s}$', zh: '$0.125\\,\\text{m/s}$' },
        { en: '$4.5\\,\\text{m/s}$', zh: '$4.5\\,\\text{m/s}$' },
      ],
      answer: 1,
      explanation: {
        en: '$v=\\omega r=4\\times0.5=2\\,\\text{m/s}$.',
        zh: '$v=\\omega r=4\\times0.5=2\\,\\text{m/s}$。',
      },
    },
    {
      question: {
        en: 'A car takes a bend at constant speed. If it goes twice as fast round the same bend, the friction needed is',
        zh: '汽车以恒定速率过弯。如果以两倍速率通过同一个弯道，需要的摩擦力变为',
      },
      choices: [
        { en: 'the same', zh: '不变' },
        { en: 'twice as large', zh: '原来的 2 倍' },
        { en: 'four times as large', zh: '原来的 4 倍' },
        { en: 'half as large', zh: '原来的一半' },
      ],
      answer: 2,
      explanation: {
        en: '$F=\\dfrac{mv^2}{r}$: doubling $v$ multiplies the force by $4$. That is why speed limits on bends are strict.',
        zh: '$F=\\dfrac{mv^2}{r}$，$v$ 加倍，力变为 $4$ 倍。这就是弯道限速严格的原因。',
      },
    },
    {
      question: {
        en: 'In uniform circular motion, which quantity is constant?',
        zh: '匀速圆周运动中，哪个量保持不变？',
      },
      choices: [
        { en: 'The velocity', zh: '速度' },
        { en: 'The acceleration', zh: '加速度' },
        { en: 'The speed', zh: '速率（速度大小）' },
        { en: 'The net force', zh: '合力' },
      ],
      answer: 2,
      explanation: {
        en: 'Velocity, acceleration and force all keep turning direction. Only their sizes, including the speed, stay fixed.',
        zh: '速度、加速度和合力的方向都在不断变化，只有它们的大小（包括速率）不变。',
      },
    },
  ],
  resultTex: 'a = \\omega^2 r = \\dfrac{v^2}{r}',
  related: ['unit-circle-sine', 'projectile-motion', 'uniform-acceleration-vt'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Explain uniform circular motion: a body on a circle of radius 2 m at ω = 1 rad/s, with a tangent velocity arrow of constant length and a red acceleration arrow toward the centre. Show v = ωr, a = ω²r = v²/r, what happens when ω doubles (a × 4) and when r halves at the same speed (a × 2), and end with F = mω²r = 16 N for 2 kg.',
    zh: '讲解匀速圆周运动：物体在半径 2 米的圆上以 ω = 1 rad/s 转动，切向的速度箭头长度不变，红色加速度箭头指向圆心。展示 v = ωr、a = ω²r = v²/r，ω 加倍时 a 变为 4 倍，速度不变而半径减半时 a 变为 2 倍，最后算出 2 kg 物体需要 F = mω²r = 16 N 的向心力。',
  },
};
