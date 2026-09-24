'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';
import IndicadorVolumenVentas from './IndicadorVolumenVentas';

const EXCLUIR_SUMA = /^(id_|cid_|codigo|sku|nombre|tipo_|unidad)/i;
const OCULTAR_COLUMNAS = /^(id_producto|cid_producto|tipo_producto)$/i;
const MOSTRAR_HISTOGRAMA = true;
const MOSTRAR_COLORES_MARGEN = false;
const COLUMNAS_PRIMERO = [
  ['nombre_producto', 'nombreproducto'],
  ['unidad', 'unidad_medida', 'unidad_sku'],
  ['cantidad_compra', 'cantidadcompra'],
  ['cantidad_venta', 'cantidadventa'],
  ['costo_total_compra', 'costototalcompra'],
  ['venta_total', 'ventatotal'],
  ['costo_unitario', 'costounitario'],
  ['venta_unitaria', 'ventaunitaria'],
  ['margen_bruto', 'margenbruto'],
  ['costo_unitario_estimado', 'costounitarioestimado'],
  ['margen_estimado', 'margenestimado'],
];

function ordenarColumnas(columnas) {
  const byLower = new Map(columnas.map((col) => [col.toLowerCase(), col]));
  const usados = new Set();
  const primero = [];
  COLUMNAS_PRIMERO.forEach((aliases) => {
    const actual = aliases.map((alias) => byLower.get(alias)).find(Boolean);
    if (actual && !usados.has(actual)) {
      primero.push(actual);
      usados.add(actual);
    }
  });
  return [...primero, ...columnas.filter((col) => !usados.has(col))];
}

function esColumnaNombreProducto(column) {
  return /^(nombre_producto|nombreproducto)$/i.test(column);
}

function claseCelda(column, numericas, extra = '') {
  return [
    numericas[column] ? 'rp-num' : '',
    esColumnaNombreProducto(column) ? 'rp-col-sticky' : '',
    extra,
  ].filter(Boolean).join(' ');
}

function esColumnaMargen(column) {
  return /^(margen_bruto|margenbruto|margen_estimado|margenestimado)$/i.test(column);
}

const COLOR_MARGEN_MIN = { r: 248, g: 105, b: 107 };
const COLOR_MARGEN_MED = { r: 255, g: 235, b: 132 };
const COLOR_MARGEN_MAX = { r: 99, g: 190, b: 123 };

function mezclarColor(a, b, t) {
  const p = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * p),
    g: Math.round(a.g + (b.g - a.g) * p),
    b: Math.round(a.b + (b.b - a.b) * p),
  };
}

