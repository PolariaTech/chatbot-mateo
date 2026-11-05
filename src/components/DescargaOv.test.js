import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nombreArchivoOrdenes } from '../lib/descarga-ov-excel.js';

describe('botón de descarga', () => {
  it('nombra el archivo con el periodo', () => {
    assert.equal(nombreArchivoOrdenes('2026-10-22', '2026-10-29'), 'ordenes_2026-10-22_2026-10-29.xlsx');
  });
});
