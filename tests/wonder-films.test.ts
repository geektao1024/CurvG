import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AttractorEngine, GALLERY } from '../src/lib/wonders/attractors';
import { BuffonEngine, crossChance } from '../src/lib/wonders/buffon';
import { CollatzEngine } from '../src/lib/wonders/collatz';
import {
  storyClock,
  teaserCut,
  teaserLength,
  type WonderEngine,
  type WonderFrame,
} from '../src/lib/wonders/engine';
import { FourierEngine } from '../src/lib/wonders/fourier-scene';
import { binomial, GaltonEngine } from '../src/lib/wonders/galton';
import { LorenzEngine } from '../src/lib/wonders/lorenz';
import { edgeGlow, mandelColor, PRESETS } from '../src/lib/wonders/mandelbrot';
import { MandelbrotEngine } from '../src/lib/wonders/mandelbrot-gl';
import { NewtonEngine, POLYS } from '../src/lib/wonders/newton';
import {
  CYCLE,
  PendulumWaveEngine,
  visibleRows,
} from '../src/lib/wonders/pendulum-wave';
import { PhyllotaxisEngine } from '../src/lib/wonders/phyllotaxis';
import {
  PrimeSpiralEngine,
  STORY_VIEWS,
} from '../src/lib/wonders/prime-spiral';
import {
  decodeShare,
  encodeShare,
  shareNumber,
} from '../src/lib/wonders/share';

/**
 * Exports ("my version", docs/WONDERS_PLAN.md §4) run a cloned engine in
 * free mode with a fixed dt. These pin what each film promises, without a
 * browser: a canvas context that accepts every call and draws nothing.
 */
const ctx: any = new Proxy(function () {}, {
  get: (_t, key) =>
    key === 'createRadialGradient' || key === 'createLinearGradient'
      ? () => ({ addColorStop() {} })
      : ctx,
  apply: () => ctx,
  set: () => true,
});
(globalThis as any).Path2D ??= class {
  moveTo() {}
  lineTo() {}
  arc() {}
};

function run(engine: WonderEngine, seconds: number, fps = 30) {
  const frame: WonderFrame = {
    mode: 'free',
    t: 0,
    dt: 1 / fps,
    playing: true,
    width: 1280,
    height: 720,
    insets: { top: 104, right: 40, bottom: 96, left: 40 },
  };
  for (let i = 0; i < Math.round(seconds * fps); i++) engine.frame(frame, ctx);
}

test('lorenz film: the released ball spreads over both wings', () => {
  for (const rho of [28, 32]) {
    const base = new LorenzEngine({ gap: (v) => v });
    base.rho = rho;
    const film = base.clone();
    const seconds = film.freeFilm();
    run(film, Math.min(10, seconds));
    const xs = (film as any).swarm.map((p: number[]) => p[0]);
    assert.ok(Math.min(...xs) < -5 && Math.max(...xs) > 5, `ρ = ${rho}`);
  }
});

test('mandelbrot film: dives from the whole set and lands on the view', () => {
  const page = new MandelbrotEngine({
    noWebgl: '',
    escaped: () => '',
    stays: '',
  });
  page.view = { re: -0.743643887037, im: 0.131825904205, width: 3e-9 };
  const film = page.clone();
  const seconds = film.freeFilm();
  assert.ok(seconds >= 10 && seconds <= 32);
  run(film, 0.1);
  assert.ok(film.view.width > 1, 'starts zoomed out');
  run(film, seconds);
  assert.equal(film.view.width, 3e-9);
  assert.ok(Math.abs(film.view.re - page.view.re) < 1e-12);
  assert.ok(Math.abs(film.view.im - page.view.im) < 1e-12);
  // From the full view there is nothing to fly to: it dives to a preset.
  const full = new MandelbrotEngine({
    noWebgl: '',
    escaped: () => '',
    stays: '',
  });
  const dive = full.clone();
  run(dive, dive.freeFilm());
  assert.equal(dive.view.width, PRESETS.seahorse.width);
});

test('fourier and sunflower films reach the reader’s settings', () => {
  const fourier = new FourierEngine({ overshoot: (p) => p });
  fourier.target = { shape: 'pi', count: 60, showCircles: true };
  const fourierFilm = fourier.clone();
  const fourierSeconds = fourierFilm.freeFilm();
  run(fourierFilm, 1);
  assert.ok(fourierFilm.circles() < 10, 'assembles circle by circle');
  run(fourierFilm, fourierSeconds);
  assert.equal(fourierFilm.circles(), 60);

  const sunflower = new PhyllotaxisEngine();
  sunflower.target = { angle: 137.6, count: 800, spirals: false };
  const sf = sunflower.clone();
  const seconds = sf.freeFilm();
  run(sf, 1);
  assert.ok(sf.scene.count < 200, 'grows seed by seed');
  run(sf, seconds);
  assert.equal(Math.round(sf.scene.count), 800);
  assert.ok(Math.abs(sf.scene.angle - 137.6) < 1e-9);
});

