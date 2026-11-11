import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { consultarSabanaPedidos } from './sabana-pedidos-consulta.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

describe('consulta de la sábana de pedidos', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
  });

  after(() => {
    if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal;
    if (claveOriginal === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = claveOriginal;
    globalThis.fetch = fetchOriginal;
  });

  it('pide get_sabana_pedidos con la fecha y la hora en los argumentos', async () => {
    globalThis.fetch = async (url, init) => {
      assert.match(String(url), /\/rpc\/get_sabana_pedidos$/);
      assert.equal(init.headers['Accept-Profile'], 'emp_jbr_cygnus_y9ihz');
      const cuerpo = JSON.parse(init.body);
      assert.equal(cuerpo.p_fecha_inicio, '2026-11-11');
      assert.equal(cuerpo.p_fecha_fin, '2026-11-11');
      assert.equal(cuerpo.p_fecha, 'creacion');
      assert.equal(cuerpo.p_horas, 1);
      return new Response(JSON.stringify([{ orden_venta: 'OV-00001842', producto: 'Aguacate' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'content-range': '0-0/1' },
      });
    };

    const filas = await consultarSabanaPedidos({
      schema: 'emp_jbr_cygnus_y9ihz',
      fechaInicio: '2026-11-11',
      fechaFin: '2026-11-11',
      fecha: 'creacion',
      horas: 1,
    });
    assert.equal(filas.length, 1);
    assert.equal(filas[0].orden_venta, 'OV-00001842');
  });

  it('avisa si Supabase no está configurado', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await assert.rejects(
      () => consultarSabanaPedidos({ schema: 'public', fechaInicio: '2026-11-11', fechaFin: '2026-11-11' }),
      /no está configurado/,
    );
  });
});
