import {
  compileExpr,
  ExprError,
  isBuiltinConstant,
  isBuiltinFunction,
  type CompiledExpr,
  type ExprScope,
} from './expr';
import type { BoardColor, BoardObject, BoardSpec } from './spec';

/**
 * Board spec → frame geometry, in math coordinates.
 *
 * `compileBoard` parses every expression once and proves every name resolves
 * (params, earlier scalars, non-recursive user functions, builtins), so a
 * malformed spec fails at load time with a path instead of blanking a
 * slider halfway through a lesson. `evaluateBoard` is pure: the same params
 * give the same frame, which is what lets a lesson be replayed or recorded.
 */

export type Vec = [number, number];

export type ShapeStyle = {
  color: BoardColor;
  width: number;
  dashed: boolean;
  /** Unset lets the renderer pick: solid strokes, light fills. */
  opacity?: number;
  label?: string;
  labelAt?: Vec;
};

export type BoardShape =
  | {
      kind: 'path';
      lines: Vec[][];
      closed: boolean;
      fill: boolean;
      arrow: boolean;
      style: ShapeStyle;
    }
  | {
      kind: 'point';
      at: Vec;
      size: number;
      hollow: boolean;
      /** Params a drag writes to; set only on draggable points. */
      drag?: PointDrag;
      style: ShapeStyle;
    }
  | {
      kind: 'text';
      at: Vec;
      text: string;
      anchor: 'start' | 'middle' | 'end';
      style: ShapeStyle;
    };

export type PointDrag = {
  x?: string;
  y?: string;
  angle?: string;
  center?: [number, number];
};

export type BoardReadout =
  | {
      kind: 'value';
      label: string;
      value: number;
      text: string;
      highlight: boolean;
    }
  | { kind: 'status'; label: string; ok: boolean; text: string };

/** The math rectangle on screen. Defaults to the spec's view. */
export type BoardViewport = { x: [number, number]; y: [number, number] };

export type BoardFrame = {
  shapes: BoardShape[];
  readouts: BoardReadout[];
  values: Record<string, number>;
};

type CompiledPoint = [CompiledExpr, CompiledExpr];

type CompiledObject = {
  source: BoardObject;
  exprs: Record<string, CompiledExpr>;
  points: Record<string, CompiledPoint>;
  pointLists: Record<string, CompiledPoint[]>;
};

export type CompiledBoard = {
  spec: BoardSpec;
  scalars: { id: string; expr: CompiledExpr }[];
  functions: { id: string; arg: string; expr: CompiledExpr }[];
  objects: CompiledObject[];
  readouts: (
    | {
        kind: 'value';
        label: string;
        expr: CompiledExpr;
        digits: number;
        highlight: boolean;
      }
    | {
        kind: 'status';
        label: string;
        expr: CompiledExpr;
        ok: string;
        bad: string;
      }
  )[];
};

export class BoardSpecError extends Error {
  constructor(
    readonly path: string,
    message: string
  ) {
    super(`${path}: ${message}`);
    this.name = 'BoardSpecError';
  }
}

const INTERPOLATION = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
const DEFAULT_SAMPLES = 240;

function compileAt(path: string, value: string | number): CompiledExpr {
  try {
    return compileExpr(value);
  } catch (error) {
    if (error instanceof ExprError)
      throw new BoardSpecError(path, error.message);
    throw error;
  }
}

