import type { Wonder } from '../types';

/**
 * Numbers in the copy are pinned by tests/wonders.test.ts: the escaping
 * orbit's step count, the story's deepest zoom, the zoom limit and the
 * period-78 copy all come from `@/lib/wonders/mandelbrot`.
 */
export const mandelbrotSet: Wonder = {
  slug: 'mandelbrot-set',
  publication: 'public',
  number: 2,
  updated: '2026-10-14',
  field: { zh: '复数 · 分形', en: 'Complex numbers · Fractals' },
  name: { zh: '曼德博集合', en: 'The Mandelbrot set' },
  metaTitle: {
    zh: '曼德博集合放大动画：一条 z² + c 为什么有无穷细节 | CurvG',
    en: 'Mandelbrot Set Zoom: Why z² + c Grows Endless Detail | CurvG',
  },
  question: {
    zh: '一条 z² + c，为什么能长出无穷无尽的细节？',
    en: 'How does one line, z² + c, grow endless detail?',
  },
  summary: {
    zh: '在平面上每个点反复算 z → z² + c，看它跑不跑得掉。把跑不掉的点涂黑，就得到曼德博集合：边界上永远有新的螺旋，还藏着缩小的自己。拖动、放大，亲手去找。',
    en: 'Take every point of the plane, apply z → z² + c over and over, and see whether it escapes. Colour the ones that stay and you get the Mandelbrot set: new spirals wherever you look on the edge, and small copies of the whole. Drag, zoom and go looking.',
  },
  takeaway: {
    zh: '规则只有一行，结果却有无限的复杂度：边界上处处是新的结构，还到处藏着整体的缩小副本。',
    en: 'A one-line rule with endless complexity: new structure all along the edge, and small copies of the whole hidden everywhere.',
  },
  beats: [
    {
      zh: '在平面上取一个点 c，从 0 出发，一遍遍地算 z → z² + c。这个点的轨迹绕着三个位置打转，永远跑不远。',
      en: 'Pick a point c in the plane, start from 0 and apply z → z² + c again and again. This point keeps cycling round three places and never gets far.',
    },
    {
      zh: '换一个点：它来回绕了三十多步，最后冲出半径为 2 的圆，从此一去不回。',
      en: 'Try another point: it wanders for more than thirty steps, then crosses the circle of radius 2 and never comes back.',
    },
    {
      zh: '把平面上每个点都这样算一遍：留下来的涂黑，逃走的按逃得多快上色。每多算一步，轮廓就收紧一圈。',
      en: 'Do this for every point: paint the ones that stay black, and colour the rest by how fast they escape. Each extra step tightens the outline.',
    },
    {
      zh: '沿着边界一路放大，钻进"海马谷"：螺旋里套着螺旋，细节永远没有尽头。',
      en: 'Zoom along the edge into "seahorse valley": spirals inside spirals, and the detail never runs out.',
    },
    {
      zh: '一直放大到三十多万倍，螺旋的正中心，冒出一个缩小的、完整的自己。',
      en: 'Keep going past 300,000 times, and at the very centre of the spiral sits a small but complete copy of the whole set.',
    },
    {
      zh: '现在轮到你：拖动画面，滚轮或双指放大，点任意一点看它的轨迹。',
      en: 'Your turn: drag to move, scroll or pinch to zoom, and tap any point to see its orbit.',
    },
  ],
  sections: [
    {
      id: 'rule',
      title: { zh: '只有一条规则', en: 'One rule' },
      body: {
        zh: '取一个复数 $c$，从 $z_0=0$ 开始反复计算\n\n$$z_{n+1}=z_n^2+c$$\n\n得到一串数 $0,\\ c,\\ c^2+c,\\ \\dots$，叫做 $c$ 的**轨道**。如果这串数永远不会跑到无穷远，$c$ 就属于曼德博集合。\n\n判断"跑没跑掉"有一条捷径：只要某一步 $|z_n|>2$，后面就一定越跑越远。所以画图时只需算到 $|z|$ 超过 2，或者算满一个步数上限为止。\n\n故事里的第一个点 $c\\approx-0.1226+0.7449i$ 很特别：三步之后正好回到 0，轨道是一个永远重复的三角形。第二个点 $c=-0.75+0.1i$ 离集合只差一点点，第 33 步才逃出去。',
        en: 'Take a complex number $c$, start from $z_0=0$ and keep computing\n\n$$z_{n+1}=z_n^2+c$$\n\nThe sequence $0,\\ c,\\ c^2+c,\\ \\dots$ is the **orbit** of $c$. If it never runs off to infinity, $c$ belongs to the Mandelbrot set.\n\nThere is a shortcut for deciding: once any $|z_n|>2$, the orbit is sure to escape. So a picture only needs to iterate until $|z|$ passes 2, or until a step limit is reached.\n\nThe first point in the story, $c\\approx-0.1226+0.7449i$, is special: after three steps it is back at 0, so its orbit is a triangle repeated forever. The second, $c=-0.75+0.1i$, sits just outside the set and escapes only at step 33.',
      },
    },
    {
      id: 'colour',
      title: { zh: '颜色从哪来', en: 'Where the colours come from' },
      body: {
        zh: '集合里的点涂成黑色。集合外的点都会逃走，只是快慢不同：离集合越近，逃得越慢。颜色就表示"第几步逃走"。\n\n为了让颜色连续过渡、没有一圈圈的台阶，这里用的是平滑逃逸值\n\n$$\\mu=n+1-\\log_2\\log|z_n|$$\n\n其中 $n$ 是逃出半径 16 时的步数。离边界越近，$\\mu$ 越大，颜色越亮。\n\n故事第三段里，步数上限从 1 慢慢加到 220：上限很小时，很多"迟早会逃"的点还没来得及逃，被错算成集合里的点，所以轮廓一开始是一大团，然后一圈圈收紧。',
        en: 'Points in the set are black. Every point outside escapes eventually, just at different speeds: the closer to the set, the slower. The colour shows when a point escaped.\n\nTo get smooth colour instead of rings of steps, the picture uses the smooth escape value\n\n$$\\mu=n+1-\\log_2\\log|z_n|$$\n\nwhere $n$ is the step at which the orbit passes radius 16. The closer to the edge, the larger $\\mu$ and the brighter the colour.\n\nIn the third part of the story the step limit climbs from 1 to 220. With a small limit, many points that will escape later have not escaped yet and are wrongly counted as inside, so the outline starts as a large blob and tightens ring by ring.',
      },
    },
    {
      id: 'edge',
      title: { zh: '没有尽头的边界', en: 'An edge without end' },
      body: {
        zh: '集合内部是实心的，复杂的是边界。放大任何一段边界，都会出现新的螺旋、触须和花纹，而且放大多少倍都是这样。\n\n- Douady 和 Hubbard 在 1982 年证明：曼德博集合是**连通**的，看起来散落的小岛其实都由细丝连在一起；\n- 宍仓光广在 1998 年证明：它的边界的**豪斯多夫维数是 2**，一条"线"复杂到和一块面积一样"厚"；\n- 它的面积约为 1.5066，但精确值至今不知道。',
        en: 'The inside is solid; the complexity is all on the edge. Zoom into any part of it and new spirals, tendrils and patterns appear, at every magnification.\n\n- Douady and Hubbard proved in 1982 that the set is **connected**: the islands that seem scattered are all joined by thin filaments.\n- Shishikura proved in 1998 that its boundary has **Hausdorff dimension 2**, so a "curve" that is as thick, in a sense, as an area.\n- Its area is about 1.5066, but the exact value is still unknown.',
      },
    },
    {
      id: 'copies',
      title: { zh: '到处都是自己的副本', en: 'Copies of itself everywhere' },
      body: {
        zh: '故事最后看到的副本，在海马谷深处 $c\\approx-0.7436442+0.1318254i$，只有约百万分之一宽，要放大三十多万倍才看得清。它有同样的心形主体、同样的圆盘、同样的边界，但不是简单复制：周围的螺旋和细丝与原图并不相同。主体左边伸出去的"天线"上，$c\\approx-1.7549$ 附近还有一个大得多的副本，在"去哪看"里可以直接飞过去。\n\n这样的小副本有无穷多个，散布在边界的各个地方。它们的中心叫作**核**：从 0 出发，若干步后会精确地回到 0。海马谷里那个副本的核每 78 步回到 0 一次；故事开头那个三步一循环的点，则是一个圆盘的核。',
        en: 'The copy at the end of the story lies deep in seahorse valley at $c\\approx-0.7436442+0.1318254i$. It is only about a millionth wide, so you need a zoom of over 300,000 to see it. It has the same heart-shaped body, the same discs, the same edge, but it is not an exact copy: the spirals and filaments around it differ from the original. A much larger copy sits on the antenna sticking out to the left, near $c\\approx-1.7549$; "Places" flies you there.\n\nThere are infinitely many such copies scattered along the edge. Their centres are called **nuclei**: starting from 0, the orbit returns exactly to 0 after some number of steps. The nucleus of the copy in seahorse valley returns every 78 steps; the three-step point at the start of the story is the nucleus of a disc.',
      },
    },
    {
      id: 'deep-zoom',
      title: { zh: '为什么能放大这么多倍', en: 'How the zoom goes so deep' },
      body: {
        zh: '显卡算得快，但只有 32 位浮点数，大约 7 位有效数字。放大到一万倍左右，相邻像素对应的 $c$ 就已经分不清了，画面会碎成色块。\n\n这里用的是**扰动法**：先用 64 位精度在画面中心算一条参考轨道 $Z_n$，每个像素只计算自己和它的差 $\\delta_n$：\n\n$$\\delta_{n+1}=(2Z_n+\\delta_n)\\,\\delta_n+\\delta c$$\n\n$\\delta$ 很小，32 位也能存得很准。当 $|Z_n+\\delta_n|<|\\delta_n|$ 或者参考轨道用完时，就把当前值当作新的起点，从参考轨道开头重新对齐，避免误差积累。\n\n这样，网页上最多能放大到约十六万亿倍，再往下就到了 64 位精度的极限。',
        en: 'Graphics cards are fast but work in 32-bit floats, about 7 significant digits. Around a 10,000× zoom, neighbouring pixels can no longer tell their values of $c$ apart and the picture breaks into blocks.\n\nThis page uses **perturbation**: one reference orbit $Z_n$ is computed at the centre of the view in 64-bit precision, and each pixel only tracks its difference $\\delta_n$ from it:\n\n$$\\delta_{n+1}=(2Z_n+\\delta_n)\\,\\delta_n+\\delta c$$\n\n$\\delta$ is small, so 32 bits hold it accurately. Whenever $|Z_n+\\delta_n|<|\\delta_n|$, or the reference runs out, the current value becomes a new start and is lined up with the beginning of the reference again, so errors do not pile up.\n\nThat takes the page to a zoom of about 16 trillion, where 64-bit precision itself runs out.',
      },
    },
  ],
  faq: [
    {
      question: {
        zh: '为什么判断标准是半径 2？',
        en: 'Why is the escape radius 2?',
      },
      answer: {
        zh: '如果 $|z|>2$ 且 $|z|\\ge|c|$，那么 $|z^2+c|\\ge|z|^2-|c|\\ge|z|(|z|-1)>|z|$，而且每一步放大的倍数越来越大，所以一定会跑到无穷远。集合本身也完全落在半径 2 的圆里。',
        en: 'If $|z|>2$ and $|z|\\ge|c|$, then $|z^2+c|\\ge|z|^2-|c|\\ge|z|(|z|-1)>|z|$, and the growth factor keeps increasing, so the orbit must run off to infinity. The whole set also lies inside the circle of radius 2.',
      },
    },
    {
      question: {
        zh: '能一直放大下去吗？',
        en: 'Can you zoom forever?',
      },
      answer: {
        zh: '数学上可以，边界在任何倍数下都有新结构。这个页面受 64 位浮点精度限制，最多放大约十六万亿倍；更深的放大要用任意精度的参考轨道。',
        en: 'Mathematically yes: the edge has new structure at every scale. This page is limited by 64-bit floats to about 16 trillion times; deeper zooms need an arbitrary-precision reference orbit.',
      },
    },
    {
      question: {
        zh: '它和朱利亚集有什么关系？',
        en: 'How is it related to Julia sets?',
      },
      answer: {
        zh: '固定 $c$、让起点 $z_0$ 变化，得到的是朱利亚集。$c$ 在曼德博集合里，当且仅当对应的朱利亚集是连成一片的。所以曼德博集合可以看作所有朱利亚集的"目录"。',
        en: 'Fix $c$ and vary the starting point $z_0$ instead, and you get a Julia set. $c$ is in the Mandelbrot set exactly when its Julia set is connected, so the Mandelbrot set works as a map of all Julia sets.',
      },
    },
    {
      question: {
        zh: '黑色区域里的点在做什么？',
        en: 'What do the points in the black region do?',
      },
      answer: {
        zh: '它们的轨道永远困在一个范围内。主体心形里的点最终会稳定到一个固定点；挂在旁边的圆盘里，轨道会在 2 个、3 个……位置之间循环，故事里那个三角形轨道就是例子。',
        en: 'Their orbits stay trapped forever. Points in the main heart shape settle onto a single fixed point; in the discs attached to it, the orbit cycles between 2, 3 or more places, like the triangle orbit in the story.',
      },
    },
  ],
  relatedCurves: ['cardioid'],
  relatedLabs: ['quadratic-transformations', 'zeros-bisection'],
  sources: [
    {
      title: 'Mandelbrot set — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Mandelbrot_set',
    },
    {
      title: 'Plotting algorithms for the Mandelbrot set — Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Plotting_algorithms_for_the_Mandelbrot_set',
    },
  ],
};
