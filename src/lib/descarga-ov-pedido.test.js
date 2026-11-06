import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ajustarDescargas, pedidoDelTurno, pedidoDesdeConversacion, pedidoDesdeTexto } from './descarga-ov-pedido.js';

const hoy = new Date(2026, 10, 6);

describe('pedido de descarga desde el texto', () => {
  it('arma el archivo aunque Mateo no deje la marca', () => {
    const pedido = pedidoDesdeTexto('dame todas las OV del 22 al 29 de octubre', hoy);
    assert.equal(pedido.inicio, '2026-10-22');
    assert.equal(pedido.fin, '2026-10-29');
    assert.equal(pedido.fecha, 'pedido');
    assert.equal(pedido.todo, false);
    const seguimiento = pedidoDesdeConversacion('dame el archivo', [
      { tipo: 'usuario', texto: 'dame todas las OV del 22 al 29 de octubre' },
    ], hoy);
    assert.equal(seguimiento.inicio, '2026-10-22');
    assert.equal(pedidoDesdeTexto('cuántas órdenes hubo hoy', hoy), null);
  });

  it('pregunta las fechas cuando no dice todas ni da un periodo', () => {
    assert.equal(pedidoDesdeTexto('extrae un csv de las órdenes', hoy), null);
  });

  it('toma todas las órdenes desde el 1 de enero de 2000', () => {
    const pedido = pedidoDesdeTexto('dame todas las órdenes', hoy);
    assert.equal(pedido.inicio, '2000-01-01');
    assert.equal(pedido.fin, '2099-12-31');
    assert.equal(pedido.todo, false);
    const conFechas = pedidoDesdeTexto('dame todas las OV del 22 al 29 de octubre', hoy);
    assert.equal(conFechas.inicio, '2026-10-22');
    assert.equal(conFechas.fin, '2026-10-29');
  });

  it('usa la fecha del pedido aunque digan creados en octubre', () => {
    const texto = 'extraer un csv donde salga el ID de la OV, cliente, el timestamp de creación, la fecha de entrega solicitada, el valor total del pedido, para todos los pedidos creados en octubre';
    const pedido = pedidoDesdeTexto(texto, hoy);
    assert.equal(pedido.inicio, '2026-10-01');
    assert.equal(pedido.fin, '2026-10-31');
    assert.equal(pedido.fecha, 'pedido');
    assert.deepEqual(pedido.columnas, ['cliente', 'id', 'creacion', 'entrega', 'total']);
  });

  it('usa el año en curso si no lo escriben y respeta el año que sí escriben', () => {
    const anio = hoy.getFullYear();
    const sinAnio = pedidoDesdeTexto('extrae un excel de diciembre', hoy);
    assert.equal(sinAnio.inicio, `${anio}-12-01`);
    assert.equal(sinAnio.fin, `${anio}-12-31`);
    const conAnio = pedidoDesdeTexto('extrae un excel de octubre de 2024', hoy);
    assert.equal(conAnio.inicio, '2024-10-01');
    assert.equal(conAnio.fin, '2024-10-31');
    const marca = {
      todo: false,
      inicio: '2024-10-01',
      fin: '2024-10-31',
      fecha: 'creacion',
      columnas: ['id', 'cliente', 'creacion', 'entrega', 'total'],
      desconocidas: [],
    };
    const pedido = pedidoDelTurno(marca, 'extrae un csv de los pedidos creados en octubre', [], hoy);
    assert.equal(pedido.inicio, `${anio}-10-01`);
    assert.equal(pedido.fin, `${anio}-10-31`);
    assert.equal(pedido.fecha, 'pedido');
    const conAnioGana = pedidoDelTurno(
      { ...marca, inicio: `${anio}-10-01`, fin: `${anio}-10-31` },
      'extrae un excel de octubre de 2024',
      [],
      hoy,
    );
    assert.equal(conAnioGana.inicio, '2024-10-01');
    assert.equal(conAnioGana.fin, '2024-10-31');
  });

  it('acepta cualquier mes o rango y no conserva el año que Mateo inventa', () => {
    const anio = hoy.getFullYear();
    const mes = pedidoDesdeTexto('quiero las OV de noviembre', hoy);
    assert.equal(mes.inicio, `${anio}-11-01`);
    assert.equal(mes.fin, `${anio}-11-30`);
    const rango = pedidoDesdeTexto('excel del 1 al 15 de marzo', hoy);
    assert.equal(rango.inicio, `${anio}-03-01`);
    assert.equal(rango.fin, `${anio}-03-15`);
    const rangoAnio = pedidoDesdeTexto('las ordenes del 1 al 15 de marzo de 2025', hoy);
    assert.equal(rangoAnio.inicio, '2025-03-01');
    assert.equal(rangoAnio.fin, '2025-03-15');
    const barras = pedidoDesdeTexto('excel del 01/11/2025 al 15/11/2025', hoy);
    assert.equal(barras.inicio, '2025-11-01');
    assert.equal(barras.fin, '2025-11-15');
    const marca = {
      todo: false,
      inicio: '2024-11-01',
      fin: '2024-11-30',
      fecha: 'creacion',
      columnas: ['id', 'cliente', 'creacion', 'entrega', 'total'],
      desconocidas: [],
    };
    const confirmado = pedidoDelTurno(marca, 'si por favor', [
      { tipo: 'usuario', texto: 'quiero las OV de noviembre' },
    ], hoy);
    assert.equal(confirmado.inicio, `${anio}-11-01`);
    assert.equal(confirmado.fin, `${anio}-11-30`);
    assert.deepEqual(confirmado.columnas, ['id', 'cliente', 'creacion', 'entrega', 'total']);
    const cargado = ajustarDescargas([
      { tipo: 'usuario', texto: 'quiero las OV de noviembre' },
      { tipo: 'usuario', texto: 'si por favor' },
      { tipo: 'ia', texto: 'Listo', descarga: marca },
    ], hoy);
    assert.equal(cargado[2].descarga.inicio, `${anio}-11-01`);
    assert.equal(cargado[2].descarga.fin, `${anio}-11-30`);
  });
});
