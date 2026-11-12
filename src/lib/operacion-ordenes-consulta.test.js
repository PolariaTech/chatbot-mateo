import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { consultarOperacionOrdenes } from './operacion-ordenes-consulta.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

describe('consulta de operación de órdenes', () => {
  let ultimoCuerpo;

  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (_url, init) => {
      ultimoCuerpo = JSON.parse(init.body);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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

  it('manda la fecha de entrega cuando no eligen tipo', async () => {
    await consultarOperacionOrdenes({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-11-06',
      fechaFin: '2026-11-12',
    });
    assert.equal(ultimoCuerpo.p_fecha, 'entrega');
    assert.equal(ultimoCuerpo.p_fecha_inicio, '2026-11-06');
  });

  it('manda pedido o registro cuando los eligen', async () => {
    await consultarOperacionOrdenes({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-11-06',
      fechaFin: '2026-11-12',
      tipoFecha: 'pedido',
    });
    assert.equal(ultimoCuerpo.p_fecha, 'pedido');
    await consultarOperacionOrdenes({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-11-06',
      fechaFin: '2026-11-12',
      tipoFecha: 'registro',
    });
    assert.equal(ultimoCuerpo.p_fecha, 'creacion');
  });
});
