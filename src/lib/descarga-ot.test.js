import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COLUMNAS_OT,
  filasOtParaExcel,
  leerDescargaOt,
  marcarDescargaOt,
  resolverColumnasOt,
} from './descarga-ot.js';

describe('descarga de órdenes de trabajo', () => {
  it('sin columnas pedidas usa el catálogo completo', () => {
    const resuelto = resolverColumnasOt('');
    assert.deepEqual(
      resuelto.columnas.map((columna) => columna.clave),
      COLUMNAS_OT.map((columna) => columna.clave),
    );
    assert.ok(resuelto.columnas.some((columna) => columna.clave === 'unidad'));
    assert.ok(resuelto.columnas.some((columna) => columna.clave === 'precio'));
  });

  it('lee la marca DESCARGAR_OT', () => {
    const leido = leerDescargaOt(
      'Listo.\n[[DESCARGAR_OT inicio=2026-10-31 fin=2026-10-31 columnas=numero,producto,importe]]',
    );
    assert.equal(leido.texto, 'Listo.');
    assert.deepEqual(leido.pedido, {
      tipo: 'ot',
      inicio: '2026-10-31',
      fin: '2026-10-31',
      columnas: ['numero', 'producto', 'importe'],
      desconocidas: [],
    });
    const horas = leerDescargaOt('[[DESCARGAR_OT inicio=2026-11-09 fin=2026-11-09 horas=1 columnas=numero]]');
    assert.equal(horas.pedido.horas, 1);
    assert.equal(horas.pedido.inicio, '2026-11-09');
  });

  it('resuelve alias de orden de venta y estado actual', () => {
    const resuelto = resolverColumnasOt('orden de venta, estado actual');
    assert.deepEqual(resuelto.columnas.map((columna) => columna.clave), ['numero', 'estado']);
  });

  it('arma filas con estado de OT cuando existe', () => {
    const filas = filasOtParaExcel([
      {
        numero_orden: 'OV-1',
        modo: 'ot',
        referencia: 'OT-1',
        producto: 'Limón',
        importe: 100,
        estado: 'confirmada',
        estado_ot: 'planificada',
      },
      { numero_orden: 'OV-2', modo: 'ninguno' },
    ], ['numero', 'producto', 'importe', 'estado']);
    assert.equal(filas.length, 1);
    assert.equal(filas[0]['Orden de venta'], 'OV-1');
    assert.equal(filas[0].Producto, 'Limón');
    assert.equal(filas[0]['Monto total'], 100);
    assert.equal(filas[0]['Estado actual'], 'planificada');
  });

  it('marca la descarga OT', () => {
    const marcado = marcarDescargaOt('Te dejo el archivo.', {
      inicio: '2026-10-31',
      fin: '2026-10-31',
      columnas: ['numero', 'estado'],
    });
    assert.match(marcado, /\[\[DESCARGAR_OT inicio=2026-10-31 fin=2026-10-31 columnas=numero,estado\]\]/);
  });
});