function cssRgb(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function escalaMargenColumna(rows, column) {
  const valores = (rows || [])
    .map((row) => aNumero(row[column]))
    .filter((n) => n !== null)
    .sort((a, b) => a - b);
  if (!valores.length) return null;
  const min = valores[0];
  const max = valores[valores.length - 1];
  const medio = percentil(valores, 0.5);
  return { min, medio, max };
}

function estiloMargen(column, valor, escala) {
  if (!esColumnaMargen(column) || !escala) return null;
  const n = aNumero(valor);
  if (n === null) return null;
  if (escala.min === escala.max) {
    return { backgroundColor: cssRgb(COLOR_MARGEN_MED) };
  }

  let color;
  if (n <= escala.medio) {
    const span = escala.medio - escala.min || 1;
    color = mezclarColor(COLOR_MARGEN_MIN, COLOR_MARGEN_MED, (n - escala.min) / span);
  } else {
    const span = escala.max - escala.medio || 1;
    color = mezclarColor(COLOR_MARGEN_MED, COLOR_MARGEN_MAX, (n - escala.medio) / span);
  }
  return { backgroundColor: cssRgb(color) };
}
const RATIOS = {
  costo_unitario: ['costo_total_compra', 'cantidad_compra'],
  venta_unitaria: ['venta_total', 'cantidad_venta'],
  merma_desecho: ['cantidad_merma_desecho', 'cantidad_compra'],
};
const DECIMALES_1 = {
  cantidad_compra: true,
  cantidad_venta: true,
  cantidad_merma_desecho: true,
  existencia_actual: true,
};
const DINERO_ENTERO = {
  costo_total_compra: true,
  venta_total: true,
  costo_total_merma_desecho: true,
  valor_inventario: true,
};
const DINERO_2DEC = {
  costo_unitario: true,
  venta_unitaria: true,
  costo_flete_out: true,
  costo_flete_in: true,
  costo_receta: true,
  costo_insumo: true,
  costo_unitario_estimado: true,
};
const PORCENTAJE_1 = {
  merma_desecho: true,
  merma_maduracion_deshidratacion: true,
  merma_peso_extra: true,
  factor_merma: true,
  rendimiento_receta: true,
  margen_bruto: true,
  margen_estimado: true,
};
const NO_SUMAR = {
  costo_unitario: true,
  venta_unitaria: true,
  costo_flete_out: true,
  costo_flete_in: true,
  costo_receta: true,
  costo_insumo: true,
  costo_unitario_estimado: true,
  merma_maduracion_deshidratacion: true,
  merma_peso_extra: true,
  factor_merma: true,
  rendimiento_receta: true,
};

function esFechaIso(valor) {
  return /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function aNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const n = Number(String(valor).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function esColumnaNumerica(nombre, rows) {
  if (DECIMALES_1[nombre] || RATIOS[nombre] || DINERO_ENTERO[nombre] || DINERO_2DEC[nombre] || PORCENTAJE_1[nombre]) {
    return true;
  }
  if (EXCLUIR_SUMA.test(nombre)) return false;
  return rows.some((row) => aNumero(row[nombre]) !== null);
}

function sumaColumna(rows, nombre) {
  return rows.reduce((acc, row) => {
    const n = aNumero(row[nombre]);
    return acc + (n === null ? 0 : n);
  }, 0);
}

function formatoNumero(valor, columna) {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = aNumero(valor);
  if (n === null) return String(valor);
  if (esColumnaMargen(columna) || PORCENTAJE_1[columna]) {
    const pct = esColumnaMargen(columna) ? n * 100 : (Math.abs(n) <= 1 ? n * 100 : n);
    return `${pct.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  }
  if (DINERO_2DEC[columna]) {
    return `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (DINERO_ENTERO[columna]) {
    return `$ ${Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
  }
  if (DECIMALES_1[columna]) {
    return n.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  const dec = Math.abs(n) >= 100 ? 2 : 4;
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: dec });
}

function claveFiltro(row, column, numericas) {
  const raw = row[column];
  if (raw === null || raw === undefined || raw === '') return '';
  return numericas[column] ? formatoNumero(raw, column) : String(raw);
}

function etiquetaFiltro(key) {
  return key === '' ? '(En blanco)' : key;
}

function IconFiltro({ activo }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill={activo ? 'currentColor' : 'none'} aria-hidden="true">
      <path
        d="M4 5h16l-6.2 7.4V19l-3.6 2v-8.6L4 5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function totalColumna(nombre, rows) {
  if (NO_SUMAR[nombre] || PORCENTAJE_1[nombre]) return null;
  if (RATIOS[nombre]) {
    const num = sumaColumna(rows, RATIOS[nombre][0]);
    const den = sumaColumna(rows, RATIOS[nombre][1]);
    return den ? num / den : null;
  }
  if (!esColumnaNumerica(nombre, rows)) return null;
  return sumaColumna(rows, nombre);
}

function etiquetaProducto(row) {
  const n = String(row.nombre_producto || row.codigo_producto || '');
  return n.length > 36 ? `${n.slice(0, 35)}…` : n;
}

const TOP_PRODUCTOS = 40;
const ALTURA_BARRA = 36;

function topProductos(rows, campo) {
  return (rows || [])
    .slice()
    .sort((a, b) => (aNumero(b[campo]) || 0) - (aNumero(a[campo]) || 0))
    .slice(0, TOP_PRODUCTOS);
}

function alturaGrafica(n) {
  return Math.max(240, n * ALTURA_BARRA);
}

function formatoPctEje(n) {
  return `${n.toLocaleString('es-MX', { maximumFractionDigits: 0 })}%`;
}

function percentil(sorted, p) {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
}

function valorMargen(row, campo) {
  if (campo === 'margen_estimado') {
    return aNumero(row.margen_estimado ?? row.margenestimado);
  }
  return aNumero(row.margen_bruto ?? row.margenbruto);
}

function histogramaMargen(rows, campo = 'margen_bruto') {
  const valores = (rows || [])
    .map((row) => valorMargen(row, campo))
    .filter((n) => n !== null)
    .map((n) => n * 100);

  if (!valores.length) return { labels: [], counts: [], colors: [] };

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const width = 20;
  let start = Math.floor(min / width) * width;
  if (Object.is(start, -0)) start = 0;
  const k = Math.max(1, Math.ceil((max - start) / width) || 1);
  const counts = Array(k).fill(0);
  const labels = [];
  const colors = [];
  for (let i = 0; i < k; i += 1) {
    const a = start + i * width;
    const b = a + width;
    labels.push(`${formatoPctEje(a)}–${formatoPctEje(b)}`);
    const t = k <= 1 ? 0.5 : i / (k - 1);
    const color = t <= 0.5
      ? mezclarColor(COLOR_MARGEN_MIN, COLOR_MARGEN_MED, t * 2)
      : mezclarColor(COLOR_MARGEN_MED, COLOR_MARGEN_MAX, (t - 0.5) * 2);
    colors.push(cssRgb(color));
  }

  valores.forEach((v) => {
    let idx = Math.floor((v - start) / width);
    if (idx < 0) idx = 0;
    if (idx >= k) idx = k - 1;
    counts[idx] += 1;
  });

  return { labels, counts, colors };
}

function isoDesdeFechaLocal(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function hoyLocal() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function fechasSemanasHastaHoy(cantidadSemanas) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (cantidadSemanas * 7 - 1));
  return {
    inicio: isoDesdeFechaLocal(inicio),
    fin: isoDesdeFechaLocal(hoy),
  };
}

function fechasMesesHastaHoy(cantidadMeses) {
  const hoy = hoyLocal();
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (cantidadMeses - 1), 1);
  return {
    inicio: isoDesdeFechaLocal(inicio),
    fin: isoDesdeFechaLocal(hoy),
  };
}

const RANGOS_PRESET = [
  { id: '1s', label: 'Última semana', semanas: 1 },
  { id: '2s', label: 'Últimas 2 semanas', semanas: 2 },
  { id: '3s', label: 'Últimas 3 semanas', semanas: 3 },
  { id: '4s', label: 'Últimas 4 semanas', semanas: 4 },
  { id: '1m', label: 'Último mes', meses: 1 },
  { id: '3m', label: 'Últimos 3 meses', meses: 3 },
  { id: '6m', label: 'Últimos 6 meses', meses: 6 },
];

function fechasDePreset(presetId) {
  const preset = RANGOS_PRESET.find((item) => item.id === presetId);
  if (!preset) return null;
  if (preset.semanas) return fechasSemanasHastaHoy(preset.semanas);
  if (preset.meses) return fechasMesesHastaHoy(preset.meses);
  return null;
}

function isoToDmy(iso) {
  if (!esFechaIso(iso)) return '';
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

function dmyToIso(value) {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (!match) return null;
  const dd = Number(match[1]);
  const mm = Number(match[2]);
  const yyyy = Number(match[3]);
  const iso = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== yyyy ||
    parsed.getMonth() + 1 !== mm ||
    parsed.getDate() !== dd
  ) {
    return null;
  }
  return iso;
}

export default function ReporteGerenciaTablero({ accessToken, onSessionInvalid }) {
  const [fechaInicio, setFechaInicio] = useState(() => fechasDePreset('1s').inicio);
  const [fechaFin, setFechaFin] = useState(() => fechasDePreset('1s').fin);
  const [fechaInicioTexto, setFechaInicioTexto] = useState(() => isoToDmy(fechasDePreset('1s').inicio));
  const [fechaFinTexto, setFechaFinTexto] = useState(() => isoToDmy(fechasDePreset('1s').fin));
  const [rangoPreset, setRangoPreset] = useState('1s');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rows, setRows] = useState(null);
  const [filtrosLista, setFiltrosLista] = useState({});
  const [filtroAbierto, setFiltroAbierto] = useState(null);
  const [busquedaFiltro, setBusquedaFiltro] = useState('');
  const [filtroPos, setFiltroPos] = useState({ top: 0, left: 0 });
  const [orden, setOrden] = useState({ col: 'venta_total', dir: -1 });
  const [histogramaCampo, setHistogramaCampo] = useState('margen_bruto');
  const [serieVentas, setSerieVentas] = useState(null);
  const [serieLoading, setSerieLoading] = useState(false);
  const [serieError, setSerieError] = useState('');

  const chartVentasRef = useRef(null);
  const chartCantidadRef = useRef(null);
  const chartHistogramaRef = useRef(null);
  const graficosRef = useRef([]);
  const cargaIdRef = useRef(0);
  const abortCargaRef = useRef(null);
  const filtroPanelRef = useRef(null);

  const columnas = useMemo(() => {
    if (!rows?.length) return [];
    return ordenarColumnas(Object.keys(rows[0]).filter((column) => !OCULTAR_COLUMNAS.test(column)));
  }, [rows]);

  const numericas = useMemo(() => {
    const map = {};
    columnas.forEach((column) => {
      map[column] =
        esColumnaNumerica(column, rows || []) ||
        !!RATIOS[column] ||
        !!DECIMALES_1[column] ||
        !!DINERO_ENTERO[column] ||
        !!DINERO_2DEC[column] ||
        !!PORCENTAJE_1[column];
    });
    return map;
  }, [columnas, rows]);

  const filasVisibles = useMemo(() => {
    if (!rows) return [];
    let visibles = rows.filter((row) =>
      columnas.every((column) => {
        const seleccion = filtrosLista[column];
        if (!seleccion) return true;
        return seleccion.includes(claveFiltro(row, column, numericas));
      }),
    );

    const colOrden = orden.col
      || (visibles[0] && ('venta_total' in visibles[0] ? 'venta_total' : 'ventatotal'))
      || 'venta_total';
    const dirOrden = orden.col ? orden.dir : -1;
    const numerica = numericas[colOrden] ?? true;
    visibles = visibles.slice().sort((a, b) => {
      const va = a[colOrden];
      const vb = b[colOrden];
      if (numerica) {
        const na = aNumero(va);
        const nb = aNumero(vb);
        if (na === null && nb === null) return 0;
        if (na === null) return 1;
        if (nb === null) return -1;
        return (na - nb) * dirOrden;
      }
      return String(va || '').localeCompare(String(vb || ''), 'es', {
        numeric: true,
        sensitivity: 'base',
      }) * dirOrden;
    });

    return visibles;
  }, [rows, columnas, filtrosLista, orden, numericas]);

  const escalasMargen = useMemo(() => {
    if (!MOSTRAR_COLORES_MARGEN) return {};
    const map = {};
    columnas.forEach((column) => {
      if (esColumnaMargen(column)) {
        map[column] = escalaMargenColumna(filasVisibles, column);
      }
    });
    return map;
  }, [columnas, filasVisibles]);

  const opcionesFiltro = useMemo(() => {
    if (!filtroAbierto || !rows?.length) return [];
    const vistos = new Map();
    rows.forEach((row) => {
      const pasaOtros = columnas.every((column) => {
        if (column === filtroAbierto) return true;
        const seleccion = filtrosLista[column];
        if (!seleccion) return true;
        return seleccion.includes(claveFiltro(row, column, numericas));
      });
      if (!pasaOtros) return;
      const key = claveFiltro(row, filtroAbierto, numericas);
      if (vistos.has(key)) return;
      vistos.set(key, {
        key,
        label: etiquetaFiltro(key),
        sort: aNumero(row[filtroAbierto]),
      });
    });
    return [...vistos.values()].sort((a, b) => {
      if (a.key === '') return 1;
      if (b.key === '') return -1;
      if (numericas[filtroAbierto]) {
        if (a.sort === null && b.sort === null) return a.label.localeCompare(b.label, 'es');
        if (a.sort === null) return 1;
        if (b.sort === null) return -1;
        return a.sort - b.sort;
      }
      return a.label.localeCompare(b.label, 'es', { numeric: true, sensitivity: 'base' });
    });
  }, [filtroAbierto, rows, columnas, filtrosLista, numericas]);

  const opcionesFiltroVisibles = useMemo(() => {
    const q = busquedaFiltro.trim().toLowerCase();
    if (!q) return opcionesFiltro;
    return opcionesFiltro.filter((opcion) => opcion.label.toLowerCase().includes(q));
  }, [opcionesFiltro, busquedaFiltro]);

  const topVentas = useMemo(() => topProductos(rows, 'venta_total'), [rows]);
  const topCantidad = useMemo(() => topProductos(rows, 'cantidad_venta'), [rows]);
  const histograma = useMemo(
    () => histogramaMargen(filasVisibles, histogramaCampo),
    [filasVisibles, histogramaCampo],
  );

  function destruirGraficos() {
    graficosRef.current.forEach((g) => g.destroy());
    graficosRef.current = [];
  }

  useEffect(() => () => destruirGraficos(), []);

  useEffect(() => {
    if (!rows?.length) {
      destruirGraficos();
      return undefined;
    }

    const grid = 'rgba(90, 200, 160, 0.12)';
    const ticks = { color: '#8aa89c' };
    const opciones = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          position: 'top',
          beginAtZero: true,
          ticks,
          grid: { color: grid },
        },
        y: {
          ticks: { ...ticks, autoSkip: false, font: { size: 11 } },
          grid: { color: grid },
        },
      },
    };

    destruirGraficos();

    if (chartVentasRef.current) {
      graficosRef.current.push(
        new Chart(chartVentasRef.current, {
          type: 'bar',
          data: {
            labels: topVentas.map(etiquetaProducto),
            datasets: [{
              label: 'Venta total',
              data: topVentas.map((r) => aNumero(r.venta_total) || 0),
              backgroundColor: 'rgba(46, 230, 168, 0.75)',
            }],
          },
          options: opciones,
        }),
      );
    }

    if (chartCantidadRef.current) {
      graficosRef.current.push(
        new Chart(chartCantidadRef.current, {
          type: 'bar',
          data: {
            labels: topCantidad.map(etiquetaProducto),
            datasets: [{
              label: 'Cantidad venta',
              data: topCantidad.map((r) => aNumero(r.cantidad_venta) || 0),
              backgroundColor: 'rgba(46, 230, 168, 0.75)',
            }],
          },
          options: opciones,
        }),
      );
    }

    if (MOSTRAR_HISTOGRAMA && chartHistogramaRef.current && histograma.labels.length) {
      graficosRef.current.push(
        new Chart(chartHistogramaRef.current, {
          type: 'bar',
          data: {
            labels: histograma.labels,
            datasets: [{
              label: 'Frecuencia',
              data: histograma.counts,
              backgroundColor: histograma.colors,
              borderWidth: 0,
              barPercentage: 1,
              categoryPercentage: 1,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: {
                ticks: { ...ticks, maxRotation: 40, minRotation: 40, font: { size: 10 } },
                grid: { display: false },
              },
              y: {
                beginAtZero: true,
                ticks: { ...ticks, precision: 0, stepSize: 5 },
                grid: { color: grid },
                title: { display: true, text: 'Frecuencia', color: '#8aa89c' },
              },
            },
          },
        }),
      );
    }

    return () => destruirGraficos();
  }, [rows, topVentas, topCantidad, histograma]);

  async function cargarTablero(rangoFechas) {
    abortCargaRef.current?.abort();
    const ac = new AbortController();
    abortCargaRef.current = ac;
    const inicio = rangoFechas?.inicio || fechaInicio;
    const fin = rangoFechas?.fin || fechaFin;
    const cargaId = cargaIdRef.current + 1;
    cargaIdRef.current = cargaId;
    setErrorMessage('');
    setFiltrosLista({});
    setFiltroAbierto(null);
    setBusquedaFiltro('');
    setOrden({ col: null, dir: 1 });
    setSerieVentas(null);
    setSerieError('');
    setSerieLoading(false);
    destruirGraficos();

    if (!esFechaIso(inicio) || !esFechaIso(fin)) {
      setErrorMessage('Indica fecha inicio y fecha fin (dd/mm/aaaa)');
      return;
    }
    if (inicio > fin) {
      setErrorMessage('La fecha inicio no puede ser mayor que la fecha fin');
      return;
    }

    setLoading(true);
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    };
    const body = JSON.stringify({
      fecha_inicio: inicio,
      fecha_fin: fin,
    });

    const cargarTabla = (async () => {
      try {
        const response = await fetch('/api/reportegerencia/tablero', {
          method: 'POST',
          headers,
          body,
          signal: ac.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (cargaId !== cargaIdRef.current) return;

        if (response.status === 401) {
          onSessionInvalid?.();
          throw new Error(data.error || 'Sesión inválida.');
        }
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Error ejecutando la consulta');
        }
        setRows(data.rows || []);
      } catch (error) {
        if (error?.name === 'AbortError' || cargaId !== cargaIdRef.current) return;
        setRows(null);
        setErrorMessage(error.message || 'Error ejecutando la consulta');
      } finally {
        if (cargaId === cargaIdRef.current) setLoading(false);
      }
    })();

    await cargarTabla;
  }

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return undefined;
    }
    const rango = fechasDePreset('1s');
    const t = setTimeout(() => cargarTablero(rango), 50);
    return () => {
      clearTimeout(t);
      abortCargaRef.current?.abort();
    };
  }, [accessToken]);

  function ordenarColumna(columna) {
    setOrden((prev) => (
      prev.col === columna
        ? { col: columna, dir: prev.dir === 1 ? -1 : 1 }
        : { col: columna, dir: 1 }
    ));
  }

  function abrirFiltroColumna(event, column) {
    event.stopPropagation();
    if (filtroAbierto === column) {
      setFiltroAbierto(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const ancho = 280;
    setFiltroPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - ancho - 8)),
    });
    setBusquedaFiltro('');
    setFiltroAbierto(column);
  }

  function seleccionColumna(column) {
    return filtrosLista[column] || null;
  }

  function estaSeleccionada(column, key) {
    const seleccion = seleccionColumna(column);
    return !seleccion || seleccion.includes(key);
  }

  function toggleValorFiltro(column, key) {
    const todas = opcionesFiltro.map((opcion) => opcion.key);
    const seleccion = seleccionColumna(column);
    const actual = seleccion ? [...seleccion] : todas;
    const siguiente = actual.includes(key)
      ? actual.filter((item) => item !== key)
      : [...actual, key];
    setFiltrosLista((prev) => ({
      ...prev,
      [column]: siguiente.length === todas.length ? null : siguiente,
    }));
  }

  function toggleSeleccionarTodo() {
    if (!filtroAbierto) return;
    const visibles = opcionesFiltroVisibles.map((opcion) => opcion.key);
    const todas = opcionesFiltro.map((opcion) => opcion.key);
    const seleccion = seleccionColumna(filtroAbierto);
    const todasVisiblesMarcadas = visibles.every((key) => !seleccion || seleccion.includes(key));
    let siguiente;
    if (todasVisiblesMarcadas) {
      const base = seleccion ? seleccion.filter((key) => !visibles.includes(key)) : todas.filter((key) => !visibles.includes(key));
      siguiente = base;
    } else {
      const base = seleccion ? [...seleccion] : [];
      visibles.forEach((key) => {
        if (!base.includes(key)) base.push(key);
      });
      siguiente = base;
    }
    setFiltrosLista((prev) => ({
      ...prev,
      [filtroAbierto]: siguiente.length === todas.length ? null : siguiente,
    }));
  }

  useEffect(() => {
    if (!filtroAbierto) return undefined;
    function onPointerDown(event) {
      if (filtroPanelRef.current?.contains(event.target)) return;
      if (event.target.closest?.('.rp-th-filter-btn')) return;
      setFiltroAbierto(null);
    }
    function onKey(event) {
      if (event.key === 'Escape') setFiltroAbierto(null);
    }
    function onScroll() {
      setFiltroAbierto(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [filtroAbierto]);

  function exportarExcel() {
    const visibles = filasVisibles;
    if (!visibles.length) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      const columns = [
        ...columnas,
        ...Object.keys(visibles[0]).filter((column) => !columnas.includes(column)),
      ];
      const worksheet = XLSX.utils.json_to_sheet(visibles, { header: columns });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Gerencia');
      worksheet['!cols'] = columns.map((column) => {
        let maxLength = column.length;
        visibles.forEach((row) => {
          let value = row[column];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          maxLength = Math.max(maxLength, String(value).length);
        });
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      XLSX.writeFile(workbook, `reporte_gerencia_${fechaInicio}_${fechaFin}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('No fue posible generar el archivo Excel.');
    }
  }

  const kpis = rows?.length
    ? {
        compraQty: sumaColumna(rows, 'cantidad_compra'),
        ventaQty: sumaColumna(rows, 'cantidad_venta'),
        mermaQty: sumaColumna(rows, 'cantidad_merma_desecho'),
        existQty: sumaColumna(rows, 'existencia_actual'),
        compraImp: sumaColumna(rows, 'costo_total_compra'),
        ventaImp: sumaColumna(rows, 'venta_total'),
        mermaImp: sumaColumna(rows, 'costo_total_merma_desecho'),
        invImp: sumaColumna(rows, 'valor_inventario'),
        skus: rows.length,
      }
    : null;

  return (
    <div className="reportes-root" lang="es-MX">
      <div className="rp-page">
        <div className="rp-container">
          <div className="rp-filtros">
            <fieldset className="rp-rango-presets">
              <legend>Rango rápido</legend>
              <div className="rp-rango-presets-list" role="radiogroup" aria-label="Rango de fechas">
                {RANGOS_PRESET.map((item) => (
                  <label
                    key={item.id}
                    className={`rp-rango-chip${rangoPreset === item.id ? ' rp-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="rango-gerencia"
                      value={item.id}
                      checked={rangoPreset === item.id}
                      disabled={loading}
                      onChange={() => {
                        const rango = fechasDePreset(item.id);
                        if (!rango) return;
                        setRangoPreset(item.id);
                        setFechaInicio(rango.inicio);
                        setFechaFin(rango.fin);
                        setFechaInicioTexto(isoToDmy(rango.inicio));
                        setFechaFinTexto(isoToDmy(rango.fin));
                        cargarTablero(rango);
                      }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="rp-campo">
              <label htmlFor="fechaInicio">Fecha inicio (día/mes/año)</label>
              <div className="rp-date-wrap">
                <input
                  id="fechaInicio"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={fechaInicioTexto}
                  onChange={(e) => {
                    const texto = e.target.value;
                    setFechaInicioTexto(texto);
                    setRangoPreset('');
                    const iso = dmyToIso(texto);
                    if (iso) setFechaInicio(iso);
                  }}
                  onBlur={() => {
                    const iso = dmyToIso(fechaInicioTexto);
                    if (iso) {
                      setFechaInicio(iso);
                      setFechaInicioTexto(isoToDmy(iso));
                      return;
                    }
                    setFechaInicioTexto(isoToDmy(fechaInicio));
                  }}
                />
                <input
                  lang="es-MX"
                  className="rp-date-native"
                  type="date"
                  tabIndex={-1}
                  aria-label="Elegir fecha inicio"
                  value={fechaInicio}
                  onChange={(e) => {
                    const iso = e.target.value;
                    setRangoPreset('');
                    setFechaInicio(iso);
                    setFechaInicioTexto(isoToDmy(iso));
                  }}
                />
              </div>
            </div>
            <div className="rp-campo">
              <label htmlFor="fechaFin">Fecha fin (día/mes/año)</label>
              <div className="rp-date-wrap">
                <input
                  id="fechaFin"
                  type="text"
                  inputMode="numeric"
                  placeholder="dd/mm/aaaa"
                  value={fechaFinTexto}
                  onChange={(e) => {
                    const texto = e.target.value;
                    setFechaFinTexto(texto);
                    setRangoPreset('');
                    const iso = dmyToIso(texto);
                    if (iso) setFechaFin(iso);
                  }}
                  onBlur={() => {
                    const iso = dmyToIso(fechaFinTexto);
                    if (iso) {
                      setFechaFin(iso);
                      setFechaFinTexto(isoToDmy(iso));
                      return;
                    }
                    setFechaFinTexto(isoToDmy(fechaFin));
                  }}
                />
                <input
                  lang="es-MX"
                  className="rp-date-native"
                  type="date"
                  tabIndex={-1}
                  aria-label="Elegir fecha fin"
                  value={fechaFin}
                  onChange={(e) => {
                    const iso = e.target.value;
                    setRangoPreset('');
                    setFechaFin(iso);
                    setFechaFinTexto(isoToDmy(iso));
                  }}
                />
              </div>
            </div>
            <div className="rp-actions">
              <button
                className="rp-execute"
                type="button"
                disabled={loading}
                onClick={cargarTablero}
              >
                {loading ? 'Cargando…' : 'Cargar Datos'}
              </button>
            </div>
          </div>

          {errorMessage && <div className="rp-warning">{errorMessage}</div>}

          {rows && rows.length === 0 && (
            <>
              <div className="rp-result-header">
                <h2>Resultado</h2>
                <span className="rp-row-count">0 registros</span>
              </div>
              <div className="rp-empty">La consulta no devolvió registros.</div>
            </>
          )}

          {rows && rows.length > 0 && (
            <>
              <div className="rp-result-header">
                <h2>Resultado</h2>
                <div className="rp-result-actions">
                  <span className="rp-row-count">
                    {filasVisibles.length} de {rows.length} registros
                  </span>
                  <button className="rp-export" type="button" onClick={exportarExcel}>
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div className="rp-charts">
                  <IndicadorVolumenVentas
                    serie={serieVentas}
                    loading={serieLoading}
                    error={serieError}
                    fechaInicio={fechaInicio}
                    fechaFin={fechaFin}
                    accessToken={accessToken}
                    onSessionInvalid={onSessionInvalid}
                    activo={!loading}
                    tableroCargando={loading}
                  />
              </div>

              {kpis && (
                  <div className="rp-kpi-grid">
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Compra</div>
                      <div className="rp-kpi-caption">Costo total</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.compraImp, 'costo_total_compra')}</div>
                      <div className="rp-kpi-sub">Cantidad comprada  {formatoNumero(kpis.compraQty, 'cantidad_compra')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Venta</div>
                      <div className="rp-kpi-caption">Importe vendido</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.ventaImp, 'venta_total')}</div>
                      <div className="rp-kpi-sub">Cantidad vendida  {formatoNumero(kpis.ventaQty, 'cantidad_venta')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Merma</div>
                      <div className="rp-kpi-caption">Costo de merma - desecho</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.mermaImp, 'costo_total_merma_desecho')}</div>
                      <div className="rp-kpi-sub">Cantidad de merma  {formatoNumero(kpis.mermaQty, 'cantidad_merma_desecho')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Inventario</div>
                      <div className="rp-kpi-caption">Valor en inventario a hoy</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.invImp, 'valor_inventario')}</div>
                      <div className="rp-kpi-sub">Existencia actual  {formatoNumero(kpis.existQty, 'existencia_actual')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Cantidad productos</div>
                      <div className="rp-kpi-caption">Productos en el tablero</div>
                      <div className="rp-kpi-value">{kpis.skus.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">Productos del período</div>
                    </div>
                  </div>
                )}
                <div className="rp-charts">
                  <div className="rp-chart-card">
                    <h3>Top productos por venta ($)</h3>
                    <div className="rp-chart-scroll">
                      <div className="rp-chart-scroll-inner" style={{ height: alturaGrafica(topVentas.length) }}>
                        <canvas ref={chartVentasRef} />
                      </div>
                    </div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Top productos por venta (cantidades)</h3>
                    <div className="rp-chart-scroll">
                      <div className="rp-chart-scroll-inner" style={{ height: alturaGrafica(topCantidad.length) }}>
                        <canvas ref={chartCantidadRef} />
                      </div>
                    </div>
                  </div>
                  {MOSTRAR_HISTOGRAMA && (
                  <div className="rp-chart-card rp-chart-card-wide">
                    <div className="rp-chart-card-head">
                      <h3>
                        Frecuencia de {histogramaCampo === 'margen_estimado' ? 'margen estimado' : 'margen bruto'}
                      </h3>
                      <div className="rp-chart-toggle" role="group" aria-label="Tipo de margen">
                        <button
                          type="button"
                          className={histogramaCampo === 'margen_bruto' ? 'rp-active' : ''}
                          onClick={() => setHistogramaCampo('margen_bruto')}
                        >
                          Margen bruto
                        </button>
                        <button
                          type="button"
                          className={histogramaCampo === 'margen_estimado' ? 'rp-active' : ''}
                          onClick={() => setHistogramaCampo('margen_estimado')}
                        >
                          Margen estimado
                        </button>
                      </div>
                    </div>
                    {histograma.labels.length ? (
                      <div className="rp-chart-wrap"><canvas ref={chartHistogramaRef} /></div>
                    ) : (
                      <div className="rp-empty">No hay datos de margen para graficar.</div>
                    )}
                  </div>
                  )}
                </div>

                <div className="rp-table-container rp-table-sticky-name">
                  <table>
                    <thead>
                      <tr>
                        {columnas.map((column) => {
                          const filtrado = Array.isArray(filtrosLista[column]);
                          return (
                          <th key={column} className={claseCelda(column, numericas)} title={column}>
                            <div className="rp-th-head">
                              <button
                                type="button"
                                className="rp-th-sort"
                                title={column}
                                onClick={() => ordenarColumna(column)}
                              >
                                <span className="rp-th-label">{column}</span>
                                <span className="rp-sort-ind">
                                  {orden.col === column ? (orden.dir === 1 ? '▲' : '▼') : ''}
                                </span>
                              </button>
                              <button
                                type="button"
                                className={`rp-th-filter-btn${filtrado ? ' rp-active' : ''}${filtroAbierto === column ? ' rp-open' : ''}`}
                                onClick={(event) => abrirFiltroColumna(event, column)}
                                aria-label={`Filtrar ${column}`}
                                title="Filtrar"
                              >
                                <IconFiltro activo={filtrado} />
                              </button>
                            </div>
                          </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filasVisibles.length === 0 ? (
                        <tr>
                          <td colSpan={columnas.length} className="rp-empty">
                            Ningún registro coincide con el filtro.
                          </td>
                        </tr>
                      ) : (
                        filasVisibles.map((row, index) => (
                          <tr key={row.id_producto || row.codigo_producto || index}>
                            {columnas.map((column) => {
                              const estilo = estiloMargen(column, row[column], escalasMargen[column]);
                              return (
                              <td
                                key={column}
                                className={claseCelda(
                                  column,
                                  numericas,
                                  estilo ? 'rp-margen-scale' : '',
                                )}
                                style={estilo || undefined}
                                title={
                                  esColumnaNombreProducto(column) && row[column] != null
                                    ? String(row[column])
                                    : undefined
                                }
                              >
                                {numericas[column]
                                  ? formatoNumero(row[column], column)
                                  : row[column] == null
                                    ? ''
                                    : String(row[column])}
                              </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        {columnas.map((column, i) => {
                          if (i === 0) {
                            return (
                              <td key={column} className={claseCelda(column, numericas)}>
                                Total
                              </td>
                            );
                          }
                          const total = totalColumna(column, filasVisibles);
                          return (
                            <td key={column} className={claseCelda(column, numericas)}>
                              {total === null ? '' : formatoNumero(total, column)}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
            </>
          )}
        </div>

        {filtroAbierto && createPortal(
          <div
            ref={filtroPanelRef}
            className="rp-excel-filter"
            style={{ top: filtroPos.top, left: filtroPos.left }}
            role="dialog"
            aria-label={`Filtrar ${filtroAbierto}`}
          >
            <input
              className="rp-excel-filter__search"
              type="text"
              value={busquedaFiltro}
              onChange={(e) => setBusquedaFiltro(e.target.value)}
              placeholder="Buscar"
              autoFocus
            />
            <label className="rp-excel-filter__item rp-excel-filter__all">
              <input
                type="checkbox"
                checked={opcionesFiltroVisibles.length > 0 && opcionesFiltroVisibles.every((opcion) => estaSeleccionada(filtroAbierto, opcion.key))}
                ref={(el) => {
                  if (!el) return;
                  const marcadas = opcionesFiltroVisibles.filter((opcion) => estaSeleccionada(filtroAbierto, opcion.key)).length;
                  el.indeterminate = marcadas > 0 && marcadas < opcionesFiltroVisibles.length;
                }}
                onChange={toggleSeleccionarTodo}
              />
              (Seleccionar todo)
            </label>
            <div className="rp-excel-filter__list">
              {opcionesFiltroVisibles.length === 0 ? (
                <div className="rp-excel-filter__empty">Sin coincidencias</div>
              ) : (
                opcionesFiltroVisibles.map((opcion) => (
                  <label key={opcion.key || '__blank'} className="rp-excel-filter__item">
                    <input
                      type="checkbox"
                      checked={estaSeleccionada(filtroAbierto, opcion.key)}
                      onChange={() => toggleValorFiltro(filtroAbierto, opcion.key)}
                    />
                    <span>{opcion.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}

        <p className="rp-footer-note">Supabase · Polaria Mateo</p>
      </div>
    </div>
  );
}
