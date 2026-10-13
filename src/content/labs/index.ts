import { compileBoard, type CompiledBoard } from '@/lib/board/evaluate';
import { parseBoardSpec } from '@/lib/board/spec';

import { getPrimaryTrail } from '../library/graph';
import type { LibraryLocale } from '../library/types';
import { binomialDistribution } from './data/binomial-distribution';
import { circularMotion } from './data/circular-motion';
import { conicSectionsEccentricity } from './data/conic-sections-eccentricity';
import { derivativeTangentSlope } from './data/derivative-tangent-slope';
import { dopplerEffect } from './data/doppler-effect';
import { ellipseDefinition } from './data/ellipse-definition';
import { energyConservation } from './data/energy-conservation';
import { exponentialLogarithm } from './data/exponential-logarithm';
import { hyperbolaAsymptotes } from './data/hyperbola-asymptotes';
import { inclinedPlaneForces } from './data/inclined-plane-forces';
import { inscribedAngleTheorem } from './data/inscribed-angle-theorem';
import { lawOfLargeNumbers } from './data/law-of-large-numbers';
import { monotonicityExtrema } from './data/monotonicity-extrema';
import { normalDistribution } from './data/normal-distribution';
import { parabolaFocalChord } from './data/parabola-focal-chord';
import { permutationsCombinations } from './data/permutations-combinations';
import { projectileMotion } from './data/projectile-motion';
import { pythagoreanTheoremRearrangement } from './data/pythagorean-theorem-rearrangement';
import { quadraticTransformations } from './data/quadratic-transformations';
import { relativeMotionRiver } from './data/relative-motion-river';
import { riemannSumArea } from './data/riemann-sum-area';
import { similarityHomothety } from './data/similarity-homothety';
import { simplePendulum } from './data/simple-pendulum';
import { sinusoidalFunction } from './data/sinusoidal-function';
import { springOscillator } from './data/spring-oscillator';
import { uniformAccelerationVt } from './data/uniform-acceleration-vt';
import { unitCircleSine } from './data/unit-circle-sine';
import { vectorDotProduct } from './data/vector-dot-product';
import { waveInterference } from './data/wave-interference';
import { wavePropagation } from './data/wave-propagation';
import { zerosBisection } from './data/zeros-bisection';
import type { Lab, LabSubject, LabSuite } from './types';

export type {
  Lab,
  LabGuideStep,
  LabLevel,
  LabQuizItem,
  LabSection,
  LabSubject,
  LabSubjectId,
  LabSuite,
  LabVideo,
} from './types';

/** Every chapter, in editorial order. */
export const LABS: readonly Lab[] = [
  derivativeTangentSlope,
  riemannSumArea,
  unitCircleSine,
  quadraticTransformations,
  conicSectionsEccentricity,
  pythagoreanTheoremRearrangement,
  inscribedAngleTheorem,
  similarityHomothety,
  vectorDotProduct,
  permutationsCombinations,
  binomialDistribution,
  normalDistribution,
  lawOfLargeNumbers,
  uniformAccelerationVt,
  projectileMotion,
  circularMotion,
  relativeMotionRiver,
  inclinedPlaneForces,
  springOscillator,
  simplePendulum,
  energyConservation,
  wavePropagation,
  waveInterference,
  dopplerEffect,
  exponentialLogarithm,
  sinusoidalFunction,
  monotonicityExtrema,
  zerosBisection,
  ellipseDefinition,
  parabolaFocalChord,
  hyperbolaAsymptotes,
];

export const LAB_SUBJECTS: readonly LabSubject[] = [
  {
    id: 'math',
    publication: 'public',
    name: { en: 'Mathematics', zh: '数学' },
    description: {
      en: 'Functions, calculus, conic sections, geometry and probability, each as a board you can drag.',
      zh: '函数、微积分、圆锥曲线、几何与概率，每个知识点都是一块可以拖动的画板。',
    },
    headline: {
      en: 'Interactive math labs: functions, calculus, conics, geometry and probability',
      zh: '数学交互实验：函数、微积分、圆锥曲线、几何与概率',
    },
    metaTitle: {
      en: 'Interactive Math Labs — Functions, Calculus, Conics, Geometry & Probability | CurvG',
      zh: '数学交互实验 — 函数、导数、圆锥曲线、几何、概率在线演示 | CurvG',
    },
    metaDescription: {
      en: 'Free interactive math labs for high school and college: drag the board to explore graph transformations, derivatives and integrals, conic sections, proofs and probability, each with a guided walk-through and a quiz.',
      zh: '免费的高中与大学数学交互实验：拖动画板看函数图像变换、导数与积分、圆锥曲线、几何证明和概率分布，每章配引导、讲解和随堂检测。',
    },
  },
  {
    id: 'physics',
    publication: 'public',
    name: { en: 'Physics', zh: '物理' },
    description: {
      en: 'Motion, forces and waves you can set running and measure.',
      zh: '可以让它动起来、再拿来测量的运动、力与波。',
    },
    headline: {
      en: 'Interactive physics labs: motion, forces and energy, oscillations and waves',
      zh: '物理交互实验：运动、力与能量、振动与波',
    },
    metaTitle: {
      en: 'Interactive Physics Simulations — Motion, Forces, Oscillations & Waves | CurvG',
      zh: '物理交互实验 — 运动学、受力分析、简谐振动与波在线模拟 | CurvG',
    },
    metaDescription: {
      en: 'Free interactive physics labs: set balls, slopes, springs and waves in motion and watch the v–t graph, the forces and the energy change, each with a guided walk-through and a quiz.',
      zh: '免费的物理交互实验：调参数让小球、斜面、弹簧和波动起来，同步看到 v-t 图、受力和能量的变化，每章配引导、讲解和随堂检测。',
    },
  },
];

