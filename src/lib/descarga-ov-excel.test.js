import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from 'xlsx';
import { libroOrdenes, nombreArchivoOrdenes } from './descarga-ov-excel.js';

describe('libro de órdenes', () => {
  it('escribe un xlsx con la hoja Ordenes', () => {
    const buffer = libroOrdenes([{ Número: 'OV-1', Importe: 20 }]);
    assert.equal(buffer[0], 0x50);
    assert.equal(buffer[1], 0x4b);
    const libro = XLSX.read(buffer, { type: 'buffer' });
    assert.deepEqual(libro.SheetNames, ['Ordenes']);
    assert.equal(nombreArchivoOrdenes('2026-10-01', '2026-10-31'), 'ordenes_2026-10-01_2026-10-31.xlsx');
  });
});
