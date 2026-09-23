import { normalizeSupabaseUrl } from './supabase-server';

const COLS_TABLERO = {
  idproducto: 'IdProducto',
  codigoproducto: 'CodigoProducto',
  nombreproducto: 'NombreProducto',
  unidad: 'Unidad',
  cantidadcompra: 'CantidadCompra',
  cantidadventa: 'CantidadVenta',
  cantidadmerma: 'CantidadMerma',
  existenciaactual: 'ExistenciaActual',
  costototalcompra: 'CostoTotalCompra',
  ventatotal: 'VentaTotal',
  costototalmerma: 'CostoTotalMerma',
  valorinventario: 'ValorInventario',
  costounitario: 'CostoUnitario',
  ventaunitaria: 'VentaUnitaria',
  mermadesecho: 'MermaDesecho',
};

function normalizarFilasRpc(filas) {
  return (filas || []).map((fila) => {
    const out = {};
    Object.keys(fila).forEach((k) => {
      out[COLS_TABLERO[k.toLowerCase()] || k] = fila[k];
    });
    return out;
  });
}

async function leerError(response) {
  try {
    const data = await response.json();
    return data.message || data.error_description || data.error || JSON.stringify(data);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function esTimeoutRpc(error) {
  const msg = String(error?.message || error || '');
  return /timeout|canceling statement|57014|aborted due to timeout/i.test(msg)
    || error?.name === 'TimeoutError'
    || error?.name === 'AbortError';
}

export function mensajeTimeoutConsulta(error, contexto) {
  if (!esTimeoutRpc(error) && !esTimeoutRpc(error?.message)) {
    return error?.message || 'Error ejecutando la consulta';
  }
  return contexto === 'volumen'
    ? 'El volumen de ventas tardó demasiado. Prueba 1S o 2S e inténtalo de nuevo.'
    : 'El tablero tardó demasiado. Espera un momento y vuelve a cargar; si se repite, usa un rango más corto.';
}

async function consultarRpcFechas({ schema, rpcName, fechaInicio, fechaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !key) {
    throw new Error('Supabase no está configurado.');
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/rest/v1/rpc/${rpcName}`, {
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
      }),
    });
  } catch (error) {
    if (esTimeoutRpc(error)) {
      throw new Error('canceling statement due to statement timeout');
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(await leerError(response));
  }

  return response.json();
}

export async function consultarTableroRpc({ schema, fechaInicio, fechaFin }) {
  const filas = await consultarRpcFechas({
    schema,
    rpcName: 'get_ventas_compras_inventario',
    fechaInicio,
    fechaFin,
  });
  return normalizarFilasRpc(filas);
}

export async function consultarTableroSkuRpc({ schema, fechaInicio, fechaFin }) {
  try {
    return await consultarRpcFechas({
      schema,
      rpcName: 'mateo_tablero_sku',
      fechaInicio,
      fechaFin,
    });
  } catch (error) {
    if (!/404|PGRST202|does not exist|could not find/i.test(String(error?.message || ''))) {
      throw error;
    }
    return consultarRpcFechas({
      schema,
      rpcName: 'get_tablero_sku',
      fechaInicio,
      fechaFin,
    });
  }
}

function claveFila(row, uniqueKey) {
  if (!uniqueKey) return null;
  if (Array.isArray(uniqueKey)) {
    const partes = uniqueKey.map((campo) => row?.[campo]);
    if (partes.every((valor) => valor == null || valor === '')) return null;
    return partes.join('\0');
  }
  return row?.[uniqueKey] ?? null;
}

function deduplicarFilas(rows, uniqueKey) {
  if (!uniqueKey) return rows;
  const seen = new Set();
  return rows.filter((row) => {
    const id = claveFila(row, uniqueKey);
    if (id == null || id === '') return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function siguienteDiaIso(fechaIso) {
  const d = new Date(`${fechaIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function serializarFiltrosEq(filtrosEq) {
  if (!filtrosEq || typeof filtrosEq !== 'object') return [];
  return Object.entries(filtrosEq).flatMap(([columna, valores]) => {
    const nums = (Array.isArray(valores) ? valores : [valores])
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));
    if (!nums.length) return [];
    if (nums.length === 1) return [`${columna}=eq.${nums[0]}`];
    return [`${columna}=in.(${nums.join(',')})`];
  });
}

function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function enumerarDiasIso(fechaInicio, fechaFin) {
  const dias = [];
  let dia = fechaInicio;
  while (dia <= fechaFin) {
    dias.push(dia);
    dia = addDaysIso(dia, 1);
  }
  return dias;
}

function claveProductoTablero(row) {
  return String(row.id_producto || row.codigo_producto || row.nombre_producto || '');
}

function nombreProductoTablero(row) {
  return String(row.nombre_producto || row.codigo_producto || 'Producto');
}

function isoFechaFila(valor) {
  const s = String(valor || '');
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s.slice(0, 10);
}

function aNumeroSerie(valor) {
  if (valor === null || valor === undefined || valor === '') return 0;
  const n = typeof valor === 'number' ? valor : Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function serieVacia(fechaInicio, fechaFin, dias = []) {
  return {
    inicio: fechaInicio,
    fin: fechaFin,
    granularidad: 'dia',
    dias,
    diasFin: dias,
    total: { importe: dias.map(() => 0), cantidad: dias.map(() => 0) },
    productos: [],
  };
}

async function consultarVentasPorDiaRpc({ schema, fechaInicio, fechaFin }) {
  return consultarRpcFechas({
    schema,
    rpcName: 'get_ventas_por_dia',
    fechaInicio,
    fechaFin,
  });
}

function armarSerieDesdeVentasPorDia(filas, fechaInicio, fechaFin) {
  const dias = enumerarDiasIso(fechaInicio, fechaFin);
  if (!dias.length) return serieVacia(fechaInicio, fechaFin);

  const indice = new Map(dias.map((dia, i) => [dia, i]));
  const totalImporte = Array(dias.length).fill(0);
  const totalCantidad = Array(dias.length).fill(0);
  const porProducto = new Map();

  (filas || []).forEach((row) => {
    const dia = isoFechaFila(row.fecha);
    const idx = indice.get(dia);
    if (idx == null) return;
    const importe = aNumeroSerie(row.venta_total ?? row.ventatotal);
    const cantidad = aNumeroSerie(row.cantidad_venta ?? row.cantidadventa);
    totalImporte[idx] += importe;
    totalCantidad[idx] += cantidad;
    const id = claveProductoTablero(row);
    if (!id) return;
    let prod = porProducto.get(id);
    if (!prod) {
      prod = {
        id,
        nombre: nombreProductoTablero(row),
        importe: Array(dias.length).fill(0),
        cantidad: Array(dias.length).fill(0),
      };
      porProducto.set(id, prod);
    }
    prod.importe[idx] += importe;
    prod.cantidad[idx] += cantidad;
  });

  const productos = [...porProducto.values()]
    .map((prod) => ({
      ...prod,
      totalImporte: prod.importe.reduce((a, b) => a + b, 0),
    }))
    .sort((a, b) => b.totalImporte - a.totalImporte)
    .map(({ totalImporte: _omit, ...prod }) => prod);

  return {
    inicio: fechaInicio,
    fin: fechaFin,
    granularidad: 'dia',
    dias,
    diasFin: dias,
    total: { importe: totalImporte, cantidad: totalCantidad },
    productos,
  };
}

export async function consultarSerieVentasDiarias({ schema, fechaInicio, fechaFin }) {
  const dias = enumerarDiasIso(fechaInicio, fechaFin);
  if (!dias.length) return serieVacia(fechaInicio, fechaFin);

  const filas = [];
  const tamVentana = 7;
  for (let i = 0; i < dias.length; i += tamVentana) {
    const ini = dias[i];
    const fin = dias[Math.min(i + tamVentana - 1, dias.length - 1)];
    const parte = await consultarVentasPorDiaRpc({
      schema,
      fechaInicio: ini,
      fechaFin: fin,
    });
    filas.push(...(parte || []));
  }
  return armarSerieDesdeVentasPorDia(filas, fechaInicio, fechaFin);
}

async function consultarVista({
  schema,
  vista,
  order,
  fechaColumna,
  fechaInicio,
  fechaFin,
  uniqueKey,
  limite,
  offset = 0,
  filtrosEq,
  select,
}) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !key) {
    throw new Error('Supabase no está configurado.');
  }

  const all = [];
  const page = 1000;
  const maxPaginas = 100;
  let from = Math.max(0, Number(offset) || 0);
  let total = null;
  const queryParts = [];
  if (select) queryParts.push(`select=${select}`);
  if (fechaColumna) {
    queryParts.push(`${fechaColumna}=gte.${fechaInicio}`);
    queryParts.push(`${fechaColumna}=lt.${siguienteDiaIso(fechaFin)}`);
  }
  queryParts.push(...serializarFiltrosEq(filtrosEq));
  const orderExpr = fechaColumna
    ? `${fechaColumna}.desc${order ? `,${order}` : ''}`
    : order;
  if (orderExpr) queryParts.push(`order=${orderExpr}`);
  const query = queryParts.join('&');
  const url = query ? `${baseUrl}/rest/v1/${vista}?${query}` : `${baseUrl}/rest/v1/${vista}`;

  for (let pagina = 0; pagina < maxPaginas; pagina += 1) {
    const response = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Accept-Profile': schema,
        Prefer: 'count=exact',
        Range: `${from}-${from + page - 1}`,
        'Range-Unit': 'items',
      },
    });

    if (!response.ok) {
      throw new Error(await leerError(response));
    }

    const chunk = await response.json();
    all.push(...chunk);

    const contentRange = response.headers.get('content-range') || '';
    const totalMatch = contentRange.match(/\/(\d+|\*)$/);
    total = totalMatch && totalMatch[1] !== '*' ? Number(totalMatch[1]) : total;
    const rows = deduplicarFilas(all, uniqueKey);
    const recortadas = limite ? rows.slice(0, limite) : rows;
    const gotAll = chunk.length < page || (total != null && from + chunk.length >= total);
    const reachedLimit = Boolean(limite) && recortadas.length >= limite;

    if (gotAll || reachedLimit) {
      return { rows: recortadas, total: total ?? rows.length };
    }
    from += page;
  }

  if (limite) {
    const rows = deduplicarFilas(all, uniqueKey);
    return { rows: rows.slice(0, limite), total: total ?? rows.length };
  }

  throw new Error('Hay demasiados registros. Reduce el rango o vuelve a consultar.');
}