/** Labs as the visitor sees them: one workspace per topic, in order. */
export const LAB_SUITES: readonly LabSuite[] = [
  {
    slug: 'functions',
    publication: 'public',
    subject: 'math',
    name: { en: 'Functions & calculus', zh: '函数与微积分' },
    summary: {
      en: 'Drag the parameters of a graph and watch it move: a parabola shifted and stretched, exponentials mirrored into logarithms, sine unrolled from the unit circle and reshaped by A, ω and φ, tangents that reveal where a function rises and turns, a zero trapped by halving, and rectangles adding up to an integral.',
      zh: '拖动参数看图像怎么动：抛物线的平移与伸缩，指数与对数互为镜像，单位圆展开成正弦曲线再由 A、ω、φ 变形，切线告诉你函数在哪里增减、在哪里拐弯，二分法把零点越夹越紧，矩形累加成定积分。',
    },
    chapters: [
      quadraticTransformations,
      exponentialLogarithm,
      unitCircleSine,
      sinusoidalFunction,
      derivativeTangentSlope,
      monotonicityExtrema,
      zerosBisection,
      riemannSumArea,
    ],
  },
  {
    slug: 'conics',
    publication: 'public',
    subject: 'math',
    name: { en: 'Conic sections', zh: '圆锥曲线' },
    summary: {
      en: 'Each conic from its own definition: a string of fixed length round two pins, equal distances to a focus and a line, a fixed difference of distances. Then one eccentricity ties the three into a single family.',
      zh: '先从各自的定义出发：绕在两颗钉子上的定长绳子、到焦点与准线距离相等、到两焦点距离之差为定值；最后用离心率把三者连成一家。',
    },
    chapters: [
      ellipseDefinition,
      parabolaFocalChord,
      hyperbolaAsymptotes,
      conicSectionsEccentricity,
    ],
  },
  {
    slug: 'geometry',
    publication: 'public',
    subject: 'math',
    name: { en: 'Geometry & proofs', zh: '几何与证明' },
    summary: {
      en: 'Proofs you can take apart by hand: move the pieces and see why the theorem has to hold.',
      zh: '能亲手拆开的证明：移动图形的各个部分，看定理为什么一定成立。',
    },
    chapters: [
      pythagoreanTheoremRearrangement,
      inscribedAngleTheorem,
      similarityHomothety,
      vectorDotProduct,
    ],
  },
  {
    slug: 'probability',
    publication: 'public',
    subject: 'math',
    name: { en: 'Probability & statistics', zh: '概率与统计' },
    summary: {
      en: 'Chance built up from counting: choose and arrange, add up the paths of repeated trials, read probability as area under the bell curve, and watch a frequency settle as the trials pile up.',
      zh: '从计数搭起概率：先学会选和排，再数出重复试验的每条路径，把概率读成钟形曲线下的面积，最后看频率怎样随试验次数增加而稳定下来。',
    },
    chapters: [
      permutationsCombinations,
      binomialDistribution,
      normalDistribution,
      lawOfLargeNumbers,
    ],
  },
  {
    slug: 'kinematics',
    publication: 'public',
    subject: 'physics',
    name: { en: 'Motion', zh: '运动学' },
    summary: {
      en: 'Straight-line motion on a v–t graph, projectiles, circles and relative velocity: set things moving and read the numbers off the board.',
      zh: '直线运动的 v-t 图、抛体、圆周运动和相对运动：让物体动起来，再从画板上读出数字。',
    },
    chapters: [
      uniformAccelerationVt,
      projectileMotion,
      circularMotion,
      relativeMotionRiver,
    ],
  },
  {
    slug: 'forces',
    publication: 'public',
    subject: 'physics',
    name: { en: 'Forces & energy', zh: '力与能量' },
    summary: {
      en: 'Resolve forces on a slope, time a spring and a pendulum, and follow energy as it changes form: every force and every joule drawn on the board.',
      zh: '在斜面上分解力，给弹簧振子和单摆计时，跟着能量看它怎样转化：每个力、每焦耳能量都画在画板上。',
    },
    chapters: [
      inclinedPlaneForces,
      springOscillator,
      simplePendulum,
      energyConservation,
    ],
  },
  {
    slug: 'waves',
    publication: 'public',
    subject: 'physics',
    name: { en: 'Waves', zh: '机械波' },
    summary: {
      en: 'Watch a wave travel while the medium stays put, two waves add into an interference pattern, and a moving source squeeze its own sound.',
      zh: '看波向前传、介质留在原地，两列波叠加成干涉图样，运动的声源把自己的声音挤短。',
    },
    chapters: [wavePropagation, waveInterference, dopplerEffect],
  },
];

