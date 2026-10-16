/**
 * The shared Manim kit for video templates: frame geometry, the two CurvG
 * themes, axes sized to the mathematics, captions, and a script builder that
 * keeps an exact running clock.
 *
 * Templates are code we own, not model output, so they write Manim directly
 * instead of going through the generation IR. Every value that reaches the
 * Python source passes through `py()` (strings), `pythonNumber()` (numbers)
 * or `toNumpy()` (expressions); nothing user-typed is concatenated raw.
 *
 * The renderer's scene validator (`renderer/validate_scene.py`) still checks
 * every template's output; `tests/video-templates.test.ts` runs it locally.
 */

import { pythonNumber } from './expr';
import type { TemplateContext, TemplateFrame } from './types';

/** A Python string literal. JSON escapes are valid Python escapes. */
export function py(value: string): string {
  return JSON.stringify(value);
}

export const num = pythonNumber;

export interface ThemePalette {
  bg: string;
  panel: string;
  ink: string;
  muted: string;
  grid: string;
  axis: string;
  amber: string;
  blue: string;
  green: string;
  red: string;
}

/** Paper & amber (the labs) and the dark studio (the wonders). */
export const THEMES: Record<'paper' | 'studio', ThemePalette> = {
  paper: {
    bg: '#F6F4EF',
    panel: '#FFFEFB',
    ink: '#1D2321',
    muted: '#5F6763',
    grid: '#E3DED2',
    axis: '#8A918D',
    amber: '#C9800F',
    blue: '#2F6FD0',
    green: '#2F8F4E',
    red: '#D0452F',
  },
  studio: {
    bg: '#0E1116',
    panel: '#151A21',
    ink: '#ECE9E2',
    muted: '#9AA3A0',
    grid: '#1E252E',
    axis: '#5C6670',
    amber: '#FFB84D',
    blue: '#6EA8FF',
    green: '#5FC27E',
    red: '#FF7A5C',
  },
};

export interface FrameGeometry {
  width: number;
  height: number;
  /** Where the graph sits and how large it may be. */
  graph: { x: number; y: number; width: number; height: number };
  /** The side (landscape) or top (portrait) panel for formulas and readouts. */
  panel: { x: number; y: number; width: number };
  titleY: number;
  captionY: number;
  captionWidth: number;
}

export const FRAMES: Record<TemplateFrame, FrameGeometry> = {
  '16:9': {
    width: 14.222,
    height: 8,
    graph: { x: 2.35, y: -0.2, width: 8.6, height: 5.5 },
    panel: { x: -4.55, y: 0.35, width: 4.3 },
    titleY: 3.42,
    captionY: -3.38,
    captionWidth: 12.6,
  },
  '9:16': {
    width: 9,
    height: 16,
    graph: { x: 0, y: -0.2, width: 8.1, height: 7.4 },
    panel: { x: 0, y: 4.65, width: 8.1 },
    titleY: 6.25,
    captionY: -5.2,
    captionWidth: 8.1,
  },
};

/** Round a duration to the 0.1 s grid: whole frames at 30 fps (and 15 fps x2). */
export function seconds(value: number): number {
  return Math.max(0.1, Math.round(value * 10) / 10);
}

/** 1, 2, 2.5 or 5 times a power of ten: the tick step for a span. */
export function niceStep(span: number, targetTicks = 6): number {
  const raw = Math.max(span, 1e-9) / targetTicks;
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    if (raw <= factor * power) return factor * power;
  }
  return 10 * power;
}

export interface AxisRange {
  min: number;
  max: number;
  step: number;
}

/** Expand [min, max] outward to whole ticks. */
export function niceRange(
  min: number,
  max: number,
  targetTicks = 6
): AxisRange {
  let lo = min;
  let hi = max;
  if (!(hi > lo)) {
    lo -= 1;
    hi += 1;
  }
  const step = niceStep(hi - lo, targetTicks);
  return {
    min: Math.floor(lo / step + 1e-9) * step,
    max: Math.ceil(hi / step - 1e-9) * step,
    step,
  };
}