export async function consultarVistaVentas({ schema, fechaInicio, fechaFin, limite, offset }) {
  return consultarVista({
    schema,
    vista: 'vista_ventas',
    fechaColumna: 'fecha_venta',
    fechaInicio,
    fechaFin,
    order: 'id_line_item.asc',
    uniqueKey: 'id_line_item',
    limite,
    offset,
  });
}

export async function consultarVistaCompras({ schema, fechaInicio, fechaFin }) {
  const { rows } = await consultarVista({
    schema,
    vista: 'vista_compras',
    fechaColumna: 'fecha_compra',
    fechaInicio,
    fechaFin,
    order: 'id_line_item.asc',
    uniqueKey: 'id_line_item',
  });
  return rows;
}

export async function consultarVistaFoliosDigitales({
  schema,
  fechaInicio,
  fechaFin,
  limite,
  offset,
  filtrosEq,
}) {
  return consultarVista({
    schema,
    vista: 'vista_folios_digitales',
    fechaColumna: 'fecha_emision',
    fechaInicio,
    fechaFin,
    order: 'id_folio_digital.asc',
    uniqueKey: 'id_folio_digital',
    limite,
    offset,
    filtrosEq,
  });
}

export async function consultarVistaInventario({ schema }) {
  const { rows } = await consultarVista({
    schema,
    vista: 'vista_inventario',
    order: 'existencia_actual.desc,id_producto.asc,id_bodega.asc',
    uniqueKey: ['id_producto', 'id_bodega'],
  });
  return rows;
}