const BY_SLUG = new Map(LABS.map((lab) => [lab.slug, lab]));
const SUITE_BY_SLUG = new Map(LAB_SUITES.map((suite) => [suite.slug, suite]));

export function publicSubjects(): LabSubject[] {
  return LAB_SUBJECTS.filter(
    (subject) =>
      subject.publication === 'public' &&
      publicSuites().some((suite) => suite.subject === subject.id)
  );
}

export function getSubject(id: string): LabSubject | undefined {
  return LAB_SUBJECTS.find((subject) => subject.id === id);
}

export function subjectOf(suite: LabSuite): LabSubject {
  const subject = getSubject(suite.subject);
  if (!subject) throw new Error(`Suite ${suite.slug} has no subject`);
  return subject;
}

/** Subject page path, /labs/{subject}. Suites may not use these slugs. */
export function subjectPath(id: LabSubject['id']): string {
  return `/labs/${id}`;
}

export function suitesForSubject(id: LabSubject['id']): LabSuite[] {
  return publicSuites().filter((suite) => suite.subject === id);
}

export function getLab(slug: string): Lab | undefined {
  return BY_SLUG.get(slug);
}

export function publicLabs(): Lab[] {
  return LABS.filter((lab) => lab.publication === 'public');
}

export function getSuite(slug: string): LabSuite | undefined {
  return SUITE_BY_SLUG.get(slug);
}

export function publicSuites(): LabSuite[] {
  return LAB_SUITES.filter((suite) => suite.publication === 'public');
}

export function suiteForLab(slug: string): LabSuite | undefined {
  return LAB_SUITES.find((suite) =>
    suite.chapters.some((lab) => lab.slug === slug)
  );
}

/**
 * Chapter URL. The first chapter lives at the suite URL itself so the topic
 * page and its opening chapter are one indexable page, not two duplicates.
 */
export function chapterPath(suite: LabSuite, lab: Lab): string {
  return suite.chapters[0]?.slug === lab.slug
    ? `/labs/${suite.slug}`
    : `/labs/${suite.slug}/${lab.slug}`;
}

/** Where a chapter is read. Every public lab belongs to a suite. */
export function labPath(lab: Lab): string {
  const suite = suiteForLab(lab.slug);
  if (!suite) throw new Error(`Lab ${lab.slug} is not in a suite`);
  return chapterPath(suite, lab);
}

/** Pre-rendered share image for a chapter (scripts/lab-og-images.mjs). */
export function labOgImage(lab: Lab, lang: LibraryLocale): string {
  return `/og/labs/${lab.slug}.${lang}.png`;
}

export function labsForCategory(categoryId: string): Lab[] {
  return publicLabs().filter(
    (lab) =>
      lab.primaryCategoryId === categoryId ||
      lab.additionalCategoryIds?.includes(categoryId)
  );
}

/** Labs filed anywhere under a library hub, through any of their categories. */
export function labsForHub(hubId: string): Lab[] {
  return publicLabs().filter((lab) =>
    [lab.primaryCategoryId, ...(lab.additionalCategoryIds ?? [])].some(
      (id) => id === hubId || getPrimaryTrail(id)[0]?.id === hubId
    )
  );
}

export function labsForCurve(curveSlug: string): Lab[] {
  return publicLabs().filter((lab) => lab.curveSlugs?.includes(curveSlug));
}

const compiled = new Map<string, CompiledBoard>();

/** Parsed and compiled board for one locale. Throws on an invalid spec. */
export function labBoard(lab: Lab, lang: LibraryLocale): CompiledBoard {
  const key = `${lab.slug}:${lang}`;
  let board = compiled.get(key);
  if (!board) {
    board = compileBoard(parseBoardSpec(lab.board(lang)));
    compiled.set(key, board);
  }
  return board;
}

/** Every public chapter as a search entry: what the knowledge-point box searches. */
export function labSearchEntries(lang: LibraryLocale) {
  const t = (text: { en: string; zh: string }) => text[lang];
  return publicSubjects().flatMap((subject) =>
    suitesForSubject(subject.id).flatMap((suite) =>
      suite.chapters.map((lab) => ({
        href: chapterPath(suite, lab),
        title: t(lab.chapterTitle),
        context: `${t(subject.name)} · ${t(suite.name)}`,
        terms: [t(lab.title), t(lab.question), ...lab.keyPoints.map(t)].join(
          ' '
        ),
      }))
    )
  );
}

/** Newest chapters first, by their `updated` date. */
export function latestLabs(count: number): Lab[] {
  return [...publicLabs()]
    .sort((a, b) => b.updated.localeCompare(a.updated))
    .slice(0, count);
}

/** The creator, prefilled with this chapter's video prompt. */
export function labVideoHref(lab: Lab, lang: LibraryLocale): string {
  return `/creator?prompt=${encodeURIComponent(lab.videoPrompt[lang])}`;
}