export function compileBoard(spec: BoardSpec): CompiledBoard {
  const names = new Set<string>();
  const claim = (path: string, id: string) => {
    if (names.has(id)) throw new BoardSpecError(path, `Duplicate name "${id}"`);
    if (isBuiltinFunction(id))
      throw new BoardSpecError(path, `"${id}" shadows a builtin function`);
    names.add(id);
  };

  const paramIds = new Set<string>();
  spec.params.forEach((param, i) => {
    claim(`params[${i}]`, param.id);
    paramIds.add(param.id);
  });

  // Functions may use params, their own argument and earlier functions.
  // Scalars may use params, earlier scalars and any function whose
  // transitive variable needs are already defined.
  const functions: CompiledBoard['functions'] = [];
  const functionNeeds = new Map<string, Set<string>>();
  spec.functions.forEach((fn, i) => {
    const path = `functions[${i}]`;
    claim(path, fn.id);
    const expr = compileAt(path, fn.expr);
    const needs = new Set<string>();
    for (const name of expr.variables) {
      if (name === fn.arg || isBuiltinConstant(name)) continue;
      needs.add(name);
    }
    for (const call of expr.calls) {
      const inner = functionNeeds.get(call);
      if (!inner)
        throw new BoardSpecError(path, `Calls "${call}" before it is defined`);
      inner.forEach((name) => needs.add(name));
    }
    functionNeeds.set(fn.id, needs);
    functions.push({ id: fn.id, arg: fn.arg, expr });
  });

  const known = new Set(paramIds);
  const checkNames = (
    path: string,
    expr: CompiledExpr,
    locals: string[] = []
  ) => {
    const visible = new Set([...known, ...locals]);
    for (const name of expr.variables) {
      if (!visible.has(name) && !isBuiltinConstant(name)) {
        throw new BoardSpecError(path, `Unknown name "${name}"`);
      }
    }
    for (const call of expr.calls) {
      const needs = functionNeeds.get(call);
      if (!needs) throw new BoardSpecError(path, `Unknown function "${call}"`);
      for (const name of needs) {
        if (!visible.has(name)) {
          throw new BoardSpecError(
            path,
            `Function "${call}" needs "${name}", which is not defined yet`
          );
        }
      }
    }
  };

  const scalars: CompiledBoard['scalars'] = [];
  spec.scalars.forEach((scalar, i) => {
    const path = `scalars[${i}]`;
    claim(path, scalar.id);
    const expr = compileAt(path, scalar.expr);
    checkNames(path, expr);
    known.add(scalar.id);
    scalars.push({ id: scalar.id, expr });
  });

  // Function bodies are only checked once every scalar exists, so a function
  // may lean on a scalar defined after it (it is never called before then
  // by objects and readouts).
  functions.forEach((fn, i) =>
    checkNames(`functions[${i}]`, fn.expr, [fn.arg])
  );

  const checkLabel = (path: string, label: string | undefined) => {
    if (!label) return;
    for (const match of label.matchAll(INTERPOLATION)) {
      if (!known.has(match[1])) {
        throw new BoardSpecError(
          path,
          `Label references unknown "${match[1]}"`
        );
      }
    }
  };

  const objects = spec.objects.map((object, i): CompiledObject => {
    const path = `objects[${i}]`;
    const compiled: CompiledObject = {
      source: object,
      exprs: {},
      points: {},
      pointLists: {},
    };
    const locals = object.type === 'parametric' ? [object.variable] : [];
    const addExpr = (
      key: string,
      value: string | number | undefined,
      local = false
    ) => {
      if (value === undefined) return;
      const expr = compileAt(`${path}.${key}`, value);
      checkNames(`${path}.${key}`, expr, local ? locals : []);
      compiled.exprs[key] = expr;
    };
    const addPoint = (
      key: string,
      value: [string | number, string | number] | undefined
    ) => {
      if (!value) return;
      const pair: CompiledPoint = [
        compileAt(`${path}.${key}[0]`, value[0]),
        compileAt(`${path}.${key}[1]`, value[1]),
      ];
      pair.forEach((expr, axis) => checkNames(`${path}.${key}[${axis}]`, expr));
      compiled.points[key] = pair;
    };
    const requireFunction = (id: string) => {
      if (!functionNeeds.has(id))
        throw new BoardSpecError(`${path}.fn`, `Unknown function "${id}"`);
    };

    addExpr('visible', object.visible);
    checkLabel(`${path}.label`, object.label);

    switch (object.type) {
      case 'function':
        requireFunction(object.fn);
        addPoint('domain', object.domain);
        break;
      case 'parametric':
        addExpr('x', object.x, true);
        addExpr('y', object.y, true);
        addPoint('range', object.range);
        break;
      case 'point':
        addPoint('at', object.at);
        for (const id of [object.drag?.x, object.drag?.y, object.drag?.angle]) {
          if (id !== undefined && !paramIds.has(id)) {
            throw new BoardSpecError(
              `${path}.drag`,
              `Drag target "${id}" is not a param`
            );
          }
        }
        break;
      case 'segment':
        addPoint('from', object.from);
        addPoint('to', object.to);
        break;
      case 'line':
        addPoint('through', object.through);
        addPoint('to', object.to);
        addExpr('slope', object.slope);
        if (!object.to && object.slope === undefined) {
          throw new BoardSpecError(path, 'A line needs `to` or `slope`');
        }
        break;
      case 'circle':
        addPoint('center', object.center);
        addExpr('r', object.r);
        break;
      case 'arc':
        addPoint('center', object.center);
        addExpr('r', object.r);
        addExpr('start', object.start);
        addExpr('end', object.end);
        break;
      case 'polygon':
        compiled.pointLists.points = object.points.map((point, j) => {
          const pair: CompiledPoint = [
            compileAt(`${path}.points[${j}][0]`, point[0]),
            compileAt(`${path}.points[${j}][1]`, point[1]),
          ];
          pair.forEach((expr, axis) =>
            checkNames(`${path}.points[${j}][${axis}]`, expr)
          );
          return pair;
        });
        break;
      case 'area':
        requireFunction(object.fn);
        addExpr('from', object.from);
        addExpr('to', object.to);
        break;
      case 'riemann':
        requireFunction(object.fn);
        addExpr('from', object.from);
        addExpr('to', object.to);
        addExpr('n', object.n);
        break;
      case 'text':
        addPoint('at', object.at);
        checkLabel(`${path}.text`, object.text);
        break;
    }
    return compiled;
  });

  const readouts = spec.readouts.map(
    (readout, i): CompiledBoard['readouts'][number] => {
      const expr = compileAt(`readouts[${i}]`, readout.expr);
      checkNames(`readouts[${i}]`, expr);
      return 'kind' in readout
        ? {
            kind: 'status',
            label: readout.label,
            expr,
            ok: readout.ok,
            bad: readout.bad,
          }
        : {
            kind: 'value',
            label: readout.label,
            expr,
            digits: readout.digits,
            highlight: readout.highlight ?? false,
          };
    }
  );

  return { spec, scalars, functions, objects, readouts };
}