/**
 * The visible y window for f on [a, b]: robust to poles (1/x, tan x) by
 * trimming the extreme 4% of samples, and always showing y = 0 when the curve
 * comes near it.
 */
export function yWindow(
  f: (x: number) => number,
  a: number,
  b: number,
  options: { includeZero?: boolean; pad?: number } = {}
): { min: number; max: number } {
  const values: number[] = [];
  for (let i = 0; i <= 400; i += 1) {
    const y = f(a + ((b - a) * i) / 400);
    if (Number.isFinite(y)) values.push(y);
  }
  if (!values.length) return { min: -1, max: 1 };
  values.sort((p, q) => p - q);
  const trim = values.length > 50 ? Math.floor(values.length * 0.04) : 0;
  let lo = values[trim];
  let hi = values[values.length - 1 - trim];
  const fullLo = values[0];
  const fullHi = values[values.length - 1];
  // Only trim when the tail is a pole, not when it is the real extent.
  if (fullHi - hi < (hi - lo) * 0.5) hi = fullHi;
  if (lo - fullLo < (hi - lo) * 0.5) lo = fullLo;
  if (options.includeZero !== false && lo > 0 && lo < (hi - lo) * 0.8) lo = 0;
  if (options.includeZero !== false && hi < 0 && -hi < (hi - lo) * 0.8) hi = 0;
  const pad = (hi - lo || 1) * (options.pad ?? 0.12);
  return { min: lo - pad, max: hi + pad };
}

/**
 * Pieces of [a, b] where f is finite and inside the y window, so a pole or a
 * domain edge (ln x at 0) splits the curve instead of drawing a wall.
 */
export function plotSegments(
  f: (x: number) => number,
  a: number,
  b: number,
  window: { min: number; max: number },
  samples = 600
): Array<[number, number]> {
  const span = window.max - window.min;
  const inside = (y: number) =>
    Number.isFinite(y) &&
    y >= window.min - span * 0.01 &&
    y <= window.max + span * 0.01;
  const segments: Array<[number, number]> = [];
  let start: number | undefined;
  let last = a;
  for (let i = 0; i <= samples; i += 1) {
    const x = a + ((b - a) * i) / samples;
    const ok = inside(f(x));
    if (ok && start === undefined) start = x;
    if (!ok && start !== undefined) {
      if (last - start > (b - a) / samples) segments.push([start, last]);
      start = undefined;
    }
    if (ok) last = x;
  }
  if (start !== undefined && last - start > (b - a) / samples) {
    segments.push([start, last]);
  }
  return segments;
}

/** Decimal places that print a tick step without noise. */
export function stepDecimals(step: number): number {
  for (let places = 0; places <= 4; places += 1) {
    if (
      Math.abs(Math.round(step * 10 ** places) - step * 10 ** places) < 1e-6
    ) {
      return places;
    }
  }
  return 4;
}

export interface AxesSpec {
  name: string;
  x: AxisRange;
  y: AxisRange;
  /** Defaults to the frame's graph box. */
  box?: { x: number; y: number; width: number; height: number };
  xLabel?: string;
  yLabel?: string;
  grid?: boolean;
  /** Equal units on both axes (circles stay round). */
  equal?: boolean;
  /** Custom x tick labels (π/2, π, …) instead of decimals. */
  xTicks?: Array<{ value: number; latex: string }>;
  /** Hide the tick numbers on an axis. */
  numbers?: { x?: boolean; y?: boolean };
}

/** Ticks to label: skip the origin, keep at most ~7 per axis. */
function tickLabels(range: AxisRange): number[] {
  const values: number[] = [];
  const count = Math.round((range.max - range.min) / range.step);
  const every = Math.max(1, Math.ceil(count / 7));
  for (let i = 0; i <= count; i += every) {
    const value = Number((range.min + i * range.step).toFixed(6));
    if (Math.abs(value) > 1e-9) values.push(value);
  }
  return values;
}

