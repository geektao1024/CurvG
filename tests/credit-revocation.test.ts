import assert from 'node:assert/strict';
import test from 'node:test';

import { affectedRowCount } from '../src/modules/credits/service';

test('credit revocation recognizes affected-row results from every database adapter', () => {
  assert.equal(affectedRowCount({ rowsAffected: 1 }), 1);
  assert.equal(affectedRowCount({ changes: 1 }), 1);
  assert.equal(affectedRowCount({ rowCount: 1 }), 1);
  assert.equal(affectedRowCount({ count: 1 }), 1);
  assert.equal(affectedRowCount({ meta: { changes: 1 } }), 1);
  assert.equal(affectedRowCount([{ affectedRows: 1 }]), 1);
});

test('credit revocation fails closed when a database result is ambiguous', () => {
  assert.throws(
    () => affectedRowCount({ ok: true }),
    /Unable to confirm credit revocation/
  );
});
