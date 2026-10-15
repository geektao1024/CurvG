import {
  isAnimationSpecDirected,
  isAnimationSpecRenderable,
  isAnimationSpecV4,
  type AnimationLayoutSpec,
  type AnimationObjectSpec,
  type AnimationSpec,
  type AnimationTimelineSpec,
} from '@/lib/animation';
import { validateAnimationSpec } from '@/lib/animation-schema';

const allowedNames = new Set([
  'x',
  't',
  'n',
  'pi',
  'e',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'sqrt',
  'abs',
  'exp',
  'log',
  'ln',
  'sinh',
  'cosh',
  'tanh',
]);

const numpyNames: Record<string, string> = {
  pi: 'np.pi',
  e: 'np.e',
  sin: 'np.sin',
  cos: 'np.cos',
  tan: 'np.tan',
  asin: 'np.arcsin',
  acos: 'np.arccos',
  atan: 'np.arctan',
  sqrt: 'np.sqrt',
  abs: 'np.abs',
  exp: 'np.exp',
  log: 'np.log',
  ln: 'np.log',
  sinh: 'np.sinh',
  cosh: 'np.cosh',
  tanh: 'np.tanh',
};

const manimColors = new Set([
  'BLUE',
  'TEAL',
  'GREEN',
  'YELLOW',
  'GOLD',
  'RED',
  'MAROON',
  'PURPLE',
  'PINK',
  'ORANGE',
  'WHITE',
  'GRAY',
  'GREY',
]);

function pythonString(value: string): string {
  return JSON.stringify(value);
}

function variableName(id: string): string {
  return `obj_${id.replace(/-/g, '_')}`;
}

function compileExpression(expression: string): string {
  const normalized = expression.trim().replaceAll('^', '**');
  if (
    normalized.length === 0 ||
    normalized.length > 1000 ||
    !/^[0-9A-Za-z_+\-*/().,\s*]+$/.test(normalized)
  ) {
    throw new Error('Expression contains unsupported characters');
  }
  for (const match of normalized.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) {
    if (!allowedNames.has(match[0])) {
      throw new Error(`Expression name is not supported: ${match[0]}`);
    }
  }
  return normalized.replace(
    /\b(pi|e|sin|cos|tan|asin|acos|atan|sqrt|abs|exp|log|ln|sinh|cosh|tanh)\b/g,
    (name) => numpyNames[name]
  );
}

function compileColor(value: string | undefined, fallback: string): string {
  const normalized = value?.trim().toUpperCase();
  if (normalized && manimColors.has(normalized)) return normalized;
  if (value && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
    return pythonString(value.trim());
  }
  return fallback;
}

function graphPoint(axesVariable: string, point: [number, number]): string {
  return `${axesVariable}.c2p(${point[0]}, ${point[1]})`;
}

function isAttachedLine(object: AnimationObjectSpec): boolean {
  return (
    (object.kind === 'line' || object.kind === 'arrow') &&
    Boolean(object.startRef || object.endRef || object.projection)
  );
}

/**
 * Tracked expressions use t; the tracker's own id (h, n, theta) is accepted
 * as an alias, because that is how models naturally write them.
 */
function trackedExpression(object: AnimationObjectSpec, expr: string): string {
  const alias = object.trackerRef;
  const renamed =
    alias && /^[A-Za-z][A-Za-z0-9_]*$/.test(alias) && alias !== 't'
      ? expr.replace(new RegExp(`\\b${alias}\\b`, 'g'), 't')
      : expr;
  return compileExpression(renamed);
}

/** expr evaluated at the current value t of the object's tracker. */
function trackedValue(object: AnimationObjectSpec, expr: string): string {
  return `(lambda t: ${trackedExpression(object, expr)})(${variableName(object.trackerRef || '')}.get_value())`;
}

function trackedPoint(object: AnimationObjectSpec): string {
  return `(lambda t: (${trackedExpression(object, object.xExpr || 't')}, ${trackedExpression(object, object.yExpr || 't')}))(${variableName(object.trackerRef || '')}.get_value())`;
}

/** Objects rebuilt every frame from what they follow. */
function isRedrawn(object: AnimationObjectSpec): boolean {
  return (
    isAttachedLine(object) ||
    (object.kind === 'point' && Boolean(object.trackerRef)) ||
    ['readout', 'riemann', 'trace'].includes(object.kind)
  );
}

