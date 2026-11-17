import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { debeCorrerChequeoVisible, useVisibleInterval } from './useVisibleInterval.js';

describe('useVisibleInterval', () => {
  it('corre el chequeo solo con la pestaña visible', () => {
    assert.equal(debeCorrerChequeoVisible('visible'), true);
    assert.equal(debeCorrerChequeoVisible('hidden'), false);
  });

  it('exporta el hook', () => {
    assert.equal(typeof useVisibleInterval, 'function');
  });
});
