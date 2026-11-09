import { normalizeSupabaseUrl } from './supabase-server';
import { agregarVentana, filasDeRespuesta, totalDeRango } from './descarga-ov-consulta.js';

const PAGINA = 1000;

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error || 'No se pudo leer el desglose de órdenes.';
  } catch {
    return 'No se pudo leer el desglose de órdenes.';
  }
}

function firmaPagina(filas) {
  const primera = filas[0] || {};
  return [primera.numero_orden, primera.referencia, primera.producto, primera.modo, filas.length].join('|');
}

async function leerPagina({ baseUrl, key, schema, fechaInicio, fechaFin, desde, horas, horaInicio, horaFin }) {
  const hasta = desde + PAGINA - 1;
  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_operacion_desglose_ov`, {
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
    body: JSON.stringify(agregarVentana({
      p_fecha_inicio: fechaInicio,
      p_fecha_fin: fechaFin,
    }, horas, horaInicio, horaFin)),
  });
  if (!response.ok && response.status !== 206) throw new Error(await leerError(response));
  const filas = filasDeRespuesta(await response.json());
  return { filas, total: totalDeRango(response.headers.get('content-range')) };
}

export async function consultarDesgloseOv({ schema, fechaInicio, fechaFin, horas, horaInicio, horaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');

  const todas = [];
  let desde = 0;
  let firmaAnterior = '';
  while (desde < 200000) {
    const pagina = await leerPagina({ baseUrl, key, schema, fechaInicio, fechaFin, desde, horas, horaInicio, horaFin });
    const firma = firmaPagina(pagina.filas);
    if (!pagina.filas.length || firma === firmaAnterior) break;
    firmaAnterior = firma;
    todas.push(...pagina.filas);
    desde += pagina.filas.length;
    if (pagina.filas.length < PAGINA) break;
  }
  return todas;
}
