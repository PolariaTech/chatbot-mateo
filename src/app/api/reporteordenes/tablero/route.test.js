import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud() {
  return {
    headers: {
      get(nombre) {
        if (String(nombre).toLowerCase() === 'authorization') return 'Bearer sesion-reporteordenes';
        return null;
      },
    },
    json: async () => ({ fecha_inicio: '2026-11-01', fecha_fin: '2026-11-13' }),
  };
}

describe('POST reporte de ordenes cuando no se lee el schema', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url) => {
      if (String(url).includes('/rest/v1/empresa')) {
        return new Response(JSON.stringify({ message: 'fallo' }), { status: 500 });
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

  it('responde 500 y no deja la excepcion sin atrapar', async () => {
    const respuesta = await POST(solicitud());
    const cuerpo = await respuesta.json();
    assert.equal(respuesta.status, 500);
    assert.equal(cuerpo.success, false);
    assert.match(cuerpo.error, /No se pudo leer el schema de la empresa/);
  });
});
