import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud(body, sesion = 'sesion-listado-excel') {
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

describe('POST excel del listado', () => {
  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/get_listado_ordenes')) {
        const cuerpo = JSON.parse(init.body);
        const filas = cuerpo.p_fecha_inicio === '2026-01-01' ? [] : [{
          numero: 'OV-9',
          fecha: '2026-11-02',
          estado: 'facturada',
          comprador: 'Hotel',
          centro: 'Cocina',
          orden_compra: 'OC-9',
          cantidad: 1,
          importe: 15,
          total_rango: 1,
        }];
        return new Response(JSON.stringify(filas), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        user: { idUsuario: 'usr-excel-listado', username: 'mateo', nombre: 'Mateo', codigoEmpresa: 'Y9IHZ' },
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

  it('devuelve el xlsx del periodo y avisa si está vacío', async () => {
    const conDatos = await POST(solicitud({ fecha_inicio: '2026-11-01', fecha_fin: '2026-11-06' }));
    assert.equal(conDatos.status, 200);
    assert.match(conDatos.headers.get('Content-Disposition'), /ordenes_2026-11-01_2026-11-06\.xlsx/);
    const vacio = await POST(solicitud({ fecha_inicio: '2026-01-01', fecha_fin: '2026-01-02' }));
    assert.equal(vacio.status, 404);
  });
});
