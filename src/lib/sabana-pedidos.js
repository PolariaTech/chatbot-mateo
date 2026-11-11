import { consolidarLineas, esDetalle } from './sabana-pedidos-consolidado.js';

const DIA = /^(\d{4})-(\d{2})-(\d{2})/;
const HOJA_COMPLETA = 12;

export const COLUMNAS_SABANA = [
  { campo: 'orden_venta', etiqueta: 'Orden de venta', claves: ['numero', 'id', 'orden_venta'] },
  { campo: 'estado', etiqueta: 'Estado', claves: ['estado', 'estado_ov'] },
  { campo: 'cliente', etiqueta: 'Cliente', claves: ['cliente', 'comprador'] },
  { campo: 'orden_compra', etiqueta: 'Orden de compra', claves: ['orden_compra'] },
  { campo: 'fecha_pedido', etiqueta: 'Fecha del pedido', claves: ['fecha', 'fecha_pedido'] },
  { campo: 'fecha_creacion', etiqueta: 'Fecha de creación', claves: ['creacion', 'fecha_creacion'] },
  { campo: 'fecha_entrega', etiqueta: 'Fecha de entrega', claves: ['entrega', 'fecha_entrega'] },
  { campo: 'orden_trabajo', etiqueta: 'Orden de trabajo', claves: ['referencia', 'orden_trabajo'] },
  { campo: 'tipo_orden_trabajo', etiqueta: 'Tipo de orden de trabajo', claves: ['tipo_orden_trabajo'] },
  { campo: 'estado_orden_trabajo', etiqueta: 'Estado de la orden de trabajo', claves: ['estado_ot', 'estado_orden_trabajo'] },
  { campo: 'fecha_creacion_orden_trabajo', etiqueta: 'Fecha de creación de la orden de trabajo', claves: ['fecha_creacion_orden_trabajo'] },
  { campo: 'almacen', etiqueta: 'Almacén', claves: ['centro', 'almacen'] },
  { campo: 'destino', etiqueta: 'Destino', claves: ['destino'] },
  { campo: 'numero_pedido', etiqueta: 'Número de pedido', claves: ['numero_pedido'] },
  { campo: 'producto', etiqueta: 'Producto', claves: ['producto'] },
  { campo: 'codigo_producto', etiqueta: 'Código del producto', claves: ['codigo_producto'] },
  { campo: 'unidad', etiqueta: 'Unidad', claves: ['unidad'] },
  { campo: 'cantidad', etiqueta: 'Cantidad', claves: ['cantidad'] },
  { campo: 'precio', etiqueta: 'Precio', claves: ['precio'] },
  { campo: 'importe', etiqueta: 'Importe', claves: ['importe'] },
  { campo: 'ventana_desde', etiqueta: 'Ventana desde', claves: ['ventana_desde'] },
  { campo: 'ventana_hasta', etiqueta: 'Ventana hasta', claves: ['ventana_hasta'] },
  { campo: 'direccion_entrega', etiqueta: 'Dirección de entrega', claves: ['direccion_entrega'] },
  { campo: 'contacto_entrega', etiqueta: 'Contacto de entrega', claves: ['contacto_entrega'] },
  { campo: 'telefono', etiqueta: 'Teléfono', claves: ['telefono'] },
  { campo: 'vendedor', etiqueta: 'Vendedor', claves: ['vendedor'] },
  { campo: 'prioridad', etiqueta: 'Prioridad', claves: ['prioridad'] },
  { campo: 'moneda', etiqueta: 'Moneda', claves: ['moneda'] },
];

const COLUMNAS_AGREGADAS = [
  { campo: 'importe', etiqueta: 'Valor total', claves: ['total'] },
  { campo: 'cantidad_ot', etiqueta: 'Cantidad de órdenes de trabajo', claves: ['cantidad_ot'] },
  { campo: 'productos_distintos', etiqueta: 'Cantidad de productos distintos', claves: ['productos_distintos'] },
];

const POR_CLAVE = new Map([...COLUMNAS_SABANA, ...COLUMNAS_AGREGADAS].flatMap((columna) => (
  columna.claves.map((clave) => [clave, columna])
)));

export function columnasSabana(claves) {
  const pedidas = [];
  (claves || []).forEach((clave) => {
    const columna = POR_CLAVE.get(clave);
    if (columna && !pedidas.includes(columna)) pedidas.push(columna);
  });
  if (pedidas.length >= HOJA_COMPLETA) return COLUMNAS_SABANA;
  return pedidas;
}

function diaVisible(valor) {
  const texto = String(valor || '').trim();
  const match = texto.match(DIA);
  if (!match) return texto;
  const [, anio, mes, dia] = match;
  const fecha = new Date(`${anio}-${mes}-${dia}T00:00:00Z`);
  const mesReal = fecha.getUTCMonth() + 1;
  if (fecha.getUTCFullYear() !== Number(anio) || mesReal !== Number(mes)) return texto;
  return `${dia}/${mes}/${anio}`;
}

function creacionVisible(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return '';
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return texto;
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Cancun',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);
  const tomar = (tipo) => partes.find((parte) => parte.type === tipo)?.value || '';
  return `${tomar('day')}/${tomar('month')}/${tomar('year')} ${tomar('hour')}:${tomar('minute')}`;
}

function valorVisible(fila, columna) {
  const valor = fila[columna.campo];
  if (valor == null || valor === '') return '';
  if (columna.campo === 'fecha_pedido' || columna.campo === 'fecha_entrega') return diaVisible(valor);
  if (columna.campo.startsWith('fecha_creacion')) return creacionVisible(valor);
  return valor;
}

function filaVisible(fila, columnas) {
  const salida = {};
  columnas.forEach((columna) => {
    salida[columna.etiqueta] = valorVisible(fila, columna);
  });
  return salida;
}

export function filasSabana(lineas, claves) {
  const columnas = columnasSabana(claves);
  if (!columnas.length) return [];
  const base = esDetalle(columnas) ? (lineas || []) : consolidarLineas(lineas, columnas);
  return base.map((fila) => filaVisible(fila, columnas));
}
