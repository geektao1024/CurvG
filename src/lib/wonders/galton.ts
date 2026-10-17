/**
 * Galton board: balls fall through n rows of pegs, going left or right at
 * each with probability 1 − p / p. The slot a ball lands in is its number
 * of rights, Binomial(n, p): count the paths (Pascal's triangle) and the
 * bell appears; for many rows it is the normal curve (central limit theorem).
 * Math, story and a Canvas 2D engine.
 *
 * Story balls are pure functions of time: ball i of a batch is released at
 * a fixed time and each of its turns comes from a hash of (seed, i, row).
 */

import { safeArea, type WonderEngine, type WonderFrame } from './engine';
import { clamp01, lerp, track } from './timeline';

// ── Probability ───────────────────────────────────────────────────────────

export function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let c = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) c = (c * (n - i + 1)) / i;
  return Math.round(c);
}

/** P(k rights in n rows) when each turn goes right with probability p. */
export function binomial(n: number, k: number, p = 0.5): number {
  return choose(n, k) * p ** k * (1 - p) ** (n - k);
}

/** Normal density with the binomial's mean np and variance np(1 − p). */
export function normalApprox(n: number, x: number, p = 0.5): number {
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  return (
    Math.exp(-((x - mu) ** 2) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI))
  );
}

/** Share of the probability within one standard deviation of the mean. */
export function withinOneSd(n: number, p = 0.5): number {
  const mu = n * p;
  const sd = Math.sqrt(n * p * (1 - p));
  let sum = 0;
  for (let k = 0; k <= n; k++)
    if (Math.abs(k - mu) <= sd) sum += binomial(n, k, p);
  return sum;
}

