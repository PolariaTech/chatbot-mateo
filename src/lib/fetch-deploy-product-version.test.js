import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchDeployProductVersion } from './fetch-deploy-product-version.js';

function respuesta(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('fetchDeployProductVersion', () => {
  it('devuelve la versión del deploy', async () => {
    const version = await fetchDeployProductVersion(async (url, opciones) => {
      assert.equal(url, '/api/product-version');
      assert.equal(opciones.cache, 'no-store');
      return respuesta({ version: ' 0.2.0 ' });
    });
    assert.equal(version, '0.2.0');
  });

  it('devuelve null si el deploy no responde una versión', async () => {
    assert.equal(await fetchDeployProductVersion(async () => respuesta({}, 500)), null);
    assert.equal(await fetchDeployProductVersion(async () => respuesta({ version: '  ' })), null);
    assert.equal(
      await fetchDeployProductVersion(async () => {
        throw new Error('red');
      }),
      null,
    );
  });
});
