import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MATEO_PRODUCT_VERSION } from '../lib/product-version-constants.js';
import { useProductVersionCheck, versionDeployEsNueva } from './useProductVersionCheck.js';

describe('useProductVersionCheck', () => {
  it('marca actualización solo cuando el deploy trae otra versión', () => {
    assert.equal(versionDeployEsNueva(MATEO_PRODUCT_VERSION, null), false);
    assert.equal(versionDeployEsNueva(MATEO_PRODUCT_VERSION, MATEO_PRODUCT_VERSION), false);
    assert.equal(versionDeployEsNueva(MATEO_PRODUCT_VERSION, '9.9.9'), true);
  });

  it('exporta el hook', () => {
    assert.equal(typeof useProductVersionCheck, 'function');
  });
});
