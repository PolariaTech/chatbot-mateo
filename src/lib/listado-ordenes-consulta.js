import { normalizeSupabaseUrl } from './supabase-server';

const PAGINA = 1000;
const TOPE_PANTALLA = 300;

export function debeContinuar(filas, firmaAnterior, tamanoPagina) {
  if (!filas.length || filas.length < tamanoPagina) return false;
  return firmaDe(filas) !== firmaAnterior;
}

export function firmaDe(filas) {
  const primera = filas[0] || {};
  return [primera.numero, primera.fecha_pedido, primera.importe, filas.length].join('|');
}

function limpiar(fila) {
  return {
    numero: fila.numero,
    fecha_pedido: fila.fecha_pedido,
    fecha_entrega: fila.fecha_entrega,
    estado: fila.estado,
    comprador: fila.comprador,
    centro: fila.centro,
    orden_compra: fila.orden_compra,
    cantidad: fila.cantidad,
    importe: fila.importe,
    creacion: fila.creacion,
  };
}

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error || 'No se pudo leer el listado.';
  } catch {
    return 'No se pudo leer el listado.';
  }
}

async function leerPagina({ schema, fechaInicio, fechaFin, desde, limite }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');
  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_listado_ordenes`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Profile': schema,
      'Content-Profile': schema,
    },
    body: JSON.stringify({
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
      p_desde: desde,
      p_limite: limite,
    }),
  });
  if (!response.ok && response.status !== 206) throw new Error(await leerError(response));
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('La consulta no devolvió filas.');
  return data;
}

export async function consultarListadoOrdenes({ schema, fechaInicio, fechaFin, limite }) {
  const unaSola = limite != null;
  const tamano = unaSola ? Math.min(Math.max(Number(limite) || TOPE_PANTALLA, 1), TOPE_PANTALLA) : PAGINA;
  const ordenes = [];
  let desde = 0;
  let firmaAnterior = '';
  let total = 0;
  while (desde < 200000) {
    const pagina = await leerPagina({ schema, fechaInicio, fechaFin, desde, limite: tamano });
    total = Number(pagina[0]?.total_rango) || total;
    const limpias = pagina.map(limpiar);
    if (!limpias.length || firmaDe(limpias) === firmaAnterior) break;
    firmaAnterior = firmaDe(limpias);
    ordenes.push(...limpias);
    if (unaSola || !debeContinuar(limpias, '', tamano)) break;
    desde += limpias.length;
  }
  return { ordenes, total: total || ordenes.length };
}
