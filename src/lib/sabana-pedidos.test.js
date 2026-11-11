import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { columnasSabana, filasSabana } from './sabana-pedidos.js';

const LINEA = {
  orden_venta: 'OV-00001553',
  estado: 'confirmada',
  cliente: 'Hotelera Chicome',
  orden_compra: 'OC-1',
  fecha_pedido: '2026-11-06',
  fecha_creacion: '2026-11-06T18:21:00.000Z',
  fecha_entrega: '2026-23-10',
  orden_trabajo: 'OT-003632',
  almacen: 'Almacen de Mercancia en Consignacion',
  producto: 'Limón persa',
  codigo_producto: '115001400',
  cantidad: 10,
  importe: 500,
};

const CLAVES_COMPLETAS = [
  'numero', 'fecha', 'estado', 'orden_compra', 'centro', 'comprador', 'cliente',
  'id', 'creacion', 'entrega', 'cantidad', 'importe', 'total', 'producto', 'unidad', 'precio',
];

describe('sábana para Excel', () => {
  it('traduce el pedido corto a los encabezados de la sábana', () => {
    const filas = filasSabana([LINEA], ['id', 'cliente', 'creacion', 'entrega', 'total']);
    assert.deepEqual(Object.keys(filas[0]), [
      'Orden de venta',
      'Cliente',
      'Fecha de creación',
      'Fecha de entrega',
      'Valor total',
    ]);
    assert.equal(filas[0]['Orden de venta'], 'OV-00001553');
    assert.equal(filas[0]['Fecha de creación'], '06/11/2026 13:21');
    assert.equal(filas[0]['Fecha de entrega'], '2026-23-10');
    assert.equal(filas[0]['Valor total'], 500);
  });

  it('agrupa por orden de venta cuando piden la cantidad de órdenes de trabajo', () => {
    const otra = { ...LINEA, orden_trabajo: 'OT-003633', producto: 'Aguacate', codigo_producto: '115001009', importe: 200 };
    const filas = filasSabana([LINEA, otra], ['id', 'cliente', 'cantidad_ot', 'total']);
    assert.equal(filas.length, 1);
    assert.equal(filas[0]['Cantidad de órdenes de trabajo'], 2);
    assert.equal(filas[0]['Valor total'], 700);
  });

  it('deja la cantidad en unidades cuando piden el producto', () => {
    const filas = filasSabana([LINEA], ['producto', 'cantidad', 'importe']);
    assert.equal(filas[0].Cantidad, 10);
    assert.equal(filas[0].Importe, 500);
  });

  it('arma la hoja completa cuando piden el detalle de siempre', () => {
    const columnas = columnasSabana(CLAVES_COMPLETAS);
    assert.equal(columnas.some((columna) => columna.etiqueta === 'Orden de trabajo'), true);
    assert.equal(columnas.some((columna) => columna.etiqueta === 'Código del producto'), true);
    assert.equal(columnas.some((columna) => columna.etiqueta === 'Fecha del pedido'), true);
  });

  it('muestra la fecha del pedido como día, sin correrla de huso', () => {
    const filas = filasSabana([{ ...LINEA, fecha_entrega: '2026-11-07' }], ['fecha', 'entrega']);
    assert.equal(filas[0]['Fecha del pedido'], '06/11/2026');
    assert.equal(filas[0]['Fecha de entrega'], '07/11/2026');
  });
});
