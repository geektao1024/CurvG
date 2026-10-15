import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import katex from 'katex';

import { curveFactRows, formatValue } from '../src/blocks/curve-facts';
import {
  CURVE_FACTS,
  CURVE_PRESETS,
  CURVE_TRACES,
  curveGraphImage,
  curveOgImage,
  CURVES,
  defaultValues,
  factLines,
  traceFrame,
} from '../src/content/curves';
import { guideExtent } from '../src/content/curves/traces';
import { curveCsv, curveSvg } from '../src/lib/curve-export';
import { plainMath } from '../src/lib/plain-math';

test('every curve has its graph and share images (pnpm og:curves)', () => {
  for (const curve of CURVES) {
    assert.ok(existsSync(`public${curveGraphImage(curve.slug)}`), curve.slug);
    for (const lang of ['en', 'zh'] as const) {
      assert.ok(
        existsSync(`public${curveOgImage(curve.slug, lang)}`),
        curve.slug
      );
    }
  }
});

test('curve blurbs read as plain text once TeX is flattened', () => {
  assert.equal(
    plainMath('x^{2/3} + y^{2/3} = a^{2/3}'),
    'x^(2/3) + y^(2/3) = a^(2/3)'
  );
  assert.equal(plainMath('r = a e^{b\\theta}'), 'r = a e^(bθ)');
  assert.equal(plainMath('a_{1}b_1'), 'a₁b₁');
  for (const curve of CURVES) {
    for (const lang of ['en', 'zh'] as const) {
      assert.doesNotMatch(plainMath(curve.short[lang]), /[\\{}]/, curve.slug);
    }
  }
});

test('Chinese curve copy uses full-width punctuation in prose', () => {
  for (const curve of CURVES) {
    const prose = [
      curve.short.zh,
      ...curve.intro.zh,
      ...curve.properties.zh,
      curve.seenIn.zh,
    ];
    for (const text of prose) {
      // A half-width comma or semicolon right after a Chinese character.
      assert.doesNotMatch(
        text,
        /[一-鿿][,;]/,
        `${curve.slug}: ${text.slice(0, 40)}`
      );
    }
  }
});

/** Length of a polyline, and the area it sweeps around the origin. */
function lengthOf(points: Array<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(
      points[i][0] - points[i - 1][0],
      points[i][1] - points[i - 1][1]
    );
  }
  return total;
}
function sweptArea(points: Array<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    total += Math.abs(x0 * y1 - x1 * y0) / 2;
  }
  return total;
}

/** Shoelace area of a closed polyline, for any simple closed curve. */
function enclosedArea(points: Array<[number, number]>): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += points[i - 1][0] * points[i][1] - points[i][0] * points[i - 1][1];
  }
  return Math.abs(total) / 2;
}

test('every curve has a formula card that renders', () => {
  for (const curve of CURVES) {
    const card = CURVE_FACTS[curve.slug];
    assert.ok(card, `${curve.slug} has no facts`);
    assert.ok(card.where.en && card.where.zh, curve.slug);
    // Either an equation, or (fractals, Theodorus) the rule that builds it.
    assert.ok(
      card.facts.some((fact) =>
        ['cartesian', 'parametric', 'polar', 'rule'].includes(fact.kind)
      ),
      `${curve.slug} has no equation or rule`
    );
    for (const fact of card.facts) {
      if (fact.kind === 'other') assert.ok(fact.label, curve.slug);
      assert.ok(fact.tex || fact.text, `${curve.slug}: empty fact`);
      if (fact.text) assert.ok(fact.text.en && fact.text.zh, curve.slug);
      for (const tex of factLines(fact)) {
        assert.doesNotThrow(
          () => katex.renderToString(tex, { throwOnError: true }),
          `${curve.slug}: ${tex}`
        );
        // The FAQ and structured data carry the plain-text version.
        assert.doesNotMatch(plainMath(tex), /[\\{}]/, `${curve.slug}: ${tex}`);
      }
      if (fact.measure)
        assert.ok(fact.value, `${curve.slug} measure needs value`);
    }
  }
  assert.deepEqual(
    Object.keys(CURVE_FACTS).filter(
      (slug) => !CURVES.some((curve) => curve.slug === slug)
    ),
    []
  );
});

test('measured facts match the drawn curve', () => {
  let checked = 0;
  for (const curve of CURVES) {
    const values = defaultValues(curve);
    const drawn = curve.sample(values).at(-1)!;
    for (const fact of CURVE_FACTS[curve.slug].facts) {
      if (!fact.measure || !fact.value) continue;
      const expected = fact.value(values);
      const actual =
        fact.measure === 'length'
          ? lengthOf(drawn)
          : fact.measure === 'enclosed'
            ? enclosedArea(drawn)
            : sweptArea(drawn);
      assert.ok(
        Math.abs(actual - expected) / expected < 2e-3,
        `${curve.slug} ${fact.kind}: drawn ${actual}, fact ${expected}`
      );
      checked += 1;
    }
  }
  assert.ok(checked >= 20, `only ${checked} facts checked`);
});

