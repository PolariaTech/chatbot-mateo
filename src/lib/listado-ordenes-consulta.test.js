import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { debeContinuar, firmaDe } from './listado-ordenes-consulta.js';

describe('páginas del listado', () => {
  it('sigue solo cuando la página viene llena y no se repite', () => {
    const llena = Array.from({ length: 1000 }, (_, indice) => ({ numero: `OV-${indice}`, fecha: '2026-11-01', importe: 1 }));
    const corta = llena.slice(0, 10);
    assert.equal(debeContinuar(llena, '', 1000), true);
    assert.equal(debeContinuar(corta, '', 1000), false);
    assert.equal(debeContinuar(llena, firmaDe(llena), 1000), false);
  });
});
