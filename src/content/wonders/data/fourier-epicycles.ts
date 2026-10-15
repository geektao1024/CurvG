import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the 1/3 radius,
 * the ≈ 9% overshoot and the error figures all come from
 * `@/lib/wonders/fourier`.
 */
export const fourierEpicycles: Wonder = {
  slug: 'fourier-epicycles',
  publication: 'public',
  number: 1,
  updated: '2026-10-14',
  field: { zh: '分析 · 信号', en: 'Analysis · Signals' },
  name: { zh: '傅里叶级数', en: 'Fourier series' },
  metaTitle: {
    zh: '傅里叶级数动画：一串旋转的圆怎样画出任何曲线 | CurvG',
    en: 'Fourier Series Animation: Circles That Draw Any Curve | CurvG',
  },
  question: {
    zh: '一串旋转的圆，为什么能画出任何曲线？',
    en: 'How can a chain of spinning circles draw any curve?',
  },
  summary: {
    zh: '每个圆都是一个匀速旋转的正弦分量，首尾相接就能叠出方波，甚至画出一个 π。看圆一个个加上去，再自己画一笔，看它被拆成圆。',
    en: 'Each circle is one sine wave spinning at a steady rate. Chain them tip to tail and they build a square wave, or even draw π. Watch the circles stack up, then draw your own curve and see it taken apart.',
  },
  takeaway: {
    zh: '任何周期运动都能拆成一串匀速旋转的圆；圆越多越准，但拐角处约 9% 的尖角永远不会消失。',
    en: 'Any periodic motion splits into circles turning at steady speeds. More circles get closer, but the ≈ 9% spike at a jump never goes away.',
  },
  beats: [
    {
      zh: '一个匀速旋转的圆，只会画出一种曲线：正弦波。',
      en: 'One circle turning at a steady speed can only draw one curve: a sine wave.',
    },
    {
      zh: '在它边上再挂一个圆，转速是 3 倍，半径是 1/3。波形开始变方了。',
      en: 'Hang a second circle on its rim, turning three times as fast at a third of the size. The wave starts to square off.',
    },
    {
      zh: '继续往上挂圆，转速 5 倍、7 倍、9 倍，半径越来越小。曲线越来越像方波。',
      en: 'Keep adding circles at five, seven, nine times the speed, each one smaller. The curve looks more and more like a square wave.',
    },
    {
      zh: '可拐角处总冒出一个尖角，高出约 9%。加到 60 个圆，它变窄了，却一点没变矮。这叫吉布斯现象。',
      en: 'But a spike pops up at every corner, about 9% too high. With 60 circles it gets narrower, not shorter. This is the Gibbs phenomenon.',
    },
    {
      zh: '让同一种圆在平面里转。只要大小和起点排对了，它们能画出任何闭合图形。',
      en: 'Now let the circles turn in the plane. Pick the right sizes and starting angles, and they can trace any closed shape.',
    },
    {
      zh: '只留 3 个圆，π 糊成一团；把圆一个个加回去，到 100 个，笔画就清清楚楚。',
      en: 'Keep only three circles and π is a blob. Add them back one by one, and by a hundred every stroke is crisp.',
    },
    {
      zh: '丢掉小圆、只留 30 个大圆，图形几乎不变。JPEG 和 MP3 压缩用的就是这个思路。',
      en: 'Drop the small circles, keep the 30 largest, and the shape barely changes. JPEG and MP3 compression run on the same idea.',
    },
    {
      zh: '现在轮到你：换个波形，调圆的数量，或者自己画一笔。',
      en: 'Your turn: switch the wave, change the number of circles, or draw something yourself.',
    },
  ],
  film: [
    {
      text: {
        zh: '一串旋转的圆，能画出任何曲线吗？先看一个圆：它只能画出一种曲线，正弦波。',
        en: 'Can a chain of spinning circles draw any curve? Start with one. On its own it can only draw a sine wave.',
      },
    },
    {
      text: {
        zh: '在它边上挂第二个圆，转速 3 倍，半径三分之一。波形开始变方了。',
        en: 'Hang a second circle on its rim: three times as fast, a third of the size. The wave starts to square off.',
      },
    },
    {
      text: {
        zh: '继续加圆，5 倍、7 倍、9 倍，一个比一个小。曲线越来越像方波。',
        en: 'Keep going: five, seven, nine times the speed, each one smaller. It looks more and more like a square wave.',
      },
    },
    {
      text: {
        zh: '但拐角处总冒出一个尖角，高出约 9%。加到 60 个圆，它变窄了，却一点没变矮。这叫吉布斯现象。',
        en: 'But every corner grows a spike, about 9% too high. With 60 circles it gets narrower, not shorter. That is the Gibbs phenomenon.',
      },
      speak: {
        zh: '但拐角处总冒出一个尖角，高出约百分之九。加到六十个圆，它变窄了，却一点没变矮。这叫吉布斯现象。',
        en: 'But every corner grows a spike, about nine percent too high. With sixty circles it gets narrower, not shorter. That is the Gibbs phenomenon.',
      },
    },
    {
      text: {
        zh: '把同样的圆放到平面里转。只要大小和起点排对，它们能画出任何闭合图形，比如一个 π。',
        en: 'Now let the circles turn in the plane. Get the sizes and starting angles right, and they can trace any closed shape, even π.',
      },
      speak: {
        zh: '把同样的圆放到平面里转。只要大小和起点排对，它们能画出任何闭合图形，比如一个派。',
        en: 'Now let the circles turn in the plane. Get the sizes and starting angles right, and they can trace any closed shape, even pi.',
      },
    },
    {
      text: {
        zh: '只留 3 个圆，π 糊成一团。把圆一个个加回去，到 100 个，笔画就清清楚楚。',
        en: 'Keep only three circles and π is a blob. Add them back one by one, and by a hundred every stroke is crisp.',
      },
      speak: {
        zh: '只留三个圆，派糊成一团。把圆一个个加回去，到一百个，笔画就清清楚楚。',
        en: 'Keep only three circles and pi is a blob. Add them back one by one, and by a hundred every stroke is crisp.',
      },
    },
    {
      text: {
        zh: '丢掉小圆，只留 30 个大圆，图形几乎不变。JPEG 和 MP3 压缩，用的就是这个思路。',
        en: 'Drop the small circles, keep the 30 largest, and the shape barely changes. JPEG and MP3 compression run on the same idea.',
      },
    },
    {
      text: {
        zh: '想自己试试？打开 CurvG，换个波形，或者随手画一笔，让圆替你画出来。',
        en: 'Want to try? Open CurvG, switch the wave, or draw anything you like, and watch the circles draw it back.',
      },
    },
  ],
  sections: [
    {
      id: 'one-circle',
      title: { zh: '一个圆，一条正弦波', en: 'One circle, one sine wave' },
      body: {
        zh: '一个点在半径为 $r$ 的圆上匀速转，角度 $\\theta$ 随时间均匀增加。它的高度是 $r\\sin\\theta$，把高度随时间记下来，就是一条正弦波。\n\n圆转得越快，波越密；圆越大，波越高。转速和半径，就是这个圆的全部信息。',
        en: 'A point moves round a circle of radius $r$ at a steady rate, so its angle $\\theta$ grows evenly with time. Its height is $r\\sin\\theta$. Record that height over time and you get a sine wave.\n\nA faster circle makes a denser wave, a bigger one a taller wave. Speed and radius are all there is to know about the circle.',
      },
    },
    {
      id: 'stacking',
      title: { zh: '把圆叠起来：傅里叶级数', en: 'Stacking circles: the Fourier series' },
      body: {
        zh: '把第二个圆的圆心钉在第一个圆的边上，末端的高度就是两条正弦波相加。方波需要的圆是这样一串：转速取 1、3、5、7……倍，半径按 $1, \\tfrac13, \\tfrac15, \\tfrac17, \\dots$ 缩小：\n\n$$f(\\theta)=\\frac{4}{\\pi}\\left(\\sin\\theta+\\frac{\\sin 3\\theta}{3}+\\frac{\\sin 5\\theta}{5}+\\cdots\\right)$$\n\n傅里叶在研究热传导时提出：任何周期函数都能写成这样一串正弦和余弦的和。每个圆的大小，就是那一项的系数。\n\n- 三角波的半径按 $1/n^2$ 缩小，5 个圆的误差就只有约 1%；\n- 方波按 $1/n$ 缩小，要慢得多：5 个圆还差约 20%，60 个圆仍差约 6%。\n\n曲线越尖锐，需要的圆越多。',
        en: 'Pin the centre of a second circle to the rim of the first, and the height of the end point is the sum of two sine waves. A square wave needs circles turning 1, 3, 5, 7… times as fast, with radii shrinking as $1, \\tfrac13, \\tfrac15, \\tfrac17, \\dots$:\n\n$$f(\\theta)=\\frac{4}{\\pi}\\left(\\sin\\theta+\\frac{\\sin 3\\theta}{3}+\\frac{\\sin 5\\theta}{5}+\\cdots\\right)$$\n\nFourier, working on how heat spreads, claimed that any periodic function can be written as a sum like this of sines and cosines. The size of each circle is the coefficient of its term.\n\n- A triangle wave\'s radii shrink as $1/n^2$, so five circles are already within about 1%.\n- A square wave\'s shrink as $1/n$, which is much slower: five circles are still about 20% off, and sixty about 6%.\n\nThe sharper the curve, the more circles it takes.',
      },
    },
    {
      id: 'gibbs',
      title: { zh: '拐角处的 9%：吉布斯现象', en: 'The 9% at the corner: the Gibbs phenomenon' },
      body: {
        zh: '方波在跳变处，部分和总会冲过头。加更多的圆，尖角会变窄、贴近跳变点，但它的高度稳定在跳变幅度的约 **8.95%**。对 $\\pm1$ 的方波，峰值约为 $1.179$。\n\n误差的总量确实越来越小（尖角越来越窄），但最大偏差不会消失。数学上说，傅里叶级数在跳变附近**不一致收敛**。Wilbraham 在 1848 年最先注意到它，Gibbs 在 1899 年再次指出，名字因此留给了 Gibbs。\n\n工程里常用加权平均（如 Fejér 求和）压掉尖角，代价是拐角变圆。',
        en: 'At a jump, the partial sums of a square wave always overshoot. More circles make the spike narrower and push it towards the jump, but its height settles at about **8.95%** of the jump. For a square wave of $\\pm1$ the peak is about $1.179$.\n\nThe total error does keep shrinking, because the spike keeps getting thinner, but the largest error never goes away. In the language of analysis, the series does **not converge uniformly** near the jump. Wilbraham noticed it first, in 1848; Gibbs pointed it out again in 1899 and the name stuck.\n\nEngineers often tame the spike with weighted averages such as Fejér summation, at the cost of rounding off the corner.',
      },
    },
    {
      id: 'plane',
      title: { zh: '从波形到图形：平面里的圆', en: 'From waves to shapes: circles in the plane' },
      body: {
        zh: '把平面上的点看成复数 $z=x+iy$，一个旋转的圆就是 $c_k e^{2\\pi i k t}$：$|c_k|$ 是半径，$c_k$ 的辐角是起始角度，$k$ 是转速（负数表示顺时针）。一条闭合曲线 $z(t)$ 可以写成\n\n$$z(t)=\\sum_{k} c_k\\, e^{2\\pi i k t},\\qquad c_k=\\frac1N\\sum_{j=0}^{N-1} z_j\\, e^{-2\\pi i k j/N}$$\n\n这里先把曲线按弧长均匀取 $N=256$ 个点 $z_j$，再做离散傅里叶变换求出每个圆。画的时候按半径从大到小排，最大的圆决定大轮廓，小圆负责细节。\n\n画板上的 π：3 个圆的误差约 40%，30 个约 2%，100 个只剩约 0.3%。',
        en: 'Treat a point in the plane as a complex number $z=x+iy$. A spinning circle is then $c_k e^{2\\pi i k t}$: $|c_k|$ is the radius, the angle of $c_k$ is where it starts, and $k$ is the speed (negative means clockwise). A closed curve $z(t)$ can be written as\n\n$$z(t)=\\sum_{k} c_k\\, e^{2\\pi i k t},\\qquad c_k=\\frac1N\\sum_{j=0}^{N-1} z_j\\, e^{-2\\pi i k j/N}$$\n\nHere the curve is first sampled at $N=256$ points $z_j$ evenly spaced along its length, and a discrete Fourier transform gives every circle. They are drawn largest first: the big circles set the outline, the small ones add detail.\n\nFor the π on the stage, three circles leave about 40% error, thirty about 2%, and a hundred only about 0.3%.',
      },
    },
    {
      id: 'why-it-matters',
      title: { zh: '为什么重要', en: 'Why it matters' },
      body: {
        zh: '"拆成一串频率"几乎是现代信号处理的起点：\n\n- **压缩**：JPEG 把图像小块拆成余弦分量（傅里叶的近亲），MP3 对声音做同样的事，然后丢掉人眼人耳不敏感的小分量；\n- **频谱**：调音器、均衡器、语音识别先看声音里有哪些频率；\n- **解方程**：傅里叶最初就是用它解热传导方程，每个频率分量各自衰减，最后再加回去。',
        en: 'Splitting a signal into frequencies is close to the starting point of modern signal processing:\n\n- **Compression**: JPEG splits each image block into cosine components (a close relative of Fourier\'s) and MP3 does the same for sound; both then drop the small components we barely notice.\n- **Spectra**: tuners, equalisers and speech recognition all start by asking which frequencies a sound contains.\n- **Solving equations**: Fourier built the method to solve the heat equation; each frequency fades on its own, and the pieces are added back together.',
      },
    },
  ],
  faq: [
    {
      question: { zh: '为什么一定是圆？', en: 'Why circles?' },
      answer: {
        zh: '匀速转圆是最简单的周期运动：它在任一方向上的投影都是正弦波。正弦波之间互不干扰（正交），所以每个圆的大小可以单独算出来，加减一个圆也不影响其他圆。',
        en: 'A circle turning at a steady speed is the simplest periodic motion, and its shadow in any direction is a sine wave. Sine waves of different frequencies do not interfere with each other (they are orthogonal), so each circle\'s size can be worked out on its own, and adding or removing one leaves the others unchanged.',
      },
    },
    {
      question: { zh: '要多少个圆才够？', en: 'How many circles are enough?' },
      answer: {
        zh: '取决于曲线有多"尖"。光滑的曲线系数下降得快，几个圆就很像；有拐角或跳变的曲线下降得慢，要很多圆，而且跳变处总留着吉布斯尖角。',
        en: 'It depends on how sharp the curve is. Smooth curves have coefficients that shrink fast, so a few circles look right. Curves with corners or jumps shrink slowly, need many circles, and always keep the Gibbs spike at a jump.',
      },
    },
    {
      question: { zh: '吉布斯尖角能去掉吗？', en: 'Can the Gibbs spike be removed?' },
      answer: {
        zh: '只加圆去不掉。可以给各项加权（例如 Fejér 求和、σ 因子）把尖角压平，代价是拐角变得圆钝。',
        en: 'Not by adding circles. Weighting the terms (Fejér summation, sigma factors) flattens it, at the cost of a blunter corner.',
      },
    },
    {
      question: { zh: '我画的线没有闭合，会怎样？', en: 'What if my drawing is not closed?' },
      answer: {
        zh: '傅里叶级数默认曲线是周期的，会把终点直接连回起点。这一段相当于一个跳变，你会在那里看到圆圈来回抖动的波纹，这正是吉布斯现象在平面上的样子。',
        en: 'A Fourier series assumes the curve repeats, so it joins the end straight back to the start. That join acts like a jump, and you will see ripples there: the Gibbs phenomenon in the plane.',
      },
    },
  ],
  relatedCurves: ['epitrochoid', 'epicycloid', 'hypotrochoid'],
  relatedLabs: ['unit-circle-sine', 'sinusoidal-function', 'wave-interference'],
  sources: [
    {
      title: 'Fourier series — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Fourier_series',
    },
    {
      title: 'Gibbs phenomenon — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Gibbs_phenomenon',
    },
  ],
};