/**
 * Portrait captions break into two balanced lines instead of shrinking:
 * at a space or after CJK punctuation nearest the middle.
 */
export function wrapCaption(value: string): string {
  const cjk = /[\u3400-\u9fff]/.test(value);
  if (value.length <= (cjk ? 18 : 34)) return value;
  const middle = value.length / 2;
  const nearest = (test: (i: number) => boolean) => {
    let best = -1;
    for (let i = 1; i < value.length - 1; i += 1) {
      if (
        test(i) &&
        (best < 0 || Math.abs(i - middle) < Math.abs(best - middle))
      )
        best = i;
    }
    return best >= 0 && Math.abs(best - middle) <= value.length * 0.3
      ? best
      : -1;
  };
  let best = nearest(
    (i) => '，。：；、,;:.'.includes(value[i - 1]) && value[i] !== '\n'
  );
  if (best < 0) best = nearest((i) => value[i] === ' ');
  if (best < 0) best = Math.round(middle);
  return `${value.slice(0, best).trimEnd()}\n${value.slice(best).trimStart()}`;
}

export class ManimScript {
  readonly palette: ThemePalette;
  readonly geometry: FrameGeometry;
  private readonly body: string[] = [];
  private clock = 0;
  private captionCount = 0;
  private currentCaption: string | undefined;
  private uid = 0;

  constructor(readonly context: TemplateContext) {
    this.palette = THEMES[context.theme];
    this.geometry = FRAMES[context.frame];
  }

  get landscape(): boolean {
    return this.context.frame === '16:9';
  }

  /** The running length of the film so far, in seconds. */
  get elapsed(): number {
    return Number(this.clock.toFixed(3));
  }

  /** A fresh Python variable name. */
  id(prefix: string): string {
    this.uid += 1;
    return `${prefix}_${this.uid}`;
  }

  private readonly functions: string[] = [];

  /**
   * A module-level numeric function `def name(var): return <numpy>`; the body
   * must come from toNumpy().
   */
  define(name: string, variable: string, numpy: string): string {
    this.functions.push(
      `def ${name}(${variable}):`,
      `    return ${numpy}`,
      '',
      ''
    );
    return name;
  }

  /**
   * Place `variable` on row `row` of the panel: left-aligned rows in the
   * landscape side column, centred rows above the graph in portrait.
   */
  placeRow(
    variable: string,
    row: number,
    options: { maxWidth?: number } = {}
  ): this {
    const g = this.geometry;
    const width = options.maxWidth ?? g.panel.width;
    this.body.push(
      `if ${variable}.width > ${num(width)}: ${variable}.scale_to_fit_width(${num(width)})`
    );
    if (this.landscape) {
      const y = Number((2.15 - row * 0.95).toFixed(3));
      this.body.push(
        `${variable}.move_to([${num(g.panel.x)}, ${num(y)}, 0])`,
        `${variable}.align_to(np.array([${num(Number((g.panel.x - g.panel.width / 2).toFixed(3)))}, 0, 0]), LEFT)`
      );
    } else {
      const y = Number((g.panel.y + 0.75 - row * 0.85).toFixed(3));
      this.body.push(`${variable}.move_to([0, ${num(y)}, 0])`);
    }
    return this;
  }

