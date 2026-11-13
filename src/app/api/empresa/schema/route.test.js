import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { GET } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud(sesion = 'sesion-schema') {
  return {
    headers: {
      get(nombre) {
        if (String(nombre).toLowerCase() === 'authorization' && sesion) return `Bearer ${sesion}`;
        return null;
      },
    },
  };
}

describe('GET schema de la empresa', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url) => {
      const direccion = String(url);
      if (direccion.includes('/rest/v1/empresa')) {
        return new Response(JSON.stringify({ schema_name: 'emp_demo_1xz77' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        user: { idUsuario: 'usr-demo', username: 'R5I8E', nombre: 'Demo', codigoEmpresa: '1XZ77' },
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

  it('rechaza una sesion ausente', async () => {
    assert.equal((await GET(solicitud(''))).status, 401);
  });

  it('devuelve el schema de la empresa logueada', async () => {
    const respuesta = await GET(solicitud());
    const cuerpo = await respuesta.json();
    assert.equal(respuesta.status, 200);
    assert.equal(cuerpo.schema, 'emp_demo_1xz77');
  });
});
