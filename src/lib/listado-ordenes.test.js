import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COLUMNAS_DETALLE_OT,
  COLUMNAS_ORDENES_VENTA,
  descargaListado,
  fechaVisible,
  filasExcel,
  gruposPorCentro,
  notaDeTope,
  numeroOrden,
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

  it('nombra al cliente y cuenta las órdenes de trabajo', () => {
    const cliente = COLUMNAS_ORDENES_VENTA.find((columna) => columna[0] === 'comprador');
    const ot = COLUMNAS_ORDENES_VENTA.find((columna) => columna[0] === 'ordenes_trabajo');
    assert.equal(cliente[1], 'Cliente');
    assert.equal(ot[1], 'OT');
    assert.equal(textoCelda(5, 'ordenes_trabajo'), '5');
    const registros = COLUMNAS_ORDENES_VENTA.find((columna) => columna[0] === 'cantidad');
    assert.equal(registros[1], 'Cantidad de registros');
    const unidad = COLUMNAS_DETALLE_OT.find((columna) => columna[0] === 'unidad');
    assert.equal(unidad[1], 'Unidad de medida');
    const detalle = filasExcel(COLUMNAS_DETALLE_OT, [{ cantidad: 10, unidad: 'KGM' }]);
    assert.equal(detalle[0]['Unidad de medida'], 'KGM');
    assert.equal(detalle[0].Cantidad, 10);
    assert.equal(descargaListado(undefined), 'ov');
    assert.equal(descargaListado('ot'), 'ot');
    assert.equal(descargaListado('pdf'), '');
  });

  it('agrupa los productos del correo por centro de consumo', () => {
    assert.equal(numeroOrden('OV-00001842'), 'OV-00001842');
    assert.equal(numeroOrden('pedido'), '');
    const grupos = gruposPorCentro([
      { orden_trabajo: 'CANTINA', producto: 'ZARZAMORA' },
      { orden_trabajo: 'CANTINA', producto: 'FRESA' },
      { orden_trabajo: 'FRIA', producto: 'AGUACATE' },
    ]);
    assert.equal(grupos.length, 2);
    assert.equal(grupos[0].centro, 'CANTINA');
    assert.equal(grupos[0].productos.length, 2);
    assert.equal(grupos[1].productos[0].producto, 'AGUACATE');
  });
});

