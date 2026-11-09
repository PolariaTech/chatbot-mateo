import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { consultarDesgloseOv } from './descarga-ot-consulta.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

describe('consulta desglose OV', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url) => {
      assert.match(String(url), /get_operacion_desglose_ov/);
      return new Response(JSON.stringify([
        {
          numero_orden: 'OV-1',
          modo: 'ot',
          referencia: 'OT-1',
          producto: 'Limón',
          importe: 10,
        },
      ]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'content-range': '0-0/1' },
      });
    };
  });

  after(() => {
    if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal;
    if (claveOriginal === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = claveOriginal;
    globalThis.fetch = fetchOriginal;
  });

  it('devuelve las filas del RPC', async () => {
    const filas = await consultarDesgloseOv({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-10-31',
      fechaFin: '2026-10-31',
    });
    assert.equal(filas.length, 1);
    assert.equal(filas[0].referencia, 'OT-1');
  });
});
