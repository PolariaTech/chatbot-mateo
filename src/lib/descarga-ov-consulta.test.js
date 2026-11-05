import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { filasDeRespuesta } from './descarga-ov-consulta.js';

describe('respuesta de exportación', () => {
  it('acepta una lista y rechaza otra cosa', () => {
    assert.deepEqual(filasDeRespuesta([{ numero_orden: 'OV-1' }]).length, 1);
    assert.throws(() => filasDeRespuesta({ ok: true }), /no devolvió filas/);
  });
});