test('mandelbrot colours stay in range; the boundary glow fades', () => {
  for (const mu of [0, 0.5, 3, 17.2, 250, 4000]) {
    for (const c of mandelColor(mu)) assert.ok(c >= 0 && c <= 1, `${mu}`);
  }
  assert.equal(edgeGlow(0), 1);
  assert.ok(edgeGlow(1) > edgeGlow(3) && edgeGlow(8) < 0.01);
});

test('share links: readable, bounded, round-trip', () => {
  const packed = encodeShare({
    x: '-0.74364388703715869',
    w: 3e-9,
    r: 0.1 + 0.2,
    p: true,
    bad: 'a,b:c',
  });
  assert.equal(packed, 'x:-0.74364388703715869,w:3e-9,r:0.3,p:1');
  assert.deepEqual(decodeShare(packed), {
    x: '-0.74364388703715869',
    w: '3e-9',
    r: '0.3',
    p: '1',
  });
  assert.equal(decodeShare('<script>:1'), null);
  assert.equal(decodeShare('x'.repeat(500)), null);
  assert.equal(shareNumber('1e9', 0.5, 40, 28), 40);
  assert.equal(shareNumber('nope', 0.5, 40, 28), 28);
  assert.equal(shareNumber(undefined, 0.5, 40, 28), 28);
});

