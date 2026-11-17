import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reloadWithCacheClear } from './reload-with-cache-clear.js';

describe('reloadWithCacheClear', () => {
  it('borra el caché, quita el service worker y recarga con cache-bust', async () => {
    const borrados = [];
    const quitados = [];
    let destino = '';
    const resultado = await reloadWithCacheClear(
      {
        href: 'https://mateo.example/chat',
        replace(url) {
          destino = url;
        },
      },
      {
        async keys() {
          return ['polaria-ai-v2'];
        },
        async delete(nombre) {
          borrados.push(nombre);
          return true;
        },
      },
      {
        async getRegistrations() {
          return [{
            async unregister() {
              quitados.push('sw');
              return true;
            },
          }];
        },
      },
    );

    assert.deepEqual(borrados, ['polaria-ai-v2']);
    assert.deepEqual(quitados, ['sw']);
    assert.equal(resultado.cacheLimpio, true);
    assert.equal(resultado.workersQuitados, true);
    const url = new URL(destino);
    assert.equal(url.origin + url.pathname, 'https://mateo.example/chat');
    assert.match(url.searchParams.get('_pv'), /^\d+$/);
  });

  it('recarga aunque el navegador niegue el caché', async () => {
    let destino = '';
    const resultado = await reloadWithCacheClear(
      {
        href: 'https://mateo.example/',
        replace(url) {
          destino = url;
        },
      },
      {
        async keys() {
          throw new Error('cache denegado');
        },
      },
      undefined,
    );
    assert.equal(resultado.cacheLimpio, false);
    assert.equal(resultado.workersQuitados, true);
    assert.match(destino, /_pv=/);
  });

  it('avisa si no hay página para recargar', async () => {
    await assert.rejects(
      () => reloadWithCacheClear(undefined, undefined, undefined),
      /No hay página para recargar/,
    );
  });
});
