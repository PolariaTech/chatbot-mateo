import { normalizeSupabaseUrl } from './supabase-server';
import { tipoFechaOperacion } from './tipo-fecha-operacion';

const PAGINA = 1000;
const TOPE_PANTALLA = 300;

export function debeContinuar(filas, firmaAnterior, tamanoPagina) {
  if (!filas.length || filas.length < tamanoPagina) return false;
  return firmaDe(filas) !== firmaAnterior;
}

export function firmaDe(filas) {
  const primera = filas[0] || {};
  return [
    primera.numero,
    primera.orden_trabajo,
    primera.producto,
    primera.fecha_pedido,
    primera.importe,
    filas.length,
  ].join('|');
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
    ordenes_trabajo: Number(fila.ordenes_trabajo) || 0,
  };
}

function limpiarDetalle(fila) {
  return {
    numero: fila.numero,
    cliente: fila.cliente,
    estado: fila.estado,
    orden_trabajo: fila.orden_trabajo,
    codigo_producto: fila.codigo_producto,
    producto: fila.producto,
    cantidad: fila.cantidad,
    unidad: fila.unidad,
    importe: fila.importe,
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

async function leerPagina({ schema, rpc, cuerpo }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!baseUrl || !key) throw new Error('Supabase no está configurado.');
  const response = await fetch(`${baseUrl}/rest/v1/rpc/${rpc}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Accept-Profile': schema,
      'Content-Profile': schema,
    },
    body: JSON.stringify(cuerpo),
  });
  if (!response.ok && response.status !== 206) throw new Error(await leerError(response));
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('La consulta no devolvió filas.');
  return data;
}

export async function consultarListadoOrdenes({ schema, fechaInicio, fechaFin, tipoFecha, limite }) {
  const unaSola = limite != null;
  const tamano = unaSola ? Math.min(Math.max(Number(limite) || TOPE_PANTALLA, 1), TOPE_PANTALLA) : PAGINA;
  const ordenes = [];
  let desde = 0;
  let firmaAnterior = '';
  let total = 0;
  while (desde < 200000) {
    const pagina = await leerPagina({
      schema,
      rpc: 'get_listado_ordenes',
      cuerpo: {
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: fechaFin,
        p_fecha: tipoFechaOperacion(tipoFecha),
        p_desde: desde,
        p_limite: tamano,
      },
    });
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

export async function consultarDetalleOt({ schema, fechaInicio, fechaFin, tipoFecha }) {
  const filas = [];
  let desde = 0;
  let firmaAnterior = '';
  while (desde < 200000) {
    const pagina = await leerPagina({
      schema,
      rpc: 'get_detalle_ot_ordenes',
      cuerpo: {
        p_fecha_inicio: fechaInicio,
        p_fecha_fin: fechaFin,
        p_fecha: tipoFechaOperacion(tipoFecha),
        p_desde: desde,
        p_limite: PAGINA,
      },
    });
    const limpias = pagina.map(limpiarDetalle);
    if (!limpias.length || firmaDe(limpias) === firmaAnterior) break;
    firmaAnterior = firmaDe(limpias);
    filas.push(...limpias);
    if (!debeContinuar(limpias, '', PAGINA)) break;
    desde += limpias.length;
  }
  return filas;
}

export async function consultarProductosOrden({ schema, numero }) {
  const filas = await leerPagina({
    schema,
    rpc: 'get_productos_orden',
    cuerpo: { p_numero: numero },
  });
  return filas.map(limpiarDetalle);
}
