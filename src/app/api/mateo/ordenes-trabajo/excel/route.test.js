import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud({ sesion, body } = {}) {
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

describe('POST excel de órdenes de trabajo', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url) => {
      if (String(url).includes('/rpc/get_sabana_pedidos')) {
        return new Response(JSON.stringify([
          {
            numero_orden: 'OV-1',
            modo: 'ot',
            referencia: 'OT-1',
            producto: 'Limón',
            importe: 20,
            estado: 'confirmada',
            estado_ot: 'planificada',
          },
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        user: { idUsuario: 'usr-1', username: 'mateo', nombre: 'Mateo', codigoEmpresa: 'Y9IHZ' },
      }), {
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

  it('pide sesión', async () => {
    const respuesta = await POST(solicitud({ body: {} }));
    assert.equal(respuesta.status, 401);
  });

  it('devuelve xlsx del desglose', async () => {
    const respuesta = await POST(solicitud({
      sesion: 'sesion-ot',
      body: {
        fecha_inicio: '2026-10-31',
        fecha_fin: '2026-10-31',
        columnas: ['numero', 'producto', 'importe'],
      },
    }));
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get('Content-Disposition'), /ordenes_trabajo_2026-10-31\.xlsx/);
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    assert.equal(bytes[0], 0x50);
  });
});
