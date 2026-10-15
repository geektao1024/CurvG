import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getLab } from '../src/content/labs';
import { publicWonders, WONDERS } from '../src/content/wonders';
import { fourierEpicycles } from '../src/content/wonders/data/fourier-epicycles';
import { lorenzAttractor } from '../src/content/wonders/data/lorenz-attractor';
import { mandelbrotSet } from '../src/content/wonders/data/mandelbrot-set';
import { sunflowerGoldenAngle } from '../src/content/wonders/data/sunflower-golden-angle';
import { richMathTex } from '../src/lib/rich-math';
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
