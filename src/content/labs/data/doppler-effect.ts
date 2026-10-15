import type { BoardSpecInput } from '@/lib/board/spec';

import { pick, type Lab } from '../types';

type BoardObject = BoardSpecInput['objects'][number];

/** Speed of sound in air, m/s. */
const C = 340;
/** Where the source starts on the board. */
const X0 = -6;

/**
 * One wavefront every half unit of board time. Board units are scaled so sound
 * covers one unit per unit of time; the source covers M = vs / c.
 */
function wavefront(k: number): BoardObject {
  return {
    type: 'circle',
    center: [`${X0} + M * ${k}`, 0],
    r: `T - ${k}`,
    color: 'blue',
    width: 1.25,
    opacity: 0.55,
    visible: `T >= ${k}`,
  };
}

export const dopplerEffect: Lab = {
  slug: 'doppler-effect',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Doppler effect', zh: '多普勒效应' },
  title: {
    en: 'The Doppler effect: why a passing siren drops in pitch',
    zh: '多普勒效应：鸣笛的车开过去，音调为什么变低',
  },
  question: {
    en: 'Why does an ambulance sound higher coming toward you and lower going away?',
    zh: '救护车开过来时声音尖，开走后声音低，这是为什么？',
  },
  summary: {
    en: 'Set a sound source moving and watch its wavefronts crowd together ahead and spread out behind. The listener in front hears f₀·c/(c − v), the one behind f₀·c/(c + v); past the speed of sound the fronts pile into a shock cone.',
    zh: '让声源动起来，看它发出的波面在前方挤在一起、在后方拉开。前方听者听到 f₀·c/(c − v)，后方听者听到 f₀·c/(c + v)；超过声速时波面叠成激波锥。',
  },
  keyPoints: [
    { en: 'Moving source', zh: '波源运动' },
    { en: 'Observed frequency', zh: '观察到的频率' },
    { en: 'Wavelength compression', zh: '波长被压缩' },
    { en: 'Shock waves and Mach cone', zh: '激波与马赫锥' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-8, 9], y: [-4.6, 4.6], axes: false },
      params: [
        {
          id: 'vs',
          label: 'v_s\\,(\\text{m/s})',
          min: 0,
          max: 400,
          step: 1,
          value: 200,
          bands: [{ from: C, to: 400, label: t('supersonic', '超声速'), color: 'red' }],
        },
        { id: 'f0', label: 'f_0\\,(\\text{Hz})', min: 200, max: 1000, step: 10, value: 500 },
        { id: 'T', label: 't', min: 0, max: 10, step: 0.02, value: 8, play: 10 },
      ],
      scalars: [
        { id: 'M', expr: `vs / ${C}` },
        { id: 'xs', expr: `${X0} + M * T` },
        { id: 'sub', expr: `vs < ${C} ? 1 : 0` },
        { id: 'ff', expr: `sub > 0 ? f0 * ${C} / (${C} - vs) : sqrt(-1)` },
        { id: 'fb', expr: `f0 * ${C} / (${C} + vs)` },
        // Half-angle of the Mach cone, once there is one.
        { id: 'al', expr: 'sub > 0 ? sqrt(-1) : asin(1 / M)' },
        // Same angle for drawing, kept finite while the cone is hidden.
        { id: 'ad', expr: 'sub > 0 ? 0 : asin(1 / M)' },
        { id: 'cl', expr: 'sub > 0 ? 0 : 1.6 * T' },
      ],
      objects: [
        ...Array.from({ length: 21 }, (_, k) => wavefront(k / 2)),
        { type: 'segment', from: [-8, 0], to: [9, 0], color: 'muted', dashed: true, width: 1, opacity: 0.5 },
        {
          type: 'segment',
          from: ['xs', 0],
          to: ['xs - cl * cos(ad)', 'cl * sin(ad)'],
          color: 'red',
          width: 2.5,
          visible: '1 - sub',
        },
        {
          type: 'segment',
          from: ['xs', 0],
          to: ['xs - cl * cos(ad)', '-cl * sin(ad)'],
          color: 'red',
          width: 2.5,
          visible: '1 - sub',
        },
        {
          type: 'segment',
          from: ['xs', 0],
          to: ['xs + min(1.5 * M, 2)', 0],
          color: 'ink',
          width: 2.5,
          arrow: true,
          label: 'vs',
          visible: 'vs > 5',
        },
        { type: 'point', at: ['xs', 0], color: 'primary', size: 8 },
        { type: 'point', at: [8.3, 0], color: 'green', size: 6 },
        { type: 'text', at: [8.3, -0.55], text: t('ahead', '前方听者'), anchor: 'middle', color: 'green' },
        { type: 'point', at: [-7.4, 0], color: 'amber', size: 6 },
        { type: 'text', at: [-7.4, -0.55], text: t('behind', '后方听者'), anchor: 'middle', color: 'amber' },
      ],
      readouts: [
        { label: 'M = v_s / c', expr: 'M', digits: 2 },
        { label: 'f_{\\text{ahead}} = f_0\\dfrac{c}{c - v_s}', expr: 'ff', digits: 1, highlight: true },
        { label: 'f_{\\text{behind}} = f_0\\dfrac{c}{c + v_s}', expr: 'fb', digits: 1 },
        { label: '\\lambda_{\\text{ahead}}', expr: `(${C} - vs) / f0`, digits: 3 },
        { label: '\\lambda_{\\text{behind}}', expr: `(${C} + vs) / f0`, digits: 3 },
        { label: '\\alpha\\,(^\\circ)', expr: 'al * 180 / pi', digits: 1 },
        {
          kind: 'status',
          label: t('Source', '声源'),
          expr: 'sub',
          ok: t('slower than sound', '低于声速'),
          bad: t('supersonic: shock cone', '超声速：形成激波锥'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'A source at rest', zh: '静止的声源' },
      body: {
        en: 'A $500\\,\\text{Hz}$ source standing still sends out evenly spaced circles. Both listeners hear $500\\,\\text{Hz}$, and the wavelength is $c/f_0=340/500=0.68\\,\\text{m}$ in every direction.',
        zh: '$500\\,\\text{Hz}$ 的声源静止不动，发出间距均匀的圆形波面。两个听者都听到 $500\\,\\text{Hz}$，各个方向的波长都是 $c/f_0=340/500=0.68\\,\\text{m}$。',
      },
      set: { vs: 0, f0: 500, T: 8 },
    },
    {
      title: { en: 'Moving at a tenth of the speed of sound', zh: '以十分之一声速前进' },
      body: {
        en: 'At $v_s=34\\,\\text{m/s}$ the source chases its own waves. Ahead the fronts are only $0.612\\,\\text{m}$ apart and the listener hears $500\\times\\dfrac{340}{306}\\approx555.6\\,\\text{Hz}$; behind they are $0.748\\,\\text{m}$ apart, $\\approx454.5\\,\\text{Hz}$.',
        zh: '$v_s=34\\,\\text{m/s}$ 时声源在追赶自己发出的波。前方波面间距只有 $0.612\\,\\text{m}$，听者听到 $500\\times\\dfrac{340}{306}\\approx555.6\\,\\text{Hz}$；后方间距 $0.748\\,\\text{m}$，约 $454.5\\,\\text{Hz}$。',
      },
      set: { vs: 34, f0: 500, T: 8 },
    },
    {
      title: { en: 'Half the speed of sound', zh: '半个声速' },
      body: {
        en: 'At $v_s=170\\,\\text{m/s}$ the effect is no longer subtle: an octave up ahead, $1000\\,\\text{Hz}$, and down to $333.3\\,\\text{Hz}$ behind. Note it is not symmetric: the rise ahead is bigger than the drop behind.',
        zh: '$v_s=170\\,\\text{m/s}$ 时效果非常明显：前方升高一个八度，$1000\\,\\text{Hz}$；后方降到 $333.3\\,\\text{Hz}$。注意两边并不对称：前方升高的幅度比后方降低的大。',
      },
      set: { vs: 170, f0: 500, T: 8 },
    },
    {
      title: { en: 'Faster than sound', zh: '超过声速' },
      body: {
        en: 'At $400\\,\\text{m/s}$ the source outruns every front it emits. No sound reaches the listener ahead before the source does; instead the fronts pile up on a cone with half-angle $\\sin\\alpha=c/v_s$, about $58.2^\\circ$. Crossing that cone is the sonic boom.',
        zh: '$400\\,\\text{m/s}$ 时声源跑在所有波面前面，前方听者在声源到达之前什么也听不到；波面叠在一个锥面上，半顶角满足 $\\sin\\alpha=c/v_s$，约 $58.2^\\circ$。这个锥面扫过时就是音爆。',
      },
      set: { vs: 400, f0: 500, T: 8 },
    },
  ],
  sections: [
    {
      id: 'why',
      title: { en: 'Same waves, squeezed', zh: '同样的波，被挤压了' },
      body: {
        en: 'The source still emits $f_0$ fronts per second, but it moves $v_s/f_0$ forward between two of them. Ahead each front is that much closer to the previous one, behind that much further:\n\n$$\\lambda_{\\text{ahead}}=\\frac{c-v_s}{f_0},\\qquad\\lambda_{\\text{behind}}=\\frac{c+v_s}{f_0}$$\n\nSound still travels at $c$, so a shorter wavelength means more fronts per second: a higher pitch.',
        zh: '声源每秒仍然发出 $f_0$ 个波面，但每两个波面之间它向前移动了 $v_s/f_0$。前方的波面因此挤近这么多，后方拉开这么多：\n\n$$\\lambda_{\\text{前}}=\\frac{c-v_s}{f_0},\\qquad\\lambda_{\\text{后}}=\\frac{c+v_s}{f_0}$$\n\n声速仍是 $c$，波长变短意味着每秒到达的波面更多，听到的音调更高。',
      },
    },
    {
      id: 'formula',
      title: { en: 'The formula', zh: '频率公式' },
      body: {
        en: 'Dividing $c$ by those wavelengths gives what a listener at rest hears:\n\n$$f=f_0\\,\\frac{c}{c\\mp v_s}$$\n\nminus when the source approaches, plus when it recedes. If instead the listener moves at $v_o$ toward a still source, $f=f_0\\dfrac{c+v_o}{c}$: the wavelength is unchanged but fronts are met more often. In both cases only motion **along the line** between them counts.',
        zh: '用 $c$ 除以这两个波长，得到静止听者听到的频率：\n\n$$f=f_0\\,\\frac{c}{c\\mp v_s}$$\n\n声源靠近取减号，远离取加号。若声源不动、听者以 $v_o$ 靠近，$f=f_0\\dfrac{c+v_o}{c}$：波长没变，但单位时间遇到的波面多了。两种情况都只有**沿两者连线方向**的速度起作用。',
      },
    },
    {
      id: 'uses',
      title: { en: 'Where it is used', zh: '多普勒效应的应用' },
      body: {
        en: 'Police radar and weather radar measure speed from the frequency shift of a reflected wave. Doppler ultrasound measures blood flow. Light shows the same effect: galaxies moving away from us are **redshifted**, the first evidence that the universe is expanding.',
        zh: '测速雷达、气象雷达通过反射波的频率变化测出速度；医院的彩超用它测血流速度。光也有同样的效应：远离我们的星系光谱发生**红移**，这是宇宙在膨胀的第一个证据。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'A $680\\,\\text{Hz}$ siren approaches at $40\\,\\text{m/s}$ ($c=340\\,\\text{m/s}$). You hear about',
        zh: '$680\\,\\text{Hz}$ 的警笛以 $40\\,\\text{m/s}$ 驶近（$c=340\\,\\text{m/s}$），你听到的频率约为',
      },
      choices: [
        { en: '$600\\,\\text{Hz}$', zh: '$600\\,\\text{Hz}$' },
        { en: '$680\\,\\text{Hz}$', zh: '$680\\,\\text{Hz}$' },
        { en: '$771\\,\\text{Hz}$', zh: '$771\\,\\text{Hz}$' },
        { en: '$720\\,\\text{Hz}$', zh: '$720\\,\\text{Hz}$' },
      ],
      answer: 2,
      explanation: {
        en: '$f=680\\times\\dfrac{340}{300}\\approx771\\,\\text{Hz}$.',
        zh: '$f=680\\times\\dfrac{340}{300}\\approx771\\,\\text{Hz}$。',
      },
    },
    {
      question: {
        en: 'As a source moves away from you, compared with when it is still,',
        zh: '声源远离你时，与它静止时相比，',
      },
      choices: [
        { en: 'the speed of sound drops', zh: '声速变小' },
        { en: 'the wavelength reaching you is longer', zh: '传到你这里的波长变长' },
        { en: 'the source emits a lower frequency', zh: '声源发出的频率变低' },
        { en: 'nothing changes', zh: '没有任何变化' },
      ],
      answer: 1,
      explanation: {
        en: 'Sound speed is fixed by the air and the source still emits $f_0$; the fronts behind it are spread out, so the wavelength you receive is longer.',
        zh: '声速由空气决定，声源发出的仍是 $f_0$；它后方的波面被拉开，你接收到的波长变长。',
      },
    },
    {
      question: {
        en: 'A jet flies at twice the speed of sound. The half-angle of its shock cone is',
        zh: '飞机以 2 倍声速飞行，激波锥的半顶角为',
      },
      choices: [
        { en: '$30^\\circ$', zh: '$30^\\circ$' },
        { en: '$45^\\circ$', zh: '$45^\\circ$' },
        { en: '$60^\\circ$', zh: '$60^\\circ$' },
        { en: '$90^\\circ$', zh: '$90^\\circ$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\sin\\alpha=\\dfrac{c}{v_s}=\\dfrac12$, so $\\alpha=30^\\circ$. The faster the jet, the narrower the cone.',
        zh: '$\\sin\\alpha=\\dfrac{c}{v_s}=\\dfrac12$，$\\alpha=30^\\circ$。飞得越快，锥越窄。',
      },
    },
  ],
  resultTex: 'f = f_0\\,\\dfrac{c}{c \\mp v_s}',
  related: ['wave-propagation', 'wave-interference', 'relative-motion-river'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Explain the Doppler effect: a 500 Hz source emits circular wavefronts. At rest both listeners hear 500 Hz and λ = 0.68 m. Moving at 34 m/s the fronts crowd to 0.612 m ahead (555.6 Hz) and spread to 0.748 m behind (454.5 Hz); at 170 m/s it is 1000 Hz ahead and 333.3 Hz behind. At 400 m/s the source outruns its sound and the fronts pile into a Mach cone with sin α = c/v, α ≈ 58.2°.',
    zh: '讲解多普勒效应：500 Hz 的声源发出圆形波面。静止时两个听者都听到 500 Hz，波长 0.68 米。以 34 m/s 运动时，前方波面挤到 0.612 米（555.6 Hz），后方拉开到 0.748 米（454.5 Hz）；170 m/s 时前方 1000 Hz、后方 333.3 Hz。400 m/s 时声源跑在声音前面，波面叠成马赫锥，sin α = c/v，α ≈ 58.2°。',
  },
};
