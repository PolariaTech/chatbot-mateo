import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud(body, sesion = 'sesion-tablero') {
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

describe('POST tablero de operación', () => {
  let ultimoCuerpo;

  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/get_operacion_ordenes')) {
        ultimoCuerpo = JSON.parse(init.body);
        return new Response(JSON.stringify([{ seccion: 'resumen', ordenes: 1 }]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        user: { idUsuario: 'usr-tablero', username: 'mateo', nombre: 'Mateo', codigoEmpresa: 'Y9IHZ' },
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

  it('abre por fecha de entrega y acepta pedido o registro', async () => {
    const entrega = await POST(solicitud({ fecha_inicio: '2026-11-06', fecha_fin: '2026-11-12' }));
    assert.equal(entrega.status, 200);
    assert.equal(ultimoCuerpo.p_fecha, 'entrega');

    const pedido = await POST(solicitud({
      fecha_inicio: '2026-11-06',
      fecha_fin: '2026-11-12',
      tipo_fecha: 'pedido',
    }));
    assert.equal(pedido.status, 200);
    assert.equal(ultimoCuerpo.p_fecha, 'pedido');

    const registro = await POST(solicitud({
      fecha_inicio: '2026-11-06',
      fecha_fin: '2026-11-12',
      tipo_fecha: 'registro',
    }));
    assert.equal(registro.status, 200);
    assert.equal(ultimoCuerpo.p_fecha, 'creacion');
  });

  it('rechaza un tipo de fecha desconocido', async () => {
    const respuesta = await POST(solicitud({
      fecha_inicio: '2026-11-06',
      fecha_fin: '2026-11-12',
      tipo_fecha: 'despacho',
    }));
    assert.equal(respuesta.status, 400);
  });
});