  /**
   * A live readout on a panel row: a static TeX label and a DecimalNumber
   * recomputed every frame from `valuePython` (which may read trackers).
   * Declares `<name>_label` and `<name>`; both still need to be shown.
   */
  readout(
    name: string,
    labelTex: string,
    valuePython: string,
    row: number,
    options: { color?: string; decimals?: number } = {}
  ): { label: string; value: string } {
    const color = options.color ?? 'INK';
    const size = this.landscape ? 40 : 42;
    this.body.push(`${name}_label = ${this.tex(labelTex, { size, color })}`);
    this.placeRow(`${name}_label`, row, {
      maxWidth: this.geometry.panel.width * 0.62,
    });
    this.body.push(
      `${name} = always_redraw(lambda: DecimalNumber(${valuePython}, num_decimal_places=${options.decimals ?? 3}, font_size=${size}, color=${color}).next_to(${name}_label, RIGHT, buff=0.18))`
    );
    return { label: `${name}_label`, value: name };
  }

  /** Static TeX on a panel row. Declares `name`. */
  panelTex(
    name: string,
    latex: string,
    row: number,
    options: { color?: string; size?: number } = {}
  ): string {
    this.body.push(
      `${name} = ${this.tex(latex, { size: options.size ?? (this.landscape ? 42 : 44), color: options.color })}`
    );
    this.placeRow(name, row);
    return name;
  }

  /**
   * A words + math row (MathTex cannot set Chinese): Text label, then TeX.
   * Declares `name`.
   */
  panelMixed(
    name: string,
    words: string,
    latex: string,
    row: number,
    options: { color?: string; size?: number } = {}
  ): string {
    const color = options.color ?? 'INK';
    this.body.push(
      `${name} = VGroup(${this.text(words, { size: this.landscape ? 26 : 28, color })}, ${this.tex(latex, { size: options.size ?? (this.landscape ? 36 : 38), color })}).arrange(RIGHT, buff=0.2)`
    );
    this.placeRow(name, row);
    return name;
  }

  /** Static text on a panel row. Declares `name`. */
  panelText(
    name: string,
    value: string,
    row: number,
    options: { color?: string; size?: number } = {}
  ): string {
    this.body.push(
      `${name} = ${this.text(value, { size: options.size ?? (this.landscape ? 28 : 30), color: options.color ?? 'MUTED' })}`
    );
    this.placeRow(name, row);
    return name;
  }

  /** Raw module-level lines (helpers before the scene class). */
  module(...code: string[]): this {
    this.functions.push(...code, '', '');
    return this;
  }

  /** Raw construct() lines. Callers own the escaping of anything inserted. */
  line(...code: string[]): this {
    this.body.push(...code);
    return this;
  }

  play(animations: string | string[], runTime: number, rate = 'smooth'): this {
    const list = Array.isArray(animations) ? animations : [animations];
    const time = seconds(runTime);
    this.body.push(
      `self.play(${list.join(', ')}, run_time=${num(time)}, rate_func=${rate})`
    );
    this.clock += time;
    return this;
  }

  wait(duration: number): this {
    const time = seconds(duration);
    this.body.push(`self.wait(${num(time)})`);
    this.clock += time;
    return this;
  }

  /** Text in the CurvG face. Returns a Python expression. */
  text(
    value: string,
    options: {
      size?: number;
      color?: string;
      serif?: boolean;
      bold?: boolean;
    } = {}
  ): string {
    const font = options.serif ? 'TITLE_FONT' : 'FONT';
    const weight = options.bold ? ', weight=BOLD' : '';
    return `Text(${py(value)}, font=${font}, font_size=${num(options.size ?? 30)}, color=${options.color ?? 'INK'}${weight})`;
  }

  /** MathTex in the theme ink. Returns a Python expression. */
  tex(
    latex: string | string[],
    options: { size?: number; color?: string } = {}
  ): string {
    const parts = (Array.isArray(latex) ? latex : [latex]).map(py).join(', ');
    return `MathTex(${parts}, font_size=${num(options.size ?? 44)}, color=${options.color ?? 'INK'})`;
  }

