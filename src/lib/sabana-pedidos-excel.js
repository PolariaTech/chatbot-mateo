import * as XLSX from 'xlsx';

export function nombreArchivoSabana(inicio, fin) {
  if (!inicio || !fin) return 'pedidos.xlsx';
  if (inicio === fin) return `pedidos_${inicio}.xlsx`;
  return `pedidos_${inicio}_${fin}.xlsx`;
}

export function libroSabana(filas) {
  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, 'Pedidos');
  return XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' });
}
