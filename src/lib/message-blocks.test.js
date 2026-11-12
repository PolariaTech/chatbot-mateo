import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { armarBloques } from './message-blocks.js';

const MENSAJE = [
  'Hoy, por fecha del pedido, entraron 27 órdenes de venta y 27 órdenes de trabajo. Vamos bien.',
  '',
  '| Orden de venta | Estado | Orden de trabajo |',
  '| --- | --- | --- |',
  '| OV-00001898 | Confirmada | 07-Gaia |',
  '| OV-00001902 a OV-00001904 | Por confirmar | (NA) |',
].join('\n');

describe('bloques del mensaje', () => {
  it('deja la frase y la tabla en el mismo mensaje', () => {
    const bloques = armarBloques(MENSAJE);
    assert.equal(bloques[0].type, 'paragraph');
    assert.match(bloques[0].text, /Vamos bien/);
    assert.equal(bloques[1].type, 'table');
    assert.deepEqual(bloques[1].headers, ['Orden de venta', 'Estado', 'Orden de trabajo']);
    assert.equal(bloques[1].rows[1][2], '(NA)');
  });

  it('un mensaje sin columnas sigue siendo un solo párrafo', () => {
    const bloques = armarBloques('Hoy sí hubo movimiento.');
    assert.equal(bloques.length, 1);
    assert.equal(bloques[0].type, 'paragraph');
  });
});
