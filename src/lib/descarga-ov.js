const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const COLUMNAS_OV = [
  { clave: 'numero', etiqueta: 'Número', campo: 'numero_orden', grupo: 'orden', alias: ['numero', 'número', 'folio', 'codigo', 'código', 'numero de orden', 'número de orden'] },
  { clave: 'fecha', etiqueta: 'Fecha', campo: 'fecha', grupo: 'orden', alias: ['fecha', 'fecha pedido', 'fecha de pedido', 'dia', 'día'] },
  { clave: 'estado', etiqueta: 'Estado', campo: 'estado', grupo: 'orden', alias: ['estado', 'estatus', 'status'] },
  { clave: 'orden_compra', etiqueta: 'Orden de Compra', campo: 'orden_compra_hotel', grupo: 'orden', alias: ['orden de compra', 'orden compra', 'orden de compra del hotel', 'orden compra hotel', 'oc', 'pedido hotel'] },
  { clave: 'centro', etiqueta: 'Centro de consumo', campo: 'centro_consumo', grupo: 'orden', alias: ['centro', 'centro de consumo', 'centro consumo'] },
  { clave: 'comprador', etiqueta: 'Comprador', campo: 'comprador', grupo: 'orden', alias: ['comprador'] },
  { clave: 'cliente', etiqueta: 'Cliente', campo: 'cliente', grupo: 'orden', alias: ['cliente', 'nombre cliente'] },
  { clave: 'id', etiqueta: 'ID', campo: 'id_ov', grupo: 'orden', alias: ['id', 'id de la ov', 'id ov', 'id de la orden', 'id orden'] },
  { clave: 'creacion', etiqueta: 'Creación', campo: 'creacion', grupo: 'orden', alias: ['creacion', 'creado', 'creados', 'timestamp de creacion', 'fecha de creacion', 'fecha creacion'] },
  { clave: 'entrega', etiqueta: 'Fecha de entrega', campo: 'entrega', grupo: 'orden', alias: ['entrega', 'fecha de entrega solicitada', 'fecha de entrega', 'fecha entrega'] },
  { clave: 'cantidad', etiqueta: 'Cantidad', campo: 'cantidad', grupo: 'orden', alias: ['cantidad', 'cantidades'] },
  { clave: 'importe', etiqueta: 'Importe', campo: 'importe', grupo: 'orden', alias: ['importe', 'venta', 'monto'] },
  { clave: 'total', etiqueta: 'Total', campo: 'total', grupo: 'orden', alias: ['total', 'valor total', 'valor total del pedido', 'total del pedido'] },
  { clave: 'producto', etiqueta: 'Producto', campo: 'producto', grupo: 'detalle', alias: ['producto', 'productos', 'descripcion', 'descripción', 'sku', 'codigo producto', 'código producto'] },
  { clave: 'unidad', etiqueta: 'Unidad', campo: 'unidad', grupo: 'detalle', alias: ['unidad', 'um', 'unidad de medida'] },
  { clave: 'precio', etiqueta: 'Precio', campo: 'precio', grupo: 'detalle', alias: ['precio', 'precio unitario'] },
];

const COLUMNAS_POR_DEFECTO = COLUMNAS_OV.map((columna) => columna.clave);

const ALIAS = COLUMNAS_OV.flatMap((columna) => [columna.clave, ...columna.alias].map((nombre) => ({
  nombre: normalizar(nombre),
  columna,
})));

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buscarColumna(pedida) {
  const nombre = normalizar(pedida);
  return ALIAS.find((item) => item.nombre === nombre)?.columna || null;
}

export function columnasPorClave(claves) {
  return (claves || [])
    .map((clave) => COLUMNAS_OV.find((columna) => columna.clave === clave))
    .filter(Boolean);
}

export function resolverColumnas(texto) {
  if (texto == null || String(texto).trim() === '') {
    return { columnas: columnasPorClave(COLUMNAS_POR_DEFECTO), desconocidas: [] };
  }

  const columnas = [];
  const desconocidas = [];
  String(texto).split(',').map((parte) => parte.trim()).filter(Boolean).forEach((pedida) => {
    const columna = buscarColumna(pedida);
    if (!columna) desconocidas.push(pedida);
    else if (!columnas.some((actual) => actual.clave === columna.clave)) columnas.push(columna);
  });
  return { columnas, desconocidas };
}

export function periodoValido(inicio, fin) {
  return FECHA.test(String(inicio || '')) && FECHA.test(String(fin || '')) && inicio <= fin;
}

function leerCampo(cuerpo, nombre) {
  const match = String(cuerpo || '').match(new RegExp(`${nombre}=(.+?)(?=\\s+\\w+=|$)`, 'i'));
  return match ? match[1].trim() : '';
}

function fechaDeMarca(cuerpo) {
  return /(?:^|\s)fecha=creacion\b/i.test(cuerpo) ? 'creacion' : 'pedido';
}