test('cold opens: the payoff first, then a clean cut into the story', () => {
  const engines: WonderEngine[] = [
    new FourierEngine({ overshoot: (p) => p }),
    new MandelbrotEngine({ noWebgl: '', escaped: () => '', stays: '' }),
    new LorenzEngine({ gap: (v) => v }),
    new PhyllotaxisEngine(),
  ];
  for (const engine of engines) {
    const lead = teaserLength(engine);
    assert.ok(lead >= 3 && lead <= 4, 'a few seconds, no more');
    const [from, to] = engine.teaser!;
    assert.ok(from >= 0 && to <= engine.length);
    // The clock runs -lead → 0 through the window, then the story from 0.
    assert.equal(storyClock(engine, -lead), from);
    assert.ok(Math.abs(storyClock(engine, -1e-9) - to) < 1e-6);
    assert.equal(storyClock(engine, 0), 0);
    assert.equal(teaserCut(0), 1);
    assert.equal(teaserCut(0.5), 0);
  }
  // The teaser shows the spread swarm, not the first lonely path.
  const lorenz = new LorenzEngine({ gap: (v) => v });
  run(lorenz, 0);
  lorenz.frame(
    {
      mode: 'story',
      t: storyClock(lorenz, -2),
      dt: 0,
      playing: true,
      width: 1280,
      height: 720,
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
    ctx
  );
  assert.ok(lorenz.scene.swarm > 0.9);
});

test('lorenz share link opens on a swarm already spread', () => {
  const engine = new LorenzEngine({ gap: (v) => v });
  engine.rho = 28;
  engine.count = 2000;
  engine.spread();
  const xs = (engine as any).swarm.map((p: number[]) => p[0]);
  assert.equal(xs.length, 2000);
  assert.ok(Math.min(...xs) < -5 && Math.max(...xs) > 5);
});

test('pendulum film: one whole cycle of the reader’s row, back in step', () => {
  const base = new PendulumWaveEngine();
  base.settings = { count: 21, speed: 2, wave: true };
  const film = base.clone();
  const seconds = film.freeFilm();
  assert.ok(seconds >= 20 && seconds <= 30, `${seconds} s`);
  // Each pattern of the cycle is passed on the way.
  const seen = new Set<number>();
  for (let i = 0; i < seconds * 30; i++) {
    run(film, 1 / 30);
    const q = visibleRows(film.scene.tau, film.settings.count);
    if (q !== null) seen.add(q);
  }
  assert.ok(film.scene.tau >= CYCLE && film.scene.tau < CYCLE + 1.5);
  assert.equal(film.settings.count, 21);
  for (const q of [1, 2, 3, 4]) assert.ok(seen.has(q), `${q} groups`);
});

test('prime film: zooms out from the first numbers to the reader’s view', () => {
  for (const [logR, expected] of [
    [Math.log10(5000), 5000],
    // Close in: the film goes on to the 710 rays.
    [Math.log10(40), STORY_VIEWS.rays[1]],
  ]) {
    const base = new PrimeSpiralEngine();
    base.settings = { logR, primesOnly: true, mod: 44 };
    const film = base.clone();
    const seconds = film.freeFilm();
    assert.ok(seconds >= 10 && seconds <= 22, `${seconds} s`);
    run(film, 0.1);
    assert.ok(film.scene.R < 40, `starts close in: ${film.scene.R}`);
    let previous = film.scene.R;
    for (let i = 0; i < (seconds - 0.1) * 30; i++) {
      run(film, 1 / 30);
      assert.ok(film.scene.R >= previous - 1e-9, 'never zooms back in');
      previous = film.scene.R;
    }
    assert.ok(Math.abs(film.scene.R / expected - 1) < 1e-6, `${film.scene.R}`);
    assert.equal(film.settings.mod, 44);
  }
});

test('newton film: dives from the overview into the reader’s view', () => {
  const text = { noWebgl: '', reached: () => '', never: '', guess: '' };
  const roots = [
    { re: 1, im: 0 },
    { re: -0.6, im: 0.9 },
    { re: -0.4, im: -0.8 },
    { re: 0.3, im: 0.2 },
  ];
  for (const view of [
    { re: -0.31, im: 0.42, width: 0.01 },
    // An overview: the film dives into a border point instead.
    { re: 0, im: 0, width: 4.8 },
  ]) {
    const base = new NewtonEngine(text);
    base.setRoots(roots, null);
    base.view = view;
    const film = base.clone();
    const seconds = film.freeFilm();
    assert.ok(seconds >= 12 && seconds <= 26, `${seconds} s`);
    run(film, 0.05);
    assert.ok(film.view.width > 4.5, 'starts on the overview');
    run(film, seconds);
    assert.deepEqual(film.roots, roots);
    if (view.width < 1) {
      assert.ok(Math.abs(film.view.re - view.re) < 1e-12);
      assert.ok(Math.abs(film.view.width - view.width) < 1e-12);
    } else {
      assert.ok(Math.abs(film.view.width - 0.004) < 1e-12);
    }
  }
  // Presets survive the clone too.
  const base = new NewtonEngine(text);
  base.setRoots(POLYS.cycle.roots, 'cycle');
  assert.equal(base.clone().preset, 'cycle');
});

test('newton share links keep custom roots without a plus sign', async () => {
  const { formatRoot, parseRoot } =
    await import('../src/components/newton-wonder');
  for (const r of [
    { re: 0.3, im: -0.8 },
    { re: -1.7693, im: 0 },
    { re: 0, im: 0.5 },
  ]) {
    const text = formatRoot(r);
    assert.doesNotMatch(text, /\+/);
    assert.deepEqual(parseRoot(text), r);
  }
  assert.equal(parseRoot('9j9')?.re, 4, 'clamped');
  assert.equal(parseRoot('1+2i'), null);
});

test('galton film: the reader’s board fills with 1500 balls', () => {
  const base = new GaltonEngine();
  base.settings = { ...base.settings, rows: 16, p: 0.35, curve: false };
  const film = base.clone();
  const seconds = film.freeFilm();
  run(film, seconds);
  const { slots, rows, p } = film.shown;
  assert.equal(rows, 16);
  assert.equal(p, 0.35);
  const total = slots.reduce((a, c) => a + c, 0);
  assert.equal(total, 1500, 'every ball has landed');
  assert.equal(film.scene.curve, 1, 'the theory is drawn by the end');
  const mean = slots.reduce((a, c, k) => a + c * k, 0) / total;
  assert.ok(Math.abs(mean - 16 * 0.35) < 0.2, `mean ${mean}`);
  slots.forEach((c, k) =>
    assert.ok(Math.abs(c / total - binomial(16, k, 0.35)) < 0.025, `slot ${k}`)
  );
});

test('buffon film: 30,000 needles of the reader’s length', () => {
  const base = new BuffonEngine();
  base.settings = { ...base.settings, length: 0.5 };
  const film = base.clone();
  const seconds = film.freeFilm();
  run(film, seconds);
  const { thrown, crossed, length } = film.shown;
  assert.equal(length, 0.5);
  assert.equal(thrown, 30_000);
  assert.ok(Math.abs(crossed / thrown - crossChance(0.5)) < 0.01);
  assert.equal(film.scene.funnel, 1);
});

test('collatz film: the reader’s tree grows from 1 to its full depth', () => {
  const base = new CollatzEngine();
  base.settings = { N: 3000, even: 0.2, odd: 0.35, highlight: 871 };
  const film = base.clone();
  const seconds = film.freeFilm();
  run(film, 0.2);
  assert.ok(film.scene.grow < 0.05, 'starts at the root');
  run(film, seconds);
  assert.equal(film.scene.grow, 1);
  assert.deepEqual(film.settings, {
    N: 3000,
    even: 0.2,
    odd: 0.35,
    highlight: 871,
  });
});

test('attractor film: the reader’s picture appears point by point', () => {
  const base = new AttractorEngine();
  base.params = GALLERY[3].p;
  const film = base.clone();
  const seconds = film.freeFilm();
  run(film, 1);
  assert.ok(film.scene.points < 1000, 'starts from a few hops');
  assert.equal(film.scene.hops, 1);
  run(film, seconds - 1);
  assert.deepEqual([...film.scene.p], [...GALLERY[3].p]);
  assert.ok(film.scene.points >= 5_000_000, `${film.scene.points}`);
  assert.equal(film.scene.hops, 0);
});
