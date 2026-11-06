import { normalizeSupabaseUrl } from './supabase-server';

const PAGINA = 1000;

export function filasDeRespuesta(data) {
  if (!Array.isArray(data)) throw new Error('La consulta no devolvió filas.');
  return data;
}

export function totalDeRango(contentRange) {
  const match = String(contentRange || '').match(/\/(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error || 'No se pudieron leer las órdenes.';
  } catch {
    return 'No se pudieron leer las órdenes.';
  }
}

function cuerpoExport(fechaInicio, fechaFin, desde) {
  return JSON.stringify({
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
    p_fecha: 'pedido',
    p_desde: desde,
    p_limite: PAGINA,
  });
}

function firmaPagina(filas) {
  const primera = filas[0] || {};
  return [primera.id_ov, primera.producto, primera.importe, filas.length].join('|');
}

async function leerPagina({ baseUrl, key, schema, fechaInicio, fechaFin, desde }) {
  const hasta = desde + PAGINA - 1;
  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_export_ordenes`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Profile': schema,
      'Content-Profile': schema,
      Prefer: 'count=exact',
      Range: `${desde}-${hasta}`,
    },
    body: cuerpoExport(fechaInicio, fechaFin, desde),
  });
  if (!response.ok && response.status !== 206) throw new Error(await leerError(response));
  const filas = filasDeRespuesta(await response.json());
  return { filas, total: totalDeRango(response.headers.get('content-range')) };
}

export async function consultarExportOrdenes({ schema, fechaInicio, fechaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');

  const todas = [];
  let desde = 0;
  let firmaAnterior = '';
  while (desde < 200000) {
    const pagina = await leerPagina({ baseUrl, key, schema, fechaInicio, fechaFin, desde });
    const firma = firmaPagina(pagina.filas);
    if (!pagina.filas.length || firma === firmaAnterior) break;
    firmaAnterior = firma;
    todas.push(...pagina.filas);
    desde += pagina.filas.length;
    if (pagina.filas.length < PAGINA) break;
  }
  return todas;
}
