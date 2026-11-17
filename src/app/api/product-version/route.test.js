import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MATEO_PRODUCT_VERSION } from '../../../lib/product-version-constants.js';
import { GET } from './route.js';

describe('GET /api/product-version', () => {
  it('responde la versión del deploy sin caché', async () => {
    const response = await GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store, must-revalidate');
    assert.deepEqual(await response.json(), { version: MATEO_PRODUCT_VERSION });
  });
});
