import * as XLSX from 'xlsx';

export const TOPE_PANTALLA = 300;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

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
  if (clave === 'fecha') return fechaVisible(valor);
  if (clave === 'importe') {
    const numero = Number(valor) || 0;
    return `$ ${numero.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      salida[etiqueta] = clave === 'fecha' ? fechaVisible(fila[clave]) : fila[clave] ?? '';
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
