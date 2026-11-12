import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recortarTextoTabla } from './recortar-texto-tabla.js';

describe('recorte de celdas de la tabla del chat', () => {
  it('deja el texto corto igual', () => {
    assert.equal(recortarTextoTabla('Sin cliente'), 'Sin cliente');
    assert.equal(recortarTextoTabla('197'), '197');
  });

  it('corta el cliente largo y cierra con puntos suspensivos', () => {
    const cliente = 'OPERADORA HOTELERA DEL CORREDOR MAYAKOBA, S.A. DE C.V.';
    const celda = recortarTextoTabla(cliente);
    assert.equal(celda.endsWith('...'), true);
    assert.equal(celda.length, 51);
    assert.equal(celda.startsWith('OPERADORA HOTELERA DEL CORREDOR MAYAKOBA, S.A.'), true);
    assert.equal(celda.includes('C.V.'), false);
  });
});