  /**
   * Swap the caption at the bottom of the frame. Captions carry the narration
   * (videos are silent); one line, scaled down to the caption width.
   */
  caption(value: string, runTime = 0.6): this {
    const name = `caption_${(this.captionCount += 1)}`;
    const g = this.geometry;
    const size = this.landscape ? 30 : 34;
    this.body.push(
      `${name}_text = ${this.text(this.landscape ? value : wrapCaption(value), { size })}`,
      `if ${name}_text.width > ${num(g.captionWidth)}: ${name}_text.scale_to_fit_width(${num(g.captionWidth)})`,
      `${name}_text.move_to([0, ${num(g.captionY)}, 0])`,
      // A paper backing keeps captions legible over grid lines and curves.
      `${name} = VGroup(BackgroundRectangle(${name}_text, color=BG, fill_opacity=0.88, buff=0.14), ${name}_text).set_z_index(20)`
    );
    const previous = this.currentCaption;
    this.currentCaption = name;
    return this.play(
      previous
        ? [`FadeOut(${previous})`, `FadeIn(${name})`]
        : [`FadeIn(${name})`],
      runTime
    );
  }

  clearCaption(runTime = 0.5): this {
    if (!this.currentCaption) return this;
    const previous = this.currentCaption;
    this.currentCaption = undefined;
    return this.play(`FadeOut(${previous})`, runTime);
  }

  /**
   * Opening card: title and one-line promise, then the title moves to the
   * header where it stays. Returns the header variable.
   */
  intro(title: string, subtitle: string): string {
    const g = this.geometry;
    const header = 'header';
    const sub = 'header_sub';
    this.body.push(
      `${header} = ${this.text(title, { size: this.landscape ? 54 : 58, serif: true, bold: true })}`,
      `if ${header}.width > ${num(g.width - 1.4)}: ${header}.scale_to_fit_width(${num(g.width - 1.4)})`,
      `${header}.move_to([0, 0.45, 0])`,
      `${sub} = ${this.text(subtitle, { size: this.landscape ? 30 : 32, color: 'MUTED' })}`,
      `if ${sub}.width > ${num(g.width - 1.4)}: ${sub}.scale_to_fit_width(${num(g.width - 1.4)})`,
      `${sub}.next_to(${header}, DOWN, buff=0.35)`,
      `mark = Dot(radius=0.07, color=AMBER).next_to(${header}, LEFT, buff=0.3)`,
      `${header}.set_z_index(20)`,
      'mark.set_z_index(20)'
    );
    this.play(
      [`FadeIn(${header}, shift=UP * 0.2)`, `FadeIn(mark, scale=0.5)`],
      1
    );
    this.play(`FadeIn(${sub})`, 0.6);
    this.wait(1.2);
    const small = this.landscape ? 34 : 40;
    this.body.push(
      `${header}_target = ${this.text(title, { size: small, serif: true, bold: true })}`,
      `if ${header}_target.width > ${num(this.landscape ? 9.5 : g.width - 1.2)}: ${header}_target.scale_to_fit_width(${num(this.landscape ? 9.5 : g.width - 1.2)})`,
      this.landscape
        ? `${header}_target.to_corner(UL, buff=0.45)`
        : `${header}_target.move_to([0, ${num(g.titleY)}, 0])`,
      `mark_target = Dot(radius=0.06, color=AMBER).next_to(${header}_target, LEFT, buff=0.22)`
    );
    this.play(
      [
        `FadeOut(${sub})`,
        `Transform(${header}, ${header}_target)`,
        `Transform(mark, mark_target)`,
      ],
      0.9
    );
    return header;
  }

