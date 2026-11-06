import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  fechaVisible,
  filasExcel,
  notaDeTope,
  textoCelda,
  validarPeriodo,
} from './listado-ordenes.js';

describe('listado de órdenes del tablero', () => {
  it('valida el periodo y muestra la fecha en día mes año', () => {
    assert.equal(validarPeriodo('2026-11-01', '2026-10-01'), 'La fecha inicio no puede ser mayor que la fecha fin');
    assert.equal(validarPeriodo('', '2026-11-06'), 'Indica fecha_inicio y fecha_fin (YYYY-MM-DD)');
    assert.equal(validarPeriodo('2026-11-01', '2026-11-06'), '');
    assert.equal(fechaVisible('2026-11-06'), '06/11/2026');
    assert.equal(textoCelda(12.5, 'importe').includes('$'), true);
  });

  it('arma el excel con los títulos y avisa cuando la pantalla está recortada', () => {
    const filas = filasExcel([
      ['fecha_pedido', 'Fecha del pedido'],
      ['fecha_entrega', 'Fecha de entrega'],
      ['creacion', 'Fecha de registro'],
      ['numero', 'Número'],
    ], [{
      fecha_pedido: '2026-11-06',
      fecha_entrega: '2026-11-09',
      creacion: '2026-11-06 14:59:13',
      numero: 'OV-1',
    }]);
    assert.equal(filas[0]['Fecha del pedido'], '06/11/2026');
    assert.equal(filas[0]['Fecha de entrega'], '09/11/2026');
    assert.equal(filas[0]['Fecha de registro'], '2026-11-06 14:59:13');
    assert.equal(filas[0]['Número'], 'OV-1');
    assert.equal(notaDeTope(300, 1369).includes('1,369'), true);
    assert.equal(notaDeTope(12, 12), '');
  });
});

