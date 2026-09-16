'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

const EXCLUIR_SUMA = /^(id_|folio|fecha|status|codigo|nombre|contacto|telefono|producto|descripcion|unidad|comprador|es_|requiere|forma_pago|metodo_pago)/i;
const OCULTAR_COLUMNAS = /^(id_venta|id_comprador|id_line_item|id_producto|comprador_activo|es_primario|es_secundario|unidad_visualizacion|requiere_lote|producto_activo)$/i;
const RATIOS = {
  precio_unitario: ['importe_line_item_mxn', 'cantidad_line_item'],
};
const DECIMALES_1 = {
  cantidad_pedida: true,
  cantidad_line_item: true,
};
const DINERO_ENTERO = {
  importe_line_item_mxn: true,
};
const DINERO_2DEC = {
  precio_unitario: true,
};
const PORCENTAJE_1 = {
  merma_pct: true,
};
const ENTERO = {
  lineas: true,
};
const COLUMNAS_CONSOLIDADO = [
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
const FORMA_PAGO = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica',
  '04': 'Tarjeta de crédito',
  '05': 'Monedero electrónico',
  '06': 'Dinero electrónico',
  '08': 'Vales de despensa',
  '12': 'Dación en pago',
  '13': 'Pago por subrogación',
  '14': 'Pago por consignación',
  '15': 'Condonación',
  '17': 'Compensación',
  '23': 'Novación',
  '24': 'Confusión',
  '25': 'Remisión de deuda',
  '26': 'Prescripción o caducidad',
  '27': 'A satisfacción del acreedor',
  '28': 'Tarjeta de débito',
  '29': 'Tarjeta de servicios',
  '30': 'Aplicación de anticipos',
  '31': 'Intermediario de pagos',
  '99': 'Por definir',
};
const METODO_PAGO = {
  PUE: 'Pago en una sola exhibición',
  PPD: 'Pago en parcialidades o diferido',
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
  if (DECIMALES_1[nombre] || RATIOS[nombre] || DINERO_ENTERO[nombre] || DINERO_2DEC[nombre] || PORCENTAJE_1[nombre] || ENTERO[nombre]) {
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
  if (PORCENTAJE_1[columna]) {
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
    return `${pct.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
  }
  if (DINERO_2DEC[columna]) {
    return `$ ${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (ENTERO[columna]) {
    return Math.round(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });
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

function totalColumna(nombre, rows) {
  if (PORCENTAJE_1[nombre]) return null;
  if (RATIOS[nombre]) {
    const num = sumaColumna(rows, RATIOS[nombre][0]);
    const den = sumaColumna(rows, RATIOS[nombre][1]);
    return den ? num / den : null;
  }
  if (!esColumnaNumerica(nombre, rows)) return null;
  return sumaColumna(rows, nombre);
}

function etiquetaCorta(texto) {
  const n = String(texto || '');
  return n.length > 22 ? `${n.slice(0, 21)}…` : n;
}

function fechaAyerIso() {
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  const yyyy = ayer.getFullYear();
  const mm = String(ayer.getMonth() + 1).padStart(2, '0');
  const dd = String(ayer.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

function formatoCelda(valor, columna) {
  if (valor == null || valor === '') return '';
  if (columna === 'fecha_venta') {
    const texto = String(valor);
    const iso = texto.slice(0, 10);
    return esFechaIso(iso) ? isoToDmy(iso) : texto;
  }
  if (columna === 'forma_pago') {
    const codigo = String(valor).trim().padStart(2, '0');
    const etiqueta = FORMA_PAGO[codigo] || FORMA_PAGO[String(valor).trim()];
    return etiqueta ? `${String(valor).trim()} — ${etiqueta}` : String(valor);
  }
  if (columna === 'metodo_pago') {
    const codigo = String(valor).trim().toUpperCase();
    const etiqueta = METODO_PAGO[codigo];
    return etiqueta ? `${codigo} — ${etiqueta}` : String(valor);
  }
  return String(valor);
}

function consolidarVentas(rows) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.id_venta || row.folio;
    if (!key) return;
    let agg = map.get(key);
    if (!agg) {
      agg = {
        id_venta: row.id_venta,
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

  return [...map.values()].sort((a, b) => {
    const fecha = String(b.fecha_venta || '').localeCompare(String(a.fecha_venta || ''));
    if (fecha) return fecha;
    return String(a.folio || '').localeCompare(String(b.folio || ''), 'es', { numeric: true });
  });
}

function filtrarYOrdenar(rows, columnas, filtros, orden, numericas) {
  let visibles = rows.filter((row) =>
    columnas.every((column) => {
      const filtro = (filtros[column] || '').trim().toLowerCase();
      if (!filtro) return true;
      const raw = numericas[column]
        ? formatoNumero(row[column], column)
        : formatoCelda(row[column], column);
      const texto = raw === null || raw === undefined ? '' : String(raw);
      return texto.toLowerCase().includes(filtro);
    }),
  );

  if (!orden.col) return visibles;

  const col = orden.col;
  const dir = orden.dir;
  const numerica = numericas[col];
  return visibles.slice().sort((a, b) => {
    const va = a[col];
    const vb = b[col];
    if (numerica) {
      const na = aNumero(va);
      const nb = aNumero(vb);
      if (na === null && nb === null) return 0;
      if (na === null) return 1;
      if (nb === null) return -1;
      return (na - nb) * dir;
    }
    return String(va || '').localeCompare(String(vb || ''), 'es', {
      numeric: true,
      sensitivity: 'base',
    }) * dir;
  });
}

function mapaNumericas(columnas, rows) {
  const map = {};
  columnas.forEach((column) => {
    map[column] =
      esColumnaNumerica(column, rows || []) ||
      !!RATIOS[column] ||
      !!DECIMALES_1[column] ||
      !!DINERO_ENTERO[column] ||
      !!DINERO_2DEC[column] ||
      !!PORCENTAJE_1[column] ||
      !!ENTERO[column];
  });
  return map;
}

function agruparSuma(rows, etiquetaFn, valorKey) {
  const map = new Map();
  rows.forEach((row) => {
    const etiqueta = etiquetaFn(row) || '—';
    map.set(etiqueta, (map.get(etiqueta) || 0) + (aNumero(row[valorKey]) || 0));
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
}

export default function ReporteVentasTablero({ accessToken, onSessionInvalid }) {
  const [fechaInicio, setFechaInicio] = useState(fechaAyerIso);
  const [fechaFin, setFechaFin] = useState(fechaAyerIso);
  const [fechaInicioTexto, setFechaInicioTexto] = useState(() => isoToDmy(fechaAyerIso()));
  const [fechaFinTexto, setFechaFinTexto] = useState(() => isoToDmy(fechaAyerIso()));
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [rows, setRows] = useState(null);
  const [tab, setTab] = useState('tabla');
  const [filtros, setFiltros] = useState({});
  const [orden, setOrden] = useState({ col: null, dir: 1 });
  const [filtrosVenta, setFiltrosVenta] = useState({});
  const [ordenVenta, setOrdenVenta] = useState({ col: null, dir: 1 });
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [truncated, setTruncated] = useState(false);

  const chartImporteRef = useRef(null);
  const chartCantidadRef = useRef(null);
  const chartCompradorRef = useRef(null);
  const graficosRef = useRef([]);
  const cargaIdRef = useRef(0);

  const columnas = useMemo(() => {
    if (!rows?.length) return [];
    return Object.keys(rows[0]).filter((column) => !OCULTAR_COLUMNAS.test(column));
  }, [rows]);

  const numericas = useMemo(() => mapaNumericas(columnas, rows), [columnas, rows]);

  const filasVisibles = useMemo(
    () => (rows ? filtrarYOrdenar(rows, columnas, filtros, orden, numericas) : []),
    [rows, columnas, filtros, orden, numericas],
  );

  const ventas = useMemo(() => (rows?.length ? consolidarVentas(rows) : []), [rows]);
  const numericasVenta = useMemo(() => mapaNumericas(COLUMNAS_CONSOLIDADO, ventas), [ventas]);
  const filasVentasVisibles = useMemo(
    () => filtrarYOrdenar(ventas, COLUMNAS_CONSOLIDADO, filtrosVenta, ordenVenta, numericasVenta),
    [ventas, filtrosVenta, ordenVenta, numericasVenta],
  );

  function destruirGraficos() {
    graficosRef.current.forEach((g) => g.destroy());
    graficosRef.current = [];
  }

  useEffect(() => () => destruirGraficos(), []);

  useEffect(() => {
    if (tab !== 'dashboard' || !rows?.length) {
      destruirGraficos();
      return undefined;
    }

    const topImporte = agruparSuma(
      rows,
      (r) => r.descripcion || r.producto,
      'importe_line_item_mxn',
    );
    const topCantidad = agruparSuma(
      rows,
      (r) => r.descripcion || r.producto,
      'cantidad_line_item',
    );
    const topComprador = agruparSuma(
      rows,
      (r) => r.nombre_comprador || r.codigo_comprador,
      'importe_line_item_mxn',
    );

    const grid = 'rgba(90, 200, 160, 0.12)';
    const ticks = { color: '#8aa89c' };

    destruirGraficos();

    if (chartImporteRef.current) {
      graficosRef.current.push(
        new Chart(chartImporteRef.current, {
          type: 'bar',
          data: {
            labels: topImporte.map(([label]) => etiquetaCorta(label)),
            datasets: [{
              label: 'Importe',
              data: topImporte.map(([, value]) => value),
              backgroundColor: 'rgba(46, 230, 168, 0.75)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { ticks, grid: { color: grid } },
            },
          },
        }),
      );
    }

    if (chartCantidadRef.current) {
      graficosRef.current.push(
        new Chart(chartCantidadRef.current, {
          type: 'bar',
          data: {
            labels: topCantidad.map(([label]) => etiquetaCorta(label)),
            datasets: [{
              label: 'Cantidad',
              data: topCantidad.map(([, value]) => value),
              backgroundColor: 'rgba(46, 230, 168, 0.75)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { ticks, grid: { color: grid } },
            },
          },
        }),
      );
    }

    if (chartCompradorRef.current) {
      graficosRef.current.push(
        new Chart(chartCompradorRef.current, {
          type: 'bar',
          data: {
            labels: topComprador.map(([label]) => etiquetaCorta(label)),
            datasets: [{
              label: 'Importe',
              data: topComprador.map(([, value]) => value),
              backgroundColor: 'rgba(122, 215, 255, 0.8)',
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { ticks, grid: { color: grid } },
            },
          },
        }),
      );
    }

    return () => destruirGraficos();
  }, [tab, rows]);

  async function cargarTablero() {
    const cargaId = cargaIdRef.current + 1;
    cargaIdRef.current = cargaId;
    setErrorMessage('');
    setFiltros({});
    setOrden({ col: null, dir: 1 });
    setFiltrosVenta({});
    setOrdenVenta({ col: null, dir: 1 });
    setTab('tabla');
    destruirGraficos();

    if (!esFechaIso(fechaInicio) || !esFechaIso(fechaFin)) {
      setErrorMessage('Indica fecha inicio y fecha fin (dd/mm/aaaa)');
      return;
    }
    if (fechaInicio > fechaFin) {
      setErrorMessage('La fecha inicio no puede ser mayor que la fecha fin');
      return;
    }

    setLoading(true);

    try {
      const data = await pedirTablero();
      if (cargaId !== cargaIdRef.current) return;
      const filas = data.rows || [];
      setRows(filas);
      setTotalRegistros(Number(data.total) || filas.length);
      setTruncated(Boolean(data.truncated));
    } catch (error) {
      if (cargaId !== cargaIdRef.current) return;
      setRows(null);
      setTotalRegistros(0);
      setTruncated(false);
      setErrorMessage(error.message || 'Error ejecutando la consulta');
    } finally {
      if (cargaId === cargaIdRef.current) setLoading(false);
    }
  }

  async function pedirTablero({ offset, limite } = {}) {
    const response = await fetch('/api/reporteventas/tablero', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        ...(offset != null ? { offset } : {}),
        ...(limite != null ? { limite } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      onSessionInvalid?.();
      throw new Error(data.error || 'Sesión inválida.');
    }

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Error ejecutando la consulta');
    }

    return data;
  }

  useEffect(() => {
    cargarTablero();
  }, [accessToken]);

  function ordenarColumna(columna) {
    setOrden((prev) => (
      prev.col === columna
        ? { col: columna, dir: prev.dir === 1 ? -1 : 1 }
        : { col: columna, dir: 1 }
    ));
  }

  function ordenarColumnaVenta(columna) {
    setOrdenVenta((prev) => (
      prev.col === columna
        ? { col: columna, dir: prev.dir === 1 ? -1 : 1 }
        : { col: columna, dir: 1 }
    ));
  }

  function exportarExcel() {
    const esConsolidado = tab === 'consolidado';
    const visibles = esConsolidado ? filasVentasVisibles : filasVisibles;
    const cols = esConsolidado ? COLUMNAS_CONSOLIDADO : columnas;
    if (!visibles.length) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      const hoja = visibles.map((row) => {
        const out = {};
        cols.forEach((column) => {
          out[column] = row[column];
        });
        return out;
      });
      const worksheet = XLSX.utils.json_to_sheet(hoja);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, esConsolidado ? 'Por venta' : 'Detalle');
      worksheet['!cols'] = cols.map((column) => {
        let maxLength = column.length;
        hoja.forEach((row) => {
          let value = row[column];
          if (value === null || value === undefined) value = '';
          if (typeof value === 'object') value = JSON.stringify(value);
          maxLength = Math.max(maxLength, String(value).length);
        });
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      const sufijo = esConsolidado ? 'por_venta' : 'detalle';
      XLSX.writeFile(workbook, `reporte_ventas_${sufijo}_${fechaInicio}_${fechaFin}.xlsx`);
    } catch (error) {
      console.error(error);
      alert('No fue posible generar el archivo Excel.');
    }
  }

  const kpis = rows?.length
    ? {
        importe: sumaColumna(rows, 'importe_line_item_mxn'),
        cantidad: sumaColumna(rows, 'cantidad_line_item'),
        tickets: new Set(rows.map((r) => r.id_venta).filter(Boolean)).size,
        compradores: new Set(rows.map((r) => r.id_comprador || r.codigo_comprador).filter(Boolean)).size,
      }
    : null;

  const ticketPromedio = kpis && kpis.tickets ? kpis.importe / kpis.tickets : null;
  const esConsolidado = tab === 'consolidado';
  const countVisibles = esConsolidado ? filasVentasVisibles.length : filasVisibles.length;
  const countTotal = esConsolidado ? ventas.length : rows?.length || 0;
  const etiquetaConteo = esConsolidado ? 'ventas' : 'registros';
  const etiquetaConteoPantalla = `${countVisibles} de ${countTotal} ${etiquetaConteo} en pantalla`;
  const etiquetaConteoCompleto = truncated && totalRegistros > (rows?.length || 0)
    ? `${etiquetaConteoPantalla} · ${totalRegistros.toLocaleString('es-MX')} líneas en el rango`
    : etiquetaConteoPantalla;

  return (
    <div className="reportes-root" lang="es-MX">
      <div className="rp-page">
        <div className="rp-container">
          <div className="rp-filtros">
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
                    {etiquetaConteoCompleto}
                  </span>
                  {tab !== 'dashboard' && (
                    <button className="rp-export" type="button" onClick={exportarExcel}>
                      Exportar Excel
                    </button>
                  )}
                </div>
              </div>

              <div className="rp-tabs">
                <button
                  className={`rp-tab${tab === 'tabla' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('tabla')}
                >
                  Tabla
                </button>
                <button
                  className={`rp-tab${tab === 'consolidado' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('consolidado')}
                >
                  Por venta
                </button>
                <button
                  className={`rp-tab${tab === 'dashboard' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('dashboard')}
                >
                  Indicadores
                </button>
              </div>

              <div className={`rp-tab-panel${tab === 'tabla' ? ' rp-active' : ''}`}>
                <TablaResultados
                  columnas={columnas}
                  numericas={numericas}
                  filas={filasVisibles}
                  orden={orden}
                  filtros={filtros}
                  onOrdenar={ordenarColumna}
                  onFiltro={setFiltros}
                  rowKey={(row, index) => row.id_line_item || index}
                />
              </div>

              <div className={`rp-tab-panel${tab === 'consolidado' ? ' rp-active' : ''}`}>
                <TablaResultados
                  columnas={COLUMNAS_CONSOLIDADO}
                  numericas={numericasVenta}
                  filas={filasVentasVisibles}
                  orden={ordenVenta}
                  filtros={filtrosVenta}
                  onOrdenar={ordenarColumnaVenta}
                  onFiltro={setFiltrosVenta}
                  rowKey={(row, index) => row.id_venta || row.folio || index}
                />
              </div>

              <div className={`rp-tab-panel${tab === 'dashboard' ? ' rp-active' : ''}`}>
                {truncated && (
                  <div className="rp-warning">
                    Los indicadores usan los primeros 5,000 registros. El Excel descarga el rango completo.
                  </div>
                )}
                {kpis && (
                  <div className="rp-kpi-grid">
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Venta</div>
                      <div className="rp-kpi-caption">Importe vendido</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.importe, 'importe_line_item_mxn')}</div>
                      <div className="rp-kpi-sub">Cantidad vendida  {formatoNumero(kpis.cantidad, 'cantidad_line_item')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Tickets</div>
                      <div className="rp-kpi-caption">Órdenes de venta</div>
                      <div className="rp-kpi-value">{kpis.tickets.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">
                        Ticket promedio  {ticketPromedio == null ? '—' : formatoNumero(ticketPromedio, 'importe_line_item_mxn')}
                      </div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Compradores</div>
                      <div className="rp-kpi-caption">Clientes distintos</div>
                      <div className="rp-kpi-value">{kpis.compradores.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">{kpis.tickets} ventas en el rango</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Líneas</div>
                      <div className="rp-kpi-caption">Partidas vendidas</div>
                      <div className="rp-kpi-value">{rows.length.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">
                        {truncated && totalRegistros > rows.length
                          ? `Primeros ${rows.length.toLocaleString('es-MX')} de ${totalRegistros.toLocaleString('es-MX')}`
                          : 'Partidas vendidas'}
                      </div>
                    </div>
                  </div>
                )}
                <div className="rp-charts">
                  <div className="rp-chart-card">
                    <h3>Top productos por venta ($)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartImporteRef} /></div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Top productos por venta (cantidades)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartCantidadRef} /></div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Top compradores por venta ($)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartCompradorRef} /></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="rp-footer-note">Supabase · Polaria Mateo</p>
      </div>
    </div>
  );
}

function TablaResultados({
  columnas,
  numericas,
  filas,
  orden,
  filtros,
  onOrdenar,
  onFiltro,
  rowKey,
}) {
  return (
    <div className="rp-table-container">
      <table>
        <thead>
          <tr>
            {columnas.map((column) => (
              <th key={column} className={numericas[column] ? 'rp-num' : ''}>
                <button
                  type="button"
                  className="rp-th-sort"
                  onClick={() => onOrdenar(column)}
                >
                  {column}
                  <span className="rp-sort-ind">
                    {orden.col === column ? (orden.dir === 1 ? '▲' : '▼') : ''}
                  </span>
                </button>
                <input
                  className="rp-th-filter"
                  type="text"
                  placeholder="Filtrar"
                  value={filtros[column] || ''}
                  onChange={(e) => onFiltro((prev) => ({ ...prev, [column]: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="rp-empty">
                Ningún registro coincide con el filtro.
              </td>
            </tr>
          ) : (
            filas.map((row, index) => (
              <tr key={rowKey(row, index)}>
                {columnas.map((column) => (
                  <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                    {numericas[column]
                      ? formatoNumero(row[column], column)
                      : formatoCelda(row[column], column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            {columnas.map((column, i) => {
              if (i === 0) return <td key={column}>Total</td>;
              const total = totalColumna(column, filas);
              return (
                <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                  {total === null ? '' : formatoNumero(total, column)}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
