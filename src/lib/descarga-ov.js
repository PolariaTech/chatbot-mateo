const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export const COLUMNAS_OV = [
  { clave: 'numero', etiqueta: 'Número', campo: 'numero_orden', grupo: 'orden', alias: ['numero', 'número', 'folio', 'codigo', 'código', 'numero de orden', 'número de orden'] },
  { clave: 'fecha', etiqueta: 'Fecha', campo: 'fecha', grupo: 'orden', alias: ['fecha', 'fecha pedido', 'fecha de pedido', 'dia', 'día'] },
  { clave: 'estado', etiqueta: 'Estado', campo: 'estado', grupo: 'orden', alias: ['estado', 'estatus', 'status'] },
  { clave: 'orden_compra', etiqueta: 'Orden compra hotel', campo: 'orden_compra_hotel', grupo: 'orden', alias: ['orden de compra', 'orden compra', 'orden de compra del hotel', 'orden compra hotel', 'oc', 'pedido hotel'] },
  { clave: 'centro', etiqueta: 'Centro de consumo', campo: 'centro_consumo', grupo: 'orden', alias: ['centro', 'centro de consumo', 'centro consumo'] },
  { clave: 'comprador', etiqueta: 'Comprador', campo: 'comprador', grupo: 'orden', alias: ['comprador', 'cliente', 'nombre cliente'] },
  { clave: 'cantidad', etiqueta: 'Cantidad', campo: 'cantidad', grupo: 'orden', alias: ['cantidad', 'cantidades'] },
  { clave: 'importe', etiqueta: 'Importe', campo: 'importe', grupo: 'orden', alias: ['importe', 'total', 'venta', 'monto'] },
  { clave: 'producto', etiqueta: 'Producto', campo: 'producto', grupo: 'detalle', alias: ['producto', 'productos', 'descripcion', 'descripción', 'sku', 'codigo producto', 'código producto'] },
  { clave: 'unidad', etiqueta: 'Unidad', campo: 'unidad', grupo: 'detalle', alias: ['unidad', 'um', 'unidad de medida'] },
  { clave: 'precio', etiqueta: 'Precio', campo: 'precio', grupo: 'detalle', alias: ['precio', 'precio unitario'] },
];

const COLUMNAS_POR_DEFECTO = ['numero', 'fecha', 'orden_compra', 'centro', 'comprador', 'cantidad', 'importe'];

const ALIAS = COLUMNAS_OV.flatMap((columna) => [columna.clave, ...columna.alias].map((nombre) => ({
  nombre: normalizar(nombre),
  columna,
})));

function normalizar(texto) {
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

function interpretar(cuerpo) {
  const inicio = leerCampo(cuerpo, 'inicio') || leerCampo(cuerpo, 'fecha_inicio');
  const fin = leerCampo(cuerpo, 'fin') || leerCampo(cuerpo, 'fecha_fin');
  if (!periodoValido(inicio, fin)) return null;
  const resuelto = resolverColumnas(leerCampo(cuerpo, 'columnas'));
  if (!resuelto.columnas.length) return null;
  return {
    inicio,
    fin,
    columnas: resuelto.columnas.map((columna) => columna.clave),
    desconocidas: resuelto.desconocidas,
  };
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
  if (!pedido?.inicio || !pedido?.fin || !pedido.columnas?.length) return base;
  const claves = pedido.columnas.map((columna) => columna.clave || columna).join(',');
  return `${base}\n[[DESCARGAR_OV inicio=${pedido.inicio} fin=${pedido.fin} columnas=${claves}]]`.trim();
}

function claveOrden(fila) {
  return [
    fila.numero_orden, fila.fecha, fila.estado, fila.comprador, fila.orden_compra_hotel, fila.centro_consumo,
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

const MESES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

function clavesPorDefecto() {
  return resolverColumnas('').columnas.map((columna) => columna.clave);
}

function anioDelMes(mes, hoy) {
  const anio = hoy.getFullYear();
  return mes > hoy.getMonth() + 1 ? anio - 1 : anio;
}

function isoDia(anio, mes, dia) {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return '';
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function fechaNatural(dia, mesNombre, anioTexto, hoy) {
  const mes = MESES[mesNombre];
  if (!mes) return '';
  const anio = anioTexto ? Number(anioTexto) : anioDelMes(mes, hoy);
  return isoDia(anio, mes, Number(dia));
}

function armarPedido(inicio, fin) {
  if (!periodoValido(inicio, fin)) return null;
  return { inicio, fin, columnas: clavesPorDefecto(), desconocidas: [] };
}

function leerPeriodo(normal, hoy) {
  const isoRango = normal.match(/(\d{4}-\d{2}-\d{2})\s*(?:al|a|hasta)\s*(\d{4}-\d{2}-\d{2})/);
  if (isoRango) return armarPedido(isoRango[1], isoRango[2]);

  const dosMeses = normal.match(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?\s*(?:al|a|hasta)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (dosMeses) {
    return armarPedido(
      fechaNatural(dosMeses[1], dosMeses[2], dosMeses[3], hoy),
      fechaNatural(dosMeses[4], dosMeses[5], dosMeses[6], hoy),
    );
  }

  const mismoMes = normal.match(/(\d{1,2})\s*(?:al|a|hasta)\s*(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?/);
  if (!mismoMes) return null;
  return armarPedido(
    fechaNatural(mismoMes[1], mismoMes[3], mismoMes[4], hoy),
    fechaNatural(mismoMes[2], mismoMes[3], mismoMes[4], hoy),
  );
}

function pideArchivo(normal) {
  if (/\b(excel|archivo|descarga|descargame|xlsx)\b/.test(normal)) return true;
  return /\btodas\b/.test(normal) && /\b(ov|orden|ordenes)\b/.test(normal);
}

export function pedidoDesdeTexto(texto, hoy = new Date()) {
  const normal = normalizar(texto);
  if (!pideArchivo(normal)) return null;
  return leerPeriodo(normal, hoy);
}

export function pedidoDesdeConversacion(texto, anteriores, hoy = new Date()) {
  const directo = pedidoDesdeTexto(texto, hoy);
  if (directo) return directo;
  if (!pideArchivo(normalizar(texto))) return null;
  const previos = [...(anteriores || [])].reverse();
  for (const previo of previos) {
    if (previo?.tipo && previo.tipo !== 'usuario') continue;
    const contenido = typeof previo === 'string' ? previo : previo?.texto;
    const pedido = pedidoDesdeTexto(contenido, hoy) || leerPeriodo(normalizar(contenido), hoy);
    if (pedido) return pedido;
  }
  return null;
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
  if (!periodoValido(inicio, fin)) return { error: 'Indica un periodo válido (inicio y fin).' };

  const texto = Array.isArray(body.columnas) ? body.columnas.join(',') : body.columnas;
  const { columnas } = resolverColumnas(texto);
  if (!columnas.length) return { error: 'Ninguna columna pedida está en el catálogo.' };
  return { inicio, fin, columnas: columnas.map((columna) => columna.clave) };
}
