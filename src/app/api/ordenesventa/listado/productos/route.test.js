import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { POST } from './route.js';

const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveOriginal = process.env.SUPABASE_SERVICE_ROLE_KEY;
const fetchOriginal = globalThis.fetch;

function solicitud(body, sesion = 'sesion-productos') {
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

describe('POST productos de una orden', () => {
  let ultimoCuerpo;

  before(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'placeholder-service-role';
    globalThis.fetch = async (url, init) => {
      if (String(url).includes('/rpc/get_productos_orden')) {
        ultimoCuerpo = JSON.parse(init.body);
        return new Response(JSON.stringify([{
          numero: 'OV-00001842',
          cliente: 'Hotel',
          estado: 'por_confirmar',
          orden_trabajo: 'CANTINA',
          codigo_producto: 'X200072100',
          producto: 'ZARZAMORA',
          cantidad: 1,
          unidad: 'KGM',
          importe: 10,
        }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        user: { idUsuario: 'usr-productos', username: 'mateo', nombre: 'Mateo', codigoEmpresa: 'Y9IHZ' },
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

  it('rechaza una orden sin número', async () => {
    assert.equal((await POST(solicitud({ numero: 'pedido' }))).status, 400);
  });

  it('devuelve los productos del centro', async () => {
    const respuesta = await POST(solicitud({ numero: 'OV-00001842' }));
    const cuerpo = await respuesta.json();
    assert.equal(respuesta.status, 200);
    assert.equal(ultimoCuerpo.p_numero, 'OV-00001842');
    assert.equal(cuerpo.productos[0].orden_trabajo, 'CANTINA');
    assert.equal(cuerpo.productos[0].unidad, 'KGM');
  });
});
