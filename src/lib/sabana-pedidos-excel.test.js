import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as XLSX from 'xlsx';
import { libroSabana, nombreArchivoSabana } from './sabana-pedidos-excel.js';

describe('libro de la sábana', () => {
  it('nombra el archivo con el periodo', () => {
    assert.equal(nombreArchivoSabana('2026-11-11', '2026-11-11'), 'pedidos_2026-11-11.xlsx');
    assert.equal(nombreArchivoSabana('', ''), 'pedidos.xlsx');
  });

  it('escribe la hoja Pedidos con el encabezado que recibió', () => {
    const libro = XLSX.read(libroSabana([{ 'Orden de venta': 'OV-1', Cliente: 'Sin cliente' }]), { type: 'buffer' });
    assert.deepEqual(libro.SheetNames, ['Pedidos']);
    const filas = XLSX.utils.sheet_to_json(libro.Sheets.Pedidos);
    assert.equal(filas[0]['Orden de venta'], 'OV-1');
    assert.equal(filas[0].Cliente, 'Sin cliente');
  });
});
