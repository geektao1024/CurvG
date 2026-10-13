import type { LibraryScene } from '../types';

/**
 * First library scene. The archived file is a 5-second Manim Community clip:
 * axes, then y = x². Frames do not contain an equation, numeric tick labels,
 * a focus, or a directrix. Do not describe those as part of this video.
 */
const parabolaRise: LibraryScene = {
  slug: 'parabola-rise',
  publication: 'public',
  primaryCategoryId: 'maps-graphs',
  additionalCategoryIds: ['conic'],
  difficulty: 'intro',
  evidence: 'verified',
  durationSeconds: 5,
  title: {
    en: 'Axes, then y = x²',
    zh: '先坐标轴，再 y = x²',
  },
  question: {
    en: 'Why does y = x² open upward from the origin?',
    zh: '为什么 y = x² 从原点向上开口？',
  },
  hook: {
    en: 'The clip draws both axes, then a green curve whose vertex sits on the origin and whose arms leave the frame together.',
    zh: '成片先画出两条坐标轴，再让一条绿色曲线以原点为顶点，两侧一起伸出画面。',
  },
  payoff: {
    en: 'Squaring treats +x and −x the same, and the square is never negative, so the graph is symmetric and stays above the x-axis except at the origin.',
    zh: '平方把 +x 和 −x 看成同一个数，而且平方不会是负数，所以图像左右对称，除了原点都在 x 轴上方。',
  },
  equations: ['y = x^{2}', 'y = ax^{2}'],
  curveSlugs: ['parabola'],
  prompt: {
    en: 'Animate y = x^2 on numbered axes. Draw the axes first, then grow the curve from the vertex until both arms leave the frame. Write y = x^2 beside the graph and mark the point (1, 1). Do not add a focus or directrix.',
    zh: '在带数字刻度的坐标轴上演示 y = x^2。先画坐标轴，再从顶点把曲线长到两侧伸出画面。在图旁写出 y = x^2，并标出点 (1, 1)。这一版不要焦点和准线。',
  },
  video: {
    src: '/videos/gallery/parabola-plot.mp4',
    poster: '/videos/gallery/parabola-plot-poster.webp',
  },
  phases: [
    {
      name: { en: 'Axes', zh: '坐标轴' },
      start: 0,
      end: 2,
      description: {
        en: 'The horizontal axis appears first. By two seconds both axes and their tick marks are drawn. The ticks are not numbered.',
        zh: '横轴先出现。两秒时，两条轴和刻度都已画完。刻度上没有数字。',
      },
    },
    {
      name: { en: 'Curve', zh: '曲线' },
      start: 2,
      end: 4,
      description: {
        en: 'A green graph of y = x² is drawn until both arms leave the top of the frame. The vertex is the origin, and the left and right sides match.',
        zh: '绿色的 y = x² 被画出来，两侧都伸出画面上沿。顶点在原点，左右两侧重合。',
      },
    },
    {
      name: { en: 'Hold', zh: '停住' },
      start: 4,
      end: 5,
      description: {
        en: 'The finished graph stays. No equation, point, or label is written.',
        zh: '画完的图像停住。没有写出方程、点或标签。',
      },
    },
  ],
  layout: `+----------------------+
|          y           |
|          |           |
|         / \\          |
|        /   \\         |
| ------+--------> x   |
|         \\   /        |
|          \\ /         |
|           |          |
+----------------------+`,
  onScreen: [
    {
      en: 'A white pair of axes with arrowheads and unmarked ticks.',
      zh: '白色坐标轴，带箭头，刻度没有数字。',
    },
    {
      en: 'One green curve, y = x², vertex at the origin, symmetric, arms exiting the frame.',
      zh: '一条绿色曲线 y = x²，顶点在原点，左右对称，两侧伸出画面。',
    },
  ],
  absent: [
    {
      en: 'The equation is not written on the frame.',
      zh: '画面上没有写出方程。',
    },
    {
      en: 'Tick marks have no numbers, so the scale is not stated.',
      zh: '刻度没有数字，所以比例没有被说出来。',
    },
    {
      en: 'No focus, directrix, or reflected rays. Those belong to the parabola object page, not this clip.',
      zh: '没有焦点、准线或反射光线。那些在抛物线对象页，不在这条成片里。',
    },
  ],
};

export default parabolaRise;
