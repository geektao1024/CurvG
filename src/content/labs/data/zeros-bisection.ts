import { pick, type Lab } from '../types';

export const zerosBisection: Lab = {
  slug: 'zeros-bisection',
  publication: 'public',
  levels: ['high'],
  chapterTitle: { en: 'Zeros & bisection', zh: '零点与二分法' },
  title: {
    en: 'Zeros and the bisection method: trapping a root by halving',
    zh: '函数零点与二分法：一次次对半，把零点夹住',
  },
  question: {
    en: 'How can you find a zero of f(x) = x³ − 3x + 1 to two decimal places without solving the equation?',
    zh: '不解方程，怎样把 f(x) = x³ − 3x + 1 的零点求到精确到 0.01？',
  },
  summary: {
    en: 'Pick an interval where f changes sign, then halve it again and again, keeping the half that still changes sign. Watch [a, b] shrink around a root of x³ − 3x + 1, and see when the method cannot start.',
    zh: '先找一个函数值变号的区间，然后一次次对半，总留下仍然变号的那一半。看区间 [a, b] 怎样围着 x³ − 3x + 1 的零点越缩越小，以及什么情况下这个方法无从下手。',
  },
  keyPoints: [
    { en: 'Zeros of a function', zh: '函数的零点' },
    { en: 'Intermediate value theorem', zh: '零点存在定理' },
    { en: 'Bisection method', zh: '二分法' },
    { en: 'Approximation to a given accuracy', zh: '按精度求近似值' },
  ],
  board: (lang) => {
    const t = pick(lang);
    return {
      view: { x: [-2.6, 2.6], y: [-3.5, 4], equal: false },
      params: [
        { id: 'lo', label: 'a', min: -2.5, max: 2.5, step: 0.1, value: 0 },
        { id: 'hi', label: 'b', min: -2.5, max: 2.5, step: 0.1, value: 1 },
        { id: 'n', label: 'n', min: 0, max: 10, step: 1, value: 2, play: 10 },
      ],
      functions: [{ id: 'f', expr: 'x^3 - 3 * x + 1' }],
      // One halving per pair: after step k the bracket is [ak, bk]. Steps
      // past n copy the previous bracket, so a10, b10 hold the n-th one.
      scalars: [
        { id: 'a1', expr: 'n >= 1 ? (f(lo) * f((lo + hi) / 2) <= 0 ? lo : (lo + hi) / 2) : lo' },
        { id: 'b1', expr: 'n >= 1 ? (f(lo) * f((lo + hi) / 2) <= 0 ? (lo + hi) / 2 : hi) : hi' },
        { id: 'a2', expr: 'n >= 2 ? (f(a1) * f((a1 + b1) / 2) <= 0 ? a1 : (a1 + b1) / 2) : a1' },
        { id: 'b2', expr: 'n >= 2 ? (f(a1) * f((a1 + b1) / 2) <= 0 ? (a1 + b1) / 2 : b1) : b1' },
        { id: 'a3', expr: 'n >= 3 ? (f(a2) * f((a2 + b2) / 2) <= 0 ? a2 : (a2 + b2) / 2) : a2' },
        { id: 'b3', expr: 'n >= 3 ? (f(a2) * f((a2 + b2) / 2) <= 0 ? (a2 + b2) / 2 : b2) : b2' },
        { id: 'a4', expr: 'n >= 4 ? (f(a3) * f((a3 + b3) / 2) <= 0 ? a3 : (a3 + b3) / 2) : a3' },
        { id: 'b4', expr: 'n >= 4 ? (f(a3) * f((a3 + b3) / 2) <= 0 ? (a3 + b3) / 2 : b3) : b3' },
        { id: 'a5', expr: 'n >= 5 ? (f(a4) * f((a4 + b4) / 2) <= 0 ? a4 : (a4 + b4) / 2) : a4' },
        { id: 'b5', expr: 'n >= 5 ? (f(a4) * f((a4 + b4) / 2) <= 0 ? (a4 + b4) / 2 : b4) : b4' },
        { id: 'a6', expr: 'n >= 6 ? (f(a5) * f((a5 + b5) / 2) <= 0 ? a5 : (a5 + b5) / 2) : a5' },
        { id: 'b6', expr: 'n >= 6 ? (f(a5) * f((a5 + b5) / 2) <= 0 ? (a5 + b5) / 2 : b5) : b5' },
        { id: 'a7', expr: 'n >= 7 ? (f(a6) * f((a6 + b6) / 2) <= 0 ? a6 : (a6 + b6) / 2) : a6' },
        { id: 'b7', expr: 'n >= 7 ? (f(a6) * f((a6 + b6) / 2) <= 0 ? (a6 + b6) / 2 : b6) : b6' },
        { id: 'a8', expr: 'n >= 8 ? (f(a7) * f((a7 + b7) / 2) <= 0 ? a7 : (a7 + b7) / 2) : a7' },
        { id: 'b8', expr: 'n >= 8 ? (f(a7) * f((a7 + b7) / 2) <= 0 ? (a7 + b7) / 2 : b7) : b7' },
        { id: 'a9', expr: 'n >= 9 ? (f(a8) * f((a8 + b8) / 2) <= 0 ? a8 : (a8 + b8) / 2) : a8' },
        { id: 'b9', expr: 'n >= 9 ? (f(a8) * f((a8 + b8) / 2) <= 0 ? (a8 + b8) / 2 : b8) : b8' },
        { id: 'a10', expr: 'n >= 10 ? (f(a9) * f((a9 + b9) / 2) <= 0 ? a9 : (a9 + b9) / 2) : a9' },
        { id: 'b10', expr: 'n >= 10 ? (f(a9) * f((a9 + b9) / 2) <= 0 ? (a9 + b9) / 2 : b9) : b9' },
        { id: 'm', expr: '(a10 + b10) / 2' },
        { id: 'fm', expr: 'f(m)' },
        { id: 'ok', expr: 'f(lo) * f(hi) < 0' },
      ],
      objects: [
        { type: 'function', fn: 'f', color: 'primary', width: 2.8 },
        // The starting interval.
        { type: 'segment', from: ['lo', 0], to: ['lo', 'f(lo)'], color: 'muted', dashed: true, width: 1 },
        { type: 'segment', from: ['hi', 0], to: ['hi', 'f(hi)'], color: 'muted', dashed: true, width: 1 },
        { type: 'point', at: ['lo', 'f(lo)'], color: 'muted', size: 4 },
        { type: 'point', at: ['hi', 'f(hi)'], color: 'muted', size: 4 },
        // The current bracket after n halvings.
        { type: 'segment', from: ['a10', 0], to: ['b10', 0], color: 'amber', width: 7, opacity: 0.75 },
        { type: 'segment', from: ['m', 0], to: ['m', 'fm'], color: 'green', dashed: true, width: 1.2 },
        { type: 'point', at: ['m', 'fm'], color: 'green', size: 5, label: 'f(m)' },
        { type: 'point', at: ['m', 0], color: 'green', size: 4 },
        {
          type: 'point',
          at: ['lo', 0],
          color: 'blue',
          size: 6,
          label: 'a',
          drag: { x: 'lo' },
        },
        {
          type: 'point',
          at: ['hi', 0],
          color: 'red',
          size: 6,
          label: 'b',
          drag: { x: 'hi' },
        },
      ],
      readouts: [
        { label: 'a_n', expr: 'a10', digits: 4 },
        { label: 'b_n', expr: 'b10', digits: 4 },
        { label: 'b_n - a_n', expr: 'b10 - a10', digits: 4 },
        { label: 'm = \\tfrac{a_n + b_n}{2}', expr: 'm', digits: 4, highlight: true },
        { label: 'f(m)', expr: 'fm', digits: 4 },
        {
          kind: 'status',
          label: t('f(a) · f(b)', 'f(a) · f(b)'),
          expr: 'ok',
          ok: t('< 0: a zero is trapped', '< 0：区间内必有零点'),
          bad: t('≥ 0: bisection cannot start', '≥ 0：二分法无法开始'),
        },
      ],
    };
  },
  guide: [
    {
      title: { en: 'A sign change traps a zero', zh: '变号就夹住了零点' },
      body: {
        en: 'On $[0,1]$: $f(0)=1>0$ and $f(1)=-1<0$. The curve is unbroken, so it must cross the $x$-axis somewhere in between. The midpoint is $m=0.5$, where $f(0.5)=-0.375$.',
        zh: '在 $[0,1]$ 上：$f(0)=1>0$，$f(1)=-1<0$。曲线是连续不断的，所以它一定在两点之间穿过 $x$ 轴。中点 $m=0.5$ 处 $f(0.5)=-0.375$。',
      },
      set: { lo: 0, hi: 1, n: 0 },
    },
    {
      title: { en: 'Keep the half that still changes sign', zh: '留下仍然变号的那一半' },
      body: {
        en: '$f(0.5)<0$ and $f(0)>0$, so the zero is in $[0,0.5]$; throw the other half away. Two more halvings give $[0.25,0.375]$: after $n$ steps the interval is $\\frac{1}{2^n}$ as long, here $0.125$.',
        zh: '$f(0.5)<0$ 而 $f(0)>0$，零点在 $[0,0.5]$ 里，另一半扔掉。再对半两次得到 $[0.25,0.375]$：做 $n$ 次后区间长度变为原来的 $\\frac{1}{2^n}$，这里是 $0.125$。',
      },
      set: { lo: 0, hi: 1, n: 3 },
    },
    {
      title: { en: 'Stop when the interval is short enough', zh: '区间够短就停' },
      body: {
        en: 'For accuracy $0.01$ we need $\\frac{1}{2^n}<0.01$, so $n=7$: the interval is $[0.3438,0.3516]$, only $0.0078$ long. Its midpoint $0.3477$ is within $0.004$ of the true zero $0.3473$.',
        zh: '要精确到 $0.01$，需要 $\\frac{1}{2^n}<0.01$，即 $n=7$：区间是 $[0.3438,0.3516]$，长度只有 $0.0078$。中点 $0.3477$ 与真正的零点 $0.3473$ 相差不到 $0.004$。',
      },
      set: { lo: 0, hi: 1, n: 7 },
    },
    {
      title: { en: 'No sign change, no guarantee', zh: '不变号，就没有保证' },
      body: {
        en: 'Now try $[-1,2]$: $f(-1)=3$ and $f(2)=3$ have the same sign, yet the curve crosses the axis **twice** in between. The theorem only works one way: a sign change guarantees a zero, but no sign change proves nothing. Choose a smaller interval before you start.',
        zh: '再试 $[-1,2]$：$f(-1)=3$、$f(2)=3$ 同号，曲线却在中间穿过 $x$ 轴**两次**。这个定理只能单向用：变号保证有零点，不变号却什么也说明不了。开始之前要先把区间选小。',
      },
      set: { lo: -1, hi: 2, n: 0 },
    },
  ],
  sections: [
    {
      id: 'zeros',
      title: { en: 'Zeros are where the graph meets the axis', zh: '零点就是图像与 x 轴的交点' },
      body: {
        en: 'A **zero** of $f$ is a real number $x_0$ with $f(x_0)=0$. It is not a point: it is the $x$-coordinate where the graph meets the $x$-axis, and the same number is a root of the equation $f(x)=0$. The cubic $x^3-3x+1$ has three zeros, near $-1.879$, $0.347$ and $1.532$, and none of them has a tidy formula.',
        zh: '函数 $f$ 的**零点**是使 $f(x_0)=0$ 的实数 $x_0$。它不是一个点，而是图像与 $x$ 轴交点的横坐标，也就是方程 $f(x)=0$ 的根。三次函数 $x^3-3x+1$ 有三个零点，约为 $-1.879$、$0.347$ 和 $1.532$，都没有简单的表达式。',
      },
    },
    {
      id: 'existence',
      title: { en: 'The existence theorem', zh: '零点存在定理' },
      body: {
        en: 'If $f$ is continuous on $[a,b]$ and $f(a)\\cdot f(b)<0$, then $f$ has at least one zero in $(a,b)$.\n\n- It says **at least one**: on $[-2,2]$ the sign changes and there are three.\n- The converse is false: on $[-1,2]$ the sign does not change, yet there are two.\n- If $f$ is also monotonic on $[a,b]$, the zero is **unique**.',
        zh: '如果 $f$ 在 $[a,b]$ 上的图像连续不断，且 $f(a)\\cdot f(b)<0$，那么 $f$ 在 $(a,b)$ 内**至少有一个**零点。\n\n- 说的是"至少一个"：在 $[-2,2]$ 上变号，里面有三个零点。\n- 反过来不成立：在 $[-1,2]$ 上不变号，里面却有两个零点。\n- 如果 $f$ 在 $[a,b]$ 上还是单调的，零点就**唯一**。',
      },
    },
    {
      id: 'method',
      title: { en: 'The bisection method', zh: '二分法的步骤' },
      body: {
        en: '- Choose $[a,b]$ with $f(a)\\cdot f(b)<0$.\n- Take the midpoint $m=\\frac{a+b}{2}$ and compute $f(m)$. If $f(m)=0$, you are done.\n- If $f(a)\\cdot f(m)<0$, the zero is in $[a,m]$: set $b=m$. Otherwise set $a=m$.\n- Repeat until $b-a$ is smaller than the accuracy you need; any number in $[a,b]$ will do.',
        zh: '- 选定区间 $[a,b]$，使 $f(a)\\cdot f(b)<0$。\n- 取中点 $m=\\frac{a+b}{2}$，算出 $f(m)$；若 $f(m)=0$，$m$ 就是零点。\n- 若 $f(a)\\cdot f(m)<0$，零点在 $[a,m]$ 内，令 $b=m$；否则令 $a=m$。\n- 重复，直到 $b-a$ 小于要求的精度，区间内任意一个数都可以作为近似值。',
      },
    },
    {
      id: 'speed',
      title: { en: 'How many steps?', zh: '要做多少次？' },
      body: {
        en: 'Each step halves the interval, so after $n$ steps its length is $\\dfrac{b-a}{2^n}$. For an interval of length $1$ and accuracy $0.01$ you need $2^n>100$, so $n=7$; for $0.001$, $n=10$. Every step buys about $0.3$ decimal digits. That is slow compared with Newton\'s method, but bisection never fails once the sign change is there.',
        zh: '每做一次区间减半，做 $n$ 次后长度是 $\\dfrac{b-a}{2^n}$。区间长 $1$、精度 $0.01$ 时需要 $2^n>100$，即 $n=7$；精度 $0.001$ 时 $n=10$。每一步大约只多换来 $0.3$ 位小数，比牛顿法慢，但只要一开始变号，二分法就一定收敛。',
      },
    },
  ],
  quiz: [
    {
      question: {
        en: 'In which interval must $f(x)=\\ln x+2x-6$ have a zero?',
        zh: '$f(x)=\\ln x+2x-6$ 的零点一定在哪个区间内？',
      },
      choices: [
        { en: '$(2,3)$', zh: '$(2,3)$' },
        { en: '$(1,2)$', zh: '$(1,2)$' },
        { en: '$(3,4)$', zh: '$(3,4)$' },
        { en: '$(0,1)$', zh: '$(0,1)$' },
      ],
      answer: 0,
      explanation: {
        en: '$f(2)=\\ln2-2\\approx-1.31<0$ and $f(3)=\\ln3\\approx1.10>0$. $f$ is continuous and increasing, so its only zero lies in $(2,3)$.',
        zh: '$f(2)=\\ln2-2\\approx-1.31<0$，$f(3)=\\ln3\\approx1.10>0$。$f$ 连续且递增，所以它唯一的零点在 $(2,3)$ 内。',
      },
    },
    {
      question: {
        en: 'Starting from an interval of length $1$, how many halvings make it shorter than $0.05$?',
        zh: '从长度为 $1$ 的区间开始，至少对半几次，区间长度才小于 $0.05$？',
      },
      choices: [
        { en: '$5$', zh: '$5$' },
        { en: '$4$', zh: '$4$' },
        { en: '$20$', zh: '$20$' },
        { en: '$10$', zh: '$10$' },
      ],
      answer: 0,
      explanation: {
        en: '$\\frac{1}{2^4}=0.0625$ is still too long; $\\frac{1}{2^5}=0.03125<0.05$.',
        zh: '$\\frac{1}{2^4}=0.0625$ 还不够短；$\\frac{1}{2^5}=0.03125<0.05$。',
      },
    },
    {
      question: {
        en: 'If $f(a)\\cdot f(b)>0$ for a continuous $f$, then on $(a,b)$…',
        zh: '若连续函数 $f$ 满足 $f(a)\\cdot f(b)>0$，则 $f$ 在 $(a,b)$ 内…',
      },
      choices: [
        { en: 'there may or may not be a zero', zh: '可能有零点，也可能没有' },
        { en: 'there is no zero', zh: '一定没有零点' },
        { en: 'there is exactly one zero', zh: '恰有一个零点' },
        { en: 'there are at least two zeros', zh: '至少有两个零点' },
      ],
      answer: 0,
      explanation: {
        en: '$x^3-3x+1$ on $[-1,2]$ has two zeros with no sign change at the ends; $x^2+1$ on $[-1,1]$ has none.',
        zh: '$x^3-3x+1$ 在 $[-1,2]$ 上端点同号，却有两个零点；$x^2+1$ 在 $[-1,1]$ 上一个零点也没有。',
      },
    },
  ],
  resultTex: 'b_n - a_n = \\dfrac{b - a}{2^n}',
  related: ['monotonicity-extrema', 'quadratic-transformations'],
  updated: '2026-10-13',
  videoPrompt: {
    en: 'Find the zero of f(x) = x³ − 3x + 1 in [0, 1] by bisection: show the sign change f(0) = 1, f(1) = −1, halve the interval step by step, keeping the half that changes sign, until after 7 steps [0.3438, 0.3516] pins the zero near 0.347. End on [−1, 2], where the ends share a sign but two zeros hide inside.',
    zh: '用二分法求 f(x) = x³ − 3x + 1 在 [0, 1] 内的零点：先展示 f(0) = 1、f(1) = −1 变号，再一步步对半，每次留下变号的那一半，7 步后区间 [0.3438, 0.3516] 把零点锁定在 0.347 附近。最后展示 [−1, 2]：两端同号，里面却藏着两个零点。',
  },
};