function lineEndpoints(
  object: AnimationObjectSpec,
  axesVariable: string
): [string, string] {
  const start = object.startRef
    ? `${variableName(object.startRef)}.get_center()`
    : graphPoint(axesVariable, object.start || [0, 0]);
  if (object.endRef) {
    return [start, `${variableName(object.endRef)}.get_center()`];
  }
  if (object.projection && object.startRef) {
    const coordinates = `${axesVariable}.p2c(${variableName(object.startRef)}.get_center())`;
    return [
      start,
      object.projection === 'x_axis'
        ? `${axesVariable}.c2p(${coordinates}[0], 0)`
        : `${axesVariable}.c2p(0, ${coordinates}[1])`,
    ];
  }
  return [start, graphPoint(axesVariable, object.end || [1, 0])];
}

function positionStatement(
  variable: string,
  object: AnimationObjectSpec,
  layout: AnimationLayoutSpec,
  frame: '16:9' | '9:16'
): string {
  const portrait = frame === '9:16';
  if (object.region === 'title') {
    return portrait
      ? `${variable}.scale_to_fit_width(7.4).move_to([0, 5.25, 0])`
      : `${variable}.scale_to_fit_width(12.0).move_to([0, 3.15, 0])`;
  }
  if (object.region === 'formula') {
    if (portrait) {
      return `${variable}.scale_to_fit_width(7.4).move_to([0, 4.45, 0])`;
    }
    if (layout.regions === 'left|right') {
      return `${variable}.scale_to_fit_width(5.4).move_to(LEFT * 3.55)`;
    }
    if (layout.regions === 'top|bottom') {
      return `${variable}.scale_to_fit_width(11.8).move_to([0, 2.7, 0])`;
    }
    return `${variable}.scale_to_fit_width(11.8).move_to([0, 2.75, 0])`;
  }
  if (portrait) {
    const scale = object.importance === 'hero' ? 0.82 : 0.68;
    return `${variable}.scale(${scale}).move_to(DOWN * 0.4)`;
  }
  if (layout.regions === 'left|right') {
    return `${variable}.scale(0.72).move_to(RIGHT * 3.35 + DOWN * 0.2)`;
  }
  if (layout.regions === 'top|bottom') {
    return `${variable}.scale(0.62).move_to(DOWN * 1.25)`;
  }
  return `${variable}.scale(0.78).move_to(DOWN * 0.35)`;
}