test('formulas flatten to readable plain text', () => {
  assert.equal(plainMath('A = \\frac{3}{8}\\pi a^2'), 'A = (3/8)π a^2');
  assert.equal(plainMath('r = a\\cos(k\\theta)'), 'r = a cos(kθ)');
  assert.equal(
    plainMath('\\left(\\pm\\frac{a}{\\sqrt{2}},\\ 0\\right)'),
    '(±a/√2, 0)'
  );
  assert.equal(plainMath('\\varphi = \\tfrac{1+\\sqrt5}{2}'), 'φ = (1+√5)/2');
});

test('curve exports are self-contained', () => {
  const curve = CURVES.find((entry) => entry.slug === 'astroid')!;
  const polylines = curve.sample({ a: 1.2 });
  const csv = curveCsv(polylines).trim().split('\n');
  assert.equal(csv[0], 'path,x,y');
  assert.equal(csv.length, polylines[0].length + 1);
  assert.equal(csv[1], '1,1.200000,0.000000');

  const svg = curveSvg({
    paths: ['M0 0L10 10', 'M5 5L20 20'],
    origin: [360, 270],
    credit: 'curvg.com',
    background: '#ffffff',
  });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /fill="#ffffff"/);
  assert.match(svg, />curvg\.com<\/text>/);
  // Opened outside the site, a CSS variable would render black or not at all.
  assert.doesNotMatch(svg, /var\(/);
  assert.equal(svg.match(/<path /g)?.length, 3);
});

test('presets are reachable slider positions', () => {
  for (const [slug, presets] of Object.entries(CURVE_PRESETS)) {
    const curve = CURVES.find((entry) => entry.slug === slug);
    assert.ok(curve, `presets for unknown curve ${slug}`);
    const labels = new Set<string>();
    for (const preset of presets) {
      assert.ok(!labels.has(preset.label.en), `${slug}: duplicate preset`);
      labels.add(preset.label.en);
      assert.deepEqual(
        Object.keys(preset.values).sort(),
        curve.params.map((param) => param.key).sort(),
        `${slug} ${preset.label.en} must set every parameter`
      );
      for (const param of curve.params) {
        const value = preset.values[param.key];
        assert.ok(
          value >= param.min && value <= param.max,
          `${slug} ${param.key}=${value} out of range`
        );
        const steps = (value - param.min) / param.step;
        assert.ok(
          Math.abs(steps - Math.round(steps)) < 1e-9,
          `${slug} ${param.key}=${value} is off the slider step`
        );
      }
    }
  }
});

test('live values in the formula card follow the sliders', () => {
  assert.equal(formatValue(6), '= 6');
  assert.equal(formatValue(180 * Math.PI), '≈ 565.5');
  assert.equal(formatValue(Number.NaN), '');
  const astroid = CURVES.find((entry) => entry.slug === 'astroid')!;
  const rows = curveFactRows(astroid, 'en', { a: 1.2 })!.rows;
  assert.equal(rows.find((row) => row.label === 'Perimeter')?.current, '≈ 7.2');
});

test('every trace draws exactly the curve it explains', () => {
  for (const [slug, trace] of Object.entries(CURVE_TRACES)) {
    const curve = CURVES.find((entry) => entry.slug === slug);
    assert.ok(curve, `trace for unknown curve ${slug}`);
    const settings = [
      defaultValues(curve),
      ...(CURVE_PRESETS[slug] ?? []).map((preset) => preset.values),
    ];
    for (const values of settings) {
      const polylines = curve.sample(values);
      const line = polylines[trace.polyline ?? polylines.length - 1];
      const [t0, t1] = trace.range(values);
      line.forEach(([x, y], i) => {
        const t = t0 + ((t1 - t0) * i) / (line.length - 1);
        const [px, py] = trace.point(values, t);
        assert.ok(
          Math.hypot(px - x, py - y) < 1e-9,
          `${slug} ${JSON.stringify(values)}: point ${i} is off the curve`
        );
      });
      // Mid-run, the construction must be finite numbers.
      const frame = traceFrame(slug, values, polylines, 0.5)!;
      for (const guide of frame.guides) {
        for (const [gx, gy] of guideExtent(guide)) {
          assert.ok(Number.isFinite(gx) && Number.isFinite(gy), slug);
        }
      }
    }
  }
});

test('curves without a trace still animate along their polyline', () => {
  const heart = CURVES.find((entry) => entry.slug === 'heart-curve')!;
  const polylines = heart.sample(defaultValues(heart));
  const start = traceFrame('heart-curve', { s: 1 }, polylines, 0)!;
  const end = traceFrame('heart-curve', { s: 1 }, polylines, 1)!;
  assert.deepEqual(start.pen, polylines[0][0]);
  assert.deepEqual(end.pen, polylines[0].at(-1));
  assert.deepEqual(start.guides, []);
});
