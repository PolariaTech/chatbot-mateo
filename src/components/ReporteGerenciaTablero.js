'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import * as XLSX from 'xlsx';

const EXCLUIR_SUMA = /^(id_|cid_|codigo|sku|nombre|tipo_|unidad)/i;
const OCULTAR_COLUMNAS = /^(id_producto|cid_producto|unidad)$/i;
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
  if (PORCENTAJE_1[columna]) {
    const pct = Math.abs(n) <= 1 ? n * 100 : n;
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

function margenBrutoTotal(rows) {
  const venta = sumaColumna(rows, 'venta_total');
  const costo = sumaColumna(rows, 'costo_total_compra');
  return costo ? (venta - costo) / costo : null;
}

function margenEstimadoTotal(rows) {
  const venta = sumaColumna(rows, 'venta_total');
  const costoEst = rows.reduce((acc, row) => {
    const cu = aNumero(row.costo_unitario_estimado);
    const qty = aNumero(row.cantidad_venta);
    if (cu == null || qty == null) return acc;
    return acc + cu * qty;
  }, 0);
  return costoEst ? (venta - costoEst) / costoEst : null;
}

function totalColumna(nombre, rows) {
  if (nombre === 'margen_bruto') return margenBrutoTotal(rows);
  if (nombre === 'margen_estimado') return margenEstimadoTotal(rows);
  if (NO_SUMAR[nombre] || (PORCENTAJE_1[nombre] && !RATIOS[nombre])) return null;
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

export default function ReporteGerenciaTablero({ accessToken, onSessionInvalid }) {
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

  const chartVentasRef = useRef(null);
  const chartCantidadRef = useRef(null);
  const chartUnidadesRef = useRef(null);
  const graficosRef = useRef([]);
  const cargaIdRef = useRef(0);

  const columnas = useMemo(() => {
    if (!rows?.length) return [];
    return Object.keys(rows[0]).filter((column) => !OCULTAR_COLUMNAS.test(column));
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
        const filtro = (filtros[column] || '').trim().toLowerCase();
        if (!filtro) return true;
        const raw = numericas[column] ? formatoNumero(row[column], column) : row[column];
        const texto = raw === null || raw === undefined ? '' : String(raw);
        return texto.toLowerCase().includes(filtro);
      }),
    );

    if (orden.col) {
      const col = orden.col;
      const dir = orden.dir;
      const numerica = numericas[col];
      visibles = visibles.slice().sort((a, b) => {
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

    return visibles;
  }, [rows, columnas, filtros, orden, numericas]);

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

    const top = rows
      .slice()
      .sort((a, b) => (aNumero(b.venta_total) || 0) - (aNumero(a.venta_total) || 0))
      .slice(0, 8);
    const topQty = rows
      .slice()
      .sort((a, b) => (aNumero(b.cantidad_venta) || 0) - (aNumero(a.cantidad_venta) || 0))
      .slice(0, 8);

    const labels = top.map(etiquetaProducto);
    const labelsQty = topQty.map(etiquetaProducto);
    const grid = 'rgba(90, 200, 160, 0.12)';
    const ticks = { color: '#8aa89c' };

    destruirGraficos();

    if (chartVentasRef.current) {
      graficosRef.current.push(
        new Chart(chartVentasRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              label: 'Venta total',
              data: top.map((r) => aNumero(r.venta_total) || 0),
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
            labels: labelsQty,
            datasets: [{
              label: 'Cantidad venta',
              data: topQty.map((r) => aNumero(r.cantidad_venta) || 0),
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

    if (chartUnidadesRef.current) {
      graficosRef.current.push(
        new Chart(chartUnidadesRef.current, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Compra',
                data: top.map((r) => aNumero(r.cantidad_compra) || 0),
                backgroundColor: 'rgba(122, 215, 255, 0.8)',
              },
              {
                label: 'Venta',
                data: top.map((r) => aNumero(r.cantidad_venta) || 0),
                backgroundColor: 'rgba(46, 230, 168, 0.8)',
              },
              {
                label: 'Merma',
                data: top.map((r) => aNumero(r.cantidad_merma_desecho) || 0),
                backgroundColor: 'rgba(230, 208, 138, 0.85)',
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#f4fffb' } } },
            scales: {
              x: { ticks, grid: { color: grid } },
              y: { stacked: false, ticks, grid: { color: grid } },
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
      const response = await fetch('/api/reportegerencia/tablero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
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

      if (cargaId !== cargaIdRef.current) return;
      setRows(data.rows || []);
    } catch (error) {
      if (cargaId !== cargaIdRef.current) return;
      setRows(null);
      setErrorMessage(error.message || 'Error ejecutando la consulta');
    } finally {
      if (cargaId === cargaIdRef.current) setLoading(false);
    }
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

  function exportarExcel() {
    const visibles = filasVisibles;
    if (!visibles.length) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(visibles);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Gerencia');

      const columns = Object.keys(visibles[0]);
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
        margenBruto: margenBrutoTotal(rows),
        margenEstimado: margenEstimadoTotal(rows),
        skus: rows.length,
      }
    : null;

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
                    {filasVisibles.length} de {rows.length} registros
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
                  className={`rp-tab${tab === 'dashboard' ? ' rp-active' : ''}`}
                  type="button"
                  onClick={() => setTab('dashboard')}
                >
                  Indicadores
                </button>
              </div>

              <div className={`rp-tab-panel${tab === 'tabla' ? ' rp-active' : ''}`}>
                <div className="rp-table-container">
                  <table>
                    <thead>
                      <tr>
                        {columnas.map((column) => (
                          <th key={column} className={numericas[column] ? 'rp-num' : ''}>
                            <button
                              type="button"
                              className="rp-th-sort"
                              onClick={() => ordenarColumna(column)}
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
                              onChange={(e) => setFiltros((prev) => ({ ...prev, [column]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </th>
                        ))}
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
                            {columnas.map((column) => (
                              <td key={column} className={numericas[column] ? 'rp-num' : ''}>
                                {numericas[column]
                                  ? formatoNumero(row[column], column)
                                  : row[column] == null
                                    ? ''
                                    : String(row[column])}
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
                          const total = totalColumna(column, filasVisibles);
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
              </div>

              <div className={`rp-tab-panel${tab === 'dashboard' ? ' rp-active' : ''}`}>
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
                      <div className="rp-kpi-caption">Costo de merma / desecho</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.mermaImp, 'costo_total_merma_desecho')}</div>
                      <div className="rp-kpi-sub">Cantidad de merma  {formatoNumero(kpis.mermaQty, 'cantidad_merma_desecho')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Inventario</div>
                      <div className="rp-kpi-caption">Valor en inventario</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.invImp, 'valor_inventario')}</div>
                      <div className="rp-kpi-sub">Existencia actual  {formatoNumero(kpis.existQty, 'existencia_actual')}</div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">Margen bruto</div>
                      <div className="rp-kpi-caption">Sobre costo de compra</div>
                      <div className="rp-kpi-value">{formatoNumero(kpis.margenBruto, 'margen_bruto')}</div>
                      <div className="rp-kpi-sub">
                        Estimado  {formatoNumero(kpis.margenEstimado, 'margen_estimado')}
                      </div>
                    </div>
                    <div className="rp-kpi">
                      <div className="rp-kpi-label">SKUs</div>
                      <div className="rp-kpi-caption">Productos en el tablero</div>
                      <div className="rp-kpi-value">{kpis.skus.toLocaleString('es-MX')}</div>
                      <div className="rp-kpi-sub">Productos del período</div>
                    </div>
                  </div>
                )}
                <div className="rp-charts">
                  <div className="rp-chart-card">
                    <h3>Top productos por venta ($)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartVentasRef} /></div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Top productos por venta (cantidades)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartCantidadRef} /></div>
                  </div>
                  <div className="rp-chart-card">
                    <h3>Compra vs venta vs merma (unidades)</h3>
                    <div className="rp-chart-wrap"><canvas ref={chartUnidadesRef} /></div>
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
