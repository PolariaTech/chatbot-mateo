import { normalizar, periodoValido, textoVentana, ventanaDeMarca, ventanaDeValores } from './descarga-ov.js';

export const COLUMNAS_OT = [
  {
    clave: 'numero',
    etiqueta: 'Orden de venta',
    campo: 'numero_orden',
    alias: ['numero', 'número', 'orden de venta', 'orden venta', 'ov', 'pedido'],
  },
  {
    clave: 'fecha',
    etiqueta: 'Fecha',
    campo: 'fecha',
    alias: ['fecha', 'fecha pedido'],
  },
  {
    clave: 'referencia',
    etiqueta: 'Orden de trabajo',
    campo: 'referencia',
    alias: ['referencia', 'orden de trabajo', 'orden de tarea', 'ot'],
  },
  {
    clave: 'modo',
    etiqueta: 'Modo',
    campo: 'modo',
    alias: ['modo', 'tipo desglose'],
  },
  {
    clave: 'producto',
    etiqueta: 'Producto',
    campo: 'producto',
    alias: ['producto', 'productos', 'productos vendidos', 'descripcion', 'descripción'],
  },
  {
    clave: 'cantidad',
    etiqueta: 'Cantidad',
    campo: 'cantidad',
    alias: ['cantidad', 'cantidades'],
  },
  {
    clave: 'unidad',
    etiqueta: 'Unidad',
    campo: 'unidad',
    alias: ['unidad', 'unidad de medida', 'uom'],
  },
  {
    clave: 'precio',
    etiqueta: 'Precio unitario',
    campo: 'precio',
    alias: ['precio', 'precio unitario', 'precio unit'],
  },
  {
    clave: 'importe',
    etiqueta: 'Monto total',
    campo: 'importe',
    alias: ['importe', 'monto', 'monto total', 'total', 'valor total'],
  },
  {
    clave: 'estado',
    etiqueta: 'Estado actual',
    campo: 'estado_actual',
    alias: ['estado', 'estado actual', 'estatus', 'status'],
  },
  {
    clave: 'estado_ov',
    etiqueta: 'Estado OV',
    campo: 'estado',
    alias: ['estado ov', 'estado de la ov', 'estado orden'],
  },
  {
    clave: 'estado_ot',
    etiqueta: 'Estado OT',
    campo: 'estado_ot',
    alias: ['estado ot', 'estado de la ot', 'estado orden trabajo'],
  },
  {
    clave: 'numero_pedido',
    etiqueta: 'Número de pedido',
    campo: 'numero_pedido',
    alias: ['numero pedido', 'número de pedido', 'pedido correo'],
  },
  {
    clave: 'almacen',
    etiqueta: 'Almacén',
    campo: 'almacen',
    alias: ['almacen', 'almacén', 'bodega', 'almacen bodega'],
  },
  {
    clave: 'destino',
    etiqueta: 'Destino',
    campo: 'destino',
    alias: ['destino'],
  },
];

const COLUMNAS_POR_DEFECTO = COLUMNAS_OT.map((columna) => columna.clave);

const ALIAS = COLUMNAS_OT.flatMap((columna) => [columna.clave, ...columna.alias].map((nombre) => ({
  nombre: normalizar(nombre),
  columna,
})));

function buscarColumna(pedida) {
  const nombre = normalizar(pedida);
  return ALIAS.find((item) => item.nombre === nombre)?.columna || null;
}

export function columnasOtPorClave(claves) {
  return (claves || [])
    .map((clave) => COLUMNAS_OT.find((columna) => columna.clave === clave))
    .filter(Boolean);
}

export function resolverColumnasOt(texto) {
  if (texto == null || String(texto).trim() === '') {
    return { columnas: columnasOtPorClave(COLUMNAS_POR_DEFECTO), desconocidas: [] };
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

function leerCampo(cuerpo, nombre) {
  const match = String(cuerpo || '').match(new RegExp(`(?:^|\\s)${nombre}=(.+?)(?=\\s+\\w+=|$)`, 'i'));
  return match ? match[1].trim() : '';
}

function interpretar(cuerpo) {
  const resuelto = resolverColumnasOt(leerCampo(cuerpo, 'columnas'));
  if (!resuelto.columnas.length) return null;
  const inicio = leerCampo(cuerpo, 'inicio') || leerCampo(cuerpo, 'fecha_inicio');
  const fin = leerCampo(cuerpo, 'fin') || leerCampo(cuerpo, 'fecha_fin');
  const ventana = ventanaDeMarca(cuerpo);
  if (!periodoValido(inicio, fin) || ventana.error) return null;
  return {
    tipo: 'ot',
    inicio,
    fin,
    ...ventana,
    columnas: resuelto.columnas.map((columna) => columna.clave),
    desconocidas: resuelto.desconocidas,
  };
}

export function leerDescargaOt(texto) {
  const raw = String(texto || '');
  const match = raw.match(/\[\[DESCARGAR_OT\s+([^\]]*)\]\]/i);
  if (!match) return { texto: raw.trim(), pedido: null };
  return {
    texto: raw.replace(/\[\[DESCARGAR_OT\s+[^\]]*\]\]/gi, '').trim(),
    pedido: interpretar(match[1]),
  };
}

export function marcarDescargaOt(texto, pedido) {
  const base = String(texto || '').trim();
  if (!pedido?.columnas?.length || !pedido.inicio || !pedido.fin) return base;
  const claves = pedido.columnas.map((columna) => columna.clave || columna).join(',');
  return `${base}\n[[DESCARGAR_OT inicio=${pedido.inicio} fin=${pedido.fin}${textoVentana(pedido)} columnas=${claves}]]`.trim();
}

function enriquecerFila(fila) {
  return {
    ...fila,
    estado_actual: fila.estado_ot || fila.estado || '',
  };
}

function valorColumna(fila, columna) {
  if (columna.campo === 'fecha') {
    const iso = String(fila.fecha || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }
  const valor = fila[columna.campo];
  return valor == null ? '' : valor;
}

export function filasOtParaExcel(lineas, claves) {
  const columnas = columnasOtPorClave(claves);
  if (!columnas.length) return [];
  return (lineas || [])
    .filter((fila) => fila.modo !== 'ninguno')
    .map((fila) => {
      const enriquecida = enriquecerFila(fila);
      const salida = {};
      columnas.forEach((columna) => {
        salida[columna.etiqueta] = valorColumna(enriquecida, columna);
      });
      return salida;
    });
}

export async function leerPedidoDescargaOt(request) {
  let body = {};
  try {
    body = await request.json();
  } catch {
    return { error: 'El cuerpo no es JSON válido.' };
  }

  const inicio = String(body.fecha_inicio || body.inicio || '');
  const fin = String(body.fecha_fin || body.fin || '');
  const ventana = ventanaDeValores(body.horas, body.hora_inicio, body.hora_fin);
  if (ventana.error) return { error: ventana.error };
  if (!periodoValido(inicio, fin)) return { error: 'Indica un periodo válido (inicio y fin).' };

  const texto = Array.isArray(body.columnas) ? body.columnas.join(',') : body.columnas;
  const { columnas } = resolverColumnasOt(texto);
  if (!columnas.length) return { error: 'Ninguna columna pedida está en el catálogo.' };
  return {
    tipo: 'ot',
    inicio,
    fin,
    ...ventana,
    columnas: columnas.map((columna) => columna.clave),
  };
}
