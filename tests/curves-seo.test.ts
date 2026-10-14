import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

import { curveGraphImage, curveOgImage, CURVES } from '../src/content/curves';
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
