import type { BoardSpecInput } from '@/lib/board/spec';

import { pick, type Lab } from '../types';

type BoardObject = BoardSpecInput['objects'][number];

/**
 * Points where |PS₁| − |PS₂| = mλ: one branch of a hyperbola with foci at
 * the two sources (m = 0 is the perpendicular bisector). Hidden once the
 * branch would leave the segment between the sources.
 */
function pathDifferenceLine(m: number, antinode: boolean): BoardObject {
  const style = antinode
    ? ({ color: 'green', width: 1.5, opacity: 0.8 } as const)
    : ({ color: 'red', width: 1, dashed: true, opacity: 0.6 } as const);
  if (m === 0) {
    return { type: 'segment', from: [0, -6], to: [0, 6], ...style, };
  }
  const a = `${Math.abs(m)} * lam / 2`;
  return {
    type: 'parametric',
    variable: 'u',
    x: `${Math.sign(m)} * ${a} * cosh(u)`,
    y: `sqrt(max(d^2 / 4 - (${a})^2, 0)) * sinh(u)`,
    range: [-2.6, 2.6],
    samples: 120,
    ...style,
    visible: `${a} < d / 2 - 0.001`,
  };
}

/** Wave crests from one source, n wavelengths out plus the current phase. */
function crests(cx: string, color: 'blue' | 'purple'): BoardObject[] {
  return Array.from({ length: 8 }, (_, n) => ({
    type: 'circle' as const,
    center: [cx, 0] as [string, number],
    r: `(${n} + T % 1) * lam`,
    color,
    width: 1,
    opacity: 0.3,
  }));
}

