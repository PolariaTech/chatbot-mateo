import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud(body, sesion = 'sesion-listado') {
  return {
    headers: {
      get(nombre) {
        if (String(nombre).toLowerCase() === 'authorization' && sesion) return `Bearer ${sesion}`;
        return null;
      },
    },
    async json() {
      return body;
    },
  };
}

describe('POST listado de órdenes', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/get_listado_ordenes')) {
        const cuerpo = JSON.parse(init.body);
        assert.equal(cuerpo.p_limite, 300);
        return new Response(JSON.stringify([{
          numero: 'OV-1',
          fecha: '2026-11-06',
          estado: 'confirmada',
          comprador: 'Hotel',
          centro: 'Cocina',
          orden_compra: 'OC-1',
          cantidad: 2,
          importe: 20,
          total_rango: 800,
        }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        user: { idUsuario: 'usr-listado', username: 'mateo', nombre: 'Mateo', codigoEmpresa: 'Y9IHZ' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });

  after(() => {
    if (urlOriginal === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal;
    if (claveOriginal === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = claveOriginal;
    globalThis.fetch = fetchOriginal;
  });

  it('pide sesión y un periodo válido', async () => {
    assert.equal((await POST(solicitud({}, ''))).status, 401);
    assert.equal((await POST(solicitud({ fecha_inicio: '2026-11-06', fecha_fin: '2026-11-01' }))).status, 400);
  });

  it('devuelve hasta 300 y el total del rango', async () => {
    const respuesta = await POST(solicitud({ fecha_inicio: '2026-11-01', fecha_fin: '2026-11-06' }));
    const cuerpo = await respuesta.json();
    assert.equal(respuesta.status, 200);
    assert.equal(cuerpo.total, 800);
    assert.equal(cuerpo.ordenes[0].numero, 'OV-1');
    assert.equal(cuerpo.ordenes[0].total_rango, undefined);
  });
});