/** A uniform number in [0, 1) from integers: a small avalanche hash. */
export function hash01(seed: number, i: number, r: number): number {
  let h = (seed * 0x9e3779b1) ^ (i * 0x85ebca77) ^ (r * 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ── Batches of balls ──────────────────────────────────────────────────────

/** A batch of balls released at a steady rate through one board. */
export type Batch = {
  rows: number;
  p: number;
  count: number;
  /** Time the first ball is released, and balls per second. */
  start: number;
  rate: number;
  /** Seconds per row. */
  hop: number;
  seed: number;
};

/** Hops from release to resting in a slot: drop, n rows, fall into the slot. */
const FLIGHT = (rows: number) => rows + 2;

/** Rights taken in the first `r` rows by ball `i`. */
export function rightsAfter(b: Batch, i: number, r: number): number {
  let k = 0;
  for (let row = 0; row < r; row++) if (hash01(b.seed, i, row) < b.p) k++;
  return k;
}

/** Slot ball `i` ends in. */
export function slotOf(b: Batch, i: number): number {
  return rightsAfter(b, i, b.rows);
}

/** Balls of the batch resting in each slot at time `t`. */
export function slotsAt(b: Batch, t: number): number[] {
  const out = new Array(b.rows + 1).fill(0);
  const landed = landedBy(b, t);
  for (let i = 0; i < landed; i++) out[slotOf(b, i)]++;
  return out;
}

/** How many balls have landed by time `t` (they land in release order). */
export function landedBy(b: Batch, t: number): number {
  const since = t - b.start - FLIGHT(b.rows) * b.hop;
  if (since < 0) return 0;
  return Math.min(b.count, Math.floor(since * b.rate) + 1);
}

/** Balls in the air at `t`: index range [from, to). */
export function inFlight(b: Batch, t: number): [number, number] {
  const released =
    t < b.start ? 0 : Math.min(b.count, Math.floor((t - b.start) * b.rate) + 1);
  return [landedBy(b, t), released];
}

/**
 * Where ball `i` is at time `t`, in board units: pegs one apart, rows
 * 0.87 apart, row 0 at y = 0, the slot mouths at y = rows · 0.87.
 */
export function ballAt(
  b: Batch,
  i: number,
  t: number
): { x: number; y: number } {
  const tau = (t - (b.start + i / b.rate)) / b.hop;
  const R = 0.87;
  if (tau < 1) {
    // Dropping onto the top peg.
    const u = clamp01(tau);
    return { x: 0, y: lerp(-1.3, -0.25, u * u) };
  }
  const r = Math.min(b.rows, Math.floor(tau - 1));
  const u = tau - 1 - r;
  if (r >= b.rows) {
    const k = rightsAfter(b, i, b.rows);
    return {
      x: k - b.rows / 2,
      y: b.rows * R + 0.4 * clamp01(tau - 1 - b.rows),
    };
  }
  const j = rightsAfter(b, i, r);
  const right = hash01(b.seed, i, r) < b.p;
  const x0 = j - r / 2;
  const x1 = x0 + (right ? 0.5 : -0.5);
  // A small hop off the peg, then down to the next row.
  const y = r * R - 0.25 + R * u * u - 0.35 * Math.sin(Math.PI * u) * (1 - u);
  return { x: lerp(x0, x1, u), y };
}

// ── Story ─────────────────────────────────────────────────────────────────

export const GALTON_BEATS = [0, 7, 13, 19, 34, 43, 50, 55] as const;
export const GALTON_STORY_LENGTH = 60;
export const STORY_ROWS = 12;
export const STORY_BALLS = 2000;

/** The story's batches (pinned by tests). */
export const ONE_BALL: Batch = {
  rows: STORY_ROWS,
  p: 0.5,
  count: 1,
  start: 0.6,
  rate: 1,
  hop: 0.42,
  seed: 7,
};
export const FIRST_DROP: Batch = {
  rows: STORY_ROWS,
  p: 0.5,
  count: STORY_BALLS,
  start: 19.6,
  rate: 190,
  hop: 0.1,
  seed: 11,
};
export const MANY_ROWS: Batch = {
  rows: 24,
  p: 0.5,
  count: STORY_BALLS,
  start: 34.8,
  rate: 330,
  hop: 0.05,
  seed: 23,
};
export const TILTED: Batch = { ...MANY_ROWS, p: 0.7, start: 43.8, seed: 31 };

const pascalAt = track([
  [7.4, 0],
  [8.6, 1],
  [18, 1],
  [19, 0],
]);
/** Beat 2: the middle slot (924 paths) and the edges (1 path) lit up. */
const countsAt = track([
  [13.2, 0],
  [14, 1],
  [18.4, 1],
  [19.2, 0],
]);
const curveAt = track([
  [29, 0],
  [30.5, 1],
  [33.4, 1],
  [34, 0],
  [39.5, 0],
  [40.5, 1],
  [42.6, 1],
  [43.2, 0],
  [47.5, 0],
  [48.5, 1],
]);
/** Mean and ±1 sd marks. */
const sigmaAt = track([
  [40.8, 0],
  [41.6, 1],
  [42.6, 1],
  [43.2, 0],
  [50.4, 0],
  [51.4, 1],
]);

export type GaltonScene = {
  batch: Batch;
  /** Board opacity (crossfades when the rows change). */
  board: number;
  pascal: number;
  counts: number;
  curve: number;
  sigma: number;
};

function batchAt(t: number): Batch {
  if (t < 19.3) return ONE_BALL;
  if (t < 34.2) return FIRST_DROP;
  if (t < 43.4) return MANY_ROWS;
  return TILTED;
}

export function galtonStory(t: number): GaltonScene {
  const cut = (a: number) => clamp01(Math.abs(t - a) / 0.35);
  return {
    batch: batchAt(t),
    board: Math.min(cut(19.3), cut(34.2), cut(43.4)),
    pascal: pascalAt(t),
    counts: countsAt(t),
    curve: curveAt(t),
    sigma: sigmaAt(t),
  };
}

// ── Engine ────────────────────────────────────────────────────────────────

const AMBER = [255, 196, 110] as const;
const CYAN = [110, 231, 255] as const;
const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a))})`;

export const MIN_ROWS = 4;
export const MAX_ROWS = 24;

export type GaltonSettings = {
  rows: number;
  p: number;
  /** Balls per second. */
  rate: number;
  pascal: boolean;
  curve: boolean;
};

/** Length of "my version". */
export const GALTON_FREE_FILM = 16;
const FILM_BALLS = 1500;

type Live = { born: number; seed: number };

export class GaltonEngine implements WonderEngine {
  readonly beats = GALTON_BEATS;
  readonly length = GALTON_STORY_LENGTH;
  /** Cold open: two thousand balls building the bell. */
  readonly teaser = [24, 28] as const;
  readonly glow = 0.6;

  scene: GaltonScene = galtonStory(0);
  settings: GaltonSettings = {
    rows: STORY_ROWS,
    p: 0.5,
    rate: 60,
    pascal: false,
    curve: true,
  };
  /** Free play: balls resting in each slot. */
  slots: number[] = new Array(STORY_ROWS + 1).fill(0);

  private clock = 0;
  private live: Live[] = [];
  private queue = 0;
  private nextSeed = 1;
  /** Fractional balls owed to the release rate. */
  private spawnDebt = 0;
  private film: { batch: Batch; t: number } | null = null;

  attach() {}

  /** Free-play board for the current settings. */
  private freeBatch(seed: number): Batch {
    const { rows, p } = this.settings;
    return {
      rows,
      p,
      count: 1,
      start: 0,
      rate: 1,
      hop: Math.max(0.05, 0.9 / rows),
      seed,
    };
  }

  leaveStory() {
    const b = this.scene.batch;
    this.settings = { ...this.settings, rows: b.rows, p: b.p };
    this.reset();
  }

  replay() {
    this.settings = {
      rows: STORY_ROWS,
      p: 0.5,
      rate: 60,
      pascal: false,
      curve: true,
    };
    this.reset();
    this.film = null;
  }

  /** Empty the board. */
  reset() {
    this.slots = new Array(this.settings.rows + 1).fill(0);
    this.live = [];
    this.queue = 0;
  }

  /** Release `n` more balls at the current rate. */
  drop(n: number) {
    this.queue += n;
  }

  /** What the board shows now (story or free play), for the readouts. */
  shown: { slots: number[]; rows: number; p: number } = {
    slots: [],
    rows: STORY_ROWS,
    p: 0.5,
  };

  clone(): GaltonEngine {
    const e = new GaltonEngine();
    e.settings = { ...this.settings };
    e.scene = { ...this.scene };
    return e;
  }

  /** "My version": 1500 balls through the reader's board, curve on top. */
  freeFilm(): number {
    const { rows, p } = this.settings;
    const hop = Math.max(0.05, 1.1 / rows);
    this.film = {
      batch: {
        rows,
        p,
        count: FILM_BALLS,
        start: 0.6,
        rate: FILM_BALLS / 11,
        hop,
        seed: 101,
      },
      t: 0,
    };
    this.settings = { ...this.settings, curve: true };
    return GALTON_FREE_FILM;
  }

  frame(f: WonderFrame, ctx: CanvasRenderingContext2D) {
    if (f.mode === 'story') {
      this.scene = galtonStory(f.t);
      this.drawBatch(ctx, f, this.scene.batch, f.t);
      return;
    }
    if (this.film) {
      const film = this.film;
      film.t += f.dt;
      this.scene = {
        batch: film.batch,
        board: 1,
        pascal: 0,
        counts: 0,
        curve: clamp01((film.t - 10) / 1.5),
        sigma: 0,
      };
      this.drawBatch(ctx, f, film.batch, film.t);
      return;
    }
    // Free play: a live simulation (not a function of time).
    const { rows } = this.settings;
    if (this.slots.length !== rows + 1) this.reset();
    if (f.playing) {
      this.clock += f.dt;
      // Release queued balls, plus a steady trickle at the chosen rate.
      const want =
        this.settings.rate * f.dt +
        (this.queue > 0 ? Math.min(this.queue, 400 * f.dt) : 0);
      this.queue = Math.max(0, this.queue - 400 * f.dt);
      this.spawnDebt += want;
      while (this.spawnDebt >= 1) {
        this.spawnDebt -= 1;
        this.live.push({
          born: this.clock - Math.random() * f.dt,
          seed: this.nextSeed++,
        });
      }
    }
    const probe = this.freeBatch(0);
    const still: Live[] = [];
    for (const ball of this.live) {
      const b = { ...probe, seed: ball.seed };
      if (this.clock - ball.born >= FLIGHT(rows) * b.hop)
        this.slots[slotOf(b, 0)]++;
      else still.push(ball);
    }
    this.live = still;
    this.scene = {
      batch: probe,
      board: 1,
      pascal: this.settings.pascal ? 1 : 0,
      counts: 0,
      curve: this.settings.curve ? 1 : 0,
      sigma: 0,
    };
    this.draw(
      ctx,
      f,
      probe,
      this.live.map((ball) =>
        ballAt({ ...probe, seed: ball.seed, start: ball.born }, 0, this.clock)
      ),
      this.slots
    );
  }

  private drawBatch(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    b: Batch,
    t: number
  ) {
    const [from, to] = inFlight(b, t);
    const balls: { x: number; y: number }[] = [];
    for (let i = from; i < to; i++) balls.push(ballAt(b, i, t));
    this.draw(ctx, f, b, balls, slotsAt(b, t), b === ONE_BALL ? t : null);
  }

  private draw(
    ctx: CanvasRenderingContext2D,
    f: WonderFrame,
    b: Batch,
    balls: { x: number; y: number }[],
    slots: number[],
    single: number | null = null
  ) {
    this.shown = { slots, rows: b.rows, p: b.p };
    const s = this.scene;
    const n = b.rows;
    const area = safeArea(f.width, f.height, f.insets);
    // Board above, slots below: pegs take ~58% of the height.
    const unit = Math.min(
      area.w / (n + 2.2),
      (area.h * 0.56) / (n * 0.87 + 1.3)
    );
    const top = area.cy - area.h / 2 + unit * 1.4;
    const X = (x: number) => area.cx + x * unit;
    const Y = (y: number) => top + y * unit;
    const mouth = Y(n * 0.87);
    const floor = area.cy + area.h / 2;
    const alpha = s.board;

    // Slot walls.
    ctx.strokeStyle = `rgba(200,210,255,${0.16 * alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= n + 1; k++) {
      const x = X(k - n / 2 - 0.5);
      ctx.moveTo(x, mouth + unit * 0.3);
      ctx.lineTo(x, floor);
    }
    ctx.moveTo(X(-n / 2 - 0.5), floor);
    ctx.lineTo(X(n / 2 + 0.5), floor);
    ctx.stroke();

    // Pegs.
    const pegR = Math.max(1.4, unit * 0.09);
    ctx.fillStyle = `rgba(210,220,255,${0.55 * alpha})`;
    for (let r = 0; r < n; r++) {
      for (let j = 0; j <= r; j++) {
        ctx.beginPath();
        ctx.arc(X(j - r / 2), Y(r * 0.87), pegR, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Pascal's triangle: paths reaching each peg, and each slot.
    if (s.pascal > 0.01) {
      const size = Math.max(9, Math.min(14, unit * 0.34));
      ctx.font = `500 ${size}px "JetBrains Mono", ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = `rgba(178,160,255,${0.85 * s.pascal * alpha})`;
      for (let r = 0; r < n && n <= 14; r++) {
        for (let j = 0; j <= r; j++) {
          ctx.fillText(
            String(choose(r, j)),
            X(j - r / 2),
            Y(r * 0.87) - pegR - 2
          );
        }
      }
    }

    // Slots: stacked balls (as bars once they are many).
    const total = slots.reduce((a, c) => a + c, 0);
    const expectMax = Math.max(
      1e-9,
      ...Array.from({ length: n + 1 }, (_, k) => binomial(n, k, b.p))
    );
    const capacity = floor - mouth - unit * 0.6;
    const batchTotal = b.count > 1 ? b.count : Math.max(total, 1);
    const perBall = Math.min(
      unit * 0.32,
      capacity / (batchTotal * expectMax * 1.12)
    );
    const width = unit * 0.82;
    slots.forEach((c, k) => {
      if (c <= 0) return;
      const h = c * perBall;
      const x = X(k - n / 2) - width / 2;
      const g = ctx.createLinearGradient(0, floor - h, 0, floor);
      g.addColorStop(0, rgba(AMBER, 0.95 * alpha));
      g.addColorStop(1, rgba([255, 140, 70], 0.35 * alpha));
      ctx.fillStyle = g;
      ctx.fillRect(x, floor - h, width, h);
    });

    // Highlight the middle slot and the edges (beat 2), with their paths.
    if (s.counts > 0.01) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const size = Math.max(10, Math.min(15, unit * 0.36));
      for (let k = 0; k <= n; k++) {
        const key = k === n / 2 || k === 0 || k === n;
        ctx.font = `${key ? 700 : 500} ${size}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.fillStyle = rgba(
          key ? AMBER : [200, 210, 240],
          (key ? 1 : 0.55) * s.counts
        );
        ctx.fillText(String(choose(n, k)), X(k - n / 2), floor - 6);
      }
    }

    // The theory: expected count per slot, a smooth curve over the bars.
    if (s.curve > 0.01 && batchTotal > 0) {
      ctx.strokeStyle = rgba(CYAN, 0.9 * s.curve * alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const x = -0.5 + ((n + 1) * i) / 200;
        const h = batchTotal * normalApprox(n, x, b.p) * perBall;
        const px = X(x - n / 2);
        if (i === 0) ctx.moveTo(px, floor - h);
        else ctx.lineTo(px, floor - h);
      }
      ctx.stroke();
      // Exact binomial expectation per slot, as dots on the curve.
      ctx.fillStyle = rgba(CYAN, s.curve * alpha);
      for (let k = 0; k <= n; k++) {
        const h = batchTotal * binomial(n, k, b.p) * perBall;
        ctx.beginPath();
        ctx.arc(X(k - n / 2), floor - h, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Mean and one standard deviation either side.
    if (s.sigma > 0.01) {
      const mu = n * b.p;
      const sd = Math.sqrt(n * b.p * (1 - b.p));
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.2;
      for (const [x, c] of [
        [mu, AMBER],
        [mu - sd, CYAN],
        [mu + sd, CYAN],
      ] as const) {
        ctx.strokeStyle = rgba(c, 0.7 * s.sigma);
        ctx.beginPath();
        ctx.moveTo(X(x - n / 2), mouth + unit * 0.4);
        ctx.lineTo(X(x - n / 2), floor);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(CYAN, 0.7 * s.sigma);
      ctx.fillRect(X(mu - sd - n / 2), floor + 3, 2 * sd * unit, 3);
    }

    // The single ball's path so far, then the balls themselves.
    const ballR = Math.max(1.6, unit * 0.17);
    if (single !== null) {
      const tau = (single - b.start) / b.hop;
      ctx.strokeStyle = rgba(AMBER, 0.45);
      ctx.lineWidth = 2;
      ctx.beginPath();
      const steps = Math.max(0, Math.min(n + 2, tau)) * 12;
      for (let q = 0; q <= steps; q++) {
        const p = ballAt(b, 0, b.start + (q / 12) * b.hop);
        if (q === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba([255, 230, 180], alpha);
    for (const p of balls) {
      if (p.y > n * 0.87 + 0.4) continue;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), ballR, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