export const waveInterference: Lab = {
  slug: 'wave-interference',
  publication: 'public',
  primaryCategoryId: 'harmonic',
  additionalCategoryIds: ['conic'],
  levels: ['high'],
  chapterTitle: { en: 'Interference', zh: '波的叠加与干涉' },
  title: {
    en: 'Interference of two waves: path difference decides',
    zh: '两列波的干涉：路程差说了算',
  },
  question: {
    en: 'Two speakers play the same note. Why is it loud in some spots and almost silent in others?',
    zh: '两个音箱放同一个音，为什么有的位置特别响，有的位置几乎听不见？',
  },
  summary: {
    en: 'Two sources send out matching waves. Drag the point P and read its path difference: a whole number of wavelengths and the waves add up, a half number and they cancel. The loud spots line up along hyperbolas.',
    zh: '两个相同的波源同时发出波。拖动质点 P，读出它到两波源的路程差：等于整数个波长时振动加强，等于半整数个波长时振动减弱。加强点连成一条条双曲线。',
  },
  keyPoints: [
    { en: 'Superposition', zh: '波的叠加原理' },
    { en: 'Path difference', zh: '路程差' },
    { en: 'Constructive and destructive', zh: '振动加强与减弱' },
    { en: 'Interference pattern', zh: '干涉图样' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-6, 6], y: [-4.2, 4.2], axes: false },
      params: [
        { id: 'd', label: 'd', min: 1, max: 5, step: 0.5, value: 4 },
        { id: 'lam', label: '\\lambda', min: 1, max: 3, step: 0.25, value: 1.5 },
        { id: 'px', label: 'x_P', min: -5.5, max: 5.5, step: 0.125, value: 1.5 },
        { id: 'py', label: 'y_P', min: -4, max: 4, step: 0.125, value: 2.5 },
        { id: 'T', label: 't / T', min: 0, max: 4, step: 0.01, value: 0.3, play: 8 },
      ],
      scalars: [
        { id: 'r1', expr: 'hypot(px + d / 2, py)' },
        { id: 'r2', expr: 'hypot(px - d / 2, py)' },
        { id: 'dr', expr: 'r1 - r2' },
        { id: 'q', expr: 'dr / lam' },
        // Distance from q to the nearest whole number.
        { id: 'off', expr: 'abs(q - round(q))' },
        { id: 'amp', expr: '2 * abs(cos(pi * q))' },
      ],
      objects: [
        ...crests('-d / 2', 'blue'),
        ...crests('d / 2', 'purple'),
        ...[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((m) => pathDifferenceLine(m, true)),
        ...[-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5].map((m) =>
          pathDifferenceLine(m, false)
        ),
        { type: 'segment', from: ['-d / 2', 0], to: ['px', 'py'], color: 'blue', width: 2, label: 'PS₁' },
        { type: 'segment', from: ['d / 2', 0], to: ['px', 'py'], color: 'purple', width: 2, label: 'PS₂' },
        { type: 'point', at: ['-d / 2', 0], color: 'blue', size: 6, label: 'S₁' },
        { type: 'point', at: ['d / 2', 0], color: 'purple', size: 6, label: 'S₂' },
        // P's own swing, sized by the combined amplitude.
        { type: 'circle', center: ['px', 'py'], r: '0.12 + 0.18 * amp', color: 'amber', width: 2 },
        { type: 'point', at: ['px', 'py'], color: 'primary', size: 8, drag: { x: 'px', y: 'py' }, label: 'P' },
      ],
      readouts: [
        { label: '|PS_1|', expr: 'r1', digits: 2 },
        { label: '|PS_2|', expr: 'r2', digits: 2 },
        { label: '\\Delta r = |PS_1| - |PS_2|', expr: 'dr', digits: 2 },
        { label: '\\Delta r / \\lambda', expr: 'q', digits: 2, highlight: true },
        { label: 'A_P / A', expr: 'amp', digits: 2 },
        { label: 'N = 2\\lceil d/\\lambda\\rceil - 1', expr: '2 * ceil(d / lam) - 1', digits: 0 },
        {
          kind: 'status',
          label: t('Constructive', '振动加强'),
          expr: 'off < 0.05',
          ok: t('yes: Δr ≈ mλ', '是：Δr ≈ mλ'),
          bad: t('no', '否'),
        },
        {
          kind: 'status',
          label: t('Destructive', '振动减弱'),
          expr: 'off > 0.45',
          ok: t('yes: Δr ≈ (m + ½)λ', '是：Δr ≈ (m + ½)λ'),
          bad: t('no', '否'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Equal distances: loud', zh: '到两波源一样远：加强' },
      body: {
        en: 'Sources $4\\,\\text{m}$ apart, $\\lambda=1.5\\,\\text{m}$. Put $P$ on the perpendicular bisector: both paths are equal, $\\Delta r=0$, crest meets crest and $P$ swings with twice the amplitude.',
        zh: '两波源相距 $4\\,\\text{m}$，$\\lambda=1.5\\,\\text{m}$。把 $P$ 放在中垂线上：两段路程相等，$\\Delta r=0$，波峰遇波峰，$P$ 的振幅是单列波的 2 倍。',
      },
      set: { d: 4, lam: 1.5, px: 0, py: 2.5 },
    },
    {
      title: { en: 'Half a wavelength: silent', zh: '差半个波长：抵消' },
      body: {
        en: 'Move $P$ to $(0.375,\\,0)$ between the sources. Now $|PS_1|=2.375$ and $|PS_2|=1.625$, so $\\Delta r=0.75\\,\\text{m}=\\tfrac12\\lambda$: crest meets trough and $P$ does not move at all.',
        zh: '把 $P$ 移到两波源之间的 $(0.375,\\,0)$。$|PS_1|=2.375$，$|PS_2|=1.625$，$\\Delta r=0.75\\,\\text{m}=\\tfrac12\\lambda$：波峰遇波谷，$P$ 完全不动。',
      },
      set: { d: 4, lam: 1.5, px: 0.375, py: 0 },
    },
    {
      title: { en: 'One whole wavelength: loud again', zh: '差一个波长：又加强了' },
      body: {
        en: 'At $(0.75,\\,0)$ the difference is $\\Delta r=1.5\\,\\text{m}=\\lambda$. One wave is a full cycle behind the other, which is the same as being in step, so $P$ is loud again. Along the line between the sources loud and quiet spots alternate every $\\tfrac14\\lambda$.',
        zh: '在 $(0.75,\\,0)$，$\\Delta r=1.5\\,\\text{m}=\\lambda$。一列波比另一列晚了整整一个周期，相当于步调一致，$P$ 又是加强点。在两波源连线上，加强点和减弱点每隔 $\\tfrac14\\lambda$ 交替出现。',
      },
      set: { d: 4, lam: 1.5, px: 0.75, py: 0 },
    },
    {
      title: { en: 'Counting the loud lines', zh: '数一数加强线' },
      body: {
        en: 'The green curves are all the points with $\\Delta r=m\\lambda$: hyperbolas with the sources as foci. Between the sources $|\\Delta r|<d$, so with $d=4$ and $\\lambda=1.5$ there are $5$ ($m=0,\\pm1,\\pm2$). Shorten the wavelength to $1\\,\\text{m}$ and there are $7$.',
        zh: '绿色曲线是所有满足 $\\Delta r=m\\lambda$ 的点，它们是以两波源为焦点的双曲线。两波源之间 $|\\Delta r|<d$，所以 $d=4$、$\\lambda=1.5$ 时有 $5$ 条（$m=0,\\pm1,\\pm2$）。把波长缩短到 $1\\,\\text{m}$，就有 $7$ 条。',
      },
      set: { d: 4, lam: 1, px: 1.5, py: 2.5 },
    },
  ],
  sections: [
    {
      id: 'superposition',
      title: { en: 'Waves add', zh: '波的叠加' },
      body: {
        en: 'Where two waves overlap, each point\'s displacement is the sum of what each wave alone would give it, and each wave carries on afterwards as if the other were not there. That is the **superposition principle**.',
        zh: '两列波相遇时，每一点的位移等于两列波单独引起的位移之和；相遇之后，两列波各自保持原来的样子继续传播。这就是**波的叠加原理**。',
      },
    },
    {
      id: 'condition',
      title: { en: 'Loud or quiet: the path-difference rule', zh: '加强还是减弱：路程差判据' },
      body: {
        en: 'For two sources that oscillate in step with the same frequency, everything depends on $\\Delta r=|PS_1|-|PS_2|$:\n\n$$\\Delta r=m\\lambda\\ \\Rightarrow\\ \\text{constructive},\\qquad \\Delta r=\\left(m+\\tfrac12\\right)\\lambda\\ \\Rightarrow\\ \\text{destructive}$$\n\nA constructive point still oscillates, with amplitude $2A$; it is not stuck at a crest. A destructive point stays still when the two amplitudes are equal.',
        zh: '两个频率相同、步调一致的波源，结果只取决于路程差 $\\Delta r=|PS_1|-|PS_2|$：\n\n$$\\Delta r=m\\lambda\\ \\Rightarrow\\ \\text{振动加强},\\qquad \\Delta r=\\left(m+\\tfrac12\\right)\\lambda\\ \\Rightarrow\\ \\text{振动减弱}$$\n\n加强点仍在振动，只是振幅为 $2A$，并不是一直停在波峰。两列波振幅相等时，减弱点静止不动。',
      },
    },
    {
      id: 'pattern',
      title: { en: 'Why hyperbolas', zh: '为什么是双曲线' },
      body: {
        en: 'A curve whose points all have the same difference of distances to two fixed points is, by definition, a hyperbola with those points as foci. So each value of $m$ traces one branch, and the pattern stays fixed in space while the waves move through it. Requiring the same frequency is what keeps it still: this is why interference needs **coherent** sources.',
        zh: '到两个定点距离之差为定值的点的轨迹，按定义就是以这两点为焦点的双曲线。所以每个 $m$ 对应一支双曲线，波在不停传播，图样却固定不动。要求频率相同，正是为了让图样稳定：这就是干涉需要**相干波源**的原因。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'Two in-step sources have $\\lambda=2\\,\\text{m}$. A point is $7\\,\\text{m}$ from one and $4\\,\\text{m}$ from the other. It is',
        zh: '两个步调一致的波源，$\\lambda=2\\,\\text{m}$。某点到两波源的距离分别为 $7\\,\\text{m}$ 和 $4\\,\\text{m}$，该点',
      },
      choices: [
        { en: 'constructive', zh: '振动加强' },
        { en: 'destructive', zh: '振动减弱' },
        { en: 'neither', zh: '都不是' },
        { en: 'it depends on the time', zh: '取决于时刻' },
      ],
      answer: 1,
      explanation: {
        en: '$\\Delta r=3\\,\\text{m}=1.5\\lambda$, a half-whole number of wavelengths.',
        zh: '$\\Delta r=3\\,\\text{m}=1.5\\lambda$，是半波长的奇数倍。',
      },
    },
    {
      question: {
        en: 'At a constructive point, the medium',
        zh: '在振动加强点，介质质点',
      },
      choices: [
        { en: 'stays at a crest all the time', zh: '始终位于波峰' },
        { en: 'oscillates with twice the amplitude', zh: '以 2 倍振幅振动' },
        { en: 'does not move', zh: '静止不动' },
        { en: 'moves along with the waves', zh: '随波移动' },
      ],
      answer: 1,
      explanation: {
        en: '"Constructive" describes the amplitude. The point still passes through zero twice every period.',
        zh: '"加强"说的是振幅。这个点每个周期仍会两次经过平衡位置。',
      },
    },
    {
      question: {
        en: 'Two sources are $3\\,\\text{m}$ apart with $\\lambda=1\\,\\text{m}$. How many constructive lines cross the segment between them?',
        zh: '两波源相距 $3\\,\\text{m}$，$\\lambda=1\\,\\text{m}$。两波源连线上（不含波源）有几个振动加强点？',
      },
      choices: [
        { en: '3', zh: '3' },
        { en: '5', zh: '5' },
        { en: '6', zh: '6' },
        { en: '7', zh: '7' },
      ],
      answer: 1,
      explanation: {
        en: '$|\\Delta r|<3$ allows $m=0,\\pm1,\\pm2$: five points.',
        zh: '$|\\Delta r|<3$，$m$ 可取 $0,\\pm1,\\pm2$，共 5 个。',
      },
    },
  ],
  resultTex: '\\Delta r = m\\lambda,\\quad \\left(m + \\tfrac12\\right)\\lambda',
  curveSlugs: ['hyperbola'],
  related: ['wave-propagation', 'doppler-effect', 'conic-sections-eccentricity'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain two-source interference: sources 4 m apart send out circular waves with λ = 1.5 m. On the perpendicular bisector Δr = 0 and the amplitude doubles; at (0.375, 0) Δr = 0.75 m = λ/2 and the point stays still; at (0.75, 0) Δr = λ and it is loud again. Draw the constructive lines as hyperbolas with the sources as foci: 5 of them for λ = 1.5 m, 7 for λ = 1 m.',
    zh: '讲解双波源干涉：两个相距 4 米的波源发出波长 1.5 米的圆形波。中垂线上 Δr = 0，振幅加倍；(0.375, 0) 处 Δr = 0.75 米 = λ/2，质点静止；(0.75, 0) 处 Δr = λ，又是加强点。把加强线画成以两波源为焦点的双曲线：λ = 1.5 米时 5 条，λ = 1 米时 7 条。',
  },
};