function compileObject(
  object: AnimationObjectSpec,
  layout: AnimationLayoutSpec,
  axesVariable: string,
  frame: '16:9' | '9:16',
  palette: string[]
): string[] {
  const variable = variableName(object.id);
  const fallbackColor = ['formula', 'series', 'text'].includes(object.kind)
    ? '#F4EDE1'
    : palette[0] || 'BLUE';
  const color = compileColor(object.color, compileColor(fallbackColor, 'BLUE'));
  const domain = object.domain ?? [-6, 6];
  let constructor: string;
  switch (object.kind) {
    case 'axes':
      constructor =
        frame === '9:16'
          ? `${variable} = Axes(x_range=[-6, 6, 1], y_range=[-4, 4, 1], x_length=7.4, y_length=7.2, tips=False, axis_config={"include_numbers": True, "font_size": 24, "stroke_opacity": 0.72})`
          : `${variable} = Axes(x_range=[-6, 6, 1], y_range=[-4, 4, 1], x_length=8.6, y_length=5.4, tips=False, axis_config={"include_numbers": True, "font_size": 22, "stroke_opacity": 0.72})`;
      break;
    case 'curve':
      // Plotted in the already-placed axes' coordinates. Scaling and moving
      // it again (as before 2026-10-16) put every curve off its axes: the
      // vertex of y=x^2 sat below the origin, and points and tangents
      // declared in axis coordinates missed the curve.
      constructor = `${variable} = ${axesVariable}.plot(lambda x: ${compileExpression(object.expr || 'x')}, x_range=[${domain[0]}, ${domain[1]}], color=${color}, stroke_width=5)`;
      return [constructor];
    case 'parametric':
      constructor = `${variable} = ParametricFunction(lambda t: ${axesVariable}.c2p(${compileExpression(object.xExpr || 't')}, ${compileExpression(object.yExpr || 't')}), t_range=[${domain[0]}, ${domain[1]}], color=${color}, stroke_width=5)`;
      return [constructor];
    case 'area': {
      const helper = `${variable}_curve`;
      return [
        `${helper} = ${axesVariable}.plot(lambda x: ${compileExpression(object.expr || 'x')}, x_range=[${domain[0]}, ${domain[1]}], color=${color})`,
        `${variable} = ${axesVariable}.get_area(${helper}, x_range=[${domain[0]}, ${domain[1]}], color=${color}, opacity=0.32)`,
      ];
    }
    case 'formula': {
      const expressions = object.parts?.length
        ? object.parts.map((part) => pythonString(part.latex)).join(', ')
        : pythonString(object.expr || '');
      const lines = [
        `${variable} = MathTex(${expressions}, color=${color}, font_size=48)`,
      ];
      for (const [index, part] of (object.parts || []).entries()) {
        lines.push(
          `${variable}[${index}].set_color(${compileColor(part.color, color)})`
        );
      }
      lines.push(positionStatement(variable, object, layout, frame));
      return lines;
    }
    case 'text':
      constructor = `${variable} = Text(${pythonString(object.label || '')}, color=${color}, font_size=38)`;
      break;
    case 'series': {
      const expressions = object.parts?.length
        ? object.parts.map((part) => pythonString(part.latex)).join(', ')
        : pythonString(object.expr || '');
      const lines = [
        `${variable} = MathTex(${expressions}, color=${color}, font_size=46)`,
      ];
      for (const [index, part] of (object.parts || []).entries()) {
        lines.push(
          `${variable}[${index}].set_color(${compileColor(part.color, color)})`
        );
      }
      lines.push(positionStatement(variable, object, layout, frame));
      return lines;
    }
    case 'matrix':
      constructor = `${variable} = Matrix(${JSON.stringify(object.values || [[1]])}, element_to_mobject_config={"font_size": 38}).set_color(${color})`;
      break;
    case 'circle': {
      const center = object.center || [0, 0];
      const radius = object.radius || 1;
      constructor = `${variable} = ParametricFunction(lambda t: ${axesVariable}.c2p(${center[0]} + ${radius} * np.cos(t), ${center[1]} + ${radius} * np.sin(t)), t_range=[0, TAU], color=${color}, stroke_width=5)`;
      return [constructor];
    }
    case 'point':
      constructor = object.trackerRef
        ? `${variable} = always_redraw(lambda: Dot(${axesVariable}.c2p(*${trackedPoint(object)}), radius=0.09, color=${color}))`
        : `${variable} = Dot(${graphPoint(axesVariable, object.position || [0, 0])}, radius=0.09, color=${color})`;
      return [constructor];
    case 'line':
    case 'arrow': {
      const [start, end] = lineEndpoints(object, axesVariable);
      const shape =
        object.kind === 'line'
          ? `Line(${start}, ${end}, color=${color}, stroke_width=4)`
          : `Arrow(${start}, ${end}, buff=0, color=${color}, stroke_width=4, max_tip_length_to_length_ratio=0.18)`;
      // An attached line is rebuilt from its point every frame, so it follows
      // a point that moves along a path (secants, connectors, drop lines).
      constructor = isAttachedLine(object)
        ? `${variable} = always_redraw(lambda: ${shape})`
        : `${variable} = ${shape}`;
      return [constructor];
    }
    case 'arc': {
      const center = object.center || [0, 0];
      const radius = object.radius || 1;
      const startAngle = object.startAngle || 0;
      const endAngle = startAngle + (object.sweepAngle || Math.PI / 2);
      constructor = `${variable} = ParametricFunction(lambda t: ${axesVariable}.c2p(${center[0]} + ${radius} * np.cos(t), ${center[1]} + ${radius} * np.sin(t)), t_range=[${startAngle}, ${endAngle}], color=${color}, stroke_width=5)`;
      return [constructor];
    }
    case 'tracker':
      return [`${variable} = ValueTracker(${Number(object.initial ?? 0)})`];
    case 'readout': {
      const value = `DecimalNumber(${trackedValue(object, object.expr || 't')}, num_decimal_places=${object.decimals ?? 2}, font_size=36, color=${color})`;
      const shown = object.label
        ? `VGroup(Text(${pythonString(object.label)}, font_size=30, color=${color}), ${value}).arrange(RIGHT, buff=0.15)`
        : value;
      return [
        `${variable} = always_redraw(lambda: ${shown}.move_to(${graphPoint(axesVariable, object.position || [0, 0])}))`,
      ];
    }
    case 'riemann': {
      const [from, to] = object.domain ?? [0, 1];
      const helper = `${variable}_curve`;
      const tracker = variableName(object.trackerRef || '');
      return [
        `${helper} = ${axesVariable}.plot(lambda x: ${compileExpression(object.expr || 'x')}, x_range=[${from}, ${to}])`,
        `${variable} = always_redraw(lambda: ${axesVariable}.get_riemann_rectangles(${helper}, x_range=[${from}, ${to}], dx=(${to} - (${from})) / max(1, round(${tracker}.get_value())), input_sample_type=${pythonString(object.sample || 'right')}, stroke_width=1, fill_opacity=0.55, color=${color}))`,
      ];
    }
    case 'trace':
      return [
        `${variable} = TracedPath(${variableName(object.traceRef || '')}.get_center, stroke_color=${color}, stroke_width=4)`,
        // A trace starts empty and grows while its point moves; animating its
        // entrance changes its point count mid-animation and fails in Manim.
        `self.add(${variable})`,
      ];
  }
  return [constructor, positionStatement(variable, object, layout, frame)];
}

