import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';
import katex from 'katex';

import { CURVES } from '../src/content/curves';
import {
  chapterPath,
  getLab,
  LAB_SUBJECTS,
  LAB_SUITES,
  labBoard,
  labOgImage,
  labPath,
  LABS,
  publicSubjects,
  suiteForLab,
  suitesForSubject,
  type Lab,
} from '../src/content/labs';
import {
  LLN_DATA,
  LLN_EPS,
  LLN_NS,
} from '../src/content/labs/data/law-of-large-numbers';
import { getCategory } from '../src/content/library';
import {
  dragTargets,
  evaluateBoard,
  type BoardFrame,
} from '../src/lib/board/evaluate';
import { richMathTex } from '../src/lib/rich-math';

const LANGS = ['en', 'zh'] as const;

function compileTex(tex: string, where: string) {
  assert.doesNotThrow(
    () => katex.renderToString(tex, { throwOnError: true, strict: 'ignore' }),
    `${where}: ${tex}`
  );
}

function texts(lab: Lab): Array<[string, { en: string; zh: string }]> {
  const out: Array<[string, { en: string; zh: string }]> = [
    ['title', lab.title],
    ['chapterTitle', lab.chapterTitle],
    ['question', lab.question],
    ['summary', lab.summary],
    ['videoPrompt', lab.videoPrompt],
  ];
  lab.keyPoints.forEach((point, i) => out.push([`keyPoints[${i}]`, point]));
  lab.guide.forEach((step, i) => {
    out.push(
      [`guide[${i}].title`, step.title],
      [`guide[${i}].body`, step.body]
    );
  });
  lab.sections.forEach((section) => {
    out.push(
      [`${section.id}.title`, section.title],
      [`${section.id}.body`, section.body]
    );
  });
  lab.quiz.forEach((item, i) => {
    out.push(
      [`quiz[${i}].question`, item.question],
      [`quiz[${i}].explanation`, item.explanation]
    );
    item.choices.forEach((choice, j) =>
      out.push([`quiz[${i}].choices[${j}]`, choice])
    );
  });
  return out;
}

function readout(frame: BoardFrame, label: string): number {
  const found = frame.readouts.find((item) => item.label === label);
  assert.ok(found && found.kind === 'value', `readout ${label}`);
  return found.value;
}

describe('lab content', () => {
  it('has unique, url-safe slugs', () => {
    const slugs = LABS.map((lab) => lab.slug);
    assert.equal(new Set(slugs).size, slugs.length);
    slugs.forEach((slug) => assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/));
  });

  for (const lab of LABS) {
    describe(lab.slug, () => {
      it('links only to things that exist', () => {
        for (const id of [
          lab.primaryCategoryId,
          ...(lab.additionalCategoryIds ?? []),
        ]) {
          assert.equal(
            getCategory(id)?.publication,
            'public',
            `category ${id}`
          );
        }
        for (const slug of lab.curveSlugs ?? []) {
          assert.ok(
            CURVES.some((curve) => curve.slug === slug),
            `curve ${slug}`
          );
        }
        for (const slug of lab.related ?? []) {
          assert.notEqual(slug, lab.slug);
          assert.ok(getLab(slug), `related ${slug}`);
        }
      });

      it('is written in both languages, with TeX that compiles', () => {
        for (const [where, text] of texts(lab)) {
          assert.ok(
            text.en.trim() && text.zh.trim(),
            `${where} needs en and zh`
          );
          for (const lang of LANGS) {
            richMathTex(text[lang]).forEach((tex) =>
              compileTex(tex, `${where}.${lang}`)
            );
          }
        }
      });

      it('has a result heading that compiles', () => {
        compileTex(lab.resultTex, 'resultTex');
      });

      it('has well-formed quiz items', () => {
        assert.ok(lab.quiz.length >= 2);
        for (const item of lab.quiz) {
          assert.ok(item.choices.length >= 2);
          assert.ok(item.answer >= 0 && item.answer < item.choices.length);
        }
      });

      for (const lang of LANGS) {
        it(`compiles and draws its board (${lang})`, () => {
          const board = labBoard(lab, lang);
          board.spec.params.forEach((param) =>
            compileTex(param.label, `param ${param.id}`)
          );
          board.spec.readouts.forEach((item) => {
            // Status labels are plain words; value labels are TeX.
            if (!('kind' in item)) compileTex(item.label, 'readout');
          });

          const frames = [
            evaluateBoard(board, {}),
            ...lab.guide.map((step, i) => {
              for (const [id, value] of Object.entries(step.set ?? {})) {
                const param = board.spec.params.find((p) => p.id === id);
                assert.ok(param, `guide[${i}] sets unknown param ${id}`);
                assert.ok(
                  value >= param.min && value <= param.max,
                  `guide[${i}] ${id} out of range`
                );
              }
              return evaluateBoard(board, { ...step.set });
            }),
          ];
          // edulab's rule: what you drag is what you read. A handle dropped
          // where it already is must leave its params unchanged.
          for (const frame of frames) {
            for (const shape of frame.shapes) {
              if (shape.kind !== 'point' || !shape.drag) continue;
              const next = dragTargets(shape.drag, shape.at, board.spec);
              for (const [id, value] of Object.entries(next)) {
                assert.ok(
                  Math.abs(value - frame.values[id]) < 1e-6,
                  `dragging ${id} at rest moves it: ${frame.values[id]} → ${value}`
                );
              }
            }
          }

          for (const frame of frames) {
            assert.ok(frame.shapes.length > 0);
            for (const shape of frame.shapes) {
              const points =
                shape.kind === 'path' ? shape.lines.flat() : [shape.at];
              points.forEach(([x, y]) =>
                assert.ok(Number.isFinite(x) && Number.isFinite(y))
              );
            }
          }
        });
      }
    });
  }
});