  /**
   * Closing card: everything fades, the takeaway formula and line stay, and
   * the CurvG mark signs the film.
   */
  outro(takeawayTex: string | undefined, takeaway: string): this {
    this.clearCaption(0.4);
    this.body.push(
      'outro_keep = Group(*[m for m in self.mobjects if not isinstance(m, ValueTracker)])',
      `outro_line = ${this.text(takeaway, { size: this.landscape ? 36 : 38, serif: true })}`,
      `if outro_line.width > ${num(this.geometry.width - 1.6)}: outro_line.scale_to_fit_width(${num(this.geometry.width - 1.6)})`,
      takeawayTex
        ? `outro_tex = ${this.tex(takeawayTex, { size: this.landscape ? 60 : 56, color: 'AMBER' })}`
        : 'outro_tex = VGroup()',
      `if outro_tex.width > ${num(this.geometry.width - 1.6)}: outro_tex.scale_to_fit_width(${num(this.geometry.width - 1.6)})`,
      'outro_card = VGroup(outro_tex, outro_line).arrange(DOWN, buff=0.5).move_to([0, 0.3, 0])',
      `outro_brand = ${this.text('CurvG · curvg.com', { size: 24, color: 'MUTED' })}`,
      `outro_brand.move_to([0, ${num(this.landscape ? -3.1 : -4.6)}, 0])`
    );
    this.play('FadeOut(outro_keep)', 0.8);
    this.play(['Write(outro_tex)', 'FadeIn(outro_line, shift=UP * 0.15)'], 1.4);
    this.play('FadeIn(outro_brand)', 0.5);
    return this.wait(2.2);
  }

