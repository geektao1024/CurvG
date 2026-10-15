import { pick, type Lab } from '../types';

/** Right end of the drawn string, in metres. */
const END = 16.5;

export const wavePropagation: Lab = {
  slug: 'wave-propagation',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Travelling waves', zh: '机械波的传播' },
  title: {
    en: 'Travelling waves: what moves along, and what only bobs up and down',
    zh: '机械波的传播：传走的是什么，留在原地的是什么',
  },
  question: {
    en: 'When a wave runs along a rope, why does each bit of rope only move up and down?',
    zh: '波沿绳子传过去，绳上每一点为什么只上下振动、不跟着走？',
  },
  summary: {
    en: 'Shake one end of a rope and watch the wave front advance at v = λf while a marked point waits for it, then only bobs in place. Change the frequency and the wavelength adjusts so the speed stays the same.',
    zh: '抖动绳子的一端，看波前以 v = λf 向前推进，标记的质点先静止等待，波到后只在原地上下振动。改变频率，波长随之改变，波速保持不变。',
  },
  keyPoints: [
    { en: 'Wavelength, frequency, period', zh: '波长、频率与周期' },
    { en: 'v = λf', zh: '波速 v = λf' },
    { en: 'Particles oscillate in place', zh: '质点只在平衡位置附近振动' },
    { en: 'Wave graph y–x', zh: '波形图' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-1, 17], y: [-2.6, 2.6], axes: false },
      params: [
        { id: 'A', label: 'A', min: 0.2, max: 1.5, step: 0.1, value: 1 },
        { id: 'lam', label: '\\lambda', min: 1, max: 8, step: 0.5, value: 4 },
        { id: 'f', label: 'f', min: 0.25, max: 2, step: 0.25, value: 0.5 },
        { id: 'xp', label: 'x_P', min: 1, max: 16, step: 0.5, value: 6 },
        { id: 'T', label: 't', min: 0, max: 8, step: 0.02, value: 5, play: 16 },
      ],
      scalars: [
        { id: 'v', expr: 'lam * f' },
        // How far the front has got along the string.
        { id: 'xf', expr: `min(v * T, ${END})` },
        { id: 'reached', expr: 'v * T >= xp ? 1 : 0' },
        { id: 'ph', expr: '2 * pi * (f * T - xp / lam)' },
        { id: 'yp', expr: 'reached > 0 ? A * sin(ph) : 0' },
        { id: 'vy', expr: 'reached > 0 ? 2 * pi * f * A * cos(ph) : 0' },
        { id: 'ly', expr: 'clamp(0.2 * vy, -1, 1)' },
      ],
      objects: [
        { type: 'segment', from: [-0.6, 0], to: [END, 0], color: 'muted', dashed: true, width: 1 },
        {
          type: 'parametric',
          variable: 'u',
          x: 'u',
          y: 'A * sin(2 * pi * (f * T - u / lam))',
          range: [0, 'xf'],
          samples: 600,
          color: 'primary',
          width: 3,
        },
        { type: 'segment', from: ['xf', 0], to: [END, 0], color: 'ink', width: 2, visible: `xf < ${END}` },
        // Last full wavelength behind the front.
        {
          type: 'segment',
          from: ['xf - lam', '-A - 0.45'],
          to: ['xf', '-A - 0.45'],
          color: 'green',
          width: 2,
          label: 'λ',
          visible: `(v * T >= lam) * (xf < ${END}) > 0`,
        },
        { type: 'segment', from: ['xf', -2.3], to: ['xf', 2.3], color: 'green', width: 1.5, dashed: true, visible: `xf < ${END}` },
        { type: 'text', at: ['xf + 0.15', 2.15], text: t('front', '波前'), color: 'green', visible: `xf < ${END}` },
        { type: 'segment', from: [0, -1.8], to: [0, 1.8], color: 'muted', width: 1 },
        { type: 'point', at: [0, 'A * sin(2 * pi * f * T)'], color: 'ink', size: 6 },
        { type: 'text', at: [0, -2.25], text: t('source', '波源'), anchor: 'middle', color: 'muted' },
        { type: 'segment', from: ['xp', -1.8], to: ['xp', 1.8], color: 'red', width: 1, dashed: true, opacity: 0.6 },
        {
          type: 'segment',
          from: ['xp + 0.25', 'yp'],
          to: ['xp + 0.25', 'yp + ly'],
          color: 'blue',
          width: 2.5,
          arrow: true,
          visible: 'abs(ly) > 0.05',
        },
        { type: 'point', at: ['xp', 'yp'], color: 'red', size: 8, drag: { x: 'xp' }, label: 'P' },
      ],
      readouts: [
        { label: 'v = \\lambda f', expr: 'v', digits: 2, highlight: true },
        { label: 'T = 1/f', expr: '1 / f', digits: 2 },
        { label: 't_{\\text{arrive}} = x_P / v', expr: 'xp / v', digits: 2 },
        { label: 'y_P', expr: 'yp', digits: 2 },
        {
          kind: 'status',
          label: t('Point P', '质点 P'),
          expr: 'reached',
          ok: t('oscillating', '已开始振动'),
          bad: t('still at rest', '还没动'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Speed = wavelength × frequency', zh: '波速 = 波长 × 频率' },
      body: {
        en: 'The source shakes at $f=0.5\\,\\text{Hz}$, one full shake every $T=2\\,\\text{s}$, and each shake lays down one wavelength, $\\lambda=4\\,\\text{m}$. So the front moves $4\\,\\text{m}$ every $2\\,\\text{s}$: $v=\\lambda f=2\\,\\text{m/s}$.',
        zh: '波源以 $f=0.5\\,\\text{Hz}$ 振动，每 $T=2\\,\\text{s}$ 完成一次全振动，每次全振动铺出一个波长 $\\lambda=4\\,\\text{m}$。所以波前每 $2\\,\\text{s}$ 前进 $4\\,\\text{m}$：$v=\\lambda f=2\\,\\text{m/s}$。',
      },
      set: { A: 1, lam: 4, f: 0.5, xp: 6, T: 5 },
    },
    {
      title: { en: 'Shake faster, same rope', zh: '抖快一倍，绳子不变' },
      body: {
        en: 'The speed is set by the rope, not by your hand. Shake twice as fast, $f=1\\,\\text{Hz}$, and the waves bunch up to $\\lambda=2\\,\\text{m}$; the front still moves at $2\\,\\text{m/s}$.',
        zh: '波速由绳子（介质）决定，不由手决定。抖快一倍，$f=1\\,\\text{Hz}$，波就挤成 $\\lambda=2\\,\\text{m}$，波前仍以 $2\\,\\text{m/s}$ 前进。',
      },
      set: { A: 1, lam: 2, f: 1, xp: 6, T: 5 },
    },
    {
      title: { en: 'P waits for the wave', zh: '质点 P 在等波到来' },
      body: {
        en: 'Back to $\\lambda=4\\,\\text{m}$, $f=0.5\\,\\text{Hz}$, and look at $P$, $6\\,\\text{m}$ from the source. At $t=2.5\\,\\text{s}$ the front is only at $5\\,\\text{m}$ and $P$ has not moved. The wave arrives at $t=x_P/v=3\\,\\text{s}$.',
        zh: '回到 $\\lambda=4\\,\\text{m}$、$f=0.5\\,\\text{Hz}$，看离波源 $6\\,\\text{m}$ 的质点 $P$。$t=2.5\\,\\text{s}$ 时波前才到 $5\\,\\text{m}$，$P$ 还没动；波在 $t=x_P/v=3\\,\\text{s}$ 时到达。',
      },
      set: { A: 1, lam: 4, f: 0.5, xp: 6, T: 2.5 },
    },
    {
      title: { en: 'Up and down, never along', zh: '只上下，不前进' },
      body: {
        en: 'At $t=3.5\\,\\text{s}$, a quarter period after the wave arrived, $P$ is at the crest, $y_P=1\\,\\text{m}$, directly above where it started. Press play: $P$ repeats the source\'s motion $3\\,\\text{s}$ late and never travels with the wave. What travels is the shape, and the energy with it.',
        zh: '$t=3.5\\,\\text{s}$，波到达后又过了四分之一周期，$P$ 到达波峰，$y_P=1\\,\\text{m}$，就在它原来位置的正上方。点播放：$P$ 比波源晚 $3\\,\\text{s}$ 重复同样的振动，但从不随波前进。传走的是振动的形式，以及能量。',
      },
      set: { A: 1, lam: 4, f: 0.5, xp: 6, T: 3.5 },
    },
  ],
  sections: [
    {
      id: 'what',
      title: { en: 'What a wave carries', zh: '波传递的是什么' },
      body: {
        en: 'Each bit of rope is pulled by its neighbour and copies its motion a moment later. That delay is what makes the shape travel. The particles themselves only oscillate about their rest positions; the wave carries the **pattern of motion** and **energy**, not matter.',
        zh: '绳上每一小段都被前一段带动，稍晚一点重复它的振动，正是这个延迟让波形传了出去。质点本身只在平衡位置附近振动；波传递的是**振动形式**和**能量**，不是物质。',
      },
    },
    {
      id: 'speed',
      title: { en: 'v = λf', zh: '波速公式' },
      body: {
        en: 'In one period $T$ the source makes one full oscillation and the front moves one wavelength, so\n\n$$v=\\frac{\\lambda}{T}=\\lambda f$$\n\nThe medium fixes $v$ (a tighter rope is faster, sound in air about $340\\,\\text{m/s}$); the source fixes $f$; $\\lambda$ follows from both. When a wave enters a new medium its frequency stays the same and its wavelength changes.',
        zh: '一个周期 $T$ 内，波源完成一次全振动，波前前进一个波长，所以\n\n$$v=\\frac{\\lambda}{T}=\\lambda f$$\n\n$v$ 由介质决定（绳子越紧越快，空气中声速约 $340\\,\\text{m/s}$），$f$ 由波源决定，$\\lambda$ 由两者共同决定。波进入另一种介质时，频率不变，波长改变。',
      },
    },
    {
      id: 'delay',
      title: { en: 'Every point is the source, delayed', zh: '每一点都是"迟到的波源"' },
      body: {
        en: 'A point at distance $x$ does what the source did $x/v$ seconds earlier:\n\n$$y(x,t)=A\\sin\\left[2\\pi\\left(ft-\\frac x\\lambda\\right)\\right]$$\n\nPoints one wavelength apart are always in step; points half a wavelength apart always move in opposite directions.',
        zh: '距波源 $x$ 处的质点，重复波源在 $x/v$ 秒之前的振动：\n\n$$y(x,t)=A\\sin\\left[2\\pi\\left(ft-\\frac x\\lambda\\right)\\right]$$\n\n相距一个波长的两点振动步调完全一致；相距半个波长的两点振动方向始终相反。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'Sound in air travels at $340\\,\\text{m/s}$. A $680\\,\\text{Hz}$ tone has a wavelength of',
        zh: '空气中声速 $340\\,\\text{m/s}$，$680\\,\\text{Hz}$ 的声音波长为',
      },
      choices: [
        { en: '$2\\,\\text{m}$', zh: '$2\\,\\text{m}$' },
        { en: '$0.5\\,\\text{m}$', zh: '$0.5\\,\\text{m}$' },
        { en: '$1020\\,\\text{m}$', zh: '$1020\\,\\text{m}$' },
        { en: '$0.25\\,\\text{m}$', zh: '$0.25\\,\\text{m}$' },
      ],
      answer: 1,
      explanation: {
        en: '$\\lambda=v/f=340/680=0.5\\,\\text{m}$.',
        zh: '$\\lambda=v/f=340/680=0.5\\,\\text{m}$。',
      },
    },
    {
      question: {
        en: 'You shake the end of a rope twice as fast. On the same rope,',
        zh: '把同一根绳子的一端抖得快一倍，',
      },
      choices: [
        { en: 'the wave speed doubles', zh: '波速加倍' },
        { en: 'the wavelength halves', zh: '波长减半' },
        { en: 'the wavelength doubles', zh: '波长加倍' },
        { en: 'nothing changes', zh: '什么都不变' },
      ],
      answer: 1,
      explanation: {
        en: 'The rope sets $v$. With $f$ doubled, $\\lambda=v/f$ halves.',
        zh: '绳子决定 $v$。$f$ 加倍，$\\lambda=v/f$ 减半。',
      },
    },
    {
      question: {
        en: 'As a wave passes, a cork on a pond',
        zh: '水波经过时，水面上的软木塞',
      },
      choices: [
        { en: 'is carried along with the wave', zh: '被波带着向前走' },
        { en: 'bobs up and down about the same spot', zh: '在原处附近上下振动' },
        { en: 'stays perfectly still', zh: '完全不动' },
        { en: 'moves against the wave', zh: '逆着波的方向运动' },
      ],
      answer: 1,
      explanation: {
        en: 'The water, and the cork with it, only oscillates; the wave passes underneath.',
        zh: '水（以及上面的软木塞）只在原处附近振动，波从它下面传过去。',
      },
    },
  ],
  resultTex: 'v = \\lambda f = \\dfrac{\\lambda}{T}',
  related: ['wave-interference', 'spring-oscillator', 'unit-circle-sine'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain how a mechanical wave travels: a source on the left shakes at 0.5 Hz and a sine wave with wavelength 4 m spreads along a rope at v = λf = 2 m/s. Shaking at 1 Hz halves the wavelength to 2 m at the same speed. A marked point P 6 m away stays still until the front arrives at 3 s, then only bobs up and down, reaching the crest at 3.5 s.',
    zh: '讲解机械波的传播：左端波源以 0.5 Hz 振动，波长 4 米的正弦波沿绳子以 v = λf = 2 m/s 传开。频率改为 1 Hz 时波长减半为 2 米，波速不变。离波源 6 米的质点 P 在波前到达（3 秒）之前静止，之后只上下振动，3.5 秒时到达波峰。',
  },
};
