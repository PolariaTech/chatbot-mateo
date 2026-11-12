import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { errorTipoFecha, tipoFechaOperacion } from './tipo-fecha-operacion.js';

describe('tipo de fecha del tablero de operación', () => {
  it('usa la fecha de entrega cuando no viene tipo', () => {
    assert.equal(tipoFechaOperacion(undefined), 'entrega');
    assert.equal(tipoFechaOperacion(''), 'entrega');
    assert.equal(tipoFechaOperacion('  Entrega '), 'entrega');
    assert.equal(errorTipoFecha(undefined), '');
  });

  it('acepta pedido y registro, y rechaza otro valor', () => {
    assert.equal(tipoFechaOperacion('pedido'), 'pedido');
    assert.equal(tipoFechaOperacion('registro'), 'creacion');
    assert.equal(tipoFechaOperacion('creacion'), 'creacion');
    assert.equal(tipoFechaOperacion('despacho'), '');
    assert.equal(errorTipoFecha('despacho'), 'El tipo de fecha debe ser entrega, pedido o registro.');
  });
});