  /**
   * Axes (and a faint grid) in the graph box. Declares `<name>` and
   * `<name>_grid`; returns the Python lines' variable names.
   */
  axes(spec: AxesSpec): { axes: string; grid: string; labels: string } {
    const box = spec.box ?? this.geometry.graph;
    let width = box.width;
    let height = box.height;
    if (spec.equal) {
      const unit = Math.min(
        width / (spec.x.max - spec.x.min),
        height / (spec.y.max - spec.y.min)
      );
      width = unit * (spec.x.max - spec.x.min);
      height = unit * (spec.y.max - spec.y.min);
    }
    const name = spec.name;
    const xDecimals = stepDecimals(spec.x.step);
    const yDecimals = stepDecimals(spec.y.step);
    const fontSize = this.landscape ? 22 : 24;
    const axisConfig = (decimals: number, labels: number[]) =>
      `{"color": AXIS, "stroke_width": 2, "include_numbers": True, "numbers_to_include": [${labels.map(num).join(', ')}], "font_size": ${fontSize}, "decimal_number_config": {"num_decimal_places": ${decimals}, "color": MUTED}}`;
    this.body.push(
      `${name} = Axes(x_range=[${num(spec.x.min)}, ${num(spec.x.max)}, ${num(spec.x.step)}], y_range=[${num(spec.y.min)}, ${num(spec.y.max)}, ${num(spec.y.step)}], x_length=${num(Number(width.toFixed(3)))}, y_length=${num(Number(height.toFixed(3)))}, tips=False, x_axis_config=${axisConfig(xDecimals, spec.xTicks || spec.numbers?.x === false ? [] : tickLabels(spec.x))}, y_axis_config=${axisConfig(yDecimals, spec.numbers?.y === false ? [] : tickLabels(spec.y))})`,
      `${name}.move_to([${num(box.x)}, ${num(box.y)}, 0])`
    );
    const grid = `${name}_grid`;
    if (spec.grid !== false) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (let v = spec.x.min; v <= spec.x.max + 1e-9; v += spec.x.step)
        xs.push(Number(v.toFixed(6)));
      for (let v = spec.y.min; v <= spec.y.max + 1e-9; v += spec.y.step)
        ys.push(Number(v.toFixed(6)));
      this.body.push(
        `${grid} = VGroup(*[Line(${name}.c2p(gx, ${num(spec.y.min)}), ${name}.c2p(gx, ${num(spec.y.max)}), stroke_width=1, color=GRID) for gx in [${xs.map(num).join(', ')}]], *[Line(${name}.c2p(${num(spec.x.min)}, gy), ${name}.c2p(${num(spec.x.max)}, gy), stroke_width=1, color=GRID) for gy in [${ys.map(num).join(', ')}]])`
      );
    } else {
      this.body.push(`${grid} = VGroup()`);
    }
    const labels = `${name}_labels`;
    const xl = spec.xLabel ?? 'x';
    const yl = spec.yLabel ?? 'y';
    const ticks = (spec.xTicks ?? []).map(
      (tick) =>
        `${this.tex(tick.latex, { size: this.landscape ? 26 : 28, color: 'MUTED' })}.next_to(${name}.c2p(${num(tick.value)}, ${num(Math.max(spec.y.min, Math.min(0, spec.y.max)))}), DOWN, buff=0.18)`
    );
    this.body.push(
      `${labels} = VGroup(${[
        `${this.tex(xl, { size: 32, color: 'MUTED' })}.next_to(${name}.x_axis.get_end(), RIGHT, buff=0.15)`,
        `${this.tex(yl, { size: 32, color: 'MUTED' })}.next_to(${name}.y_axis.get_end(), UP, buff=0.12)`,
        ...ticks,
      ].join(', ')})`
    );
    return { axes: name, grid, labels };
  }

  /**
   * f plotted on each finite segment as one VGroup named `name`.
   * `numpy` is the body of `lambda x: ...`.
   */
  plot(
    name: string,
    axes: string,
    numpy: string,
    segments: Array<[number, number]>,
    color = 'AMBER',
    strokeWidth = 5
  ): string {
    const pieces = segments.map(
      ([a, b]) =>
        `${axes}.plot(lambda x: ${numpy}, x_range=[${num(Number(a.toFixed(6)))}, ${num(Number(b.toFixed(6)))}, ${num(Number(((b - a) / 240).toPrecision(6)))}], color=${color}, stroke_width=${num(strokeWidth)})`
    );
    this.body.push(`${name} = VGroup(${pieces.join(', ')})`);
    return name;
  }

  toPython(): string {
    const p = this.palette;
    const g = this.geometry;
    const portrait = this.context.frame === '9:16';
    return [
      'from manim import *',
      'import numpy as np',
      '',
      `config.pixel_width = ${portrait ? 1080 : 1920}`,
      `config.pixel_height = ${portrait ? 1920 : 1080}`,
      `config.frame_width = ${num(g.width)}`,
      `config.frame_height = ${num(g.height)}`,
      'config.frame_rate = 30',
      '',
      `BG = ${py(p.bg)}`,
      `PANEL = ${py(p.panel)}`,
      `INK = ${py(p.ink)}`,
      `MUTED = ${py(p.muted)}`,
      `GRID = ${py(p.grid)}`,
      `AXIS = ${py(p.axis)}`,
      `AMBER = ${py(p.amber)}`,
      `BLUE = ${py(p.blue)}`,
      `GREEN = ${py(p.green)}`,
      `RED = ${py(p.red)}`,
      'FONT = "Noto Sans CJK SC"',
      'TITLE_FONT = "Noto Serif CJK SC"',
      '',
      '',
      'def line_through(axes, px, py, slope, x0, x1, y0, y1, color, width=4):',
      '    # The line through (px, py) with this slope, clipped to the window.',
      '    xa, xb = x0, x1',
      '    if abs(slope) > 1e-9:',
      '        lo = px + (y0 - py) / slope',
      '        hi = px + (y1 - py) / slope',
      '        xa = max(x0, min(lo, hi))',
      '        xb = min(x1, max(lo, hi))',
      '    return Line(axes.c2p(xa, py + slope * (xa - px)), axes.c2p(xb, py + slope * (xb - px)), color=color, stroke_width=width)',
      '',
      '',
      ...this.functions,
      'class CurvGScene(Scene):',
      '    def construct(self):',
      '        self.camera.background_color = BG',
      ...this.body.map((line) => `        ${line}`),
      '',
    ].join('\n');
  }
}
