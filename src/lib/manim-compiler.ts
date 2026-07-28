import {
  isAnimationSpecV2,
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

function positionStatement(
  variable: string,
  object: AnimationObjectSpec,
  layout: AnimationLayoutSpec
): string {
  if (object.region === 'title') {
    return `${variable}.scale_to_fit_width(12.2).to_edge(UP, buff=0.32)`;
  }
  if (object.region === 'formula') {
    if (layout.regions === 'left|right') {
      return `${variable}.scale_to_fit_width(5.4).move_to(LEFT * 3.55)`;
    }
    if (layout.regions === 'top|bottom') {
      return `${variable}.scale_to_fit_width(11.8).to_edge(UP, buff=0.55)`;
    }
    return `${variable}.scale_to_fit_width(11.8).to_edge(UP, buff=0.5)`;
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
  axesVariable: string
): string[] {
  const variable = variableName(object.id);
  const color = compileColor(object.color, 'BLUE');
  const domain = object.domain ?? [-6, 6];
  let constructor: string;
  switch (object.kind) {
    case 'axes':
      constructor = `${variable} = Axes(x_range=[-6, 6, 1], y_range=[-4, 4, 1], x_length=8.6, y_length=5.4, tips=False, axis_config={"include_numbers": True, "font_size": 22})`;
      break;
    case 'curve':
      constructor = `${variable} = ${axesVariable}.plot(lambda x: ${compileExpression(object.expr || 'x')}, x_range=[${domain[0]}, ${domain[1]}], color=${color}, stroke_width=5)`;
      break;
    case 'area': {
      const helper = `${variable}_curve`;
      return [
        `${helper} = ${axesVariable}.plot(lambda x: ${compileExpression(object.expr || 'x')}, x_range=[${domain[0]}, ${domain[1]}], color=${color})`,
        `${variable} = ${axesVariable}.get_area(${helper}, x_range=[${domain[0]}, ${domain[1]}], color=${color}, opacity=0.32)`,
      ];
    }
    case 'formula':
      constructor = `${variable} = MathTex(${pythonString(object.expr || '')}, color=${color}, font_size=48)`;
      break;
    case 'text':
      constructor = `${variable} = Text(${pythonString(object.label || '')}, color=${color}, font_size=38)`;
      break;
    case 'series':
      constructor = `${variable} = MathTex(${pythonString(object.expr || '')}, color=${color}, font_size=46)`;
      break;
    case 'matrix':
      constructor = `${variable} = Matrix(${JSON.stringify(object.values || [[1]])}, element_to_mobject_config={"font_size": 38}).set_color(${color})`;
      break;
  }
  return [constructor, positionStatement(variable, object, layout)];
}

function animationExpression(event: AnimationTimelineSpec): string | null {
  const variable = variableName(event.ref);
  switch (event.op) {
    case 'draw':
      return `Create(${variable})`;
    case 'write':
      return `Write(${variable})`;
    case 'fade_in':
      return `FadeIn(${variable})`;
    case 'fade_out':
      return `FadeOut(${variable})`;
    case 'transform':
      return `Transform(${variable}, ${variableName(event.targetRef || '')}.copy())`;
    case 'hold':
      return null;
  }
}

function rateFunction(event: AnimationTimelineSpec): string {
  if (event.ease === 'linear') return 'linear';
  if (event.ease === 'there_and_back') return 'there_and_back';
  return 'smooth';
}

/** Compile validated v2 IR into reproducible Manim source. */
export function compileAnimationSpec(input: AnimationSpec): string {
  const spec = validateAnimationSpec(input);
  if (!isAnimationSpecV2(spec)) {
    throw new Error('Only v2 animation specifications can be compiled');
  }
  const axes = spec.objects.find((object) => object.kind === 'axes');
  const needsAxes = spec.objects.some((object) =>
    ['curve', 'area'].includes(object.kind)
  );
  const axesVariable = axes ? variableName(axes.id) : 'obj_auto_axes';
  const lines = [
    'from manim import *',
    'import numpy as np',
    '',
    'class CurvGScene(Scene):',
    '    def construct(self):',
    `        self.camera.background_color = ${compileColor(spec.style.background, 'BLACK')}`,
  ];
  if (needsAxes && !axes) {
    lines.push(
      `        ${axesVariable} = Axes(x_range=[-6, 6, 1], y_range=[-4, 4, 1], x_length=8.6, y_length=5.4, tips=False, axis_config={"include_numbers": True, "font_size": 22})`,
      `        ${axesVariable}.scale(0.78).move_to(DOWN * 0.35)`
    );
  }
  const sortedObjects = [...spec.objects].sort((left, right) => {
    if (left.kind === 'axes' && right.kind !== 'axes') return -1;
    if (right.kind === 'axes' && left.kind !== 'axes') return 1;
    return left.id.localeCompare(right.id);
  });
  for (const object of sortedObjects) {
    for (const line of compileObject(object, spec.layout, axesVariable)) {
      lines.push(`        ${line}`);
    }
  }

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
    const holdOnly = group.every((event) => event.op === 'hold');
    const duration = Math.max(...group.map((event) => event.runTime));
    if (holdOnly) {
      lines.push(`        self.wait(${Number(duration.toFixed(3))})`);
    } else {
      const animations = group
        .map(animationExpression)
        .filter((value): value is string => !!value);
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