export function defaultParamValues(spec: BoardSpec): Record<string, number> {
  return Object.fromEntries(
    spec.params.map((param) => [param.id, param.value])
  );
}

export function formatBoardNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '—';
  const fixed = value.toFixed(digits);
  return /^-0(?:\.0+)?$/.test(fixed) ? fixed.slice(1) : fixed;
}

function interpolate(text: string, values: Record<string, number>): string {
  // Labels read as prose, so 2.00 prints as 2 and 1.50 as 1.5.
  return text.replace(INTERPOLATION, (_, name: string) =>
    trimZeros(formatBoardNumber(values[name] ?? NaN, 2))
  );
}

const finite = (value: number) => Number.isFinite(value);

export function evaluateBoard(
  board: CompiledBoard,
  paramValues: Record<string, number>,
  viewport?: BoardViewport
): BoardFrame {
  const { spec } = board;
  const vars: Record<string, number> = {};
  for (const param of spec.params) {
    const raw = paramValues[param.id];
    vars[param.id] = Math.min(
      Math.max(Number.isFinite(raw) ? raw : param.value, param.min),
      param.max
    );
  }

  const fns: Record<string, (...args: number[]) => number> = {};
  const scope: ExprScope = { vars, fns };
  for (const fn of board.functions) {
    fns[fn.id] = (x = NaN) =>
      fn.expr.evaluate({ vars: { ...vars, [fn.arg]: x }, fns });
  }
  for (const scalar of board.scalars) {
    vars[scalar.id] = safe(() => scalar.expr.evaluate(scope));
  }

  // Curves are sampled over what is on screen, so panning never runs off
  // the end of a graph.
  const [xMin, xMax] = viewport?.x ?? spec.view.x;
  const [yMin, yMax] = viewport?.y ?? spec.view.y;
  const spanX = xMax - xMin;
  const spanY = yMax - yMin;
  const xLo = xMin - spanX * 2;
  const xHi = xMax + spanX * 2;
  const yLo = yMin - spanY * 2;
  const yHi = yMax + spanY * 2;
  const diag = Math.hypot(xMax - xMin, spanY) * 3;

  const ev = (expr: CompiledExpr | undefined, fallback = NaN) =>
    expr ? safe(() => expr.evaluate(scope)) : fallback;
  const pt = (pair: CompiledPoint | undefined): Vec | undefined => {
    if (!pair) return undefined;
    const p: Vec = [ev(pair[0]), ev(pair[1])];
    return finite(p[0]) && finite(p[1]) ? p : undefined;
  };

  const sampleFunction = (
    id: string,
    a: number,
    b: number,
    n: number
  ): Vec[][] => {
    const fn = fns[id];
    const lines: Vec[][] = [];
    let current: Vec[] = [];
    let previous: number | undefined;
    for (let i = 0; i <= n; i += 1) {
      const x = a + ((b - a) * i) / n;
      const y = safe(() => fn(x));
      const jump =
        previous !== undefined &&
        ((previous > yHi && y < yLo) || (previous < yLo && y > yHi));
      if (!finite(y) || jump) {
        if (current.length > 1) lines.push(current);
        current = [];
        previous = finite(y) ? y : undefined;
        if (!finite(y)) continue;
      }
      current.push([x, Math.min(Math.max(y, yLo), yHi)]);
      previous = y;
    }
    if (current.length > 1) lines.push(current);
    return lines;
  };

  const shapes: BoardShape[] = [];
  for (const object of board.objects) {
    const o = object.source;
    if (object.exprs.visible && !(ev(object.exprs.visible) !== 0)) continue;
    const style: ShapeStyle = {
      color:
        o.color ??
        (o.type === 'point' || o.type === 'text' ? 'ink' : 'primary'),
      width: o.width ?? 2.5,
      dashed: o.dashed ?? false,
      opacity: o.opacity,
      label: o.label ? interpolate(o.label, vars) : undefined,
    };
    const path = (
      lines: Vec[][],
      opts: {
        closed?: boolean;
        fill?: boolean;
        arrow?: boolean;
        labelAt?: Vec;
      } = {}
    ) => {
      const clean = lines.filter((line) => line.length > 1);
      if (clean.length === 0) return;
      shapes.push({
        kind: 'path',
        lines: clean,
        closed: opts.closed ?? false,
        fill: opts.fill ?? false,
        arrow: opts.arrow ?? false,
        style: { ...style, labelAt: opts.labelAt ?? lastPoint(clean) },
      });
    };

    switch (o.type) {
      case 'function': {
        const domain = object.points.domain;
        const a = domain ? ev(domain[0]) : xMin;
        const b = domain ? ev(domain[1]) : xMax;
        if (!finite(a) || !finite(b) || a === b) break;
        path(sampleFunction(o.fn, a, b, o.samples ?? DEFAULT_SAMPLES));
        break;
      }
      case 'parametric': {
        const range = object.points.range;
        const a = ev(range[0]);
        const b = ev(range[1]);
        if (!finite(a) || !finite(b)) break;
        const n = o.samples ?? 360;
        const line: Vec[] = [];
        const lines: Vec[][] = [];
        for (let i = 0; i <= n; i += 1) {
          const t = a + ((b - a) * i) / n;
          const local: ExprScope = { vars: { ...vars, [o.variable]: t }, fns };
          const x = safe(() => object.exprs.x.evaluate(local));
          const y = safe(() => object.exprs.y.evaluate(local));
          // Far outside the view means a pole (a hyperbola's asymptote):
          // break there so the two branches are not joined across the board.
          if (
            finite(x) &&
            finite(y) &&
            x > xLo &&
            x < xHi &&
            y > yLo &&
            y < yHi
          ) {
            line.push([x, y]);
          } else if (line.length > 1) lines.push(line.splice(0));
          else line.length = 0;
        }
        lines.push(line);
        path(lines);
        break;
      }
      case 'point': {
        const at = pt(object.points.at);
        if (at) {
          shapes.push({
            kind: 'point',
            at,
            size: o.size ?? 5,
            hollow: o.hollow ?? false,
            drag: o.drag,
            style: { ...style, labelAt: at },
          });
        }
        break;
      }
      case 'segment': {
        const from = pt(object.points.from);
        const to = pt(object.points.to);
        if (from && to) {
          path([[from, to]], {
            arrow: o.arrow,
            labelAt: [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
          });
        }
        break;
      }
      case 'line': {
        const through = pt(object.points.through);
        if (!through) break;
        let direction: Vec | undefined;
        const to = pt(object.points.to);
        if (to) direction = [to[0] - through[0], to[1] - through[1]];
        else {
          const slope = ev(object.exprs.slope);
          if (finite(slope)) direction = [1, slope];
        }
        if (!direction) break;
        const length = Math.hypot(direction[0], direction[1]);
        if (!(length > 1e-12)) break;
        const ux = (direction[0] / length) * diag;
        const uy = (direction[1] / length) * diag;
        path(
          [
            [
              [through[0] - ux, through[1] - uy],
              [through[0] + ux, through[1] + uy],
            ],
          ],
          {
            labelAt: through,
          }
        );
        break;
      }
      case 'circle':
      case 'arc': {
        const center = pt(object.points.center);
        const r = ev(object.exprs.r);
        if (!center || !finite(r) || r <= 0) break;
        const start = o.type === 'arc' ? ev(object.exprs.start) : 0;
        const end = o.type === 'arc' ? ev(object.exprs.end) : Math.PI * 2;
        if (!finite(start) || !finite(end)) break;
        const n = Math.max(
          8,
          Math.ceil((Math.abs(end - start) / (Math.PI * 2)) * 160)
        );
        const line: Vec[] = [];
        for (let i = 0; i <= n; i += 1) {
          const angle = start + ((end - start) * i) / n;
          line.push([
            center[0] + r * Math.cos(angle),
            center[1] + r * Math.sin(angle),
          ]);
        }
        const mid = start + (end - start) / 2;
        path([line], {
          closed: o.type === 'circle',
          fill: o.type === 'circle' ? o.fill : false,
          labelAt: [
            center[0] + r * Math.cos(mid),
            center[1] + r * Math.sin(mid),
          ],
        });
        break;
      }
      case 'polygon': {
        const points = object.pointLists.points.map((pair) => pt(pair));
        if (points.some((p) => !p)) break;
        const verts = points as Vec[];
        const cx = verts.reduce((sum, p) => sum + p[0], 0) / verts.length;
        const cy = verts.reduce((sum, p) => sum + p[1], 0) / verts.length;
        path([verts], {
          closed: true,
          fill: o.fill ?? true,
          labelAt: [cx, cy],
        });
        break;
      }
      case 'area': {
        const a = ev(object.exprs.from);
        const b = ev(object.exprs.to);
        if (!finite(a) || !finite(b) || a === b) break;
        const curve = sampleFunction(o.fn, a, b, o.samples ?? DEFAULT_SAMPLES);
        const polys = curve.map((line): Vec[] => [
          [line[0][0], 0],
          ...line,
          [line[line.length - 1][0], 0],
        ]);
        path(polys, { closed: true, fill: true, labelAt: [(a + b) / 2, 0] });
        break;
      }
      case 'riemann': {
        const a = ev(object.exprs.from);
        const b = ev(object.exprs.to);
        const n = Math.round(ev(object.exprs.n));
        if (!finite(a) || !finite(b) || !(n >= 1) || a === b) break;
        const count = Math.min(n, 400);
        const width = (b - a) / count;
        const offset = o.rule === 'left' ? 0 : o.rule === 'right' ? 1 : 0.5;
        const rects: Vec[][] = [];
        for (let i = 0; i < count; i += 1) {
          const x0 = a + width * i;
          const h = safe(() => fns[o.fn](x0 + width * offset));
          if (!finite(h)) continue;
          const y = Math.min(Math.max(h, yLo), yHi);
          rects.push([
            [x0, 0],
            [x0, y],
            [x0 + width, y],
            [x0 + width, 0],
          ]);
        }
        path(rects, { closed: true, fill: true, labelAt: [(a + b) / 2, 0] });
        break;
      }
      case 'text': {
        const at = pt(object.points.at);
        if (at) {
          shapes.push({
            kind: 'text',
            at,
            text: interpolate(o.text, vars),
            anchor: o.anchor ?? 'middle',
            style,
          });
        }
        break;
      }
    }
  }

  const readouts = board.readouts.map((readout): BoardReadout => {
    const value = ev(readout.expr);
    if (readout.kind === 'status') {
      const ok = finite(value) && value !== 0;
      return {
        kind: 'status',
        label: readout.label,
        ok,
        text: ok ? readout.ok : readout.bad,
      };
    }
    return {
      kind: 'value',
      label: readout.label,
      value,
      text: formatBoardNumber(value, readout.digits),
      highlight: readout.highlight,
    };
  });

  return { shapes, readouts, values: { ...vars } };
}

function trimZeros(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

function lastPoint(lines: Vec[][]): Vec {
  const line = lines[lines.length - 1];
  return line[line.length - 1];
}

function safe(fn: () => number): number {
  try {
    const value = fn();
    return typeof value === 'number' ? value : NaN;
  } catch {
    return NaN;
  }
}

/** Params a dragged point writes, from where the pointer is. */
export function dragTargets(
  drag: PointDrag,
  at: Vec,
  spec: BoardSpec
): Record<string, number> {
  const out: Record<string, number> = {};
  if (drag.x) out[drag.x] = at[0];
  if (drag.y) out[drag.y] = at[1];
  if (drag.angle) {
    const [cx, cy] = drag.center ?? [0, 0];
    const param = spec.params.find((p) => p.id === drag.angle);
    let angle = Math.atan2(at[1] - cy, at[0] - cx);
    // Wrap into the param's range, e.g. [0, 2π) rather than (−π, π].
    if (param) while (angle < param.min) angle += Math.PI * 2;
    out[drag.angle] = angle;
  }
  return out;
}
