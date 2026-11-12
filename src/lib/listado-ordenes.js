import * as XLSX from 'xlsx';

export const TOPE_PANTALLA = 300;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const CLAVES_FECHA = { fecha: true, fecha_pedido: true, fecha_entrega: true };

export const COLUMNAS_ORDENES_VENTA = [
  ['numero', 'Número'],
  ['ordenes_trabajo', 'OT'],
  ['fecha_pedido', 'Fecha del pedido'],
  ['fecha_entrega', 'Fecha de entrega'],
  ['estado', 'Estado'],
  ['comprador', 'Cliente'],
  ['centro', 'Centro de consumo'],
  ['orden_compra', 'Orden de Compra'],
  ['cantidad', 'Cantidad de registros'],
  ['importe', 'Importe'],
  ['creacion', 'Fecha de registro'],
];

export const COLUMNAS_DETALLE_OT = [
  ['numero', 'Número'],
  ['cliente', 'Cliente'],
  ['estado', 'Estado'],
  ['orden_trabajo', 'Orden de trabajo'],
  ['codigo_producto', 'Código'],
  ['producto', 'Producto'],
  ['cantidad', 'Cantidad'],
  ['unidad', 'Unidad de medida'],
  ['importe', 'Importe'],
];

export function numeroOrden(valor) {
  const numero = String(valor || '').trim();
  if (!/^OV-\d{1,12}$/.test(numero)) return '';
  return numero;
}

export function gruposPorCentro(filas) {
  const grupos = [];
  const porCentro = new Map();
  (filas || []).forEach((fila) => {
    const centro = String(fila.orden_trabajo || '').trim() || 'Sin centro de consumo';
    let grupo = porCentro.get(centro);
    if (!grupo) {
      grupo = { centro, productos: [] };
      porCentro.set(centro, grupo);
      grupos.push(grupo);
    }
    grupo.productos.push(fila);
  });
  return grupos;
}

export function descargaListado(valor) {
  if (valor == null || String(valor).trim() === '' || String(valor).trim() === 'ov') return 'ov';
  if (String(valor).trim() === 'ot') return 'ot';
  return '';
}

export function validarPeriodo(inicio, fin) {
  if (!FECHA.test(inicio || '') || !FECHA.test(fin || '')) {
    return 'Indica fecha_inicio y fecha_fin (YYYY-MM-DD)';
  }
  if (inicio > fin) return 'La fecha inicio no puede ser mayor que la fecha fin';
  return '';
}

export function fechaVisible(valor) {
  const iso = String(valor || '').slice(0, 10);
  if (!FECHA.test(iso)) return valor == null ? '' : String(valor);
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function textoCelda(valor, clave) {
  if (valor == null || valor === '') return '';
  if (CLAVES_FECHA[clave]) return fechaVisible(valor);
  if (clave === 'importe') {
    const numero = Number(valor) || 0;
    return `$ ${numero.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (clave === 'ordenes_trabajo') {
    return Math.trunc(Number(valor) || 0).toLocaleString('es-MX');
  }
  if (clave === 'cantidad' || clave === 'ordenes') {
    return (Number(valor) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });
  }
  return String(valor);
}

export function notaDeTope(mostradas, total) {
  if (!total || total <= mostradas) return '';
  return `En pantalla van ${mostradas.toLocaleString('es-MX')} de ${total.toLocaleString('es-MX')}. El Excel trae todas.`;
}

export function filasExcel(columnas, filas) {
  return (filas || []).map((fila) => {
    const salida = {};
    columnas.forEach(([clave, etiqueta]) => {
      const valor = fila[clave];
      salida[etiqueta] = CLAVES_FECHA[clave] ? fechaVisible(valor) : valor ?? '';
    });
    return salida;
  });
}

export function libroListado(filas) {
  const hoja = XLSX.utils.json_to_sheet(filas.length ? filas : [{ Aviso: 'Sin registros' }]);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Listado');
  return XLSX.write(libro, { bookType: 'xlsx', type: 'array' });
}

export function nombreListado(prefijo, inicio, fin) {
  return `${prefijo}_${inicio}_${fin}.xlsx`;
}

export async function leerCuerpo(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
