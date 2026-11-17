import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isProductVersionCheckEnabled } from './is-product-version-check-enabled.js';

describe('isProductVersionCheckEnabled', () => {
  it('solo corre en producción', () => {
    assert.equal(isProductVersionCheckEnabled('production'), true);
    assert.equal(isProductVersionCheckEnabled('development'), false);
    assert.equal(isProductVersionCheckEnabled('test'), false);
  });
});
