import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { claveTrabajo, consolidarLineas } from './sabana-pedidos-consolidado.js';

const ZARZAMORA = {
  orden_venta: 'OV-20261007-105357',
  cliente: 'Sin cliente',
  fecha_creacion: '2026-10-07T15:53:00.000Z',
  fecha_entrega: '2026-10-08',
  origen_desglose: 'orden_trabajo',
  orden_trabajo: 'OT-000007',
  producto: 'ZARZAMORA',
  codigo_producto: '105001505',
  unidad: 'KGM',
  cantidad: 0.75,
  importe: 273.75,
};

const AGUACATE = {
  ...ZARZAMORA,
  orden_trabajo: 'OT-000028',
  producto: 'AGUACATE EXTRA (200 a 260g)',
  codigo_producto: '115001005',
  cantidad: 37,
  importe: 2886,
};

describe('consolidado de la sábana', () => {
  it('cuenta la orden de trabajo guardada y, si no hay, el almacén', () => {
    assert.equal(claveTrabajo(ZARZAMORA), 'OT-000007');
    assert.equal(claveTrabajo({ origen_desglose: 'almacen', almacen: 'COCINA', orden_trabajo: '' }), 'COCINA');
  });

  it('deja una fila por orden de venta con el conteo y el valor total', () => {
    const columnas = [
      { campo: 'orden_venta' },
      { campo: 'cliente' },
      { campo: 'cantidad_ot' },
      { campo: 'importe' },
    ];
    const filas = consolidarLineas([ZARZAMORA, AGUACATE], columnas);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].cantidad_ot, 2);
    assert.equal(filas[0].importe, 3159.75);
  });

  it('deja una fila por orden de trabajo con los productos distintos', () => {
    const columnas = [{ campo: 'orden_venta' }, { campo: 'orden_trabajo' }, { campo: 'productos_distintos' }];
    const repetida = { ...ZARZAMORA, importe: 10 };
    const filas = consolidarLineas([ZARZAMORA, repetida, AGUACATE], columnas);
    assert.equal(filas.length, 2);
    assert.equal(filas.find((fila) => fila.orden_trabajo === 'OT-000007').productos_distintos, 1);
  });
});