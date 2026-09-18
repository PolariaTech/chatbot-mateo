import * as XLSX from 'xlsx';

const OCULTAR = /^(id_folio_digital|id_venta|id_comprador|estado_contable|cancelado|uuid_estado)$/i;

const DINERO = {
  neto: true,
  descuento: true,
  impuesto: true,
  total: true,
  pendiente: true,
};

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function valorCelda(column, valor) {
  if (valor && typeof valor === 'object') return JSON.stringify(valor);
  if (DINERO[column]) {
    const n = aNumero(valor);
    return n;
  }
  return valor ?? '';
}

export function construirPivotFolios(rows) {
  const grupos = new Map();

  rows.forEach((row) => {
    const contable = row.estado_contable_texto || 'na';
    const cancelado = row.cancelado_texto || 'na';
    const uuid = row.uuid_estado_texto || 'na';
    if (!grupos.has(contable)) grupos.set(contable, new Map());
    const porCancelado = grupos.get(contable);
    if (!porCancelado.has(cancelado)) porCancelado.set(cancelado, new Map());
    const porUuid = porCancelado.get(cancelado);
    if (!porUuid.has(uuid)) porUuid.set(uuid, []);
    porUuid.get(uuid).push(row);
  });

  const metricas = (filas) => ({
    folios: filas.length,
    neto: filas.reduce((acc, r) => acc + (aNumero(r.neto) || 0), 0),
    descuento: filas.reduce((acc, r) => acc + (aNumero(r.descuento) || 0), 0),
    impuesto: filas.reduce((acc, r) => acc + (aNumero(r.impuesto) || 0), 0),
    total: filas.reduce((acc, r) => acc + (aNumero(r.total) || 0), 0),
    pendiente: filas.reduce((acc, r) => acc + (aNumero(r.pendiente) || 0), 0),
  });

  const lineas = [];
  grupos.forEach((porCancelado, contable) => {
    const filasContable = [];
    const hijosContable = [];
    porCancelado.forEach((porUuid, cancelado) => {
      const filasCancelado = [];
      const hijosCancelado = [];
      porUuid.forEach((filas, uuid) => {
        filasCancelado.push(...filas);
        hijosCancelado.push({
          nivel: 3,
          etiqueta: uuid,
          ...metricas(filas),
        });
      });
      filasContable.push(...filasCancelado);
      hijosContable.push({
        nivel: 2,
        etiqueta: cancelado,
        ...metricas(filasCancelado),
        hijos: hijosCancelado,
      });
    });
    lineas.push({
      nivel: 1,
      etiqueta: contable,
      ...metricas(filasContable),
      hijos: hijosContable,
    });
  });

  return {
    lineas,
    total: metricas(rows),
  };
}

function aplanarPivot(pivot) {
  const out = [];
  pivot.lineas.forEach((contable) => {
    out.push({
      estado_contable: contable.etiqueta,
      cancelado: '',
      uuid_estado: '',
      ...contable,
    });
    (contable.hijos || []).forEach((cancelado) => {
      out.push({
        estado_contable: '',
        cancelado: cancelado.etiqueta,
        uuid_estado: '',
        ...cancelado,
      });
      (cancelado.hijos || []).forEach((uuid) => {
        out.push({
          estado_contable: '',
          cancelado: '',
          uuid_estado: uuid.etiqueta,
          ...uuid,
        });
      });
    });
  });
  out.push({
    estado_contable: 'Total general',
    cancelado: '',
    uuid_estado: '',
    ...pivot.total,
  });
  return out;
}

export function descargarExcelFolios(rows, { fechaInicio, fechaFin } = {}) {
  const columnas = Object.keys(rows[0] || {}).filter((c) => !OCULTAR.test(c));
  const detalle = rows.map((row) => {
    const out = {};
    columnas.forEach((column) => {
      out[column] = valorCelda(column, row[column]);
    });
    return out;
  });

  const pivot = construirPivotFolios(rows);
  const indicadores = aplanarPivot(pivot).map((linea) => ({
    ESTADO_CONTABLE: linea.estado_contable,
    CANCELADO: linea.cancelado,
    UUID_ESTADO: linea.uuid_estado,
    FOLIOS: linea.folios,
    NETO: linea.neto,
    DESCUENTO: linea.descuento,
    IMPUESTO: linea.impuesto,
    TOTAL: linea.total,
    PENDIENTE: linea.pendiente,
  }));

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(detalle), 'Detalle');
  XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(indicadores), 'Indicadores');

  const nombre = `reporte_folios_${fechaInicio || 'inicio'}_${fechaFin || 'fin'}.xlsx`;
  XLSX.writeFile(libro, nombre);
  return nombre;
}
