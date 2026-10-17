import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLab } from '../src/content/labs';
import { publicWonders, WONDERS } from '../src/content/wonders';
import { buffonNeedle } from '../src/content/wonders/data/buffon-needle';
import { collatzTree } from '../src/content/wonders/data/collatz-tree';
import { fourierEpicycles } from '../src/content/wonders/data/fourier-epicycles';
import { galtonBoard } from '../src/content/wonders/data/galton-board';
import { lorenzAttractor } from '../src/content/wonders/data/lorenz-attractor';
import { mandelbrotSet } from '../src/content/wonders/data/mandelbrot-set';
import { newtonFractal } from '../src/content/wonders/data/newton-fractal';
import { pendulumWave } from '../src/content/wonders/data/pendulum-wave';
import { primeSpirals } from '../src/content/wonders/data/prime-spirals';
import { strangeAttractors } from '../src/content/wonders/data/strange-attractors';
import { sunflowerGoldenAngle } from '../src/content/wonders/data/sunflower-golden-angle';
import { richMathTex } from '../src/lib/rich-math';
// ── No. 11: Strange attractors ───────────────────────────────────────────

import {
  ATTRACTOR_BEATS,
  START as ATTRACTOR_START,
  bounds as attractorBounds,
  attractorStory,
  step as cliffordStep,
  CYCLE_A,
  cyclePoints,
  GALLERY,
  GALLERY_CUTS,
  kindOf,
  lyapunov,
  randomChaotic,
  spread,
  STORY_POINTS,
  storyParams,
} from '../src/lib/wonders/attractors';
// ── No. 9: Buffon's needle ───────────────────────────────────────────────

import {
  BUFFON_BEATS,
  buffonStory,
  crossChance,
  crossCounts,
  estimate,
  estimateSd,
  LAZZARINI,
  lineHits,
  logBinomialPmf,
  needleAt,
  noodle,
  STORY_NEEDLES,
  STORY_SEED,
  storyThrown,
} from '../src/lib/wonders/buffon';
// ── No. 10: Collatz ──────────────────────────────────────────────────────

import {
  buildTree,
  COLLATZ_BEATS,
  next as collatzNext,
  collatzStory,
  hailstone,
  stepsTable,
  stoppingTime,
  STORY_EVEN,
  STORY_N,
  STORY_ODD,
} from '../src/lib/wonders/collatz';
import {
  buildWonderFilm,
  cueAt,
  storyTimeAt,
  wonderFilmCaptions,
} from '../src/lib/wonders/film';
import {
  normalizeStroke,
  partialSum,
  pathEpicycles,
  pathError,
  pathPoint,
  piSamples,
  squareOvershoot,
  waveError,
  waveTerms,
  waveValue,
  type Wave,
} from '../src/lib/wonders/fourier';
import {
  FOURIER_BEATS,
  FOURIER_STORY_LENGTH,
  fourierStory,
} from '../src/lib/wonders/fourier-scene';
// ── No. 8: Galton board ──────────────────────────────────────────────────

import {
  binomial,
  choose,
  FIRST_DROP,
  GALTON_BEATS,
  galtonStory,
  MANY_ROWS,
  ONE_BALL,
  slotOf,
  slotsAt,
  TILTED,
  withinOneSd,
} from '../src/lib/wonders/galton';
// ── No. 3: Lorenz ────────────────────────────────────────────────────────

import {
  dist,
  longRun,
  LORENZ_BEATS,
  H as LORENZ_H,
  lorenzStoryData,
  SWARM_SIZE,
  TWIN_GAP,
  TWIN_RATE,
  TWIN_START_T,
  wingCentres,
} from '../src/lib/wonders/lorenz';
// ── No. 2: Mandelbrot ────────────────────────────────────────────────────

import {
  DEEP_COPY,
  DEEP_COPY_PERIOD,
  escapeTime,
  FULL,
  MANDEL_BEATS,
  MANDEL_STORY_LENGTH,
  mandelStory,
  MIN_WIDTH,
  NECK,
  orbit,
  perturbedEscape,
  RABBIT,
  SEAHORSE,
  STORY_DEEP_WIDTH,
} from '../src/lib/wonders/mandelbrot';
// ── No. 7: Newton fractal ────────────────────────────────────────────────

import {
  basinOf,
  boundaryPoint,
  correctPlaces,
  CUBE_BOUNDARY,
  CYCLE_VIEW,
  GUESS_STARTS,
  NEAR_POLE,
  NEWTON_BEATS,
  FULL as NEWTON_FULL,
  newtonStep,
  newtonStory,
  POLYS,
  sqrt2Steps,
  ZOOM_VIEW,
} from '../src/lib/wonders/newton';
// ── No. 5: Pendulum wave ─────────────────────────────────────────────────

import {
  apparentGap,
  BASE,
  CYCLE,
  groups,
  neighbourGap,
  PENDULUM_BEATS,
  pendulumLength,
  pendulumStory,
  relativePhases,
  STORY_MOMENTS,
  storyTau,
  swings,
  visibleRows,
  waveAt,
} from '../src/lib/wonders/pendulum-wave';
// ── No. 4: Sunflower ─────────────────────────────────────────────────────

import {
  GOLDEN_ANGLE,
  minSpacing,
  NEAR_GOLDEN,
  nearestFraction,
  PHYLLO_BEATS,
  phylloStory,
  seeds,
  spiralPair,
} from '../src/lib/wonders/phyllotaxis';
// ── No. 6: Prime spirals ─────────────────────────────────────────────────

import {
  armTurnRadius,
  convergents,
  PRIME_BEATS,
  primeCount,
  primesPerArm,
  primeStory,
  STORY_VIEWS,
  totient,
  turnGap,
  visibleArms,
} from '../src/lib/wonders/prime-spiral';
import { integrate, track } from '../src/lib/wonders/timeline';

