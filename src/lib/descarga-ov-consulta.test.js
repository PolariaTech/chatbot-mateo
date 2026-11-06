import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filasDeRespuesta, totalDeRango } from './descarga-ov-consulta.js';

describe('respuesta de exportación', () => {
  it('acepta una lista y rechaza otra cosa', () => {
    assert.deepEqual(filasDeRespuesta([{ numero_orden: 'OV-1' }]).length, 1);
    assert.throws(() => filasDeRespuesta({ ok: true }), /no devolvió filas/);
  });

  it('lee el total cuando la respuesta viene por páginas', () => {
    assert.equal(totalDeRango('0-999/13387'), 13387);
    assert.equal(totalDeRango(null), null);
  });
});
