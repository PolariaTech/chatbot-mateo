import { normalizeSupabaseUrl } from './supabase-server';
import { agregarVentana, filasDeRespuesta, totalDeRango } from './descarga-ov-consulta.js';

const PAGINA = 1000;

async function leerError(response) {
  try {
    const cuerpo = await response.json();
    return cuerpo.message || cuerpo.error || 'No se pudo leer la sábana de pedidos.';
  } catch {
    return 'No se pudo leer la sábana de pedidos.';
  }
}

function firmaPagina(filas) {
  const primera = filas[0] || {};
  return [primera.orden_venta, primera.orden_trabajo, primera.producto, primera.almacen, filas.length].join('|');
}

function cuerpoConsulta({ fechaInicio, fechaFin, fecha, horas, horaInicio, horaFin }) {
  const periodo = fecha === 'creacion' || fecha === 'entrega' ? fecha : 'pedido';
  return JSON.stringify(agregarVentana({
    p_fecha_inicio: fechaInicio,
    p_fecha_fin: fechaFin,
    p_fecha: periodo,
  }, horas, horaInicio, horaFin));
}

async function leerPagina({ baseUrl, key, schema, fechaInicio, fechaFin, fecha, desde, horas, horaInicio, horaFin }) {
  const hasta = desde + PAGINA - 1;
  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_sabana_pedidos`, {
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
    body: cuerpoConsulta({ fechaInicio, fechaFin, fecha, horas, horaInicio, horaFin }),
  });
  if (!response.ok && response.status !== 206) throw new Error(await leerError(response));
  const filas = filasDeRespuesta(await response.json());
  return { filas, total: totalDeRango(response.headers.get('content-range')) };
}

export async function consultarSabanaPedidos({ schema, fechaInicio, fechaFin, fecha, horas, horaInicio, horaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');

  const todas = [];
  let desde = 0;
  let firmaAnterior = '';
  while (desde < 200000) {
    const pagina = await leerPagina({
      baseUrl, key, schema, fechaInicio, fechaFin, fecha, desde, horas, horaInicio, horaFin,
    });
    const firma = firmaPagina(pagina.filas);
    if (!pagina.filas.length || firma === firmaAnterior) break;
    firmaAnterior = firma;
    todas.push(...pagina.filas);
    desde += pagina.filas.length;
    if (pagina.filas.length < PAGINA) break;
  }
  return todas;
}
