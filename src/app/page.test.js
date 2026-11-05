import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { leerDescargaOv } from '../lib/descarga-ov.js';

describe('página de Mateo', () => {
  it('prepara el botón cuando la respuesta trae la marca', () => {
    const leido = leerDescargaOv('Listo.\n[[DESCARGAR_OV inicio=2026-10-01 fin=2026-10-07 columnas=numero]]');
    assert.equal(leido.texto, 'Listo.');
    assert.equal(leido.pedido.inicio, '2026-10-01');
  });
});