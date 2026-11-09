import * as XLSX from 'xlsx';

export function nombreArchivoOt(inicio, fin) {
  if (!inicio || !fin) return 'ordenes_trabajo.xlsx';
  if (inicio === fin) return `ordenes_trabajo_${inicio}.xlsx`;
  return `ordenes_trabajo_${inicio}_${fin}.xlsx`;
}

export function libroOt(filas) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'OrdenesTrabajo');
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
}
