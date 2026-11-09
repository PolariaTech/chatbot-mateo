import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { libroOt, nombreArchivoOt } from './descarga-ot-excel.js';

describe('excel de órdenes de trabajo', () => {
  it('nombra el archivo por un solo día', () => {
    assert.equal(nombreArchivoOt('2026-10-31', '2026-10-31'), 'ordenes_trabajo_2026-10-31.xlsx');
  });

  it('arma un buffer xlsx', () => {
    const buffer = libroOt([{ 'Orden de venta': 'OV-1', Producto: 'Limón' }]);
    const bytes = new Uint8Array(buffer);
    assert.equal(bytes[0], 0x50);
    assert.equal(bytes[1], 0x4b);
  });
});