function eventTarget(
  event: AnimationTimelineSpec,
  objectsById: Map<string, AnimationObjectSpec>
): string {
  const variable = variableName(event.ref);
  if (!event.partId) return variable;
  const index = objectsById
    .get(event.ref)
    ?.parts?.findIndex((part) => part.id === event.partId);
  if (index === undefined || index < 0) {
    throw new Error(`Unknown formula part: ${event.ref}.${event.partId}`);
  }
  return `${variable}[${index}]`;
}

function eventColor(
  event: AnimationTimelineSpec,
  objectsById: Map<string, AnimationObjectSpec>
): string {
  const object = objectsById.get(event.ref);
  const part = event.partId
    ? object?.parts?.find((candidate) => candidate.id === event.partId)
    : undefined;
  return compileColor(part?.color || object?.color, 'YELLOW');
}

function animationExpression(
  event: AnimationTimelineSpec,
  objectsById: Map<string, AnimationObjectSpec>
): string | null {
  const variable = variableName(event.ref);
  const target = eventTarget(event, objectsById);
  const source = objectsById.get(event.ref);
  if (event.op === 'set_value') {
    return `${variable}.animate.set_value(${Number(event.value ?? 0)})`;
  }
  if (
    source?.kind === 'trace' &&
    ['draw', 'write', 'fade_in'].includes(event.op)
  ) {
    return null;
  }
  if (source && isRedrawn(source)) {
    // Create/Write fight the per-frame redraw; a plain Transform would snap
    // back to the point when its updater resumes.
    // No shift: a traced point would record the slide as a stray tick.
    if (['draw', 'write', 'fade_in'].includes(event.op)) {
      return `FadeIn(${target})`;
    }
    if (event.op === 'transform') {
      return `ReplacementTransform(${variable}, ${variableName(event.targetRef || '')}.copy())`;
    }
  }
  switch (event.op) {
    case 'draw':
      return `Create(${target})`;
    case 'write':
      return `Write(${target})`;
    case 'fade_in':
      return `FadeIn(${target}, shift=UP * 0.18)`;
    case 'fade_out':
      return `FadeOut(${target})`;
    case 'transform':
      return `Transform(${variable}, ${variableName(event.targetRef || '')}.copy())`;
    case 'emphasize':
      return `Indicate(${target}, color=${eventColor(event, objectsById)}, scale_factor=1.06)`;
    case 'spotlight':
      return `Circumscribe(${target}, color=${eventColor(event, objectsById)}, fade_out=True, buff=0.12, stroke_width=6)`;
    case 'glow':
      return `Circumscribe(${target}, color=${eventColor(event, objectsById)}, fade_in=True, fade_out=True, time_width=0.55, buff=0.18, stroke_width=10)`;
    case 'camera_focus':
      return `self.camera.frame.animate.move_to(${target}).set(width=config.frame_width / ${event.zoom || 1.8})`;
    case 'camera_reset':
      return 'Restore(self.camera.frame)';
    case 'move_along': {
      const path = variableName(event.pathRef || '');
      return event.reverse
        ? `MoveAlongPath(${target}, ${path}.copy().reverse_points())`
        : `MoveAlongPath(${target}, ${path})`;
    }
    case 'hold':
      return null;
  }
}

function rateFunction(event: AnimationTimelineSpec): string {
  if (event.ease === 'linear') return 'linear';
  if (event.ease === 'there_and_back') return 'there_and_back';
  return 'smooth';
}

