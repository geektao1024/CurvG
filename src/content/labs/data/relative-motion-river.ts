import { pick, type Lab } from '../types';

/** River width in metres. */
const D = 6;

export const relativeMotionRiver: Lab = {
  slug: 'relative-motion-river',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Crossing a river', zh: '相对运动：小船过河' },
  title: {
    en: 'Relative motion: steering a boat across a river',
    zh: '相对运动：小船怎样过河',
  },
  question: {
    en: 'Which way should a boat point to cross fastest, and which way to land straight across?',
    zh: '小船船头朝哪儿，过河最快？朝哪儿，才能到达正对岸？',
  },
  summary: {
    en: 'Set the boat\'s speed, its heading and the current. The boat\'s velocity over the ground is its velocity through the water plus the water\'s: watch the triangle of arrows decide the crossing time and how far downstream it lands.',
    zh: '设定船速、船头方向和水流速度。小船对地的速度，等于它相对水的速度加上水的速度：看这组箭头三角形怎样决定过河时间和被冲到下游多远。',
  },
  keyPoints: [
    { en: 'Adding velocities', zh: '速度的合成' },
    { en: 'Shortest time', zh: '最短过河时间' },
    { en: 'Shortest path', zh: '最短过河位移' },
    { en: 'Frames of reference', zh: '参考系' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-7, 17], y: [-2.5, 8.5] },
      params: [
        { id: 'u', label: 'v_{\\text{boat}}', min: 1, max: 5, step: 0.5, value: 3 },
        {
          id: 'deg',
          label: '\\theta\\,(^\\circ)',
          min: 30,
          max: 150,
          step: 1,
          value: 90,
          bands: [{ from: 90, to: 90, label: '90°', color: 'green' }],
        },
        { id: 'w', label: 'v_{\\text{water}}', min: 0, max: 4, step: 0.5, value: 2 },
        { id: 'T', label: 't', min: 0, max: 12, step: 0.05, value: 12, play: 6 },
      ],
      scalars: [
        { id: 'ph', expr: 'deg * pi / 180' },
        { id: 'vx', expr: 'u * cos(ph) + w' },
        { id: 'vy', expr: 'u * sin(ph)' },
        { id: 'tc', expr: `${D} / vy` },
        { id: 'tt', expr: 'min(T, tc)' },
        { id: 'drift', expr: 'vx * tc' },
        { id: 'k', expr: '0.8' },
      ],
      objects: [
        {
          type: 'polygon',
          points: [
            [-7, 0],
            [17, 0],
            [17, D],
            [-7, D],
          ],
          fill: true,
          color: 'blue',
          opacity: 0.1,
          width: 0.5,
        },
        { type: 'segment', from: [-7, 0], to: [17, 0], color: 'ink', width: 2 },
        { type: 'segment', from: [-7, D], to: [17, D], color: 'ink', width: 2 },
        { type: 'text', at: [16.6, 0.5], text: t('water →', '水流 →'), color: 'blue', anchor: 'end' },
        { type: 'segment', from: [0, 0], to: ['drift', D], color: 'muted', dashed: true, width: 1.5 },
        { type: 'segment', from: [0, 0], to: ['k * u * cos(ph)', 'k * vy'], color: 'green', width: 2.5, arrow: true, label: t('boat', '船') },
        {
          type: 'segment',
          from: ['k * u * cos(ph)', 'k * vy'],
          to: ['k * vx', 'k * vy'],
          color: 'blue',
          width: 2.5,
          arrow: true,
          label: t('water', '水'),
          visible: 'w > 0.01',
        },
        { type: 'segment', from: [0, 0], to: ['k * vx', 'k * vy'], color: 'primary', width: 3, arrow: true },
        { type: 'point', at: [0, D], color: 'green', size: 4, hollow: true, label: t('opposite', '正对岸') },
        { type: 'point', at: ['vx * tt', 'vy * tt'], color: 'primary', size: 7 },
      ],
      readouts: [
        { label: 't_{\\text{cross}}', expr: 'tc', digits: 2 },
        { label: t('\\text{drift}', '\\text{漂移}'), expr: 'drift', digits: 2, highlight: true },
        { label: 'v_{\\text{ground}}', expr: 'hypot(vx, vy)', digits: 2 },
        {
          kind: 'status',
          label: t('Landing', '靠岸位置'),
          expr: 'abs(drift) < 0.1',
          ok: t('straight across', '正对岸'),
          bad: t('off to one side', '偏离正对岸'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Point straight across', zh: '船头垂直河岸' },
      body: {
        en: 'The river is $6\\,\\text{m}$ wide. Rowing at $3\\,\\text{m/s}$ straight across takes $6/3=2\\,\\text{s}$, but the $2\\,\\text{m/s}$ current carries the boat $2\\times2=4\\,\\text{m}$ downstream in that time.',
        zh: '河宽 $6\\,\\text{m}$。以 $3\\,\\text{m/s}$ 船头垂直河岸划，用时 $6/3=2\\,\\text{s}$；但这 $2\\,\\text{s}$ 里，$2\\,\\text{m/s}$ 的水流把船冲到下游 $2\\times2=4\\,\\text{m}$ 处。',
      },
      set: { u: 3, deg: 90, w: 2, T: 12 },
    },
    {
      title: { en: 'A faster current', zh: '水流变快了' },
      body: {
        en: 'Double the current to $4\\,\\text{m/s}$. The crossing still takes $2\\,\\text{s}$, because the current only pushes sideways; the boat just lands $8\\,\\text{m}$ downstream. Pointing straight across is always the **fastest** crossing.',
        zh: '把水速加到 $4\\,\\text{m/s}$。过河仍然用 $2\\,\\text{s}$，因为水流只沿河岸方向推船，船只是落在下游 $8\\,\\text{m}$ 处。船头垂直河岸，过河时间**最短**。',
      },
      set: { u: 3, deg: 90, w: 4, T: 12 },
    },
    {
      title: { en: 'Aim upstream to land opposite', zh: '斜向上游，到达正对岸' },
      body: {
        en: 'Back to a $2\\,\\text{m/s}$ current, and turn the bow to $132^\\circ$, angled upstream. The upstream part of the boat\'s velocity, $3\\cos48^\\circ\\approx2\\,\\text{m/s}$, cancels the current and the boat lands almost exactly opposite. The price: the crossing now takes about $2.69\\,\\text{s}$.',
        zh: '水速调回 $2\\,\\text{m/s}$，把船头转到 $132^\\circ$，斜向上游。船速沿上游方向的分量 $3\\cos48^\\circ\\approx2\\,\\text{m/s}$ 正好抵消水流，船几乎落在正对岸。代价是过河时间变成约 $2.69\\,\\text{s}$。',
      },
      set: { u: 3, deg: 132, w: 2, T: 12 },
    },
    {
      title: { en: 'When the river wins', zh: '水比船快的时候' },
      body: {
        en: 'Now the boat makes $2\\,\\text{m/s}$ in a $3\\,\\text{m/s}$ current. No heading can cancel the current, so the boat always lands downstream. At $132^\\circ$ the drift is about $6.71\\,\\text{m}$, the smallest it can be.',
        zh: '船速 $2\\,\\text{m/s}$，水速 $3\\,\\text{m/s}$。无论船头朝哪，都抵消不了水流，船总会落在下游。船头朝 $132^\\circ$ 时漂移约 $6.71\\,\\text{m}$，已经是最小值。',
      },
      set: { u: 2, deg: 132, w: 3, T: 12 },
    },
  ],
  sections: [
    {
      id: 'add',
      title: { en: 'Velocities add as arrows', zh: '速度按箭头相加' },
      body: {
        en: 'The boat moves through the water; the water moves over the ground. Its velocity relative to the ground is the sum of the two, added tip to tail:\n\n$$\\vec v_{\\text{ground}}=\\vec v_{\\text{boat}}+\\vec v_{\\text{water}}$$\n\nOn the board the green arrow (boat through water) and the blue arrow (water) form a triangle with the amber one, the path the boat really follows.',
        zh: '船在水中划行，水又相对河岸流动。船相对河岸的速度，是这两个速度首尾相接的矢量和：\n\n$$\\vec v_{\\text{对地}}=\\vec v_{\\text{船对水}}+\\vec v_{\\text{水对地}}$$\n\n画板上，绿色箭头（船相对水）和蓝色箭头（水）与琥珀色箭头围成一个三角形，琥珀色就是船实际走的方向。',
      },
    },
    {
      id: 'time',
      title: { en: 'The crossing time', zh: '过河时间' },
      body: {
        en: 'Only the part of the velocity across the river gets the boat to the other side. With the bow at angle $\\theta$ to the bank:\n\n$$t=\\frac{d}{v_{\\text{boat}}\\sin\\theta}$$\n\nThe current does not appear: it is parallel to the bank. The time is shortest at $\\theta=90^\\circ$, $t_{\\min}=\\dfrac{d}{v_{\\text{boat}}}$.',
        zh: '只有垂直河岸的速度分量能把船送到对岸。船头与河岸夹角为 $\\theta$ 时：\n\n$$t=\\frac{d}{v_{\\text{船}}\\sin\\theta}$$\n\n式子里没有水速，因为水流与河岸平行。$\\theta=90^\\circ$ 时时间最短，$t_{\\min}=\\dfrac{d}{v_{\\text{船}}}$。',
      },
    },
    {
      id: 'path',
      title: { en: 'The shortest path', zh: '最短位移' },
      body: {
        en: 'To land straight across, the ground velocity must point straight across, so the boat\'s upstream component must equal the current: $v_{\\text{boat}}\\cos\\alpha=v_{\\text{water}}$, where $\\alpha$ is the angle to the upstream bank. That is only possible when the boat is faster than the water. If it is slower, the smallest drift comes from $\\cos\\alpha=\\dfrac{v_{\\text{boat}}}{v_{\\text{water}}}$, with the ground velocity at right angles to the boat\'s.',
        zh: '要到达正对岸，对地速度必须垂直河岸，也就是船速沿上游的分量等于水速：$v_{\\text{船}}\\cos\\alpha=v_{\\text{水}}$，$\\alpha$ 是船头与上游河岸的夹角。只有船比水快时才做得到。船比水慢时，漂移最小的方向满足 $\\cos\\alpha=\\dfrac{v_{\\text{船}}}{v_{\\text{水}}}$，此时对地速度与船速垂直。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A river is $100\\,\\text{m}$ wide. A boat makes $5\\,\\text{m/s}$ in still water; the current is $3\\,\\text{m/s}$. What is the shortest crossing time?',
        zh: '河宽 $100\\,\\text{m}$，船在静水中速度 $5\\,\\text{m/s}$，水速 $3\\,\\text{m/s}$。最短过河时间是多少？',
      },
      choices: [
        { en: '$20\\,\\text{s}$', zh: '$20\\,\\text{s}$' },
        { en: '$25\\,\\text{s}$', zh: '$25\\,\\text{s}$' },
        { en: '$12.5\\,\\text{s}$', zh: '$12.5\\,\\text{s}$' },
        { en: '$33\\,\\text{s}$', zh: '$33\\,\\text{s}$' },
      ],
      answer: 0,
      explanation: {
        en: 'Point straight across: $t=100/5=20\\,\\text{s}$. The current does not change it.',
        zh: '船头垂直河岸：$t=100/5=20\\,\\text{s}$，与水速无关。',
      },
    },
    {
      question: {
        en: 'Same river and boat. To land straight across, how long does the crossing take?',
        zh: '同样的河和船，如果要到达正对岸，过河要多久？',
      },
      choices: [
        { en: '$20\\,\\text{s}$', zh: '$20\\,\\text{s}$' },
        { en: '$25\\,\\text{s}$', zh: '$25\\,\\text{s}$' },
        { en: '$33\\,\\text{s}$', zh: '$33\\,\\text{s}$' },
        { en: '$12.5\\,\\text{s}$', zh: '$12.5\\,\\text{s}$' },
      ],
      answer: 1,
      explanation: {
        en: 'The cross-river component is $\\sqrt{5^2-3^2}=4\\,\\text{m/s}$, so $t=100/4=25\\,\\text{s}$.',
        zh: '垂直河岸的分速度是 $\\sqrt{5^2-3^2}=4\\,\\text{m/s}$，所以 $t=100/4=25\\,\\text{s}$。',
      },
    },
    {
      question: {
        en: 'If the current suddenly gets faster mid-river while the bow stays pointed straight across, the crossing time',
        zh: '船头始终垂直河岸，若河中央水速突然变大，过河时间会',
      },
      choices: [
        { en: 'increases', zh: '变长' },
        { en: 'decreases', zh: '变短' },
        { en: 'stays the same', zh: '不变' },
        { en: 'depends on the boat', zh: '取决于船' },
      ],
      answer: 2,
      explanation: {
        en: 'The current is parallel to the banks and adds nothing across the river. Only the landing point moves.',
        zh: '水流与河岸平行，对垂直河岸的运动没有贡献，只会改变靠岸位置。',
      },
    },
  ],
  resultTex: '\\vec v_{\\text{ground}} = \\vec v_{\\text{boat}} + \\vec v_{\\text{water}}',
  related: ['projectile-motion', 'uniform-acceleration-vt'],
  updated: '2026-10-12',
  videoPrompt: {
    en: 'Explain the river-crossing problem with vector addition: a 6 m wide river, boat speed 3 m/s, current 2 m/s. Show the boat pointing straight across (2 s, lands 4 m downstream), a faster 4 m/s current (still 2 s, 8 m downstream), aiming upstream at 132° to land opposite in about 2.69 s, and a boat slower than the current that can never land opposite.',
    zh: '用矢量合成讲解小船过河：河宽 6 米，船速 3 m/s，水速 2 m/s。依次展示船头垂直河岸（2 秒，落在下游 4 米）、水速变为 4 m/s（仍是 2 秒，下游 8 米）、船头斜向上游 132° 到达正对岸（约 2.69 秒），以及船速小于水速时永远到不了正对岸。',
  },
};
