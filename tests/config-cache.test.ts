import assert from 'node:assert/strict';
import test from 'node:test';

import { getConfigCacheTtlMs } from '../src/modules/config/service';

test('D1 config caches converge quickly across independent Worker isolates', () => {
  assert.equal(getConfigCacheTtlMs('d1'), 5_000);
});

test('long-lived database processes retain the one-hour config cache', () => {
  for (const provider of ['sqlite', 'turso', 'postgresql', 'mysql']) {
    assert.equal(getConfigCacheTtlMs(provider), 3600_000, provider);
  }
});
