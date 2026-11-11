import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  agruparOrdenes,
  filasParaExcel,
  leerDescargaOv,
  marcarDescarga,
  periodoValido,
  resolverColumnas,
} from './descarga-ov.js';
import { mapMensaje } from './mateo-db.js';

describe('descarga de órdenes', () => {
  it('usa el catálogo completo cuando no piden ninguna', () => {
    const resuelto = resolverColumnas('');
    assert.deepEqual(resuelto.desconocidas, []);
    assert.deepEqual(resuelto.columnas.map((columna) => columna.clave), [
      'numero', 'fecha', 'estado', 'orden_compra', 'centro', 'comprador', 'cliente', 'id',
      'creacion', 'entrega', 'cantidad', 'importe', 'total', 'producto', 'unidad', 'precio',
      'cantidad_ot', 'productos_distintos',
    ]);
  });

  it('traduce nombres parecidos y aparta los que no conoce', () => {
    const resuelto = resolverColumnas('estatus, total, color');
    assert.deepEqual(resuelto.columnas.map((columna) => columna.clave), ['estado', 'total']);
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

  it('deja la fecha de entrega en blanco cuando viene vacía', () => {
    const filas = filasParaExcel([
      { numero_orden: 'OV-1', fecha: '2026-10-22', orden_compra_hotel: 'OC-9', entrega: null, centro_consumo: 'Cocina', comprador: 'Hotel', cantidad: 1, importe: 10 },
    ], ['orden_compra', 'entrega']);
    assert.equal(filas[0]['Orden de Compra'], 'OC-9');
    assert.equal(filas[0]['Fecha de entrega'], '');
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

  it('no suma dos veces el total de la orden', () => {
    const filas = filasParaExcel([
      { id_ov: 'OV-1', numero_orden: 'OV-1', cliente: 'Hotel', creacion: '2026-10-01 08:15:00', entrega: '2026-10-05', cantidad: 2, importe: 20, total: 25, producto: 'Leche' },
      { id_ov: 'OV-1', numero_orden: 'OV-1', cliente: 'Hotel', creacion: '2026-10-01 08:15:00', entrega: '2026-10-05', cantidad: 1, importe: 5, total: 25, producto: 'Pan' },
    ], ['id', 'cliente', 'creacion', 'entrega', 'total']);
    assert.equal(filas.length, 1);
    assert.equal(filas[0].ID, 'OV-1');
    assert.equal(filas[0].Cliente, 'Hotel');
    assert.equal(filas[0]['Creación'], '2026-10-01 08:15:00');
    assert.equal(filas[0]['Fecha de entrega'], '05/10/2026');
    assert.equal(filas[0].Total, 25);
  });

  it('lee las últimas horas y un rango, y no confunde la hora con el día', () => {
    const horas = leerDescargaOv('[[DESCARGAR_OV inicio=2026-11-09 fin=2026-11-09 horas=12 fecha=creacion columnas=numero]]');
    assert.equal(horas.pedido.inicio, '2026-11-09');
    assert.equal(horas.pedido.horas, 12);
    assert.equal(horas.pedido.horaInicio, undefined);
    const rango = leerDescargaOv('[[DESCARGAR_OV inicio=2026-11-09 fin=2026-11-09 hora_inicio=2026-11-09T08:00:00-05:00 hora_fin=2026-11-09T12:00:00-05:00 columnas=numero]]');
    assert.equal(rango.pedido.horaInicio, '2026-11-09T08:00:00-05:00');
    assert.equal(rango.pedido.horaFin, '2026-11-09T12:00:00-05:00');
    assert.equal(marcarDescarga(rango.texto, rango.pedido).includes('hora_inicio=2026-11-09T08:00:00-05:00'), true);
    assert.equal(leerDescargaOv('[[DESCARGAR_OV inicio=2026-11-09 fin=2026-11-09 horas=0 columnas=numero]]').pedido, null);
  });

  it('guarda la marca de creación y la de todo el historial', () => {
    const creacion = leerDescargaOv('[[DESCARGAR_OV inicio=2026-10-01 fin=2026-10-31 fecha=creacion columnas=id,cliente,creacion,entrega,total]]');
    assert.equal(creacion.pedido.fecha, 'creacion');
    assert.equal(creacion.pedido.todo, false);
    const todo = leerDescargaOv('[[DESCARGAR_OV todo=si columnas=id,total]]');
    assert.equal(todo.pedido.todo, true);
    assert.equal(todo.pedido.inicio, null);
    assert.equal(marcarDescarga('Listo', todo.pedido).includes('todo=si'), true);
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