const close = (a: number, b: number, eps: number, msg?: string) =>
  assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} ${a} ≉ ${b}`);

test('wave series converge to the waves they name', () => {
  for (const wave of ['square', 'sawtooth', 'triangle'] as Wave[]) {
    const terms = waveTerms(wave, 400);
    // Away from jumps the partial sum is close to the wave.
    for (const theta of [0.7, 1.3, 2.2, -0.9, -2.4]) {
      close(partialSum(terms, theta), waveValue(wave, theta), 0.01, wave);
    }
  }
});

test('relative error by Parseval matches a direct integral', () => {
  for (const wave of ['square', 'sawtooth', 'triangle'] as Wave[]) {
    const terms = waveTerms(wave, 7);
    let err = 0;
    let power = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const theta = -Math.PI + (2 * Math.PI * (i + 0.5)) / n;
      const f = waveValue(wave, theta);
      err += (f - partialSum(terms, theta)) ** 2;
      power += f * f;
    }
    close(waveError(wave, terms), Math.sqrt(err / power), 0.002, wave);
  }
});

test('copy claims: radii, errors, Gibbs overshoot', () => {
  const square = waveTerms('square', 2);
  close(square[1].amp / square[0].amp, 1 / 3, 1e-12, 'second circle 1/3');
  assert.equal(square[1].freq, 3);
  // "5 个圆还差约 20%，60 个圆仍差约 6%"; triangle "5 个圆约 1%".
  close(waveError('square', waveTerms('square', 5)), 0.2, 0.01);
  close(waveError('square', waveTerms('square', 60)), 0.06, 0.005);
  close(waveError('triangle', waveTerms('triangle', 5)), 0.0127, 0.002);
  // Gibbs: ≈ 8.95% of the jump, peak ≈ 1.179, for many terms.
  for (const n of [30, 60, 200]) close(squareOvershoot(n), 0.0895, 0.0006);
  close(1 + 2 * squareOvershoot(200), 1.179, 0.001);
  // π: 3 → ≈40%, 30 → ≈2%, 100 → ≈0.3% (count excludes the centre).
  const pi = pathEpicycles(piSamples());
  close(pathError(pi, 3 + 1), 0.4, 0.01);
  close(pathError(pi, 30 + 1), 0.02, 0.003);
  close(pathError(pi, 100 + 1), 0.003, 0.001);
});

test('all circles redraw the sampled path exactly', () => {
  const samples = piSamples();
  const cycles = pathEpicycles(samples);
  for (const j of [0, 17, 128, 255]) {
    const p = pathPoint(cycles, j / samples.length, () => 1);
    close(p.x, samples[j].x, 1e-9);
    close(p.y, samples[j].y, 1e-9);
  }
  // Centre first, then circles largest first.
  assert.equal(cycles[0].freq, 0);
  for (let i = 2; i < cycles.length; i++) {
    assert.ok(cycles[i].amp <= cycles[i - 1].amp + 1e-12);
  }
});

test('free-hand strokes are normalized or rejected', () => {
  assert.equal(normalizeStroke([{ x: 0, y: 0 }]), null);
  const stroke = Array.from({ length: 50 }, (_, i) => ({
    x: 300 + 80 * Math.cos((i / 50) * 2 * Math.PI),
    y: 200 + 40 * Math.sin((i / 50) * 2 * Math.PI),
  }));
  const samples = normalizeStroke(stroke)!;
  assert.equal(samples.length, 256);
  const maxX = Math.max(...samples.map((p) => Math.abs(p.x)));
  close(maxX, 1, 0.01);
});

test('timeline tracks hold, ease and integrate', () => {
  const f = track([
    [1, 0],
    [3, 10],
  ]);
  assert.equal(f(0), 0);
  assert.equal(f(5), 10);
  close(f(2), 5, 1e-9);
  const angle = integrate(() => 2, 10);
  close(angle(4), 8, 1e-9);
});

test('the Fourier story is deterministic and in range', () => {
  assert.equal(FOURIER_BEATS.length, fourierEpicycles.beats.length);
  assert.ok(FOURIER_BEATS.every((t, i) => i === 0 || t > FOURIER_BEATS[i - 1]));
  assert.ok(FOURIER_BEATS[FOURIER_BEATS.length - 1] < FOURIER_STORY_LENGTH);
  for (let t = 0; t <= FOURIER_STORY_LENGTH; t += 0.25) {
    const a = fourierStory(t);
    assert.deepEqual(a, fourierStory(t));
    for (const key of ['mix', 'reveal', 'reach', 'trail'] as const) {
      assert.ok(a[key] >= 0 && a[key] <= 1, `${key} at ${t}`);
    }
    assert.ok(a.waveCount >= 1 && a.waveCount <= 60);
    assert.ok(a.pathCount >= 2.99 && a.pathCount <= 100.01);
  }
  // The close-up freezes the rotation while the overshoot is on screen.
  close(fourierStory(25).theta, fourierStory(27).theta, 1e-9);
  // Beat 6 ends on the 30 circles its caption names.
  close(fourierStory(52).pathCount, 30, 0.01);
});

test('wonder content is complete and links resolve', () => {
  const slugs = new Set<string>();
  for (const wonder of WONDERS) {
    assert.ok(!slugs.has(wonder.slug), `duplicate ${wonder.slug}`);
    slugs.add(wonder.slug);
    for (const text of [
      wonder.question,
      wonder.summary,
      wonder.takeaway,
      wonder.name,
      ...wonder.beats,
      ...(wonder.film ?? []).flatMap((line) =>
        line.speak ? [line.text, line.speak] : [line.text]
      ),
      ...wonder.sections.flatMap((s) => [s.title, s.body]),
      ...wonder.faq.flatMap((f) => [f.question, f.answer]),
    ]) {
      assert.ok(
        text.zh.trim() && text.en.trim(),
        `${wonder.slug} missing copy`
      );
    }
    for (const section of wonder.sections) {
      for (const lang of ['zh', 'en'] as const) {
        assert.doesNotThrow(() => richMathTex(section.body[lang]));
      }
    }
    for (const slug of wonder.relatedLabs) {
      assert.equal(getLab(slug)?.publication, 'public', slug);
    }
    assert.match(wonder.updated, /^\d{4}-\d{2}-\d{2}$/);
  }
  assert.ok(publicWonders().length >= 1);
});

test('mandelbrot copy claims', () => {
  // The rabbit is back at 0 after exactly three steps.
  const r = orbit(RABBIT, 6);
  close(Math.hypot(r[3].re, r[3].im), 0, 1e-9);
  assert.ok(Math.hypot(r[1].re, r[1].im) > 0.5);
  // "三十多步" / "more than thirty steps"; and step 33 in the explanation.
  assert.equal(escapeTime(NECK, 1000), 33);
  // The story's deepest view: "三十多万倍" / "past 300,000 times".
  const deepest = FULL.width / STORY_DEEP_WIDTH;
  assert.ok(deepest > 3e5 && deepest < 4e5, String(deepest));
  // The page's zoom limit: "约十六万亿倍" / "about 16 trillion".
  close(FULL.width / MIN_WIDTH / 1e12, 16.5, 0.6);
});

test('the deep copy is a period-78 nucleus', () => {
  let x = 0;
  let y = 0;
  let firstReturn = 0;
  for (let i = 1; i <= DEEP_COPY_PERIOD; i++) {
    const nx = x * x - y * y + DEEP_COPY.re;
    y = 2 * x * y + DEEP_COPY.im;
    x = nx;
    if (!firstReturn && Math.hypot(x, y) < 1e-6) firstReturn = i;
  }
  assert.equal(firstReturn, DEEP_COPY_PERIOD);
  // It sits in the story's final frame.
  const end = mandelStory(47).view;
  assert.ok(Math.abs(end.re - DEEP_COPY.re) < end.width / 4);
  assert.ok(Math.abs(end.im - DEEP_COPY.im) < end.width / 4);
});

test('perturbation agrees with direct iteration', () => {
  const rand = (() => {
    let s = 1;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  })();
  for (const [centre, span, iter] of [
    [{ re: -0.6, im: 0 }, 3, 300],
    [SEAHORSE, 1e-3, 1500],
    [DEEP_COPY, 1e-5, 3000],
  ] as const) {
    let same = 0;
    const n = 300;
    for (let i = 0; i < n; i++) {
      const dc = { re: (rand() - 0.5) * span, im: (rand() - 0.5) * span };
      const c = { re: centre.re + dc.re, im: centre.im + dc.im };
      const a = escapeTime(c, iter);
      const b = perturbedEscape(centre, dc, iter);
      // Points on the edge are chaotic; allow a step either way.
      if (Math.abs(a - b) <= 1) same++;
    }
    assert.ok(same / n > 0.95, `${same}/${n} at span ${span}`);
  }
});

test('mandelbrot story moves smoothly', () => {
  assert.equal(MANDEL_BEATS.length, mandelbrotSet.beats.length);
  let prev = mandelStory(0).view;
  for (let t = 0.05; t <= MANDEL_STORY_LENGTH; t += 0.05) {
    const v = mandelStory(t).view;
    // Width changes by under 25% and the centre by under a quarter view
    // per 1/20 s: no cuts.
    assert.ok(Math.abs(Math.log(v.width / prev.width)) < 0.25, `width at ${t}`);
    const shift = Math.hypot(v.re - prev.re, v.im - prev.im);
    assert.ok(shift < Math.max(v.width, prev.width) / 4, `centre at ${t}`);
    prev = v;
  }
});

test('lorenz copy claims', () => {
  assert.equal(LORENZ_BEATS.length, lorenzAttractor.beats.length);
  const data = lorenzStoryData();
  // Beat 1: the single path switches wings several times.
  let switches = 0;
  for (let i = 1; i < data.main.length; i++) {
    if (Math.sign(data.main[i][0]) !== Math.sign(data.main[i - 1][0]))
      switches++;
  }
  assert.ok(switches >= 3, `switches ${switches}`);
  // Beat 2: 1e-5 apart, together for over ten seconds, then far apart.
  assert.equal(TWIN_GAP, 1e-5);
  const storyT = (i: number) => TWIN_START_T + (i * LORENZ_H) / TWIN_RATE;
  let parted = -1;
  for (let i = 0; i < data.twinA.length; i++) {
    if (dist(data.twinA[i], data.twinB[i]) > 1) {
      parted = storyT(i);
      break;
    }
  }
  assert.ok(
    parted - TWIN_START_T > 10 && parted - TWIN_START_T < 15,
    `parted at ${parted}`
  );
  const last = data.twinA.length - 1;
  assert.ok(dist(data.twinA[last], data.twinB[last]) > 5);
  // "about 16 time units" in the explanation (from 1e-5 to 1 apart).
  close((parted - TWIN_START_T) * TWIN_RATE, 16, 2.5);
  // "三千个" / "three thousand".
  assert.equal(SWARM_SIZE, 3000);
  assert.equal(data.swarmSeed.length, 3000);
  // Wing centres at ρ = 28: (±8.49, ±8.49, 27).
  const [c] = wingCentres(28);
  close(c[0], 8.49, 0.01);
  assert.equal(c[2], 27);
  // Regimes named in the panel and the explanation.
  assert.equal(longRun(0.5), 'origin');
  assert.equal(longRun(20), 'wing');
  assert.equal(longRun(24.5), 'mixed');
  assert.equal(longRun(28), 'chaos');
});

test('sunflower copy claims', () => {
  assert.equal(PHYLLO_BEATS.length, sunflowerGoldenAngle.beats.length);
  close(GOLDEN_ANGLE, 137.508, 0.0005);
  // Tidy turns make q spokes.
  assert.deepEqual(
    [90, 120, 144].map((a) => {
      const f = nearestFraction(a);
      return [f.p, f.q];
    }),
    [
      [1, 4],
      [1, 3],
      [2, 5],
    ]
  );
  const f137 = nearestFraction(137, 55);
  assert.deepEqual([f137.p, f137.q], [8, 21]);
  // Fibonacci spirals: 55/89 on the outer ring of 1000 seeds; 13/21 and
  // 21/34 nearer the centre.
  assert.deepEqual(spiralPair(1000, GOLDEN_ANGLE), [55, 89]);
  assert.deepEqual(spiralPair(200, GOLDEN_ANGLE), [21, 34]);
  assert.deepEqual(spiralPair(60, GOLDEN_ANGLE), [13, 21]);
  // 137.6° keeps only about 63% of the golden spacing.
  const ratio =
    minSpacing(seeds(1000, NEAR_GOLDEN)) /
    minSpacing(seeds(1000, GOLDEN_ANGLE));
  close(ratio, 0.63, 0.02);
  // The golden angle packs best among the angles the story shows.
  for (const a of [90, 120, 144, 137, NEAR_GOLDEN]) {
    assert.ok(
      minSpacing(seeds(1000, a)) < minSpacing(seeds(1000, GOLDEN_ANGLE))
    );
  }
  // The story shows each claim at the stated angle.
  close(phylloStory(5).angle, 90, 1e-9);
  close(phylloStory(12).angle, 120, 1e-9);
  close(phylloStory(16).angle, 144, 1e-9);
  close(phylloStory(30).angle, GOLDEN_ANGLE, 1e-9);
  close(phylloStory(40).angle, NEAR_GOLDEN, 1e-9);
});

test('pendulum wave copy claims', () => {
  assert.equal(PENDULUM_BEATS.length, pendulumWave.beats.length);
  // 15 pendulums, 51 to 65 swings a minute.
  assert.equal(CYCLE, 60);
  assert.equal(swings(0), BASE);
  assert.equal(swings(0), 51);
  assert.equal(swings(14), 65);
  // Lengths about 34.4 cm and 21.2 cm.
  close(pendulumLength(0) * 100, 34.4, 0.05);
  close(pendulumLength(14) * 100, 21.2, 0.05);
  // Neighbours drift 6° a second; 90° at 15 s.
  close(neighbourGap(1), 6, 1e-12);
  close(neighbourGap(15), 90, 1e-12);
  // q groups at p/q of the cycle; 5 at 12 s; all together at 60 s.
  for (const [tau, q] of [
    [15, 4],
    [20, 3],
    [30, 2],
    [12, 5],
    [40, 3],
    [45, 4],
    [60, 1],
    [0, 1],
  ]) {
    assert.equal(groups(tau), q, `${tau} s`);
    assert.equal(visibleRows(tau), q, `${tau} s seen`);
  }
  // Between the moments it reads as a wave.
  assert.equal(groups(8), 15);
  assert.equal(visibleRows(8), null);
  // 55 s: 330° ahead, seen as 30° behind.
  close(neighbourGap(55), 330, 1e-9);
  close(apparentGap(55), -30, 1e-9);
  // Both waves pass through every bob.
  for (const tau of [7, 33, 52.8, 55]) {
    for (let k = 0; k < 15; k++) {
      close(waveAt(k, tau), waveAt(k, tau, true), 1e-12);
    }
  }
  // The second half mirrors the first: relative phases at 60 − t are the
  // negatives of those at t.
  for (const tau of [5, 15, 20, 27.3]) {
    const a = relativePhases(tau);
    const b = relativePhases(CYCLE - tau);
    a.forEach((x, k) => {
      const sum = (x + b[k]) % 1;
      close(Math.min(sum, 1 - sum), 0, 1e-9, `${tau} s, bob ${k}`);
    });
  }
  // 20° swings run about 0.8% slow: about 0.4 of a swing over 51.
  const theta = (20 * Math.PI) / 180;
  const slow = theta ** 2 / 16;
  close(slow, 0.008, 0.0005);
  close(slow * 51, 0.4, 0.02);
  // The story shows each pattern while its caption is up.
  for (const [t, tau] of Object.values(STORY_MOMENTS)) {
    close(storyTau(t), tau, 0.05, `story ${t}`);
  }
  const beatOf = (t: number) =>
    PENDULUM_BEATS.filter((start) => start <= t).length - 1;
  assert.equal(beatOf(STORY_MOMENTS.quarter[0]), 2);
  assert.equal(beatOf(STORY_MOMENTS.third[0]), 3);
  assert.equal(beatOf(STORY_MOMENTS.half[0]), 4);
  assert.equal(beatOf(STORY_MOMENTS.thirdAgain[0]), 5);
  assert.equal(beatOf(STORY_MOMENTS.quarterAgain[0]), 5);
  assert.equal(beatOf(STORY_MOMENTS.alias[0]), 6);
  assert.equal(beatOf(STORY_MOMENTS.whole[0]), 7);
  // The hidden wave is shown during the aliasing beat, and only then.
  assert.equal(pendulumStory(STORY_MOMENTS.alias[0]).wave, 1);
  assert.equal(pendulumStory(STORY_MOMENTS.half[0]).wave, 0);
  // Pendulum time never stops or runs backwards once released.
  let previous = storyTau(0.8);
  for (let t = 0.8 + 1 / 120; t <= 57; t += 1 / 120) {
    const tau = storyTau(t);
    assert.ok(tau > previous, `pendulum time rises at ${t.toFixed(3)}`);
    previous = tau;
  }
});

test('prime spiral copy claims', () => {
  assert.equal(PRIME_BEATS.length, primeSpirals.beats.length);
  // 6, 44 and 710 radians against whole turns.
  close(turnGap(6), -0.283, 0.0005);
  close(turnGap(44), 0.0177, 0.00005);
  close(turnGap(710), 0.00006, 0.000001);
  assert.equal(Math.round(44 / (2 * Math.PI)), 7);
  assert.equal(Math.round(710 / (2 * Math.PI)), 113);
  // 2π = [6; 3, 1, 1, 7, 2, 146, …]: convergents 6 … 710/113.
  assert.deepEqual(
    convergents()
      .slice(0, 6)
      .map(({ p, q }) => `${p}/${q}`),
    ['6/1', '19/3', '25/4', '44/7', '333/53', '710/113']
  );
  // How far out each family winds once: 133, about 15,600, 74 million.
  close(armTurnRadius(6), 133, 0.5);
  close(armTurnRadius(44), 15_600, 50);
  close(armTurnRadius(710) / 1e6, 74, 0.5);
  // Arms that can hold primes.
  assert.equal(totient(6), 2);
  assert.equal(totient(44), 20);
  assert.equal(totient(710), 280);
  assert.equal(totient(360), 96);
  // Primes below a million and their split over the arms.
  assert.equal(primeCount(1_000_000), 78_498);
  const six = primesPerArm(6);
  assert.deepEqual(
    [...six.keys()].sort((a, b) => a - b),
    [1, 5]
  );
  const forty = primesPerArm(44);
  assert.equal(forty.size, 20);
  assert.equal(Math.min(...forty.values()), 3874);
  assert.equal(Math.max(...forty.values()), 3964);
  for (const r of forty.keys()) assert.ok(r % 2 === 1 && r % 11 !== 0);
  const rays = primesPerArm(710);
  assert.equal(rays.size, 280);
  close(78_498 / rays.size, 280, 1);
  // Euler’s n² + n + 41 (FAQ): prime for n = 0 … 39, not for 40.
  const isPrime = (n: number) => {
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return n > 1;
  };
  for (let n = 0; n < 40; n++) assert.ok(isPrime(n * n + n + 41), `${n}`);
  assert.ok(!isPrime(40 * 40 + 40 + 41));
  // The story shows each view while its caption is up.
  const beatOf = (t: number) =>
    PRIME_BEATS.filter((start) => start <= t).length - 1;
  for (const [key, beat] of [
    ['first', 0],
    ['six', 2],
    ['fortyFour', 4],
    ['rays', 5],
  ] as const) {
    const [t, R] = STORY_VIEWS[key];
    assert.equal(beatOf(t), beat, key);
    close(primeStory(t).R / R, 1, 0.03, key);
  }
  assert.equal(visibleArms(STORY_VIEWS.six[1]), 6);
  assert.equal(visibleArms(STORY_VIEWS.fortyFour[1]), 44);
  assert.equal(visibleArms(STORY_VIEWS.rays[1]), 710);
  // Coloured by the modulus each caption names; primes alone where it says.
  const at = (t: number) => primeStory(t);
  assert.equal(at(STORY_VIEWS.six[0]).mod, 6);
  assert.equal(at(STORY_VIEWS.six[0]).tint, 1);
  assert.equal(at(24).ints < 0.2, true, 'beat 3: primes stand out');
  assert.equal(at(STORY_VIEWS.fortyFour[0]).mod, 44);
  assert.equal(at(STORY_VIEWS.fortyFour[0]).ints, 0);
  assert.equal(at(50).mod, 710);
  assert.equal(at(50).tint, 1);
});

test('newton fractal copy claims', () => {
  assert.equal(NEWTON_BEATS.length, newtonFractal.beats.length);
  // √2 from 1: 1.5, 1.4167, 1.4142157, 1.41421356237469; 1, 2, 5, 11 places.
  const xs = sqrt2Steps(1, 4);
  assert.equal(xs[0], 1.5);
  assert.equal(xs[1].toFixed(4), '1.4167');
  assert.equal(xs[2].toFixed(7), '1.4142157');
  assert.equal(xs[3].toFixed(14), '1.41421356237469');
  assert.deepEqual(xs.map(correctPlaces), [1, 2, 5, 11]);
  // z² − 1: each side of the imaginary axis goes to its own root.
  const two = POLYS.z2.roots;
  for (const im of [-2, -0.3, 0.7, 3]) {
    assert.equal(basinOf({ re: 0.01, im }, two).root, 0);
    assert.equal(basinOf({ re: -0.01, im }, two).root, 1);
  }
  // z³ − 1: −2^(−1/3) ≈ −0.7937 lands on 0 in one step.
  const three = POLYS.z3.roots;
  close(CUBE_BOUNDARY.re, -0.7937, 0.00005);
  const next = newtonStep({ re: CUBE_BOUNDARY.re + 1e-12, im: 0 }, three);
  close(Math.hypot(next.re, next.im), 0, 1e-9);
  // Zoomed 1200× around it, all three colours are present; and the same
  // around border points found anywhere.
  close(NEWTON_FULL.width / ZOOM_VIEW.width, 1200, 1e-9);
  const colours = (c: { re: number; im: number }, w: number) => {
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++)
      for (let j = 0; j < 40; j++)
        seen.add(
          basinOf(
            { re: c.re + (i / 39 - 0.5) * w, im: c.im + (j / 39 - 0.5) * w },
            three
          ).root
        );
    return seen;
  };
  assert.deepEqual([...colours(ZOOM_VIEW, ZOOM_VIEW.width)].sort(), [0, 1, 2]);
  for (const [a, b] of [
    [0, 1],
    [1, 2],
    [2, 0],
  ]) {
    const p = boundaryPoint(three, a, b);
    assert.deepEqual([...colours(p, 1e-3)].sort(), [0, 1, 2], `${a}-${b}`);
  }
  // The guessed sectors fail: these starts end at a root other than the
  // nearest one.
  for (const z of GUESS_STARTS) {
    const nearest = three
      .map((r, k) => ({ k, d: Math.hypot(z.re - r.re, z.im - r.im) }))
      .sort((x, y) => x.d - y.d)[0].k;
    assert.notEqual(basinOf(z, three).root, nearest, `${z.re},${z.im}`);
  }
  // Near 0 one step flings a start far away.
  const flung = newtonStep(NEAR_POLE, three);
  assert.ok(Math.hypot(flung.re, flung.im) > 10);
  // z³ − 2z + 2: 0 → 1 → 0, and a whole patch around 0 never converges.
  const cycle = POLYS.cycle.roots;
  const at0 = newtonStep({ re: 0, im: 0 }, cycle);
  close(at0.re, 1, 1e-12);
  close(at0.im, 0, 1e-12);
  const at1 = newtonStep({ re: 1, im: 0 }, cycle);
  close(Math.hypot(at1.re, at1.im), 0, 1e-12);
  for (const z of [
    { re: 0.03, im: 0.02 },
    { re: -0.05, im: -0.04 },
    { re: 1.01, im: 0.005 },
  ]) {
    assert.equal(basinOf(z, cycle, 400).root, -1);
  }
  // The story shows each step while its caption is up.
  const beatOf = (t: number) =>
    NEWTON_BEATS.filter((start) => start <= t).length - 1;
  assert.equal(newtonStory(6).tangent.alpha, 1);
  assert.equal(newtonStory(7.9).tangent.steps, 4);
  assert.equal(newtonStory(12).poly, 'z2');
  assert.equal(newtonStory(12).fractal, 1);
  assert.equal(newtonStory(18).poly, 'z3');
  assert.equal(newtonStory(18).fractal, 0, 'beat 2 shows only the guess');
  assert.equal(newtonStory(18).guess, 1);
  assert.equal(newtonStory(25).fractal, 1);
  const zoomed = newtonStory(35);
  assert.equal(beatOf(35), 4);
  close(zoomed.view.width, ZOOM_VIEW.width, 1e-12);
  close(zoomed.view.re, CUBE_BOUNDARY.re, 1e-12);
  assert.equal(newtonStory(40).paths.length, 1, 'beat 5: the start near 0');
  assert.equal(beatOf(47), 6);
  assert.equal(newtonStory(47).poly, 'cycle');
  close(newtonStory(47).view.width, CYCLE_VIEW.width, 1e-12);
  assert.ok(newtonStory(47).cycle > 0.9);
});

test('galton board copy claims', () => {
  assert.equal(GALTON_BEATS.length, galtonBoard.beats.length);
  // Pascal's triangle rows quoted in the caption.
  assert.deepEqual(
    [0, 1, 2].map((k) => choose(2, k)),
    [1, 2, 1]
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((k) => choose(3, k)),
    [1, 3, 3, 1]
  );
  // 12 rows: 4096 paths, 924 to the middle (22.6%), 1 to each edge.
  assert.equal(2 ** 12, 4096);
  assert.equal(choose(12, 6), 924);
  close(binomial(12, 6), 0.226, 0.0005);
  assert.equal(choose(12, 0), 1);
  // 24 rows: about 69% within one sd (normal: 68%); tilted mean 16.8.
  close(withinOneSd(24), 0.69, 0.005);
  close(24 * 0.7, 16.8, 1e-9);
  close(Math.sqrt(24 * 0.25), 2.45, 0.005);
  close(Math.sqrt(24 * 0.7 * 0.3), 2.24, 0.005);
  // The story's seeded balls: every slot within two points of the theory.
  for (const b of [FIRST_DROP, MANY_ROWS, TILTED]) {
    const slots = slotsAt(b, b.start + b.count / b.rate + 30);
    const total = slots.reduce((a, c) => a + c, 0);
    assert.equal(total, b.count);
    slots.forEach((c, k) =>
      assert.ok(
        Math.abs(c / total - binomial(b.rows, k, b.p)) < 0.02,
        `${b.rows} rows, p ${b.p}, slot ${k}`
      )
    );
  }
  // Every story batch has finished by the next beat it serves.
  const done = (b: typeof FIRST_DROP) =>
    b.start + (b.count - 1) / b.rate + (b.rows + 2) * b.hop;
  assert.ok(done(FIRST_DROP) < GALTON_BEATS[4]);
  assert.ok(done(MANY_ROWS) < GALTON_BEATS[5]);
  assert.ok(done(TILTED) < GALTON_BEATS[7]);
  // The single ball of beat 0 lands before Pascal's triangle appears.
  assert.ok(done(ONE_BALL) < GALTON_BEATS[1]);
  assert.ok(slotOf(ONE_BALL, 0) >= 0);
  // The story shows each layer while its caption is up.
  assert.equal(galtonStory(10).pascal, 1);
  assert.equal(galtonStory(15).counts, 1);
  assert.equal(galtonStory(32).curve, 1);
  assert.equal(galtonStory(38).batch.rows, 24);
  assert.equal(galtonStory(46).batch.p, 0.7);
  assert.equal(galtonStory(52).sigma, 1);
});

test('buffon needle copy claims', () => {
  assert.equal(BUFFON_BEATS.length, buffonNeedle.beats.length);
  // 2/π ≈ 63.66%.
  close(crossChance(1), 0.6366, 0.00005);
  // The story's floor: 10,000 needles give 3.1546, inside π ± 0.05 (2 sd).
  const counts = crossCounts(STORY_SEED, 1, STORY_NEEDLES);
  assert.equal(estimate(1, 10_000, counts[10_000]).toFixed(4), '3.1546');
  close(2 * estimateSd(1, 10_000), 0.05, 0.003);
  close(estimateSd(1, 10_000) * 100, 2.37, 0.01, 'σ ≈ 2.37/√N');
  // One more digit costs 100× the needles; 0.001 takes over 20 million.
  close(estimateSd(1, 1e6) / estimateSd(1, 1e4), 0.1, 1e-12);
  assert.ok((2 * estimateSd(1, 1)) ** 2 / 0.001 ** 2 > 2e7);
  // The story has thrown 10,000 by the slow-convergence beat.
  assert.ok(storyThrown(BUFFON_BEATS[3]) >= 10_000);
  // Noodles: crossings per unit length average 2/π whatever the shape;
  // a ring as wide as the gap always crosses exactly twice.
  let hits = 0;
  let length = 0;
  for (let i = 0; i < 20_000; i++) {
    hits += lineHits(noodle(5, i, 2.4)).length;
    length += 2.4;
  }
  close(hits / length, 2 / Math.PI, 0.01);
  for (let i = 0; i < 200; i++) {
    const c = needleAt(59, i, 9.6, 4.8);
    const ring = Array.from({ length: 129 }, (_, k) => ({
      x: c.x + 0.5 * Math.cos((2 * Math.PI * k) / 128),
      y: c.y + 0.5 * Math.sin((2 * Math.PI * k) / 128),
    }));
    assert.equal(lineHits(ring).length, 2);
  }
  // Lazzarini: 3408 needles of 5/6, 1808 crossings → 355/113, 6 decimals;
  // 3408 = 16 × 213; exactly 1808 has about a 1.4% chance.
  const lz = estimate(LAZZARINI.l, LAZZARINI.n, LAZZARINI.c);
  close(lz, 355 / 113, 1e-12);
  assert.equal(lz.toFixed(6), Math.PI.toFixed(6));
  assert.equal(LAZZARINI.n, 16 * 213);
  close(
    Math.exp(
      logBinomialPmf(LAZZARINI.n, LAZZARINI.c, crossChance(LAZZARINI.l))
    ),
    0.014,
    0.0005
  );
  close(estimateSd(LAZZARINI.l, LAZZARINI.n), 0.05, 0.002);
  // Each layer shows while its caption is up.
  assert.equal(buffonStory(20).graph, 1);
  assert.equal(buffonStory(29).funnel, 1);
  assert.equal(buffonStory(36).noodles, 1);
  assert.equal(buffonStory(44).rings, 1);
  assert.equal(buffonStory(52).lazzarini, 1);
});

test('collatz copy claims', () => {
  assert.equal(COLLATZ_BEATS.length, collatzTree.beats.length);
  // 6, 3, 10, 5, 16, 8, 4, 2, 1: 8 steps.
  assert.deepEqual(hailstone(6), [6, 3, 10, 5, 16, 8, 4, 2, 1]);
  // 27: 111 steps, peak 9232. Longest below 10,000: 6171, 261 steps.
  assert.deepEqual(stoppingTime(27), { steps: 111, peak: 9232 });
  const table = stepsTable(STORY_N);
  let longest = 1;
  for (let n = 1; n <= STORY_N; n++) if (table[n] > table[longest]) longest = n;
  assert.equal(longest, 6171);
  assert.equal(table[6171], 261);
  assert.equal(table[27], 111);
  // The tree of 1 … 10,000: 21,664 numbers, every one leads to the root.
  const tree = buildTree(STORY_N, STORY_EVEN, STORY_ODD);
  assert.equal(tree.nodes.length, 21_664);
  assert.equal(tree.nodes[0], 1);
  for (let i = 1; i < tree.nodes.length; i++) {
    assert.equal(tree.nodes[tree.parent[i]], collatzNext(tree.nodes[i]));
    assert.equal(tree.depth[i], tree.depth[tree.parent[i]] + 1);
  }
  assert.equal(tree.traffic[0], STORY_N, 'every path passes through 1');
  assert.equal(tree.maxDepth, 261);
  // Angles quoted in the explanation.
  assert.equal(STORY_EVEN, 0.16);
  assert.equal(STORY_ODD, 0.29);
  // On average two halvings follow each tripling: Σ k/2^k = 2, so 3/4.
  let halvings = 0;
  for (let k = 1; k < 60; k++) halvings += k / 2 ** k;
  close(halvings, 2, 1e-12);
  close(3 / 2 ** halvings, 0.75, 1e-12);
  // 2^68 ≈ 2.95 × 10^20.
  close(2 ** 68 / 1e20, 2.95, 0.005);
  // FAQ: 3n − 1 from 5 cycles 5, 14, 7, 20, 10, 5.
  const minus = (n: number) => (n % 2 === 0 ? n / 2 : 3 * n - 1);
  const loop = [5];
  for (let i = 0; i < 5; i++) loop.push(minus(loop[loop.length - 1]));
  assert.deepEqual(loop, [5, 14, 7, 20, 10, 5]);
  // Each picture shows while its caption is up.
  assert.ok(collatzStory(6).hailProgress >= 0.95);
  assert.ok(collatzStory(15).hailProgress >= 1.99);
  assert.equal(collatzStory(20).scatter, 1);
  assert.equal(collatzStory(28).highlight, 1);
  assert.equal(collatzStory(28).full, 0);
  assert.equal(collatzStory(41.5).grow, 1);
  assert.equal(collatzStory(41.5).full, 1);
});

test('strange attractor copy claims', () => {
  assert.equal(ATTRACTOR_BEATS.length, strangeAttractors.beats.length);
  // Six gallery pictures, all chaotic (λ > 0) and spread out.
  assert.equal(GALLERY.length, 6);
  for (const g of GALLERY) {
    assert.ok(lyapunov(g.p) > 0.2, g.id);
    assert.equal(kindOf(lyapunov(g.p)), 'chaos');
    assert.ok(spread(g.p) > 1000, g.id);
  }
  // a: −1.4 → −0.95 collapses into a 3-cycle (λ < 0).
  const cyc = [CYCLE_A, 1.6, 1.0, 0.7] as const;
  assert.equal(ATTRACTOR_START[0], -1.4);
  assert.equal(CYCLE_A, -0.95);
  assert.ok(lyapunov(cyc) < -0.1);
  assert.equal(cyclePoints(cyc), 3);
  // Orbits stay in |x| ≤ 1 + |c|, |y| ≤ 1 + |d|.
  for (const g of GALLERY) {
    const b = attractorBounds(g.p);
    let x = 0.1;
    let y = 0.1;
    for (let i = 0; i < 20_000; i++) {
      [x, y] = cliffordStep(g.p, x, y);
      assert.ok(Math.abs(x) <= b.x + 1e-12 && Math.abs(y) <= b.y + 1e-12);
    }
  }
  // Three million points once the picture is drawn.
  assert.equal(STORY_POINTS, 3_000_000);
  assert.equal(attractorStory(24).points, STORY_POINTS);
  // The morph (beat 4) stays chaotic every step of the way.
  for (let t = 29.4; t <= 39.6; t += 0.1) {
    const p = storyParams(t).p;
    assert.ok(lyapunov(p, 6000) > 0.03, `t ${t.toFixed(1)}`);
  }
  // Beat 5 reaches the cycle; the gallery shows each picture in turn.
  assert.deepEqual([...storyParams(45).p], [...cyc]);
  for (const [t, i] of GALLERY_CUTS) {
    assert.deepEqual([...storyParams(t + 0.5).p], [...GALLERY[i].p]);
    assert.ok(t >= ATTRACTOR_BEATS[6]);
  }
  // "Random picture" keeps only λ > 0.1 with the points spread out.
  let seed = 1;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 5; i++) {
    const p = randomChaotic(random);
    assert.ok(lyapunov(p, 8000) > 0.1 && spread(p) >= 400);
    for (const v of p) assert.ok(Math.abs(v) <= 2.5);
  }
});

test('every wonder has share images in both languages', async () => {
  const { existsSync } = await import('node:fs');
  const { wonderOgImage } = await import('../src/content/wonders');
  for (const wonder of publicWonders()) {
    for (const lang of ['en', 'zh'] as const) {
      const file = `public${wonderOgImage(wonder, lang)}`;
      assert.ok(existsSync(file), `${file} missing: run pnpm og:wonders`);
    }
  }
});

test('wonder search titles fit a search result', async () => {
  const { titleWidth } = await import('../src/lib/seo');
  for (const wonder of publicWonders()) {
    for (const lang of ['en', 'zh'] as const) {
      const title = wonder.metaTitle[lang];
      assert.ok(titleWidth(title) <= 62, `${title} (${titleWidth(title)})`);
      assert.ok(title.endsWith('| CurvG'), title);
    }
  }
});

test('wonder curve links resolve and copy facts hold', async () => {
  const { getCurve } = await import('../src/content/curves');
  for (const wonder of WONDERS) {
    for (const slug of wonder.relatedCurves) assert.ok(getCurve(slug), slug);
  }
});

test('wonder films: one line per beat, voice never reads a symbol', () => {
  for (const wonder of WONDERS) {
    if (!wonder.film) continue;
    assert.equal(wonder.film.length, wonder.beats.length, wonder.slug);
    for (const line of wonder.film)
      for (const lang of ['zh', 'en'] as const)
        assert.doesNotMatch((line.speak ?? line.text)[lang], /π|%|\//);
  }
});

test('a film fits the voice and only slows the story, never freezes it', () => {
  const lines = fourierEpicycles.film!.map((line) => line.text.zh);
  // Long clips on beats 0 and 3, short elsewhere.
  const voice = lines.map((_, i) => (i === 0 || i === 3 ? 9 : 3));
  const film = buildWonderFilm({
    beats: FOURIER_BEATS,
    length: FOURIER_STORY_LENGTH,
    lines,
    lang: 'zh',
    voiceSeconds: voice,
  });
  film.cues.forEach((cue, i) => {
    assert.ok(cue.end - cue.start >= voice[i] + 0.8, `beat ${i} fits its line`);
    close(storyTimeAt(film, cue.start), FOURIER_BEATS[i], 1e-9);
    assert.equal(cueAt(film, cue.start + 0.01)?.index, i);
  });
  let previous = -Infinity;
  for (let t = 0; t <= film.duration; t += 1 / 30) {
    const s = storyTimeAt(film, t);
    assert.ok(s > previous, `story time rises at ${t.toFixed(2)}`);
    previous = s;
  }
  assert.ok(storyTimeAt(film, film.duration) > FOURIER_STORY_LENGTH);
  assert.ok(film.outroStart < film.duration);
  assert.match(wonderFilmCaptions(film), /^WEBVTT\n\n1\n00:00:00\.350 --> /);
});