/** Compile validated v2-v6 IR into reproducible Manim source. */
export function compileAnimationSpec(input: AnimationSpec): string {
  const spec = validateAnimationSpec(input);
  if (!isAnimationSpecRenderable(spec)) {
    throw new Error(
      'Only v2 through v6 animation specifications can be compiled'
    );
  }
  const frame = isAnimationSpecDirected(spec) ? spec.direction.frame : '16:9';
  const movingCamera =
    isAnimationSpecV4(spec) && spec.cinematography.scene === 'moving-camera';
  const axes = spec.objects.find((object) => object.kind === 'axes');
  const needsAxes = spec.objects.some((object) =>
    [
      'curve',
      'parametric',
      'area',
      'circle',
      'point',
      'line',
      'arrow',
      'arc',
      'readout',
      'riemann',
    ].includes(object.kind)
  );
  const axesVariable = axes ? variableName(axes.id) : 'obj_auto_axes';
  const frameConfig =
    frame === '9:16'
      ? [
          'config.pixel_width = 1080',
          'config.pixel_height = 1920',
          'config.frame_width = 9',
          'config.frame_height = 16',
        ]
      : [
          'config.pixel_width = 1920',
          'config.pixel_height = 1080',
          'config.frame_width = 14.222',
          'config.frame_height = 8',
        ];
  const lines = [
    'from manim import *',
    'import numpy as np',
    '',
    ...frameConfig,
    'config.frame_rate = 30',
    '',
    `class CurvGScene(${movingCamera ? 'MovingCameraScene' : 'Scene'}):`,
    '    def construct(self):',
    `        self.camera.background_color = ${compileColor(spec.style.background, 'BLACK')}`,
  ];
  if (movingCamera) {
    lines.push('        self.camera.frame.save_state()');
  }
  if (needsAxes && !axes) {
    const autoAxes: AnimationObjectSpec = {
      id: 'auto-axes',
      kind: 'axes',
      region: 'graph',
      importance: 'supporting',
    };
    const autoAxesLines = compileObject(
      autoAxes,
      spec.layout,
      axesVariable,
      frame,
      spec.style.palette
    ).map((line) => line.replace(variableName(autoAxes.id), axesVariable));
    lines.push(...autoAxesLines.map((line) => `        ${line}`));
  }
  // Trackers come before what reads them; attached lines and traces read
  // points, so they are built last.
  const rank = (object: AnimationObjectSpec) =>
    object.kind === 'axes'
      ? 0
      : object.kind === 'tracker'
        ? 1
        : isAttachedLine(object) || object.kind === 'trace'
          ? 3
          : 2;
  const sortedObjects = [...spec.objects].sort(
    (left, right) => rank(left) - rank(right) || left.id.localeCompare(right.id)
  );
  for (const object of sortedObjects) {
    for (const line of compileObject(
      object,
      spec.layout,
      axesVariable,
      frame,
      spec.style.palette
    )) {
      lines.push(`        ${line}`);
    }
  }

  const objectsById = new Map(
    spec.objects.map((object) => [object.id, object])
  );
  const shotsById = new Map(
    isAnimationSpecDirected(spec)
      ? spec.shots.map((shot) => [shot.id, shot] as const)
      : []
  );
  const events = [...spec.timeline].sort(
    (left, right) => left.at - right.at || left.id.localeCompare(right.id)
  );
  let cursor = 0;
  for (let index = 0; index < events.length; ) {
    const at = events[index].at;
    const group: AnimationTimelineSpec[] = [];
    while (index < events.length && Math.abs(events[index].at - at) < 0.001) {
      group.push(events[index]);
      index += 1;
    }
    if (at > cursor + 0.001) {
      lines.push(`        self.wait(${Number((at - cursor).toFixed(3))})`);
      cursor = at;
    }
    const shot = group[0].shotId ? shotsById.get(group[0].shotId) : undefined;
    if (shot) {
      lines.push(
        `        # Shot ${shot.id}: ${shot.beat} — ${shot.purpose.replace(/[\r\n]+/g, ' ').slice(0, 180)}`
      );
    }
    const duration = Math.max(...group.map((event) => event.runTime));
    const animations = group
      .map((event) => animationExpression(event, objectsById))
      .filter((value): value is string => !!value);
    if (animations.length === 0) {
      lines.push(`        self.wait(${Number(duration.toFixed(3))})`);
    } else {
      const rate = rateFunction(group[0]);
      lines.push(
        `        self.play(${animations.join(', ')}, run_time=${Number(duration.toFixed(3))}, rate_func=${rate})`
      );
    }
    cursor = Math.max(cursor, at + duration);
  }
  if (spec.durationSeconds > cursor + 0.001) {
    lines.push(
      `        self.wait(${Number((spec.durationSeconds - cursor).toFixed(3))})`
    );
  }
  return `${lines.join('\n')}\n`;
}
