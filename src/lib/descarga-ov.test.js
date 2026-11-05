import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  agruparOrdenes,
  filasParaExcel,
  leerDescargaOv,
  marcarDescarga,
  pedidoDesdeConversacion,
  pedidoDesdeTexto,
  periodoValido,
  resolverColumnas,
} from './descarga-ov.js';
import { mapMensaje } from './mateo-db.js';

describe('descarga de órdenes', () => {
  it('usa las columnas de siempre cuando no piden ninguna', () => {
    const resuelto = resolverColumnas('');
    assert.deepEqual(resuelto.desconocidas, []);
    assert.deepEqual(resuelto.columnas.map((columna) => columna.clave), [
      'numero', 'fecha', 'orden_compra', 'centro', 'comprador', 'cantidad', 'importe',
    ]);
  });

  it('traduce nombres parecidos y aparta los que no conoce', () => {
    const resuelto = resolverColumnas('estatus, total, color');
    assert.deepEqual(resuelto.columnas.map((columna) => columna.clave), ['estado', 'importe']);
    assert.deepEqual(resuelto.desconocidas, ['color']);
  });

  it('lee la marca, la quita del texto y la vuelve a guardar', () => {
    const leido = leerDescargaOv(
      'Listo, te dejo el archivo.\n[[DESCARGAR_OV inicio=2026-10-01 fin=2026-10-31 columnas=estatus, producto]]',
    );
    assert.equal(leido.texto, 'Listo, te dejo el archivo.');
    assert.equal(leido.pedido.inicio, '2026-10-01');
    assert.deepEqual(leido.pedido.columnas, ['estado', 'producto']);
    assert.equal(marcarDescarga(leido.texto, leido.pedido).includes('columnas=estado,producto'), true);
  });

  it('no arma pedido si el periodo está al revés', () => {
    assert.equal(periodoValido('2026-10-31', '2026-10-01'), false);
    const leido = leerDescargaOv('[[DESCARGAR_OV inicio=2026-10-31 fin=2026-10-01]]');
    assert.equal(leido.pedido, null);
  });

  it('suma las líneas cuando el archivo es por orden', () => {
    const filas = filasParaExcel([
      { numero_orden: 'OV-1', fecha: '2026-10-22', estado: 'facturada', comprador: 'Hotel', orden_compra_hotel: 'OC', centro_consumo: 'Cocina', cantidad: 2, importe: 20, producto: 'Leche' },
      { numero_orden: 'OV-1', fecha: '2026-10-22', estado: 'facturada', comprador: 'Hotel', orden_compra_hotel: 'OC', centro_consumo: 'Cocina', cantidad: 1, importe: 5, producto: 'Pan' },
    ], ['numero', 'cantidad', 'importe']);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].Cantidad, 3);
    assert.equal(filas[0].Importe, 25);
    assert.equal(filas[0].Producto, undefined);
  });

  it('deja una fila por producto cuando lo piden', () => {
    const lineas = agruparOrdenes([
      { numero_orden: 'OV-1', fecha: '2026-10-22', cantidad: 2, importe: 20 },
    ]);
    assert.equal(lineas[0].cantidad, 2);
    const filas = filasParaExcel([
      { numero_orden: 'OV-1', fecha: '2026-10-22', producto: 'Leche', unidad: 'LT', precio: 10, cantidad: 2, importe: 20 },
      { numero_orden: 'OV-1', fecha: '2026-10-22', producto: 'Pan', unidad: 'PZA', precio: 5, cantidad: 1, importe: 5 },
    ], ['numero', 'producto', 'precio']);
    assert.equal(filas.length, 2);
    assert.equal(filas[1].Producto, 'Pan');
    assert.equal(filas[0].Fecha, undefined);
  });

  it('arma el archivo aunque Mateo no deje la marca', () => {
    const hoy = new Date(2026, 10, 5);
    const pedido = pedidoDesdeTexto('dame todas las OV del 22 al 29 de octubre', hoy);
    assert.equal(pedido.inicio, '2026-10-22');
    assert.equal(pedido.fin, '2026-10-29');
    assert.equal(pedido.columnas.includes('numero'), true);
    const seguimiento = pedidoDesdeConversacion('dame el archivo', [
      { tipo: 'usuario', texto: 'dame todas las OV del 22 al 29 de octubre' },
    ], hoy);
    assert.equal(seguimiento.inicio, '2026-10-22');
    assert.equal(pedidoDesdeTexto('cuántas órdenes hubo hoy', hoy), null);
  });

  it('recupera el botón al cargar el mensaje guardado', () => {
    const mensaje = mapMensaje({
      id_historial: 1,
      rol: 'assistant',
      contenido: 'Aquí está.\n[[DESCARGAR_OV inicio=2026-10-22 fin=2026-10-29 columnas=numero,estado]]',
      estado: 'ok',
      created_at: '2026-10-29T12:00:00Z',
    });
    assert.equal(mensaje.texto, 'Aquí está.');
    assert.deepEqual(mensaje.descarga.columnas, ['numero', 'estado']);
  });
});
