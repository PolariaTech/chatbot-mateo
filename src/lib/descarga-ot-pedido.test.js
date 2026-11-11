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

  it('sin campos nombrados pide todas las columnas', () => {
    const pedido = pedidoOtDesdeTexto(
      'entregame un excel con todas las ordenes de trabajo del 31 de octubre de 2026',
      hoy,
    );
    assert.equal(pedido.inicio, '2026-10-31');
    assert.ok(pedido.columnas.includes('unidad'));
    assert.ok(pedido.columnas.includes('precio'));
    assert.ok(pedido.columnas.length >= 10);
  });

  it('no arma Excel si piden un pedido OT por número', () => {
    const pregunta = 'Dame el listado de todos los pedido OT número 4502991496';
    assert.equal(pedidoOtDesdeTexto(pregunta, hoy), null);
    const marca = {
      tipo: 'ot',
      inicio: '2000-01-01',
      fin: '2099-12-31',
      columnas: ['numero', 'referencia'],
      desconocidas: [],
    };
    assert.equal(pedidoOtDelTurno(marca, pregunta, hoy), null);
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
