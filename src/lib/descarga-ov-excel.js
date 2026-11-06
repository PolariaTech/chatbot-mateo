import * as XLSX from 'xlsx';

export function nombreArchivoOrdenes(inicio, fin) {
  if (!inicio || !fin) return 'ordenes_todo.xlsx';
  return `ordenes_${inicio}_${fin}.xlsx`;
}

export function libroOrdenes(filas) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Ordenes');
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
}
