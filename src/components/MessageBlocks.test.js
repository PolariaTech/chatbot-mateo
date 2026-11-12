import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { armarBloques } from '../lib/message-blocks.js';

const MENSAJE = [
  'Hoy entraron 27 órdenes. Vamos bien.',
  '',
  '| Orden de venta | Estado | Orden de trabajo |',
  '| --- | --- | --- |',
  '| OV-00001902 a OV-00001904 | Por confirmar | (NA) |',
].join('\n');

describe('mensaje con tabla', () => {
  it('separa la frase y las columnas del mismo mensaje', () => {
    const bloques = armarBloques(MENSAJE);
    assert.equal(bloques[0].type, 'paragraph');
    assert.match(bloques[0].text, /Vamos bien/);
    assert.equal(bloques[1].type, 'table');
    assert.equal(bloques[1].rows[0][2], '(NA)');
  });
});
