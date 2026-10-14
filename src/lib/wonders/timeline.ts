/**
 * Keyframe tracks for wonder stories. A story is a pure function of time, so
 * the page, a frame-by-frame film capture and the tests see the same frame at
 * the same `t`.
 */

export type Ease = (x: number) => number;

export const linear: Ease = (x) => x;
export const easeInOut: Ease = (x) =>
  x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
export const easeOut: Ease = (x) => 1 - (1 - x) ** 3;
/** Gentle at both ends, with a lower peak speed than `easeInOut`. */
export const easeSine: Ease = (x) => (1 - Math.cos(Math.PI * x)) / 2;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** `[time, value]`, optionally with the ease used to arrive at it. */
export type Key = readonly [number, number, Ease?];

/**
 * A value that holds between keys and eases into each key from the one
 * before it. Keys must be sorted by time.
 */
export function track(keys: readonly Key[]): (t: number) => number {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, ease = easeInOut] = keys[i];
      if (t < t1) {
        const [t0, v0] = keys[i - 1];
        return lerp(v0, v1, ease(clamp01((t - t0) / (t1 - t0))));
      }
    }
    return keys[keys.length - 1][1];
  };
}

/**
 * The integral of a speed track, tabulated once. Rotation angles come from
 * speed, not from angle keys, so slowing down and speeding up stay smooth.
 */
export function integrate(
  speed: (t: number) => number,
  duration: number,
  step = 1 / 240
): (t: number) => number {
  const n = Math.ceil(duration / step) + 1;
  const table = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) {
    // Midpoint rule.
    table[i] = table[i - 1] + speed((i - 0.5) * step) * step;
  }
  return (t) => {
    if (t <= 0) return speed(0) * t;
    const f = t / step;
    const i = Math.floor(f);
    if (i >= n) return table[n] + speed(duration) * (t - n * step);
    return lerp(table[i], table[i + 1], f - i);
  };
}

/** Index of the beat playing at `t`, given each beat's start time. */
export function beatAt(starts: readonly number[], t: number): number {
  let index = 0;
  for (let i = 0; i < starts.length; i++) if (t >= starts[i]) index = i;
  return index;
}
