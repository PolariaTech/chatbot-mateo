import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  ETIQUETA_ACEPTAR_NUEVA_VERSION,
  MATEO_PRODUCT_VERSION,
  MENSAJE_NUEVA_VERSION_PRODUCTO,
  PRODUCT_VERSION_API_PATH,
  PRODUCT_VERSION_CHECK_INTERVAL_MS,
  TITULO_NUEVA_VERSION_PRODUCTO,
} from './product-version-constants.js';

describe('product-version-constants', () => {
  it('usa el mismo SemVer que package.json', () => {
    const paquete = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    assert.equal(MATEO_PRODUCT_VERSION, paquete.version);
    assert.match(MATEO_PRODUCT_VERSION, /^\d+\.\d+\.\d+$/);
  });

  it('define el aviso y el intervalo de un minuto', () => {
    assert.equal(PRODUCT_VERSION_CHECK_INTERVAL_MS, 60_000);
    assert.equal(PRODUCT_VERSION_API_PATH, '/api/product-version');
    assert.equal(TITULO_NUEVA_VERSION_PRODUCTO, 'Nueva versión');
    assert.match(MENSAJE_NUEVA_VERSION_PRODUCTO, /nueva versión/i);
    assert.equal(ETIQUETA_ACEPTAR_NUEVA_VERSION, 'Aceptar');
  });
});
