import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { consultarDetalleOt, consultarListadoOrdenes, debeContinuar, firmaDe } from './listado-ordenes-consulta.js';

describe('páginas del listado', () => {
  it('sigue solo cuando la página viene llena y no se repite', () => {
    const llena = Array.from({ length: 1000 }, (_, indice) => ({ numero: `OV-${indice}`, fecha: '2026-11-01', importe: 1 }));
    const corta = llena.slice(0, 10);
    assert.equal(debeContinuar(llena, '', 1000), true);
    assert.equal(debeContinuar(corta, '', 1000), false);
    assert.equal(debeContinuar(llena, firmaDe(llena), 1000), false);
  });
});

describe('consulta del listado', () => {
  const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const fetchOriginal = globalThis.fetch;
  let ultimoCuerpo;
  let ultimaRuta;

  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (ruta, init) => {
      ultimaRuta = String(ruta);
      ultimoCuerpo = JSON.parse(init.body);
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });

  after(() => {
    if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal;
    if (claveOriginal === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = claveOriginal;
    globalThis.fetch = fetchOriginal;
  });

  it('pide el listado por la fecha elegida', async () => {
    await consultarListadoOrdenes({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-11-06',
      fechaFin: '2026-11-12',
      tipoFecha: 'pedido',
      limite: 300,
    });
    assert.equal(ultimoCuerpo.p_fecha, 'pedido');
    assert.equal(ultimoCuerpo.p_limite, 300);
    assert.match(ultimaRuta, /get_listado_ordenes$/);
  });

  it('pide el detalle de órdenes de trabajo', async () => {
    await consultarDetalleOt({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-11-06',
      fechaFin: '2026-11-12',
      tipoFecha: 'entrega',
    });
    assert.match(ultimaRuta, /get_detalle_ot_ordenes$/);
    assert.equal(ultimoCuerpo.p_fecha, 'entrega');
  });
});
