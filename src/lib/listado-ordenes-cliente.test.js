import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { pedirExcelListado, pedirListado } from './listado-ordenes-cliente.js';

const fetchOriginal = globalThis.fetch;

after(() => {
  globalThis.fetch = fetchOriginal;
});

describe('cliente del listado', () => {
  it('lee el recorte de pantalla y el excel completo', async () => {
    globalThis.fetch = async (ruta, init) => {
      const cuerpo = JSON.parse(init.body);
      assert.equal(cuerpo.tipo_fecha, 'entrega');
      if (String(ruta).endsWith('/excel')) {
        assert.equal(cuerpo.descarga, 'ot');
        return new Response(new Uint8Array([1, 2]), { status: 200 });
      }
      return new Response(JSON.stringify({ success: true, ordenes: [{ numero: 'OV-1' }], total: 800 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const listado = await pedirListado('token', '2026-11-01', '2026-11-06', 'entrega');
    assert.equal(listado.total, 800);
    assert.equal(listado.ordenes[0].numero, 'OV-1');
    const excel = await pedirExcelListado('token', '2026-11-01', '2026-11-06', 'entrega', 'ot');
    assert.equal(excel.status, 200);
    assert.equal(excel.bytes.byteLength, 2);
  });
});
