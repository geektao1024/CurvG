import { pick, type Lab } from '../types';

// Simpson's rule with 48 strips on [from, from + 48·step], in four pieces so
// each expression stays short: weights 1, 4, 2, 4, …, 4, 1.
const STRIPS = 48;
const simpson = (from: string, step: string, part: number) =>
  Array.from({ length: 13 }, (_, i) => part * 12 + i)
    .filter((j) => j <= STRIPS && (part === 0 || j > part * 12))
    .map((j) => {
      const w = j === 0 || j === STRIPS ? 1 : j % 2 ? 4 : 2;
      return `${w} * f(${from} + ${j} * ${step})`;
    })
    .join(' + ');

export const normalDistribution: Lab = {
  slug: 'normal-distribution',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Normal distribution & 3σ', zh: '正态分布与 3σ' },
  title: {
    en: 'The normal distribution: 68%, 95% and 99.7% measured as areas',
    zh: '正态分布：把 68%、95%、99.7% 当作面积量出来',
  },
  question: {
    en: 'Why does the share within one, two or three standard deviations come out the same for every normal curve, whatever μ and σ are?',
    zh: '为什么不论 μ、σ 取多少，落在 1 个、2 个、3 个标准差以内的比例都一样？',
  },
  summary: {
    en: 'Slide the mean and the spread and shade the band μ ± kσ. The board integrates the curve numerically over that band: about 0.683, 0.954 and 0.997 for k = 1, 2, 3, with any μ and σ, because changing them only moves and rescales the same picture.',
    zh: '拖动均值和标准差，再给 μ ± kσ 这一段涂上阴影。画板对这一段曲线做数值积分：k = 1、2、3 时约为 0.683、0.954、0.997，不论 μ、σ 取什么，因为改变它们只是把同一幅图平移和伸缩。',
  },
  keyPoints: [
    { en: 'Normal density', zh: '正态密度曲线' },
    { en: 'Probability as area', zh: '概率即面积' },
    { en: '68–95–99.7 rule', zh: '3σ 原则' },
    { en: 'Standardisation z = (x − μ)/σ', zh: '标准化 z = (x − μ)/σ' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-8, 8], y: [-0.08, 0.72], equal: false },
      params: [
        { id: 'mu', label: '\\mu', min: -3, max: 3, step: 0.1, value: 0 },
        { id: 'sg', label: '\\sigma', min: 0.6, max: 2.5, step: 0.05, value: 1 },
        {
          id: 'k',
          label: 'k',
          min: 0,
          max: 3.5,
          step: 0.05,
          value: 2,
          bands: [
            { from: 1, to: 1, label: '1σ', color: 'blue' },
            { from: 2, to: 2, label: '2σ', color: 'green' },
            { from: 3, to: 3, label: '3σ', color: 'purple' },
          ],
        },
      ],
      functions: [{ id: 'f', expr: 'exp(-((x - mu) / sg)^2 / 2) / (sg * sqrt(2 * pi))' }],
      scalars: [
        { id: 'lo', expr: 'mu - k * sg' },
        { id: 'hi', expr: 'mu + k * sg' },
        { id: 'h', expr: `(hi - lo) / ${STRIPS}` },
        ...[0, 1, 2, 3].map((part) => ({ id: `a${part}`, expr: simpson('lo', 'h', part) })),
        { id: 'inside', expr: 'h / 3 * (a0 + a1 + a2 + a3)' },
        // The whole curve, out to ±8σ where it is below 10⁻¹⁴.
        { id: 'L', expr: 'mu - 8 * sg' },
        { id: 'H', expr: `16 * sg / ${STRIPS}` },
        ...[0, 1, 2, 3].map((part) => ({ id: `b${part}`, expr: simpson('L', 'H', part) })),
        { id: 'whole', expr: 'H / 3 * (b0 + b1 + b2 + b3)' },
      ],
      objects: [
        { type: 'area', fn: 'f', from: 'lo', to: 'hi', color: 'amber', opacity: 0.35, visible: 'k > 0' },
        ...[1, 2, 3].flatMap((i) =>
          [-1, 1].map((s) => ({
            type: 'segment' as const,
            from: [`mu + ${s * i} * sg`, 0] as [string, number],
            to: [`mu + ${s * i} * sg`, `f(mu + ${s * i} * sg)`] as [string, string],
            color: 'muted' as const,
            dashed: true,
            width: 1,
          }))
        ),
        ...[-3, -2, -1, 1, 2, 3].map((i) => ({
          type: 'text' as const,
          at: [`mu + ${i} * sg`, -0.04] as [string, number],
          text: `${i > 0 ? '+' : '−'}${Math.abs(i)}σ`,
          color: 'muted' as const,
        })),
        { type: 'text', at: ['mu', -0.04], text: 'μ', color: 'ink' },
        { type: 'function', fn: 'f', samples: 400, color: 'primary', width: 3 },
        { type: 'segment', from: ['mu', 0], to: ['mu', 'f(mu)'], color: 'ink', width: 1 },
        // The curve bends the other way at μ ± σ.
        { type: 'point', at: ['mu - sg', 'f(mu - sg)'], color: 'red', size: 5 },
        { type: 'point', at: ['mu + sg', 'f(mu + sg)'], color: 'red', size: 5 },
        { type: 'text', at: ['mu + sg + 0.15', 'f(mu + sg) + 0.04'], text: t('inflection', '拐点'), color: 'red', anchor: 'start' },
        { type: 'point', at: ['mu', 0], color: 'ink', size: 6, drag: { x: 'mu' } },
      ],
      readouts: [
        { label: 'P(\\mu - k\\sigma < X < \\mu + k\\sigma)', expr: 'inside', digits: 4, highlight: true },
        { label: '\\mu - k\\sigma', expr: 'lo', digits: 2 },
        { label: '\\mu + k\\sigma', expr: 'hi', digits: 2 },
        { label: t('\\text{whole area}', '\\text{总面积}'), expr: 'whole', digits: 6 },
        { label: 'f(\\mu) = \\tfrac{1}{\\sigma\\sqrt{2\\pi}}', expr: 'f(mu)', digits: 4 },
        { label: t('\\text{outside, one side}', '\\text{单侧尾部}'), expr: '(whole - inside) / 2', digits: 5 },
      ],
    };
  },
  guide: [
    {
      title: { en: 'Probability is area', zh: '概率就是面积' },
      body: {
        en: 'For a continuous quantity the curve is a **density**: the chance of landing between two values is the area under the curve between them. The whole area is $1$. Shade $\\mu\\pm2\\sigma$ and the board measures $0.9545$.',
        zh: '对于连续取值的量，这条曲线是**密度**：落在两个值之间的概率，就是这两个值之间曲线下的面积。总面积是 $1$。涂上 $\\mu\\pm2\\sigma$ 这一段，画板量出 $0.9545$。',
      },
      set: { mu: 0, sg: 1, k: 2 },
    },
    {
      title: { en: '68%, 95%, 99.7%', zh: '68%、95%、99.7%' },
      body: {
        en: 'Within one standard deviation: $0.6827$. Within two: $0.9545$. Within three: $0.9973$, leaving only $0.00135$ in each tail. That is the $3\\sigma$ rule: outside $\\mu\\pm3\\sigma$ is about $3$ in $1000$.',
        zh: '一个标准差以内是 $0.6827$，两个以内是 $0.9545$，三个以内是 $0.9973$，每一侧尾部只剩 $0.00135$。这就是 $3\\sigma$ 原则：落在 $\\mu\\pm3\\sigma$ 之外的大约只有千分之三。',
      },
      set: { mu: 0, sg: 1, k: 3 },
    },
    {
      title: { en: 'Change σ, keep the share', zh: '改变 σ，比例不变' },
      body: {
        en: 'Widen to $\\sigma=2$ and move to $\\mu=1.5$. The curve is twice as wide and half as tall (peak $0.1995$), so the area over $\\mu\\pm\\sigma$ is unchanged: still $0.6827$.',
        zh: '把 $\\sigma$ 调到 $2$，再把 $\\mu$ 移到 $1.5$。曲线宽了一倍、矮了一半（峰值 $0.1995$），所以 $\\mu\\pm\\sigma$ 上的面积不变，仍是 $0.6827$。',
      },
      set: { mu: 1.5, sg: 2, k: 1 },
    },
    {
      title: { en: 'Narrow and tall', zh: '又窄又高' },
      body: {
        en: 'At $\\sigma=0.6$ the peak rises to $0.6649$, but the total area still reads $1$: a smaller spread squeezes the same probability into a narrower range.',
        zh: '$\\sigma=0.6$ 时峰值升到 $0.6649$，但总面积仍然是 $1$：标准差变小，同样多的概率被挤进更窄的范围里。',
      },
      set: { mu: 0, sg: 0.6, k: 1 },
    },
  ],
  sections: [
    {
      id: 'density',
      title: { en: 'The curve', zh: '这条曲线' },
      body: {
        en: 'The normal density with mean $\\mu$ and standard deviation $\\sigma$ is\n\n$$f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$\n\n- It is symmetric about $\\mu$ and highest there.\n- It bends the other way exactly at $\\mu\\pm\\sigma$ (red points): $f\'\'(x)$ has the sign of $(x-\\mu)^2-\\sigma^2$.\n- The factor $\\frac{1}{\\sigma\\sqrt{2\\pi}}$ is there only to make the whole area $1$; the board checks this numerically.',
        zh: '均值为 $\\mu$、标准差为 $\\sigma$ 的正态密度是\n\n$$f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}$$\n\n- 它关于 $\\mu$ 对称，在 $\\mu$ 处最高。\n- 它恰好在 $\\mu\\pm\\sigma$ 处改变弯曲方向（红点）：$f\'\'(x)$ 的符号与 $(x-\\mu)^2-\\sigma^2$ 相同。\n- 前面的系数 $\\frac{1}{\\sigma\\sqrt{2\\pi}}$ 只是为了让总面积等于 $1$，画板用数值积分验证了这一点。',
      },
    },
    {
      id: 'standardise',
      title: { en: 'Why the shares do not depend on μ and σ', zh: '为什么比例与 μ、σ 无关' },
      body: {
        en: 'Substitute $z=\\frac{x-\\mu}{\\sigma}$. Then $dx=\\sigma\\,dz$, and $x=\\mu\\pm k\\sigma$ becomes $z=\\pm k$:\n\n$$\\int_{\\mu-k\\sigma}^{\\mu+k\\sigma}\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}dx=\\int_{-k}^{k}\\frac{1}{\\sqrt{2\\pi}}e^{-\\frac{z^2}{2}}dz$$\n\n$\\mu$ and $\\sigma$ have disappeared. Moving $\\mu$ slides the picture; changing $\\sigma$ stretches it sideways by $\\sigma$ and squashes it by $\\sigma$, and areas are unchanged by that. This is why one table of the standard normal serves every normal distribution.',
        zh: '令 $z=\\frac{x-\\mu}{\\sigma}$，则 $dx=\\sigma\\,dz$，$x=\\mu\\pm k\\sigma$ 变成 $z=\\pm k$：\n\n$$\\int_{\\mu-k\\sigma}^{\\mu+k\\sigma}\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^2}{2\\sigma^2}}dx=\\int_{-k}^{k}\\frac{1}{\\sqrt{2\\pi}}e^{-\\frac{z^2}{2}}dz$$\n\n$\\mu$ 和 $\\sigma$ 都消失了。改变 $\\mu$ 只是平移；改变 $\\sigma$ 是横向拉伸 $\\sigma$ 倍、纵向压缩 $\\sigma$ 倍，面积不变。所以一张标准正态分布表就能用于所有正态分布。',
      },
    },
    {
      id: 'numbers',
      title: { en: 'Where 0.6827 comes from', zh: '0.6827 是怎么算出来的' },
      body: {
        en: 'The integral of $e^{-z^2/2}$ has no formula in elementary functions, so the numbers have to be computed. The board does what a table-maker does: it cuts $[\\mu-k\\sigma,\\,\\mu+k\\sigma]$ into $48$ strips and adds them up with Simpson\'s rule, which is accurate here to better than $10^{-5}$. That the whole area is exactly $1$ can be proved (square the integral and switch to polar coordinates), but that proof is beyond this chapter.',
        zh: '$e^{-z^2/2}$ 的积分写不成初等函数，这些数只能算出来。画板做的就是编表的人做的事：把 $[\\mu-k\\sigma,\\,\\mu+k\\sigma]$ 切成 $48$ 条，用辛普森公式加起来，这里的精度好于 $10^{-5}$。总面积恰好是 $1$ 可以严格证明（把积分平方后换成极坐标），但那个证明超出了本章的范围。',
      },
    },
    {
      id: 'why-normal',
      title: { en: 'Why so many things are normal', zh: '为什么这么多量服从正态分布' },
      body: {
        en: 'A quantity made of many small independent contributions, such as a height, a measurement error or the number of heads in many tosses, is close to normal whatever the contributions look like. This is the central limit theorem. You can see the start of it in the binomial chapter: with $p=0.5$ and $n=20$ the bars already trace a bell.',
        zh: '一个量如果由许多微小、独立的因素叠加而成，比如身高、测量误差、多次抛硬币的正面次数，那么不论每个因素是什么分布，它都接近正态分布。这就是中心极限定理。在二项分布那一章可以看到它的开端：$p=0.5$、$n=20$ 时柱子已经排成一口钟的形状。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'Heights are normal with $\\mu=170$ cm and $\\sigma=6$ cm. About what share is between $158$ and $182$ cm?',
        zh: '身高服从 $\\mu=170$ cm、$\\sigma=6$ cm 的正态分布。身高在 $158$ 到 $182$ cm 之间的大约占多少？',
      },
      choices: [
        { en: '$95\\%$', zh: '$95\\%$' },
        { en: '$68\\%$', zh: '$68\\%$' },
        { en: '$99.7\\%$', zh: '$99.7\\%$' },
        { en: '$50\\%$', zh: '$50\\%$' },
      ],
      answer: 0,
      explanation: {
        en: '$158$ and $182$ are $\\mu\\pm2\\sigma$.',
        zh: '$158$ 和 $182$ 正好是 $\\mu\\pm2\\sigma$。',
      },
    },
    {
      question: {
        en: 'If $\\sigma$ doubles, what happens to the peak height of the curve?',
        zh: '$\\sigma$ 变成原来的 $2$ 倍，曲线的峰值怎样变化？',
      },
      choices: [
        { en: 'It halves', zh: '变成一半' },
        { en: 'It doubles', zh: '变成 $2$ 倍' },
        { en: 'It stays the same', zh: '不变' },
        { en: 'It drops to a quarter', zh: '变成四分之一' },
      ],
      answer: 0,
      explanation: {
        en: 'The peak is $\\frac{1}{\\sigma\\sqrt{2\\pi}}$. Twice as wide must mean half as tall to keep the area $1$.',
        zh: '峰值是 $\\frac{1}{\\sigma\\sqrt{2\\pi}}$。宽了一倍，就必须矮一半，面积才能保持为 $1$。',
      },
    },
    {
      question: {
        en: 'A part should measure $10.00$ mm with $\\sigma=0.02$ mm. One measures $10.08$ mm. What does the $3\\sigma$ rule suggest?',
        zh: '某零件标准尺寸 $10.00$ mm，$\\sigma=0.02$ mm。测得一个零件为 $10.08$ mm，按 $3\\sigma$ 原则应怎样判断？',
      },
      choices: [
        { en: 'Something is probably wrong: it is $4\\sigma$ out', zh: '很可能出了问题：偏离了 $4\\sigma$' },
        { en: 'Normal variation', zh: '属于正常波动' },
        { en: 'It is exactly $3\\sigma$ out', zh: '正好偏离 $3\\sigma$' },
        { en: 'Nothing can be said', zh: '无法判断' },
      ],
      answer: 0,
      explanation: {
        en: '$0.08/0.02=4$. Values beyond $3\\sigma$ happen only about $3$ times in $1000$, so it is worth checking the process.',
        zh: '$0.08/0.02=4$。超出 $3\\sigma$ 的情况大约只有千分之三，所以值得检查生产过程。',
      },
    },
  ],
  resultTex: '\\mu \\pm 3\\sigma:\\ 99.73\\%',
  related: ['binomial-distribution', 'riemann-sum-area'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Show the normal curve and shade μ ± σ, μ ± 2σ and μ ± 3σ in turn, labelling the areas 68.27%, 95.45% and 99.73%; then stretch σ and show the curve getting wider and lower while the shaded shares stay the same.',
    zh: '展示正态曲线，依次涂出 μ ± σ、μ ± 2σ、μ ± 3σ 三段，标出面积 68.27%、95.45%、99.73%；再拉大 σ，曲线变宽变矮，而阴影所占的比例保持不变。',
  },
};
