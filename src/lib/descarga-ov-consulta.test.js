import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { agregarVentana, filasDeRespuesta, totalDeRango } from './descarga-ov-consulta.js';

describe('respuesta de exportación', () => {
  it('acepta una lista y rechaza otra cosa', () => {
    assert.deepEqual(filasDeRespuesta([{ numero_orden: 'OV-1' }]).length, 1);
    assert.throws(() => filasDeRespuesta({ ok: true }), /no devolvió filas/);
  });

  it('manda las horas solo cuando las pidieron', () => {
    const dia = agregarVentana({ p_fecha_inicio: '2026-11-09', p_fecha_fin: '2026-11-09' });
    assert.equal(dia.p_horas, undefined);
    const horas = agregarVentana(dia, 12);
    assert.equal(horas.p_horas, 12);
    const rango = agregarVentana(dia, null, '2026-11-09T08:00:00-05:00', '2026-11-09T12:00:00-05:00');
    assert.equal(rango.p_hora_inicio, '2026-11-09T08:00:00-05:00');
    assert.equal(rango.p_horas, undefined);
  });

  it('lee el total cuando la respuesta viene por páginas', () => {
    assert.equal(totalDeRango('0-999/13387'), 13387);
    assert.equal(totalDeRango(null), null);
  });
});
