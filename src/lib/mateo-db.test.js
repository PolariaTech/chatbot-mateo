import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapMensaje } from './mateo-db.js';

describe('mapMensaje', () => {
  it('guarda la descarga y no muestra la marca', () => {
    const mensaje = mapMensaje({
      id_historial: 4,
      rol: 'assistant',
      contenido: 'Archivo listo.\n[[DESCARGAR_OV inicio=2026-10-22 fin=2026-10-29 columnas=numero]]',
      estado: 'ok',
      created_at: '2026-10-29T12:00:00Z',
    });
    assert.equal(mensaje.texto, 'Archivo listo.');
    assert.deepEqual(mensaje.descarga, {
      inicio: '2026-10-22',
      fin: '2026-10-29',
      columnas: ['numero'],
      desconocidas: [],
    });
  });
});
