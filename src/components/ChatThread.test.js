import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapMensaje } from '../lib/mateo-db.js';

describe('hilo del chat', () => {
  it('recibe la descarga separada del texto visible', () => {
    const mensaje = mapMensaje({
      id_historial: 2,
      rol: 'assistant',
      contenido: 'Te dejo el archivo.\n[[DESCARGAR_OV inicio=2026-10-01 fin=2026-10-07 columnas=numero,importe]]',
      estado: 'ok',
      created_at: '2026-10-07T12:00:00Z',
    });
    assert.equal(mensaje.texto.includes('DESCARGAR_OV'), false);
    assert.deepEqual(mensaje.descarga.columnas, ['numero', 'importe']);
  });
});
