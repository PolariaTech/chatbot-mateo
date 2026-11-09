import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { pedidoOtDelTurno, pedidoOtDesdeTexto } from './descarga-ot-pedido.js';

describe('pedido OT desde texto', () => {
  const hoy = new Date('2026-11-09T12:00:00Z');

  it('parsea un solo día con productos y monto', () => {
    const pedido = pedidoOtDesdeTexto(
      'me puedes entregar un excel con la informacion del 31 de octubre de 2026, quiero que me entregue todas las ordenes de tarea y que incluya los siguientes campos : orden de venta , productos vendidos, y monto total',
      hoy,
    );
    assert.deepEqual(pedido, {
      tipo: 'ot',
      inicio: '2026-10-31',
      fin: '2026-10-31',
      columnas: ['numero', 'producto', 'importe'],
      desconocidas: [],
    });
  });

  it('parsea orden de venta y estado actual', () => {
    const pedido = pedidoOtDesdeTexto(
      'excel del 31 de octubre de 2026 con todas las ordenes de trabajo: orden de venta y el estado actual',
      hoy,
    );
    assert.equal(pedido.inicio, '2026-10-31');
    assert.equal(pedido.fin, '2026-10-31');
    assert.deepEqual(pedido.columnas, ['numero', 'estado']);
  });

  it('respeta la marca del agente si el usuario no pide archivo OT', () => {
    const marca = {
      tipo: 'ot',
      inicio: '2026-10-31',
      fin: '2026-10-31',
      columnas: ['numero', 'estado'],
      desconocidas: [],
    };
    const pedido = pedidoOtDelTurno(marca, 'gracias', hoy);
    assert.deepEqual(pedido, marca);
  });
});
