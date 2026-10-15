import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CURVE_CATEGORY_ORDER } from '../src/content/curves';
import { getSubject, getSuite, labPath, LABS } from '../src/content/labs';
import {
  LIBRARY_REDIRECTS,
  libraryRedirectTarget,
} from '../src/routes/library/-redirects';

/** A redirect target must be a page that exists today. */
function exists(target: string): boolean {
  const [path, hash] = target.split('#');
  if (path === '/curves') {
    return !hash || CURVE_CATEGORY_ORDER.some((category) => category === hash);
  }
  if (path === '/labs') return true;
  if (LABS.some((lab) => labPath(lab) === path)) return true;
  const slug = path.replace(/^\/labs\//, '');
  return Boolean(getSuite(slug) || getSubject(slug));
}

describe('retired /library URLs', () => {
  for (const rest of Object.keys(LIBRARY_REDIRECTS)) {
    it(`/library/${rest} lands on a live page`, () => {
      const target = libraryRedirectTarget(rest);
      assert.ok(exists(target), `${rest} → ${target}`);
      if (LIBRARY_REDIRECTS[rest].startsWith('lab:')) {
        assert.notEqual(target, '/labs', `${rest} lost its chapter`);
      }
    });
  }

  it('sends unknown and trailing-slash paths somewhere sensible', () => {
    assert.equal(libraryRedirectTarget('nope/never'), '/labs');
    assert.equal(
      libraryRedirectTarget('/geometry-curves/roulette/'),
      '/curves#roulette'
    );
  });
});