describe('lab suites', () => {
  it('file every public chapter in exactly one suite', () => {
    for (const lab of LABS.filter((item) => item.publication === 'public')) {
      const suites = LAB_SUITES.filter((suite) => suite.chapters.includes(lab));
      assert.equal(
        suites.length,
        1,
        `${lab.slug} is in ${suites.length} suites`
      );
    }
  });

  it('puts every suite under a known subject, and every public subject has a suite', () => {
    const ids = new Set(LAB_SUBJECTS.map((subject) => subject.id));
    for (const suite of LAB_SUITES)
      assert.ok(ids.has(suite.subject), suite.slug);
    for (const subject of publicSubjects()) {
      assert.ok(suitesForSubject(subject.id).length > 0, subject.id);
    }
  });

  it('ships a share image and an ISO update date for every chapter', () => {
    for (const lab of LABS.filter((item) => item.publication === 'public')) {
      assert.match(lab.updated, /^\d{4}-\d{2}-\d{2}$/, lab.slug);
      for (const lang of LANGS) {
        const file = new URL(
          `../public${labOgImage(lab, lang)}`,
          import.meta.url
        );
        assert.ok(
          existsSync(file),
          `missing ${labOgImage(lab, lang)}: run scripts/lab-og-images.mjs`
        );
      }
    }
  });

  it('file every chapter in at most one suite, with unique URLs', () => {
    const seen = new Set<string>();
    for (const suite of LAB_SUITES) {
      assert.match(suite.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(
        !getLab(suite.slug),
        `suite ${suite.slug} collides with a lab slug`
      );
      assert.ok(suite.chapters.length > 0);
      for (const lab of suite.chapters) {
        assert.ok(!seen.has(lab.slug), `${lab.slug} is in two suites`);
        seen.add(lab.slug);
        assert.equal(suiteForLab(lab.slug), suite);
      }
    }
    const paths = LABS.map(labPath);
    assert.equal(new Set(paths).size, paths.length);
  });

  it('keeps subject slugs free for the subject pages', () => {
    for (const suite of LAB_SUITES) {
      assert.ok(
        !LAB_SUBJECTS.some((subject) => subject.id === suite.slug),
        `suite ${suite.slug} collides with a subject page`
      );
    }
  });

  it('serves the opening chapter at the suite URL', () => {
    for (const suite of LAB_SUITES) {
      assert.equal(
        chapterPath(suite, suite.chapters[0]),
        `/labs/${suite.slug}`
      );
      suite.chapters
        .slice(1)
        .forEach((lab) =>
          assert.equal(
            chapterPath(suite, lab),
            `/labs/${suite.slug}/${lab.slug}`
          )
        );
    }
  });
});

// The guide narrates specific numbers. These pin them to the board, so a
// change to a formula cannot silently contradict the copy.
describe('lab guide claims', () => {
  const at = (slug: string, values: Record<string, number>) =>
    evaluateBoard(labBoard(getLab(slug)!, 'en'), values);
  const close = (actual: number, expected: number, digits = 2) =>
    assert.ok(
      Math.abs(actual - expected) < 0.5 * 10 ** -digits,
      `${actual} ≉ ${expected}`
    );

  it('derivative: secant slope is 2 + h at x0 = 1, tangent slope 2x0', () => {
    for (const h of [1.5, 0.5, 0.05]) {
      close(
        readout(
          at('derivative-tangent-slope', { x0: 1, h }),
          '\\dfrac{\\Delta y}{h}'
        ),
        2 + h,
        3
      );
    }
    close(
      readout(at('derivative-tangent-slope', { x0: -1, h: 0.05 }), "f'(x_0)"),
      -2,
      3
    );
  });

  it('riemann: left sums and exact area match the narrated values', () => {
    const sum = (n: number) =>
      readout(at('riemann-sum-area', { n, b: 3 }), 'L_n');
    close(sum(2), 2.34375, 4);
    close(sum(4), 2.9765625, 4);
    close(sum(16), 3.54345703125, 4);
    close(sum(60), 3.6940625, 4);
    close(
      readout(at('riemann-sum-area', { n: 4, b: 3 }), '\\int_0^b f\\,dx'),
      3.75,
      6
    );
    // Brute-force check of the closed form.
    const f = (x: number) => (x * x) / 4 + 0.5;
    const brute = Array.from(
      { length: 16 },
      (_, i) => f((i * 3) / 16) * (3 / 16)
    ).reduce((a, b) => a + b);
    close(sum(16), brute, 9);
  });

  it('unit circle: special angles', () => {
    close(
      readout(at('unit-circle-sine', { th: Math.PI / 6 }), '\\sin\\theta'),
      0.5,
      6
    );
    close(
      readout(
        at('unit-circle-sine', { th: (3 * Math.PI) / 2 }),
        '\\sin\\theta'
      ),
      -1,
      6
    );
  });

  it('quadratic: roots at 2 ± √3 for h = 2, k = −3', () => {
    const frame = at('quadratic-transformations', { a: 1, h: 2, k: -3 });
    close(readout(frame, 'x_1'), 2 - Math.sqrt(3), 6);
    close(readout(frame, 'x_2'), 2 + Math.sqrt(3), 6);
    assert.ok(
      Number.isNaN(
        readout(at('quadratic-transformations', { a: 1, h: 0, k: 1 }), 'x_1')
      )
    );
  });

  it('conics: |PF| / |PD| equals e on both branches', () => {
    for (const e of [0.5, 1, 1.5]) {
      for (const t0 of [0.3, 2, 4]) {
        close(
          readout(at('conic-sections-eccentricity', { e, t0 }), '|PF| / |PD|'),
          e,
          6
        );
      }
    }
  });

  // Answer bands and status readouts describe the same cases; they must agree.
  it('conics: the ellipse band is exactly where the curve closes', () => {
    const board = labBoard(getLab('conic-sections-eccentricity')!, 'en');
    const bands = board.spec.params.find((p) => p.id === 'e')!.bands!;
    for (let e = 0; e <= 2.0001; e += 0.01) {
      const frame = evaluateBoard(board, { e, t0: 2 });
      const status = frame.readouts.find((r) => r.kind === 'status');
      assert.ok(status && status.kind === 'status');
      const band = bands.find((b) => e >= b.from - 1e-9 && e <= b.to + 1e-9);
      if (band)
        assert.equal(
          status.ok,
          band.label === 'ellipse',
          `e = ${e.toFixed(2)}`
        );
    }
  });

  it('quadratic: the roots status matches the narrated root count', () => {
    const status = (values: Record<string, number>) => {
      const found = at('quadratic-transformations', values).readouts.find(
        (r) => r.kind === 'status'
      );
      assert.ok(found && found.kind === 'status');
      return found.ok;
    };
    assert.equal(status({ a: 1, h: 2, k: -3 }), true);
    assert.equal(status({ a: 1, h: 0, k: 1 }), false);
    assert.equal(status({ a: -1, h: 0, k: 1 }), true);
  });

  it('pythagoras: 3-4-5 scaled by 0.6', () => {
    close(
      readout(
        at('pythagorean-theorem-rearrangement', { a: 2.4, b: 1.8, s: 0 }),
        'c'
      ),
      3,
      6
    );
  });

  it('v–t: rectangle, triangle, trapezoid, and the turn-around', () => {
    const f = (values: Record<string, number>) =>
      at('uniform-acceleration-vt', values);
    const x = 'x = v_0t + \\tfrac12 at^2';
    close(readout(f({ v0: 3, a: 0, T: 4 }), x), 12, 6);
    close(readout(f({ v0: 0, a: 2, T: 4 }), x), 16, 6);
    close(readout(f({ v0: 0, a: 2, T: 4 }), 'v = v_0 + at'), 8, 6);
    close(readout(f({ v0: 2, a: 1, T: 4 }), x), 16, 6);
    close(readout(f({ v0: 2, a: 1, T: 4 }), 'v = v_0 + at'), 6, 6);
    const turn = f({ v0: 6, a: -2, T: 5 });
    close(readout(turn, x), 5, 6);
    close(readout(turn, 'v = v_0 + at'), -4, 6);
    close(readout(turn, '\\text{distance}'), 13, 6);
  });

  it('projectile: cliff throw, 45° and complementary angles', () => {
    const f = (values: Record<string, number>) =>
      at('projectile-motion', { T: 5, ...values });
    const range = '\\text{range}';
    const cliff = f({ v0: 10, deg: 0, h0: 20 });
    close(readout(cliff, 't_{\\text{flight}}'), 2.02, 2);
    close(readout(cliff, range), 20.2, 1);
    const flat = f({ v0: 12, deg: 45, h0: 0 });
    close(readout(flat, 't_{\\text{flight}}'), 1.73, 2);
    close(readout(flat, 'H_{\\max}'), 3.67, 2);
    close(readout(flat, range), 14.69, 2);
    close(readout(f({ v0: 12, deg: 30, h0: 0 }), range), 12.73, 2);
    close(readout(f({ v0: 12, deg: 60, h0: 0 }), range), 12.73, 2);
    // 45° is the best angle from level ground.
    for (const deg of [40, 50]) {
      assert.ok(
        readout(f({ v0: 12, deg, h0: 0 }), range) < readout(flat, range)
      );
    }
  });

  it('circular motion: v = ωr, a = ω²r, F = mω²r', () => {
    const f = (values: Record<string, number>) =>
      at('circular-motion', { th: 1, ...values });
    const a = 'a = \\omega^2 r';
    close(readout(f({ r: 2, w: 1, m: 1 }), 'v = \\omega r'), 2, 6);
    close(readout(f({ r: 2, w: 1, m: 1 }), a), 2, 6);
    close(readout(f({ r: 2, w: 1, m: 1 }), 'T = 2\\pi/\\omega'), 6.28, 2);
    close(readout(f({ r: 2, w: 2, m: 1 }), a), 8, 6);
    close(readout(f({ r: 1, w: 2, m: 1 }), 'v = \\omega r'), 2, 6);
    close(readout(f({ r: 1, w: 2, m: 1 }), a), 4, 6);
    close(readout(f({ r: 2, w: 2, m: 2 }), 'F = m\\omega^2 r'), 16, 6);
  });

  it('river: crossing time, drift and the straight-across heading', () => {
    const f = (values: Record<string, number>) =>
      at('relative-motion-river', { T: 12, ...values });
    const drift = '\\text{drift}';
    const time = 't_{\\text{cross}}';
    close(readout(f({ u: 3, deg: 90, w: 2 }), time), 2, 6);
    close(readout(f({ u: 3, deg: 90, w: 2 }), drift), 4, 6);
    close(readout(f({ u: 3, deg: 90, w: 4 }), time), 2, 6);
    close(readout(f({ u: 3, deg: 90, w: 4 }), drift), 8, 6);
    const across = f({ u: 3, deg: 132, w: 2 });
    close(readout(across, time), 2.69, 2);
    assert.ok(Math.abs(readout(across, drift)) < 0.1);
    const status = across.readouts.find((r) => r.kind === 'status');
    assert.ok(status && status.kind === 'status' && status.ok);
    const slow = (deg: number) => readout(f({ u: 2, deg, w: 3 }), drift);
    close(slow(132), 6.71, 2);
    // 132° is the least drift a slow boat can manage.
    for (let deg = 30; deg <= 150; deg += 1)
      assert.ok(slow(deg) >= slow(132) - 0.01);
  });

  it('incline: static at 20°, tips past tan θ = μ, a = 2.55 at 40° for any mass', () => {
    const f = (values: Record<string, number>) =>
      at('inclined-plane-forces', { mu: 0.5, m: 2, ...values });
    const status = (values: Record<string, number>) => {
      const found = f(values).readouts.find((r) => r.kind === 'status');
      assert.ok(found && found.kind === 'status');
      return found.ok;
    };
    const gentle = f({ deg: 20 });
    close(readout(gentle, 'mg\\sin\\theta'), 6.7, 2);
    close(readout(gentle, 'N = mg\\cos\\theta'), 18.42, 2);
    close(readout(gentle, 'f_{\\max} = \\mu N'), 9.21, 2);
    close(readout(gentle, 'f'), 6.7, 2);
    close(readout(gentle, 'a'), 0, 6);
    assert.equal(status({ deg: 26 }), false);
    assert.equal(status({ deg: 27 }), true);
    assert.ok(Math.abs((Math.atan(0.5) * 180) / Math.PI - 26.6) < 0.05);
    close(readout(f({ deg: 27 }), 'a'), 0.08, 2);
    close(readout(f({ deg: 40 }), 'a'), 2.55, 2);
    const heavy = f({ deg: 40, m: 8 });
    close(readout(heavy, 'a'), 2.55, 2);
    close(readout(heavy, 'mg\\sin\\theta'), 50.39, 2);
  });

  it('spring: T = 2π√(m/k) and v_max = Aω', () => {
    const f = (values: Record<string, number>) =>
      at('spring-oscillator', { T: 0, ...values });
    const period = 'T = 2\\pi\\sqrt{m/k}';
    const first = f({ k: 8, m: 2, A: 1.5 });
    close(readout(first, '\\omega = \\sqrt{k/m}'), 2, 6);
    close(readout(first, period), 3.14, 2);
    close(readout(first, 'v_{\\max} = A\\omega'), 3, 6);
    close(readout(f({ k: 32, m: 2, A: 1.5 }), period), 1.57, 2);
    close(readout(f({ k: 8, m: 8, A: 1.5 }), period), 6.28, 2);
    const small = f({ k: 8, m: 2, A: 0.5 });
    close(readout(small, period), 3.14, 2);
    close(readout(small, 'v_{\\max} = A\\omega'), 1, 6);
    // The mass really is back where it started after one period.
    const again = f({ k: 8, m: 2, A: 1.5, T: Math.PI });
    close(readout(again, 'x'), 1.5, 4);
  });

  it('pendulum: 2.01 s, half at a quarter length, 7% slow at 60°, seconds pendulum', () => {
    const f = (values: Record<string, number>) =>
      at('simple-pendulum', { m: 0.5, deg: 10, ...values });
    const t0 = 'T_0 = 2\\pi\\sqrt{L/g}';
    close(readout(f({ L: 1 }), t0), 2.01, 2);
    close(readout(f({ L: 0.25 }), t0), 1.0, 2);
    const wide = f({ L: 1, deg: 60 });
    close(readout(wide, 'T_{\\text{true}}'), 2.15, 2);
    close(readout(wide, 'T_{\\text{true}} / T_0'), 1.073, 3);
    close(readout(f({ L: 0.99, m: 2 }), t0), 2.0, 2);
    // The series agrees with the exact elliptic-integral period at 60°.
    let a = 1;
    let b = Math.cos(Math.PI / 6);
    for (let i = 0; i < 10; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
    close(readout(wide, 'T_{\\text{true}} / T_0'), 1 / a, 4);
  });

  it('pendulum: the small-angle band is where the formula is within 0.2%', () => {
    const board = labBoard(getLab('simple-pendulum')!, 'en');
    const band = board.spec.params.find((p) => p.id === 'deg')!.bands![0];
    for (let deg = 2; deg <= 60; deg++) {
      const status = evaluateBoard(board, { deg }).readouts.find(
        (r) => r.kind === 'status'
      );
      assert.ok(status && status.kind === 'status');
      assert.equal(status.ok, deg >= band.from && deg <= band.to, `${deg}°`);
    }
  });

  it('energy: 29.4 J shared out, √(2gh) at the bottom, stops at h/μ', () => {
    const f = (values: Record<string, number>) =>
      at('energy-conservation', { h: 3, m: 1, ...values });
    const total = 'E_p + E_k + Q';
    const half = f({ mu: 0, X: -3 });
    close(readout(half, 'E_p = mgy'), 7.35, 6);
    close(readout(half, 'E_k = \\tfrac12 mv^2'), 22.05, 6);
    close(readout(half, 'v'), 6.64, 2);
    close(readout(half, total), 29.4, 6);
    const bottom = f({ mu: 0, X: 0 });
    close(readout(bottom, 'E_k = \\tfrac12 mv^2'), 29.4, 6);
    close(readout(bottom, 'v'), 7.67, 2);
    const rough = f({ mu: 0.3, X: 5 });
    close(readout(rough, 'Q = \\mu mg\\,s'), 14.7, 6);
    close(readout(rough, 'v'), 5.42, 2);
    close(readout(rough, total), 29.4, 6);
    const stop = f({ mu: 0.3, X: 10, m: 2 });
    close(readout(stop, 'Q = \\mu mg\\,s'), 58.8, 6);
    close(readout(stop, 'v'), 0, 6);
    // Past the stopping point the block stays put.
    close(readout(f({ mu: 0.3, X: 12, m: 2 }), 'Q = \\mu mg\\,s'), 58.8, 6);
  });

  it('wave: v = λf, same speed at twice the frequency, P waits then bobs', () => {
    const f = (values: Record<string, number>) =>
      at('wave-propagation', { A: 1, xp: 6, T: 5, ...values });
    const status = (values: Record<string, number>) => {
      const found = f(values).readouts.find((r) => r.kind === 'status');
      assert.ok(found && found.kind === 'status');
      return found.ok;
    };
    close(readout(f({ lam: 4, f: 0.5 }), 'v = \\lambda f'), 2, 6);
    close(readout(f({ lam: 4, f: 0.5 }), 'T = 1/f'), 2, 6);
    close(readout(f({ lam: 2, f: 1 }), 'v = \\lambda f'), 2, 6);
    close(readout(f({ lam: 4, f: 0.5 }), 't_{\\text{arrive}} = x_P / v'), 3, 6);
    assert.equal(status({ lam: 4, f: 0.5, T: 2.5 }), false);
    close(readout(f({ lam: 4, f: 0.5, T: 2.5 }), 'y_P'), 0, 6);
    assert.equal(status({ lam: 4, f: 0.5, T: 3.5 }), true);
    close(readout(f({ lam: 4, f: 0.5, T: 3.5 }), 'y_P'), 1, 6);
  });

  it('interference: Δr = 0, λ/2, λ and the number of loud lines', () => {
    const f = (values: Record<string, number>) =>
      at('wave-interference', { d: 4, lam: 1.5, ...values });
    const statuses = (values: Record<string, number>) =>
      f(values).readouts.flatMap((r) => (r.kind === 'status' ? [r.ok] : []));
    const ratio = '\\Delta r / \\lambda';
    const bisector = f({ px: 0, py: 2.5 });
    close(readout(bisector, ratio), 0, 6);
    close(readout(bisector, 'A_P / A'), 2, 6);
    assert.deepEqual(statuses({ px: 0, py: 2.5 }), [true, false]);
    const quiet = f({ px: 0.375, py: 0 });
    close(readout(quiet, '|PS_1|'), 2.375, 6);
    close(readout(quiet, '|PS_2|'), 1.625, 6);
    close(readout(quiet, '\\Delta r = |PS_1| - |PS_2|'), 0.75, 6);
    close(readout(quiet, 'A_P / A'), 0, 6);
    assert.deepEqual(statuses({ px: 0.375, py: 0 }), [false, true]);
    close(readout(f({ px: 0.75, py: 0 }), ratio), 1, 6);
    assert.deepEqual(statuses({ px: 0.75, py: 0 }), [true, false]);
    const count = 'N = 2\\lceil d/\\lambda\\rceil - 1';
    close(readout(f({ px: 1.5, py: 2.5 }), count), 5, 6);
    close(readout(f({ lam: 1, px: 1.5, py: 2.5 }), count), 7, 6);
    close(readout(f({ d: 3, lam: 1, px: 1.5, py: 2.5 }), count), 5, 6);
    // Every visible green line really has Δr = mλ along it.
    const board = labBoard(getLab('wave-interference')!, 'en');
    const frame = evaluateBoard(board, { d: 4, lam: 1.5, px: 0, py: 0 });
    const green = frame.shapes.filter(
      (s) => s.kind === 'path' && s.style.color === 'green'
    );
    assert.equal(green.length, 5);
    for (const shape of green) {
      assert.ok(shape.kind === 'path');
      const pts = shape.lines.flat();
      const diff = ([x, y]: readonly number[]) =>
        Math.hypot(x + 2, y) - Math.hypot(x - 2, y);
      const m = diff(pts[0]) / 1.5;
      assert.ok(Math.abs(m - Math.round(m)) < 1e-6);
      for (const p of pts) assert.ok(Math.abs(diff(p) - diff(pts[0])) < 1e-6);
    }
  });

  it('doppler: 500 Hz at rest, 34, 170 and 400 m/s', () => {
    const f = (vs: number) => at('doppler-effect', { vs, f0: 500, T: 8 });
    const ahead = 'f_{\\text{ahead}} = f_0\\dfrac{c}{c - v_s}';
    const behind = 'f_{\\text{behind}} = f_0\\dfrac{c}{c + v_s}';
    close(readout(f(0), ahead), 500, 6);
    close(readout(f(0), '\\lambda_{\\text{ahead}}'), 0.68, 6);
    close(readout(f(34), ahead), 555.6, 1);
    close(readout(f(34), behind), 454.5, 1);
    close(readout(f(34), '\\lambda_{\\text{ahead}}'), 0.612, 6);
    close(readout(f(34), '\\lambda_{\\text{behind}}'), 0.748, 6);
    close(readout(f(170), ahead), 1000, 6);
    close(readout(f(170), behind), 333.3, 1);
    const fast = f(400);
    assert.ok(Number.isNaN(readout(fast, ahead)));
    close(readout(fast, '\\alpha\\,(^\\circ)'), 58.2, 1);
    const status = fast.readouts.find((r) => r.kind === 'status');
    assert.ok(status && status.kind === 'status' && !status.ok);
  });
  it('exponential: 2^1, 2^3, 0.5^-2 and the slope ln a at (0, 1)', () => {
    const y = 'y_0 = a^{x_0}';
    const slope = '\\ln a\\ (\\text{slope at } (0,1))';
    close(readout(at('exponential-logarithm', { a: 2, x0: 1 }), y), 2, 6);
    const eight = at('exponential-logarithm', { a: 2, x0: 3 });
    close(readout(eight, y), 8, 6);
    close(readout(eight, '\\log_a y_0'), 3, 6);
    close(readout(at('exponential-logarithm', { a: 0.5, x0: -2 }), y), 4, 6);
    close(
      readout(at('exponential-logarithm', { a: 2, x0: 0 }), slope),
      0.693,
      3
    );
    close(
      readout(at('exponential-logarithm', { a: 2.7, x0: 0 }), slope),
      0.993,
      3
    );
    const rising = (a: number) => {
      const status = at('exponential-logarithm', { a, x0: 0 }).readouts.find(
        (r) => r.kind === 'status'
      );
      return status?.kind === 'status' && status.ok;
    };
    assert.equal(rising(1.1), true);
    assert.equal(rising(0.9), false);
  });

  it('sinusoid: periods 2π and π, shift −π/6 and peak π/12 at φ = 60°', () => {
    const T = 'T = \\dfrac{2\\pi}{\\omega}';
    close(
      readout(at('sinusoidal-function', { A: 1, w: 1, phi: 0 }), T),
      6.283,
      3
    );
    close(
      readout(at('sinusoidal-function', { A: 2, w: 2, phi: 0 }), T),
      3.142,
      3
    );
    const shifted = at('sinusoidal-function', { A: 2, w: 2, phi: 60 });
    const xs = readout(shifted, '-\\dfrac{\\varphi}{\\omega}');
    const peak = readout(shifted, 'x_{\\text{peak}}');
    close(xs, -Math.PI / 6, 6);
    close(peak, Math.PI / 12, 6);
    close(xs, -0.524, 3);
    close(peak, 0.262, 3);
    // The marked start is a rising zero and the marked peak reaches A.
    const f = (x: number) => 2 * Math.sin(2 * x + Math.PI / 3);
    close(f(xs), 0, 9);
    assert.ok(f(xs + 0.01) > 0);
    close(f(peak), 2, 9);
  });

  it('monotonicity: f′ = 9 and −3, extrema ±2, none for x³', () => {
    const fp = "f'(x_0) = 3x_0^2 - 3a";
    const max = '\\text{local max } f(-\\sqrt a)';
    const min = '\\text{local min } f(\\sqrt a)';
    const left = at('monotonicity-extrema', { a: 1, x0: -2 });
    close(readout(left, fp), 9, 6);
    close(readout(left, 'f(x_0)'), -2, 6);
    close(readout(at('monotonicity-extrema', { a: 1, x0: 0 }), fp), -3, 6);
    const top = at('monotonicity-extrema', { a: 1, x0: -1 });
    close(readout(top, fp), 0, 6);
    close(readout(top, max), 2, 6);
    close(readout(top, min), -2, 6);
    const cube = at('monotonicity-extrema', { a: 0, x0: 0 });
    close(readout(cube, fp), 0, 6);
    assert.ok(Number.isNaN(readout(cube, max)));
    // The extrema really are the largest and smallest values nearby.
    for (const a of [0.5, 1, 2]) {
      const frame = at('monotonicity-extrema', { a, x0: 0 });
      const f = (x: number) => x ** 3 - 3 * a * x;
      const r = Math.sqrt(a);
      close(readout(frame, max), f(-r), 6);
      assert.ok(f(-r) > f(-r - 0.01) && f(-r) > f(-r + 0.01));
      assert.ok(f(r) < f(r - 0.01) && f(r) < f(r + 0.01));
    }
  });

  it('bisection: brackets on [0, 1] and the same-sign interval [−1, 2]', () => {
    const bracket = (lo: number, hi: number, n: number) => {
      const frame = at('zeros-bisection', { lo, hi, n });
      return [readout(frame, 'a_n'), readout(frame, 'b_n')];
    };
    const start = at('zeros-bisection', { lo: 0, hi: 1, n: 0 });
    close(readout(start, 'm = \\tfrac{a_n + b_n}{2}'), 0.5, 6);
    close(readout(start, 'f(m)'), -0.375, 6);
    assert.deepEqual(bracket(0, 1, 3), [0.25, 0.375]);
    const seven = at('zeros-bisection', { lo: 0, hi: 1, n: 7 });
    close(readout(seven, 'a_n'), 0.3438, 4);
    close(readout(seven, 'b_n'), 0.3516, 4);
    close(readout(seven, 'b_n - a_n'), 0.0078, 4);
    close(readout(seven, 'm = \\tfrac{a_n + b_n}{2}'), 0.3477, 4);
    // The true zero, 0.3473, stays inside and within 0.004 of the midpoint.
    const root = 0.347296355;
    const [a7, b7] = bracket(0, 1, 7);
    assert.ok(a7 < root && root < b7);
    assert.ok(
      Math.abs(readout(seven, 'm = \\tfrac{a_n + b_n}{2}') - root) < 0.004
    );
    // Matches a plain loop for other starting intervals.
    const f = (x: number) => x ** 3 - 3 * x + 1;
    for (const [lo, hi] of [
      [-2, 2],
      [1, 2],
      [-2, -1],
      [-1, 2],
    ]) {
      for (const n of [0, 4, 10]) {
        let a = lo;
        let b = hi;
        for (let k = 0; k < n; k += 1) {
          const m = (a + b) / 2;
          if (f(a) * f(m) <= 0) b = m;
          else a = m;
        }
        assert.deepEqual(bracket(lo, hi, n), [a, b]);
      }
    }
    const sign = (lo: number, hi: number) => {
      const status = at('zeros-bisection', { lo, hi, n: 0 }).readouts.find(
        (r) => r.kind === 'status'
      );
      return status?.kind === 'status' && status.ok;
    };
    assert.equal(sign(0, 1), true);
    assert.equal(sign(-1, 2), false);
  });
  it('ellipse: |PF₁| + |PF₂| = 2a all the way round, b from the 3-4-5 triangle', () => {
    const sum = '|PF_1| + |PF_2|';
    const first = at('ellipse-definition', { a: 4, c: 2.4, t: 1.2 });
    close(readout(first, '|PF_1|'), 4.713, 3);
    close(readout(first, '|PF_2|'), 3.287, 3);
    for (let t = 0; t < 6.28; t += 0.37) {
      close(readout(at('ellipse-definition', { a: 4, c: 2.4, t }), sum), 8, 9);
    }
    const top = at('ellipse-definition', { a: 4, c: 2.4, t: Math.PI / 2 });
    close(readout(top, '|PF_1|'), 4, 9);
    close(readout(top, 'b = \\sqrt{a^2 - c^2}'), 3.2, 9);
    close(
      readout(at('ellipse-definition', { a: 4, c: 0, t: 1.2 }), 'e = c / a'),
      0,
      9
    );
    const flat = at('ellipse-definition', { a: 4, c: 3.8, t: 1.2 });
    close(readout(flat, 'b = \\sqrt{a^2 - c^2}'), 1.249, 3);
    close(readout(flat, 'e = c / a'), 0.95, 9);
    const none = at('ellipse-definition', { a: 3, c: 4, t: 1 });
    assert.ok(Number.isNaN(readout(none, sum)));
  });

  it('parabola: |PF| = |PD|, focal radii 4 and 4/3, latus rectum 2p', () => {
    for (const yp of [-5, -1.3, 0, 2, 4, 5]) {
      const frame = at('parabola-focal-chord', { p: 2, yp, deg: 60 });
      close(
        readout(frame, '|PF|'),
        readout(frame, '|PD| = x_P + \\tfrac{p}{2}'),
        9
      );
    }
    close(
      readout(at('parabola-focal-chord', { p: 2, yp: 2, deg: 60 }), '|PF|'),
      2,
      9
    );
    close(
      readout(at('parabola-focal-chord', { p: 2, yp: 4, deg: 60 }), '|PF|'),
      5,
      9
    );
    const chord = at('parabola-focal-chord', { p: 2, yp: 4, deg: 60 });
    close(readout(chord, '|AF|'), 4, 9);
    close(readout(chord, '|BF|'), 1.333, 3);
    close(readout(chord, '|AB|'), 5.333, 3);
    close(
      readout(at('parabola-focal-chord', { p: 2, yp: 2, deg: 90 }), '|AB|'),
      4,
      9
    );
    close(
      readout(at('parabola-focal-chord', { p: 2, yp: 2, deg: 30 }), '|AB|'),
      16,
      9
    );
    // A and B really lie on y² = 2px, and the chord formulas agree for any p, α.
    for (const p of [0.5, 2, 3.7]) {
      for (const deg of [15, 45, 90, 120, 165]) {
        const frame = at('parabola-focal-chord', { p, yp: 0, deg });
        const { ax, ay, bx, by } = frame.values;
        close(ay * ay, 2 * p * ax, 6);
        close(by * by, 2 * p * bx, 6);
        close(Math.hypot(ax - bx, ay - by), readout(frame, '|AB|'), 6);
        close(
          readout(frame, '|AB|'),
          readout(frame, '\\dfrac{2p}{\\sin^2\\alpha}'),
          6
        );
        close(readout(frame, '\\dfrac{1}{|AF|} + \\dfrac{1}{|BF|}'), 2 / p, 9);
      }
    }
  });

  it('hyperbola: |PF₁| − |PF₂| = 2a, gap 0.621 → 0.220, c = 2.5', () => {
    const diff = '|PF_1| - |PF_2|';
    const gap = '\\text{gap to asymptote}';
    const first = at('hyperbola-asymptotes', { a: 2, b: 1.5, py: 1.5 });
    close(readout(first, '|PF_1|'), 5.536, 3);
    close(readout(first, '|PF_2|'), 1.536, 3);
    close(readout(first, gap), 0.621, 3);
    close(
      readout(at('hyperbola-asymptotes', { a: 2, b: 1.5, py: 5 }), gap),
      0.22,
      3
    );
    let last = Infinity;
    for (let py = 0; py <= 5; py += 0.5) {
      const frame = at('hyperbola-asymptotes', { a: 2, b: 1.5, py });
      close(readout(frame, diff), 4, 9);
      const g = readout(frame, gap);
      assert.ok(g > 0 && g < last, `gap ${g} at ${py}`);
      last = g;
    }
    const vertex = at('hyperbola-asymptotes', { a: 2, b: 1.5, py: 0 });
    close(readout(vertex, '|PF_1|'), 4.5, 9);
    close(readout(vertex, '|PF_2|'), 0.5, 9);
    close(readout(vertex, 'c = \\sqrt{a^2 + b^2}'), 2.5, 9);
    close(readout(vertex, 'e = c / a'), 1.25, 9);
    close(readout(vertex, '\\pm\\dfrac{b}{a}'), 0.75, 9);
    close(
      readout(at('hyperbola-asymptotes', { a: 2, b: 2, py: 1.5 }), 'e = c / a'),
      Math.SQRT2,
      9
    );
  });

  it('inscribed angle: half the arc, wherever P is', () => {
    const deg = Math.PI / 180;
    const f = (tA: number, tB: number, tP: number) =>
      at('inscribed-angle-theorem', {
        tA: tA * deg,
        tB: tB * deg,
        tP: tP * deg,
      });
    const apb = '\\angle APB';
    const arc = '\\overset{\\frown}{AB}';
    const first = f(210, 330, 100);
    close(readout(first, apb), 60, 1);
    close(readout(first, arc), 120, 1);
    close(readout(first, `${arc} \\div \\angle APB`), 2, 6);
    close(readout(f(210, 330, 160), apb), 60, 6);
    const opposite = f(210, 330, 30);
    close(readout(opposite, '\\angle OPB'), 60, 6);
    close(readout(opposite, apb), 60, 6);
    const diameter = f(180, 0, 63);
    close(readout(diameter, apb), 90, 6);
    const right = diameter.readouts.find((r) => r.kind === 'status');
    assert.ok(right && right.kind === 'status' && right.ok);
    const below = f(210, 330, 270);
    close(readout(below, apb), 120, 6);
    close(readout(below, arc), 240, 6);
    // Brute force: any chord, any P off it, any side of O.
    for (const [tA, tB] of [
      [10, 80],
      [200, 40],
      [300, 290],
      [45, 225],
    ]) {
      for (let tP = 3; tP < 360; tP += 17) {
        const frame = f(tA, tB, tP);
        close(readout(frame, `${arc} \\div \\angle APB`), 2, 6);
        close(readout(frame, '\\angle OPA'), readout(frame, '\\angle OAP'), 6);
      }
    }
  });

  it('homothety: sides times |k|, angles kept, area times k²', () => {
    const f = (values: Record<string, number>) =>
      at('similarity-homothety', { ox: -5, oy: -2, ax: -2, ay: 1, ...values });
    const sides = ["|A'B'| / |AB|", "|B'C'| / |BC|", "|C'A'| / |CA|"];
    const area = "S_{A'B'C'} / S_{ABC}";
    const first = f({ k: 2 });
    sides.forEach((label) => close(readout(first, label), 2, 6));
    close(readout(first, '\\angle A'), 71.6, 1);
    close(readout(first, "\\angle A'"), 71.6, 1);
    close(readout(first, area), 4, 6);
    close(readout(f({ k: 1.5 }), area), 2.25, 6);
    const inside = f({ k: 1.5, ox: -1.5, oy: -0.3 });
    sides.forEach((label) => close(readout(inside, label), 1.5, 6));
    const flip = f({ k: -1, ox: -1.5, oy: -0.3 });
    sides.forEach((label) => close(readout(flip, label), 1, 6));
    close(readout(flip, area), 1, 6);
    for (const k of [-1.5, -0.4, 0.3, 1, 2.5]) {
      for (const [ox, oy] of [
        [0, 0],
        [6, -4],
        [-2, 1.5],
      ]) {
        for (const [ax, ay] of [
          [-2, 1],
          [3, 4],
          [-6, -3],
        ]) {
          const frame = f({ k, ox, oy, ax, ay });
          sides.forEach((label) =>
            close(readout(frame, label), Math.abs(k), 6)
          );
          close(readout(frame, area), k * k, 6);
          close(readout(frame, "\\angle A'"), readout(frame, '\\angle A'), 6);
        }
      }
    }
  });

  it('dot product: the angle formula and the coordinates agree', () => {
    const f = (ax: number, ay: number, bx: number, by: number) =>
      at('vector-dot-product', { ax, ay, bx, by });
    const geo = '|\\vec a|\\,|\\vec b|\\cos\\theta';
    const dot = 'x_1x_2 + y_1y_2';
    const proj = '|\\vec b|\\cos\\theta';
    const sum = '|\\vec a + \\vec b|';
    const first = f(4, 1, 1.5, 3);
    close(readout(first, '|\\vec a|'), 4.123, 3);
    close(readout(first, '|\\vec b|'), 3.354, 3);
    close(readout(first, '\\theta'), 49.4, 1);
    close(readout(first, geo), 9, 6);
    close(readout(first, dot), 9, 9);
    close(readout(first, sum), 6.801, 3);
    close(readout(first, '|\\vec a|') + readout(first, '|\\vec b|'), 7.477, 3);
    const perp = f(4, 1, -1, 4);
    close(readout(perp, '\\theta'), 90, 6);
    close(readout(perp, dot), 0, 9);
    close(readout(perp, proj), 0, 6);
    close(readout(perp, sum) ** 2, 34, 6);
    const obtuse = f(4, 1, -3, 1);
    close(readout(obtuse, '\\theta'), 147.5, 1);
    close(readout(obtuse, proj), -2.668, 3);
    close(readout(obtuse, dot), -11, 9);
    for (let i = 0; i < 40; i += 1) {
      const v = [
        7 * Math.sin(i * 1.3),
        5 * Math.cos(i * 0.7),
        6 * Math.cos(i * 2.1),
        4 * Math.sin(i * 0.9 + 1),
      ];
      const frame = f(v[0], v[1], v[2], v[3]);
      close(readout(frame, geo), readout(frame, dot), 6);
      close(
        readout(frame, sum) ** 2,
        readout(frame, '|\\vec a|') ** 2 +
          readout(frame, '|\\vec b|') ** 2 +
          2 * readout(frame, dot),
        6
      );
    }
  });

  it('combinations: slots, orders and Pascal agree', () => {
    const f = (n: number, k: number) =>
      at('permutations-combinations', { n, k });
    const P = 'A_n^k = n(n-1)\\cdots(n-k+1)';
    const C = '\\binom{n}{k}';
    const rule = '\\binom{n-1}{k-1} + \\binom{n-1}{k}';
    const sym = '\\binom{n}{n-k}';
    const first = f(5, 3);
    assert.equal(readout(first, P), 60);
    assert.equal(readout(first, 'k!'), 6);
    assert.equal(readout(first, C), 10);
    assert.equal(readout(first, rule), 10);
    assert.equal(readout(f(4, 2), C), 6);
    assert.equal(readout(f(4, 3), C), 4);
    assert.equal(readout(f(7, 2), C), 21);
    assert.equal(readout(f(7, 5), C), 21);
    assert.equal(readout(f(4, 0), C), 1);
    assert.equal(readout(f(4, 0), 'k!'), 1);
    assert.equal(readout(f(3, 5), C), 0);
    const binom = (n: number, k: number): number =>
      k < 0 || k > n ? 0 : k === 0 ? 1 : (binom(n - 1, k - 1) * n) / k;
    for (let n = 1; n <= 7; n += 1) {
      for (let k = 0; k <= 7; k += 1) {
        const frame = f(n, k);
        assert.equal(readout(frame, C), binom(n, k), `C(${n}, ${k})`);
        assert.equal(readout(frame, rule), binom(n, k), `rule ${n}, ${k}`);
        assert.equal(readout(frame, sym), binom(n, k), `sym ${n}, ${k}`);
      }
    }
  });

  it('binomial: bars, paths, mean and variance', () => {
    const f = (n: number, p: number, k: number) =>
      at('binomial-distribution', { n, p, k });
    const first = f(10, 0.3, 3);
    assert.equal(readout(first, '\\binom{n}{k}'), 120);
    close(readout(first, 'p^k(1-p)^{n-k}'), 0.002224, 6);
    close(readout(first, 'P(X = k)'), 0.2668, 4);
    close(readout(first, '\\textstyle\\sum P'), 1, 9);
    close(readout(first, '\\text{mean of bars}'), 3, 9);
    close(readout(first, '\\text{variance of bars}'), 2.1, 9);
    close(readout(f(20, 0.5, 10), 'P(X = k)'), 0.1762, 4);
    close(readout(f(20, 0.05, 0), 'P(X = k)'), 0.3585, 4);
    for (const n of [1, 4, 13, 20]) {
      for (const p of [0.05, 0.37, 0.5, 0.95]) {
        const frame = f(n, p, 0);
        close(readout(frame, '\\textstyle\\sum P'), 1, 9);
        close(readout(frame, '\\text{mean of bars}'), n * p, 9);
        close(readout(frame, '\\text{variance of bars}'), n * p * (1 - p), 9);
        // The amber bar (formula) sits on top of the blue bar (recurrence).
        for (let k = 0; k <= n; k += 1) {
          const bar = at('binomial-distribution', { n, p, k });
          close(readout(bar, 'P(X = k)'), bar.values[`P${k}`], 12);
        }
      }
    }
  });

  it('normal: the 68-95-99.7 areas for any mu and sigma', () => {
    const f = (mu: number, sg: number, k: number) =>
      at('normal-distribution', { mu, sg, k });
    const band = 'P(\\mu - k\\sigma < X < \\mu + k\\sigma)';
    close(readout(f(0, 1, 2), band), 0.9545, 4);
    close(readout(f(0, 1, 1), band), 0.6827, 4);
    close(readout(f(0, 1, 3), band), 0.9973, 4);
    close(readout(f(0, 1, 3), '\\text{outside, one side}'), 0.00135, 5);
    close(readout(f(1.5, 2, 1), band), 0.6827, 4);
    close(
      readout(f(1.5, 2, 1), 'f(\\mu) = \\tfrac{1}{\\sigma\\sqrt{2\\pi}}'),
      0.1995,
      4
    );
    close(
      readout(f(0, 0.6, 1), 'f(\\mu) = \\tfrac{1}{\\sigma\\sqrt{2\\pi}}'),
      0.6649,
      4
    );
    // erf by its Taylor series, independent of the board's Simpson sums.
    const erf = (x: number) => {
      let term = x;
      let sum = x;
      for (let n = 1; n < 80; n += 1) {
        term *= (-x * x) / n;
        sum += term / (2 * n + 1);
      }
      return (2 / Math.sqrt(Math.PI)) * sum;
    };
    for (const mu of [-3, 0, 2.2]) {
      for (const sg of [0.6, 1, 2.5]) {
        close(readout(f(mu, sg, 1), '\\text{whole area}'), 1, 6);
        for (const k of [0.5, 1, 1.96, 2, 3, 3.5]) {
          close(readout(f(mu, sg, k), band), erf(k / Math.SQRT2), 5);
        }
      }
    }
  });

  it('large numbers: the recorded runs re-simulate, and Chebyshev holds', () => {
    const rand = (seed: number) => () => {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (const [key, p] of [
      ['coin', 1 / 2],
      ['die', 1 / 6],
    ] as const) {
      const next = rand(20261013);
      const off = LLN_NS.map(() => 0);
      for (let r = 0; r < 1000; r += 1) {
        let k = 0;
        let j = 0;
        for (let n = 1; n <= 1000; n += 1) {
          if (next() < p) k += 1;
          if (n !== LLN_NS[j]) continue;
          if (Math.abs(k / n - p) >= LLN_EPS - 1e-12) off[j] += 1;
          if (r < 3) close(LLN_DATA[key].runs[r][j], k / n, 4);
          j += 1;
        }
      }
      off.forEach((count, j) => close(LLN_DATA[key].off[j], count / 1000, 9));
    }
    const f = (die: number, i: number) =>
      at('law-of-large-numbers', { die, i });
    const share = '\\text{share of runs off by} \\ge 0.05';
    const bound = '\\dfrac{p(1-p)}{n\\varepsilon^2}';
    const blue = '\\bar X_n\\ \\text{(blue run)}';
    close(readout(f(0, 4), 'n'), 10, 9);
    close(readout(f(0, 4), blue), 0.7, 9);
    close(readout(f(0, 4), share), 0.731, 9);
    close(readout(f(0, 4), bound), 10, 9);
    close(readout(f(0, 9), '\\sqrt{p(1-p)/n}'), 0.05, 9);
    close(readout(f(0, 9), share), 0.382, 9);
    close(readout(f(0, 9), bound), 1, 9);
    close(readout(f(0, 14), share), 0, 9);
    close(readout(f(0, 14), bound), 0.1, 9);
    close(readout(f(1, 14), bound), 0.056, 3);
    for (const die of [0, 1]) {
      for (let i = 0; i < LLN_NS.length; i += 1) {
        const frame = f(die, i);
        assert.equal(readout(frame, 'n'), LLN_NS[i]);
        const status = frame.readouts.find((r) => r.kind === 'status');
        assert.ok(
          status && status.kind === 'status' && status.ok,
          `${die} ${i}`
        );
      }
    }
    // The guide's claim about the die after 1000 rolls.
    for (const run of LLN_DATA.die.runs) {
      assert.ok(Math.abs(run[14] - 1 / 6) < LLN_EPS);
    }
  });
});
