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

export async function consultarTableroRpc({ schema, fechaInicio, fechaFin }) {
  const baseUrl = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!baseUrl || !key) {
    throw new Error('Supabase no está configurado.');
  }

  const response = await fetch(`${baseUrl}/rest/v1/rpc/get_ventas_compras_inventario`, {
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

  if (!response.ok) {
    throw new Error(await leerError(response));
  }

  return normalizarFilasRpc(await response.json());
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
  if (fechaColumna) {
    queryParts.push(`${fechaColumna}=gte.${fechaInicio}`);
    queryParts.push(`${fechaColumna}=lt.${siguienteDiaIso(fechaFin)}`);
  }
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

export async function consultarVistaInventario({ schema }) {
  const { rows } = await consultarVista({
    schema,
    vista: 'vista_inventario',
    order: 'existencia_actual.desc,id_producto.asc,id_bodega.asc',
    uniqueKey: ['id_producto', 'id_bodega'],
  });
  return rows;
}
