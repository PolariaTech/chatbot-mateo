import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

const LINEA = {
  numero_orden: 'OV-1',
  fecha: '2026-10-22',
  estado: 'facturada',
  comprador: 'Hotel',
  orden_compra_hotel: 'OC-1',
  centro_consumo: 'Cocina',
  producto: 'Leche',
  unidad: 'LT',
  cantidad: 2,
  precio: 10,
  importe: 20,
};

function solicitud({ sesion, body, jsonInvalido = false } = {}) {
  return {
    headers: {
      get(nombre) {
        if (String(nombre).toLowerCase() === 'authorization' && sesion) return `Bearer ${sesion}`;
        return null;
      },
    },
    async json() {
      if (jsonInvalido) throw new SyntaxError('JSON inválido');
      return body;
    },
  };
}

describe('POST excel de órdenes', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/get_export_ordenes')) {
        const cuerpo = JSON.parse(init.body);
        const filas = cuerpo.p_fecha_inicio === '2026-01-01' ? [] : [LINEA];
        return new Response(JSON.stringify(filas), {
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

  it('rechaza un periodo inválido', async () => {
    const respuesta = await POST(solicitud({
      sesion: 'sesion-excel',
      body: { fecha_inicio: '2026-10-31', fecha_fin: '2026-10-01', columnas: ['numero'] },
    }));
    assert.equal(respuesta.status, 400);
  });

  it('devuelve un xlsx cuando hay órdenes', async () => {
    const respuesta = await POST(solicitud({
      sesion: 'sesion-excel',
      body: { fecha_inicio: '2026-10-22', fecha_fin: '2026-10-29', columnas: ['numero', 'importe'] },
    }));
    assert.equal(respuesta.status, 200);
    assert.match(respuesta.headers.get('Content-Type'), /spreadsheetml/);
    const bytes = new Uint8Array(await respuesta.arrayBuffer());
    assert.equal(bytes[0], 0x50);
    assert.equal(bytes[1], 0x4b);
  });

  it('avisa cuando el periodo no tiene órdenes', async () => {
    const respuesta = await POST(solicitud({
      sesion: 'sesion-excel',
      body: { fecha_inicio: '2026-01-01', fecha_fin: '2026-01-02', columnas: ['numero'] },
    }));
    assert.equal(respuesta.status, 404);
  });
});