function pedidoDeColumnas(resuelto, extra) {
  if (!resuelto.columnas.length) return null;
  return {
    ...extra,
    columnas: resuelto.columnas.map((columna) => columna.clave),
    desconocidas: resuelto.desconocidas,
  };
}

function interpretar(cuerpo) {
  const resuelto = resolverColumnas(leerCampo(cuerpo, 'columnas'));
  if (/(?:^|\s)todo=si\b/i.test(cuerpo)) {
    return pedidoDeColumnas(resuelto, { todo: true, inicio: null, fin: null, fecha: 'pedido' });
  }
  const inicio = leerCampo(cuerpo, 'inicio') || leerCampo(cuerpo, 'fecha_inicio');
  const fin = leerCampo(cuerpo, 'fin') || leerCampo(cuerpo, 'fecha_fin');
  if (!periodoValido(inicio, fin)) return null;
  return pedidoDeColumnas(resuelto, { todo: false, inicio, fin, fecha: fechaDeMarca(cuerpo) });
}

export function leerDescargaOv(texto) {
  const raw = String(texto || '');
  const match = raw.match(/\[\[DESCARGAR_OV\s+([^\]]*)\]\]/i);
  if (!match) return { texto: raw.trim(), pedido: null };
  return {
    texto: raw.replace(/\[\[DESCARGAR_OV\s+[^\]]*\]\]/gi, '').trim(),
    pedido: interpretar(match[1]),
  };
}

export function marcarDescarga(texto, pedido) {
  const base = String(texto || '').trim();
  if (!pedido?.columnas?.length) return base;
  const claves = pedido.columnas.map((columna) => columna.clave || columna).join(',');
  if (pedido.todo) return `${base}\n[[DESCARGAR_OV todo=si columnas=${claves}]]`.trim();
  if (!pedido.inicio || !pedido.fin) return base;
  const fecha = pedido.fecha === 'creacion' ? ' fecha=creacion' : '';
  return `${base}\n[[DESCARGAR_OV inicio=${pedido.inicio} fin=${pedido.fin}${fecha} columnas=${claves}]]`.trim();
}

function claveOrden(fila) {
  return [
    fila.id_ov, fila.numero_orden, fila.creacion, fila.entrega, fila.cliente,
    fila.fecha, fila.estado, fila.comprador, fila.orden_compra_hotel, fila.centro_consumo,
  ].join('|');
}

export function agruparOrdenes(lineas) {
  const grupos = new Map();
  (lineas || []).forEach((linea) => {
    const clave = claveOrden(linea);
    const previo = grupos.get(clave);
    if (!previo) {
      grupos.set(clave, {
        ...linea,
        cantidad: Number(linea.cantidad) || 0,
        importe: Number(linea.importe) || 0,
      });
      return;
    }
    previo.cantidad += Number(linea.cantidad) || 0;
    previo.importe += Number(linea.importe) || 0;
  });
  return [...grupos.values()];
}

function fechaVisible(valor) {
  const iso = String(valor || '').slice(0, 10);
  if (!FECHA.test(iso)) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

function valorColumna(fila, columna) {
  if (columna.campo === 'fecha') return fechaVisible(fila.fecha);
  if (columna.campo === 'entrega') {
    const texto = String(fila.entrega || '');
    return FECHA.test(texto.slice(0, 10)) ? fechaVisible(texto) : texto;
  }
  const valor = fila[columna.campo];
  return valor == null ? '' : valor;
}

function filaVisible(fila, columnas) {
  const salida = {};
  columnas.forEach((columna) => {
    salida[columna.etiqueta] = valorColumna(fila, columna);
  });
  return salida;
}

export function filasParaExcel(lineas, claves) {
  const columnas = columnasPorClave(claves);
  if (!columnas.length) return [];
  const detalle = columnas.some((columna) => columna.grupo === 'detalle');
  const base = detalle ? (lineas || []) : agruparOrdenes(lineas);
  return base.map((fila) => filaVisible(fila, columnas));
}

export async function leerPedidoDescarga(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return { error: 'El cuerpo no es JSON válido.' };
  }

  const inicio = String(body.fecha_inicio || '');
  const fin = String(body.fecha_fin || '');
  const todo = body.todo === true || String(body.todo || '').toLowerCase() === 'si';
  const fecha = String(body.fecha || '').toLowerCase() === 'creacion' ? 'creacion' : 'pedido';
  if (!todo && !periodoValido(inicio, fin)) return { error: 'Indica un periodo válido (inicio y fin).' };

  const texto = Array.isArray(body.columnas) ? body.columnas.join(',') : body.columnas;
  const { columnas } = resolverColumnas(texto);
  if (!columnas.length) return { error: 'Ninguna columna pedida está en el catálogo.' };
  return {
    todo,
    inicio: todo ? null : inicio,
    fin: todo ? null : fin,
    fecha,
    columnas: columnas.map((columna) => columna.clave),
  };
}
