import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { notaDeTope, TOPE_PANTALLA } from '../lib/listado-ordenes.js';

describe('listado en pantalla', () => {
  it('recorta el aviso a 300 y deja el excel para el rango completo', () => {
    assert.equal(TOPE_PANTALLA, 300);
    assert.match(notaDeTope(TOPE_PANTALLA, 800), /Excel trae todas/);
  });
});
