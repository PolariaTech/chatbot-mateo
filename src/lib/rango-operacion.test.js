import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dmyToIso, esFechaIso, fechasDePreset, isoToDmy } from './rango-operacion.js';

describe('rango de fechas del tablero de operación', () => {
  it('convierte el día entre ISO y día/mes/año', () => {
    assert.equal(esFechaIso('2026-11-06'), true);
    assert.equal(isoToDmy('2026-11-06'), '06/11/2026');
    assert.equal(dmyToIso('6/11/2026'), '2026-11-06');
    assert.equal(dmyToIso('31/02/2026'), null);
    assert.equal(isoToDmy('ayer'), '');
  });

  it('arma la última semana hasta hoy y rechaza un atajo desconocido', () => {
    const rango = fechasDePreset('1s');
    assert.equal(esFechaIso(rango.inicio), true);
    assert.equal(esFechaIso(rango.fin), true);
    assert.equal(rango.inicio <= rango.fin, true);
    assert.equal(fechasDePreset('no-existe'), null);
  });
});
