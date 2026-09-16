import * as XLSX from 'xlsx';

export const OCULTAR_COLUMNAS_VENTAS =
  /^(id_venta|id_comprador|id_line_item|id_producto|comprador_activo|es_primario|es_secundario|unidad_visualizacion|requiere_lote|producto_activo)$/i;

export const COLUMNAS_CONSOLIDADO_VENTAS = [
  'folio',
  'fecha_venta',
  'status_pago',
  'forma_pago',
  'metodo_pago',
  'codigo_comprador',
  'nombre_comprador',
  'contacto_comprador',
  'telefono_comprador',
  'lineas',
  'cantidad_pedida',
  'cantidad_line_item',
  'importe_line_item_mxn',
];

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function consolidarVentas(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.id_venta || row.folio;
    if (!key) return;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        folio: row.folio,
        fecha_venta: row.fecha_venta,
        status_pago: row.status_pago,
        forma_pago: row.forma_pago,
        metodo_pago: row.metodo_pago,
        codigo_comprador: row.codigo_comprador,
        nombre_comprador: row.nombre_comprador,
        contacto_comprador: row.contacto_comprador,
        telefono_comprador: row.telefono_comprador,
        lineas: 0,
        cantidad_pedida: 0,
        cantidad_line_item: 0,
        importe_line_item_mxn: 0,
      };
      map.set(key, agg);
    }
    agg.lineas += 1;
    agg.cantidad_pedida += aNumero(row.cantidad_pedida) || 0;
    agg.cantidad_line_item += aNumero(row.cantidad_line_item) || 0;
    agg.importe_line_item_mxn += aNumero(row.importe_line_item_mxn) || 0;
  });
  return [...map.values()];
}

export function descargarExcelVentas(rows, { consolidado, fechaInicio, fechaFin }) {
  const filas = consolidado ? consolidarVentas(rows) : rows;
  if (!filas.length) {
    throw new Error('No hay datos para exportar.');
  }

  const columnas = consolidado
    ? COLUMNAS_CONSOLIDADO_VENTAS
    : Object.keys(filas[0]).filter((column) => !OCULTAR_COLUMNAS_VENTAS.test(column));

  const hoja = filas.map((row) => {
    const out = {};
    columnas.forEach((column) => {
      const valor = row[column];
      out[column] = valor && typeof valor === 'object' ? JSON.stringify(valor) : valor;
    });
    return out;
  });

  const worksheet = XLSX.utils.json_to_sheet(hoja);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, consolidado ? 'Por venta' : 'Detalle');
  worksheet['!cols'] = columnas.map(() => ({ wch: 22 }));
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };

  const sufijo = consolidado ? 'por_venta' : 'detalle';
  const filename = `reporte_ventas_${sufijo}_${fechaInicio}_${fechaFin}.xlsx`;
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return filename;
}
