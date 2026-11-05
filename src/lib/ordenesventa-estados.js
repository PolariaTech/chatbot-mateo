export const ESTADOS_KPI = [
  ['por_confirmar', 'Por confirmar', 'verde'],
  ['confirmada', 'Confirmadas', 'cian'],
  ['alistamiento', 'En alistamiento', 'rosa'],
  ['alistada', 'Alistadas', 'gris'],
  ['revisada', 'Revisada', 'amarillo'],
  ['despachada', 'Despachada', 'oro'],
  ['facturada', 'Facturada', 'verde'],
];

export const ETAPAS_CICLO = [
  { clave: '0', titulo: 'Tiempo en Por confirmar', nombre: 'Por confirmar', limite: 60, limiteTexto: '60 min', color: '#2ee6a8', modo: 'espera', presupuesto: '1 h' },
  { clave: '1', titulo: 'Tiempo en Confirmada', nombre: 'Confirmada', limite: 60, limiteTexto: '60 min', color: '#7eb6ff', modo: 'espera', presupuesto: '1 h' },
  { clave: '2', titulo: 'Tiempo en Alistamiento', nombre: 'Alistamiento', limite: 120, limiteTexto: '2 h', color: '#d5ddd8', modo: 'trabajo', presupuesto: '2 h' },
  { clave: '3', titulo: 'Tiempo hasta Alistada', nombre: 'Alistada', limite: null, limiteTexto: null, color: '#9bb0a4', modo: 'lista', presupuesto: null },
  { clave: '4', titulo: 'Tiempo hasta Revisada', nombre: 'Revisada', limite: null, limiteTexto: null, color: '#e6c84a', modo: 'espera', presupuesto: null },
  { clave: '5', titulo: 'Tiempo hasta Despachada', nombre: 'Despachada', limite: null, limiteTexto: null, color: '#d4e07a', modo: 'espera', presupuesto: null },
  { clave: '6', titulo: 'Tiempo hasta Facturada', nombre: 'Facturada', limite: null, limiteTexto: null, color: '#8aa89c', modo: 'cierre', presupuesto: null },
];

export const SERIES_TENDENCIA = ETAPAS_CICLO.map((etapa) => [etapa.clave, etapa.nombre, etapa.color, etapa.limite]);

export const SERIES_ABIERTAS = SERIES_TENDENCIA.filter((serie) => serie[3] != null);

export function puntoTendencia(minutos, limite) {
  if (minutos == null) return null;
  if (limite == null) return Math.round(minutos * 10) / 10;
  return Math.round((minutos / limite) * 1000) / 10;
}

export const ETAPAS_GRAFICO = [
  ['0', 'Por confirmar', false],
  ['1', 'Confirmada', false],
  ['2', 'Alistamiento', false],
  ['3', 'Alistada', true],
  ['4', 'Revisada', true],
  ['5', 'Despachada', true],
  ['6', 'Facturada', true],
];

const ETIQUETA_ESTADO = {
  por_confirmar: 'Por confirmar',
  confirmada: 'Confirmada',
  alistamiento: 'Alistamiento',
  alistada: 'Alistada',
  revisada: 'Revisada',
  despachada: 'Despachada',
  facturada: 'Facturada',
};

export function etiquetaEstado(clave, etiqueta) {
  return ETIQUETA_ESTADO[clave] || etiqueta;
}

function numero(valor) {
  const cantidad = Number(valor);
  return Number.isFinite(cantidad) ? cantidad : 0;
}

function completarFila(fila, clave, etiqueta) {
  return {
    seccion: 'estado',
    clave,
    etiqueta: etiquetaEstado(clave, etiqueta),
    ordenes: fila ? numero(fila.ordenes) : 0,
    cantidad: fila ? numero(fila.cantidad) : 0,
    importe: fila ? numero(fila.importe) : 0,
  };
}

export function filasPorEstado(filas) {
  const lista = filas || [];
  const porClave = new Map(lista.map((fila) => [fila.clave, fila]));
  const conocidas = ESTADOS_KPI.map(([clave, etiqueta]) => completarFila(porClave.get(clave), clave, etiqueta));
  const extras = lista
    .filter((fila) => !ETIQUETA_ESTADO[fila.clave])
    .map((fila) => completarFila(fila, fila.clave, fila.etiqueta))
    .sort((a, b) => b.ordenes - a.ordenes);
  return conocidas.concat(extras);
}
